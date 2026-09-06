import { test } from "node:test";
import assert from "node:assert/strict";
import { findMatches, similarityScore } from "../soloMatch.ts";

test("identical goal type and pace scores highest", () => {
  const a = { userId: "a", goalType: "fitness", hoursPerDay: 2, deadlineDays: 30 };
  const b = { userId: "b", goalType: "fitness", hoursPerDay: 2, deadlineDays: 30 };
  assert.equal(similarityScore(a, b), 1);
});

test("different goal type scores lower than same type, same pace", () => {
  const a = { userId: "a", goalType: "fitness", hoursPerDay: 2, deadlineDays: 30 };
  const b = { userId: "b", goalType: "coding", hoursPerDay: 2, deadlineDays: 30 };
  assert.ok(similarityScore(a, b) < 1);
});

test("findMatches excludes the user themself and ranks descending", () => {
  const user = { userId: "me", goalType: "coding", hoursPerDay: 3, deadlineDays: 30 };
  const candidates = [
    user,
    { userId: "close", goalType: "coding", hoursPerDay: 3, deadlineDays: 28 },
    { userId: "far", goalType: "art", hoursPerDay: 0.5, deadlineDays: 5 },
  ];
  const matches = findMatches(user, candidates);
  assert.equal(matches.find((m) => m.userId === "me"), undefined);
  assert.equal(matches[0].userId, "close");
});
