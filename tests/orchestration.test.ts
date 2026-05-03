import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assignOwnership,
  cleanupWorkerPanes,
  createOrchestrationRun,
  detectOwnershipConflicts,
  findLatestOrchestrationRun,
  getOrchestrationStatus,
  orchestrationRunDirectory,
  startOrchestrationPanes,
  updateOrchestrationStatus,
} from "../src/orchestration/store.js";
import { readState } from "../src/state/store.js";
import type { OwnershipEntry } from "../src/orchestration/types.js";
import type { TmuxAdapter, TmuxPaneInfo, TmuxPaneSpec } from "../src/tmux/types.js";
import { createTmuxInjectionGuardState, sendGuardedAgentInput } from "../src/tmux/guards.js";

class FakeTmuxAdapter implements TmuxAdapter {
  sessions: string[] = [];
  panes = new Map<string, TmuxPaneInfo>();
  sent: Array<{ paneId: string; input: string }> = [];
  closed: string[] = [];
  private counter = 0;

  async startSession(sessionName: string): Promise<void> {
    this.sessions.push(sessionName);
  }

  async startAgentPane(_sessionName: string, spec: TmuxPaneSpec): Promise<TmuxPaneInfo> {
    this.counter += 1;
    const pane: TmuxPaneInfo = {
      paneId: `%${this.counter}`,
      title: spec.title,
      isAgent: true,
      isHud: false,
      isShell: false,
      inCopyMode: false,
    };
    this.panes.set(pane.paneId, pane);
    return pane;
  }

  async inspectPane(paneId: string): Promise<TmuxPaneInfo | null> {
    return this.panes.get(paneId) ?? null;
  }

  async sendKeys(paneId: string, input: string): Promise<void> {
    this.sent.push({ paneId, input });
  }

  async closePane(paneId: string): Promise<void> {
    this.closed.push(paneId);
  }
}

