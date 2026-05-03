# Mode Policy Matrix

This document defines the target policy behavior for FY's five modes.

Mode ids are stable internal ids. User-facing names can change later.

| Mode id | Purpose | Edits | Planning | Questions | Verification | Parallel agents | tmux |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `orchestrated` | Deep autonomous delivery | Allowed | Required | Only for blockers | Thorough | Allowed by default | Required when multi-agent |
| `fast-edit` | Small exact edits | Allowed | Minimal | Avoid unless blocked | Minimal, escalate on failure | Not by default | No |
| `read-only` | Explain, research, plan | Forbidden | Allowed | Allowed | Evidence checks only | Read-only only | No |
| `implementation` | Normal development | Allowed | Brief | Ask for material ambiguity | Targeted tests/checks | Optional, uncommon | No by default |
| `docs-harness` | Docs and harness | Docs allowed | Required for harness | Ask then default-fill | Markdown/schema checks | Optional writer/reviewer split | No by default |

## Common Guardrails

Every mode must respect:

- repo-local account isolation,
- no global Codex fallback,
- no auth secret reads,
- context warning policy,
- allowance warning policy,
- file scope constraints,
- dangerous command policy,
- final evidence summary.

## `orchestrated`

Use when:

- the task is broad,
- quality matters more than speed,
- role splitting improves output,
- verification needs multiple passes.

Policy:

- Write a plan before implementation.
- Assign agent roles and file ownership before parallel edits.
- Show active agents when multi-agent execution starts.
- Run review and verification before final completion.
- Stop only when complete, blocked, failed, cancelled, or user interrupts.

Failure behavior:

- Recover from individual worker failure if another lane can continue.
- Escalate same-region edit conflicts to the leader.
- If verification fails, loop through fix and verify until stop condition.

## `fast-edit`

Use when:

- the user request is narrow and concrete,
- expected edit is small,
- broad repo analysis would add little value.

Policy:

- No long plan.
- Edit directly.
- Run only the smallest useful check.
- If the edit triggers errors, switch to targeted debugging and verification.

Failure behavior:

- If scope expands beyond a small edit, recommend `implementation`.
- If ambiguity changes behavior materially, ask one concise question.

## `read-only`

Use when:

- the user asks for explanation,
- the user asks for analysis,
- the user asks for planning only,
- the task involves external research without implementation.

Policy:

- Do not modify source files.
- Do not run implementation workflows.
- May create an explicit plan artifact only when the user requests a plan document.
- Must separate evidence from inference.

Failure behavior:

- If the user asks for edits mid-session, switch modes explicitly before editing.

## `implementation`

Use when:

- the user wants code changes,
- orchestration is not needed,
- the task is a normal development request.

Policy:

- Gather enough context.
- Edit relevant files.
- Run targeted verification.
- Broaden verification if shared contracts are touched.
- Report changed files and test evidence.

Failure behavior:

- If work becomes broad or multi-lane, recommend or switch to `orchestrated` depending on user intent.
- If tests fail, fix and rerun targeted checks.

## `docs-harness`

Use when:

- the user wants project docs,
- the user wants a recommended document harness,
- the user wants ideas converted into durable specs.

Policy:

- Prefer Markdown outputs.
- For harness setup, create a predictable document set.
- Ask for missing important information.
- If the user cannot answer, fill reasonable defaults and mark assumptions.
- May read code to document reality.

Failure behavior:

- If requested docs require implementation facts that do not exist, mark them as proposed.
- If docs and code disagree, call out the discrepancy.

## Verification Levels

Minimal:

- syntax/type check when touched surface requires it,
- no broad test suite unless risk appears.

Targeted:

- tests for changed behavior,
- typecheck/build when TypeScript contracts change.

Thorough:

- targeted tests,
- build/typecheck,
- relevant integration checks,
- review pass,
- conflict-control check for parallel work.

Evidence-only:

- cite files, lines, docs, commands, or external sources used for the explanation.
