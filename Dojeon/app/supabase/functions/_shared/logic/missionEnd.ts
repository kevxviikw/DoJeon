// Mission end & data collection (club amendment D, Sept 5 2026 addendum).
// When a mission's duration ends, its squad disbands. Only with the
// member's consent does DoJeon collect achievement/consistency/pattern
// data at that point, proposed as the app's revenue basis (a hypothesis,
// not a finalized model) rather than charging for the core experience.

export interface MissionEndInput {
  consent: boolean;
  confirmedCheckins: number;
  scheduledCheckins: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  patternNotes?: Record<string, unknown>;
}

export interface MissionEndReport {
  consented: true;
  achievementScore: number;
  consistencyScore: number;
  patternData: Record<string, unknown>;
}

/** Without consent, nothing is collected -- returns null, full stop. */
export function collectMissionEndData(input: MissionEndInput): MissionEndReport | null {
  if (!input.consent) return null;
  const achievementScore = input.milestonesTotal > 0 ? input.milestonesCompleted / input.milestonesTotal : 0;
  const consistencyScore = input.scheduledCheckins > 0 ? input.confirmedCheckins / input.scheduledCheckins : 0;
  return {
    consented: true,
    achievementScore,
    consistencyScore,
    patternData: input.patternNotes ?? {},
  };
}

export interface SquadDisbandResult {
  squadStatus: "disbanded";
  missionStatus: "completed";
  disbandedAt: Date;
}

export function disbandSquad(now: Date = new Date()): SquadDisbandResult {
  return { squadStatus: "disbanded", missionStatus: "completed", disbandedAt: now };
}
