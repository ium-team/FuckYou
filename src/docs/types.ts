export type HarnessDocKind = "product" | "architecture" | "roadmap";

export interface HarnessDocument {
  kind: HarnessDocKind;
  path: string;
  title: string;
}

export interface HarnessFileResult {
  path: string;
  status: "created" | "preserved" | "updated";
}

export interface HarnessInitResult {
  files: HarnessFileResult[];
}

export interface CodebaseSummaryResult {
  path: string;
  sourceFiles: number;
  testFiles: number;
}
