# Product Direction

This document captures the target FY product shape. It is a planning contract for development, not a claim that every feature already exists.

## Product Goal

FY is a TUI-first operating layer around Codex for one repository.

When a user runs FY inside a repository, the Codex instance launched by FY is treated as a repository-local entity. It must not follow the user's default Codex account, global Codex home, or global Codex configuration unless the user explicitly performs a repo-local login for that repository.

## Repository-Local Bootstrap

The first FY launch in a repository creates a `.fy/` workspace.

The `.fy/` workspace is the only place FY should store repository-local runtime material:

- project config,
- account registry,
- repo-local Codex homes,
- session and context snapshots,
- generated FY instructions,
- mode state,
- orchestration metadata,
- future TUI slash-command state.

FY must keep global `~/.codex` untouched.

## Account Model

One repository can have multiple FY accounts. Each account maps to a separate Codex home:

```text
.fy/codex-homes/<account>
```

On launch, FY should show an account picker in the TUI.

The picker should list every account that has logged in at least once in this repository. Each row should show:

- account label,
- login/auth presence,
- remaining token or usage allowance when available,
- reset time or renewal time when available,
- whether the account is the last used account.

The picker must also allow adding a new account. New account login must run with `CODEX_HOME` pointed at the repo-local account home.

FY must not copy credentials from global Codex state, symlink to global auth, store auth secrets in `.fy/project.json`, or silently fall back to `~/.codex`.

## TUI Status Surface

FY's Codex TUI should show a compact bottom status surface with:

- current model,
- current repository path,
- current git branch,
- context usage,
- remaining token or usage allowance,
- reset time when available.

This status surface is part of the FY product contract because account and budget awareness are core behavior, not optional diagnostics.

## Context And Token Continuity

FY should warn before the session becomes hard to continue.

Target policy:

- When context usage approaches the 70% range, warn that a fresh session may be safer soon.
- When remaining token or usage allowance reaches the 10% range, classify incoming user requests before starting heavy work.
- If the request likely cannot fit in the remaining allowance, FY should tell the user, save the current context, and prepare continuation through another repo-local account.
- If FY can switch accounts safely, it should launch Codex through another selected account while preserving the saved context needed to continue the same task.
- If FY concludes the remaining allowance is enough, it can proceed and report the risk only when useful.

Context snapshots must live under `.fy/` and must not include secrets.

## Baseline Codex Capability

FY should preserve normal Codex capability. The user should still be able to use Codex features, prompts, tools, and TUI interaction through FY unless a selected FY mode intentionally narrows behavior.

## Modes

FY has five target modes. Final user-facing names are not fixed yet; implementation may use stable internal ids until naming is decided.

### 1. Orchestrated Mode

Use when the user wants FY to think deeply and drive a task to a high-quality result with minimal supervision.

Behavior:

- plan,
- split roles,
- run multiple agents when useful,
- implement,
- review,
- verify,
- iterate until a clear stop condition.

When this mode starts multiple agents, each active agent should be visible to the user through tmux panes or an equivalent TUI surface.

### 2. Fast Edit Mode

Use for small, specific edits such as color changes, spelling fixes, simple type/name changes, or moving files.

Behavior:

- act quickly,
- avoid broad planning,
- avoid heavy verification unless the edit fails or creates risk,
- still fix obvious breakage caused by the change.

### 3. Read-Only Mode

Use when the user wants analysis, explanation, search, or planning without direct code modification.

Behavior:

- read code,
- search local or external references when needed,
- explain findings,
- write plans,
- do not edit source files or execute implementation work.

### 4. Implementation Mode

Use when the user wants a normal Codex-like development flow focused on implementation.

Behavior:

- understand the request,
- make direct code changes,
- run relevant verification,
- report changed files and evidence.

It should be simpler than Orchestrated Mode and more implementation-focused than Read-Only Mode.

### 5. Documentation And Harness Mode

Use when the user wants documents, project harness setup, or structured project knowledge.

Behavior:

- create or update project harness documents,
- gather user ideas and turn them into durable docs,
- ask for missing important information,
- fill reasonable defaults when the user cannot answer,
- read code when needed to document the current system.

This mode is primarily for harness and documentation work, not general code implementation.

## Slash Command Surface

FY should expose TUI slash commands similar to Codex's slash-command interaction.

Command names should be FY-scoped, for example:

```text
/fy-mode
/fy-context
/fy-account
/fy-status
/fy-docs
```

Expected command groups:

- mode selection: the five modes above,
- context management: save, load, reset, continue,
- account management: select, add login, show allowance/reset,
- status: model, path, branch, context, token allowance,
- documentation harness actions.

The slash-command surface should be TUI-first. CLI equivalents can be added later, but CLI must not become the initial product dependency for these workflows.

## Parallel Work And Conflict Control

FY should assume parallel work is possible by default, especially in Orchestrated Mode.

When multiple agents may edit overlapping files, FY needs explicit conflict control:

- task ownership metadata,
- file ownership hints,
- detection of overlapping writes,
- merge or rebase strategy for non-conflicting edits,
- escalation when two agents modify the same region,
- final integration review before completion.

The product goal is not just to run agents in parallel; it is to make parallel edits understandable and recoverable.

## Implementation Stack Direction

FY should use a focused stack adapted from proven OMX surfaces:

- Markdown for docs, prompts, skills, and harness output,
- TOML for Codex config parsing and repo-local config merge,
- JSON for `.fy/` state, manifests, and package metadata,
- TypeScript for product logic and policy,
- Zod for runtime schema validation,
- npm, `tsc`, and Node test runner for the baseline build/test loop,
- Biome and c8 as hardening tools when lint and coverage gates become useful,
- shell scripts only for explicit helper workflows,
- MCP SDK for optional repo-local state/memory/wiki/trace/code-intel servers after file-backed contracts stabilize,
- tmux for visible orchestrated-mode agents,
- Codex CLI as the AI execution engine.

The stack is defined in `technology-stack.md`. Detailed implementation contracts are split across `fy-tui-spec.md`, `state-schema.md`, `mode-policy-matrix.md`, `slash-command-spec.md`, `orchestration-spec.md`, and `implementation-plan.md`. Parent OMX implementation findings are captured in `omx-reference-findings.md`. OMX remains a reference source, not the FY architecture.
