# FY Agent Engineering Notes

This directory is for agents and humans developing FY itself.

These docs are not user onboarding docs. They are the working memory for future development sessions, especially AI-agent sessions.

## Start Here

Read in this order before making non-trivial changes:

1. `agent-guide.md`
2. `product-direction.md`
3. `technology-stack.md`
4. `omx-reference-findings.md`
5. `fy-tui-spec.md`
6. `state-schema.md`
7. `mode-policy-matrix.md`
8. `slash-command-spec.md`
9. `orchestration-spec.md`
10. `implementation-plan.md`
11. `philosophy.md`
12. `architecture.md`
13. `code-map.md`
14. `repo-local-codex.md`
15. `testing.md`

## Document Map

- `agent-guide.md`: how an AI agent should work on FY.
- `product-direction.md`: target TUI-first product contract and mode shape.
- `technology-stack.md`: FY implementation stack and OMX adaptation boundaries.
- `omx-reference-findings.md`: parent OMX implementation facts translated into FY decisions.
- `fy-tui-spec.md`: TUI launch, account picker, status surface, and tmux visibility behavior.
- `state-schema.md`: target `.fy/` directory and JSON state contracts.
- `mode-policy-matrix.md`: enforceable behavior matrix for the five target modes.
- `slash-command-spec.md`: `/fy-*` command registry and action contracts.
- `orchestration-spec.md`: visible multi-agent runtime, ownership, conflict, and trace rules.
- `implementation-plan.md`: milestone-sized implementation and test plan.
- `philosophy.md`: engineering principles for building FY.
- `operating-model.md`: target mode behavior and guardrails.
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
- Treat TUI-first behavior as the target product surface; CLI remains useful but is not the initial user workflow for new FY features.
- Keep CLI as a stable entrypoint; put operational behavior in `src/accounts`, `src/runtime`, `src/modes`, and `src/state`.
- Add or update tests for every behavior change.
- Keep architecture evolution-friendly so stronger orchestration can be added without breaking core contracts.
