// The caller's own profile row (profiles table, RLS-scoped to themselves),
// loaded once and shared. `username === null` is the signal that
// onboarding isn't finished -- app/_layout.tsx gates the main tabs on it.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import type { ProfileRow } from "./types";

interface ProfileContextValue {
  profile: ProfileRow | null;
  loading: boolean;
  refetch: () => Promise<void>;
  updateProfile: (patch: { username?: string; displayName?: string }) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function toCamel(row: Record<string, any>): ProfileRow {
  return {
    id: row.id,
    username: row.username ?? null,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (!error) setProfile(data ? toCamel(data) : null);
    setLoading(false);
  }, [userId]);

  // Block the router gate until we know this user's profile -- otherwise a
  // returning member flashes the onboarding screen on every cold start
  // while the stale (null) profile still reads as "needs onboarding".
  // Plain refetches (updateProfile, Account edits) call load() directly and
  // don't toggle loading.
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const updateProfile = useCallback<ProfileContextValue["updateProfile"]>(
    async (patch) => {
      if (!userId) throw new Error("Not signed in.");
      const row: Record<string, string> = {};
      if (patch.username !== undefined) row.username = patch.username.trim().toLowerCase();
      if (patch.displayName !== undefined) row.display_name = patch.displayName.trim();
      const { error } = await supabase.from("profiles").update(row).eq("id", userId);
      if (error) {
        if (error.code === "23505") throw new Error("That @username is already taken.");
        throw new Error(error.message);
      }
      await load();
    },
    [userId, load]
  );

  const value = useMemo(
    () => ({ profile, loading, refetch: load, updateProfile }),
    [profile, loading, load, updateProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>.");
  return ctx;
}
