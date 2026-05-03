# FY Engineering Philosophy

This document defines philosophy for building FY itself, not for FY end users.

## Core Principle

Match implementation weight to product risk.

FY should stay explicit in behavior and scalable in orchestration depth as product needs mature.
The user-facing target is TUI-first; command-line entrypoints are support surfaces, not the main product experience.

## Why FY Exists

Large AI harnesses can become operationally heavy for everyday work.
Plain AI sessions can be too unconstrained for consistent outcomes.

FY sits in the middle:

- predictable runtime policy,
- repo-local isolation,
- TUI-visible account, context, and token state,
- structured execution for complex tasks,
- stronger control available through incremental capability growth.

## Implementation Priorities

1. Preserve repo-local isolation.
2. Keep the TUI as the primary user workflow for FY-specific account, context, mode, and slash-command features.
3. Keep mode policy as code-level behavior, not prompt-only text.
4. Keep launch behavior explicit and testable.
5. Keep CLI commands stable and move operational logic to domain modules.
6. Prefer predictable orchestration growth over ad-hoc complexity when tradeoffs arise.

## Non-Goals

- FY is not a global Codex configuration manager.
- FY is not a hidden automation layer with implicit side effects.

## Success Criteria For Engineering

FY development is successful when:

- behavior is covered by focused tests,
- global Codex state remains untouched,
- repo-local account contracts are preserved,
- orchestration behavior remains explicit and contract-tested.
