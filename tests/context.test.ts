import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyContinuationNeed,
  contextSnapshotDirectory,
  getContextSummary,
  loadContextSnapshot,
  prepareContinuation,
  readSnapshotFile,
  resetContextMetadata,
  saveContextSnapshot,
} from "../src/context/snapshots.js";
import { ensureAccount, markAccountUsed } from "../src/accounts/store.js";
import { readState, updateActiveAccount, writeState } from "../src/state/store.js";

test("context snapshot writes manifest, summary, and handoff without secrets", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-context-"));
  try {
    await ensureAccount("work", cwd);
    await markAccountUsed("work", cwd);
    await updateActiveAccount("work", cwd);
    const state = await readState(cwd);
    await writeState({
      ...state,
      activeSession: {
        ...state.activeSession,
        id: "session-1",
      },
      context: {
        ...state.context,
        usagePercent: 71,
      },
    }, cwd);

    const snapshot = await saveContextSnapshot({
      cwd,
      reason: "context-warning",
      now: new Date("2026-05-03T00:00:00.000Z"),
    });

    await access(join(snapshot.directory, "manifest.json"));
    await access(snapshot.summaryPath);
    await access(snapshot.handoffPath);
    assert.equal(snapshot.manifest.sourceAccount, "work");
    assert.equal(snapshot.manifest.sourceSessionId, "session-1");
    assert.equal(snapshot.manifest.reason, "context-warning");
    assert.equal((await readState(cwd)).context.lastSnapshotId, snapshot.manifest.id);

    const summary = await readSnapshotFile(snapshot.manifest.id, "summary.md", cwd);
    const handoff = await readSnapshotFile(snapshot.manifest.id, "handoff.md", cwd);
    assert.doesNotMatch(summary, /auth\.json|token|secret/i);
    assert.doesNotMatch(handoff, /auth\.json|token|secret/i);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("context load and reset update state metadata", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-context-"));
  try {
    const snapshot = await saveContextSnapshot({ cwd });
    await resetContextMetadata(cwd);
    assert.equal((await readState(cwd)).context.lastSnapshotId, null);

    await loadContextSnapshot(snapshot.manifest.id, cwd);
    assert.equal((await readState(cwd)).context.lastSnapshotId, snapshot.manifest.id);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("context summary tolerates unknown metrics", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-context-"));
  try {
    const summary = await getContextSummary(cwd);
    assert.equal(summary.contextUsagePercent, null);
    assert.equal(summary.allowanceRemainingPercent, null);
    assert.equal(summary.lastSnapshotId, null);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("continuation classifier requests snapshot for low allowance expensive work", () => {
  assert.deepEqual(classifyContinuationNeed(10, "implement the context continuation flow and verify tests"), {
    shouldContinueWithAnotherAccount: true,
    reason: "low-allowance",
    snapshotRequired: true,
  });
  assert.equal(classifyContinuationNeed(null, "small task").reason, "unknown-allowance");
});

test("prepare continuation creates target account snapshot handoff", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-context-"));
  try {
    const state = await readState(cwd);
    await writeState({
      ...state,
      allowance: {
        ...state.allowance,
        remainingPercent: 8,
      },
    }, cwd);

    const continuation = await prepareContinuation({
      cwd,
      targetAccount: "backup",
      task: "implement a broad feature and verify it",
    });

    assert.equal(continuation.manifest.reason, "low-allowance-continuation");
    assert.equal(continuation.manifest.restore.targetAccount, "backup");
    assert.equal(continuation.decision.shouldContinueWithAnotherAccount, true);
    assert.equal(continuation.targetCodexHome, join(cwd, ".fy", "codex-homes", "backup"));
    await access(contextSnapshotDirectory(continuation.manifest.id, cwd));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
