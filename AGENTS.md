# AGENTS.md

This file defines how agents should work in this repository (`fy/`).

## Scope

These instructions apply to the entire `fy/` tree.

## First Reads

Before non-trivial changes, read:

1. `docs/README.md`
2. `docs/agent-guide.md`
3. `docs/architecture.md`
4. `docs/code-map.md`
5. `docs/repo-local-codex.md`
6. `docs/testing.md`

## Product Direction

FY is an extensible operating layer around Codex.
Design choices should keep room for deeper orchestration as FY evolves.

Preserve these constraints:

- Keep behavior repo-local by default.
- Keep global `~/.codex` untouched by FY commands.
- Keep mode policy as explicit runtime behavior.
- Keep CLI as a stable entrypoint and place operational logic in domain modules.

## Repo-Local Codex Contract

FY launches must use repo-local account homes:

```text
.fy/codex-homes/<account>
```

Every Codex launch through FY must set:

```bash
CODEX_HOME="$PROJECT/.fy/codex-homes/<account>"
```

Do not:

- copy credentials from global Codex home,
- symlink repo-local auth to global auth,
- store auth secrets in `.fy/project.json`,
- silently fall back to `~/.codex` for FY launches.

## Editing Rules

- Keep changes small and contract-focused.
- Reuse existing modules before introducing new abstractions.
- Update `docs/` when architecture/contracts change.
- Update user-facing docs only when user-facing behavior changes.

## Testing Rules

After code changes, run:

```bash
npm test
```

For launch behavior tests:

- use fake `spawn`,
- do not require real Codex login,
- do not start real TUI in automated tests.
