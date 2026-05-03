# Technology Stack

This document defines the functional implementation stack for FY.

FY can borrow proven ideas from OMX, but FY is not an OMX clone. Every tool must serve FY's repo-local, TUI-first product contract.

## Stack Policy

Use technology in three lanes:

- **Current**: already used by the scaffold.
- **Adopt**: planned for FY product features.
- **Reference**: useful OMX precedent, but not a default FY dependency yet.

Do not add a dependency only because OMX uses it. Add it when a FY feature needs the capability and the boundary is clear.

## Current Stack

### TypeScript

Role:

- domain modules,
- runtime launch logic,
- state management,
- account isolation,
- tests.

Rules:

- Keep operational behavior in domain modules.
- Keep UI and CLI surfaces thin.
- Prefer explicit types for state and config contracts.

### npm And Node Test Runner

Role:

- build orchestration,
- test execution,
- fake-spawn runtime tests,
- contract tests for account, mode, runtime, and state behavior.

Rules:

- `npm test` is the baseline verification command.
- Automated tests must not require real Codex login.
- Automated tests must not launch the real Codex TUI.

### TypeScript Compiler

Role:

- typecheck,
- build,
- contract enforcement before tests.

Rules:

- `tsc` remains the first static verification layer.
- Public state/config types should fail at compile time when contracts drift.

### node-pty

Role:

- interactive TUI process control,
- future bridge between FY surfaces and Codex TUI processes.

Rules:

- Keep PTY handling isolated from domain policy.
- Tests should fake PTY/process behavior where possible.

## Adopt For FY Product Features

### Markdown

Files:

- `skills/*/SKILL.md`,
- `prompts/*.md`,
- `docs/*`,
- `AGENTS.md`,
- generated harness docs under `.fy/` or project docs.

Role:

- human-readable product contracts,
- mode instructions,
- agent prompts,
- documentation harness output,
- durable project knowledge.

Rules:

- Markdown is the primary format for instructions and generated docs.
- Product-changing behavior must be backed by docs and tests.
- Harness mode should create structured Markdown, not opaque state blobs.

### TOML

Files:

- `.codex/config.toml`,
- repo-local `.fy/codex-homes/<account>/config.toml`,
- native agent configuration when needed,
- future Rust/Cargo configuration if a sidecar is introduced.

Role:

- Codex config parsing,
- Codex config merge/injection,
- repo-local account config scaffolds.

Dependency target:

- `@iarna/toml` for parse/merge/write behavior when ad hoc string edits are no longer enough.

Rules:

- Never mutate global `~/.codex/config.toml`.
- Merge repo-local config structurally.
- Preserve user-owned config fields.
- Keep root-level TOML keys before table headers.
- Avoid duplicate `[tui]` tables.
- Preserve non-FY keys in `[tui]` when replacing FY-owned `status_line`.

### JSON

Files:

- `.fy/project.json`,
- `.fy/state.json`,
- `.fy/tui-state.json`,
- context snapshot manifests,
- orchestration manifests,
- catalog manifests,
- MCP payloads,
- `package.json`.

Role:

- machine-readable FY state,
- account registry,
- mode state,
- context continuation metadata,
- orchestration ownership metadata,
- package metadata.

Rules:

- Validate external or persisted JSON before using it.
- Never store auth secrets in FY JSON.
- Keep schemas versioned when shape changes can affect upgrades.

### Zod

Role:

- schema validation,
- user input validation,
- persisted state validation,
- slash-command payload validation,
- MCP payload validation.

Rules:

- Use Zod at trust boundaries: files, TUI commands, MCP calls, subprocess output.
- Do not replace TypeScript types with Zod everywhere; use Zod where runtime validation matters.

### Biome

Role:

- lint,
- formatting,
- import hygiene.

Rules:

- Add Biome when the repo needs consistent formatting/lint enforcement beyond `tsc`.
- Keep formatting-only changes separate when practical.
- CI should eventually run Biome before tests.

### c8

Role:

- coverage for critical runtime policies.

Rules:

- Use c8 for account isolation, context continuity, mode policy, config merge, and conflict-control paths.
- Do not chase coverage percentage without risk-based value.

### Shell Scripts

Examples:

- `ask-claude.sh`,
- `ask-gemini.sh`,
- demo helpers,
- eval helpers,
- build helpers.

