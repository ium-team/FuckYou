import type { FyMode } from "../modes/types.js";

export interface ActiveSessionState {
  id: string | null;
  startedAt: string | null;
  model: string | null;
  repoPath: string;
  branch: string | null;
}

export interface ContextState {
  usagePercent: number | null;
  warningThresholdPercent: number;
  lastSnapshotId: string | null;
}

export interface AllowanceState {
  remainingPercent: number | null;
  warningThresholdPercent: number;
  resetAt: string | null;
  lastCheckedAt: string | null;
}

export interface FyState {
  schemaVersion: 1;
  activeMode: FyMode;
  activeAccount: string | null;
  activeSession: ActiveSessionState;
  context: ContextState;
  allowance: AllowanceState;
  createdAt: string;
  updatedAt: string;
  lastRun?: {
    task: string;
    mode: FyMode;
    phase: "planned" | "stubbed";
    status?: "idle" | "planned" | "running" | "complete" | "failed";
    finishedAt?: string | null;
    summary?: string | null;
    createdAt: string;
  };
}

export interface FyTuiState {
  schemaVersion: 1;
  lastScreen: "account-picker" | "codex" | "status" | "unknown";
  lastSelectedCommand: string | null;
  statusLine: {
    enabled: boolean;
    compact: boolean;
  };
  orchestrationLayout: {
    preferred: "leader-grid";
  };
}

export interface FyMetrics {
  schemaVersion: 1;
  totalTurns: number | null;
  sessionTurns: number | null;
  lastActivity: string | null;
  sessionInputTokens: number | null;
  sessionOutputTokens: number | null;
  sessionTotalTokens: number | null;
}
