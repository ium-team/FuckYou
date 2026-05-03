import { ensureAccount, listAccountPickerRows, setDefaultAccount, validateAccountName } from "../accounts/store.js";
import {
  getContextSummary,
  loadContextSnapshot,
  prepareContinuation,
  resetContextMetadata,
  saveContextSnapshot,
} from "../context/snapshots.js";
import { initDocsHarness, listHarnessDocuments, summarizeCodebase, updateHarnessDocument } from "../docs/harness.js";
import type { HarnessDocKind } from "../docs/types.js";
import { getModePolicy, isFyMode, listModePolicies } from "../modes/policies.js";
import type { FyMode } from "../modes/types.js";
import {
  createOrchestrationRun,
  findLatestOrchestrationRun,
  getOrchestrationStatus,
  readConflicts,
  updateOrchestrationStatus,
} from "../orchestration/store.js";
import { buildFyStatus } from "../status/model.js";
import { updateMode } from "../state/store.js";

export type FySlashCommandId =
  | "/fy-mode"
  | "/fy-context"
  | "/fy-account"
  | "/fy-status"
  | "/fy-docs"
  | "/fy-orchestrate";

export interface FyCommandSpec {
  id: FySlashCommandId;
  purpose: string;
  picker: string;
}

export interface ParsedFyCommand {
  id: FySlashCommandId;
  args: string[];
  options: Record<string, string | boolean>;
}

export type FyCommandResult =
  | { status: "ok"; message: string; data?: unknown }
  | { status: "picker"; picker: string; items: unknown[] }
  | { status: "login-required"; account: string; message: string; data?: unknown }
  | { status: "error"; message: string };

export const FY_COMMAND_REGISTRY: readonly FyCommandSpec[] = [
  { id: "/fy-mode", purpose: "View or change active FY mode.", picker: "mode" },
  { id: "/fy-context", purpose: "Manage context snapshots and continuation.", picker: "context-action" },
  { id: "/fy-account", purpose: "Select, inspect, or add repo-local accounts.", picker: "account" },
  { id: "/fy-status", purpose: "Show full FY runtime status.", picker: "status-format" },
  { id: "/fy-docs", purpose: "Documentation and harness actions.", picker: "docs-action" },
  { id: "/fy-orchestrate", purpose: "Inspect and control Orchestrated Mode runs.", picker: "orchestrate-action" },
] as const;

const FY_COMMAND_IDS = new Set<string>(FY_COMMAND_REGISTRY.map((command) => command.id));

function tokenize(input: string): string[] {
  return input.trim().split(/\s+/).filter(Boolean);
}

function parseOptions(tokens: string[]): { args: string[]; options: Record<string, string | boolean> } {
  const args: string[] = [];
  const options: Record<string, string | boolean> = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.startsWith("--")) {
      const name = token.slice(2);
      const next = tokens[index + 1];
      if (next && !next.startsWith("--")) {
        options[name] = next;
        index += 1;
      } else {
        options[name] = true;
      }
      continue;
    }
    args.push(token);
  }
  return { args, options };
}

export function parseFyCommand(input: string): ParsedFyCommand | null {
  const tokens = tokenize(input);
  const id = tokens[0];
  if (!FY_COMMAND_IDS.has(id)) return null;
  const parsed = parseOptions(tokens.slice(1));
  return {
    id: id as FySlashCommandId,
    args: parsed.args,
    options: parsed.options,
  };
}

function modeSummary(mode: FyMode): string {
  const policy = getModePolicy(mode);
  return `${policy.mode}: edits ${policy.edits}, planning ${policy.planning}, verification ${policy.verification}`;
}

async function executeModeCommand(command: ParsedFyCommand, cwd: string): Promise<FyCommandResult> {
  const requested = command.args[0];
  if (!requested) {
    return {
      status: "picker",
      picker: "mode",
      items: listModePolicies().map((policy) => ({
        id: policy.mode,
        label: policy.mode,
        description: policy.description,
      })),
    };
  }
  if (!isFyMode(requested)) {
    return { status: "error", message: `Unknown mode: ${requested}` };
  }
  await updateMode(requested, cwd);
  return { status: "ok", message: `mode set to ${modeSummary(requested)}` };
}

