import test from "node:test";
import assert from "node:assert/strict";
import { createRunPlan } from "../src/runtime/plan.js";

test("fast mode skips the explicit planning phase", () => {
  const plan = createRunPlan("fix typo", "fast");
  assert.deepEqual(plan.phases, ["execute", "verify"]);
  assert.equal(plan.implemented, false);
});

test("manual mode includes planning before execution", () => {
  const plan = createRunPlan("redesign settings panel", "manual");
  assert.deepEqual(plan.phases, ["plan", "execute", "verify"]);
  assert.equal(plan.policy.approval, "frequent");
});
