# Agent Development Roadmap

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

Agent instruction:

- keep this phase single-agent and repo-local,
- do not introduce background daemons or team workers.

## Phase 2: Budget Mode

- add context budget policy
- add file selection contract
- add short-output enforcement prompt
- add turn/loop counters to state

Agent instruction:

- implement budget behavior as measurable runtime policy,
- avoid relying only on prompt wording.

## Phase 3: Manual And Auto Modes

- add manual checkpoints
- add auto loop stop reasons
- add verification recipes
- add failure summaries

## Phase 4: Optional Coordination

- add task ownership hints
- add file ownership guardrails
- add isolated worktree mode only if needed

Team mode remains optional. FY should not make multi-agent orchestration the default path.
