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
  enableFyPalette: boolean;
  args: string[];
}

export interface PtyProcessLike {
  write(data: string): void;
  onData(listener: (data: string) => void): void;
  onExit(listener: (event: { exitCode: number; signal?: number }) => void): void;
}

export interface PtyAdapter {
  spawn(file: string, args: string[], options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    name: string;
    cols: number;
    rows: number;
  }): PtyProcessLike;
}

export interface CodexLaunchOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  codexBin?: string;
  spawnFn?: typeof spawn;
  ptyAdapter?: PtyAdapter;
  account?: string | null;
  injectFyConfig?: boolean;
  enableFyPalette?: boolean;
}

export interface FyPaletteAction {
  id: "1" | "2" | "3" | "4";
  label: string;
  command: string;
}

export const FY_PALETTE_PREFILL = "/fy ";

export const FY_PALETTE_ACTIONS: readonly FyPaletteAction[] = [
  { id: "1", label: "Fast Apply", command: "/fy-fast" },
  { id: "2", label: "Deep Plan", command: "/fy-deep" },
  { id: "3", label: "Run Verification", command: "/fy-verify" },
  { id: "4", label: "Open Team Mode", command: "/fy-team" },
] as const;

export function resolveFyPaletteSelection(input: string): FyPaletteAction | null {
  const normalized = input.trim();
  if (!normalized) return null;
  return FY_PALETTE_ACTIONS.find((item) => item.id === normalized) ?? null;
}

function printFyPaletteMenu(): void {
  process.stdout.write("\n[FY Palette] Pick command:\n");
  for (const action of FY_PALETTE_ACTIONS) {
    process.stdout.write(`  ${action.id}) ${action.label} -> ${action.command}\n`);
  }
  process.stdout.write("Select 1-4 (Esc to cancel): ");
}

function attachFyPaletteToPty(pty: PtyProcessLike): () => void {
  if (!process.stdin.isTTY) return () => {};

  const stdin = process.stdin;
  const previousRawMode = stdin.isRaw;
  stdin.setRawMode?.(true);
  stdin.resume();

  const onData = (chunk: Buffer) => {
    const value = chunk.toString("utf-8");
    if (value === "\\") {
      pty.write(FY_PALETTE_PREFILL);
      return;
    }

    pty.write(value);
  };

  stdin.on("data", onData);

  return () => {
    stdin.off("data", onData);
    if (previousRawMode === false) stdin.setRawMode?.(false);
    stdin.pause();
  };
}

async function loadNodePtyAdapter(): Promise<PtyAdapter | null> {
  try {
    const nodePty = await import("node-pty");
    return { spawn: nodePty.spawn };
  } catch {
    return null;
  }
}

export function shouldEnableFyPalette(
  requested: boolean,
  io: { stdinIsTTY: boolean; stdoutIsTTY: boolean } = {
    stdinIsTTY: Boolean(process.stdin.isTTY),
    stdoutIsTTY: Boolean(process.stdout.isTTY),
  },
): boolean {
  if (!requested) return false;
  if (!io.stdinIsTTY || !io.stdoutIsTTY) {
    process.stderr.write("[FY Palette] unavailable: terminal is not interactive.\n");
    return false;
  }
  return true;
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
  let enableFyPalette = false;
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
    if (arg === "--fy-palette") {
      enableFyPalette = true;
      continue;
    }
    if (arg === "--no-fy-palette") {
      enableFyPalette = false;
      continue;
    }
    rest.push(arg);
  }

  return {
    mode,
    account,
    enableFyPalette,
    args: rest,
  };
}

export function parseFyPaletteFlag(args: string[]): { enableFyPalette: boolean; args: string[] } {
  let enableFyPalette = false;
  const rest: string[] = [];
  for (const arg of args) {
    if (arg === "--fy-palette") {
      enableFyPalette = true;
      continue;
    }
    if (arg === "--no-fy-palette") {
      enableFyPalette = false;
      continue;
    }
    rest.push(arg);
  }
  return { enableFyPalette, args: rest };
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

async function launchCodexWithPty(
  codexBin: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; ptyAdapter?: PtyAdapter },
): Promise<number> {
  const ptyAdapter = options.ptyAdapter ?? await loadNodePtyAdapter();
  if (!ptyAdapter) {
    process.stderr.write("[FY Palette] unavailable: node-pty is not installed. Continuing without palette.\n");
    return await new Promise((resolve) => {
      const child = spawn(codexBin, args, {
        cwd: options.cwd,
        env: options.env,
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

  return await new Promise((resolve) => {
    const pty = ptyAdapter.spawn(codexBin, args, {
      cwd: options.cwd,
      env: options.env,
      name: "xterm-256color",
      cols: process.stdout.columns ?? 120,
      rows: process.stdout.rows ?? 30,
    });

    const detachBridge = attachFyPaletteToPty(pty);

    pty.onData((data) => {
      process.stdout.write(data);
    });

    pty.onExit((event) => {
      detachBridge();
      resolve(event.exitCode);
    });
  });
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
  const withPalette = parseFyPaletteFlag(codexArgs);
  const args = options.injectFyConfig === false
    ? withPalette.args
    : await buildCodexArgs(mode, withPalette.args, { cwd, execTask: options.execTask });
  const useFyPalette = shouldEnableFyPalette(options.enableFyPalette ?? withPalette.enableFyPalette);

  if (useFyPalette) {
    return await launchCodexWithPty(codexBin, args, {
      cwd,
      env,
      ptyAdapter: options.ptyAdapter,
    });
  }

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
