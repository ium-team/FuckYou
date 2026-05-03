import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { CodebaseSummaryResult, HarnessDocKind, HarnessDocument, HarnessFileResult, HarnessInitResult } from "./types.js";

const HARNESS_DOCS: readonly HarnessDocument[] = [
  { kind: "product", path: join("docs", "product-direction.md"), title: "Product Direction" },
  { kind: "architecture", path: join("docs", "architecture.md"), title: "Architecture" },
  { kind: "roadmap", path: join("docs", "roadmap.md"), title: "Roadmap" },
] as const;

const GENERATED_SECTION_START = "<!-- FY:DOCS-HARNESS:START -->";
const GENERATED_SECTION_END = "<!-- FY:DOCS-HARNESS:END -->";

function assumptionBlock(): string {
  return [
    "## Assumptions",
    "",
    "- ASSUMPTION: This document was initialized from the FY documentation harness because project-specific detail was missing.",
    "- ASSUMPTION: Replace these placeholders with repo-specific decisions as the product contract hardens.",
    "",
  ].join("\n");
}

function initialDocument(document: HarnessDocument): string {
  return [
    `# ${document.title}`,
    "",
    assumptionBlock(),
    "## Current Contract",
    "",
    "- TODO: Describe the current committed behavior.",
    "- TODO: Mark proposed behavior separately from implemented behavior.",
    "",
    "## Open Questions",
    "",
    "- TODO: Capture missing product or engineering decisions.",
    "",
  ].join("\n");
}

function harnessSection(kind: HarnessDocKind): string {
  return [
    GENERATED_SECTION_START,
    "## FY Harness Update",
    "",
    `Document kind: ${kind}`,
    "",
    "- ASSUMPTION: This section was added by `/fy-docs update` and should be edited into durable prose.",
    "- TODO: Replace this generated checklist with project-specific content.",
    "",
    GENERATED_SECTION_END,
    "",
  ].join("\n");
}

function docForKind(kind: HarnessDocKind): HarnessDocument {
  const document = HARNESS_DOCS.find((item) => item.kind === kind);
  if (!document) throw new Error(`unknown docs kind: ${kind}`);
  return document;
}

export function listHarnessDocuments(): readonly HarnessDocument[] {
  return HARNESS_DOCS;
}

export async function initDocsHarness(cwd = process.cwd()): Promise<HarnessInitResult> {
  await mkdir(join(cwd, "docs"), { recursive: true });
  const files: HarnessFileResult[] = [];
  for (const document of HARNESS_DOCS) {
    const path = join(cwd, document.path);
    if (existsSync(path)) {
      files.push({ path: document.path, status: "preserved" });
      continue;
    }
    await writeFile(path, initialDocument(document), "utf-8");
    files.push({ path: document.path, status: "created" });
  }
  return { files };
}

export async function updateHarnessDocument(kind: HarnessDocKind, cwd = process.cwd()): Promise<HarnessFileResult> {
  await mkdir(join(cwd, "docs"), { recursive: true });
  const document = docForKind(kind);
  const path = join(cwd, document.path);
  if (!existsSync(path)) {
    await writeFile(path, initialDocument(document), "utf-8");
    return { path: document.path, status: "created" };
  }

  const current = await readFile(path, "utf-8");
  if (current.includes(GENERATED_SECTION_START)) {
    return { path: document.path, status: "preserved" };
  }
  await writeFile(path, `${current.trimEnd()}\n\n${harnessSection(kind)}`, "utf-8");
  return { path: document.path, status: "updated" };
}

async function collectFiles(root: string, relativeDir: string, suffixes: readonly string[]): Promise<string[]> {
  const dir = join(root, relativeDir);
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) {
      files.push(...await collectFiles(root, relative(root, path), suffixes));
      continue;
    }
    if (suffixes.some((suffix) => entry.endsWith(suffix))) {
      files.push(relative(root, path));
    }
  }
  return files.sort();
}

function codebaseSummaryMarkdown(sourceFiles: string[], testFiles: string[]): string {
  const sourceList = sourceFiles.length > 0 ? sourceFiles.map((file) => `- ${file}`).join("\n") : "- n/a";
  const testList = testFiles.length > 0 ? testFiles.map((file) => `- ${file}`).join("\n") : "- n/a";
  return [
    "# Codebase Summary",
    "",
    "## Assumptions",
    "",
    "- ASSUMPTION: This summary is generated from file layout only; it does not claim runtime completeness.",
    "",
    "## Source Files",
    "",
    sourceList,
    "",
    "## Test Files",
    "",
    testList,
    "",
  ].join("\n");
}

export async function summarizeCodebase(cwd = process.cwd()): Promise<CodebaseSummaryResult> {
  await mkdir(join(cwd, "docs"), { recursive: true });
  const sourceFiles = await collectFiles(cwd, "src", [".ts", ".tsx", ".js", ".jsx"]);
  const testFiles = await collectFiles(cwd, "tests", [".test.ts", ".test.js"]);
  const path = join(cwd, "docs", "codebase-summary.md");
  await writeFile(path, codebaseSummaryMarkdown(sourceFiles, testFiles), "utf-8");
  return {
    path: join("docs", "codebase-summary.md"),
    sourceFiles: sourceFiles.length,
    testFiles: testFiles.length,
  };
}