test("orchestration run creates manifest, agents, ownership, conflicts, and trace", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-orch-"));
  try {
    const run = await createOrchestrationRun({
      cwd,
      task: "ship orchestration state",
      now: new Date("2026-05-03T00:00:00.000Z"),
    });
    const dir = orchestrationRunDirectory(run.manifest.runId, cwd);
    await access(join(dir, "manifest.json"));
    await access(join(dir, "agents.json"));
    await access(join(dir, "ownership.json"));
    await access(join(dir, "conflicts.json"));
    await access(join(dir, "trace.jsonl"));

    assert.equal(run.manifest.status, "planning");
    assert.equal(run.agents.agents.length, 4);
    assert.equal(run.agents.agents.find((agent) => agent.agentId === "leader")?.status, "running");
    assert.equal((await readState(cwd)).activeMode, "orchestrated");
    assert.equal(await findLatestOrchestrationRun(cwd), run.manifest.runId);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("ownership conflict detection allows non-overlapping regions", () => {
  const entries: OwnershipEntry[] = [
    { agentId: "executor-1", type: "write-region", path: "src/app.ts", region: { startLine: 1, endLine: 10 } },
    { agentId: "writer-1", type: "write-region", path: "src/app.ts", region: { startLine: 11, endLine: 20 } },
  ];
  assert.deepEqual(detectOwnershipConflicts(entries), []);
});

test("ownership conflict detection blocks overlapping regions and state writes", () => {
  const regionConflicts = detectOwnershipConflicts([
    { agentId: "executor-1", type: "write-region", path: "src/app.ts", region: { startLine: 1, endLine: 10 } },
    { agentId: "writer-1", type: "write-region", path: "src/app.ts", region: { startLine: 10, endLine: 20 } },
  ]);
  assert.equal(regionConflicts[0]?.level, "region-overlap");

  const stateConflicts = detectOwnershipConflicts([
    { agentId: "executor-1", type: "write-file", path: ".fy/state.json", region: null },
    { agentId: "writer-1", type: "write-file", path: ".fy/state.json", region: null },
  ]);
  assert.equal(stateConflicts[0]?.level, "state-overlap");
});

test("assign ownership persists conflicts and blocks unsafe run", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-orch-"));
  try {
    const run = await createOrchestrationRun({ cwd, task: "conflict test" });
    const result = await assignOwnership(run.manifest.runId, [
      { agentId: "executor-1", type: "write-region", path: "src/app.ts", region: { startLine: 1, endLine: 5 } },
      { agentId: "writer-1", type: "write-region", path: "src/app.ts", region: { startLine: 3, endLine: 8 } },
    ], cwd);

    const status = await getOrchestrationStatus(run.manifest.runId, cwd);
    assert.equal(result.conflicts.conflicts.length, 1);
    assert.equal(status.manifest.status, "blocked");
    assert.equal(status.ownership.entries.length, 2);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("orchestration status updates write terminal completion", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-orch-"));
  try {
    const run = await createOrchestrationRun({ cwd, task: "complete test" });
    const manifest = await updateOrchestrationStatus(run.manifest.runId, "complete", cwd);
    const trace = await readFile(join(orchestrationRunDirectory(run.manifest.runId, cwd), "trace.jsonl"), "utf-8");
    assert.equal(manifest.status, "complete");
    assert.equal(typeof manifest.finishedAt, "string");
    assert.match(trace, /run-complete/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("fake tmux adapter starts visible panes and persists pane metadata", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-orch-"));
  try {
    const run = await createOrchestrationRun({ cwd, task: "visible lanes" });
    const adapter = new FakeTmuxAdapter();

    const started = await startOrchestrationPanes(run.manifest.runId, adapter, cwd);

    assert.equal(started.manifest.status, "running");
    assert.equal(started.manifest.tmux.session, `fy-${run.manifest.runId}`);
    assert.equal(adapter.sessions[0], `fy-${run.manifest.runId}`);
    assert.equal(started.agents.agents.every((agent) => agent.paneId), true);
    assert.equal(started.agents.agents.find((agent) => agent.agentId === "leader")?.paneId, "%1");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("orchestration pane startup fails closed when pane identity is ambiguous", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-orch-"));
  try {
    const run = await createOrchestrationRun({ cwd, task: "ambiguous pane" });
    const adapter = new FakeTmuxAdapter();
    adapter.startAgentPane = async (_sessionName: string, spec: TmuxPaneSpec): Promise<TmuxPaneInfo> => ({
      paneId: "%bad",
      title: `${spec.title}:wrong`,
      isAgent: true,
      isHud: false,
      isShell: false,
      inCopyMode: false,
    });

    await assert.rejects(() => startOrchestrationPanes(run.manifest.runId, adapter, cwd), /pane_not_verified/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("tmux injection guard fails closed for non-agent panes and duplicate input", async () => {
  const adapter = new FakeTmuxAdapter();
  adapter.panes.set("%hud", {
    paneId: "%hud",
    title: "fy:hud",
    isAgent: false,
    isHud: true,
    isShell: false,
    inCopyMode: false,
  });
  adapter.panes.set("%agent", {
    paneId: "%agent",
    title: "fy:run:executor:executor-1",
    isAgent: true,
    isHud: false,
    isShell: false,
    inCopyMode: false,
  });
  const guardState = createTmuxInjectionGuardState();

  assert.equal(await sendGuardedAgentInput(adapter, "%hud", "work", { guardState }), "hud_pane");
  assert.equal(await sendGuardedAgentInput(adapter, "%missing", "work", { guardState }), "pane_not_found");
  assert.equal(await sendGuardedAgentInput(adapter, "%agent", "work", { guardState, now: 1000, cooldownMs: 0 }), "sent");
  assert.equal(await sendGuardedAgentInput(adapter, "%agent", "work", { guardState, now: 2000, cooldownMs: 0 }), "duplicate");
  assert.deepEqual(adapter.sent, [{ paneId: "%agent", input: "work" }]);
});

test("worker cleanup never closes the leader pane", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-orch-"));
  try {
    const run = await createOrchestrationRun({ cwd, task: "cleanup panes" });
    const adapter = new FakeTmuxAdapter();
    const started = await startOrchestrationPanes(run.manifest.runId, adapter, cwd);

    const closed = await cleanupWorkerPanes(run.manifest.runId, adapter, cwd);
    const leaderPane = started.agents.agents.find((agent) => agent.agentId === "leader")?.paneId;

    assert.equal(closed.includes(leaderPane ?? ""), false);
    assert.equal(adapter.closed.includes(leaderPane ?? ""), false);
    assert.equal(closed.length, 3);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
