// Solo matching (club amendment B, Sept 5 2026 addendum). A member without
// a squad can search for potential squad-mates by similarity in goal type
// and pace, instead of staying solo by default. This only surfaces
// candidates for the member to choose from -- it's a search, not an
// auto-match.

import type { GoalProfile, MatchResult } from "./types.ts";

export function similarityScore(a: GoalProfile, b: GoalProfile): number {
  const sameGoalType = a.goalType.trim().toLowerCase() === b.goalType.trim().toLowerCase() ? 1 : 0;
  const maxPace = Math.max(a.hoursPerDay, b.hoursPerDay, 1e-9);
  const paceCloseness = 1 - Math.abs(a.hoursPerDay - b.hoursPerDay) / maxPace;
  const maxDeadline = Math.max(a.deadlineDays, b.deadlineDays, 1);
  const deadlineCloseness = 1 - Math.abs(a.deadlineDays - b.deadlineDays) / maxDeadline;
  return sameGoalType * 0.5 + paceCloseness * 0.3 + deadlineCloseness * 0.2;
}

export function findMatches(user: GoalProfile, candidates: GoalProfile[], topN = 5): MatchResult[] {
  return candidates
    .filter((c) => c.userId !== user.userId)
    .map((c) => ({ userId: c.userId, score: similarityScore(user, c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
