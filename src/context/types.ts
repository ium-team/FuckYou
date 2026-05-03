import type { FyMode } from "../modes/types.js";

export type ContextSnapshotReason = "manual-save" | "low-allowance-continuation" | "context-warning" | "restore";
export type ContextRestoreStatus = "pending" | "restored" | "failed";

export interface ContextSnapshotManifest {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  sourceAccount: string;
  sourceSessionId: string | null;
  mode: FyMode;
  reason: ContextSnapshotReason;
  files: {
    summary: "summary.md";
    handoff: "handoff.md";
  };
  restore: {
    targetAccount: string | null;
    status: ContextRestoreStatus;
  };
}

export interface SavedContextSnapshot {
  manifest: ContextSnapshotManifest;
  directory: string;
  summaryPath: string;
  handoffPath: string;
}

export interface ContextSummary {
  activeMode: FyMode;
  activeAccount: string;
  activeSessionId: string | null;
  contextUsagePercent: number | null;
  allowanceRemainingPercent: number | null;
  lastSnapshotId: string | null;
}

export interface ContinuationDecision {
  shouldContinueWithAnotherAccount: boolean;
  reason: "low-allowance" | "safe-to-continue" | "unknown-allowance";
  snapshotRequired: boolean;
}
