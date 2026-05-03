import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDocsHarness, summarizeCodebase, updateHarnessDocument } from "../src/docs/harness.js";

test("docs harness creates missing recommended docs with assumptions", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-docs-"));
  try {
    const result = await initDocsHarness(cwd);
    assert.equal(result.files.filter((file) => file.status === "created").length, 3);
    const product = await readFile(join(cwd, "docs", "product-direction.md"), "utf-8");
    assert.match(product, /# Product Direction/);
    assert.match(product, /ASSUMPTION:/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("docs harness preserves existing documents during init", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-docs-"));
  try {
    await mkdir(join(cwd, "docs"), { recursive: true });
    await writeFile(join(cwd, "docs", "architecture.md"), "# Existing Architecture\n", "utf-8");
    const result = await initDocsHarness(cwd);
    const architecture = result.files.find((file) => file.path === join("docs", "architecture.md"));
    assert.equal(architecture?.status, "preserved");
    assert.equal(await readFile(join(cwd, "docs", "architecture.md"), "utf-8"), "# Existing Architecture\n");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("docs update merges generated section without replacing existing content", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-docs-"));
  try {
    await mkdir(join(cwd, "docs"), { recursive: true });
    await writeFile(join(cwd, "docs", "roadmap.md"), "# Roadmap\n\nExisting plan.\n", "utf-8");
    const result = await updateHarnessDocument("roadmap", cwd);
    const roadmap = await readFile(join(cwd, "docs", "roadmap.md"), "utf-8");
    assert.equal(result.status, "updated");
    assert.match(roadmap, /Existing plan\./);
    assert.match(roadmap, /FY Harness Update/);
    assert.match(roadmap, /ASSUMPTION:/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("codebase summary writes source and test file lists", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "fy-docs-"));
  try {
    await mkdir(join(cwd, "src"), { recursive: true });
    await mkdir(join(cwd, "tests"), { recursive: true });
    await writeFile(join(cwd, "src", "app.ts"), "export const app = true;\n", "utf-8");
    await writeFile(join(cwd, "tests", "app.test.ts"), "import test from 'node:test';\n", "utf-8");

    const result = await summarizeCodebase(cwd);
    const summary = await readFile(join(cwd, result.path), "utf-8");

    assert.equal(result.sourceFiles, 1);
    assert.equal(result.testFiles, 1);
    assert.match(summary, /src\/app\.ts/);
    assert.match(summary, /tests\/app\.test\.ts/);
    assert.match(summary, /ASSUMPTION:/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
