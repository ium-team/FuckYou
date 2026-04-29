# Engineering Decisions

## 001: TypeScript First

FY starts in TypeScript because the first product risk is workflow shape, not native performance.

Rust can be added later for a fast sidecar if FY needs repo indexing, sandboxed command execution, or heavy local scanning.

## 002: Repo-Local Codex Homes

FY does not use global `~/.codex` for FY launches.

Reason:

- accounts should be isolated per repository,
- the same repository should support multiple saved Codex accounts,
- normal Codex usage should remain untouched.

## 003: Mode Policy Is Product Behavior

Modes are not only prompt text. They control approval posture, loop limits, verification level, output style, and token posture.

This keeps FY from becoming a pile of prompts with unclear runtime behavior.

## 004: Default Lightweight Posture

FY should be lighter than OMX by default.

Strong orchestration can exist later, but the default user path should stay close to plain Codex plus explicit operating policy.

## 005: FY Config Is Injected At Launch

FY uses Codex `-c` overrides for runtime behavior such as `model_instructions_file` and `tui.status_line`.

Reason:

- no global config mutation,
- predictable per-launch behavior,
- easy user override through explicit Codex args.
