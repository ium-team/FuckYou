# Agent-Facing Architecture

FY is a thin operating layer around Codex.

It should not become a large orchestration runtime by default. The implementation should keep the policy layer, account isolation, and Codex launch adapter separate.

## Modules

- `src/cli`: parses commands and calls domain modules.
- `src/accounts`: owns repo-local Codex account homes.
- `src/modes`: defines operating modes and mode policies.
- `src/runtime`: builds Codex args, writes FY instructions, and launches Codex.
- `src/state`: stores project-local FY state.
- `src/doctor`: validates the local environment.
- `src/config`: static constants.
- `src/utils`: low-level filesystem helpers.

## Runtime Flow

1. CLI parses mode flags and account flags.
2. State resolves the active mode.
3. Accounts resolve the repo-local Codex home.
4. Runtime writes `.fy/instructions.md`.
5. Runtime launches Codex with `CODEX_HOME=.fy/codex-homes/<account>`.
6. Runtime injects FY config using `-c`, including `model_instructions_file` and `tui.status_line`.

## Boundary Rules

- CLI should stay thin.
- `src/accounts` is the only module that knows where Codex homes live.
- `src/runtime/codex.ts` is the only module that spawns Codex.
- User tokens, auth files, and Codex session files must never be written outside `.fy/codex-homes/<account>` by FY.
- Global `~/.codex` must not be modified by FY commands.

## Agent Development Rule

If a requested change crosses more than one boundary, update the domain module first and keep `src/cli/commands.ts` as the final wiring layer.
