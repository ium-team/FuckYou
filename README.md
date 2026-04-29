# FY

FY is a lightweight personal AI operating layer.

It is inspired by the idea of an AI harness, but its default posture is smaller than OMX:
use the minimum process needed for the current task, then increase control only when the work demands it.

## Philosophy

FY starts from three observations:

1. Frontend and UI work usually needs tight human feedback.
2. Backend and internal logic often benefits from a larger one-shot implementation plus strong verification.
3. Sometimes the user wants a low-touch mode where the AI keeps moving inside clear guardrails.

The product is therefore not a single "strong mode". It is a mode switch.

## Core Modes

- `manual`: human-guided work, best for UI detail and ambiguous product decisions.
- `auto`: low-touch execution, best for boring or exploratory implementation.
- `budget`: low-token execution, slower and more incremental by design.
- `fast`: direct execution, best for small, clear tasks.

## Current Status

This repository is an initial scaffold. It includes the CLI shape, mode policy model, state storage, docs, and tests.
It does not yet call an AI provider or modify a real codebase through an agent loop.

## Documentation Layout

- Developer docs for FY service development: `docs/`
- Collaboration workflow rules: `docs/collaboration-rules.md`

`philosophy`, `architecture`, and `roadmap` for FY implementation are maintained in `docs/`.

## Commands

```bash
npm install
npm run build
node dist/src/cli/index.js --budget
node dist/src/cli/index.js doctor
node dist/src/cli/index.js account add personal
node dist/src/cli/index.js account use personal
node dist/src/cli/index.js login personal
node dist/src/cli/index.js mode budget
node dist/src/cli/index.js --account personal --budget
node dist/src/cli/index.js exec --account personal "add input validation"
node dist/src/cli/index.js run "preview the run plan only"
```

`fy` without a subcommand launches Codex and injects the active FY mode instructions through Codex's `model_instructions_file` config.
FY also enables a compact bottom status line with the current model, folder, git branch, context usage, and remaining context percentage.
Use `fy exec "<task>"` for non-interactive Codex execution.
Use `fy run "<task>"` when you only want to inspect the FY run plan scaffold.

FY keeps Codex login state repo-local. Each account lives under `.fy/codex-homes/<account>`, and FY launches Codex with `CODEX_HOME` pointed at that folder. Global `~/.codex` is not modified by FY launches.
Each account home gets its own `config.toml`, so FY sessions stay isolated from global Codex TUI defaults.
When launching `fy` without `--account`, FY shows an account picker each run so you can choose an existing account or create a new one and log in immediately.

## Design Rule

FY should remain cheap by default. Any feature that adds tokens, hidden context, or extra ceremony must be attached to a mode or an explicit command.
