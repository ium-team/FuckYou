# Engineering Decisions

## 001: TypeScript First

FY starts in TypeScript because the first product risk is workflow shape, not native performance.

Rust can be added later for a fast sidecar if FY needs repo indexing, sandboxed command execution, or heavy local scanning.

## 002: Repo-Local Codex Homes

FY does not use global `~/.codex` for FY launches.

Reason:

- accounts should be isolated per repository,
- the same repository should support multiple saved Codex accounts,
- normal Codex usage should remain untouched.

## 003: Mode Policy Is Product Behavior

Modes are not only prompt text. They control approval posture, loop limits, verification level, output style, and token posture.

This keeps FY from becoming a pile of prompts with unclear runtime behavior.

## 004: Default Orchestration-Capable Posture

FY should preserve a path to stronger orchestration when product behavior needs multi-step control.

Default flow choices can evolve over time as long as contracts stay explicit and tested.

## 005: FY Config Is Injected At Launch

FY uses Codex `-c` overrides for runtime behavior such as `model_instructions_file` and `tui.status_line`.

Reason:

- no global config mutation,
- predictable per-launch behavior,
- easy user override through explicit Codex args.

## 006: TUI First For FY Workflows

FY-specific workflows should be designed for the TUI first.

Reason:

- account selection, token status, context usage, mode switching, and slash commands are interactive session behavior,
- the user should not need a CLI workflow to use the core FY product,
- CLI equivalents can be added later for automation without defining the initial UX.

## 007: Account Allowance Is Product State, Token Secrets Are Not

FY may display safe account status metadata such as remaining allowance and reset time when Codex exposes it.

FY must not read, copy, display, or persist token secrets.

## 008: Parallel Agents Require Conflict Control

Orchestrated mode may use parallel agents, but parallel execution is not complete unless FY can represent ownership, detect overlapping writes, and integrate results.

Reason:

- showing panes is visibility, not coordination,
- same-file edits can corrupt work without explicit conflict policy,
- final verification needs to know which agent changed what.

## 009: OMX Is A Reference, Not The FY Architecture

FY may adapt OMX patterns for Markdown skills/prompts, TOML config handling, JSON state, shell helpers, MCP surfaces, tmux panes, and Codex CLI launch behavior.

FY should not copy OMX wholesale.

Reason:

- FY is TUI-first,
- FY has repo-local account isolation as a core product contract,
- FY has five focused modes rather than broad workflow sprawl,
- simple FY modes should not require tmux or MCP,
- orchestration must include FY-specific conflict control and account/context continuity.
