import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyEvent, countsAgainstMinimumTier, excludedFromStreak } from "../history.ts";

test("classifies a fully completed, proven day", () => {
  const e = classifyEvent({ taskCompleted: true, evidenceSubmitted: true, plannedRest: false, technicalInterruption: false });
  assert.equal(e, "completed");
});

test("classifies completed-but-unproven as its own bucket, not a miss", () => {
  const e = classifyEvent({ taskCompleted: true, evidenceSubmitted: false, plannedRest: false, technicalInterruption: false });
  assert.equal(e, "unproven");
  assert.equal(countsAgainstMinimumTier(e), false);
});

test("classifies planned rest, excluded from streak and miss counts", () => {
  const e = classifyEvent({ taskCompleted: false, evidenceSubmitted: false, plannedRest: true, technicalInterruption: false });
  assert.equal(e, "rest");
  assert.equal(countsAgainstMinimumTier(e), false);
  assert.equal(excludedFromStreak(e), true);
});

test("classifies a technical interruption, doesn't count against Minimum", () => {
  const e = classifyEvent({ taskCompleted: false, evidenceSubmitted: false, plannedRest: false, technicalInterruption: true });
  assert.equal(e, "interrupted");
  assert.equal(countsAgainstMinimumTier(e), false);
});

test("classifies a genuine miss", () => {
  const e = classifyEvent({ taskCompleted: false, evidenceSubmitted: false, plannedRest: false, technicalInterruption: false });
  assert.equal(e, "miss");
  assert.equal(countsAgainstMinimumTier(e), true);
});

test("rest takes precedence over every other flag", () => {
  const e = classifyEvent({ taskCompleted: true, evidenceSubmitted: true, plannedRest: true, technicalInterruption: true });
  assert.equal(e, "rest");
});
