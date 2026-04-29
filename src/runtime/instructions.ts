import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { STATE_DIR } from "../config/defaults.js";
import { getModePolicy } from "../modes/policies.js";
import type { FyMode } from "../modes/types.js";

export function instructionsPath(cwd = process.cwd()): string {
  return join(cwd, STATE_DIR, "instructions.md");
}

export function buildModeInstructions(mode: FyMode): string {
  const policy = getModePolicy(mode);
  return `# FY Runtime Instructions

You are running inside FY, a lightweight personal AI operating layer.

Active mode: ${policy.mode}
Mode purpose: ${policy.description}

Operating policy:
- Approval posture: ${policy.approval}
- Maximum loop count: ${policy.maxLoops}
- Output style: ${policy.outputStyle}
- Verification level: ${policy.verification}
- Token posture: ${policy.tokenPosture}

Behavior:
- Keep the amount of process proportional to the task.
- Do not introduce broad refactors unless the user asks for them.
- For frontend/UI work, prefer small visible iterations and ask at natural review points.
- For backend/internal logic, prefer direct implementation with clear verification.
- For budget mode, keep outputs short and inspect only the context needed for the next action.
- For auto mode, continue through plan, execution, and verification until a guardrail or repeated failure stops you.
`;
}

export async function writeModeInstructions(mode: FyMode, cwd = process.cwd()): Promise<string> {
  const path = instructionsPath(cwd);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buildModeInstructions(mode), "utf-8");
  return path;
}
