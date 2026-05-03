export interface TmuxPaneSpec {
  runId: string;
  agentId: string;
  role: string;
  title: string;
}

export interface TmuxPaneInfo {
  paneId: string;
  title: string;
  isAgent: boolean;
  isHud: boolean;
  isShell: boolean;
  inCopyMode: boolean;
}

export interface TmuxAdapter {
  startSession(sessionName: string, layout: "leader-grid"): Promise<void>;
  startAgentPane(sessionName: string, spec: TmuxPaneSpec): Promise<TmuxPaneInfo>;
  inspectPane(paneId: string): Promise<TmuxPaneInfo | null>;
  sendKeys(paneId: string, input: string): Promise<void>;
  closePane(paneId: string): Promise<void>;
}

export type TmuxInjectionStatus =
  | "sent"
  | "pane_not_found"
  | "pane_not_verified"
  | "pane_in_copy_mode"
  | "hud_pane"
  | "shell_pane"
  | "cooldown"
  | "duplicate"
  | "cap_reached";

export interface TmuxInjectionGuardState {
  lastSentAtByPane: Map<string, number>;
  lastInputByPane: Map<string, string>;
  sentCountByPane: Map<string, number>;
}

export interface TmuxInjectionOptions {
  now?: number;
  cooldownMs?: number;
  perPaneCap?: number;
  guardState?: TmuxInjectionGuardState;
}
