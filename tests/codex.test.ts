import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCodexArgs,
  FY_PALETTE_PREFILL,
  hasModelInstructionsOverride,
  hasStatusLineOverride,
  injectModelInstructionsArgs,
  injectStatusLineArgs,
  launchCodex,
  parseFyPaletteFlag,
  parseModeArgs,
  resolveFyPaletteSelection,
  shouldEnableFyPalette,
} from "../src/runtime/codex.js";

test("mode flags are consumed before forwarding codex args", () => {
  const parsed = parseModeArgs(["--budget", "--account", "work", "--model", "gpt-5"]);
  assert.equal(parsed.mode, "budget");
  assert.equal(parsed.account, "work");
  assert.equal(parsed.enableFyPalette, false);
  assert.deepEqual(parsed.args, ["--model", "gpt-5"]);
});

test("fy palette flag is parsed separately from forwarded codex args", () => {
  const parsed = parseModeArgs(["--fast", "--fy-palette", "--model", "gpt-5"]);
  assert.equal(parsed.mode, "fast");
  assert.equal(parsed.enableFyPalette, true);
  assert.deepEqual(parsed.args, ["--model", "gpt-5"]);

  assert.deepEqual(parseFyPaletteFlag(["--fy-palette", "--model", "gpt-5"]), {
    enableFyPalette: true,
    args: ["--model", "gpt-5"],
  });
});

test("fy palette selection resolves known quick actions", () => {
  assert.equal(resolveFyPaletteSelection("1")?.command, "/fy-fast");
  assert.equal(resolveFyPaletteSelection("4")?.command, "/fy-team");
  assert.equal(resolveFyPaletteSelection("9"), null);
});

test("fy palette trigger pre-fills the native slash entrypoint", () => {
  assert.equal(FY_PALETTE_PREFILL, "/fy ");
});

test("fy palette enables only in interactive terminals", () => {
  assert.equal(shouldEnableFyPalette(true, { stdinIsTTY: true, stdoutIsTTY: true }), true);
  assert.equal(shouldEnableFyPalette(true, { stdinIsTTY: false, stdoutIsTTY: true }), false);
  assert.equal(shouldEnableFyPalette(false, { stdinIsTTY: true, stdoutIsTTY: true }), false);
});

test("model instructions are injected unless already configured", () => {
  assert.deepEqual(injectModelInstructionsArgs(["--model", "gpt-5"], "/tmp/fy instructions.md"), [
    "--model",
    "gpt-5",
    "-c",
    'model_instructions_file="/tmp/fy instructions.md"',
  ]);

  assert.equal(hasModelInstructionsOverride(["-c", 'model_instructions_file="/tmp/custom.md"']), true);
  assert.deepEqual(
    injectModelInstructionsArgs(["-c", 'model_instructions_file="/tmp/custom.md"'], "/tmp/fy.md"),
    ["-c", 'model_instructions_file="/tmp/custom.md"'],
  );
});

test("exec launch args write mode instructions and prefix codex exec", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-codex-"));
  try {
    const args = await buildCodexArgs("budget", ["--model", "gpt-5"], {
      cwd,
      execTask: "fix validation",
    });
    assert.equal(args[0], "exec");
    assert.equal(args.at(-1), "fix validation");
    assert.equal(args.includes("-c"), true);
    assert.equal(args.some((arg) => arg.includes(".fy/instructions.md")), true);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("status line shows model, folder, branch, and context by default", () => {
  const args = injectStatusLineArgs(["--model", "gpt-5"]);
  assert.deepEqual(args, [
    "--model",
    "gpt-5",
    "-c",
    'tui.status_line=["model-with-reasoning", "current-dir", "git-branch", "context-used", "context-remaining"]',
  ]);
});

test("status line injection respects user overrides", () => {
  const args = ["-c", 'tui.status_line=["git-branch"]'];
  assert.equal(hasStatusLineOverride(args), true);
  assert.deepEqual(injectStatusLineArgs(args), args);
});

test("launch sets CODEX_HOME to the selected repo-local account", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-codex-"));
  try {
    let capturedEnv: NodeJS.ProcessEnv | undefined;
    const fakeSpawn = ((_command: string, _args: string[], options: { env?: NodeJS.ProcessEnv }) => {
      capturedEnv = options.env;
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("exit", 0, null));
      return child;
    }) as unknown as typeof import("node:child_process").spawn;

    const exitCode = await launchCodex("fast", [], {
      cwd,
      account: "client",
      spawnFn: fakeSpawn,
      env: {},
    });

    assert.equal(exitCode, 0);
    assert.equal(capturedEnv?.CODEX_HOME, join(cwd, ".fy", "codex-homes", "client"));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("fy palette request falls back to terminal-safe stdio", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-codex-"));
  try {
    let capturedStdio: unknown;
    const fakeSpawn = ((_command: string, _args: string[], options: { stdio?: unknown }) => {
      capturedStdio = options.stdio;
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("exit", 0, null));
      return child;
    }) as unknown as typeof import("node:child_process").spawn;

    const exitCode = await launchCodex("fast", ["--fy-palette"], {
      cwd,
      spawnFn: fakeSpawn,
      env: {},
    });

    assert.equal(exitCode, 0);
    assert.equal(capturedStdio, "inherit");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
