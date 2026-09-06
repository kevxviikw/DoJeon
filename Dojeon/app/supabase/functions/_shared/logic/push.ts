// Push -- the real, structured work-session activity: choose task/output,
// start a timer, squad can optionally join live, submit output or a
// blocker, see a summary. Async by default. See Field Manual §01 ("Push,
// in practice").

import type { SessionStatus } from "./types.ts";

export interface SessionState {
  status: SessionStatus;
  taskTitle: string;
  outputDescription: string;
  startedAt: Date | null;
  endedAt: Date | null;
  blockerNote: string | null;
}

export function startSession(
  taskTitle: string,
  outputDescription: string,
  now: Date = new Date()
): SessionState {
  if (!taskTitle.trim()) {
    throw new Error("A session needs a task to work on.");
  }
  return {
    status: "active",
    taskTitle,
    outputDescription,
    startedAt: now,
    endedAt: null,
    blockerNote: null,
  };
}

export class InvalidSessionTransition extends Error {}

function requireActive(session: SessionState) {
  if (session.status !== "active") {
    throw new InvalidSessionTransition(`Session must be active to do this (was "${session.status}").`);
  }
}

export function submitOutput(session: SessionState, now: Date = new Date()): SessionState {
  requireActive(session);
  return { ...session, status: "submitted", endedAt: now };
}

export function recordBlocker(session: SessionState, blockerNote: string, now: Date = new Date()): SessionState {
  requireActive(session);
  if (!blockerNote.trim()) {
    throw new Error("A blocker needs a description of what's blocking it.");
  }
  return { ...session, status: "blocked", endedAt: now, blockerNote };
}

export interface SquadJoinAttempt {
  hostSessionStatus: SessionStatus;
  liveVisibilityOptIn: boolean;
}

/**
 * Joining "working now" is a per-session opt-in choice, never a default,
 * and only possible while the host's session is actually active.
 */
export function canJoinLiveSession(attempt: SquadJoinAttempt): boolean {
  return attempt.hostSessionStatus === "active" && attempt.liveVisibilityOptIn;
}

export interface RawSquadSession {
  userId: string;
  taskTitle: string;
  status: SessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  liveVisible: boolean;
}

export interface CompletedSessionSummaryEntry {
  userId: string;
  taskTitle: string;
  status: SessionStatus;
  endedAt: Date;
}

export interface LiveSessionSummaryEntry {
  userId: string;
  taskTitle: string;
  startedAt: Date;
}

export interface SquadSessionSummary {
  recentlyCompleted: CompletedSessionSummaryEntry[];
  liveNow: LiveSessionSummaryEntry[];
}

/**
 * Async-friendly squad summary: leads with the squad's most recently
 * completed sessions rather than only who happens to be live right now, so
 * an empty "working now" screen doesn't read as an abandoned squad.
 */
export function summarizeSquadActivity(
  sessions: RawSquadSession[],
  maxRecentlyCompleted = 5
): SquadSessionSummary {
  const recentlyCompleted = sessions
    .filter((s) => (s.status === "submitted" || s.status === "blocked") && s.endedAt)
    .sort((a, b) => b.endedAt!.getTime() - a.endedAt!.getTime())
    .slice(0, maxRecentlyCompleted)
    .map((s) => ({ userId: s.userId, taskTitle: s.taskTitle, status: s.status, endedAt: s.endedAt! }));

  const liveNow = sessions
    .filter((s) => s.status === "active" && s.liveVisible)
    .map((s) => ({ userId: s.userId, taskTitle: s.taskTitle, startedAt: s.startedAt }));

  return { recentlyCompleted, liveNow };
}
