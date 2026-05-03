import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { join, relative, resolve, sep } from "node:path";
import { CODEX_HOMES_DIR, DEFAULT_ACCOUNT, PROJECT_FILE, STATE_DIR } from "../config/defaults.js";
import { readJsonFile, writeJsonFileAtomic } from "../utils/fs.js";
import { bootstrapFyState } from "../state/store.js";
import type {
  AccountAuthStatus,
  AccountPickerRow,
  FyAccountConfig,
  FyProjectConfig,
  LegacyFyProjectConfig,
  ResolvedAccount,
} from "./types.js";

const ACCOUNT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const FY_ACCOUNT_STATUS_LINE =
  'status_line = ["model-with-reasoning", "current-dir", "git-branch", "context-used", "context-remaining", "five-hour-limit", "weekly-limit"]';
const FY_SKILL_CONTENTS = `---
name: fy
description: FY entrypoint for repo-local operating shortcuts
---

# FY

Use \`/fy\` as the primary FY command entrypoint for this repository/account.
`;

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

async function ensureFySkillScaffold(codexHome: string): Promise<void> {
  const skillPath = join(codexHome, "skills", "fy", "SKILL.md");
  if (existsSync(skillPath)) return;
  await mkdir(join(codexHome, "skills", "fy"), { recursive: true });
  await writeFile(skillPath, FY_SKILL_CONTENTS, "utf-8");
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

function relativeCodexHome(account: string): string {
  return join(STATE_DIR, CODEX_HOMES_DIR, validateAccountName(account));
}

function assertInsideCodexHomes(path: string, cwd: string): void {
  const root = resolve(codexHomesRoot(cwd));
  const target = resolve(cwd, path);
  const rel = relative(root, target);
  if (rel.startsWith("..") || rel === "" || rel.includes(`..${sep}`) || resolve(root, rel) !== target) {
    throw new Error("account codexHome must stay inside .fy/codex-homes");
  }
}

export function validateAccountName(account: string): string {
  const normalized = account.trim();
  if (!ACCOUNT_NAME_PATTERN.test(normalized) || normalized === "." || normalized === "..") {
    throw new Error("account name must be 1-64 chars and use letters, numbers, dot, dash, or underscore");
  }
  return normalized;
}

export function createInitialProjectConfig(): FyProjectConfig {
  const now = new Date().toISOString();
  const account = createAccountConfig(DEFAULT_ACCOUNT, now);
  return {
    schemaVersion: 1,
    projectId: `fy-${randomUUID()}`,
    createdAt: now,
    updatedAt: now,
    defaultAccount: DEFAULT_ACCOUNT,
    lastAccount: null,
    accounts: {
      [DEFAULT_ACCOUNT]: account,
    },
  };
}

function createAccountConfig(name: string, now = new Date().toISOString()): FyAccountConfig {
  const account = validateAccountName(name);
  return {
    name: account,
    codexHome: relativeCodexHome(account),
    createdAt: now,
    lastUsedAt: null,
    authStatus: "unknown",
    allowance: {
      status: "unknown",
      remainingPercent: null,
      resetAt: null,
      source: "none",
    },
  };
}

function normalizeLegacyConfig(config: LegacyFyProjectConfig): FyProjectConfig {
  const now = new Date().toISOString();
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
  const names = accounts.includes(defaultAccount) ? accounts : [...accounts, defaultAccount];
  if (names.length === 0) names.push(DEFAULT_ACCOUNT);
  const accountMap = Object.fromEntries(names.map((name) => [name, createAccountConfig(name, now)]));
  const lastAccount = config.lastUsedAccount && accountMap[config.lastUsedAccount] ? config.lastUsedAccount : null;
  return {
    schemaVersion: 1,
    projectId: `fy-${randomUUID()}`,
    createdAt: now,
    updatedAt: now,
    defaultAccount: accountMap[defaultAccount] ? defaultAccount : names[0],
    lastAccount,
    accounts: accountMap,
  };
}

function normalizeProjectConfig(config: FyProjectConfig | LegacyFyProjectConfig | null, cwd = process.cwd()): FyProjectConfig {
  const initial = createInitialProjectConfig();
  if (!config || typeof config !== "object") return initial;
  if (Array.isArray((config as LegacyFyProjectConfig).accounts)) {
    return normalizeProjectConfig(normalizeLegacyConfig(config as LegacyFyProjectConfig), cwd);
  }

  const typed = config as FyProjectConfig;
  const now = new Date().toISOString();
  const accounts: Record<string, FyAccountConfig> = {};
  for (const [rawName, rawAccount] of Object.entries(typed.accounts ?? {})) {
    try {
      const name = validateAccountName(rawAccount?.name ?? rawName);
      const codexHome = rawAccount?.codexHome ?? relativeCodexHome(name);
      assertInsideCodexHomes(codexHome, cwd);
      accounts[name] = {
        name,
        codexHome,
        createdAt: typeof rawAccount?.createdAt === "string" ? rawAccount.createdAt : now,
        lastUsedAt: typeof rawAccount?.lastUsedAt === "string" ? rawAccount.lastUsedAt : null,
        authStatus: isAccountAuthStatus(rawAccount?.authStatus) ? rawAccount.authStatus : "unknown",
        allowance: {
          status: rawAccount?.allowance?.status === "available" || rawAccount?.allowance?.status === "error"
            ? rawAccount.allowance.status
            : "unknown",
          remainingPercent: typeof rawAccount?.allowance?.remainingPercent === "number"
            ? rawAccount.allowance.remainingPercent
            : null,
          resetAt: typeof rawAccount?.allowance?.resetAt === "string" ? rawAccount.allowance.resetAt : null,
          source: rawAccount?.allowance?.source === "codex-metadata" ? "codex-metadata" : "none",
        },
      };
    } catch {
      // Ignore malformed persisted account entries.
    }
  }
  if (Object.keys(accounts).length === 0) {
    accounts[DEFAULT_ACCOUNT] = createAccountConfig(DEFAULT_ACCOUNT, now);
  }

  const defaultAccount = (() => {
    try {
      return validateAccountName(typed.defaultAccount);
    } catch {
      return DEFAULT_ACCOUNT;
    }
  })();
  if (!accounts[defaultAccount]) accounts[defaultAccount] = createAccountConfig(defaultAccount, now);
  const lastAccount = typeof typed.lastAccount === "string" && accounts[typed.lastAccount] ? typed.lastAccount : null;
  return {
    schemaVersion: 1,
    projectId: typeof typed.projectId === "string" ? typed.projectId : initial.projectId,
    createdAt: typeof typed.createdAt === "string" ? typed.createdAt : initial.createdAt,
    updatedAt: typeof typed.updatedAt === "string" ? typed.updatedAt : now,
    defaultAccount,
    lastAccount,
    accounts,
  };
}

export async function readProjectConfig(cwd = process.cwd()): Promise<FyProjectConfig> {
  return normalizeProjectConfig(await readJsonFile<FyProjectConfig | LegacyFyProjectConfig>(projectConfigPath(cwd)), cwd);
}

export async function writeProjectConfig(config: FyProjectConfig, cwd = process.cwd()): Promise<void> {
  await bootstrapFyState(cwd);
  await writeJsonFileAtomic(projectConfigPath(cwd), {
    ...normalizeProjectConfig(config, cwd),
    updatedAt: new Date().toISOString(),
  });
}

export async function ensureAccount(account: string, cwd = process.cwd()): Promise<ResolvedAccount> {
  const name = validateAccountName(account);
  const config = await readProjectConfig(cwd);
  const accounts = {
    ...config.accounts,
    [name]: config.accounts[name] ?? createAccountConfig(name),
  };
  const nextConfig = {
    ...config,
    accounts,
    defaultAccount: accounts[config.defaultAccount] ? config.defaultAccount : name,
  };
  const codexHome = codexHomePath(name, cwd);
  await bootstrapFyState(cwd);
  await mkdir(codexHome, { recursive: true });
  await ensureAccountConfigFile(codexHome);
  await ensureFySkillScaffold(codexHome);
  await writeProjectConfig(nextConfig, cwd);
  return { name, codexHome, config: nextConfig };
}

export async function setDefaultAccount(account: string, cwd = process.cwd()): Promise<ResolvedAccount> {
  const resolved = await ensureAccount(account, cwd);
  const nextConfig = {
    ...resolved.config,
    defaultAccount: resolved.name,
    lastAccount: resolved.name,
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
  const current = config.accounts[name] ?? createAccountConfig(name);
  const now = new Date().toISOString();
  const accounts = {
    ...config.accounts,
    [name]: {
      ...current,
      lastUsedAt: now,
    },
  };
  await writeProjectConfig({
    ...config,
    accounts,
    lastAccount: name,
  }, cwd);
}

function isAccountAuthStatus(value: unknown): value is AccountAuthStatus {
  return value === "ready" || value === "logged-out" || value === "unknown" || value === "error";
}

export async function listAccountPickerRows(cwd = process.cwd()): Promise<AccountPickerRow[]> {
  const config = await readProjectConfig(cwd);
  return Object.values(config.accounts)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((account) => ({
      name: account.name,
      codexHome: resolve(cwd, account.codexHome),
      authStatus: account.authStatus,
      allowancePercent: account.allowance.remainingPercent,
      resetAt: account.allowance.resetAt,
      lastUsed: account.name === config.lastAccount,
    }));
}

export function detectLocalAuthStatus(account: string, cwd = process.cwd()): AccountAuthStatus {
  const home = codexHomePath(account, cwd);
  if (existsSync(join(home, "auth.json"))) return "ready";
  return existsSync(home) ? "logged-out" : "unknown";
}

export async function updateAccountAuthStatus(
  account: string,
  authStatus: AccountAuthStatus,
  cwd = process.cwd(),
): Promise<void> {
  const name = validateAccountName(account);
  const config = await readProjectConfig(cwd);
  const current = config.accounts[name] ?? createAccountConfig(name);
  await writeProjectConfig({
    ...config,
    accounts: {
      ...config.accounts,
      [name]: {
        ...current,
        authStatus,
      },
    },
  }, cwd);
}

export async function checkAccountReadiness(
  account: string,
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    codexBin?: string;
    spawnFn?: typeof spawn;
  } = {},
): Promise<AccountAuthStatus> {
  const cwd = options.cwd ?? process.cwd();
  const name = validateAccountName(account);
  const codexHome = codexHomePath(name, cwd);
  const spawnFn = options.spawnFn ?? spawn;
  const codexBin = options.codexBin ?? options.env?.FY_CODEX_BIN ?? "codex";
  const env = {
    ...(options.env ?? process.env),
    CODEX_HOME: codexHome,
  };
  const status = await new Promise<AccountAuthStatus>((resolveStatus) => {
    const child = spawnFn(codexBin, ["login", "status"], {
      cwd,
      env,
      stdio: "ignore",
      shell: process.platform === "win32",
    });
    child.on("error", () => resolveStatus(detectLocalAuthStatus(name, cwd)));
    child.on("exit", (code) => resolveStatus(code === 0 ? "ready" : "logged-out"));
  });
  await updateAccountAuthStatus(name, status, cwd);
  return status;
}
