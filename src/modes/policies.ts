import type { FyMode, ModePolicy } from "./types.js";

export const MODE_POLICIES: Record<FyMode, ModePolicy> = {
  orchestrated: {
    mode: "orchestrated",
    description: "Deep autonomous delivery with planning, ownership, parallel lanes, and thorough verification.",
    edits: "allowed",
    planning: "required",
    questions: "blockers-only",
    verification: "thorough",
    parallelAgents: "allowed",
    tmux: "required-when-multi-agent",
    approval: "blockers-only",
    maxLoops: 5,
    outputStyle: "brief",
    tokenPosture: "balanced",
  },
  "fast-edit": {
    mode: "fast-edit",
    description: "Small exact edits with the smallest useful verification.",
    edits: "allowed",
    planning: "minimal",
    questions: "avoid",
    verification: "minimal",
    parallelAgents: "not-default",
    tmux: "not-required",
    approval: "minimal",
    maxLoops: 1,
    outputStyle: "brief",
    tokenPosture: "speed",
  },
  "read-only": {
    mode: "read-only",
    description: "Explain, inspect, research, or plan without modifying source files.",
    edits: "forbidden",
    planning: "allowed",
    questions: "allowed",
    verification: "evidence-only",
    parallelAgents: "read-only-only",
    tmux: "not-required",
    approval: "allowed",
    maxLoops: 2,
    outputStyle: "normal",
    tokenPosture: "balanced",
  },
  implementation: {
    mode: "implementation",
    description: "Normal development with focused context gathering, edits, and targeted checks.",
    edits: "allowed",
    planning: "brief",
    questions: "material-ambiguity",
    verification: "targeted",
    parallelAgents: "optional",
    tmux: "not-required",
    approval: "material-ambiguity",
    maxLoops: 3,
    outputStyle: "normal",
    tokenPosture: "balanced",
  },
  "docs-harness": {
    mode: "docs-harness",
    description: "Documentation and harness work with assumptions marked and Markdown/schema checks.",
    edits: "docs-only",
    planning: "required",
    questions: "allowed",
    verification: "markdown-schema",
    parallelAgents: "optional",
    tmux: "not-required",
    approval: "material-ambiguity",
    maxLoops: 3,
    outputStyle: "normal",
    tokenPosture: "balanced",
  },
};

export function isFyMode(value: string): value is FyMode {
  return Object.prototype.hasOwnProperty.call(MODE_POLICIES, value);
}

export function getModePolicy(mode: FyMode): ModePolicy {
  return MODE_POLICIES[mode];
}

export function listModePolicies(): ModePolicy[] {
  return Object.values(MODE_POLICIES);
}
