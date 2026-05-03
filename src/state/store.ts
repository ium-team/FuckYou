import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  CODEX_HOMES_DIR,
  CONTEXT_SNAPSHOTS_DIR,
  DEFAULT_MODE,
  METRICS_FILE,
  ORCHESTRATION_DIR,
  STATE_DIR,
  STATE_FILE,
  TUI_STATE_FILE,
} from "../config/defaults.js";
import { isFyMode } from "../modes/policies.js";
import type { FyMode } from "../modes/types.js";
import { readJsonFile, writeJsonFileAtomic } from "../utils/fs.js";
import type { FyMetrics, FyState, FyTuiState } from "./types.js";

export function statePath(cwd = process.cwd()): string {
  return join(cwd, STATE_DIR, STATE_FILE);
}

export function tuiStatePath(cwd = process.cwd()): string {
  return join(cwd, STATE_DIR, TUI_STATE_FILE);
}

export function metricsPath(cwd = process.cwd()): string {
  return join(cwd, STATE_DIR, METRICS_FILE);
}

function getCurrentBranch(cwd = process.cwd()): string | null {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || null;
  } catch {
    return null;
  }
}

export function createInitialState(now = new Date(), cwd = process.cwd()): FyState {
  const iso = now.toISOString();
  return {
    schemaVersion: 1,
    activeMode: DEFAULT_MODE as FyMode,
    activeAccount: null,
    activeSession: {
      id: null,
      startedAt: null,
      model: null,
      repoPath: cwd,
      branch: getCurrentBranch(cwd),
    },
    context: {
      usagePercent: null,
      warningThresholdPercent: 70,
      lastSnapshotId: null,
    },
    allowance: {
      remainingPercent: null,
      warningThresholdPercent: 10,
      resetAt: null,
      lastCheckedAt: null,
    },
    createdAt: iso,
    updatedAt: iso,
  };
}

export function createInitialTuiState(): FyTuiState {
  return {
    schemaVersion: 1,
    lastScreen: "account-picker",
    lastSelectedCommand: null,
    statusLine: {
      enabled: true,
      compact: true,
    },
    orchestrationLayout: {
      preferred: "leader-grid",
    },
  };
}

export function createInitialMetrics(): FyMetrics {
  return {
    schemaVersion: 1,
    totalTurns: null,
    sessionTurns: null,
    lastActivity: null,
    sessionInputTokens: null,
    sessionOutputTokens: null,
    sessionTotalTokens: null,
  };
}

function normalizePercent(value: unknown, fallback: number | null): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

function normalizeState(raw: Partial<FyState> | null | undefined, cwd: string): FyState {
  const initial = createInitialState(new Date(), cwd);
  if (!raw || typeof raw !== "object") return initial;

  const activeMode = typeof raw.activeMode === "string" && isFyMode(raw.activeMode)
    ? raw.activeMode
    : initial.activeMode;
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : initial.createdAt;
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : initial.updatedAt;
  const activeSession = raw.activeSession && typeof raw.activeSession === "object"
    ? raw.activeSession
    : initial.activeSession;
  const context = raw.context && typeof raw.context === "object" ? raw.context : initial.context;
  const allowance = raw.allowance && typeof raw.allowance === "object" ? raw.allowance : initial.allowance;

  return {
    schemaVersion: 1,
    activeMode,
    activeAccount: typeof raw.activeAccount === "string" ? raw.activeAccount : null,
    activeSession: {
      id: typeof activeSession.id === "string" ? activeSession.id : null,
      startedAt: typeof activeSession.startedAt === "string" ? activeSession.startedAt : null,
      model: typeof activeSession.model === "string" ? activeSession.model : null,
      repoPath: typeof activeSession.repoPath === "string" ? activeSession.repoPath : cwd,
      branch: typeof activeSession.branch === "string" ? activeSession.branch : null,
    },
    context: {
      usagePercent: normalizePercent(context.usagePercent, null),
      warningThresholdPercent: normalizePercent(context.warningThresholdPercent, 70) ?? 70,
      lastSnapshotId: typeof context.lastSnapshotId === "string" ? context.lastSnapshotId : null,
    },
    allowance: {
      remainingPercent: normalizePercent(allowance.remainingPercent, null),
      warningThresholdPercent: normalizePercent(allowance.warningThresholdPercent, 10) ?? 10,
      resetAt: typeof allowance.resetAt === "string" ? allowance.resetAt : null,
      lastCheckedAt: typeof allowance.lastCheckedAt === "string" ? allowance.lastCheckedAt : null,
    },
    createdAt,
    updatedAt,
    lastRun: raw.lastRun,
  };
}

export async function readState(cwd = process.cwd()): Promise<FyState> {
  return normalizeState(await readJsonFile<Partial<FyState>>(statePath(cwd)), cwd);
}

export async function writeState(state: FyState, cwd = process.cwd()): Promise<void> {
  await writeJsonFileAtomic(statePath(cwd), normalizeState(state, cwd));
}

export async function updateMode(mode: FyMode, cwd = process.cwd()): Promise<FyState> {
  const current = await readState(cwd);
  const next = {
    ...current,
    activeMode: mode,
    updatedAt: new Date().toISOString(),
  };
  await writeState(next, cwd);
  return next;
}

export async function updateActiveAccount(account: string, cwd = process.cwd()): Promise<FyState> {
  const current = await readState(cwd);
  const next = {
    ...current,
    activeAccount: account,
    updatedAt: new Date().toISOString(),
  };
  await writeState(next, cwd);
  return next;
}

export async function bootstrapFyState(cwd = process.cwd()): Promise<void> {
  await mkdir(join(cwd, STATE_DIR, CODEX_HOMES_DIR), { recursive: true });
  await mkdir(join(cwd, STATE_DIR, CONTEXT_SNAPSHOTS_DIR), { recursive: true });
  await mkdir(join(cwd, STATE_DIR, ORCHESTRATION_DIR, "runs"), { recursive: true });
  if (!existsSync(statePath(cwd))) {
    const state = createInitialState(new Date(), cwd);
    state.activeSession.repoPath = cwd;
    await writeState(state, cwd);
  }
  if (!existsSync(tuiStatePath(cwd))) {
    await writeJsonFileAtomic(tuiStatePath(cwd), createInitialTuiState());
  }
  if (!existsSync(metricsPath(cwd))) {
    await writeJsonFileAtomic(metricsPath(cwd), createInitialMetrics());
  }
}
