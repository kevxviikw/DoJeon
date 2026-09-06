// Shared types for the DoJeon core engine (Forge / Push / Proof / Adjust / Squad).
// Zero runtime dependencies, zero Node- or Deno-specific APIs -- this file
// (and everything else in this `logic/` folder) is imported as-is both by
// the Supabase Edge Functions (Deno) and by the Node test suite.

export type Tier = "minimum" | "target" | "stretch";

export type EventType = "completed" | "miss" | "unproven" | "rest" | "interrupted";

export type EvidenceTrustLabel = "self_reported" | "attached" | "squad_reviewed";

export type SessionStatus = "idle" | "active" | "submitted" | "blocked";

export type CheckinStatus = "pending" | "confirmed" | "rejected";

export interface Workload {
  /** Estimated hours of work required to hit this tier, start to deadline. */
  hours: number;
}

export interface TierPlan {
  minimum: Workload;
  target: Workload;
  stretch: Workload;
}

export interface Tradeoff {
  kind: "extend_deadline" | "cut_scope" | "increase_daily_capacity";
  description: string;
  /** e.g. days to add, % scope to cut, hours/day to add. */
  amount: number;
}

export interface FeasibilityResult {
  feasible: { minimum: boolean; target: boolean; stretch: boolean };
  tightestFeasibleTier: Tier | null;
  tradeoffs: Tradeoff[];
}

export interface EvidenceRecord {
  submitted: boolean;
  trustLabel: EvidenceTrustLabel;
  filePrivate: boolean;
  fileUrl: string | null;
  fileRemoved: boolean;
}

export interface MemberStats {
  userId: string;
  confirmedCheckins: number;
  scheduledCheckins: number;
  milestonesCompleted: number;
  milestonesTotal: number;
}

export interface RankedMember extends MemberStats {
  score: number;
  rank: number;
}

export interface GoalProfile {
  userId: string;
  goalType: string;
  hoursPerDay: number;
  deadlineDays: number;
}

export interface MatchResult {
  userId: string;
  score: number;
}

export interface DailyRecord {
  taskCompleted: boolean;
  evidenceSubmitted: boolean;
  plannedRest: boolean;
  technicalInterruption: boolean;
}

export interface AdjustmentProposal {
  recoveryRoomFound: boolean;
  tradeoffs: Tradeoff[];
  requiresApproval: boolean;
}
