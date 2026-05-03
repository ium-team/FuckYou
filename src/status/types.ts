import type { AccountAuthStatus } from "../accounts/types.js";
import type { FyMode } from "../modes/types.js";

export type StatusSeverity = "normal" | "context-warning" | "allowance-warning" | "blocking";

export interface FyStatusModel {
  mode: FyMode;
  account: {
    name: string;
    authStatus: AccountAuthStatus;
    allowancePercent: number | null;
    allowanceWarningThresholdPercent: number;
    resetAt: string | null;
  };
  context: {
    usagePercent: number | null;
    warningThresholdPercent: number;
  };
  runtime: {
    model: string | null;
    repoPath: string;
    branch: string | null;
  };
  orchestration: {
    activeRunId: string | null;
  };
  severity: StatusSeverity;
  line: string;
}
