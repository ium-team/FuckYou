import { join } from "node:path";
import { DEFAULT_MODE, STATE_DIR, STATE_FILE } from "../config/defaults.js";
import type { FyMode } from "../modes/types.js";
import { readJsonFile, writeJsonFileAtomic } from "../utils/fs.js";
import type { FyState } from "./types.js";

export function statePath(cwd = process.cwd()): string {
  return join(cwd, STATE_DIR, STATE_FILE);
}

export function createInitialState(now = new Date()): FyState {
  const iso = now.toISOString();
  return {
    activeMode: DEFAULT_MODE as FyMode,
    createdAt: iso,
    updatedAt: iso,
  };
}

export async function readState(cwd = process.cwd()): Promise<FyState> {
  return (await readJsonFile<FyState>(statePath(cwd))) ?? createInitialState();
}

export async function writeState(state: FyState, cwd = process.cwd()): Promise<void> {
  await writeJsonFileAtomic(statePath(cwd), state);
}

export async function updateMode(mode: FyMode, cwd = process.cwd()): Promise<FyState> {
  const current = await readState(cwd);
  const next = {
    ...current,
    activeMode: mode,
    updatedAt: new Date().toISOString(),
  };
  await writeState(next, cwd);
  return next;
}
