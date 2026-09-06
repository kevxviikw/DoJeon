import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canJoinLiveSession,
  InvalidSessionTransition,
  recordBlocker,
  startSession,
  submitOutput,
  summarizeSquadActivity,
} from "../push.ts";

test("startSession requires a task", () => {
  assert.throws(() => startSession("", "a doc"));
});

test("session lifecycle: start -> submit", () => {
  const s = startSession("Draft case study", "a PDF");
  assert.equal(s.status, "active");
  const done = submitOutput(s);
  assert.equal(done.status, "submitted");
  assert.ok(done.endedAt);
});

test("session lifecycle: start -> blocker requires a note", () => {
  const s = startSession("Draft case study", "a PDF");
  assert.throws(() => recordBlocker(s, ""));
  const blocked = recordBlocker(s, "Client didn't send assets");
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.blockerNote, "Client didn't send assets");
});

test("cannot submit or block a session twice", () => {
  const s = submitOutput(startSession("Draft", "a PDF"));
  assert.throws(() => submitOutput(s), InvalidSessionTransition);
  assert.throws(() => recordBlocker(s, "too late"), InvalidSessionTransition);
});

test("canJoinLiveSession requires both an active host session and explicit opt-in", () => {
  assert.equal(canJoinLiveSession({ hostSessionStatus: "active", liveVisibilityOptIn: true }), true);
  assert.equal(canJoinLiveSession({ hostSessionStatus: "active", liveVisibilityOptIn: false }), false);
  assert.equal(canJoinLiveSession({ hostSessionStatus: "idle", liveVisibilityOptIn: true }), false);
});

test("summarizeSquadActivity leads with recently completed sessions, not just who's live", () => {
  const now = new Date("2026-09-05T18:00:00Z");
  const earlier = new Date("2026-09-05T10:00:00Z");
  const summary = summarizeSquadActivity([
    { userId: "a", taskTitle: "Draft", status: "submitted", startedAt: earlier, endedAt: now, liveVisible: false },
    { userId: "b", taskTitle: "Research", status: "active", startedAt: now, endedAt: null, liveVisible: true },
    { userId: "c", taskTitle: "Hidden work", status: "active", startedAt: now, endedAt: null, liveVisible: false },
  ]);
  assert.equal(summary.recentlyCompleted.length, 1);
  assert.equal(summary.recentlyCompleted[0].userId, "a");
  assert.equal(summary.liveNow.length, 1);
  assert.equal(summary.liveNow[0].userId, "b"); // c opted out of live visibility
});
