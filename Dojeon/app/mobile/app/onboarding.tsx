// Shown once, right after sign-in, before the main tabs -- the gate in
// app/_layout.tsx routes here whenever the caller's profile has no
// username yet. Collects a display name + a unique @username; on save the
// gate flips to (tabs) on its own.

import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { Eyebrow, PrimaryButton } from "../components/ui";
import { useProfile } from "../lib/profile";
import { supabase } from "../lib/supabase";
import { fonts } from "../lib/theme";
import { useTheme } from "../lib/theme-context";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function OnboardingScreen() {
  const { t } = useTheme();
  const { profile, updateProfile } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = username.trim().toLowerCase();
  const formatValid = USERNAME_RE.test(normalized);

  useEffect(() => {
    if (!formatValid) {
      setAvailable(null);
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const id = setTimeout(async () => {
      const { data, error: rpcError } = await supabase.rpc("is_username_available", { candidate: normalized });
      if (cancelled) return;
      setChecking(false);
      setAvailable(rpcError ? null : Boolean(data));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [normalized, formatValid]);

  const canSubmit = displayName.trim().length > 0 && formatValid && available === true && !submitting;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await updateProfile({ username: normalized, displayName });
      // The gate in _layout.tsx swaps to (tabs) once profile.username is set.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      setSubmitting(false);
    }
  };

  const hint =
    username.length === 0
      ? "3–20 chars · lowercase letters, numbers, underscore"
      : !formatValid
        ? "Lowercase letters, numbers, underscore only. 3–20 characters."
        : checking
          ? "Checking…"
          : available === true
            ? "Available"
            : available === false
              ? "Already taken"
              : "Couldn't check — try again";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: t.text }]}>One last thing</Text>
          <Text style={[styles.slogan, { color: t.muted }]}>Pick how you show up in a squad.</Text>

          <View style={styles.spacer} />

          <Eyebrow>Display name</Eyebrow>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Kunwoo K"
            placeholderTextColor={t.muted}
            style={[styles.input, { color: t.text, borderBottomColor: t.hairline }]}
          />

          <View style={{ height: 24 }} />

          <Eyebrow>Username</Eyebrow>
          <View style={styles.usernameRow}>
            <Text style={[styles.at, { color: t.muted }]}>@</Text>
            <TextInput
              value={username}
              onChangeText={(v) => setUsername(v.replace(/\s/g, ""))}
              placeholder="kunwoo"
              placeholderTextColor={t.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { flex: 1, color: t.text, borderBottomColor: t.hairline }]}
            />
          </View>
          <Text
            style={[
              styles.hint,
              { color: available === false ? t.alert : available === true ? t.accent : t.muted },
            ]}
          >
            {hint}
          </Text>

          <View style={{ height: 28 }} />
          <PrimaryButton label="Enter DoJeon" loading={submitting} disabled={!canSubmit} onPress={handleSubmit} />
          {error ? <Text style={[styles.error, { color: t.alert }]}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  title: { fontFamily: fonts.displayBold, fontWeight: "700", fontSize: 40, letterSpacing: -1.6, marginBottom: 8 },
  slogan: { fontFamily: fonts.serifItalic, fontSize: 18 },
  spacer: { height: 44 },
  input: { fontFamily: fonts.displayMedium, fontSize: 16, borderBottomWidth: 1, paddingVertical: 10, marginTop: 8 },
  usernameRow: { flexDirection: "row", alignItems: "flex-end" },
  at: { fontFamily: fonts.displayMedium, fontSize: 16, paddingBottom: 10, marginRight: 2 },
  hint: { fontFamily: fonts.mono, fontSize: 11, marginTop: 8, letterSpacing: 0.5 },
  error: { marginTop: 16, fontFamily: fonts.mono, fontSize: 12 },
});
