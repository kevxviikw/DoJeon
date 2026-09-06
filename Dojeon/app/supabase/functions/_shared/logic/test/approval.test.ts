import { test } from "node:test";
import assert from "node:assert/strict";
import { requiredApprovalCount, tallyApproval } from "../approval.ts";

test("75% of a 4-person squad confirms at exactly 3 approvals", () => {
  const result = tallyApproval([true, true, true, false], 4);
  assert.equal(result.approvalRate, 0.75);
  assert.equal(result.confirmed, true);
});

test("below 75% does not confirm", () => {
  const result = tallyApproval([true, true, false, false], 4);
  assert.equal(result.confirmed, false);
});

test("adjustable threshold: a squad can set its own bar", () => {
  const result = tallyApproval([true, false, false, false], 4, 0.25);
  assert.equal(result.confirmed, true);
});

test("requiredApprovalCount rounds up (5-person squad at 75% needs 4, not 3.75)", () => {
  assert.equal(requiredApprovalCount(5, 0.75), 4);
  assert.equal(requiredApprovalCount(4, 0.75), 3);
  assert.equal(requiredApprovalCount(6, 0.75), 5);
});

test("tallyApproval refuses a squad with no eligible voters", () => {
  assert.throws(() => tallyApproval([], 0));
});
