import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAdjustment, detectRepeatedMinimumOnly, hasRecoveryRoom, proposeAdjustment } from "../adjust.ts";

test("recovery room found -> no tradeoffs, no approval needed", () => {
  assert.equal(hasRecoveryRoom({ remainingWorkHours: 20, remainingDays: 15, hoursAvailablePerDay: 2 }), true);
  const proposal = proposeAdjustment({ remainingWorkHours: 20, remainingDays: 15, hoursAvailablePerDay: 2 });
  assert.equal(proposal.recoveryRoomFound, true);
  assert.equal(proposal.tradeoffs.length, 0);
  assert.equal(proposal.requiresApproval, false);
});

test("no recovery room -> real tradeoffs, approval required", () => {
  const proposal = proposeAdjustment({ remainingWorkHours: 100, remainingDays: 5, hoursAvailablePerDay: 2 });
  assert.equal(proposal.recoveryRoomFound, false);
  assert.equal(proposal.requiresApproval, true);
  assert.ok(proposal.tradeoffs.some((t) => t.kind === "extend_deadline"));
  assert.ok(proposal.tradeoffs.some((t) => t.kind === "cut_scope"));
});

test("applyAdjustment only mutates the mission when approved, keeps both versions", () => {
  const original = { deadlineDays: 10 };
  const revised = { deadlineDays: 15 };

  const approvedResult = applyAdjustment(original, revised, true);
  assert.deepEqual(approvedResult.activeMission, revised);
  assert.deepEqual(approvedResult.record.original, original);
  assert.deepEqual(approvedResult.record.proposedRevision, revised);
  assert.equal(approvedResult.record.approved, true);

  const rejectedResult = applyAdjustment(original, revised, false);
  assert.deepEqual(rejectedResult.activeMission, original); // rejected -> mission unchanged
  assert.deepEqual(rejectedResult.record.proposedRevision, revised); // but the proposal is still on record
  assert.equal(rejectedResult.record.approved, false);
});

test("detectRepeatedMinimumOnly triggers a full review after 3 Minimum-only days in the recent window", () => {
  assert.equal(detectRepeatedMinimumOnly(["target", "minimum", "minimum", "minimum"]), true);
  assert.equal(detectRepeatedMinimumOnly(["target", "minimum", "target", "minimum"]), false);
});

test("detectRepeatedMinimumOnly only looks at the recent window, not the whole mission history", () => {
  // 3 Minimum-only days happened, but they've since scrolled out of the
  // last-5 window -- an old rough patch shouldn't force a review forever.
  const longHistory = ["minimum", "minimum", "minimum", "target", "target", "target", "target"];
  assert.equal(detectRepeatedMinimumOnly(longHistory, 5), false); // last 5: only 1 minimum
});
