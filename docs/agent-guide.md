# Agent Guide

This file is the first document an AI agent should read before developing FY.

## Working Style

- Make small, contract-preserving changes.
- Prefer extending existing modules over adding new abstractions.
- Keep user-facing behavior explicit in tests.
- Update `docs/` when a change alters architecture, account isolation, or runtime policy.
- Update `README.md` or `docs/` only when the user-facing behavior changes.

## Product Shape To Preserve

FY is not "OMX but smaller" in implementation detail.
FY is a lightweight mode switch around Codex with repo-local account isolation.

Default posture:

- lightweight,
- repo-local,
- explicit,
- low ceremony,
- easy to delete.

## Before Editing

Check the feature class:

- CLI command or flag: start in `src/cli/commands.ts`.
- Codex launch behavior: start in `src/runtime/codex.ts`.
- Account isolation: start in `src/accounts/store.ts`.
- Mode behavior: start in `src/modes/policies.ts`.
- State shape: start in `src/state/types.ts` and `src/state/store.ts`.

Then open the matching test file under `tests/`.

## Change Rules

- Do not store credentials in `.fy/project.json`.
- Do not read token contents for normal feature logic.
- Do not copy, import, or symlink `~/.codex/auth.json`.
- Do not add global install side effects.
- Do not make `fy run` perform real AI execution; it is currently the plan preview surface.
- Do not make team/multi-agent behavior part of the default path.

## Good Agent Output

When finishing a development task, report:

- what changed,
- which files matter,
- what tests ran,
- any behavior that is intentionally still stubbed.

Avoid long architectural essays unless the user asks for them.
