# Testing Guide

FY uses Node's built-in test runner and TypeScript compilation.

## Commands

```bash
npm run check
npm test
```

`npm test` builds the project and runs compiled tests from `dist/tests`.
As tooling hardens, Biome and c8 should become additional gates for lint/format and coverage.

## Test Placement

- Account behavior: `tests/accounts.test.ts`
- Codex launch behavior: `tests/codex.test.ts`
- Mode policy behavior: `tests/modes.test.ts`
- Runtime plan behavior: `tests/runtime.test.ts`
- State behavior: `tests/state.test.ts`

## What Must Be Tested

Add or update tests when changing:

- command parsing,
- TUI command parsing or routing,
- mode flag parsing,
- account selection,
- account picker data,
- `CODEX_HOME` behavior,
- Codex `-c` config injection,
- TUI status-line fields,
- state file shape,
- context snapshot shape,
- continuation behavior,
- project config shape,
- run plan shape.
- TOML merge behavior,
- Zod schemas for persisted state or command payloads,
- orchestration ownership and conflict-control metadata,
- MCP payload validation.

## What Not To Test With Real Services

Do not require a real Codex login in automated tests.
Do not launch the real Codex TUI in tests.
Use fake `spawn` functions for launch behavior.
Use fake status/allowance metadata for account picker and token-reset behavior.
Do not test by reading real token contents.
Do not require tmux for non-orchestrated mode tests.
Use fake tmux or pane adapters for orchestration tests until an integration test explicitly targets tmux.

## Current Required Baseline

Before handing off code changes, run:

```bash
npm test
```

For documentation-only changes, tests are still cheap enough to run unless the user explicitly asks not to.
