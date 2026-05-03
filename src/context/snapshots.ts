import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveAccount } from "../accounts/store.js";
import { CONTEXT_SNAPSHOTS_DIR, STATE_DIR } from "../config/defaults.js";
import { readState, writeState } from "../state/store.js";
import { readProjectConfig } from "../accounts/store.js";
import { readJsonFile, writeJsonFileAtomic } from "../utils/fs.js";
import type {
  ContextRestoreStatus,
  ContextSnapshotManifest,
  ContextSnapshotReason,
  ContextSummary,
  ContinuationDecision,
  SavedContextSnapshot,
} from "./types.js";

export function contextSnapshotsRoot(cwd = process.cwd()): string {
  return join(cwd, STATE_DIR, CONTEXT_SNAPSHOTS_DIR);
}

export function contextSnapshotDirectory(snapshotId: string, cwd = process.cwd()): string {
  return join(contextSnapshotsRoot(cwd), snapshotId);
}

function createSnapshotId(now: Date): string {
  return `ctx-${now.toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
}

async function resolveActiveAccount(cwd: string): Promise<string> {
  const [project, state] = await Promise.all([readProjectConfig(cwd), readState(cwd)]);
  return state.activeAccount ?? project.lastAccount ?? project.defaultAccount;
}

export async function getContextSummary(cwd = process.cwd()): Promise<ContextSummary> {
  const state = await readState(cwd);
  return {
    activeMode: state.activeMode,
    activeAccount: state.activeAccount ?? await resolveActiveAccount(cwd),
    activeSessionId: state.activeSession.id,
    contextUsagePercent: state.context.usagePercent,
    allowanceRemainingPercent: state.allowance.remainingPercent,
    lastSnapshotId: state.context.lastSnapshotId,
  };
}

function buildSummaryMarkdown(summary: ContextSummary, reason: ContextSnapshotReason): string {
  return [
    "# FY Context Snapshot",
    "",
    `Reason: ${reason}`,
    `Mode: ${summary.activeMode}`,
    `Account: ${summary.activeAccount}`,
    `Session: ${summary.activeSessionId ?? "n/a"}`,
    `Context usage: ${summary.contextUsagePercent ?? "n/a"}%`,
    `Allowance remaining: ${summary.allowanceRemainingPercent ?? "n/a"}%`,
    `Previous snapshot: ${summary.lastSnapshotId ?? "n/a"}`,
    "",
    "No Codex authentication material is stored in this snapshot.",
    "",
  ].join("\n");
}

function buildHandoffMarkdown(manifest: ContextSnapshotManifest, summary: ContextSummary): string {
  return [
    "# FY Continuation Handoff",
    "",
    `Snapshot: ${manifest.id}`,
    `Source account: ${manifest.sourceAccount}`,
    `Target account: ${manifest.restore.targetAccount ?? "n/a"}`,
    `Restore status: ${manifest.restore.status}`,
    "",
    "Continue from this state:",
    "",
    `- Active mode: ${summary.activeMode}`,
    `- Source session: ${summary.activeSessionId ?? "n/a"}`,
    `- Context usage: ${summary.contextUsagePercent ?? "n/a"}%`,
    `- Allowance remaining: ${summary.allowanceRemainingPercent ?? "n/a"}%`,
    "",
    "Do not copy or infer Codex authentication material from this handoff.",
    "",
  ].join("\n");
}

export async function saveContextSnapshot(
  options: {
    cwd?: string;
    reason?: ContextSnapshotReason;
    targetAccount?: string | null;
    now?: Date;
  } = {},
): Promise<SavedContextSnapshot> {
  const cwd = options.cwd ?? process.cwd();
  const now = options.now ?? new Date();
  const summary = await getContextSummary(cwd);
  const id = createSnapshotId(now);
  const directory = contextSnapshotDirectory(id, cwd);
  const manifest: ContextSnapshotManifest = {
    schemaVersion: 1,
    id,
    createdAt: now.toISOString(),
    sourceAccount: summary.activeAccount,
    sourceSessionId: summary.activeSessionId,
    mode: summary.activeMode,
    reason: options.reason ?? "manual-save",
    files: {
      summary: "summary.md",
      handoff: "handoff.md",
    },
    restore: {
      targetAccount: options.targetAccount ?? null,
      status: "pending",
    },
  };

  await mkdir(directory, { recursive: true });
  const summaryPath = join(directory, manifest.files.summary);
  const handoffPath = join(directory, manifest.files.handoff);
  await writeJsonFileAtomic(join(directory, "manifest.json"), manifest);
  await writeFile(summaryPath, buildSummaryMarkdown(summary, manifest.reason), "utf-8");
  await writeFile(handoffPath, buildHandoffMarkdown(manifest, summary), "utf-8");

  const state = await readState(cwd);
  await writeState({
    ...state,
    context: {
      ...state.context,
      lastSnapshotId: id,
    },
    updatedAt: new Date().toISOString(),
  }, cwd);

  return { manifest, directory, summaryPath, handoffPath };
}

export async function readContextSnapshotManifest(
  snapshotId: string,
  cwd = process.cwd(),
): Promise<ContextSnapshotManifest | null> {
  return await readJsonFile<ContextSnapshotManifest>(join(contextSnapshotDirectory(snapshotId, cwd), "manifest.json"));
}

export async function loadContextSnapshot(snapshotId: string, cwd = process.cwd()): Promise<ContextSnapshotManifest> {
  const manifest = await readContextSnapshotManifest(snapshotId, cwd);
  if (!manifest) throw new Error(`context snapshot not found: ${snapshotId}`);
  const state = await readState(cwd);
  await writeState({
    ...state,
    context: {
      ...state.context,
      lastSnapshotId: manifest.id,
    },
    updatedAt: new Date().toISOString(),
  }, cwd);
  return manifest;
}

export async function resetContextMetadata(cwd = process.cwd()): Promise<void> {
  const state = await readState(cwd);
  await writeState({
    ...state,
    context: {
      ...state.context,
      usagePercent: null,
      lastSnapshotId: null,
    },
    updatedAt: new Date().toISOString(),
  }, cwd);
}

export function classifyContinuationNeed(allowanceRemainingPercent: number | null, task: string): ContinuationDecision {
  if (allowanceRemainingPercent === null) {
    return { shouldContinueWithAnotherAccount: false, reason: "unknown-allowance", snapshotRequired: false };
  }
  const likelyExpensive = task.trim().length > 80 || /\b(implement|orchestrate|refactor|migrate|test|verify)\b/i.test(task);
  if (allowanceRemainingPercent <= 10 && likelyExpensive) {
    return { shouldContinueWithAnotherAccount: true, reason: "low-allowance", snapshotRequired: true };
  }
  return { shouldContinueWithAnotherAccount: false, reason: "safe-to-continue", snapshotRequired: false };
}

export async function prepareContinuation(
  options: {
    targetAccount: string;
    task?: string;
    cwd?: string;
  },
): Promise<SavedContextSnapshot & { targetCodexHome: string; decision: ContinuationDecision }> {
  const cwd = options.cwd ?? process.cwd();
  const state = await readState(cwd);
  const decision = classifyContinuationNeed(state.allowance.remainingPercent, options.task ?? "");
  const target = await resolveAccount(options.targetAccount, cwd);
  const snapshot = await saveContextSnapshot({
    cwd,
    reason: "low-allowance-continuation",
    targetAccount: target.name,
  });
  return {
    ...snapshot,
    targetCodexHome: target.codexHome,
    decision,
  };
}

export async function readSnapshotFile(snapshotId: string, file: "summary.md" | "handoff.md", cwd = process.cwd()): Promise<string> {
  const path = join(contextSnapshotDirectory(snapshotId, cwd), file);
  if (!existsSync(path)) throw new Error(`context snapshot file not found: ${file}`);
  return await readFile(path, "utf-8");
}
