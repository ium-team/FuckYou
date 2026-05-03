# State Schema

This document defines the target `.fy/` storage contract. JSON examples are illustrative and should become Zod schemas before implementation expands these shapes.

## Directory Layout

```text
.fy/
  project.json
  state.json
  tui-state.json
  instructions.md
  codex-homes/
    <account>/
      config.toml
  context-snapshots/
    <snapshot-id>/
      manifest.json
      summary.md
      handoff.md
  orchestration/
    runs/
      <run-id>/
        manifest.json
        agents.json
        ownership.json
        conflicts.json
        trace.jsonl
  metrics.json
```

Auth secrets must remain only inside the matching repo-local Codex home managed by Codex itself.

## `.fy/project.json`

Purpose:

- repository-local account registry,
- bootstrap version,
- last selected account,
- safe account metadata cache.

Shape:

```json
{
  "schemaVersion": 1,
  "projectId": "fy-generated-id",
  "createdAt": "2026-05-03T00:00:00.000Z",
  "updatedAt": "2026-05-03T00:00:00.000Z",
  "defaultAccount": "work",
  "lastAccount": "work",
  "accounts": {
    "work": {
      "name": "work",
      "codexHome": ".fy/codex-homes/work",
      "createdAt": "2026-05-03T00:00:00.000Z",
      "lastUsedAt": "2026-05-03T00:00:00.000Z",
      "authStatus": "unknown",
      "allowance": {
        "status": "unknown",
        "remainingPercent": null,
        "resetAt": null,
        "source": "codex-metadata"
      }
    }
  }
}
```

Rules:

- `codexHome` must resolve inside `.fy/codex-homes/`.
- `authStatus` is metadata only: `ready`, `logged-out`, `unknown`, or `error`.
- `allowance` must not contain token secrets.

## `.fy/state.json`

Purpose:

- active mode,
- current session metadata,
- context and allowance policy state,
- last run summary.

Shape:

```json
{
  "schemaVersion": 1,
  "activeMode": "implementation",
  "activeAccount": "work",
  "activeSession": {
    "id": "session-id",
    "startedAt": "2026-05-03T00:00:00.000Z",
    "model": "gpt-5.5",
    "repoPath": "/abs/path/to/repo",
    "branch": "main"
  },
  "context": {
    "usagePercent": 42,
    "warningThresholdPercent": 70,
    "lastSnapshotId": null
  },
  "allowance": {
    "remainingPercent": 74,
    "warningThresholdPercent": 10,
    "resetAt": "2026-05-03T09:00:00.000Z",
    "lastCheckedAt": "2026-05-03T00:00:00.000Z"
  },
  "lastRun": {
    "status": "idle",
    "mode": "implementation",
    "finishedAt": null,
    "summary": null
  }
}
```

Rules:

- Unknown numeric metadata is `null`, not guessed.
- State must be recoverable if allowance metadata is unavailable.
- Mode ids must match `mode-policy-matrix.md`.

## `.fy/metrics.json`

Purpose:

- turn counts,
- token counts when available,
- last activity,
- status/HUD summaries.

Shape:

```json
{
  "schemaVersion": 1,
  "totalTurns": 12,
  "sessionTurns": 4,
  "lastActivity": "2026-05-03T00:00:00.000Z",
  "sessionInputTokens": 12000,
  "sessionOutputTokens": 3000,
  "sessionTotalTokens": 15000
}
```

Rules:

- Metrics are advisory status data.
- Missing metrics must not block launch.
- Account allowance/reset metadata belongs in account/status adapters, not token secrets.

## `.fy/tui-state.json`

Purpose:

- last TUI choices,
- palette state,
- non-critical layout preferences.

Shape:

```json
{
  "schemaVersion": 1,
  "lastScreen": "account-picker",
  "lastSelectedCommand": "/fy-mode",
  "statusLine": {
    "enabled": true,
    "compact": true
  },
  "orchestrationLayout": {
    "preferred": "leader-grid"
  }
}
```

Rules:

- TUI state must be disposable.
- Product behavior cannot depend only on `tui-state.json`.

## Context Snapshot Manifest

Path:

```text
.fy/context-snapshots/<snapshot-id>/manifest.json
```

Shape:

```json
{
  "schemaVersion": 1,
  "id": "snapshot-id",
  "createdAt": "2026-05-03T00:00:00.000Z",
  "sourceAccount": "work",
  "sourceSessionId": "session-id",
  "mode": "implementation",
  "reason": "low-allowance-continuation",
  "files": {
    "summary": "summary.md",
    "handoff": "handoff.md"
  },
  "restore": {
    "targetAccount": null,
    "status": "pending"
  }
}
```

Rules:

- `summary.md` contains task state.
- `handoff.md` contains continuation instructions.
- Neither file may contain auth secrets.

## Orchestration Manifest

Path:

```text
.fy/orchestration/runs/<run-id>/manifest.json
```

Shape:

```json
{
  "schemaVersion": 1,
  "runId": "run-id",
  "mode": "orchestrated",
  "status": "running",
  "startedAt": "2026-05-03T00:00:00.000Z",
  "leaderAgentId": "leader",
  "tmux": {
    "session": "fy-run-id",
    "layout": "leader-grid"
  },
  "stopCondition": "verified-complete"
}
```

Rules:

- Orchestration state is required before starting worker panes.
- Status values: `planning`, `running`, `integrating`, `blocked`, `failed`, `complete`, `cancelled`.
- Pane ids must be persisted before FY sends input to worker panes.
- Write operations to shared state must be serialized or atomic.

## Agent Ownership

Path:

```text
.fy/orchestration/runs/<run-id>/ownership.json
```

Shape:

```json
{
  "schemaVersion": 1,
  "files": {
    "src/accounts/store.ts": {
      "ownerAgentId": "executor-1",
      "mode": "write",
      "regions": [
        { "startLine": 1, "endLine": 120 }
      ]
    },
    "docs/architecture.md": {
      "ownerAgentId": "writer-1",
      "mode": "write",
      "regions": []
    }
  }
}
```

Rules:

- Read-only agents must be marked read-only.
- Same-file write ownership is allowed only with non-overlapping regions or explicit leader approval.
