# Testing Guide

FY uses Node's built-in test runner and TypeScript compilation.

## Commands

```bash
npm run check
npm test
```

`npm test` builds the project and runs compiled tests from `dist/tests`.

## Test Placement

- Account behavior: `tests/accounts.test.ts`
- Codex launch behavior: `tests/codex.test.ts`
- Mode policy behavior: `tests/modes.test.ts`
- Runtime plan behavior: `tests/runtime.test.ts`
- State behavior: `tests/state.test.ts`

## What Must Be Tested

Add or update tests when changing:

- command parsing,
- mode flag parsing,
- account selection,
- `CODEX_HOME` behavior,
- Codex `-c` config injection,
- state file shape,
- project config shape,
- run plan shape.

## What Not To Test With Real Services

Do not require a real Codex login in automated tests.
Do not launch the real Codex TUI in tests.
Use fake `spawn` functions for launch behavior.

## Current Required Baseline

Before handing off code changes, run:

```bash
npm test
```

For documentation-only changes, tests are still cheap enough to run unless the user explicitly asks not to.
