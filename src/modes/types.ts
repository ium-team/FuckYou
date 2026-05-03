export type FyMode = "orchestrated" | "fast-edit" | "read-only" | "implementation" | "docs-harness";

export interface ModePolicy {
  mode: FyMode;
  description: string;
  edits: "allowed" | "forbidden" | "docs-only";
  planning: "required" | "brief" | "minimal" | "allowed";
  questions: "blockers-only" | "material-ambiguity" | "allowed" | "avoid";
  verification: "minimal" | "targeted" | "thorough" | "evidence-only" | "markdown-schema";
  parallelAgents: "allowed" | "optional" | "read-only-only" | "not-default";
  tmux: "required-when-multi-agent" | "not-required";
  approval: "minimal" | "blockers-only" | "material-ambiguity" | "allowed";
  maxLoops: number;
  outputStyle: "brief" | "normal" | "minimal";
  tokenPosture: "low" | "balanced" | "speed";
}
