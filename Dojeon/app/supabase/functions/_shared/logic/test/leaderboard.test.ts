import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSquadLeaderboard } from "../leaderboard.ts";

test("ranks a single squad's members by blended consistency + completion", () => {
  const ranked = computeSquadLeaderboard([
    { userId: "a", confirmedCheckins: 9, scheduledCheckins: 10, milestonesCompleted: 4, milestonesTotal: 5 },
    { userId: "b", confirmedCheckins: 5, scheduledCheckins: 10, milestonesCompleted: 2, milestonesTotal: 5 },
    { userId: "c", confirmedCheckins: 10, scheduledCheckins: 10, milestonesCompleted: 5, milestonesTotal: 5 },
  ]);
  assert.equal(ranked[0].userId, "c");
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].userId, "a");
  assert.equal(ranked[2].userId, "b");
  assert.equal(ranked[2].rank, 3);
});

test("handles a member with no scheduled check-ins yet without dividing by zero", () => {
  const ranked = computeSquadLeaderboard([
    { userId: "new", confirmedCheckins: 0, scheduledCheckins: 0, milestonesCompleted: 0, milestonesTotal: 0 },
  ]);
  assert.equal(ranked[0].score, 0);
});

test("weights are configurable", () => {
  const members = [
    { userId: "consistent", confirmedCheckins: 10, scheduledCheckins: 10, milestonesCompleted: 0, milestonesTotal: 5 },
    { userId: "productive", confirmedCheckins: 0, scheduledCheckins: 10, milestonesCompleted: 5, milestonesTotal: 5 },
  ];
  const consistencyFirst = computeSquadLeaderboard(members, { consistency: 1, completion: 0 });
  assert.equal(consistencyFirst[0].userId, "consistent");
  const completionFirst = computeSquadLeaderboard(members, { consistency: 0, completion: 1 });
  assert.equal(completionFirst[0].userId, "productive");
});
