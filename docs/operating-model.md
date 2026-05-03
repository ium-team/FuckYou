# Operating Model

FY has five target modes. Final user-facing names are still open; the names below describe behavior.

## Orchestrated

Use when the user wants FY to think deeply, coordinate roles, execute, review, verify, and iterate toward a high-quality result.

Behavior:

- plan the work,
- split roles when useful,
- run parallel agents when useful,
- show active agents through tmux panes or an equivalent TUI surface,
- enforce ownership and conflict control for parallel edits,
- verify before completion.

## Fast Edit

Use for obvious, small, specific edits.

Behavior:

- implement directly,
- skip broad planning,
- avoid heavy verification unless risk or breakage appears,
- fix obvious failures caused by the edit,
- report briefly.

## Read-Only

Use for analysis, explanation, external research, and planning without implementation.

Behavior:

- read code and docs,
- search external sources when needed,
- explain or plan,
- do not edit implementation files,
- do not execute implementation-focused workflows.

## Implementation

Use for normal Codex-like development where the user wants code changes without full orchestration.

Behavior:

- understand the request,
- edit the relevant files,
- run targeted verification,
- report changed files and evidence.

## Documentation And Harness

Use for documentation, project harness setup, and durable project knowledge.

Behavior:

- create or update recommended harness documents,
- collect user ideas and constraints,
- ask for missing important information,
- fill reasonable defaults when the user cannot answer,
- read code when needed to document the current system.

## Guardrails

Every mode must respect:

- file scope when provided,
- repo-local account isolation,
- TUI-first command and status expectations,
- context and token warning policy,
- loop limits,
- dangerous command policy,
- verification requirements,
- final summary contract.
