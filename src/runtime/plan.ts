import { getModePolicy } from "../modes/policies.js";
import type { FyMode } from "../modes/types.js";

export interface RunPlan {
  task: string;
  mode: FyMode;
  policy: {
    approval: string;
    maxLoops: number;
    outputStyle: string;
    verification: string;
    tokenPosture: string;
  };
  phases: string[];
  implemented: false;
}

export function createRunPlan(task: string, mode: FyMode): RunPlan {
  const policy = getModePolicy(mode);
  return {
    task,
    mode,
    policy: {
      approval: policy.approval,
      maxLoops: policy.maxLoops,
      outputStyle: policy.outputStyle,
      verification: policy.verification,
      tokenPosture: policy.tokenPosture,
    },
    phases: mode === "fast" ? ["execute", "verify"] : ["plan", "execute", "verify"],
    implemented: false,
  };
}
