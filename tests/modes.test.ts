import test from "node:test";
import assert from "node:assert/strict";
import { getModePolicy, isFyMode, listModePolicies } from "../src/modes/policies.js";

test("lists the five documented operating modes", () => {
  assert.deepEqual(
    listModePolicies().map((policy) => policy.mode).sort(),
    ["docs-harness", "fast-edit", "implementation", "orchestrated", "read-only"],
  );
});

test("read-only mode forbids edits", () => {
  const policy = getModePolicy("read-only");
  assert.equal(policy.edits, "forbidden");
  assert.equal(policy.verification, "evidence-only");
});

test("orchestrated mode requires ownership-capable orchestration", () => {
  const policy = getModePolicy("orchestrated");
  assert.equal(policy.planning, "required");
  assert.equal(policy.parallelAgents, "allowed");
  assert.equal(policy.tmux, "required-when-multi-agent");
});

test("mode validation rejects unknown strings", () => {
  assert.equal(isFyMode("implementation"), true);
  assert.equal(isFyMode("omx"), false);
});
