// Forge -- turn a stated goal into a checkable deliverable and a
// three-tier (minimum/target/stretch) plan, with real feasibility math
// around whatever the AI planning call (see ../gemini.ts) proposes. See
// Field Manual §01 / §03, proposal §04.

import type { FeasibilityResult, Tier, TierPlan, Tradeoff } from "./types.ts";

const VAGUE_PATTERNS = [
  /\bwork on\b/i,
  /\bget better at\b/i,
  /\bimprove( my)?\b/i,
  /\bbe more\b/i,
  /\btry to\b/i,
  /\bfocus on\b/i,
  /\blearn about\b/i,
];

const CHECKABLE_HINTS = [
  /\d+/, // a count -- "three case studies"
  /\b(publish|ship|submit|finish|complete|deliver|pass|launch|write|record|build)\b/i,
];

export interface DeliverableCheck {
  checkable: boolean;
  reason?: string;
}

/**
 * Heuristic pre-check run before (and alongside) the AI decomposition
 * call. A goal must resolve to a checkable deliverable ("publish three
 * completed case studies"), not a vague activity ("work on my portfolio")
 * -- otherwise nothing downstream (Proof, Adjust) can measure real
 * progress.
 */
export function checkDeliverable(goalText: string): DeliverableCheck {
  const text = goalText.trim();
  if (text.length === 0) {
    return { checkable: false, reason: "Goal is empty." };
  }
  const isVague = VAGUE_PATTERNS.some((p) => p.test(text));
  const hasCheckableHint = CHECKABLE_HINTS.some((p) => p.test(text));
  if (isVague && !hasCheckableHint) {
    return {
      checkable: false,
      reason:
        'Reads as an ongoing activity, not a checkable result. Restate as a specific finished thing ("publish three completed case studies") instead of an activity ("work on my portfolio").',
    };
  }
  if (!hasCheckableHint) {
    return {
      checkable: false,
      reason: "No concrete, countable deliverable detected. Add what gets produced and how many/how much.",
    };
  }
  return { checkable: true };
}

/**
 * Deterministic feasibility math around the AI-generated tiers: given the
 * work each tier requires and the time actually available before the
 * deadline, flag which tiers fit and propose real tradeoffs (extend
 * deadline / cut scope / find more time) instead of silently accepting an
 * unrealistic plan.
 */
export function assessFeasibility(
  tiers: TierPlan,
  deadlineDays: number,
  hoursAvailablePerDay: number
): FeasibilityResult {
  const capacity = Math.max(0, deadlineDays) * Math.max(0, hoursAvailablePerDay);

  const feasible = {
    minimum: tiers.minimum.hours <= capacity,
    target: tiers.target.hours <= capacity,
    stretch: tiers.stretch.hours <= capacity,
  };

  let tightestFeasibleTier: Tier | null = null;
  if (feasible.stretch) tightestFeasibleTier = "stretch";
  else if (feasible.target) tightestFeasibleTier = "target";
  else if (feasible.minimum) tightestFeasibleTier = "minimum";

  const tradeoffs: Tradeoff[] = [];
  if (!feasible.minimum) {
    const shortfallHours = tiers.minimum.hours - capacity;
    const extraDaysNeeded =
      hoursAvailablePerDay > 0 ? Math.ceil(shortfallHours / hoursAvailablePerDay) : Infinity;
    if (Number.isFinite(extraDaysNeeded)) {
      tradeoffs.push({
        kind: "extend_deadline",
        description: `Even the Minimum tier doesn't fit. Extend the deadline by ${extraDaysNeeded} day(s), or cut scope, or add work hours per day.`,
        amount: extraDaysNeeded,
      });
    }
    const scopeCutPct = capacity > 0 ? Math.ceil((1 - capacity / tiers.minimum.hours) * 100) : 100;
    tradeoffs.push({
      kind: "cut_scope",
      description: `Cut the deliverable's scope by roughly ${scopeCutPct}% to fit the current deadline.`,
      amount: scopeCutPct,
    });
    if (deadlineDays > 0) {
      const neededHoursPerDay = tiers.minimum.hours / deadlineDays;
      const extraPerDay = neededHoursPerDay - hoursAvailablePerDay;
      if (extraPerDay > 0) {
        tradeoffs.push({
          kind: "increase_daily_capacity",
          description: `Find ${extraPerDay.toFixed(1)} more hour(s)/day to hit the Minimum tier on the current deadline.`,
          amount: Number(extraPerDay.toFixed(1)),
        });
      }
    }
  }

  return { feasible, tightestFeasibleTier, tradeoffs };
}
