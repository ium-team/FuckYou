import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CODEX_HOMES_DIR, DEFAULT_ACCOUNT, PROJECT_FILE, STATE_DIR } from "../config/defaults.js";
import { readJsonFile, writeJsonFileAtomic } from "../utils/fs.js";
import type { FyProjectConfig, ResolvedAccount } from "./types.js";

const ACCOUNT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const FY_ACCOUNT_STATUS_LINE =
  'status_line = ["model-with-reasoning", "current-dir", "git-branch", "context-used", "context-remaining"]';

async function ensureAccountConfigFile(codexHome: string): Promise<void> {
  const configPath = join(codexHome, "config.toml");
  if (existsSync(configPath)) return;
  const contents = [
    "# FY account-local Codex config",
    "# This file belongs to one FY repository/account only.",
    "[tui]",
    FY_ACCOUNT_STATUS_LINE,
    "",
  ].join("\n");
  await writeFile(configPath, contents, "utf-8");
}

export function projectConfigPath(cwd = process.cwd()): string {
  return join(cwd, STATE_DIR, PROJECT_FILE);
}

export function codexHomesRoot(cwd = process.cwd()): string {
  return join(cwd, STATE_DIR, CODEX_HOMES_DIR);
}

export function codexHomePath(account: string, cwd = process.cwd()): string {
  return join(codexHomesRoot(cwd), validateAccountName(account));
}

export function validateAccountName(account: string): string {
  const normalized = account.trim();
  if (!ACCOUNT_NAME_PATTERN.test(normalized) || normalized === "." || normalized === "..") {
    throw new Error("account name must be 1-64 chars and use letters, numbers, dot, dash, or underscore");
  }
  return normalized;
}

export function createInitialProjectConfig(): FyProjectConfig {
  return {
    accounts: [DEFAULT_ACCOUNT],
    defaultAccount: DEFAULT_ACCOUNT,
  };
}

function normalizeProjectConfig(config: FyProjectConfig | null): FyProjectConfig {
  const initial = createInitialProjectConfig();
  if (!config || typeof config !== "object") return initial;

  const accounts = Array.isArray(config.accounts)
    ? Array.from(new Set(config.accounts.filter((account) => {
        try {
          validateAccountName(account);
          return true;
        } catch {
          return false;
        }
      })))
    : [];

  const defaultAccount = (() => {
    try {
      return validateAccountName(config.defaultAccount);
    } catch {
      return DEFAULT_ACCOUNT;
    }
  })();

  const mergedAccounts = accounts.includes(defaultAccount) ? accounts : [...accounts, defaultAccount];
  if (!mergedAccounts.includes(DEFAULT_ACCOUNT) && mergedAccounts.length === 0) {
    mergedAccounts.push(DEFAULT_ACCOUNT);
  }

  const normalized: FyProjectConfig = {
    accounts: mergedAccounts.length > 0 ? mergedAccounts : initial.accounts,
    defaultAccount: mergedAccounts.includes(defaultAccount) ? defaultAccount : initial.defaultAccount,
  };

  if (config.lastUsedAccount) {
    try {
      const lastUsedAccount = validateAccountName(config.lastUsedAccount);
      if (normalized.accounts.includes(lastUsedAccount)) {
        normalized.lastUsedAccount = lastUsedAccount;
      }
    } catch {
      // Ignore malformed persisted account names.
    }
  }

  return normalized;
}

export async function readProjectConfig(cwd = process.cwd()): Promise<FyProjectConfig> {
  return normalizeProjectConfig(await readJsonFile<FyProjectConfig>(projectConfigPath(cwd)));
}

export async function writeProjectConfig(config: FyProjectConfig, cwd = process.cwd()): Promise<void> {
  await writeJsonFileAtomic(projectConfigPath(cwd), normalizeProjectConfig(config));
}

export async function ensureAccount(account: string, cwd = process.cwd()): Promise<ResolvedAccount> {
  const name = validateAccountName(account);
  const config = await readProjectConfig(cwd);
  const accounts = config.accounts.includes(name) ? config.accounts : [...config.accounts, name];
  const nextConfig = {
    ...config,
    accounts,
    defaultAccount: accounts.includes(config.defaultAccount) ? config.defaultAccount : name,
  };
  const codexHome = codexHomePath(name, cwd);
  await mkdir(codexHome, { recursive: true });
  await ensureAccountConfigFile(codexHome);
  await writeProjectConfig(nextConfig, cwd);
  return { name, codexHome, config: nextConfig };
}

export async function setDefaultAccount(account: string, cwd = process.cwd()): Promise<ResolvedAccount> {
  const resolved = await ensureAccount(account, cwd);
  const nextConfig = {
    ...resolved.config,
    defaultAccount: resolved.name,
    lastUsedAccount: resolved.name,
  };
  await writeProjectConfig(nextConfig, cwd);
  return { ...resolved, config: nextConfig };
}

export async function resolveAccount(account?: string | null, cwd = process.cwd()): Promise<ResolvedAccount> {
  const config = await readProjectConfig(cwd);
  const selected = account ? validateAccountName(account) : config.defaultAccount;
  return await ensureAccount(selected, cwd);
}

export async function markAccountUsed(account: string, cwd = process.cwd()): Promise<void> {
  const name = validateAccountName(account);
  const config = await readProjectConfig(cwd);
  const accounts = config.accounts.includes(name) ? config.accounts : [...config.accounts, name];
  await writeProjectConfig({
    ...config,
    accounts,
    lastUsedAccount: name,
  }, cwd);
}
