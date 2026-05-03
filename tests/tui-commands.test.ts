import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readProjectConfig } from "../src/accounts/store.js";
import { executeFyCommand, FY_COMMAND_REGISTRY, parseFyCommand } from "../src/tui/commands.js";
import { readState } from "../src/state/store.js";

test("fy command registry exposes documented slash commands", () => {
  assert.deepEqual(
    FY_COMMAND_REGISTRY.map((command) => command.id),
    ["/fy-mode", "/fy-context", "/fy-account", "/fy-status", "/fy-docs", "/fy-orchestrate"],
  );
});

test("slash parser accepts fy-prefixed commands and options", () => {
  assert.deepEqual(parseFyCommand("/fy-context continue --account work"), {
    id: "/fy-context",
    args: ["continue"],
    options: { account: "work" },
  });
  assert.equal(parseFyCommand("/native-command"), null);
});

test("/fy-mode updates state through the mode domain", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-tui-"));
  try {
    const result = await executeFyCommand("/fy-mode read-only", cwd);
    const state = await readState(cwd);
    assert.equal(result.status, "ok");
    assert.equal(state.activeMode, "read-only");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("/fy-mode without args returns picker data", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-tui-"));
  try {
    const result = await executeFyCommand("/fy-mode", cwd);
    assert.equal(result.status, "picker");
    if (result.status === "picker") {
      assert.equal(result.picker, "mode");
      assert.equal(result.items.length, 5);
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("/fy-account select updates repo-local account state", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-tui-"));
  try {
    const result = await executeFyCommand("/fy-account select work", cwd);
    const project = await readProjectConfig(cwd);
    assert.equal(result.status, "ok");
    assert.equal(project.defaultAccount, "work");
    assert.equal(project.lastAccount, "work");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("/fy-account login returns a login-required handoff without spawning Codex", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-tui-"));
  try {
    const result = await executeFyCommand("/fy-account login client", cwd);
    assert.equal(result.status, "login-required");
    if (result.status === "login-required") {
      assert.equal(result.account, "client");
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("/fy-status returns compact FY status", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-tui-"));
  try {
    await executeFyCommand("/fy-account select work", cwd);
    const result = await executeFyCommand("/fy-status", cwd);
    assert.equal(result.status, "ok");
    if (result.status === "ok") {
      assert.match(result.message, /FY implementation/);
      assert.match(result.message, /acct work/);
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("/fy-context save and summary route through context domain", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-tui-"));
  try {
    const saved = await executeFyCommand("/fy-context save", cwd);
    assert.equal(saved.status, "ok");
    const state = await readState(cwd);
    assert.equal(typeof state.context.lastSnapshotId, "string");

    const summary = await executeFyCommand("/fy-context summary", cwd);
    assert.equal(summary.status, "ok");
    if (summary.status === "ok") {
      assert.match(summary.message, /snapshot ctx-/);
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("/fy-context reset clears snapshot metadata", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-tui-"));
  try {
    await executeFyCommand("/fy-context save", cwd);
    const result = await executeFyCommand("/fy-context reset", cwd);
    assert.equal(result.status, "ok");
    assert.equal((await readState(cwd)).context.lastSnapshotId, null);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("/fy-context continue requires target account and prepares handoff", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-tui-"));
  try {
    assert.equal((await executeFyCommand("/fy-context continue", cwd)).status, "error");
    const result = await executeFyCommand("/fy-context continue --account backup", cwd);
    assert.equal(result.status, "ok");
    if (result.status === "ok") {
      assert.match(result.message, /continuation prepared: ctx-/);
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("/fy-docs init-harness and summarize-codebase route through docs domain", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-tui-"));
  try {
    const init = await executeFyCommand("/fy-docs init-harness", cwd);
    assert.equal(init.status, "ok");
    if (init.status === "ok") {
      assert.match(init.message, /docs harness initialized/);
    }

    const summary = await executeFyCommand("/fy-docs summarize-codebase", cwd);
    assert.equal(summary.status, "ok");
    if (summary.status === "ok") {
      assert.match(summary.message, /codebase summary written/);
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("/fy-docs update validates document kind", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-tui-"));
  try {
    assert.equal((await executeFyCommand("/fy-docs update unknown", cwd)).status, "error");
    const result = await executeFyCommand("/fy-docs update product", cwd);
    assert.equal(result.status, "ok");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("/fy-orchestrate start, status, conflicts, and stop route through orchestration domain", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-tui-"));
  try {
    const started = await executeFyCommand("/fy-orchestrate start build state layer", cwd);
    assert.equal(started.status, "ok");
    if (started.status === "ok") {
      assert.match(started.message, /orchestration started: orch-/);
    }

    const status = await executeFyCommand("/fy-orchestrate status", cwd);
    assert.equal(status.status, "ok");
    if (status.status === "ok") {
      assert.match(status.message, /agents 4/);
    }

    const conflicts = await executeFyCommand("/fy-orchestrate conflicts", cwd);
    assert.equal(conflicts.status, "ok");
    if (conflicts.status === "ok") {
      assert.match(conflicts.message, /0 conflict\(s\)/);
    }

    const stopped = await executeFyCommand("/fy-orchestrate stop", cwd);
    assert.equal(stopped.status, "ok");
    if (stopped.status === "ok") {
      assert.match(stopped.message, /orchestration stopped: orch-/);
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
