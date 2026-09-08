// Shared engine types, copied verbatim from
// supabase/functions/_shared/logic/types.ts (the backend's source of
// truth) -- keep these two files in sync by hand if a rule changes there.
// Row/DTO types below mirror what each Edge Function actually returns.

export type Tier = "minimum" | "target" | "stretch";
export type EventType = "completed" | "miss" | "unproven" | "rest" | "interrupted";
export type EvidenceTrustLabel = "self_reported" | "attached" | "squad_reviewed";
export type SessionStatus = "idle" | "active" | "submitted" | "blocked";
export type CheckinStatus = "pending" | "confirmed" | "rejected";
export type MissionStatus = "active" | "completed" | "abandoned";
export type SquadStatus = "active" | "disbanded";
export type AdjustmentTrigger = "missed_session" | "repeated_minimum";

export interface Workload {
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
  amount: number;
}

export interface FeasibilityResult {
  feasible: { minimum: boolean; target: boolean; stretch: boolean };
  tightestFeasibleTier: Tier | null;
  tradeoffs: Tradeoff[];
}

// --- Row shapes returned by Edge Functions (raw Postgres rows, snake_case
// on the wire -- api.ts converts to these camelCase shapes at the fetch
// boundary so nothing else in the app touches snake_case) ---

export interface MissionRow {
  id: string;
  userId: string;
  squadId: string | null;
  title: string;
  deliverable: string;
  goalType: string;
  deadline: string; // ISO date
  durationDays: number;
  hoursAvailablePerDay: number;
  tiers: {
    minimum: { hours: number; description: string; milestones: string[] };
    target: { hours: number; description: string; milestones: string[] };
    stretch: { hours: number; description: string; milestones: string[] };
  };
  tightestFeasibleTier: Tier | null;
  status: MissionStatus;
  createdAt: string;
}

export interface ForgeResponse {
  mission: MissionRow;
  feasibility: FeasibilityResult;
}

export interface CheckinRow {
  id: string;
  missionId: string;
  userId: string;
  sessionId: string | null;
  checkinDate: string;
  taskCompleted: boolean;
  evidenceSubmitted: boolean;
  plannedRest: boolean;
  technicalInterruption: boolean;
  tierHit: Tier | null;
  eventType: EventType;
  evidenceTrustLabel: EvidenceTrustLabel;
  filePrivate: boolean;
  fileUrl: string | null;
  fileRemoved: boolean;
  status: CheckinStatus;
  createdAt: string;
}

export interface CheckinSubmitResponse {
  checkin: CheckinRow;
  eventType: EventType;
}

export interface ApprovalTally {
  approvals: number;
  votesCast: number;
  eligibleVoters: number;
  approvalRate: number;
  confirmed: boolean;
}

export interface CheckinApproveResponse {
  tally: ApprovalTally;
  status: CheckinStatus;
}

export interface AdjustmentRow {
  id: string;
  missionId: string;
  trigger: AdjustmentTrigger;
  recoveryRoomFound: boolean;
  tradeoffs: Tradeoff[];
  requiresApproval: boolean;
  approved: boolean | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface AdjustPlanResponse {
  adjustment: AdjustmentRow;
  proposal: { recoveryRoomFound: boolean; tradeoffs: Tradeoff[]; requiresApproval: boolean };
  repeatedMinimumOnly: boolean;
}

export interface SquadRow {
  id: string;
  name: string;
  inviteCode: string;
  sizeMin: number;
  sizeMax: number;
  checkApprovalThreshold: number;
  missedDayRemovalFraction: number;
  status: SquadStatus;
  createdAt: string;
}

export interface SessionRow {
  id: string;
  missionId: string;
  userId: string;
  taskId: string | null;
  sessionRoundId: string | null;
  taskTitle: string;
  outputDescription: string;
  status: SessionStatus;
  liveVisible: boolean;
  startedAt: string;
  endedAt: string | null;
  blockerNote: string | null;
}

export interface SquadActivityResponse {
  recentlyCompleted: Array<{ userId: string; taskTitle: string; status: SessionStatus; endedAt: string }>;
  liveNow: Array<{ userId: string; taskTitle: string; startedAt: string }>;
}

export interface RankedMember {
  userId: string;
  confirmedCheckins: number;
  scheduledCheckins: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  score: number;
  rank: number;
}

export interface MatchResult {
  userId: string;
  score: number;
}

export interface MissionEndResponse {
  collected: boolean;
  report: { achievementScore: number; consistencyScore: number } | null;
  squadDisbanded: boolean;
}
