# Code Map

Use this map to find the correct edit point quickly.

## CLI

Files:

- `src/cli/index.ts`
- `src/cli/commands.ts`

Responsibilities:

- parse top-level commands,
- parse user-facing command syntax,
- call domain modules,
- print command output.

Do not put persistent account logic or Codex spawn details here.
Do not make new FY product workflows CLI-only when the requirement is TUI-first.

## TUI

Planned files:

- `src/tui/*`

Responsibilities:

- account picker,
- FY slash-command registry,
- mode selection UI,
- context management UI,
- status surface wiring.

TUI code should call domain modules for account, context, mode, runtime, and orchestration behavior.

## Accounts

Files:

- `src/accounts/store.ts`
- `src/accounts/types.ts`

Responsibilities:

- validate account names,
- read/write `.fy/project.json`,
- create `.fy/codex-homes/<account>`,
- resolve the selected Codex home.
- expose account picker data without reading auth secrets,
- surface allowance/reset metadata when Codex exposes it safely.

Tests:

- `tests/accounts.test.ts`

## Runtime

Files:

- `src/runtime/codex.ts`
- `src/runtime/instructions.ts`
- `src/runtime/plan.ts`

Responsibilities:

- compose FY instruction files,
- inject Codex `-c` overrides,
- set repo-local `CODEX_HOME`,
- spawn Codex,
- create run preview plans.
- pass TUI status-line config for model, path, branch, context, and allowance display.
- use structured TOML parsing when config merge behavior becomes complex.

## Status

Planned files:

- `src/status/*`

Responsibilities:

- compose FY-owned status/HUD state,
- combine FY mode/account/continuation state with Codex built-in status line capabilities,
- compute warning severity for context and allowance thresholds,
- read advisory metrics from `.fy/metrics.json`.

## Usage

Planned files:

- `src/usage/*`

Responsibilities:

- run repo-local auth readiness checks with selected `CODEX_HOME`,
- normalize allowance/quota metadata when available,
- return `unknown` instead of guessing,
- never read token secrets.

Tests:

- `tests/codex.test.ts`
- `tests/runtime.test.ts`

## Modes

Files:

- `src/modes/policies.ts`
- `src/modes/types.ts`

Responsibilities:

- define the target five-mode policy model,
- expose mode validation,
- define mode policy fields.

Tests:

- `tests/modes.test.ts`

## State

Files:

- `src/state/store.ts`
- `src/state/types.ts`

Responsibilities:

- read/write `.fy/state.json`,
- track active mode,
- track last run preview/execution metadata.
- track context snapshot metadata and continuation state.

Tests:

- `tests/state.test.ts`

## Doctor

Files:

- `src/doctor/checks.ts`

Responsibilities:

- check Node version,
- check Codex availability,
- check project-local FY state.

Future account checks should verify paths and auth presence without reading token contents.

## Context

Planned files:

- `src/context/*`

Responsibilities:

- save context snapshots under `.fy/`,
- restore or reset saved context,
- support continuation when an account runs out of usable allowance,
- avoid storing secrets.

## Orchestration

Planned files:

- `src/orchestration/*`

Responsibilities:

- represent active agents,
- assign task and file ownership,
- show orchestrated agents in tmux panes or an equivalent TUI surface,
- detect overlapping edits,
- coordinate final integration and verification.

## tmux

Planned files:

- `src/tmux/*`

Responsibilities:

- create and identify panes,
- distinguish agent panes from status/HUD panes,
- guard input injection with copy-mode, cooldown, dedupe, and pane caps,
- protect leader pane from worker cleanup.

## Validation

Planned files:

- `src/validation/*`

Responsibilities:

- Zod schemas for `.fy/project.json`,
- Zod schemas for `.fy/state.json`,
- Zod schemas for context snapshot manifests,
- Zod schemas for slash-command payloads,
- Zod schemas for MCP payloads and subprocess status metadata.

## Tooling

Files:

- `package.json`
- `tsconfig.json`
- future `biome.json`
- future c8 config

Responsibilities:

- compile with `tsc`,
- run Node test runner tests,
- lint and format with Biome once adopted,
- collect c8 coverage for high-risk runtime policy.

## MCP

Planned files:

- `src/mcp/*`

Responsibilities:

- expose repo-local state/memory/wiki/trace/code-intel surfaces when file-backed contracts are stable,
- validate MCP payloads,
- keep basic FY use independent of a global daemon.
