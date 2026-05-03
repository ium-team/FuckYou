import { getModePolicy } from "../modes/policies.js";
import type { FyMode } from "../modes/types.js";

export interface RunPlan {
  task: string;
  mode: FyMode;
  policy: {
    edits: string;
    planning: string;
    questions: string;
    approval: string;
    maxLoops: number;
    outputStyle: string;
    verification: string;
    parallelAgents: string;
    tmux: string;
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
      edits: policy.edits,
      planning: policy.planning,
      questions: policy.questions,
      approval: policy.approval,
      maxLoops: policy.maxLoops,
      outputStyle: policy.outputStyle,
      verification: policy.verification,
      parallelAgents: policy.parallelAgents,
      tmux: policy.tmux,
      tokenPosture: policy.tokenPosture,
    },
    phases: mode === "fast-edit" ? ["execute", "verify"] : ["plan", "execute", "verify"],
    implemented: false,
  };
}
