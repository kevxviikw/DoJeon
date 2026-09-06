// A missed check-in isn't one event. History distinguishes four things
// that can happen instead of lumping every setback into one "miss"
// bucket. See Field Manual §02, proposal §05.

import type { DailyRecord, EventType } from "./types.ts";

export function classifyEvent(record: DailyRecord): EventType {
  if (record.plannedRest) return "rest";
  if (record.technicalInterruption) return "interrupted";
  if (record.taskCompleted && record.evidenceSubmitted) return "completed";
  if (record.taskCompleted && !record.evidenceSubmitted) return "unproven";
  return "miss";
}

/** Rest and interrupted days are explicitly excluded from counting against the tier; unproven is a follow-up prompt, not a miss. */
export function countsAgainstMinimumTier(eventType: EventType): boolean {
  return eventType === "miss";
}

export function excludedFromStreak(eventType: EventType): boolean {
  return eventType === "rest";
}
