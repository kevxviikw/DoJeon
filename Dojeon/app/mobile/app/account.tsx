// Account / profile -- pushed as a stack screen from the header icon on
// every tab. Shows identity (username, display name, email), the current
// squad with a leave button, and sign-out (the only place it lives).

import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Eyebrow, GhostButton, PrimaryButton, Title } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { useSquad } from "../lib/squad";
import { supabase } from "../lib/supabase";
import { fonts } from "../lib/theme";
import { useTheme } from "../lib/theme-context";

export default function AccountScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { membership, refetch: refetchSquad } = useSquad();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveName = async () => {
    setError(null);
    setBusy(true);
    try {
      await updateProfile({ displayName });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const leaveSquad = async () => {
    if (!session?.user?.id) return;
    setBusy(true);
    setError(null);
    const { error: delError } = await supabase.from("squad_members").delete().eq("user_id", session.user.id);
    setBusy(false);
    if (delError) setError(delError.message);
    else refetchSquad();
  };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <Title>Account</Title>
      <View style={{ height: 20 }} />

      <Card style={{ marginBottom: 12 }}>
        <Eyebrow>Username</Eyebrow>
        <Text style={[styles.value, { color: t.text }]}>@{profile?.username ?? "—"}</Text>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Eyebrow>Display name</Eyebrow>
        {editing ? (
          <>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholderTextColor={t.muted}
              style={[styles.input, { color: t.text, borderBottomColor: t.hairline }]}
            />
            <View style={{ height: 12 }} />
            <View style={styles.editRow}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Save" loading={busy} disabled={!displayName.trim()} onPress={saveName} />
              </View>
              <GhostButton label="Cancel" onPress={() => { setEditing(false); setDisplayName(profile?.displayName ?? ""); }} />
            </View>
          </>
        ) : (
          <View style={styles.row}>
            <Text style={[styles.value, { color: t.text }]}>{profile?.displayName}</Text>
            <GhostButton label="Edit" onPress={() => { setDisplayName(profile?.displayName ?? ""); setEditing(true); }} />
          </View>
        )}
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Eyebrow>Email</Eyebrow>
        <Text style={[styles.value, { color: t.muted }]}>{session?.user?.email ?? "—"}</Text>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Eyebrow>Squad</Eyebrow>
        {membership ? (
          <>
            <Text style={[styles.value, { color: t.text }]}>{membership.name}</Text>
            <View style={{ height: 12 }} />
            <GhostButton label="Leave squad" onPress={leaveSquad} />
          </>
        ) : (
          <Text style={[styles.value, { color: t.muted }]}>Not in a squad</Text>
        )}
      </Card>

      {error ? <Text style={[styles.error, { color: t.alert }]}>{error}</Text> : null}

      <View style={{ height: 16 }} />
      <GhostButton label="Sign out" onPress={signOut} />
      <View style={{ height: 10 }} />
      <GhostButton label="Back" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  value: { fontFamily: fonts.displayMedium, fontSize: 16, marginTop: 8 },
  input: { fontFamily: fonts.displayMedium, fontSize: 16, borderBottomWidth: 1, paddingVertical: 8, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  error: { fontFamily: fonts.mono, fontSize: 12, marginBottom: 8 },
});
