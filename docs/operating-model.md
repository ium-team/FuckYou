# Operating Model

FY has four first-class modes.

## Manual

Use for frontend, UX, product ambiguity, and high-taste decisions.

Behavior:

- ask before large changes,
- keep edits narrow,
- show short reasoning,
- stop at natural review points.

## Auto

Use when the user wants less involvement.

Behavior:

- plan briefly,
- execute without repeated confirmation,
- run basic verification,
- stop on guardrail violation or repeated failure.

## Budget

Use when token cost matters more than speed.

Behavior:

- small context windows,
- short outputs,
- one narrow action per turn,
- summarize instead of expanding.

## Fast

Use for obvious, low-risk work.

Behavior:

- skip ceremony,
- implement directly,
- verify only the relevant surface,
- report in a few lines.

## Guardrails

Every mode must respect:

- file scope when provided,
- loop limits,
- dangerous command policy,
- verification requirements,
- final summary contract.
