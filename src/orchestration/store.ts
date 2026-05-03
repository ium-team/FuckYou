import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { ORCHESTRATION_DIR, STATE_DIR } from "../config/defaults.js";
import { updateMode } from "../state/store.js";
import type { TmuxAdapter, TmuxPaneInfo } from "../tmux/types.js";
import { readJsonFile, writeJsonFileAtomic } from "../utils/fs.js";
import type {
  ConflictsFile,
  OrchestrationAgent,
  OrchestrationAgentsFile,
  OrchestrationConflict,
  OrchestrationManifest,
  OrchestrationRole,
  OrchestrationStatus,
  OwnershipEntry,
  OwnershipFile,
  TraceEvent,
} from "./types.js";

const DEFAULT_ROLES: readonly OrchestrationRole[] = ["leader", "explorer", "executor", "verifier"] as const;

export function orchestrationRunsRoot(cwd = process.cwd()): string {
  return join(cwd, STATE_DIR, ORCHESTRATION_DIR, "runs");
}

export function orchestrationRunDirectory(runId: string, cwd = process.cwd()): string {
  return join(orchestrationRunsRoot(cwd), runId);
}

function manifestPath(runId: string, cwd: string): string {
  return join(orchestrationRunDirectory(runId, cwd), "manifest.json");
}

function agentsPath(runId: string, cwd: string): string {
  return join(orchestrationRunDirectory(runId, cwd), "agents.json");
}

function ownershipPath(runId: string, cwd: string): string {
  return join(orchestrationRunDirectory(runId, cwd), "ownership.json");
}

function conflictsPath(runId: string, cwd: string): string {
  return join(orchestrationRunDirectory(runId, cwd), "conflicts.json");
}

function tracePath(runId: string, cwd: string): string {
  return join(orchestrationRunDirectory(runId, cwd), "trace.jsonl");
}

