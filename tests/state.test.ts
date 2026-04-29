import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readState, statePath, updateMode } from "../src/state/store.js";

test("state defaults to fast mode before initialization", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-state-"));
  try {
    const state = await readState(cwd);
    assert.equal(state.activeMode, "fast");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("mode update persists project-local state", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-state-"));
  try {
    await updateMode("budget", cwd);
    const state = await readState(cwd);
    assert.equal(state.activeMode, "budget");
    assert.equal(statePath(cwd).endsWith(".fy/state.json"), true);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
