import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Eyebrow, GhostButton, PrimaryButton, ScreenHeader, ToggleSwitch } from "../../components/ui";
import { recordBlocker, startSession, submitOutput } from "../../lib/api";
import { useActiveMission } from "../../lib/hooks";
import { fonts } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";
import type { SessionRow } from "../../lib/types";

const BLOCKER_PRESETS = ["Ran out of time", "Waiting on someone else", "Technical issue"];

type Stage = "choose" | "active" | "blocker" | "summary";

export default function PushScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const params = useLocalSearchParams<{ missionId?: string }>();
  const { mission } = useActiveMission();
  const missionId = params.missionId ?? mission?.id ?? null;

  const [stage, setStage] = useState<Stage>("choose");
  const [taskTitle, setTaskTitle] = useState("");
  const [outputDescription, setOutputDescription] = useState("");
  const [liveVisible, setLiveVisible] = useState(false);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stage !== "active" || !session) return;
    const startedAt = new Date(session.startedAt).getTime();
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [stage, session]);

  if (!missionId) {
    return (
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
        <ScreenHeader title="Push" subtitle="show up. today." />
        <Text style={{ fontFamily: fonts.displayMedium, color: t.muted }}>
          Forge a mission first — there's nothing to push on yet.
        </Text>
      </ScrollView>
    );
  }

  const handleStart = async () => {
    setError(null);
    setLoading(true);
    try {
      const { session: newSession } = await startSession({
        missionId,
        taskTitle,
        outputDescription,
        liveVisible,
      });
      setSession(newSession);
      setStage("active");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start session.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOutput = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { session: updated } = await submitOutput(session.id);
      setSession(updated);
      setStage("summary");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setLoading(false);
    }
  };

  const handleBlocker = async (note: string) => {
    if (!session) return;
    setLoading(true);
    try {
      const { session: updated } = await recordBlocker(session.id, note);
      setSession(updated);
      setStage("summary");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log blocker.");
    } finally {
      setLoading(false);
    }
  };

  if (stage === "choose") {
    return (
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
        <ScreenHeader title="Push" subtitle="show up. today." />
        <Card style={{ marginBottom: 20 }}>
          <Eyebrow>Task</Eyebrow>
          <TextInput
            value={taskTitle}
            onChangeText={setTaskTitle}
            placeholder="Draft case study #2"
            placeholderTextColor={t.muted}
            style={[styles.input, { color: t.text, marginBottom: 14 }]}
          />
          <Eyebrow>Output</Eyebrow>
          <TextInput
            value={outputDescription}
            onChangeText={setOutputDescription}
            placeholder="Finished PDF draft"
            placeholderTextColor={t.muted}
            style={[styles.input, { color: t.text }]}
          />
        </Card>
        {error ? <Text style={{ color: t.alert, fontFamily: fonts.mono, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}
        <PrimaryButton label="Start Timer" loading={loading} disabled={!taskTitle || !outputDescription} onPress={handleStart} />
      </ScrollView>
    );
  }

  if (stage === "active" && session) {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const ss = String(totalSeconds % 60).padStart(2, "0");

    return (
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
        <ScreenHeader title="Push" />
        <Text style={[styles.timer, { color: t.text }]}>
          {hh}:{mm}:{ss}
        </Text>
        <Text style={[styles.taskRecap, { color: t.muted }]}>{session.taskTitle}</Text>

        <Card style={{ marginBottom: 28 }}>
          <View style={styles.row}>
            <Text style={{ fontFamily: fonts.displayMedium, fontSize: 14, color: t.text }}>Join squad live</Text>
            <ToggleSwitch on={liveVisible} onToggle={() => setLiveVisible((v) => !v)} />
          </View>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 11, color: t.muted }}>Off by default — opt in each time.</Text>
        </Card>

        {error ? <Text style={{ color: t.alert, fontFamily: fonts.mono, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}
        <PrimaryButton label="Submit Output" loading={loading} onPress={handleSubmitOutput} />
        <View style={{ height: 12 }} />
        <GhostButton label="Log a Blocker Instead" onPress={() => setStage("blocker")} />
      </ScrollView>
    );
  }

  if (stage === "blocker") {
    return (
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
        <ScreenHeader title="What's blocking you?" />
        {BLOCKER_PRESETS.map((preset) => (
          <Card key={preset} style={{ marginBottom: 10 }}>
            <Text
              onPress={() => handleBlocker(preset)}
              style={{ fontFamily: fonts.displayMedium, fontSize: 14, color: t.text }}
            >
              {preset}
            </Text>
          </Card>
        ))}
      </ScrollView>
    );
  }

  // summary
  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <ScreenHeader title="Session Summary" />
      <Card style={{ marginBottom: 24 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: session?.status === "blocked" ? t.alert : t.accent, marginBottom: 8 }}>
          {session?.status === "blocked" ? "BLOCKER LOGGED" : "OUTPUT SUBMITTED"}
        </Text>
        <Text style={{ fontFamily: fonts.displayMedium, fontSize: 14, color: t.text }}>
          {session?.status === "blocked" ? session?.blockerNote : `${session?.taskTitle} · ${session?.outputDescription}`}
        </Text>
      </Card>
      <PrimaryButton
        label="Attach Proof →"
        onPress={() => router.push({ pathname: "/proof", params: { missionId, sessionId: session?.id ?? "" } })}
      />
      <View style={{ height: 12 }} />
      <GhostButton label="Back to Today" onPress={() => router.push("/")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  input: { fontFamily: fonts.displayMedium, fontSize: 15, padding: 0 },
  timer: { fontFamily: fonts.mono, fontSize: 48, textAlign: "center", marginTop: 20, marginBottom: 6 },
  taskRecap: { fontFamily: fonts.displayMedium, fontSize: 13, textAlign: "center", marginBottom: 28 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
});
