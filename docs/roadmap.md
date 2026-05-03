# Agent Development Roadmap

Detailed implementation milestones live in `implementation-plan.md`. This roadmap stays phase-level.

## Phase 0: Scaffold

Status: done.

- TypeScript CLI
- mode policies
- project-local state
- Codex launcher wrapper
- repo-local multi-account Codex homes
- basic tests

## Phase 1: Harness Contract

- define run report JSON
- add prompt composer tests
- add dry-run execution reports
- add `fy doctor --account <name>`
- add account auth detection without reading token contents
- define `.fy/` bootstrap contents for TUI-first operation
- define Zod schemas for persisted FY JSON before expanding state shape

Agent instruction:

- keep this phase repo-local and contract-focused,
- avoid coordination features unless needed to satisfy the phase contract.

## Phase 2: TUI Account And Status Surface

- add TUI account picker contract
- list repo-local logged-in accounts
- add account login path from TUI
- show model, path, branch, context usage, allowance, and reset time in the bottom status surface
- preserve normal Codex capability inside FY-launched Codex
- adopt structured TOML parse/merge when Codex config scaffolding needs to preserve user fields

Agent instruction:

- do not read token contents,
- fake Codex spawn/login surfaces in tests,
- keep global Codex state untouched.

## Phase 3: Context And Allowance Continuity

- add context budget policy
- warn near 70% context usage
- classify requests near 10% remaining allowance
- save context snapshots under `.fy/`
- support continuation through another repo-local account
- add turn/loop counters and continuation metadata to state

Agent instruction:

- implement context and allowance behavior as measurable runtime policy,
- avoid relying only on prompt wording.

## Phase 4: Five Mode Model

- add orchestrated mode
- add fast edit mode
- add read-only mode
- add implementation mode
- add documentation and harness mode
- add verification recipes
- add failure summaries
- add mode selection through FY TUI slash commands

## Phase 5: Slash Commands And Documentation Harness

- add `/fy-mode`
- add `/fy-context`
- add `/fy-account`
- add `/fy-status`
- add `/fy-docs`
- add recommended harness document scaffold
- add missing-information question flow with default-fill fallback
- define Markdown prompt/skill layout for FY-specific TUI commands

## Phase 6: Orchestration And Conflict Control

- add task ownership hints
- add file ownership guardrails
- show active agents in tmux panes or an equivalent TUI surface
- detect overlapping edits
- add merge/rebase or integration strategy for non-conflicting work
- escalate same-region conflicts
- add isolated worktree mode only if needed
- add trace metadata for visible agent lifecycle and integration decisions

## Phase 7: Tooling Hardening

- add Biome lint/format gate
- add c8 coverage for high-risk policy paths
- add optional MCP state/memory/wiki/trace/code-intel surfaces after file-backed contracts stabilize
- add shell helper scripts only for explicit developer workflows or external model consultation

Coordination scope should be driven by measurable product needs, with explicit policies and tests.
