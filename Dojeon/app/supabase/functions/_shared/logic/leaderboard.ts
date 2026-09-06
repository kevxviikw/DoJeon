// Squad-scoped leaderboard (club amendment A, Sept 5 2026 addendum). Each
// squad has a leaderboard visible only to that squad's 3-6 members --
// never across squads. This supersedes only the *cross-squad* "no
// leaderboard" position from Field Manual §00/§03; a cross-squad
// leaderboard remains explicitly out of scope, and this module has no way
// to compute one -- callers must already pass a single squad's members.

import type { MemberStats, RankedMember } from "./types.ts";

export interface LeaderboardWeights {
  consistency: number;
  completion: number;
}

export const DEFAULT_WEIGHTS: LeaderboardWeights = { consistency: 0.5, completion: 0.5 };

export function computeSquadLeaderboard(
  members: MemberStats[],
  weights: LeaderboardWeights = DEFAULT_WEIGHTS
): RankedMember[] {
  const scored = members.map((m) => {
    const consistency = m.scheduledCheckins > 0 ? m.confirmedCheckins / m.scheduledCheckins : 0;
    const completion = m.milestonesTotal > 0 ? m.milestonesCompleted / m.milestonesTotal : 0;
    const score = consistency * weights.consistency + completion * weights.completion;
    return { ...m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((m, i) => ({ ...m, rank: i + 1 }));
}
