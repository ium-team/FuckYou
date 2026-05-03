export interface FyProjectConfig {
  schemaVersion: 1;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  defaultAccount: string;
  lastAccount: string | null;
  accounts: Record<string, FyAccountConfig>;
}

export type AccountAuthStatus = "ready" | "logged-out" | "unknown" | "error";
export type AccountAllowanceStatus = "available" | "unknown" | "error";

export interface AccountAllowanceMetadata {
  status: AccountAllowanceStatus;
  remainingPercent: number | null;
  resetAt: string | null;
  source: "codex-metadata" | "none";
}

export interface FyAccountConfig {
  name: string;
  codexHome: string;
  createdAt: string;
  lastUsedAt: string | null;
  authStatus: AccountAuthStatus;
  allowance: AccountAllowanceMetadata;
}

export interface LegacyFyProjectConfig {
  accounts: string[];
  defaultAccount: string;
  lastUsedAccount?: string;
}

export interface ResolvedAccount {
  name: string;
  codexHome: string;
  config: FyProjectConfig;
}

export interface AccountPickerRow {
  name: string;
  codexHome: string;
  authStatus: AccountAuthStatus;
  allowancePercent: number | null;
  resetAt: string | null;
  lastUsed: boolean;
}