async function executeAccountCommand(command: ParsedFyCommand, cwd: string): Promise<FyCommandResult> {
  const [action, maybeAccount] = command.args;
  if (!action) {
    return { status: "picker", picker: "account", items: await listAccountPickerRows(cwd) };
  }
  if (action === "select") {
    if (!maybeAccount) return { status: "picker", picker: "account", items: await listAccountPickerRows(cwd) };
    const account = await setDefaultAccount(maybeAccount, cwd);
    return { status: "ok", message: `account selected: ${account.name}`, data: { codexHome: account.codexHome } };
  }
  if (action === "login") {
    const accountName = validateAccountName(maybeAccount ?? "default");
    const account = await ensureAccount(accountName, cwd);
    return {
      status: "login-required",
      account: account.name,
      message: `login required for account: ${account.name}`,
      data: { codexHome: account.codexHome },
    };
  }
  if (action === "status") {
    const rows = await listAccountPickerRows(cwd);
    const account = maybeAccount ? rows.find((row) => row.name === maybeAccount) : rows.find((row) => row.lastUsed) ?? rows[0];
    if (!account) return { status: "error", message: "No FY accounts are available." };
    return { status: "ok", message: `${account.name}: ${account.authStatus}`, data: account };
  }
  return { status: "error", message: `Unknown /fy-account action: ${action}` };
}

async function executeStatusCommand(command: ParsedFyCommand, cwd: string): Promise<FyCommandResult> {
  const format = command.args[0] ?? "compact";
  if (format !== "compact" && format !== "full") {
    return { status: "error", message: `Unknown /fy-status format: ${format}` };
  }
  const status = await buildFyStatus(cwd);
  return { status: "ok", message: status.line, data: format === "full" ? status : { severity: status.severity } };
}

async function executeContextCommand(command: ParsedFyCommand, cwd: string): Promise<FyCommandResult> {
  const [action, snapshotId] = command.args;
  if (!action) {
    return {
      status: "picker",
      picker: "context-action",
      items: ["save", "load", "reset", "summary", "continue"],
    };
  }
  if (action === "save") {
    const snapshot = await saveContextSnapshot({ cwd, reason: "manual-save" });
    return { status: "ok", message: `context snapshot saved: ${snapshot.manifest.id}`, data: snapshot.manifest };
  }
  if (action === "summary") {
    const summary = await getContextSummary(cwd);
    return {
      status: "ok",
      message: `context ${summary.contextUsagePercent ?? "n/a"}%, allowance ${summary.allowanceRemainingPercent ?? "n/a"}%, snapshot ${summary.lastSnapshotId ?? "n/a"}`,
      data: summary,
    };
  }
  if (action === "reset") {
    await resetContextMetadata(cwd);
    return { status: "ok", message: "context metadata reset" };
  }
  if (action === "load") {
    if (!snapshotId) return { status: "error", message: "Usage: /fy-context load <snapshot-id>" };
    try {
      const manifest = await loadContextSnapshot(snapshotId, cwd);
      return { status: "ok", message: `context snapshot loaded: ${manifest.id}`, data: manifest };
    } catch (error) {
      return { status: "error", message: error instanceof Error ? error.message : String(error) };
    }
  }
  if (action === "continue") {
    const targetAccount = typeof command.options.account === "string" ? command.options.account : null;
    if (!targetAccount) return { status: "error", message: "Usage: /fy-context continue --account <account>" };
    const continuation = await prepareContinuation({ cwd, targetAccount });
    return {
      status: "ok",
      message: `continuation prepared: ${continuation.manifest.id} -> ${targetAccount}`,
      data: {
        manifest: continuation.manifest,
        targetCodexHome: continuation.targetCodexHome,
        decision: continuation.decision,
      },
    };
  }
  return { status: "error", message: `Unknown /fy-context action: ${action}` };
}

function isHarnessDocKind(value: string | undefined): value is HarnessDocKind {
  return value === "product" || value === "architecture" || value === "roadmap";
}

