// The caller's current squad membership, read straight from PostgREST
// (RLS lets a member read their own squad_members row and embed the squad).
// One active squad per member -- enforced server-side in squad-create /
// squad-join -- so this is a single-row lookup.

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import type { SquadMembership } from "./types";

interface SquadState {
  membership: SquadMembership | null;
  loading: boolean;
  refetch: () => void;
}

export function useSquad(): SquadState {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [membership, setMembership] = useState<SquadMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!userId) {
      setMembership(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("squad_members")
        .select("squad_id, joined_at, squads(name, invite_code, size_max, status)")
        .eq("user_id", userId)
        .is("removed_at", null)
        .maybeSingle();

      if (cancelled) return;
      const squad = (data?.squads ?? null) as
        | { name: string; invite_code: string; size_max: number; status: string }
        | null;
      if (error || !data || !squad || squad.status !== "active") {
        setMembership(null);
      } else {
        setMembership({
          squadId: data.squad_id as string,
          name: squad.name,
          inviteCode: squad.invite_code,
          sizeMax: squad.size_max,
          joinedAt: data.joined_at as string,
        });
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  return { membership, loading, refetch };
}
