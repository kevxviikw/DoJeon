// Find people -- global @username search over the member directory
// (user-search Edge Function). Discovery only: it confirms someone's on
// DoJeon and whether they're already in a squad. Bringing them into your
// squad still goes through your invite code (shown on the Squad tab).

import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, GhostButton, Tag, Title } from "../components/ui";
import { searchUsers } from "../lib/api";
import { fonts } from "../lib/theme";
import { useTheme } from "../lib/theme-context";
import type { DirectoryUser } from "../lib/types";

export default function FindPeopleScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = query.trim().replace(/^@+/, "");
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const { users } = await searchUsers(q);
        if (!cancelled) {
          setResults(users);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Search failed.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSearched(true);
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Title>Find people</Title>
      <Text style={[styles.sub, { color: t.muted }]}>
        Search by @username to check someone's on DoJeon. To bring them into your squad, share your
        invite code from the Squad tab.
      </Text>

      <View style={{ height: 20 }} />
      <View style={styles.searchRow}>
        <Text style={[styles.at, { color: t.muted }]}>@</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="username"
          placeholderTextColor={t.muted}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          style={[styles.input, { color: t.text, borderBottomColor: t.hairline }]}
        />
      </View>

      <View style={{ height: 20 }} />
      {loading ? <ActivityIndicator color={t.muted} /> : null}
      {error ? <Text style={[styles.err, { color: t.alert }]}>{error}</Text> : null}
      {!loading && searched && results.length === 0 && !error ? (
        <Text style={[styles.sub, { color: t.muted }]}>No one matches “{query.trim()}”.</Text>
      ) : null}

      {results.map((u) => (
        <Card key={u.userId} style={{ marginBottom: 10 }}>
          <View style={styles.resultRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.handle, { color: t.text }]}>@{u.username}</Text>
              <Text style={[styles.name, { color: t.muted }]}>{u.displayName}</Text>
            </View>
            <Tag color={u.inSquad ? t.muted : t.accent}>{u.inSquad ? "In a squad" : "No squad"}</Tag>
          </View>
        </Card>
      ))}

      <View style={{ height: 24 }} />
      <GhostButton label="Back" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  sub: { fontFamily: fonts.displayMedium, fontSize: 13, lineHeight: 19, marginTop: 8 },
  searchRow: { flexDirection: "row", alignItems: "flex-end" },
  at: { fontFamily: fonts.displayMedium, fontSize: 18, paddingBottom: 10, marginRight: 2 },
  input: { flex: 1, fontFamily: fonts.displayMedium, fontSize: 18, borderBottomWidth: 1, paddingVertical: 10 },
  err: { fontFamily: fonts.mono, fontSize: 12 },
  resultRow: { flexDirection: "row", alignItems: "center" },
  handle: { fontFamily: fonts.displayBold, fontSize: 15 },
  name: { fontFamily: fonts.displayMedium, fontSize: 12, marginTop: 2 },
});
