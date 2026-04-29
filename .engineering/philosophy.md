# FY Engineering Philosophy

This document defines philosophy for building FY itself, not for FY end users.

## Core Principle

Match implementation weight to product risk.

FY should stay lightweight by default and explicit in behavior. Add complexity only when it protects a clear product contract.

## Why FY Exists

Large AI harnesses can become operationally heavy for everyday work.
Plain AI sessions can be too unconstrained for consistent outcomes.

FY sits in the middle:

- predictable runtime policy,
- repo-local isolation,
- minimal ceremony for small tasks,
- stronger control only when explicitly requested.

## Implementation Priorities

1. Preserve repo-local isolation.
2. Keep mode policy as code-level behavior, not prompt-only text.
3. Keep launch behavior explicit and testable.
4. Keep CLI commands thin and move logic to domain modules.
5. Keep defaults cheap in token and workflow overhead.

## Non-Goals

- FY is not a full orchestration platform by default.
- FY is not a global Codex configuration manager.
- FY is not a hidden automation layer with implicit side effects.

## Success Criteria For Engineering

FY development is successful when:

- behavior is covered by focused tests,
- global Codex state remains untouched,
- repo-local account contracts are preserved,
- new features do not add mandatory ceremony for common tasks.
