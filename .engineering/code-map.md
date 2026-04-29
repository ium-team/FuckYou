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

## Accounts

Files:

- `src/accounts/store.ts`
- `src/accounts/types.ts`

Responsibilities:

- validate account names,
- read/write `.fy/project.json`,
- create `.fy/codex-homes/<account>`,
- resolve the selected Codex home.

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

Tests:

- `tests/codex.test.ts`
- `tests/runtime.test.ts`

## Modes

Files:

- `src/modes/policies.ts`
- `src/modes/types.ts`

Responsibilities:

- define `manual`, `auto`, `budget`, and `fast`,
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
