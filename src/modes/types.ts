export type FyMode = "manual" | "auto" | "budget" | "fast";

export interface ModePolicy {
  mode: FyMode;
  description: string;
  approval: "frequent" | "checkpoint" | "minimal";
  maxLoops: number;
  outputStyle: "brief" | "normal" | "minimal";
  verification: "none" | "targeted" | "standard";
  tokenPosture: "low" | "balanced" | "speed";
}
