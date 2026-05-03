# Implementation Plan

This document breaks the product direction into implementation-sized milestones.

Each milestone should ship with tests and documentation updates.

## Milestone 1: Schema And Bootstrap

Goal:

- make `.fy/` state explicit and validated.

Work:

- add `src/validation` with schema definitions,
- define `project.json`, `state.json`, and `tui-state.json` schemas,
- update account store to validate persisted JSON,
- add bootstrap creation for planned directories,
- keep existing account isolation behavior.

Tests:

- invalid state is rejected or recovered,
- account paths cannot escape `.fy/codex-homes`,
- bootstrap creates expected non-secret paths,
- no global Codex home fallback.

## Milestone 2: TUI Account Picker Contract

Goal:

- make repo-local account selection the primary launch flow.

Work:

- add account picker model,
- add safe account metadata adapter,
- add repo-local `codex login status` readiness check,
- show auth presence and allowance/reset when available,
- support add-account login path through repo-local `CODEX_HOME`,
- keep CLI as a thin compatibility surface.

Tests:

- picker lists repo-local accounts,
- missing allowance metadata shows `n/a`,
- login spawn receives repo-local `CODEX_HOME`,
- readiness check receives repo-local `CODEX_HOME`,
- token contents are never read.

## Milestone 3: Status Surface

Goal:

- expose FY state in the Codex TUI status surface.

Work:

- define status model,
- include mode, account, allowance, reset, context, model, branch, path,
- add warning severity,
- isolate Codex status-line config injection,
- add two-layer FY status/HUD model,
- include built-in `five-hour-limit` and `weekly-limit` status items when safe TOML merge is in place.

Tests:

- default status contains required fields,
- user config override is preserved,
- user `[tui]` keys are preserved and duplicate `[tui]` tables are not created,
- warnings appear at threshold boundaries,
- unavailable metadata does not block launch.

## Milestone 4: Five Mode Policy

Goal:

- replace scaffold four-mode policy with the target five-mode policy.

Work:

- add mode ids from `mode-policy-matrix.md`,
- map each mode to planning, edit, question, verification, parallel, and tmux policy,
- update generated instructions,
- update state defaults when migration is defined.

Tests:

- all five modes validate,
- read-only mode rejects implementation actions,
- fast-edit uses minimal verification,
- orchestrated mode requires ownership before parallel writes.

## Milestone 5: Slash Command Surface

Goal:

- expose FY actions through `/fy-*`.

Work:

- add command registry,
- add payload schemas,
- implement `/fy-mode`, `/fy-context`, `/fy-account`, `/fy-status`, `/fy-docs`,
- wire repo-local FY skill scaffold to command discovery,
- add `UserPromptSubmit` hook routing when available,
- add palette bridge fallback,
- defer native slash integration until Codex exposes a stable extension point.

Tests:

- command parsing,
- invalid args,
- picker fallback,
- state updates,
- domain module routing.

## Milestone 6: Context Continuity

Goal:

- prevent high-context or low-allowance sessions from failing abruptly.

Work:

- add context snapshot writer,
- add summary/handoff Markdown generation,
- add warning thresholds,
- add low-allowance request classifier,
- add continuation flow through another repo-local account.

Tests:

- 70% context warning,
- 10% allowance classification,
- snapshot manifest and Markdown files are created,
- continuation uses target account `CODEX_HOME`,
- secrets are not written to snapshots.

## Milestone 7: Documentation Harness Mode

Goal:

- make docs/harness work first-class.

Work:

- define recommended harness document set,
- implement `/fy-docs init-harness`,
- add missing-information prompts,
- add default-fill behavior with assumption markers,
- support codebase summary docs.

Tests:

- existing docs are preserved or merged,
- missing fields are marked,
- generated docs follow expected structure.

## Milestone 8: tmux Orchestration

Goal:

- implement visible multi-agent Orchestrated Mode.

Work:

- create orchestration run manifests,
- start leader and role panes,
- persist pane metadata,
- verify pane identity before injection,
- detect HUD/status panes and shell panes,
- add copy-mode, cooldown, dedupe, and per-pane cap guards,
- assign ownership before writes,
- collect agent reports,
- integrate outputs.

Tests:

- fake tmux adapter starts expected panes,
- ambiguous panes fail closed,
- cleanup never targets the leader pane,
- ownership is required before worker writes,
- agent status updates persist,
- orchestration can complete, block, fail, or cancel.

## Milestone 9: Conflict Control

Goal:

- make parallel edits recoverable.

Work:

- compare ownership and git diff,
- detect file/region/state conflicts,
- block same-region integration,
- serialize shared state writes,
- add integration review step.

Tests:

- non-overlapping edits pass,
- same-region edits block,
- shared `.fy/` state writes serialize,
- conflict manifest records evidence.

## Milestone 10: Tooling Hardening

Goal:

- make the codebase safer as features grow.

Work:

- add Zod where not already added,
- add `@iarna/toml` when structural TOML merge is needed,
- add Biome lint/format,
- add c8 coverage for high-risk policy paths,
- add optional MCP servers after file-backed contracts stabilize.

Tests:

- `npm test`,
- `npm run check`,
- future lint command,
- future coverage command.

## Stop Criteria For Product Spec Completion

The docs are implementation-ready when:

- each milestone has a testable acceptance contract,
- state schemas are mirrored in runtime validation,
- slash commands route to domain modules,
- mode policy is enforced in code,
- orchestration cannot write in parallel without ownership metadata,
- context continuation can be tested without real Codex login.
