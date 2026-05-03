import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  codexHomePath,
  ensureAccount,
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
    assert.equal(config.accounts.includes("personal"), true);
    assert.equal(resolved.name, "personal");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("invalid account names are rejected", async () => {
  await assert.rejects(() => ensureAccount("../global"), /account name/);
});
