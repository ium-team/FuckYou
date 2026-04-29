import test from "node:test";
import assert from "node:assert/strict";
import { getModePolicy, isFyMode, listModePolicies } from "../src/modes/policies.js";

test("lists the four core operating modes", () => {
  assert.deepEqual(
    listModePolicies().map((policy) => policy.mode).sort(),
    ["auto", "budget", "fast", "manual"],
  );
});

test("budget mode is explicitly low-token", () => {
  const policy = getModePolicy("budget");
  assert.equal(policy.tokenPosture, "low");
  assert.equal(policy.outputStyle, "minimal");
  assert.equal(policy.maxLoops > getModePolicy("fast").maxLoops, true);
});

test("mode validation rejects unknown strings", () => {
  assert.equal(isFyMode("manual"), true);
  assert.equal(isFyMode("omx"), false);
});
