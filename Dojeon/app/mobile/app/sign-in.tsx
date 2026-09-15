import * as AppleAuthentication from "expo-apple-authentication";
import React, { useEffect, useState } from "react";
import { Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../lib/auth";
import { fonts } from "../lib/theme";
import { useTheme } from "../lib/theme-context";

// Club presentation amendment (2026-09-15): Apple-only for now -- email
// and phone OTP sign-in are commented out below, not deleted. All the
// backend infrastructure for them is untouched and still live (Resend
// SMTP, Twilio, the Supabase Auth providers, lib/auth.tsx's
// signInWithEmailOtp/verifyEmailOtp/signInWithPhoneOtp/verifyPhoneOtp) --
// this is purely a UI-visibility change. Uncomment the block below (and
// restore the imports it needs) to bring them back.
//
// import { KeyboardAvoidingView, Pressable, TextInput } from "react-native";
// import { Eyebrow, GhostButton, PrimaryButton, Tag } from "../components/ui";
// type Method = "email" | "phone";
// const normalizePhone = (raw: string) => raw.replace(/[\s().-]/g, "");
// const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
// const isValidPhone = (v: string) => /^\+\d{7,15}$/.test(normalizePhone(v));

export default function SignInScreen() {
  const { signInWithApple } = useAuth();
  const { t } = useTheme();
  const [error, setError] = useState<string | null>(null);

  // Apple requires the button be shown only where Sign in with Apple is
  // actually available -- iOS 13+, device signed into an Apple ID. Check
  // at runtime rather than assuming from Platform.OS.
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const handleApple = async () => {
    setError(null);
    try {
      await signInWithApple();
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "ERR_REQUEST_CANCELED") return;
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={styles.content}>
        <Text style={[styles.wordmark, { color: t.text }]}>DoJeon</Text>
        <Text style={[styles.slogan, { color: t.muted }]}>
          Challenge Everything, <Text style={{ color: t.accent }}>Fear Nothing.</Text>
        </Text>

        <View style={styles.spacer} />

        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={999}
            style={styles.appleButton}
            onPress={handleApple}
          />
        ) : (
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 13, color: t.muted, textAlign: "center" }}>
            Sign in with Apple isn't available on this device.
          </Text>
        )}

        {error ? <Text style={[styles.error, { color: t.alert }]}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  wordmark: { fontFamily: fonts.displayBold, fontWeight: "700", fontSize: 64, letterSpacing: -2.6, lineHeight: 64, marginBottom: 8 },
  slogan: { fontFamily: fonts.serifItalic, fontSize: 18 },
  spacer: { height: 48 },
  appleButton: { width: "100%", height: 50 },
  error: { marginTop: 16, fontFamily: fonts.mono, fontSize: 12, textAlign: "center" },
});
