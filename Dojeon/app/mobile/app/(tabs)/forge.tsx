import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Eyebrow, GhostButton, PrimaryButton, ScreenHeader, Tag } from "../../components/ui";
import { forgeMission } from "../../lib/api";
import { fonts } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";
import type { ForgeResponse } from "../../lib/types";

const TIER_ORDER = ["minimum", "target", "stretch"] as const;
const TIER_LABEL = { minimum: "Minimum", target: "Target", stretch: "Stretch" };

export default function ForgeScreen() {
  const router = useRouter();
  const { t } = useTheme();

  const [title, setTitle] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [goalType, setGoalType] = useState("");
  const [deadline, setDeadline] = useState(""); // YYYY-MM-DD
  const [hoursPerDay, setHoursPerDay] = useState("2");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ForgeResponse | null>(null);

  const handleForge = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await forgeMission({
        title,
        deliverable,
        goalType: goalType || "general",
        deadline,
        hoursAvailablePerDay: Number(hoursPerDay) || 1,
      });
      setResult(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Forge failed.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
        <ScreenHeader title="Your Plan" />
        <Text style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: t.muted, marginBottom: 20 }}>
          {result.mission.deliverable.toUpperCase()} · {result.mission.durationDays} DAYS
        </Text>

        {!result.feasibility.feasible.minimum ? (
          <Card borderColor={t.alert} style={{ marginBottom: 20 }}>
            <Tag color={t.alert}>Doesn't Fit Your Deadline</Tag>
            <Text style={[styles.tierDesc, { color: t.text, marginTop: 8, marginBottom: 12 }]}>
              Even the Minimum tier needs more time than you have. Here's what would make it real:
            </Text>
            {result.feasibility.tradeoffs.map((tradeoff, i) => (
              <View key={i} style={[styles.tradeoffRow, { borderColor: t.hairline }]}>
                <Text style={[styles.tierDesc, { color: t.text, fontSize: 12 }]}>{tradeoff.description}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {TIER_ORDER.map((tierKey) => {
          const tier = result.mission.tiers[tierKey];
          const feasible = result.feasibility.feasible[tierKey];
          const isTarget = tierKey === "target";
          return (
            <Card
              key={tierKey}
              borderColor={isTarget ? t.accent : t.hairline}
              style={{ marginBottom: 14, opacity: feasible ? 1 : 0.45 }}
            >
              <View style={styles.tierHeaderRow}>
                <Tag color={feasible ? t.text : t.alert}>{TIER_LABEL[tierKey]}</Tag>
                <Tag>{`${tier.hours} hrs`}</Tag>
              </View>
              <Text style={[styles.tierDesc, { color: t.text }]}>{tier.description}</Text>
              {tier.milestones.map((m, i) => (
                <Text key={i} style={[styles.milestone, { color: t.muted }]}>
                  · {m}
                </Text>
              ))}
            </Card>
          );
        })}

        {result.feasibility.feasible.minimum ? (
          <PrimaryButton label="Go to Today" onPress={() => router.push("/")} />
        ) : null}
        <View style={{ height: 12 }} />
        <GhostButton label="Edit Goal" onPress={() => setResult(null)} />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
        <ScreenHeader title="Forge" subtitle="decide on a hard goal" />

        <Field label="Goal" value={title} onChangeText={setTitle} placeholder="Ship three completed case studies" />
        <Field
          label="Deliverable"
          value={deliverable}
          onChangeText={setDeliverable}
          placeholder="3 polished PDFs, published on my portfolio site"
          multiline
        />
        <Field label="Goal Type" value={goalType} onChangeText={setGoalType} placeholder="career" />
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Field label="Deadline (YYYY-MM-DD)" value={deadline} onChangeText={setDeadline} placeholder="2026-10-15" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Hrs / Day" value={hoursPerDay} onChangeText={setHoursPerDay} placeholder="2" keyboardType="numeric" />
          </View>
        </View>

        <View style={{ height: 16 }} />
        <PrimaryButton
          label="Forge the Plan →"
          loading={loading}
          disabled={!title || !deliverable || !deadline}
          onPress={handleForge}
        />
        {error ? <Text style={{ color: t.alert, fontFamily: fonts.mono, fontSize: 12, marginTop: 12 }}>{error}</Text> : null}
        <Text style={{ fontFamily: fonts.displayMedium, fontSize: 12, lineHeight: 18, color: t.muted, marginTop: 16 }}>
          Checked against your deadline before it's committed — not a schedule that was never realistic.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) {
  const { t } = useTheme();
  return (
    <View style={[styles.field, { borderBottomColor: t.hairline }]}>
      <Eyebrow>{props.label}</Eyebrow>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={t.muted}
        multiline={props.multiline}
        keyboardType={props.keyboardType}
        style={[styles.input, { color: t.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  field: { borderBottomWidth: 1, paddingBottom: 12, marginBottom: 18 },
  input: { fontFamily: fonts.displayMedium, fontSize: 15, marginTop: 8, padding: 0 },
  tierHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  tierDesc: { fontFamily: fonts.displayMedium, fontSize: 13 },
  milestone: { fontFamily: fonts.displayMedium, fontSize: 12, marginTop: 4 },
  tradeoffRow: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8 },
});
