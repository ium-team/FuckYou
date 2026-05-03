import test from "node:test";
import assert from "node:assert/strict";
import { createRunPlan } from "../src/runtime/plan.js";

test("fast-edit mode skips the explicit planning phase", () => {
  const plan = createRunPlan("fix typo", "fast-edit");
  assert.deepEqual(plan.phases, ["execute", "verify"]);
  assert.equal(plan.implemented, false);
});

test("implementation mode includes planning before execution", () => {
  const plan = createRunPlan("redesign settings panel", "implementation");
  assert.deepEqual(plan.phases, ["plan", "execute", "verify"]);
  assert.equal(plan.policy.approval, "material-ambiguity");
});
