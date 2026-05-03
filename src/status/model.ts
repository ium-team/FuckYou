import { readProjectConfig } from "../accounts/store.js";
import { readState } from "../state/store.js";
import type { FyStatusModel, StatusSeverity } from "./types.js";

function formatPercent(value: number | null): string {
  return typeof value === "number" ? `${value}%` : "n/a";
}

function formatValue(value: string | null): string {
  return value && value.trim().length > 0 ? value : "n/a";
}

function chooseSeverity(status: Omit<FyStatusModel, "severity" | "line">): StatusSeverity {
  if (status.account.authStatus === "error" || status.account.authStatus === "logged-out") {
    return "blocking";
  }
  if (
    typeof status.account.allowancePercent === "number"
    && status.account.allowancePercent <= status.account.allowanceWarningThresholdPercent
  ) {
    return "allowance-warning";
  }
  if (
    typeof status.context.usagePercent === "number"
    && status.context.usagePercent >= status.context.warningThresholdPercent
  ) {
    return "context-warning";
  }
  return "normal";
}

function buildStatusLine(status: Omit<FyStatusModel, "severity" | "line">): string {
  return [
    `FY ${status.mode}`,
    `acct ${status.account.name} ${formatPercent(status.account.allowancePercent)} reset ${formatValue(status.account.resetAt)}`,
    `ctx ${formatPercent(status.context.usagePercent)}`,
    formatValue(status.runtime.model),
    formatValue(status.runtime.branch),
    status.runtime.repoPath,
  ].join(" | ");
}

export async function buildFyStatus(cwd = process.cwd()): Promise<FyStatusModel> {
  const [project, state] = await Promise.all([readProjectConfig(cwd), readState(cwd)]);
  const accountName = state.activeAccount ?? project.lastAccount ?? project.defaultAccount;
  const account = project.accounts[accountName] ?? project.accounts[project.defaultAccount];
  const base = {
    mode: state.activeMode,
    account: {
      name: account.name,
      authStatus: account.authStatus,
      allowancePercent: account.allowance.remainingPercent,
      allowanceWarningThresholdPercent: state.allowance.warningThresholdPercent,
      resetAt: account.allowance.resetAt,
    },
    context: {
      usagePercent: state.context.usagePercent,
      warningThresholdPercent: state.context.warningThresholdPercent,
    },
    runtime: {
      model: state.activeSession.model,
      repoPath: state.activeSession.repoPath,
      branch: state.activeSession.branch,
    },
    orchestration: {
      activeRunId: null,
    },
  };
  return {
    ...base,
    severity: chooseSeverity(base),
    line: buildStatusLine(base),
  };
}
