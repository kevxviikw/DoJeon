import { test } from "node:test";
import assert from "node:assert/strict";
import { collectMissionEndData, disbandSquad } from "../missionEnd.ts";

test("no consent -> nothing is collected", () => {
  const result = collectMissionEndData({
    consent: false,
    confirmedCheckins: 20,
    scheduledCheckins: 20,
    milestonesCompleted: 5,
    milestonesTotal: 5,
  });
  assert.equal(result, null);
});

test("with consent -> achievement and consistency scores are computed", () => {
  const result = collectMissionEndData({
    consent: true,
    confirmedCheckins: 18,
    scheduledCheckins: 20,
    milestonesCompleted: 4,
    milestonesTotal: 5,
    patternNotes: { mostMissedDay: "Monday" },
  });
  assert.ok(result);
  assert.equal(result!.consented, true);
  assert.equal(result!.achievementScore, 0.8);
  assert.equal(result!.consistencyScore, 0.9);
  assert.deepEqual(result!.patternData, { mostMissedDay: "Monday" });
});

test("disbandSquad marks the squad disbanded and mission completed", () => {
  const result = disbandSquad(new Date("2026-10-01T00:00:00Z"));
  assert.equal(result.squadStatus, "disbanded");
  assert.equal(result.missionStatus, "completed");
});
