export interface FyProjectConfig {
  accounts: string[];
  defaultAccount: string;
  lastUsedAccount?: string;
}

export interface ResolvedAccount {
  name: string;
  codexHome: string;
  config: FyProjectConfig;
}
