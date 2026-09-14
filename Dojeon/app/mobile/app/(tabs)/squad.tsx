// Squad tab -- create a squad, join one by invite code, or (once in one)
// see the roster with leaderboard standing and who's live. "Find people"
// opens the global directory search. Leaving lives on the Account screen.

import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Eyebrow, GhostButton, PrimaryButton, ScreenHeader, Tag } from "../../components/ui";
import { createSquad, getLeaderboard, getSquadActivity, joinSquad } from "../../lib/api";
import { useProfile } from "../../lib/profile";
import { useSquad } from "../../lib/squad";
import { supabase } from "../../lib/supabase";
import { fonts } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";
import type { SquadMembership, SquadRosterEntry } from "../../lib/types";

export default function SquadScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const { membership, loading, refetch } = useSquad();
  const goFind = () => router.push("/find-people");

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={t.muted} />}
    >
      <ScreenHeader title="Squad" subtitle="eusya, eusya." />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={t.muted} />
      ) : membership ? (
        <InSquad membership={membership} onFindPeople={goFind} />
      ) : (
        <NoSquad onChanged={refetch} onFindPeople={goFind} />
      )}
    </ScrollView>
  );
}

function NoSquad({ onChanged, onFindPeople }: { onChanged: () => void; onFindPeople: () => void }) {
  const { t } = useTheme();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    setBusy("create");
    try {
      await createSquad(name.trim());
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create squad.");
    } finally {
      setBusy(null);
    }
  };

  const join = async () => {
    setError(null);
    setBusy("join");
    try {
      await joinSquad(code.trim().toUpperCase());
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ marginTop: 20 }}>
      <Card style={{ marginBottom: 16 }}>
        <Eyebrow>Start a squad</Eyebrow>
        <Text style={[styles.cardBody, { color: t.muted }]}>
          3–6 people, each with their own goal. You'll get an invite code to share.
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Squad name"
          placeholderTextColor={t.muted}
          style={[styles.input, { color: t.text, borderBottomColor: t.hairline }]}
        />
        <View style={{ height: 14 }} />
        <PrimaryButton
          label="Create squad"
          loading={busy === "create"}
          disabled={name.trim().length < 2 || busy !== null}
          onPress={create}
        />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Eyebrow>Join a squad</Eyebrow>
        <Text style={[styles.cardBody, { color: t.muted }]}>
          Enter the 6-character invite code a squad-mate shared with you.
        </Text>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          placeholder="7K2QMX"
          placeholderTextColor={t.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={[styles.input, styles.codeInput, { color: t.text, borderBottomColor: t.hairline }]}
        />
        <View style={{ height: 14 }} />
        <PrimaryButton
          label="Join squad"
          loading={busy === "join"}
          disabled={code.length !== 6 || busy !== null}
          onPress={join}
        />
      </Card>

      {error ? <Text style={[styles.err, { color: t.alert }]}>{error}</Text> : null}
      <View style={{ height: 4 }} />
      <GhostButton label="Find people on DoJeon" onPress={onFindPeople} />
    </View>
  );
}

function InSquad({ membership, onFindPeople }: { membership: SquadMembership; onFindPeople: () => void }) {
  const { t } = useTheme();
  const { profile } = useProfile();
  const [roster, setRoster] = useState<SquadRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ leaderboard }, activity] = await Promise.all([
        getLeaderboard(membership.squadId),
        getSquadActivity(membership.squadId).catch(() => ({ recentlyCompleted: [], liveNow: [] })),
      ]);
      const ids = leaderboard.map((m) => m.userId);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const byId = new Map((profs ?? []).map((p: Record<string, any>) => [p.id, p]));
      const liveIds = new Set((activity.liveNow ?? []).map((s) => s.userId));

      setRoster(
        leaderboard.map((m) => ({
          userId: m.userId,
          username: byId.get(m.userId)?.username ?? null,
          displayName: byId.get(m.userId)?.display_name ?? "Member",
          rank: m.rank,
          score: m.score,
          confirmedCheckins: m.confirmedCheckins,
          milestonesCompleted: m.milestonesCompleted,
          milestonesTotal: m.milestonesTotal,
          live: liveIds.has(m.userId),
        }))
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load squad.");
    } finally {
      setLoading(false);
    }
  }, [membership.squadId]);

  useEffect(() => {
    load();
  }, [load]);

  const share = () =>
    Share.share({
      message: `Join my DoJeon squad "${membership.name}" — invite code ${membership.inviteCode}`,
    }).catch(() => {});

  return (
    <View style={{ marginTop: 20 }}>
      <Card style={{ marginBottom: 16 }}>
        <Eyebrow>Your squad</Eyebrow>
        <Text style={[styles.squadName, { color: t.text }]}>{membership.name}</Text>
        <View style={styles.codeRow}>
          <Text style={[styles.code, { color: t.accent }]}>{membership.inviteCode}</Text>
          <GhostButton label="Share invite" onPress={share} />
        </View>
      </Card>

      <Eyebrow>Roster</Eyebrow>
      <View style={{ height: 6 }} />
      {loading ? <ActivityIndicator color={t.muted} style={{ marginTop: 12 }} /> : null}
      {error ? <Text style={[styles.err, { color: t.alert }]}>{error}</Text> : null}
      {!loading && roster.length === 0 && !error ? (
        <Text style={[styles.cardBody, { color: t.muted }]}>No members yet.</Text>
      ) : null}
      {roster.map((m) => (
        <View key={m.userId} style={[styles.memberRow, { borderBottomColor: t.hairline }]}>
          <Text style={[styles.rank, { color: t.muted }]}>{m.rank}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.memberName, { color: t.text }]}>
              {m.username ? `@${m.username}` : m.displayName}
              {m.userId === profile?.id ? "  (you)" : ""}
            </Text>
            <Text style={[styles.memberMeta, { color: t.muted }]}>
              {m.confirmedCheckins} check-ins · {m.milestonesCompleted}/{m.milestonesTotal} milestones
            </Text>
          </View>
          {m.live ? <Tag color={t.accent}>Live</Tag> : null}
        </View>
      ))}

      <View style={{ height: 22 }} />
      <GhostButton label="Find people on DoJeon" onPress={onFindPeople} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  cardBody: { fontFamily: fonts.displayMedium, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 4 },
  input: { fontFamily: fonts.displayMedium, fontSize: 16, borderBottomWidth: 1, paddingVertical: 10, marginTop: 8 },
  codeInput: { fontFamily: fonts.mono, fontSize: 20, letterSpacing: 4 },
  err: { fontFamily: fonts.mono, fontSize: 12, marginBottom: 8 },
  squadName: { fontFamily: fonts.displayBold, fontWeight: "700", fontSize: 24, marginTop: 8 },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  code: { fontFamily: fonts.mono, fontSize: 22, letterSpacing: 4 },
  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  rank: { fontFamily: fonts.mono, fontSize: 13, width: 26 },
  memberName: { fontFamily: fonts.displayMedium, fontSize: 14 },
  memberMeta: { fontFamily: fonts.mono, fontSize: 10, marginTop: 3 },
});
