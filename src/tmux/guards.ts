import type {
  TmuxAdapter,
  TmuxInjectionGuardState,
  TmuxInjectionOptions,
  TmuxInjectionStatus,
  TmuxPaneInfo,
} from "./types.js";

export function createTmuxInjectionGuardState(): TmuxInjectionGuardState {
  return {
    lastSentAtByPane: new Map(),
    lastInputByPane: new Map(),
    sentCountByPane: new Map(),
  };
}

export function isVerifiedAgentPane(info: TmuxPaneInfo | null): info is TmuxPaneInfo {
  return Boolean(info && info.isAgent && !info.isHud && !info.isShell);
}

export async function sendGuardedAgentInput(
  adapter: TmuxAdapter,
  paneId: string,
  input: string,
  options: TmuxInjectionOptions = {},
): Promise<TmuxInjectionStatus> {
  const info = await adapter.inspectPane(paneId);
  if (!info) return "pane_not_found";
  if (info.isHud) return "hud_pane";
  if (info.isShell) return "shell_pane";
  if (!isVerifiedAgentPane(info)) return "pane_not_verified";
  if (info.inCopyMode) return "pane_in_copy_mode";

  const guardState = options.guardState ?? createTmuxInjectionGuardState();
  const now = options.now ?? Date.now();
  const cooldownMs = options.cooldownMs ?? 1000;
  const perPaneCap = options.perPaneCap ?? 20;
  const sentCount = guardState.sentCountByPane.get(paneId) ?? 0;
  if (sentCount >= perPaneCap) return "cap_reached";

  const lastSentAt = guardState.lastSentAtByPane.get(paneId);
  if (lastSentAt !== undefined && now - lastSentAt < cooldownMs) return "cooldown";

  if (guardState.lastInputByPane.get(paneId) === input) return "duplicate";

  await adapter.sendKeys(paneId, input);
  guardState.lastSentAtByPane.set(paneId, now);
  guardState.lastInputByPane.set(paneId, input);
  guardState.sentCountByPane.set(paneId, sentCount + 1);
  return "sent";
}
