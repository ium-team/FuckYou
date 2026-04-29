import type { FyMode } from "../modes/types.js";

export interface FyState {
  activeMode: FyMode;
  createdAt: string;
  updatedAt: string;
  lastRun?: {
    task: string;
    mode: FyMode;
    phase: "planned" | "stubbed";
    createdAt: string;
  };
}
