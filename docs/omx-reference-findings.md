# OMX Reference Findings

This document records implementation facts found in the parent `oh-my-codex` codebase and translates them into FY decisions.

FY should use these findings to remove guesswork from the TUI/status/slash/tmux/MCP specs.

## Evidence Sources

Parent OMX files inspected:

- `../skills/hud/SKILL.md`
- `../src/config/generator.ts`
- `../src/config/codex-hooks.ts`
- `../docs/codex-native-hooks.md`
- `../src/scripts/codex-native-hook.ts`
- `../src/hooks/keyword-detector.ts`
- `../src/hooks/keyword-registry.ts`
- `../src/hud/*`
- `../src/team/*`
- `../src/mcp/*`
- `../src/cli/codex-home.ts`
- `../src/cli/index.ts`

## Finding 1: Status Must Be Two-Layer

OMX uses a two-layer HUD/status model:

- Codex built-in `[tui] status_line` for live model/git/context/quota items.
- OMX-owned HUD command for workflow/orchestration state from `.omx/`.

Codex built-in status items documented by OMX include:

```text
model-name
model-with-reasoning
current-dir
project-root
git-branch
context-remaining
context-used
five-hour-limit
weekly-limit
codex-version
context-window-size
used-tokens
total-input-tokens
total-output-tokens
session-id
```

FY decision:

- Use Codex built-in status line for model, path/root, branch, context, and built-in quota indicators.
- Use a FY-owned status/HUD layer for account name, FY mode, continuation state, orchestration state, and warning severity.
- Do not assume custom FY fields can be injected into Codex's built-in status line unless Codex adds that extension.

## Finding 2: TOML Merge Needs Structural Care

OMX's config generator treats root TOML keys carefully because top-level keys must appear before table headers. It also merges `[tui]` without duplicating the table and preserves unrelated user keys.

FY decision:

- Keep early simple scaffolding small.
- Before FY starts merging user-authored repo-local Codex config, add a structured TOML merge module.
- Preserve unrelated `[tui]` keys and replace only FY-owned `status_line` when necessary.

## Finding 3: Native Hooks Exist, But Not For Every UX Need

OMX installs native Codex hooks through:

- `.codex/config.toml` with `[features].codex_hooks = true`
- `.codex/hooks.json`

OMX maps:

- `SessionStart`
- `UserPromptSubmit`
- `PreToolUse`
- `PostToolUse`
- `Stop`

Known limitations from OMX docs:

- `PreToolUse` and `PostToolUse` are Bash-only for current native scope.
- There is no distinct native `ask-user-question` hook.
- Some runtime behavior still needs tmux/runtime fallbacks.

FY decision:

- Use native hooks for FY prompt routing, status reconciliation, context warnings, and stop/continuation signals when available.
- Keep fallback behavior for TUI surfaces that native hooks cannot express.
- Do not design FY question or picker UX as if Codex native hooks provide a first-class ask-user interaction.

## Finding 4: Slash-Like UX Should Be Skill/Hook/Palette Backed

OMX uses skills, keyword detection, and `UserPromptSubmit` routing rather than a generic arbitrary slash-command extension API.

FY already scaffolds a repo-local skill at:

```text
.fy/codex-homes/<account>/skills/fy/SKILL.md
```

FY decision:

- Treat `/fy-*` as the user-facing command vocabulary.
- Implement the first version through a repo-local FY skill plus prompt-submit command parsing and/or a palette bridge.
- Keep command parsing in FY domain code so it can move to a native slash extension later if Codex exposes one.

## Finding 5: Account Auth Readiness Is Not The Same As Real Execution

OMX docs explicitly separate install/doctor evidence from real Codex execution readiness. They recommend `codex login status` plus a real execution smoke test for auth/profile/provider readiness.

FY decision:

- Account picker auth status can show metadata states such as `ready`, `logged out`, `unknown`, or `error`.
- Real account readiness should be confirmed by a repo-local `codex login status` or a bounded smoke path using the selected `CODEX_HOME`.
- Missing usage metadata should not block launch.
- FY must not read token secrets to infer account status.

## Finding 6: Built-In Quota Items Exist, Account Picker Metadata Still Needs An Adapter

Codex status line can display `five-hour-limit` and `weekly-limit`, which covers live quota visibility in the Codex TUI.

OMX does not provide a stable account-picker API for per-account allowance rows. Its token/metrics surfaces are state/log oriented and not a direct account metadata source.

FY decision:

- Use built-in quota status line items for live TUI quota display.
- Build a `usageMetadataAdapter` boundary for account picker rows.
- Adapter output must allow `unknown` values.
- FY should not promise reset timestamps unless the adapter can provide them safely.

## Finding 7: tmux Runtime Needs Pane Identity And Guards

OMX's tmux code has several hardening patterns:

- resolve the actual Codex pane instead of blindly trusting `TMUX_PANE`,
- avoid targeting HUD panes as agent panes,
- detect shell panes where an agent exited,
- skip injection while a pane is in copy mode,
- apply cooldowns and per-pane injection caps,
- persist pane ids in runtime state,
- keep leader pane separate from worker cleanup.

FY decision:

- Orchestrated Mode must persist leader and worker pane ids.
- FY must fail closed when it cannot identify an agent pane safely.
- HUD/status panes must be distinguished from agent panes.
- Worker cleanup must never target the leader pane.
- tmux injection needs dedupe, cooldown, and copy-mode guards.

## Finding 8: Team State Provides Useful Patterns But Needs FY Ownership Semantics

OMX team state includes workers, tasks, claims, mailbox, heartbeats, phase, dispatch requests, and integration statuses. It also supports worktree-based isolation and conflict statuses such as cherry-pick/rebase conflicts.

FY decision:

- Reuse the concepts: task claim, worker heartbeat, worker status, dispatch status, terminal phases, integration status.
- Add FY-specific file/region ownership before parallel writes.
- Prefer worktree isolation for broad parallel implementation once basic single-worktree ownership is proven.

## Finding 9: MCP Should Come After File-Backed Contracts

OMX MCP servers expose state, memory, wiki, trace, and code-intel tools. State paths are validated, session ids are constrained, working directories can be allowlisted, and writes are serialized/atomic.

FY decision:

- Keep initial FY behavior file-backed.
- Add MCP only after `.fy/` schemas and domain modules are stable.
- Use path validation, session id validation, allowlisted working-directory policy, write locks, and atomic writes from the start.

## Finding 10: Context Snapshots Are A Real OMX Pattern

OMX skills require pre-context intake snapshots under `.omx/context/{slug}-{timestamp}.md` before team/autopilot/ralplan flows.

FY decision:

- FY context snapshots should use the same practical shape: task, outcome, known evidence, constraints, unknowns, likely touchpoints, and handoff.
- Low-allowance continuation can reuse this snapshot format rather than inventing a separate one.

## Resulting FY Architecture Adjustment

FY should implement these concrete adapters:

- `src/status`: two-layer status model and warning severity.
- `src/codex-config`: structural TOML merge for repo-local Codex config.
- `src/hooks`: native hook installation/dispatch for repo-local `CODEX_HOME`.
- `src/commands`: `/fy-*` parser independent of the eventual UI surface.
- `src/usage`: safe allowance/quota metadata adapter.
- `src/tmux`: pane identity, launch, injection, and cleanup adapter.
- `src/orchestration`: FY ownership, tasks, workers, heartbeats, conflicts, and trace.