function createRunId(now: Date): string {
  return `orch-${now.toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
}

function agentForRole(role: OrchestrationRole, task: string, now: string): OrchestrationAgent {
  return {
    agentId: role === "leader" ? "leader" : `${role}-1`,
    role,
    status: role === "leader" ? "running" : "pending",
    assignedTask: role === "leader" ? `Lead orchestration for: ${task}` : `${role} lane for: ${task}`,
    paneId: null,
    ownedFiles: [],
    readOnly: role === "explorer" || role === "verifier",
    lastHeartbeat: role === "leader" ? now : null,
    stopCondition: "report status, blockers, touched files, and verification evidence",
  };
}

function paneTitle(runId: string, agent: OrchestrationAgent): string {
  return `fy:${runId}:${agent.role}:${agent.agentId}`;
}

async function appendTrace(cwd: string, event: TraceEvent): Promise<void> {
  await appendFile(tracePath(event.runId, cwd), `${JSON.stringify(event)}\n`, "utf-8");
}

export async function createOrchestrationRun(
  options: {
    task: string;
    cwd?: string;
    roles?: readonly OrchestrationRole[];
    now?: Date;
  },
): Promise<{
  manifest: OrchestrationManifest;
  agents: OrchestrationAgentsFile;
  ownership: OwnershipFile;
  conflicts: ConflictsFile;
}> {
  const cwd = options.cwd ?? process.cwd();
  const now = options.now ?? new Date();
  const startedAt = now.toISOString();
  const runId = createRunId(now);
  const roles = options.roles ?? DEFAULT_ROLES;
  const directory = orchestrationRunDirectory(runId, cwd);
  await mkdir(directory, { recursive: true });

  const manifest: OrchestrationManifest = {
    schemaVersion: 1,
    runId,
    mode: "orchestrated",
    status: "planning",
    startedAt,
    finishedAt: null,
    leaderAgentId: "leader",
    tmux: {
      session: null,
      layout: "leader-grid",
    },
    stopCondition: "verified-complete",
  };
  const agents: OrchestrationAgentsFile = {
    schemaVersion: 1,
    agents: roles.map((role) => agentForRole(role, options.task, startedAt)),
  };
  const ownership: OwnershipFile = { schemaVersion: 1, entries: [] };
  const conflicts: ConflictsFile = { schemaVersion: 1, conflicts: [] };

  await writeJsonFileAtomic(manifestPath(runId, cwd), manifest);
  await writeJsonFileAtomic(agentsPath(runId, cwd), agents);
  await writeJsonFileAtomic(ownershipPath(runId, cwd), ownership);
  await writeJsonFileAtomic(conflictsPath(runId, cwd), conflicts);
  await appendTrace(cwd, { time: startedAt, type: "run-started", runId, message: options.task });
  await updateMode("orchestrated", cwd);

  return { manifest, agents, ownership, conflicts };
}

export async function readOrchestrationManifest(runId: string, cwd = process.cwd()): Promise<OrchestrationManifest | null> {
  return await readJsonFile<OrchestrationManifest>(manifestPath(runId, cwd));
}

export async function readOrchestrationAgents(runId: string, cwd = process.cwd()): Promise<OrchestrationAgentsFile> {
  return (await readJsonFile<OrchestrationAgentsFile>(agentsPath(runId, cwd))) ?? { schemaVersion: 1, agents: [] };
}

async function writeOrchestrationAgents(runId: string, agents: OrchestrationAgentsFile, cwd: string): Promise<void> {
  await writeJsonFileAtomic(agentsPath(runId, cwd), agents);
}

export async function readOwnership(runId: string, cwd = process.cwd()): Promise<OwnershipFile> {
  return (await readJsonFile<OwnershipFile>(ownershipPath(runId, cwd))) ?? { schemaVersion: 1, entries: [] };
}

export async function readConflicts(runId: string, cwd = process.cwd()): Promise<ConflictsFile> {
  return (await readJsonFile<ConflictsFile>(conflictsPath(runId, cwd))) ?? { schemaVersion: 1, conflicts: [] };
}

export async function findLatestOrchestrationRun(cwd = process.cwd()): Promise<string | null> {
  const root = orchestrationRunsRoot(cwd);
  if (!existsSync(root)) return null;
  const entries = (await readdir(root)).filter((entry) => entry.startsWith("orch-")).sort();
  return entries.at(-1) ?? null;
}

export async function updateOrchestrationStatus(
  runId: string,
  status: OrchestrationStatus,
  cwd = process.cwd(),
): Promise<OrchestrationManifest> {
  const manifest = await readOrchestrationManifest(runId, cwd);
  if (!manifest) throw new Error(`orchestration run not found: ${runId}`);
  const next: OrchestrationManifest = {
    ...manifest,
    status,
    finishedAt: status === "complete" || status === "failed" || status === "cancelled" ? new Date().toISOString() : manifest.finishedAt,
  };
  await writeJsonFileAtomic(manifestPath(runId, cwd), next);
  await appendTrace(cwd, { time: new Date().toISOString(), type: `run-${status}`, runId });
  return next;
}

function ensurePaneIsAgent(info: TmuxPaneInfo, expectedTitle: string): void {
  if (!info.isAgent || info.isHud || info.isShell || info.title !== expectedTitle) {
    throw new Error("pane_not_verified");
  }
}

export async function startOrchestrationPanes(
  runId: string,
  adapter: TmuxAdapter,
  cwd = process.cwd(),
): Promise<{ manifest: OrchestrationManifest; agents: OrchestrationAgentsFile }> {
  const manifest = await readOrchestrationManifest(runId, cwd);
  if (!manifest) throw new Error(`orchestration run not found: ${runId}`);
  const agents = await readOrchestrationAgents(runId, cwd);
  const sessionName = `fy-${runId}`;

  await adapter.startSession(sessionName, manifest.tmux.layout);
  const nextAgents: OrchestrationAgent[] = [];
  for (const agent of agents.agents) {
    const title = paneTitle(runId, agent);
    const pane = await adapter.startAgentPane(sessionName, {
      runId,
      agentId: agent.agentId,
      role: agent.role,
      title,
    });
    ensurePaneIsAgent(pane, title);
    nextAgents.push({
      ...agent,
      paneId: pane.paneId,
      status: "running",
      lastHeartbeat: new Date().toISOString(),
    });
  }

  const nextManifest: OrchestrationManifest = {
    ...manifest,
    status: "running",
    tmux: {
      ...manifest.tmux,
      session: sessionName,
    },
  };
  const nextAgentsFile: OrchestrationAgentsFile = { schemaVersion: 1, agents: nextAgents };
  await writeJsonFileAtomic(manifestPath(runId, cwd), nextManifest);
  await writeOrchestrationAgents(runId, nextAgentsFile, cwd);
  await appendTrace(cwd, { time: new Date().toISOString(), type: "agent-started", runId, message: `${nextAgents.length} panes` });
  return { manifest: nextManifest, agents: nextAgentsFile };
}

export async function cleanupWorkerPanes(
  runId: string,
  adapter: TmuxAdapter,
  cwd = process.cwd(),
): Promise<string[]> {
  const manifest = await readOrchestrationManifest(runId, cwd);
  if (!manifest) throw new Error(`orchestration run not found: ${runId}`);
  const agents = await readOrchestrationAgents(runId, cwd);
  const closedPaneIds: string[] = [];
  for (const agent of agents.agents) {
    if (agent.agentId === manifest.leaderAgentId || !agent.paneId) continue;
    const pane = await adapter.inspectPane(agent.paneId);
    if (!pane || !pane.isAgent || pane.isHud || pane.isShell) continue;
    await adapter.closePane(agent.paneId);
    closedPaneIds.push(agent.paneId);
  }
  if (closedPaneIds.length > 0) {
    await appendTrace(cwd, {
      time: new Date().toISOString(),
      type: "agent-status",
      runId,
      message: `closed worker panes: ${closedPaneIds.join(", ")}`,
    });
  }
  return closedPaneIds;
}

function isWrite(entry: OwnershipEntry): boolean {
  return entry.type === "write-file" || entry.type === "write-region" || entry.type === "test-only" || entry.type === "docs-only";
}

function regionsOverlap(a: OwnershipEntry, b: OwnershipEntry): boolean {
  if (!a.region || !b.region) return true;
  return a.region.startLine <= b.region.endLine && b.region.startLine <= a.region.endLine;
}

function conflictForPair(a: OwnershipEntry, b: OwnershipEntry): OrchestrationConflict | null {
  if (a.agentId === b.agentId || a.path !== b.path || !isWrite(a) || !isWrite(b)) return null;
  if (a.path.startsWith(".fy/") || b.path.startsWith(".fy/")) {
    return {
      level: "state-overlap",
      path: a.path,
      agentIds: [a.agentId, b.agentId],
      reason: "shared FY state writes must be serialized",
    };
  }
  if (a.type === "write-region" && b.type === "write-region" && !regionsOverlap(a, b)) {
    return null;
  }
  if (a.type === "write-region" && b.type === "write-region") {
    return {
      level: "region-overlap",
      path: a.path,
      agentIds: [a.agentId, b.agentId],
      reason: "same-file write regions overlap",
    };
  }
  return {
    level: "file-overlap",
    path: a.path,
    agentIds: [a.agentId, b.agentId],
    reason: "same-file broad write ownership requires leader review",
  };
}

export function detectOwnershipConflicts(entries: readonly OwnershipEntry[]): OrchestrationConflict[] {
  const conflicts: OrchestrationConflict[] = [];
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      const conflict = conflictForPair(entries[left], entries[right]);
      if (conflict) conflicts.push(conflict);
    }
  }
  return conflicts;
}

export async function assignOwnership(
  runId: string,
  entries: readonly OwnershipEntry[],
  cwd = process.cwd(),
): Promise<{ ownership: OwnershipFile; conflicts: ConflictsFile }> {
  const manifest = await readOrchestrationManifest(runId, cwd);
  if (!manifest) throw new Error(`orchestration run not found: ${runId}`);
  const ownership: OwnershipFile = { schemaVersion: 1, entries: [...entries] };
  const conflicts: ConflictsFile = { schemaVersion: 1, conflicts: detectOwnershipConflicts(entries) };
  await writeJsonFileAtomic(ownershipPath(runId, cwd), ownership);
  await writeJsonFileAtomic(conflictsPath(runId, cwd), conflicts);
  await appendTrace(cwd, {
    time: new Date().toISOString(),
    type: conflicts.conflicts.length > 0 ? "conflict-detected" : "ownership-assigned",
    runId,
    message: `${entries.length} ownership entries`,
  });
  if (conflicts.conflicts.some((conflict) => conflict.level === "region-overlap" || conflict.level === "state-overlap")) {
    await updateOrchestrationStatus(runId, "blocked", cwd);
  }
  return { ownership, conflicts };
}

export async function getOrchestrationStatus(runId: string, cwd = process.cwd()): Promise<{
  manifest: OrchestrationManifest;
  agents: OrchestrationAgentsFile;
  ownership: OwnershipFile;
  conflicts: ConflictsFile;
}> {
  const manifest = await readOrchestrationManifest(runId, cwd);
  if (!manifest) throw new Error(`orchestration run not found: ${runId}`);
  return {
    manifest,
    agents: await readOrchestrationAgents(runId, cwd),
    ownership: await readOwnership(runId, cwd),
    conflicts: await readConflicts(runId, cwd),
  };
}
