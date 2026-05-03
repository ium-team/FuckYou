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

You are running inside FY, an extensible repo-local AI operating layer.

Active mode: ${policy.mode}
Mode purpose: ${policy.description}

Operating policy:
- Edit policy: ${policy.edits}
- Planning posture: ${policy.planning}
- Question posture: ${policy.questions}
- Approval posture: ${policy.approval}
- Maximum loop count: ${policy.maxLoops}
- Output style: ${policy.outputStyle}
- Verification level: ${policy.verification}
- Parallel agents: ${policy.parallelAgents}
- tmux policy: ${policy.tmux}
- Token posture: ${policy.tokenPosture}

Behavior:
- Keep the amount of process proportional to the task.
- Prefer \`/fy\` as the primary FY slash entrypoint when available.
- Do not introduce broad refactors unless the user asks for them.
- If active mode is read-only, do not modify source files.
- If active mode is orchestrated, create ownership metadata before parallel write work.
- If active mode is fast-edit, use the smallest useful validation and escalate only on failure.
- If active mode is docs-harness, keep edits to documentation or harness artifacts and mark assumptions.
- If active mode is implementation, use targeted tests/checks for changed behavior.
`;
}

export async function writeModeInstructions(mode: FyMode, cwd = process.cwd()): Promise<string> {
  const path = instructionsPath(cwd);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buildModeInstructions(mode), "utf-8");
  return path;
}
