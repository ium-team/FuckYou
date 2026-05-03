import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrapFyState, metricsPath, readState, statePath, tuiStatePath, updateMode } from "../src/state/store.js";

test("state defaults to implementation mode before initialization", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-state-"));
  try {
    const state = await readState(cwd);
    assert.equal(state.schemaVersion, 1);
    assert.equal(state.activeMode, "implementation");
    assert.equal(state.context.warningThresholdPercent, 70);
    assert.equal(state.allowance.warningThresholdPercent, 10);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("mode update persists project-local state", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-state-"));
  try {
    await updateMode("docs-harness", cwd);
    const state = await readState(cwd);
    assert.equal(state.activeMode, "docs-harness");
    assert.equal(statePath(cwd).endsWith(".fy/state.json"), true);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("bootstrap creates documented non-secret state paths", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-state-"));
  try {
    await bootstrapFyState(cwd);
    await access(statePath(cwd));
    await access(tuiStatePath(cwd));
    await access(metricsPath(cwd));
    await access(join(cwd, ".fy", "codex-homes"));
    await access(join(cwd, ".fy", "context-snapshots"));
    await access(join(cwd, ".fy", "orchestration", "runs"));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
