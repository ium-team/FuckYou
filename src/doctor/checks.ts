import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { statePath } from "../state/store.js";

export interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export function runDoctorChecks(cwd = process.cwd(), nodeVersion = process.versions.node): DoctorCheck[] {
  const major = Number.parseInt(nodeVersion.split(".")[0] ?? "0", 10);
  const codexProbe = spawnSync(process.env.FY_CODEX_BIN ?? "codex", ["--version"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  const checks: DoctorCheck[] = [
    {
      name: "Node.js",
      status: major >= 20 ? "pass" : "fail",
      message: `detected ${nodeVersion}, required >=20`,
    },
    {
      name: "Codex CLI",
      status: codexProbe.status === 0 ? "pass" : "warn",
      message: codexProbe.status === 0
        ? `found ${(codexProbe.stdout || codexProbe.stderr).trim()}`
        : "not found on PATH; set FY_CODEX_BIN or install Codex before launching FY",
    },
    {
      name: "Project state",
      status: existsSync(statePath(cwd)) ? "pass" : "warn",
      message: existsSync(statePath(cwd))
        ? `found ${statePath(cwd)}`
        : `not initialized yet; run "fy mode fast" to create ${dirname(statePath(cwd))}`,
    },
  ];

  return checks;
}
