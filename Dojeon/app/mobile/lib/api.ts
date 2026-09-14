// Typed wrappers around every Supabase Edge Function DoJeon has --
// mirrors the Services layer that was written in Swift for the (now
// superseded) native client, just in TS. Every call goes through
// supabase.functions.invoke, which attaches the current session's bearer
// token automatically -- Postgres RLS (see supabase/migrations/0001_init.sql)
// enforces every privacy/visibility rule server-side, same as before.

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type {
  AdjustPlanResponse,
  CheckinApproveResponse,
  CheckinSubmitResponse,
  DirectoryUser,
  ForgeResponse,
  MissionEndResponse,
  RankedMember,
  MatchResult,
  SessionRow,
  SquadActivityResponse,
  SquadRow,
  Tier,
} from "./types";

async function callFunction<T>(name: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body: body ?? {} });
  if (error) {
    // On a non-2xx, error.message is the generic "Edge Function returned a
    // non-2xx status code" -- the real reason is in the response body, which
    // every function returns as { error: "..." } (see functions/_shared/cors.ts).
    let detail = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload?.error) detail = `${payload.error} (HTTP ${error.context.status})`;
      } catch {
        // body wasn't JSON -- fall back to the generic message
      }
    }
    throw new Error(`${name} failed: ${detail}`);
  }
  return data as T;
}

// --- Forge ---

export function forgeMission(input: {
  title: string;
  deliverable: string;
  goalType: string;
  deadline: string; // ISO date, e.g. "2026-10-15"
  hoursAvailablePerDay: number;
  squadId?: string | null;
}): Promise<ForgeResponse> {
  return callFunction<ForgeResponse>("forge-plan", input);
}

// --- Push ---

export function startSession(input: {
  missionId: string;
  taskId?: string | null;
  taskTitle: string;
  outputDescription: string;
  squadId?: string | null;
  liveVisible?: boolean;
}): Promise<{ session: SessionRow }> {
  return callFunction("session-start", input);
}

export function joinSession(input: {
  sessionRoundId: string;
  missionId: string;
  taskId?: string | null;
  taskTitle: string;
  outputDescription: string;
}): Promise<{ session: SessionRow }> {
  return callFunction("session-join", input);
}

export function submitOutput(sessionId: string): Promise<{ session: SessionRow }> {
  return callFunction("session-finish", { sessionId, outcome: "submit" });
}

export function recordBlocker(sessionId: string, blockerNote: string): Promise<{ session: SessionRow }> {
  return callFunction("session-finish", { sessionId, outcome: "blocker", blockerNote });
}

export function getSquadActivity(squadId: string, lookbackHours = 48): Promise<SquadActivityResponse> {
  return callFunction("squad-activity", { squadId, lookbackHours });
}

// --- Proof ---

export function submitCheckin(input: {
  missionId: string;
  sessionId?: string | null;
  taskCompleted: boolean;
  evidenceSubmitted: boolean;
  plannedRest?: boolean;
  technicalInterruption?: boolean;
  tierHit?: Tier | null;
  fileUrl?: string | null;
  filePrivate?: boolean;
}): Promise<CheckinSubmitResponse> {
  return callFunction<CheckinSubmitResponse>("checkin-submit", input);
}

export function voteCheckin(checkinId: string, approve: boolean): Promise<CheckinApproveResponse> {
  return callFunction<CheckinApproveResponse>("checkin-approve", { checkinId, approve });
}

// --- Adjust ---

export function evaluateAdjustment(missionId: string): Promise<AdjustPlanResponse> {
  return callFunction<AdjustPlanResponse>("adjust-plan", { missionId });
}

export function decideAdjustment(adjustmentId: string, approved: boolean): Promise<{ approved: boolean }> {
  return callFunction("adjustment-decide", { adjustmentId, approved });
}

// --- Squad ---

export function createSquad(name: string, sizeMin = 3, sizeMax = 6): Promise<{ squad: SquadRow }> {
  return callFunction("squad-create", { name, sizeMin, sizeMax });
}

export function joinSquad(inviteCode: string): Promise<{ squadId: string }> {
  return callFunction("squad-join", { inviteCode });
}

export function searchUsers(query: string): Promise<{ users: DirectoryUser[] }> {
  return callFunction<{ users: DirectoryUser[] }>("user-search", { query });
}

export function getLeaderboard(squadId: string): Promise<{ leaderboard: RankedMember[] }> {
  return callFunction("leaderboard", { squadId });
}

export function findSoloMatches(topN = 5): Promise<{ matches: MatchResult[] }> {
  return callFunction("solo-match", { topN });
}

// --- Mission end ---

export function endMission(
  missionId: string,
  consent: boolean,
  patternNotes?: Record<string, unknown>
): Promise<MissionEndResponse> {
  return callFunction<MissionEndResponse>("mission-end", { missionId, consent, patternNotes });
}
