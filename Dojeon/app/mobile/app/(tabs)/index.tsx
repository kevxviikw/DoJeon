import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Card, Eyebrow, PrimaryButton, Tag } from "../../components/ui";
import { useActiveMission } from "../../lib/hooks";
import { fonts } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";
import type { CheckinRow, EventType } from "../../lib/types";

const EVENT_ICON_PATH: Record<EventType | "open", string> = {
  completed: "M4 10l4 4 8-8",
  miss: "M5 5l10 10M15 5L5 15",
  unproven: "M3 10a7 7 0 1114 0 7 7 0 01-14 0",
  rest: "M7 5v10M13 5v10",
  interrupted: "M11 4L6 11h4l-1 5 6-8h-4l1-4z",
  open: "M3 10a7 7 0 1114 0 7 7 0 01-14 0",
};

function eventLabel(event: EventType): string {
  return { completed: "Done", miss: "Miss", unproven: "Unproven", rest: "Rest", interrupted: "Interrupted" }[event];
}

export default function TodayScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { mission, milestones, recentCheckins, loading, error, refetch } = useActiveMission();

  const completedMilestones = milestones.filter((m) => m.completed_at).length;
  const totalMilestones = milestones.length;
  const progressFraction = totalMilestones > 0 ? completedMilestones / totalMilestones : 0;
  const daysRemaining = mission
    ? Math.max(0, Math.ceil((new Date(mission.deadline).getTime() - Date.now()) / 86_400_000))
    : null;
  const elapsedDays = mission && daysRemaining !== null ? Math.max(1, mission.durationDays - daysRemaining) : null;

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={t.muted} />}
    >
      {/* DOJEON is the app's name, not this screen's -- it's the hero
          element here on purpose (home screen only; Forge/Push/Proof keep
          the smaller ScreenHeader, since repeating a giant wordmark on
          every tab would fight the same manual's own restraint). */}
      <Eyebrow color={t.muted}>{elapsedDays ? `Today · Day ${elapsedDays}` : "Today"}</Eyebrow>
      <Text style={[styles.wordmark, { color: t.text }]}>DoJeon</Text>
      <Text style={[styles.slogan, { color: t.muted }]}>
        Challenge Everything, <Text style={{ color: t.accent }}>Fear Nothing.</Text>
      </Text>

      {!mission && !loading ? (
        <Card style={{ marginTop: 24 }}>
          <Text style={[styles.body, { color: t.text }]}>
            No active mission yet. Head to Forge to state a hard goal and get a plan.
          </Text>
        </Card>
      ) : null}

      {error ? <Text style={{ color: t.alert, fontFamily: fonts.mono, fontSize: 12 }}>{error}</Text> : null}

      {mission ? (
        <>
          <View style={styles.grid}>
            <View style={[styles.tile, { backgroundColor: t.surface }]}>
              <Eyebrow>Deliverable</Eyebrow>
              <Text style={[styles.tileValue, { color: t.text }]} numberOfLines={2}>
                {mission.deliverable}
              </Text>
            </View>
            <View style={[styles.tile, { backgroundColor: t.surface }]}>
              <Eyebrow>Milestones</Eyebrow>
              <Text style={[styles.tileValue, { color: t.text }]}>
                {completedMilestones} / {totalMilestones}
              </Text>
            </View>
            <View style={[styles.tile, { backgroundColor: t.surface }]}>
              <Eyebrow>Deadline</Eyebrow>
              <Text style={[styles.tileValue, { color: t.accent }]}>{daysRemaining} days left</Text>
            </View>
            <View style={[styles.tile, { backgroundColor: t.surface }]}>
              <Eyebrow>Goal Type</Eyebrow>
              <Text style={[styles.tileValue, { color: t.text }]}>{mission.goalType}</Text>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: t.hairline }]}>
            <View style={[styles.progressFill, { backgroundColor: t.accent, width: `${Math.round(progressFraction * 100)}%` }]} />
          </View>
          <Text style={[styles.progressCaption, { color: t.muted, fontFamily: fonts.mono }]}>
            {completedMilestones} of {totalMilestones} milestones
          </Text>

          <PrimaryButton
            label="Start Today's Session"
            onPress={() => router.push({ pathname: "/push", params: { missionId: mission.id } })}
          />

          <View style={{ height: 24 }} />
          <Eyebrow>History</Eyebrow>
          {recentCheckins.length === 0 ? (
            <Text style={[styles.body, { color: t.muted, marginTop: 8 }]}>No check-ins logged yet.</Text>
          ) : (
            recentCheckins.map((row) => <HistoryRow key={row.id} row={row} />)
          )}
        </>
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={t.muted} />
      ) : null}

      <View style={[styles.credits, { borderTopColor: t.hairline }]}>
        <Eyebrow color={t.muted}>Powered By Infinite Challenge</Eyebrow>
      </View>
    </ScrollView>
  );
}

function HistoryRow({ row }: { row: CheckinRow }) {
  const { t } = useTheme();
  const color = row.eventType === "miss" ? t.alert : row.eventType === "completed" || row.eventType === "interrupted" ? t.accent : t.muted;
  return (
    <View style={[styles.historyRow, { borderBottomColor: t.hairline }]}>
      <Svg width={18} height={18} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <Path d={EVENT_ICON_PATH[row.eventType]} />
      </Svg>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: t.muted, marginBottom: 2 }}>{row.checkinDate}</Text>
        <Text style={{ fontFamily: fonts.displayMedium, fontSize: 13, color: t.text }}>{row.eventType === "unproven" ? "No evidence submitted" : row.eventType === "rest" ? "Planned rest day" : "Check-in logged"}</Text>
      </View>
      <Tag color={color}>{eventLabel(row.eventType)}</Tag>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  wordmark: { fontFamily: fonts.displayBold, fontWeight: "700", fontSize: 54, letterSpacing: -2.2, lineHeight: 56, marginBottom: 6 },
  slogan: { fontFamily: fonts.serifItalic, fontSize: 17, marginBottom: 28 },
  body: { fontFamily: fonts.displayMedium, fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 1, marginTop: 20, borderRadius: 12, overflow: "hidden" },
  tile: { width: "49.6%", padding: 14 },
  tileValue: { fontFamily: fonts.displayBold, fontSize: 14, marginTop: 8 },
  progressTrack: { height: 4, borderRadius: 2, marginTop: 18, overflow: "hidden" },
  progressFill: { height: "100%" },
  progressCaption: { fontSize: 9, letterSpacing: 1, marginTop: 6, marginBottom: 24, textTransform: "uppercase" },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  credits: { marginTop: 32, paddingTop: 20, borderTopWidth: 1, alignItems: "center" },
  creditsLine: { fontFamily: fonts.displayBold, fontSize: 15, marginTop: 10 },
});
