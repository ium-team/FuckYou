# FY Agent Engineering Notes

This directory is for agents and humans developing FY itself.

These docs are not user onboarding docs. They are the working memory for future development sessions, especially AI-agent sessions.

## Start Here

Read in this order before making non-trivial changes:

1. `agent-guide.md`
2. `philosophy.md`
3. `architecture.md`
4. `code-map.md`
5. `repo-local-codex.md`
6. `testing.md`

## Document Map

- `agent-guide.md`: how an AI agent should work on FY.
- `philosophy.md`: engineering principles for building FY.
- `architecture.md`: module boundaries and runtime flow.
- `code-map.md`: where to edit for each feature class.
- `repo-local-codex.md`: account isolation and `CODEX_HOME` contract.
- `testing.md`: expected checks and test ownership.
- `decisions.md`: durable engineering decisions.
- `roadmap.md`: implementation phases for FY itself.
- `collaboration-rules.md`: git workflow rules for commits, branches, issues, PRs, and merges.

## Current Non-Negotiables

- Do not mutate global `~/.codex` from FY code.
- Do not let FY account resolution fall back to global Codex state.
- Keep CLI code thin; put behavior in `src/accounts`, `src/runtime`, `src/modes`, or `src/state`.
- Add or update tests for every behavior change.
- Keep FY lighter than OMX unless a feature explicitly opts into stronger orchestration.
