# Orchestration Spec

This document defines FY's target Orchestrated Mode.

Orchestration is for deep autonomous delivery. Simple modes must not require tmux, MCP, or multi-agent setup.

## Goals

Orchestrated Mode should:

- plan work,
- split roles,
- show active agents,
- preserve task ownership,
- manage parallel edits,
- detect conflicts,
- integrate outputs,
- verify before final completion.

## Runtime Shape

Required components:

- leader,
- one or more role agents,
- tmux pane metadata when multi-agent execution is active,
- ownership manifest,
- conflict manifest,
- trace log.

tmux safety components:

- pane resolver,
- HUD/status pane detector,
- shell-pane detector,
- copy-mode guard,
- injection dedupe key,
- cooldown and per-pane injection cap,
- leader pane protection during cleanup.

Minimum roles:

- `leader`: owns plan, delegation, integration, final report.
- `explorer`: read-only repo lookup.
- `executor`: implementation owner for assigned files.
- `verifier`: tests, review evidence, completion validation.

Optional roles:

- `writer`: docs and harness output.
- `reviewer`: code review.
- `researcher`: external official docs lookup.
- `designer`: UX/UI review.

## Lifecycle

1. Intake
2. Plan
3. Assign ownership
4. Start panes
5. Execute lanes
6. Detect conflicts
7. Integrate
8. Verify
9. Fix loop if needed
10. Complete, fail, block, or cancel

Status values:

- `planning`,
- `running`,
- `integrating`,
- `blocked`,
- `failed`,
- `complete`,
- `cancelled`.

## tmux Layout

Default layout:

```text
leader | explorer
executor | verifier
```

For more than four agents:

- leader stays visible,
- active writer/reviewer/researcher panes can be added to the right or bottom,
- layout metadata is persisted under `.fy/orchestration/runs/<run-id>/manifest.json`.

Pane title format:

```text
fy:<run-id>:<role>:<agent-id>
```

Pane identity rules:

- Persist every pane id in orchestration state.
- Verify that a pane is running an agent process before sending input.
- Never treat a HUD/status pane as a worker.
- Never target the leader pane during worker cleanup.
- If pane identity is ambiguous, pause orchestration and report `pane_not_verified`.

## Ownership Rules

Before write work starts, the leader must create ownership metadata.

Ownership types:

- `read`: agent may inspect only,
- `write-file`: agent owns an entire file,
- `write-region`: agent owns specific line ranges,
- `test-only`: agent may edit tests only,
- `docs-only`: agent may edit docs only.

Rules:

- Same-file write ownership is allowed only with non-overlapping regions.
- Unknown overlap must be treated as a conflict.
- Shared config files require leader approval.
- Generated artifacts must be marked as generated or owned by the creating agent.

## Conflict Detection

Conflict detection should compare:

- ownership manifest,
- git diff,
- file paths,
- line regions,
- shared state files,
- generated output paths.

Conflict levels:

- `none`: no overlap,
- `file-overlap`: same file, unknown or broad regions,
- `region-overlap`: same line range,
- `state-overlap`: shared `.fy/` state or config,
- `semantic-risk`: separate files but likely incompatible behavior.

Handling:

- `file-overlap`: leader review required before integration,
- `region-overlap`: block automatic integration,
- `state-overlap`: serialize writes,
- `semantic-risk`: verifier or reviewer must inspect.

OMX has worktree and rebase/cherry-pick conflict precedent. FY should start with ownership plus same-worktree diff checks, then add worktree isolation for broad parallel implementation after the ownership model is proven.

## Agent Communication

Agents report:

- status,
- files touched,
- tests run,
- blockers,
- recommended handoff,
- completion evidence.

Agents must not:

- rewrite the global plan,
- expand their write scope silently,
- revert unrelated changes,
- modify another agent's owned region.

## Trace

Trace events should be JSON lines:

```json
{"time":"2026-05-03T00:00:00.000Z","type":"agent-started","agentId":"executor-1","role":"executor"}
```

Required event types:

- `run-started`,
- `plan-created`,
- `ownership-assigned`,
- `agent-started`,
- `agent-status`,
- `file-changed`,
- `conflict-detected`,
- `integration-started`,
- `verification-ran`,
- `run-completed`,
- `run-failed`,
- `run-cancelled`.

## Stop Conditions

Complete when:

- requested behavior is implemented,
- conflicts are resolved,
- verification passes or known gaps are reported,
- final summary is written.

Block when:

- required account authority is missing,
- destructive action needs user approval,
- same-region conflict cannot be resolved safely,
- Codex/tmux runtime is unavailable for a required orchestration action.

Fail when:

- repeated verification loops cannot converge,
- required runtime primitives are unavailable and no fallback exists,
- state corruption cannot be safely recovered.
