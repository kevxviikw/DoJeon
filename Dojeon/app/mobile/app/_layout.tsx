import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono";
import { CormorantGaramond_600SemiBold_Italic } from "@expo-google-fonts/cormorant-garamond";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/auth";
import { ProfileProvider, useProfile } from "../lib/profile";
import { ThemeProvider, useTheme } from "../lib/theme-context";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <ProfileProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { t } = useTheme();

  // Wait for the profile too once signed in -- otherwise the tabs flash
  // before we know whether onboarding is still needed.
  const loading = authLoading || (!!session && profileLoading);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) return null;

  const needsOnboarding = !!session && !profile?.username;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && needsOnboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !needsOnboarding}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="account" />
        <Stack.Screen name="find-people" />
      </Stack.Protected>
    </Stack>
  );
}
