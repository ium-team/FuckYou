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

## Login Contract

`fy login <account>` launches:

```bash
CODEX_HOME="$PROJECT/.fy/codex-homes/<account>" codex login
```

This means the login is stored for that repository and that account only.

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
