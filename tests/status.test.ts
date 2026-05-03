import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureAccount, markAccountUsed, readProjectConfig, writeProjectConfig } from "../src/accounts/store.js";
import { buildFyStatus } from "../src/status/model.js";
import { readState, updateActiveAccount, writeState } from "../src/state/store.js";

test("status line contains required FY TUI segments", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-status-"));
  try {
    await ensureAccount("work", cwd);
    await markAccountUsed("work", cwd);
    await updateActiveAccount("work", cwd);
    const state = await readState(cwd);
    await writeState({
      ...state,
      activeSession: {
        ...state.activeSession,
        model: "gpt-5.5",
        repoPath: cwd,
        branch: "main",
      },
      context: {
        ...state.context,
        usagePercent: 42,
      },
    }, cwd);

    const status = await buildFyStatus(cwd);

    assert.equal(status.mode, "implementation");
    assert.equal(status.account.name, "work");
    assert.equal(status.severity, "normal");
    assert.match(status.line, /FY implementation/);
    assert.match(status.line, /acct work n\/a reset n\/a/);
    assert.match(status.line, /ctx 42%/);
    assert.match(status.line, /gpt-5\.5/);
    assert.match(status.line, /main/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("status severity warns at context and allowance thresholds", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-status-"));
  try {
    await ensureAccount("work", cwd);
    await updateActiveAccount("work", cwd);
    const state = await readState(cwd);
    await writeState({
      ...state,
      context: {
        ...state.context,
        usagePercent: 70,
      },
    }, cwd);
    assert.equal((await buildFyStatus(cwd)).severity, "context-warning");

    const project = await readProjectConfig(cwd);
    await writeProjectConfig({
      ...project,
      accounts: {
        ...project.accounts,
        work: {
          ...project.accounts.work,
          allowance: {
            ...project.accounts.work.allowance,
            status: "available",
            remainingPercent: 10,
            source: "codex-metadata",
          },
        },
      },
    }, cwd);

    assert.equal((await buildFyStatus(cwd)).severity, "allowance-warning");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
