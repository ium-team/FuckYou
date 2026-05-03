# Repo-Local Codex Contract

FY supports multiple Codex accounts inside one repository without touching the user's global Codex state.

## Goal

A single repository can have several FY accounts:

```text
.fy/codex-homes/personal
.fy/codex-homes/work
.fy/codex-homes/client
```

Each account keeps its own Codex login state, config, sessions, and history.
The repository-local FY account is a different operational identity from the user's normal Codex account outside FY.

## Storage

Project config:

```text
.fy/project.json
```

Codex homes:

```text
.fy/codex-homes/<account>/
```

Each account home is initialized with an account-local `config.toml` scaffold, so FY behavior does not depend on global `~/.codex/config.toml`.

Runtime state:

```text
.fy/state.json
.fy/instructions.md
```

Planned runtime state:

```text
.fy/context-snapshots/
.fy/orchestration/
.fy/tui-state.json
```

These paths are for non-secret FY metadata. Auth secrets remain inside the matching repo-local Codex home.

## Launch Contract

Every FY Codex launch must set:

```bash
CODEX_HOME="$PROJECT/.fy/codex-homes/<account>"
```

This applies to:

- `fy`
- `fy --account <name>`
- `fy exec --account <name> "..."`
- `fy login <name>`

The target product flow is TUI-first. When `fy` starts without an explicit account, it should present a TUI account picker rather than silently choosing global Codex state.

## Login Contract

`fy login <account>` launches:

```bash
CODEX_HOME="$PROJECT/.fy/codex-homes/<account>" codex login
```

This means the login is stored for that repository and that account only.

## Account Picker Contract

The TUI account picker should show accounts that have logged in at least once in the current repository.

Each account row should include:

- account name,
- login/auth presence,
- remaining token or usage allowance when available,
- reset or renewal time when available,
- last-used marker when available.

The picker should also offer an add-login path that creates a new repo-local Codex home and runs Codex login with the correct `CODEX_HOME`.

FY may inspect metadata needed to determine auth presence or account status, but it must not read, display, copy, or persist token contents.

Auth readiness should be checked with the selected repo-local environment, for example by running `codex login status` with:

```bash
CODEX_HOME="$PROJECT/.fy/codex-homes/<account>"
```

Install or scaffold evidence is not enough to prove that the selected account can make an authenticated model request.

## Allowance And Continuation Contract

When context usage approaches the 70% range, FY should warn that starting a fresh session may soon be safer.

When remaining token or usage allowance reaches the 10% range, FY should classify the next user request before doing expensive work. If FY determines the request likely cannot complete with the current account, it should:

1. save a context snapshot under `.fy/`,
2. prepare continuation through another repo-local account,
3. relaunch Codex with that account's `CODEX_HOME`,
4. restore enough saved context to continue the task,
5. tell the user what changed and why.

Continuation metadata must not include auth secrets.

Built-in Codex status-line quota items can show live five-hour and weekly limits in the launched TUI. Account-picker allowance rows still need a safe FY metadata adapter and must display `n/a` when that metadata is unavailable.

## Non-Negotiables

- Do not copy tokens from `~/.codex`.
- Do not symlink repo-local auth to global Codex auth.
- Do not store auth files in `project.json`.
- Do not let a missing account fall back to `~/.codex`.
- Do not use account names that can escape the repo-local directory.

## Current CLI

```bash
fy account list
fy account add personal
fy account use personal
fy account path personal
fy login personal
fy --account personal --budget
fy exec --account personal "task"
```

The CLI is currently useful for scaffolding and tests. The product target is to move account selection, context management, mode selection, and status display into the TUI first, then add CLI equivalents later where they help automation.
