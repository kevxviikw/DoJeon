import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import type { CheckinRow, MissionRow } from "./types";

interface MilestoneRow {
  id: string;
  tier: string;
  title: string;
  completed_at: string | null;
}

interface ActiveMissionState {
  mission: MissionRow | null;
  milestones: MilestoneRow[];
  recentCheckins: CheckinRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Reads the member's most recent active mission straight from Postgres via
 * PostgREST (RLS-scoped to the caller automatically) -- there's no
 * dedicated Edge Function for this since it's a plain read, not a rule
 * that needed server-side logic.
 */
export function useActiveMission(): ActiveMissionState {
  const { session } = useAuth();
  const [mission, setMission] = useState<MissionRow | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data: missionRow, error: missionError } = await supabase
        .from("missions")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (missionError) {
        setError(missionError.message);
        setLoading(false);
        return;
      }
      setMission(missionRow ? toCamelMission(missionRow) : null);

      if (missionRow) {
        const [{ data: milestoneRows }, { data: checkinRows }] = await Promise.all([
          supabase.from("milestones").select("*").eq("mission_id", missionRow.id).order("sort_order"),
          supabase
            .from("checkins")
            .select("*")
            .eq("mission_id", missionRow.id)
            .order("checkin_date", { ascending: false })
            .limit(6),
        ]);
        if (cancelled) return;
        setMilestones(milestoneRows ?? []);
        setRecentCheckins((checkinRows ?? []).map(toCamelCheckin));
      } else {
        setMilestones([]);
        setRecentCheckins([]);
      }
      setLoading(false);
      setError(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, tick]);

  return { mission, milestones, recentCheckins, loading, error, refetch };
}

// Postgres rows come back snake_case over PostgREST (unlike Edge Function
// responses, which we control and return camelCase) -- these two small
// mappers keep the rest of the app on one consistent shape.
function toCamelMission(row: Record<string, any>): MissionRow {
  return {
    id: row.id,
    userId: row.user_id,
    squadId: row.squad_id,
    title: row.title,
    deliverable: row.deliverable,
    goalType: row.goal_type,
    deadline: row.deadline,
    durationDays: row.duration_days,
    hoursAvailablePerDay: Number(row.hours_available_per_day),
    tiers: row.tiers,
    tightestFeasibleTier: row.tightest_feasible_tier,
    status: row.status,
    createdAt: row.created_at,
  };
}

function toCamelCheckin(row: Record<string, any>): CheckinRow {
  return {
    id: row.id,
    missionId: row.mission_id,
    userId: row.user_id,
    sessionId: row.session_id,
    checkinDate: row.checkin_date,
    taskCompleted: row.task_completed,
    evidenceSubmitted: row.evidence_submitted,
    plannedRest: row.planned_rest,
    technicalInterruption: row.technical_interruption,
    tierHit: row.tier_hit,
    eventType: row.event_type,
    evidenceTrustLabel: row.evidence_trust_label,
    filePrivate: row.file_private,
    fileUrl: row.file_url,
    fileRemoved: row.file_removed,
    status: row.status,
    createdAt: row.created_at,
  };
}
