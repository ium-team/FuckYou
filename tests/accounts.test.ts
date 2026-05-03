import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkAccountReadiness,
  codexHomePath,
  ensureAccount,
  listAccountPickerRows,
  readProjectConfig,
  resolveAccount,
  setDefaultAccount,
} from "../src/accounts/store.js";

test("accounts live under the project .fy directory", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-account-"));
  try {
    const account = await ensureAccount("work", cwd);
    assert.equal(account.name, "work");
    assert.equal(account.codexHome, join(cwd, ".fy", "codex-homes", "work"));
    assert.equal(codexHomePath("work", cwd), account.codexHome);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("account home gets a local codex config scaffold", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-account-"));
  try {
    const account = await ensureAccount("work", cwd);
    const config = await readFile(join(account.codexHome, "config.toml"), "utf-8");
    assert.match(config, /\[tui\]/);
    assert.match(config, /status_line = \["model-with-reasoning", "current-dir"/);
    assert.match(config, /"five-hour-limit", "weekly-limit"/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("account home gets a fy skill scaffold for slash menu discovery", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-account-"));
  try {
    const account = await ensureAccount("work", cwd);
    const skill = await readFile(join(account.codexHome, "skills", "fy", "SKILL.md"), "utf-8");
    assert.match(skill, /name:\s*fy/);
    assert.match(skill, /Use `\/fy` as the primary FY command entrypoint/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("default account can be selected per project", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-account-"));
  try {
    await setDefaultAccount("personal", cwd);
    const config = await readProjectConfig(cwd);
    const resolved = await resolveAccount(null, cwd);
    assert.equal(config.defaultAccount, "personal");
    assert.equal(Boolean(config.accounts.personal), true);
    assert.equal(resolved.name, "personal");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("invalid account names are rejected", async () => {
  await assert.rejects(() => ensureAccount("../global"), /account name/);
});

test("project config uses the documented object schema", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-account-"));
  try {
    await ensureAccount("work", cwd);
    const config = await readProjectConfig(cwd);
    assert.equal(config.schemaVersion, 1);
    assert.equal(config.accounts.work.codexHome, join(".fy", "codex-homes", "work"));
    assert.equal(config.accounts.work.authStatus, "unknown");
    assert.equal(config.accounts.work.allowance.remainingPercent, null);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("legacy account arrays are migrated without global fallback", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-account-"));
  try {
    await mkdir(join(cwd, ".fy"), { recursive: true });
    await writeFile(
      join(cwd, ".fy", "project.json"),
      JSON.stringify({ accounts: ["work"], defaultAccount: "work", lastUsedAccount: "work" }),
      "utf-8",
    );
    const config = await readProjectConfig(cwd);
    assert.equal(config.defaultAccount, "work");
    assert.equal(config.lastAccount, "work");
    assert.equal(config.accounts.work.codexHome, join(".fy", "codex-homes", "work"));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("account picker rows show unavailable allowance as null", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-account-"));
  try {
    await ensureAccount("work", cwd);
    const rows = await listAccountPickerRows(cwd);
    const row = rows.find((item) => item.name === "work");
    assert.equal(row?.allowancePercent, null);
    assert.equal(row?.resetAt, null);
    assert.equal(row?.authStatus, "unknown");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("readiness check runs codex login status with repo-local CODEX_HOME", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-account-"));
  try {
    await ensureAccount("work", cwd);
    let capturedEnv: NodeJS.ProcessEnv | undefined;
    let capturedArgs: string[] | undefined;
    const fakeSpawn = ((_command: string, args: string[], options: { env?: NodeJS.ProcessEnv }) => {
      capturedArgs = args;
      capturedEnv = options.env;
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("exit", 0, null));
      return child;
    }) as unknown as typeof import("node:child_process").spawn;

    const status = await checkAccountReadiness("work", { cwd, spawnFn: fakeSpawn, env: {} });

    assert.equal(status, "ready");
    assert.deepEqual(capturedArgs, ["login", "status"]);
    assert.equal(capturedEnv?.CODEX_HOME, join(cwd, ".fy", "codex-homes", "work"));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
