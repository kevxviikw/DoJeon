import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Card, Eyebrow, GhostButton, PrimaryButton, ScreenHeader, Tag, ToggleSwitch } from "../../components/ui";
import { submitCheckin } from "../../lib/api";
import { useActiveMission } from "../../lib/hooks";
import { fonts } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";
import type { CheckinSubmitResponse } from "../../lib/types";

type EvidenceType = "photo" | "voice" | "count";

export default function ProofScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const params = useLocalSearchParams<{ missionId?: string; sessionId?: string }>();
  const { mission } = useActiveMission();
  const missionId = params.missionId ?? mission?.id ?? null;
  const isSquadMission = !!mission?.squadId;

  const [evidenceType, setEvidenceType] = useState<EvidenceType>("photo");
  const [filePrivate, setFilePrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinSubmitResponse | null>(null);

  if (!missionId) {
    return (
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
        <ScreenHeader title="Proof" subtitle="evidence, not a checkbox" />
        <Text style={{ fontFamily: fonts.displayMedium, color: t.muted }}>No active mission to log evidence for.</Text>
      </ScrollView>
    );
  }

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      // No file upload yet -- Supabase Storage isn't wired up in this
      // prototype, so `fileUrl` stays null. `evidenceSubmitted: true`
      // still drives the real classifyEvent()/trust-label logic
      // server-side; only the literal binary attachment is stubbed.
      const response = await submitCheckin({
        missionId,
        sessionId: params.sessionId || undefined,
        taskCompleted: true,
        evidenceSubmitted: true,
        fileUrl: null,
        filePrivate,
      });
      setResult(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit check-in.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const statusLine = isSquadMission ? "Pending · 0/? votes" : "Confirmed";
    return (
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[styles.content, { alignItems: "center" }]}>
        <Svg width={56} height={56} viewBox="0 0 20 20" fill="none" stroke={t.accent} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 20 }}>
          <Circle cx={10} cy={10} r={8} />
          <Path d="M6.5 10.3l2.3 2.3 4.7-5" />
        </Svg>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 30, color: t.text, marginBottom: 28 }}>Logged.</Text>

        <Card style={{ width: "100%", marginBottom: 28 }}>
          <SummaryRow label="Evidence" value={result.checkin.evidenceTrustLabel.replace("_", " ")} />
          <SummaryRow label="File" value={result.checkin.filePrivate ? "Private" : "Shared"} />
          <SummaryRow label="Status" value={statusLine} valueColor={t.accent} last />
        </Card>

        <GhostButton label="Back to Today" onPress={() => router.push("/index")} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <ScreenHeader title="Proof" subtitle="evidence, not a checkbox" />

      <View style={styles.segmentRow}>
        {(["photo", "voice", "count"] as EvidenceType[]).map((type) => (
          <Pressable
            key={type}
            onPress={() => setEvidenceType(type)}
            style={[
              styles.segment,
              evidenceType === type
                ? { backgroundColor: t.accent }
                : { backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline },
            ]}
          >
            <Text style={{ fontFamily: fonts.displayMedium, fontSize: 12, color: evidenceType === type ? t.onAccent : t.text }}>
              {type[0].toUpperCase() + type.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ height: 96, marginBottom: 8, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: fonts.displayMedium, fontSize: 12, color: t.muted }}>
          {{ photo: "Tap to attach a photo", voice: "Tap to record a voice note", count: "Enter a count or duration" }[evidenceType]}
        </Text>
      </Card>
      <Tag>Evidence: Attached</Tag>

      <Card style={{ marginTop: 22, marginBottom: 28 }}>
        <View style={styles.row}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 14, color: t.text }}>Keep file private</Text>
          <ToggleSwitch on={filePrivate} onToggle={() => setFilePrivate((v) => !v)} />
        </View>
        <Text style={{ fontFamily: fonts.displayMedium, fontSize: 11, color: t.muted, lineHeight: 16 }}>
          Your status is always visible to the squad. The file itself stays private unless you turn this off.
        </Text>
      </Card>

      {error ? <Text style={{ color: t.alert, fontFamily: fonts.mono, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}
      <PrimaryButton label="Submit Check-in" loading={loading} onPress={handleSubmit} />
    </ScrollView>
  );
}

function SummaryRow({ label, value, valueColor, last }: { label: string; value: string; valueColor?: string; last?: boolean }) {
  const { t } = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.hairline, paddingBottom: 8, marginBottom: 8 }]}>
      <Tag>{label}</Tag>
      <Tag color={valueColor ?? t.text}>{value}</Tag>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  segment: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
