import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Card, Eyebrow, GhostButton, PrimaryButton, ScreenHeader, Tag, ToggleSwitch } from "../../components/ui";
import { submitCheckin } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useActiveMission } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { fonts } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";
import type { CheckinSubmitResponse, Tier } from "../../lib/types";

type EvidenceType = "photo" | "voice" | "count";

// Same tier vocabulary as Forge -- this is where a member reports which
// tier of the plan they actually hit today (tierHit on the checkin row).
// Forge only ever shows the three tiers as reference; nothing commits to
// one until check-in.
const TIER_ORDER: Tier[] = ["minimum", "target", "stretch"];
const TIER_LABEL: Record<Tier, string> = { minimum: "Minimum", target: "Target", stretch: "Stretch" };

export default function ProofScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ missionId?: string; sessionId?: string }>();
  const { mission } = useActiveMission();
  const missionId = params.missionId ?? mission?.id ?? null;
  const isSquadMission = !!mission?.squadId;

  const [tierHit, setTierHit] = useState<Tier | null>(null);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("photo");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>("image/jpeg");
  const [filePrivate, setFilePrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinSubmitResponse | null>(null);

  // One tap on the card opens the camera directly -- evidence should be a
  // photo taken right now, not an old one pulled from the library. Picking
  // from the library is still available as a smaller, secondary action.
  const handleTakePhoto = async () => {
    setError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Camera access is needed to attach evidence. Enable it in Settings.");
      return;
    }
    const taken = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (taken.canceled || !taken.assets?.[0]) return;
    setPhotoUri(taken.assets[0].uri);
    setPhotoMime(taken.assets[0].mimeType ?? "image/jpeg");
  };

  // No permission request needed here -- launchImageLibraryAsync uses
  // Apple's PHPickerViewController on modern iOS, which is privacy-
  // preserving by design and needs no app-level grant (the library docs
  // say MEDIA_LIBRARY is only required on iOS 10). Gating this behind
  // requestMediaLibraryPermissionsAsync(), like the old UIImagePicker
  // flow needed, was the actual bug -- that call has nothing backing it
  // in this build and was always coming back denied.
  const handlePickFromLibrary = async () => {
    setError(null);
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    setPhotoUri(picked.assets[0].uri);
    setPhotoMime(picked.assets[0].mimeType ?? "image/jpeg");
  };

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
      // Voice and count evidence are still UI-only stubs (no recorder or
      // input wired up) -- only "photo" actually has something to upload.
      let fileUrl: string | null = null;
      if (evidenceType === "photo" && photoUri) {
        if (!session?.user?.id) throw new Error("Not signed in.");
        const ext = photoMime.split("/")[1] || "jpg";
        const path = `${session.user.id}/${missionId}-${Date.now()}.${ext}`;
        // Expo's fetch polyfill supports arrayBuffer() on file:// URIs --
        // this is Supabase's own documented RN upload pattern, no extra
        // base64 conversion package needed.
        const arraybuffer = await fetch(photoUri).then((res) => res.arrayBuffer());
        const { error: uploadError } = await supabase.storage
          .from("evidence")
          .upload(path, arraybuffer, { contentType: photoMime });
        if (uploadError) throw new Error(`Could not upload photo: ${uploadError.message}`);
        fileUrl = path;
      }

      const response = await submitCheckin({
        missionId,
        sessionId: params.sessionId || undefined,
        taskCompleted: true,
        evidenceSubmitted: evidenceType === "photo" ? !!fileUrl : true,
        tierHit,
        fileUrl,
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
          <SummaryRow label="Tier Hit" value={result.checkin.tierHit ? TIER_LABEL[result.checkin.tierHit] : "—"} />
          <SummaryRow label="Evidence" value={result.checkin.evidenceTrustLabel.replace("_", " ")} />
          <SummaryRow label="File" value={result.checkin.filePrivate ? "Private" : "Shared"} />
          <SummaryRow label="Status" value={statusLine} valueColor={t.accent} last />
        </Card>

        <GhostButton label="Back to Today" onPress={() => router.push("/")} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <ScreenHeader title="Proof" subtitle="evidence, not a checkbox" />

      <Eyebrow>Tier hit</Eyebrow>
      <View style={[styles.segmentRow, { marginTop: 8 }]}>
        {TIER_ORDER.map((tier) => {
          const hours = mission?.tiers[tier]?.hours;
          const active = tierHit === tier;
          return (
            <Pressable
              key={tier}
              onPress={() => setTierHit(tier)}
              style={[
                styles.segment,
                active ? { backgroundColor: t.accent } : { backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline },
              ]}
            >
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: 12, color: active ? t.onAccent : t.text }}>
                {TIER_LABEL[tier]}
              </Text>
              {hours !== undefined ? (
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, marginTop: 2, color: active ? t.onAccent : t.muted }}>
                  {hours} hrs
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 22 }} />

      <Eyebrow>Evidence</Eyebrow>
      <View style={[styles.segmentRow, { marginTop: 8 }]}>
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

      {evidenceType === "photo" ? (
        <>
          <Pressable onPress={handleTakePhoto}>
            <Card style={{ height: 96, marginBottom: 8, alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 0 }}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : (
                <Text style={{ fontFamily: fonts.displayMedium, fontSize: 12, color: t.muted }}>Tap to take a photo</Text>
              )}
            </Card>
          </Pressable>
          <Pressable onPress={handlePickFromLibrary} style={{ marginBottom: 8 }}>
            <Tag color={t.muted}>{photoUri ? "Choose a different photo from library instead" : "Or choose from library"}</Tag>
          </Pressable>
        </>
      ) : (
        <Card style={{ height: 96, marginBottom: 8, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 12, color: t.muted }}>
            {{ voice: "Tap to record a voice note", count: "Enter a count or duration" }[evidenceType]}
          </Text>
        </Card>
      )}

      {evidenceType === "photo" && photoUri ? (
        <Pressable onPress={() => setPhotoUri(null)} style={{ marginBottom: 4 }}>
          <Tag color={t.muted}>Remove photo</Tag>
        </Pressable>
      ) : null}

      {evidenceType === "photo" ? (
        <Tag color={photoUri ? t.accent : t.muted}>{photoUri ? "Evidence: Attached" : "Evidence: Not attached yet"}</Tag>
      ) : (
        <Tag color={t.muted}>{`Evidence: Not available yet for ${evidenceType}`}</Tag>
      )}

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
      <PrimaryButton
        label="Submit Check-in"
        loading={loading}
        disabled={!tierHit || (evidenceType === "photo" && !photoUri)}
        onPress={handleSubmit}
      />
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