async function executeDocsCommand(command: ParsedFyCommand, cwd: string): Promise<FyCommandResult> {
  const [action, kind] = command.args;
  if (!action) {
    return {
      status: "picker",
      picker: "docs-action",
      items: ["init-harness", "update product", "update architecture", "update roadmap", "summarize-codebase"],
    };
  }
  if (action === "init-harness") {
    const result = await initDocsHarness(cwd);
    const created = result.files.filter((file) => file.status === "created").length;
    const preserved = result.files.filter((file) => file.status === "preserved").length;
    return {
      status: "ok",
      message: `docs harness initialized: ${created} created, ${preserved} preserved`,
      data: result,
    };
  }
  if (action === "update") {
    if (!isHarnessDocKind(kind)) return { status: "error", message: "Usage: /fy-docs update <product|architecture|roadmap>" };
    const result = await updateHarnessDocument(kind, cwd);
    return { status: "ok", message: `docs ${result.status}: ${result.path}`, data: result };
  }
  if (action === "summarize-codebase") {
    const result = await summarizeCodebase(cwd);
    return {
      status: "ok",
      message: `codebase summary written: ${result.path} (${result.sourceFiles} source, ${result.testFiles} test)`,
      data: result,
    };
  }
  if (action === "list") {
    return { status: "ok", message: "docs harness documents", data: listHarnessDocuments() };
  }
  return { status: "error", message: `Unknown /fy-docs action: ${action}` };
}

async function resolveRunId(command: ParsedFyCommand, cwd: string): Promise<string | null> {
  return typeof command.options.run === "string" ? command.options.run : await findLatestOrchestrationRun(cwd);
}

async function executeOrchestrateCommand(command: ParsedFyCommand, cwd: string): Promise<FyCommandResult> {
  const [action] = command.args;
  if (!action) {
    return {
      status: "picker",
      picker: "orchestrate-action",
      items: ["start", "status", "pause", "resume", "stop", "conflicts"],
    };
  }
  if (action === "start") {
    const task = command.args.slice(1).join(" ").trim() || "orchestrated FY task";
    const run = await createOrchestrationRun({ cwd, task });
    return {
      status: "ok",
      message: `orchestration started: ${run.manifest.runId}`,
      data: run,
    };
  }
  if (action === "status") {
    const runId = await resolveRunId(command, cwd);
    if (!runId) return { status: "error", message: "No orchestration run is available." };
    const status = await getOrchestrationStatus(runId, cwd);
    return {
      status: "ok",
      message: `${status.manifest.runId}: ${status.manifest.status}, agents ${status.agents.agents.length}, conflicts ${status.conflicts.conflicts.length}`,
      data: status,
    };
  }
  if (action === "conflicts") {
    const runId = await resolveRunId(command, cwd);
    if (!runId) return { status: "error", message: "No orchestration run is available." };
    const conflicts = await readConflicts(runId, cwd);
    return {
      status: "ok",
      message: `${runId}: ${conflicts.conflicts.length} conflict(s)`,
      data: conflicts,
    };
  }
  if (action === "pause") {
    const runId = await resolveRunId(command, cwd);
    if (!runId) return { status: "error", message: "No orchestration run is available." };
    const manifest = await updateOrchestrationStatus(runId, "blocked", cwd);
    return { status: "ok", message: `orchestration paused: ${manifest.runId}`, data: manifest };
  }
  if (action === "resume") {
    const runId = await resolveRunId(command, cwd);
    if (!runId) return { status: "error", message: "No orchestration run is available." };
    const manifest = await updateOrchestrationStatus(runId, "running", cwd);
    return { status: "ok", message: `orchestration resumed: ${manifest.runId}`, data: manifest };
  }
  if (action === "stop") {
    const runId = await resolveRunId(command, cwd);
    if (!runId) return { status: "error", message: "No orchestration run is available." };
    const manifest = await updateOrchestrationStatus(runId, "cancelled", cwd);
    return { status: "ok", message: `orchestration stopped: ${manifest.runId}`, data: manifest };
  }
  return { status: "error", message: `Unknown /fy-orchestrate action: ${action}` };
}

function pickerOnly(command: ParsedFyCommand): FyCommandResult {
  const spec = FY_COMMAND_REGISTRY.find((item) => item.id === command.id);
  if (!spec) return { status: "error", message: `Unknown FY command: ${command.id}` };
  return { status: "picker", picker: spec.picker, items: [] };
}

export async function executeFyCommand(input: string, cwd = process.cwd()): Promise<FyCommandResult> {
  const command = parseFyCommand(input);
  if (!command) return { status: "error", message: "Not an FY slash command." };
  if (command.id === "/fy-mode") return await executeModeCommand(command, cwd);
  if (command.id === "/fy-context") return await executeContextCommand(command, cwd);
  if (command.id === "/fy-account") return await executeAccountCommand(command, cwd);
  if (command.id === "/fy-status") return await executeStatusCommand(command, cwd);
  if (command.id === "/fy-docs") return await executeDocsCommand(command, cwd);
  if (command.id === "/fy-orchestrate") return await executeOrchestrateCommand(command, cwd);
  return pickerOnly(command);
}
