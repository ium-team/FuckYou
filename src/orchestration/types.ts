export type OrchestrationStatus =
  | "planning"
  | "running"
  | "integrating"
  | "blocked"
  | "failed"
  | "complete"
  | "cancelled";

export type OrchestrationRole =
  | "leader"
  | "explorer"
  | "executor"
  | "verifier"
  | "writer"
  | "reviewer"
  | "researcher"
  | "designer";

export type AgentStatus = "pending" | "running" | "blocked" | "complete" | "failed" | "cancelled";

export interface OrchestrationManifest {
  schemaVersion: 1;
  runId: string;
  mode: "orchestrated";
  status: OrchestrationStatus;
  startedAt: string;
  finishedAt: string | null;
  leaderAgentId: "leader";
  tmux: {
    session: string | null;
    layout: "leader-grid";
  };
  stopCondition: string;
}

export interface OrchestrationAgent {
  agentId: string;
  role: OrchestrationRole;
  status: AgentStatus;
  assignedTask: string;
  paneId: string | null;
  ownedFiles: string[];
  readOnly: boolean;
  lastHeartbeat: string | null;
  stopCondition: string;
}

export interface OrchestrationAgentsFile {
  schemaVersion: 1;
  agents: OrchestrationAgent[];
}

export type OwnershipType = "read" | "write-file" | "write-region" | "test-only" | "docs-only";

export interface OwnershipRegion {
  startLine: number;
  endLine: number;
}

export interface OwnershipEntry {
  agentId: string;
  type: OwnershipType;
  path: string;
  region: OwnershipRegion | null;
}

export interface OwnershipFile {
  schemaVersion: 1;
  entries: OwnershipEntry[];
}

export type ConflictLevel = "none" | "file-overlap" | "region-overlap" | "state-overlap" | "semantic-risk";

export interface OrchestrationConflict {
  level: ConflictLevel;
  path: string;
  agentIds: string[];
  reason: string;
}

export interface ConflictsFile {
  schemaVersion: 1;
  conflicts: OrchestrationConflict[];
}

export interface TraceEvent {
  time: string;
  type: string;
  runId: string;
  agentId?: string;
  message?: string;
}
