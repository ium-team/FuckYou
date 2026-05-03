# Slash Command Spec

This document defines FY's target slash-command surface.

FY commands are TUI-first and must be prefixed with `/fy-` to avoid ambiguity with native Codex commands.

## Command Rules

- Commands route to domain modules; they do not own business logic.
- Commands validate inputs with runtime schemas before changing state.
- Commands must work without global Codex state.
- Commands should show concise success, failure, and next-step messages.
- CLI equivalents can be added later, but TUI behavior is the source product contract.

## Implementation Surface

The command vocabulary is user-facing. The first implementation does not require Codex to expose arbitrary native slash-command extensions.

Implementation order:

1. Repo-local FY skill scaffold under `.fy/codex-homes/<account>/skills/fy/SKILL.md`.
2. FY command parser for `/fy-*` text.
3. `UserPromptSubmit` hook routing when repo-local Codex hooks are enabled.
4. Palette bridge fallback for terminals where direct slash handling is unavailable.
5. Native slash integration only if Codex exposes a stable extension point.

This keeps command behavior independent of the UI transport.

## Command Registry

### `/fy-mode`

Purpose:

- view or change active FY mode.

Forms:

```text
/fy-mode
/fy-mode orchestrated
/fy-mode fast-edit
/fy-mode read-only
/fy-mode implementation
/fy-mode docs-harness
```

Behavior:

- no argument: open mode picker,
- with mode id: set active mode,
- show current mode policy summary after selection.

Errors:

- unknown mode,
- mode switch blocked by active orchestration run,
- read-only mode refusing pending implementation action.

### `/fy-context`

Purpose:

- manage context snapshots and continuation.

Forms:

```text
/fy-context
/fy-context save
/fy-context load <snapshot-id>
/fy-context reset
/fy-context summary
/fy-context continue
/fy-context continue --account <account>
```

Behavior:

- `save`: write snapshot manifest plus Markdown summary/handoff,
- `load`: restore selected snapshot into current launch flow,
- `reset`: clear active context metadata after confirmation inside TUI,
- `summary`: show current context summary,
- `continue`: start low-allowance continuation flow.

Errors:

- snapshot not found,
- restore target account unavailable,
- context summary generation failed,
- continuation would require missing account authority.

### `/fy-account`

Purpose:

- select, inspect, or add repo-local accounts.

Forms:

```text
/fy-account
/fy-account select
/fy-account select <account>
/fy-account login
/fy-account login <account>
/fy-account status
/fy-account status <account>
```

Behavior:

- no argument: open account picker,
- `select`: switch active account for next launch or continuation,
- `login`: create or reuse repo-local account home and run Codex login,
- `status`: show auth presence, allowance, reset, and codex home path.

Errors:

- invalid account name,
- account path escapes `.fy/codex-homes`,
- login command failed,
- metadata unavailable.

Metadata unavailable is warning-level, not blocking.

### `/fy-status`

Purpose:

- show full FY runtime status.

Forms:

```text
/fy-status
/fy-status compact
/fy-status full
```

Output fields:

- mode,
- account,
- auth status,
- allowance,
- reset time,
- context usage,
- model,
- repository path,
- branch,
- active orchestration run if present.

### `/fy-docs`

Purpose:

- documentation and harness actions.

Forms:

```text
/fy-docs
/fy-docs init-harness
/fy-docs update product
/fy-docs update architecture
/fy-docs update roadmap
/fy-docs summarize-codebase
```

Behavior:

- `init-harness`: create recommended docs if missing,
- `update`: update a specific document type,
- `summarize-codebase`: read code and create a documentation-oriented summary.

Rules:

- Do not overwrite existing user docs without preserving or merging content.
- Mark assumptions when the user cannot answer missing questions.

### `/fy-orchestrate`

Purpose:

- inspect and control Orchestrated Mode runs.

Forms:

```text
/fy-orchestrate
/fy-orchestrate start
/fy-orchestrate status
/fy-orchestrate pause
/fy-orchestrate resume
/fy-orchestrate stop
/fy-orchestrate conflicts
```

Behavior:

- `start`: start visible multi-agent orchestration for current task,
- `status`: show agents, panes, ownership, and stop condition,
- `pause`: pause new worker actions,
- `resume`: continue paused run,
- `stop`: cancel or finish run depending on state,
- `conflicts`: show overlapping edit conflicts.

Rules:

- Multi-agent orchestration requires ownership metadata before write work.
- Same-region conflicts must block integration.

## Picker UX

For commands with no argument, FY should open a picker:

- `/fy-mode`: mode picker,
- `/fy-context`: context action picker,
- `/fy-account`: account picker,
- `/fy-docs`: docs action picker,
- `/fy-orchestrate`: orchestration action picker.

Pickers should show disabled items with a reason rather than hiding them when the reason helps the user.
