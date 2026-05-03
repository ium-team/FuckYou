import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { VERSION } from "../config/defaults.js";
import {
  codexHomePath,
  ensureAccount,
  readProjectConfig,
  resolveAccount,
  setDefaultAccount,
  validateAccountName,
} from "../accounts/store.js";
import { runDoctorChecks } from "../doctor/checks.js";
import { getModePolicy, isFyMode, listModePolicies } from "../modes/policies.js";
import { launchCodex, parseModeArgs } from "../runtime/codex.js";
import { createRunPlan } from "../runtime/plan.js";
import { readState, updateMode, writeState } from "../state/store.js";
import { executeFyCommand } from "../tui/commands.js";

export const HELP = `fy - extensible repo-local AI operating layer

Usage:
  fy [--mode <mode>|--orchestrated|--fast-edit|--read-only|--implementation|--docs-harness] [--fy-palette] [codex args...]
  fy version
  fy doctor
  fy account list
  fy account add <name>
  fy account use <name>
  fy account path [name]
  fy login [account]
  fy modes
  fy mode [orchestrated|fast-edit|read-only|implementation|docs-harness]
  fy slash "/fy-status"
  fy exec [--account <name>] [--mode <mode>] [--fy-palette] "<task>"
  fy run "<task>"

Default behavior launches Codex with FY mode instructions injected.`;

type AccountSelection =
  | { kind: "existing"; account: string }
  | { kind: "new"; account: string };

async function promptForLaunchAccount(cwd: string): Promise<AccountSelection | null> {
  if (!input.isTTY || !output.isTTY) return null;

  const config = await readProjectConfig(cwd);
  const rl = createInterface({ input, output });
  const accounts = Object.keys(config.accounts);

  try {
    console.log("Select a Codex account for this FY launch:");
    for (let index = 0; index < accounts.length; index += 1) {
      const account = accounts[index];
      const markers = [
        account === config.defaultAccount ? "default" : null,
        account === config.lastAccount ? "last-used" : null,
      ].filter(Boolean);
      const suffix = markers.length > 0 ? ` (${markers.join(", ")})` : "";
      console.log(`  ${index + 1}) ${account}${suffix}`);
    }
    const createIndex = accounts.length + 1;
    console.log(`  ${createIndex}) + Add new account and login`);

    const rawChoice = (await rl.question(`Choose [1-${createIndex}] (Enter = ${config.defaultAccount}): `)).trim();
    if (rawChoice.length === 0) {
      return { kind: "existing", account: config.defaultAccount };
    }

    const choice = Number.parseInt(rawChoice, 10);
    if (!Number.isInteger(choice) || choice < 1 || choice > createIndex) {
      console.error(`Invalid selection: ${rawChoice}`);
      return null;
    }

    if (choice <= accounts.length) {
      return { kind: "existing", account: accounts[choice - 1] };
    }

    const rawName = (await rl.question("New account name: ")).trim();
    if (!rawName) {
      console.error("Account name is required.");
      return null;
    }
    const account = validateAccountName(rawName);
    return { kind: "new", account };
  } finally {
    rl.close();
  }
}

async function resolveLaunchAccount(cwd: string, requestedAccount: string | null): Promise<AccountSelection> {
  if (requestedAccount) {
    return { kind: "existing", account: validateAccountName(requestedAccount) };
  }
  const selection = await promptForLaunchAccount(cwd);
  return selection ?? { kind: "existing", account: (await readProjectConfig(cwd)).defaultAccount };
}

