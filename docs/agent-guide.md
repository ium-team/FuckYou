# Agent Guide

This file is the first document an AI agent should read before developing FY.

## Working Style

- Make small, contract-preserving changes.
- Prefer extending existing modules over adding new abstractions.
- Keep user-facing behavior explicit in tests.
- Update `docs/` when a change alters architecture, account isolation, or runtime policy.
- Update `README.md` or `docs/` only when the user-facing behavior changes.

## Product Shape To Preserve

FY is an extensible operating layer around Codex with repo-local account isolation.
The target product is TUI-first: FY should feel like a repository-local Codex instance with FY account, context, mode, and orchestration controls layered into the TUI.

Default posture:

- evolution-friendly,
- repo-local,
- TUI-first for user workflows,
- explicit,
- policy-driven,
- contract-first.

## Before Editing

Check the feature class:

- TUI slash command or TUI status behavior: start in the future TUI/runtime surface, then keep shared policy in domain modules.
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
- Keep coordination behavior explicit in policy and tests when adding it.
- Do not implement new account, token, context, or orchestration behavior as CLI-only if the product requirement is TUI-first.

## Good Agent Output

When finishing a development task, report:

- what changed,
- which files matter,
- what tests ran,
- any behavior that is intentionally still stubbed.

Avoid long architectural essays unless the user asks for them.
