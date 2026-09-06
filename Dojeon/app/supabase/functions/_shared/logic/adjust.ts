// Adjust -- honest replanning. One missed session never auto-rewrites the
// mission; the app checks for recovery room first, only proposes
// scope/time/deadline tradeoffs when the goal genuinely no longer fits,
// requires approval for any material change, and keeps both versions
// visible. Repeated Minimum-only days force a full review. See Field
// Manual §01 ("Adjust, the rules"), proposal §04.

import type { AdjustmentProposal, Tier, Tradeoff } from "./types.ts";

export interface RecoveryRoomInput {
  remainingWorkHours: number;
  remainingDays: number;
  hoursAvailablePerDay: number;
}

/** Checks whether the existing schedule still has room to recover before proposing anything. */
export function hasRecoveryRoom(input: RecoveryRoomInput): boolean {
  const remainingCapacity = Math.max(0, input.remainingDays) * Math.max(0, input.hoursAvailablePerDay);
  return remainingCapacity >= input.remainingWorkHours;
}

/**
 * If -- and only if -- there's no recovery room, produce real tradeoffs
 * (extend deadline / cut scope / find more time) for the member to
 * approve. Never a quietly easier plan.
 */
export function proposeAdjustment(input: RecoveryRoomInput): AdjustmentProposal {
  const recoveryRoomFound = hasRecoveryRoom(input);
  if (recoveryRoomFound) {
    return { recoveryRoomFound: true, tradeoffs: [], requiresApproval: false };
  }

  const tradeoffs: Tradeoff[] = [];
  const capacity = Math.max(0, input.remainingDays) * Math.max(0, input.hoursAvailablePerDay);
  const shortfall = input.remainingWorkHours - capacity;
  const extraDaysNeeded =
    input.hoursAvailablePerDay > 0 ? Math.ceil(shortfall / input.hoursAvailablePerDay) : Infinity;
  if (Number.isFinite(extraDaysNeeded)) {
    tradeoffs.push({
      kind: "extend_deadline",
      description: `Extend the deadline by ${extraDaysNeeded} day(s) to cover the remaining work.`,
      amount: extraDaysNeeded,
    });
  }
  const scopeCutPct =
    capacity > 0 && input.remainingWorkHours > 0 ? Math.ceil((1 - capacity / input.remainingWorkHours) * 100) : 100;
  tradeoffs.push({
    kind: "cut_scope",
    description: `Cut the remaining deliverable's scope by roughly ${scopeCutPct}% to finish by the current deadline.`,
    amount: scopeCutPct,
  });
  if (input.remainingDays > 0) {
    const neededPerDay = input.remainingWorkHours / input.remainingDays;
    const extraPerDay = neededPerDay - input.hoursAvailablePerDay;
    if (extraPerDay > 0) {
      tradeoffs.push({
        kind: "increase_daily_capacity",
        description: `Find ${extraPerDay.toFixed(1)} more hour(s)/day to finish by the current deadline.`,
        amount: Number(extraPerDay.toFixed(1)),
      });
    }
  }

  return { recoveryRoomFound: false, tradeoffs, requiresApproval: true };
}

export interface MissionRevisionRecord<TMission> {
  original: TMission;
  proposedRevision: TMission;
  approved: boolean;
  decidedAt: Date;
}

/**
 * Only mutates the mission if the member approves the proposed revision.
 * Either way, the original commitment and the proposed revision both stay
 * in the mission's history -- nothing here is ever silently overwritten.
 */
export function applyAdjustment<TMission>(
  original: TMission,
  proposedRevision: TMission,
  approved: boolean,
  now: Date = new Date()
): { activeMission: TMission; record: MissionRevisionRecord<TMission> } {
  return {
    activeMission: approved ? proposedRevision : original,
    record: { original, proposedRevision, approved, decidedAt: now },
  };
}

/**
 * Repeated Minimum-only days trigger a full plan review, because the
 * deadline may no longer be realistic. Looks at which tier was actually
 * hit each day, not raw attendance.
 */
export function detectRepeatedMinimumOnly(
  tierHitPerDay: Tier[],
  windowSize = 5,
  minimumOnlyThreshold = 3
): boolean {
  const window = tierHitPerDay.slice(-windowSize);
  const minimumOnlyCount = window.filter((t) => t === "minimum").length;
  return minimumOnlyCount >= minimumOnlyThreshold;
}