export async function handleCommand(args: string[], cwd = process.cwd()): Promise<number> {
  const [command, ...rest] = args;

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(HELP);
    return 0;
  }

  if (!command || command.startsWith("-")) {
    const parsed = parseModeArgs(args);
    const current = await readState(cwd);
    const mode = parsed.mode ?? current.activeMode;
    if (parsed.mode) await updateMode(parsed.mode, cwd);

    const selection = await resolveLaunchAccount(cwd, parsed.account);
    if (selection.kind === "new") {
      await setDefaultAccount(selection.account, cwd);
      const loginCode = await launchCodex(mode, ["login"], {
        cwd,
        account: selection.account,
        injectFyConfig: false,
      });
      if (loginCode !== 0) return loginCode;
    }

    return await launchCodex(mode, parsed.args, {
      cwd,
      account: selection.account,
      enableFyPalette: parsed.enableFyPalette,
    });
  }

  if (command === "version") {
    console.log(VERSION);
    return 0;
  }

  if (command === "doctor") {
    const checks = runDoctorChecks(cwd);
    for (const check of checks) {
      const label = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
      console.log(`[${label}] ${check.name}: ${check.message}`);
    }
    return checks.some((check) => check.status === "fail") ? 1 : 0;
  }

  if (command === "account") {
    const [subcommand, accountName] = rest;
    if (!subcommand || subcommand === "list") {
      const config = await readProjectConfig(cwd);
      for (const account of Object.keys(config.accounts)) {
        const markers = [
          account === config.defaultAccount ? "default" : null,
          account === config.lastAccount ? "last-used" : null,
        ].filter(Boolean);
        console.log(markers.length > 0 ? `${account} (${markers.join(", ")})` : account);
      }
      return 0;
    }

    if (subcommand === "add") {
      if (!accountName) {
        console.error("Usage: fy account add <name>");
        return 1;
      }
      const account = await ensureAccount(accountName, cwd);
      console.log(`account added: ${account.name}`);
      console.log(`codex home: ${account.codexHome}`);
      return 0;
    }

    if (subcommand === "use") {
      if (!accountName) {
        console.error("Usage: fy account use <name>");
        return 1;
      }
      const account = await setDefaultAccount(accountName, cwd);
      console.log(`default account set to ${account.name}`);
      console.log(`codex home: ${account.codexHome}`);
      return 0;
    }

    if (subcommand === "path") {
      const config = await readProjectConfig(cwd);
      const name = accountName ?? config.defaultAccount;
      console.log(codexHomePath(name, cwd));
      return 0;
    }

    console.error("Usage: fy account [list|add|use|path]");
    return 1;
  }

  if (command === "login") {
    const accountName = rest[0] ?? null;
    const state = await readState(cwd);
    const account = await resolveAccount(accountName, cwd);
    return await launchCodex(state.activeMode, ["login"], {
      cwd,
      account: account.name,
      injectFyConfig: false,
    });
  }

  if (command === "modes") {
    for (const policy of listModePolicies()) {
      console.log(`${policy.mode}: ${policy.description}`);
    }
    return 0;
  }

  if (command === "mode") {
    const requested = rest[0];
    if (!requested) {
      const state = await readState(cwd);
      const policy = getModePolicy(state.activeMode);
      console.log(`${state.activeMode}: ${policy.description}`);
      return 0;
    }
    if (!isFyMode(requested)) {
      console.error(`Unknown mode: ${requested}`);
      return 1;
    }
    await updateMode(requested, cwd);
    console.log(`mode set to ${requested}`);
    return 0;
  }

  if (command === "slash") {
    const slashCommand = rest.join(" ").trim();
    if (!slashCommand) {
      console.error('Usage: fy slash "/fy-status"');
      return 1;
    }
    const result = await executeFyCommand(slashCommand, cwd);
    if (result.status === "error") {
      console.error(result.message);
      return 1;
    }
    if ("message" in result) {
      console.log(result.message);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    return result.status === "login-required" ? 2 : 0;
  }

  if (command === "run") {
    const task = rest.join(" ").trim();
    if (!task) {
      console.error('Usage: fy run "<task>"');
      return 1;
    }
    const state = await readState(cwd);
    const plan = createRunPlan(task, state.activeMode);
    await writeState({
      ...state,
      updatedAt: new Date().toISOString(),
      lastRun: {
        task,
        mode: state.activeMode,
        phase: "planned",
        createdAt: new Date().toISOString(),
      },
    }, cwd);
    console.log(JSON.stringify(plan, null, 2));
    return 0;
  }

  if (command === "exec") {
    const parsed = parseModeArgs(rest);
    const task = parsed.args.join(" ").trim();
    if (!task) {
      console.error('Usage: fy exec [--mode <mode>] "<task>"');
      return 1;
    }
    const current = await readState(cwd);
    const mode = parsed.mode ?? current.activeMode;
    if (parsed.mode) await updateMode(parsed.mode, cwd);
    await writeState({
      ...current,
      activeMode: mode,
      updatedAt: new Date().toISOString(),
      lastRun: {
        task,
        mode,
        phase: "planned",
        createdAt: new Date().toISOString(),
      },
    }, cwd);
    return await launchCodex(mode, [], {
      cwd,
      account: parsed.account,
      execTask: task,
      enableFyPalette: parsed.enableFyPalette,
    });
  }

  console.error(`Unknown command: ${command}`);
  console.error(HELP);
  return 1;
}
