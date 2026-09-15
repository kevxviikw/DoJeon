// Missed-day removal threshold (club amendment C, Sept 5 2026 addendum).
// If a member's missed days pass a set share of their mission's total
// duration, they're removed from the squad -- the one point where the
// original "no invented penalties" position (Field Manual §00/§03) is
// superseded, at the club's explicit request, short of anything financial
// or shame-based. Threshold starts at one third, adjustable. Solo missions
// are unaffected -- there's no squad to be removed from.

export const DEFAULT_REMOVAL_FRACTION = 1 / 3;

export interface RemovalCheck {
  missedDays: number;
  missionDurationDays: number;
  fractionMissed: number;
  shouldRemove: boolean;
}

export function checkRemoval(
  missedDays: number,
  missionDurationDays: number,
  fractionThreshold: number = DEFAULT_REMOVAL_FRACTION
): RemovalCheck {
  if (missionDurationDays <= 0) {
    throw new Error("Mission duration must be positive.");
  }
  const fractionMissed = missedDays / missionDurationDays;
  return {
    missedDays,
    missionDurationDays,
    fractionMissed,
    shouldRemove: fractionMissed > fractionThreshold,
  };
}

// Club presentation amendment (2026-09-15): a flat missed-day cap --
// simpler than the fraction above, kicks a member after 5 missed days
// regardless of mission length. Kept alongside checkRemoval (still
// tested, just unused by squad-removal-sweep for now) rather than
// replacing it, in case the fraction-based version is wanted back later.
export const FLAT_REMOVAL_MISSED_DAYS = 5;

export interface FlatRemovalCheck {
  missedDays: number;
  threshold: number;
  shouldRemove: boolean;
}

export function checkFlatRemoval(missedDays: number, threshold: number = FLAT_REMOVAL_MISSED_DAYS): FlatRemovalCheck {
  return { missedDays, threshold, shouldRemove: missedDays >= threshold };
}
