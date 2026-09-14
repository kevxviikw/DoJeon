import { Tabs } from "expo-router";
import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { fonts } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";

function TodayIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z" />
    </Svg>
  );
}
function ForgeIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={10} cy={10} r={6} />
      <Circle cx={10} cy={10} r={2} />
    </Svg>
  );
}
function PushIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path d="M8 6l7 4-7 4V6z" fill={color} />
    </Svg>
  );
}
function ProofIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={10} cy={10} r={7} />
      <Path d="M7 10l2 2 4-4" />
    </Svg>
  );
}
function SquadIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={7} cy={7} r={2.5} />
      <Path d="M2.5 16a4.5 4.5 0 019 0M13 8a2.5 2.5 0 000-5M14.5 16a4.5 4.5 0 00-2.2-3.9" />
    </Svg>
  );
}

export default function TabsLayout() {
  const { t } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.hairline, borderTopWidth: 1, height: 82, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: ({ color }) => <TodayIcon color={String(color)} /> }} />
      <Tabs.Screen name="forge" options={{ title: "Forge", tabBarIcon: ({ color }) => <ForgeIcon color={String(color)} /> }} />
      <Tabs.Screen name="push" options={{ title: "Push", tabBarIcon: ({ color }) => <PushIcon color={String(color)} /> }} />
      <Tabs.Screen name="proof" options={{ title: "Proof", tabBarIcon: ({ color }) => <ProofIcon color={String(color)} /> }} />
      <Tabs.Screen name="squad" options={{ title: "Squad", tabBarIcon: ({ color }) => <SquadIcon color={String(color)} /> }} />
    </Tabs>
  );
}
