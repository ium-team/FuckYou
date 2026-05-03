# FY TUI Spec

This document defines the target TUI behavior for FY. It is a product and implementation contract, not a claim that the current scaffold already supports every screen.

## Goals

The FY TUI must make the repository-local Codex environment visible and controllable.

The user should always understand:

- which repo-local account is active,
- which model is active,
- which repository and branch are active,
- how much context is used,
- how much account allowance remains when available,
- which FY mode is active,
- whether FY is running a simple session or an orchestrated session.

## Launch Flow

### First Launch In A Repository

1. FY detects that `.fy/` does not exist.
2. FY creates the bootstrap structure from `state-schema.md`.
3. FY opens the account picker.
4. If no repo-local accounts exist, FY highlights `Add account`.
5. New login runs Codex login with `CODEX_HOME=.fy/codex-homes/<account>`.
6. After login, FY launches Codex with the selected repo-local account.

Failure handling:

- If `.fy/` cannot be created, show a blocking error and do not launch Codex.
- If account login fails, return to account picker with the error summary.
- If Codex CLI is missing, show a blocking doctor-style error.

### Subsequent Launch

1. FY reads `.fy/project.json` and `.fy/state.json`.
2. FY opens the account picker unless launch policy explicitly selects the last account.
3. The account picker lists repo-local accounts that exist under `.fy/codex-homes/`.
4. FY launches Codex with the selected account's `CODEX_HOME`.

FY must never select global `~/.codex` as a fallback account.

## Account Picker

Required fields:

```text
FY Account

> personal     ready       allowance 18%   reset 03:12   last used
  work         ready       allowance 74%   reset tomorrow 09:00
  client-a     logged out  allowance n/a   reset n/a
  + Add account
```

Keyboard behavior:

- Up/down: move selection.
- Enter: choose account or activate add-account.
- Escape: cancel only before Codex has launched.
- `/`: open FY command palette if available.

Account row states:

- `ready`: repo-local auth appears present.
- `logged out`: account exists, but auth appears absent or expired.
- `unknown`: FY cannot determine auth status without reading secrets.
- `error`: metadata read failed; user can still attempt launch if auth exists.

Allowance fields:

- Show remaining allowance and reset time only when Codex or a safe metadata adapter provides them.
- If unavailable, show `n/a`; do not block launch.
- Never parse or display token secrets.
- Built-in quota status line items are enough for live TUI quota display, but account picker rows still need a safe metadata adapter and must tolerate unknown values.

## Bottom Status Surface

FY status is two-layer:

- **Layer 1: Codex built-in status line** from repo-local `config.toml`.
- **Layer 2: FY status/HUD surface** from `.fy/` state.

Codex's built-in status line can cover model, directory/root, branch, context, and built-in quota items. FY-specific fields such as mode, account label, continuation state, warning severity, and orchestration state belong to the FY layer unless Codex exposes custom status segments later.

Minimum target format:

```text
FY implementation | acct work 74% reset 03:12 | ctx 42% | gpt-5.5 | main | /repo
```

Required segments:

- FY mode,
- account name,
- allowance percentage or `n/a`,
- reset time or `n/a`,
- context percentage,
- model,
- branch,
- repository path.

Recommended Codex built-in items for the repo-local account config:

```toml
[tui]
status_line = [
  "model-with-reasoning",
  "current-dir",
  "git-branch",
  "context-used",
  "context-remaining",
  "five-hour-limit",
  "weekly-limit"
]
```

Implementation note:

- FY scaffolds the recommended built-in status-line items for new repo-local account homes.
- Runtime `-c tui.status_line=...` injection respects explicit user-provided status-line overrides.
- Structural TOML merge is still only needed when FY starts editing existing user-owned `[tui]` tables instead of using launch-time overrides.

Status severity:

- Normal: no warning.
- Context warning: context at or above the configured warning threshold, initially around 70%.
- Allowance warning: remaining allowance at or below the configured warning threshold, initially around 10%.
- Blocking: active account cannot launch or continuation failed.

## Context Warnings

When context approaches the 70% range:

- show a non-blocking warning,
- recommend saving context or starting a fresh session soon,
- keep the current request flow uninterrupted unless the selected mode requires a checkpoint.

When allowance reaches the 10% range:

- classify the next request before heavy work,
- if likely too large, save context and start the continuation flow,
- if likely safe, proceed and keep warning visible.

## TUI Command Entry

FY commands are opened through slash-style commands:

```text
/fy-mode
/fy-context
/fy-account
/fy-status
/fy-docs
/fy-orchestrate
```

If native Codex slash-command extension is not available, FY may implement a palette bridge or skill-discovery workaround, but the user-facing command names remain FY-scoped.

OMX evidence indicates the practical first implementation should be skill/hook/palette backed:

- install a repo-local FY skill under the selected account's `CODEX_HOME`,
- parse `/fy-*` through a FY command registry,
- use `UserPromptSubmit`-style hook routing when available,
- keep a palette bridge as fallback for terminals where direct slash integration is unavailable.

## Orchestrated Mode TUI

When Orchestrated Mode starts multiple agents, the user must be able to see each active lane.

Target tmux layout:

```text
+-----------------------+-----------------------+
| leader                | explorer              |
| plan/status           | repo lookup           |
+-----------------------+-----------------------+
| executor              | verifier              |
| edits/tests           | review/test evidence  |
+-----------------------+-----------------------+
```

Required pane metadata:

- agent id,
- role,
- status,
- assigned task,
- owned files or read-only marker,
- last heartbeat,
- current stop condition.

Simple modes must not require tmux.

tmux pane handling must fail closed:

- do not trust `TMUX_PANE` until the pane is verified as an agent pane,
- distinguish HUD/status panes from agent panes,
- do not inject into shell panes after an agent exits,
- skip injection while a pane is in copy mode,
- enforce cooldown and dedupe guards.

## Error And Empty States

Account metadata unavailable:

- show `allowance n/a`,
- allow launch,
- record a diagnostic event.

No accounts:

- show account picker with `Add account` selected.

Context snapshot unavailable:

- show restore failure,
- keep current account/session unchanged.

Conflict detected in orchestration:

- pause integration,
- show affected files and regions,
- route to leader pane for resolution.

## Implementation Boundaries

- TUI code routes actions to domain modules.
- Account logic stays in `src/accounts`.
- Runtime launch stays in `src/runtime/codex.ts`.
- Context logic stays in `src/context`.
- Orchestration state stays in `src/orchestration`.
- Validation schemas stay in `src/validation`.