Role:

- optional external model consultation,
- local demos,
- repeatable developer workflows.

Rules:

- Scripts are helpers, not the product core.
- Scripts must not mutate global Codex state.
- Scripts that call external services must make that side effect obvious.

### MCP SDK

Role:

- FY state server,
- memory server,
- wiki/docs server,
- trace server,
- code-intel server.

FY usage:

- Use MCP when FY needs structured tool surfaces that Codex agents can call.
- Keep MCP servers repo-local by default.
- Use MCP for state/memory/wiki/trace/code-intel only after file-backed contracts are clear.

Rules:

- MCP payloads must be schema-validated.
- MCP must not become a hidden global daemon requirement for basic FY use.

### tmux

Role:

- durable orchestrated mode runtime,
- visible agent panes,
- leader/agent layout,
- status/HUD surfaces,
- long-running task continuity.

FY usage:

- Orchestrated mode should show active agents through tmux panes or an equivalent TUI surface.
- tmux is required for the first durable multi-agent implementation unless another visible pane surface replaces it.

Rules:

- Do not require tmux for simple FY modes.
- Keep pane lifecycle explicit.
- Persist agent ownership and pane metadata under `.fy/orchestration/`.
- Verify pane identity before sending input.
- Distinguish agent panes from FY status/HUD panes.
- Use copy-mode, cooldown, dedupe, and per-pane cap guards for injection.

### Codex CLI

Role:

- actual AI execution engine,
- Codex TUI,
- Codex login,
- Codex exec when non-interactive automation is later needed.

FY usage:

- Launch Codex with repo-local `CODEX_HOME`.
- Inject FY config and instructions at launch.
- Preserve normal Codex capability unless a selected FY mode intentionally narrows behavior.

Rules:

- `src/runtime/codex.ts` remains the only module that spawns Codex.
- FY must not silently fall back to global Codex state.
- Use `codex login status` or a bounded smoke command to prove repo-local auth readiness; doctor/setup evidence alone is not enough.
- Built-in status line quota items can show live five-hour and weekly limits, but account picker allowance rows still need a safe metadata adapter.

## Reference From OMX, Adapt For FY

OMX has useful precedent in:

- skill Markdown layout,
- role prompt layout,
- state/memory/wiki/trace MCP surfaces,
- tmux team runtime,
- shell helper scripts,
- model/agent catalog manifests.

FY should adapt these patterns with narrower goals:

- TUI-first instead of CLI-first,
- repo-local account isolation by default,
- five FY modes instead of OMX workflow sprawl,
- simple modes that do not require tmux,
- orchestrated mode with visible panes and conflict control,
- documentation harness as a first-class mode.

## Feature-To-Tool Mapping

| Feature | Primary tools | Notes |
| --- | --- | --- |
| Repo-local account homes | TypeScript, JSON, TOML, Codex CLI | Never touch global Codex home. |
| Account picker | TypeScript, node-pty/TUI, Zod | Show safe allowance/reset metadata only. |
| Status bar | Codex config TOML, runtime config injection | Model, path, branch, context, allowance. |
| Context continuity | JSON, Markdown summaries, Zod | Store non-secret snapshots under `.fy/`. |
| Slash commands | Markdown, JSON, Zod, TUI layer | `/fy-*` commands route to domain modules. |
| Five modes | Markdown prompts, TypeScript policy, tests | Policy is code plus instructions, not prompt-only. |
| Documentation harness | Markdown, JSON manifests, optional MCP wiki | Produce durable docs. |
| Orchestrated mode | tmux, Codex CLI, JSON manifests, trace | Visible agents, ownership, conflict control. |
| Conflict control | JSON manifests, git diff parsing, tests | Same-region edits must escalate. |
| Quality gates | tsc, Node test runner, Biome, c8 | Add gates as implementation risk grows. |

## Adoption Order

1. Keep TypeScript, `tsc`, and Node test runner as the baseline.
2. Add Zod before expanding persisted `.fy/` state shapes.
3. Add `@iarna/toml` before complex Codex config merge behavior.
4. Add Biome once formatting/lint consistency becomes useful across modules.
5. Add c8 around account, mode, context, and orchestration policy tests.
6. Add tmux-backed orchestration only for Orchestrated Mode.
7. Add MCP surfaces after file-backed state contracts are stable.
