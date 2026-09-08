// Shared building blocks matching the IC tone-and-manner guide -- the
// same visual vocabulary as the earlier design-canvas mockup, now as real
// React Native components. Keep new screens built out of these rather
// than one-off styles, so the whole app stays consistent with the manual.

import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fonts } from "../lib/theme";
import { useTheme } from "../lib/theme-context";

export function Eyebrow({ children, color }: { children: string; color?: string }) {
  const { t } = useTheme();
  return (
    <Text style={[styles.eyebrow, { color: color ?? t.muted }]} numberOfLines={1}>
      {children.toUpperCase()}
    </Text>
  );
}

export function Tag({ children, color }: { children: string; color?: string }) {
  const { t } = useTheme();
  return (
    <Text style={[styles.tag, { color: color ?? t.muted }]} numberOfLines={1}>
      {children.toUpperCase()}
    </Text>
  );
}

export function Title({ children, size = 34 }: { children: string; size?: number }) {
  const { t } = useTheme();
  return (
    <Text style={[styles.title, { color: t.text, fontSize: size, letterSpacing: -size * 0.035 }]}>{children}</Text>
  );
}

export function SerifAccent({ children }: { children: string }) {
  const { t } = useTheme();
  return <Text style={[styles.serif, { color: t.muted }]}>— {children}</Text>;
}

export function Card({ children, style, borderColor }: { children: React.ReactNode; style?: ViewStyle; borderColor?: string }) {
  const { t } = useTheme();
  return <View style={[styles.card, { backgroundColor: t.surface, borderColor: borderColor ?? t.hairline }, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: t.accent, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={t.onAccent} /> : <Text style={[styles.btnLabel, { color: t.onAccent }]}>{label}</Text>}
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btnGhost, { borderColor: t.hairline, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.btnLabel, { color: t.text, fontSize: 13 }]}>{label}</Text>
    </Pressable>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { toggleDarkMode, darkMode, t } = useTheme();
  return (
    <View>
      <View style={styles.headerRow}>
        <Eyebrow>DoJeon</Eyebrow>
        <Pressable onPress={toggleDarkMode} style={[styles.themeToggle, { borderColor: t.hairline }]}>
          <Svg width={13} height={13} viewBox="0 0 20 20" fill="none" stroke={t.muted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Path
              d={
                darkMode
                  ? "M13.5 3.5a7 7 0 100 14 7.6 7.6 0 01-6-3.6A7.6 7.6 0 0113.5 3.5z"
                  : "M10 4v2M10 14v2M4 10h2M14 10h2M6.3 6.3l1.4 1.4M12.3 12.3l1.4 1.4M6.3 13.7l1.4-1.4M12.3 7.7l1.4-1.4M10 7a3 3 0 100 6 3 3 0 000-6z"
              }
            />
          </Svg>
        </Pressable>
      </View>
      <Title>{title}</Title>
      {subtitle ? <SerifAccent>{subtitle}</SerifAccent> : null}
    </View>
  );
}

export function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.switchTrack, { backgroundColor: on ? t.accent : t.hairline }]}
    >
      <View style={[styles.switchKnob, { left: on ? 20 : 2 }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2 },
  tag: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1 },
  title: { fontFamily: fonts.displayBold, fontWeight: "700" },
  serif: { fontFamily: fonts.serifItalic, fontSize: 16, marginTop: 4, marginBottom: 20 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16 },
  btn: { height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  btnGhost: { height: 48, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btnLabel: { fontFamily: fonts.displayBold, fontSize: 14, fontWeight: "600" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  themeToggle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  switchTrack: { width: 40, height: 22, borderRadius: 11, justifyContent: "center" },
  switchKnob: { position: "absolute", top: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF" },
});
