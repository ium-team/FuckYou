import type { FyMode, ModePolicy } from "./types.js";

export const MODE_POLICIES: Record<FyMode, ModePolicy> = {
  manual: {
    mode: "manual",
    description: "Human-guided mode for UI detail, ambiguity, and high-taste decisions.",
    approval: "frequent",
    maxLoops: 3,
    outputStyle: "normal",
    verification: "targeted",
    tokenPosture: "balanced",
  },
  auto: {
    mode: "auto",
    description: "Low-touch mode that keeps moving inside explicit guardrails.",
    approval: "minimal",
    maxLoops: 5,
    outputStyle: "brief",
    verification: "standard",
    tokenPosture: "balanced",
  },
  budget: {
    mode: "budget",
    description: "Low-token mode with smaller steps and shorter outputs.",
    approval: "checkpoint",
    maxLoops: 8,
    outputStyle: "minimal",
    verification: "targeted",
    tokenPosture: "low",
  },
  fast: {
    mode: "fast",
    description: "Direct mode for clear, low-risk tasks.",
    approval: "minimal",
    maxLoops: 1,
    outputStyle: "brief",
    verification: "targeted",
    tokenPosture: "speed",
  },
};

export function isFyMode(value: string): value is FyMode {
  return value === "manual" || value === "auto" || value === "budget" || value === "fast";
}

export function getModePolicy(mode: FyMode): ModePolicy {
  return MODE_POLICIES[mode];
}

export function listModePolicies(): ModePolicy[] {
  return Object.values(MODE_POLICIES);
}
