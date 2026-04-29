import { spawn } from "node:child_process";
import { resolveAccount, markAccountUsed } from "../accounts/store.js";
import type { FyMode } from "../modes/types.js";
import { writeModeInstructions } from "./instructions.js";

const CONFIG_FLAG = "-c";
const LONG_CONFIG_FLAG = "--config";
const MODEL_INSTRUCTIONS_FILE_KEY = "model_instructions_file";
const STATUS_LINE_KEY = "tui.status_line";
export const FY_STATUS_LINE_ITEMS = [
  "model-with-reasoning",
  "current-dir",
  "git-branch",
  "context-used",
  "context-remaining",
] as const;

export interface ModeArgResult {
  mode: FyMode | null;
  account: string | null;
  args: string[];
}

export interface CodexLaunchOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  codexBin?: string;
  spawnFn?: typeof spawn;
  account?: string | null;
  injectFyConfig?: boolean;
}

function escapeTomlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isModelInstructionsOverride(value: string): boolean {
  return value.trim().startsWith(`${MODEL_INSTRUCTIONS_FILE_KEY}=`);
}

function isStatusLineOverride(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith(`${STATUS_LINE_KEY}=`) || trimmed.startsWith("status_line=");
}

export function parseModeArgs(args: string[]): ModeArgResult {
  let mode: FyMode | null = null;
  let account: string | null = null;
  const rest: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--manual") {
      mode = "manual";
      continue;
    }
    if (arg === "--auto") {
      mode = "auto";
      continue;
    }
    if (arg === "--budget") {
      mode = "budget";
      continue;
    }
    if (arg === "--fast") {
      mode = "fast";
      continue;
    }
    if (arg === "--account") {
      account = args[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg.startsWith("--account=")) {
      account = arg.slice("--account=".length);
      continue;
    }
    rest.push(arg);
  }

  return { mode, account, args: rest };
}

export function hasModelInstructionsOverride(args: string[]): boolean {
  return hasConfigOverride(args, isModelInstructionsOverride);
}

export function hasStatusLineOverride(args: string[]): boolean {
  return hasConfigOverride(args, isStatusLineOverride);
}

function hasConfigOverride(args: string[], matcher: (value: string) => boolean): boolean {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === CONFIG_FLAG || arg === LONG_CONFIG_FLAG) {
      const next = args[index + 1];
      if (typeof next === "string" && matcher(next)) return true;
      continue;
    }
    if (arg.startsWith(`${LONG_CONFIG_FLAG}=`)) {
      const value = arg.slice(`${LONG_CONFIG_FLAG}=`.length);
      if (matcher(value)) return true;
    }
  }
  return false;
}

export function injectModelInstructionsArgs(args: string[], filePath: string): string[] {
  if (hasModelInstructionsOverride(args)) return args;
  return [...args, CONFIG_FLAG, `${MODEL_INSTRUCTIONS_FILE_KEY}="${escapeTomlString(filePath)}"`];
}

export function injectStatusLineArgs(args: string[]): string[] {
  if (hasStatusLineOverride(args)) return args;
  const items = FY_STATUS_LINE_ITEMS.map((item) => `"${item}"`).join(", ");
  return [...args, CONFIG_FLAG, `${STATUS_LINE_KEY}=[${items}]`];
}

export async function buildCodexArgs(
  mode: FyMode,
  codexArgs: string[],
  options: { cwd?: string; execTask?: string } = {},
): Promise<string[]> {
  const cwd = options.cwd ?? process.cwd();
  const instructionsFile = await writeModeInstructions(mode, cwd);
  const injected = injectStatusLineArgs(injectModelInstructionsArgs(codexArgs, instructionsFile));
  if (options.execTask !== undefined) {
    return ["exec", ...injected, options.execTask];
  }
  return injected;
}

export async function launchCodex(
  mode: FyMode,
  codexArgs: string[],
  options: CodexLaunchOptions & { execTask?: string } = {},
): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const baseEnv = options.env ?? process.env;
  const codexBin = options.codexBin ?? baseEnv.FY_CODEX_BIN ?? "codex";
  const spawnFn = options.spawnFn ?? spawn;
  const account = await resolveAccount(options.account, cwd);
  await markAccountUsed(account.name, cwd);
  const env = {
    ...baseEnv,
    CODEX_HOME: account.codexHome,
  };
  const args = options.injectFyConfig === false
    ? codexArgs
    : await buildCodexArgs(mode, codexArgs, { cwd, execTask: options.execTask });

  return await new Promise((resolve) => {
    const child = spawnFn(codexBin, args, {
      cwd,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", (error) => {
      console.error(`Failed to launch Codex: ${error.message}`);
      resolve(1);
    });
    child.on("exit", (code, signal) => {
      if (typeof code === "number") {
        resolve(code);
        return;
      }
      console.error(`Codex exited from signal ${signal ?? "unknown"}`);
      resolve(1);
    });
  });
}
