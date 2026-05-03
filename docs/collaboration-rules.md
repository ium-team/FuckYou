# FY Collaboration Rules

This document defines the default collaboration workflow for this repository.

## Scope

- Applies to all contributors for changes in `fy/`.
- If a stricter rule exists in `AGENTS.md`, follow that rule first.

## Branch Strategy

- Protected branch: `main`
- Do not push direct commits to `main` except emergency hotfixes approved by maintainers.
- All normal work must be done in feature branches and merged via Pull Request.

### Branch Naming

Use one of these prefixes:

- `feat/<short-topic>`
- `fix/<short-topic>`
- `docs/<short-topic>`
- `refactor/<short-topic>`
- `test/<short-topic>`
- `chore/<short-topic>`

Examples:

- `feat/account-picker`
- `fix/codex-home-resolution`
- `docs/contribution-rules`

## Commit Rules

### 1) Keep commits small and atomic

- One logical change per commit.
- Avoid mixing refactor and feature behavior in one commit.
- Keep formatting-only changes in a separate commit when practical.

### 2) Commit message format

Use this format:

```text
<type>(<scope>): <subject>
```

Allowed `type` values:

- `feat`
- `fix`
- `refactor`
- `docs`
- `test`
- `chore`
- `perf`
- `ci`
- `build`
- `revert`

Scope rules:

- Scope is recommended and should map to a module (example: `accounts`, `runtime`, `modes`, `state`, `cli`, `tests`, `docs`).
- Scope may be omitted for repo-wide or administrative commits.

Examples:

- `feat(accounts): add interactive account picker`
- `fix(runtime): prevent CODEX_HOME fallback`
- `docs(readme): explain repo-local account contract`

### 3) Subject line rules

- Prefer 50 characters or less.
- Use imperative, present-tense wording (`add`, `fix`, `remove`).
- Do not end with a period.
- Avoid vague subjects such as `update stuff`.

### 4) Body rules (when needed)

Add a body when context is not obvious.

Focus on:

- why the change is needed,
- constraints or tradeoffs,
- behavior impact and compatibility notes.

Formatting guidance:

- Wrap body lines around 72 characters when practical.

### 5) Breaking change rules

For incompatible behavior changes, include a footer:

```text
BREAKING CHANGE: <what changed and how to migrate>
```

- Describe the concrete impact.
- Provide migration guidance if user or maintainer action is required.

### 6) Issue linking rules

When related issues exist, include one of:

- `Refs #<id>` for related work.
- `Closes #<id>` when the commit resolves the issue.

### 7) Prohibited commit messages

Do not use non-informative messages such as:

- `WIP`
- `temp`
- `asdf`
- `fix`

## Pull Request Rules

### PR creation

Each PR should include:

- clear problem statement,
- concise solution summary,
- test evidence (`npm test` output summary),
- risk or rollback notes if behavior changes.

### PR size

- Prefer PRs under ~400 lines changed when practical.
- Split large work into stacked PRs when possible.

### Required checks before merge

Run locally before requesting review:

```bash
npm test
```

For behavior changes, include or update tests in `tests/`.

### Review expectations

- At least one maintainer approval before merge.
- Address all blocking review comments.
- Do not resolve comments without code or rationale.

## Merge Rules

- Default merge method: **Squash and merge**.
- PR title should be clean because it becomes the commit headline.
- Delete source branch after merge unless it is intentionally long-lived.

### When rebase is required

Rebase on `main` before merge when:

- merge conflicts exist,
- checks fail due to stale base,
- reviewers request a clean linear history.

## Issue Rules

Create an issue before non-trivial work unless the task is an obvious typo/docs micro-fix.

Each issue should include:

- problem/background,
- expected behavior,
- current behavior (if bug),
- acceptance criteria,
- scope notes (in or out of scope).

### Labels (recommended baseline)

- `type:feature`
- `type:bug`
- `type:docs`
- `type:refactor`
- `priority:p0` / `priority:p1` / `priority:p2`
- `status:blocked` / `status:in-progress` / `status:ready`

## Hotfix Path

For production-blocking urgent fixes:

1. Create `hotfix/<short-topic>` from `main`.
2. Keep diff minimal and focused.
3. Run `npm test`.
4. Open expedited PR and merge after fast review.
5. Document incident context in issue or PR notes.

## Definition of Done

A change is done when all are true:

- code is merged to `main` via PR,
- required review is complete,
- tests pass (`npm test`),
- docs updated if user-facing behavior changed.
