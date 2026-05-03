# Agent-Facing Architecture

FY is an extensible operating layer around Codex.

It should support gradual expansion in orchestration capability while keeping the policy layer, account isolation, and Codex launch adapter separate.
The target product surface is TUI-first. CLI remains a stable entrypoint and automation surface, but new FY workflows should be designed so they can be driven from the TUI.

## Modules

- `src/cli`: parses commands and calls domain modules.
- `src/accounts`: owns repo-local Codex account homes.
- `src/modes`: defines operating modes and mode policies.
- `src/runtime`: builds Codex args, writes FY instructions, and launches Codex.
- `src/state`: stores project-local FY state.
- `src/doctor`: validates the local environment.
- `src/config`: static constants.
- `src/utils`: low-level filesystem helpers.

Planned domains:

- `src/tui`: FY slash commands, account picker, and TUI status surfaces.
- `src/context`: context snapshots, restore, reset, and cross-account continuation.
- `src/orchestration`: agent visibility, task ownership, conflict control, and tmux-pane coordination for orchestrated mode.
- `src/validation`: Zod schemas for persisted state, slash-command payloads, and subprocess metadata.
- `src/config-toml`: structured Codex TOML parse/merge/write helpers when runtime config injection grows beyond simple overrides.
- `src/mcp`: optional repo-local MCP servers for state, memory, wiki, trace, and code-intel after file-backed contracts stabilize.
- `src/status`: two-layer status model that combines Codex built-in status items with FY-owned state.
- `src/usage`: safe auth/allowance/quota metadata adapters that never read token secrets.
- `src/hooks`: repo-local Codex native hook installation and dispatch when supported.
- `src/tmux`: pane identity, injection guards, layout, and cleanup adapters.

Specification owners:

- TUI behavior: `fy-tui-spec.md`
- State shape: `state-schema.md`
- Mode policy: `mode-policy-matrix.md`
- Slash commands: `slash-command-spec.md`
- Orchestration: `orchestration-spec.md`
- Milestones: `implementation-plan.md`
- OMX evidence and FY adaptation decisions: `omx-reference-findings.md`

## Runtime Flow

1. FY starts in the repository and bootstraps `.fy/` if needed.
2. TUI launch flow resolves or asks for the repo-local account.
3. State resolves the active mode and context policy.
4. Accounts resolve the repo-local Codex home.
5. Runtime writes `.fy/instructions.md`.
6. Runtime launches Codex with `CODEX_HOME=.fy/codex-homes/<account>`.
7. Runtime injects FY config using `-c`, including `model_instructions_file` and `tui.status_line`.
8. TUI status surfaces expose model, repository path, branch, context usage, remaining allowance, and reset time when available.

## Boundary Rules

- CLI should remain a stable entrypoint.
- `src/accounts` is the only module that knows where Codex homes live.
- `src/runtime/codex.ts` is the only module that spawns Codex.
- User tokens, auth files, and Codex session files must never be written outside `.fy/codex-homes/<account>` by FY.
- Global `~/.codex` must not be modified by FY commands.
- TUI account selection and slash commands must call domain modules instead of owning account, context, mode, or orchestration logic directly.
- Parallel-agent orchestration must include explicit ownership and conflict-control metadata before it is treated as product-ready.
- OMX is a reference implementation source, not a dependency boundary. Adapt its Markdown, tmux, MCP, and helper-script patterns only when they support FY's TUI-first product contract.

## Agent Development Rule

If a requested change crosses more than one boundary, update the domain module first and keep `src/cli/commands.ts` as the final wiring layer.
