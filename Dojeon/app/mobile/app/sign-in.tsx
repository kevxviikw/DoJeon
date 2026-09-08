import * as AppleAuthentication from "expo-apple-authentication";
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { Eyebrow, GhostButton, PrimaryButton } from "../components/ui";
import { useAuth } from "../lib/auth";
import { fonts } from "../lib/theme";
import { useTheme } from "../lib/theme-context";

type Method = "email" | "phone";

// Supabase wants E.164 ("+14155551234"). Accept the usual human spacing
// and strip it before sending.
const normalizePhone = (raw: string) => raw.replace(/[\s().-]/g, "");
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPhone = (v: string) => /^\+\d{7,15}$/.test(normalizePhone(v));

export default function SignInScreen() {
  const { signInWithApple, signInWithEmailOtp, verifyEmailOtp, signInWithPhoneOtp, verifyPhoneOtp } = useAuth();
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

  // --- OTP: alternative to Apple sign-in. Pick email or phone, get a
  // 6-digit code, verify it. Email needs custom SMTP on the Supabase
  // project; phone needs an SMS provider (see lib/auth.tsx). ---
  const [method, setMethod] = useState<Method>("email");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = method === "email" ? isValidEmail(identifier) : isValidPhone(identifier);
  const sentTo = method === "phone" ? normalizePhone(identifier) : identifier.trim();

  const switchMethod = (next: Method) => {
    if (next === method) return;
    setMethod(next);
    setIdentifier("");
    setCode("");
    setCodeSent(false);
    setError(null);
  };

  const handleSendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      if (method === "email") await signInWithEmailOtp(sentTo);
      else await signInWithPhoneOtp(sentTo);
      setCodeSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError(null);
    setLoading(true);
    try {
      if (method === "email") await verifyEmailOtp(sentTo, code.trim());
      else await verifyPhoneOtp(sentTo, code.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={[styles.wordmark, { color: t.text }]}>DoJeon</Text>
          <Text style={[styles.slogan, { color: t.muted }]}>
            Challenge Everything, <Text style={{ color: t.accent }}>Fear Nothing.</Text>
          </Text>

          <View style={styles.spacer} />

          {appleAvailable ? (
            <>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={999}
                style={styles.appleButton}
                onPress={handleApple}
              />
              <View style={styles.dividerRow}>
                <View style={[styles.divider, { backgroundColor: t.hairline }]} />
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: t.muted }}>OR</Text>
                <View style={[styles.divider, { backgroundColor: t.hairline }]} />
              </View>
            </>
          ) : null}

          {!codeSent ? (
            <>
              <View style={[styles.segment, { borderColor: t.hairline }]}>
                {(["email", "phone"] as Method[]).map((m) => {
                  const active = method === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => switchMethod(m)}
                      style={[styles.segmentItem, active && { backgroundColor: t.accent }]}
                    >
                      <Text
                        style={[
                          styles.segmentLabel,
                          { color: active ? t.onAccent : t.muted },
                        ]}
                      >
                        {m === "email" ? "EMAIL" : "PHONE"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ height: 20 }} />

              <Eyebrow>{method === "email" ? "Email" : "Phone number"}</Eyebrow>
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder={method === "email" ? "you@example.com" : "+1 415 555 1234"}
                placeholderTextColor={t.muted}
                autoCapitalize="none"
                autoComplete={method === "email" ? "email" : "tel"}
                keyboardType={method === "email" ? "email-address" : "phone-pad"}
                style={[styles.input, { color: t.text, borderBottomColor: t.hairline }]}
              />
              <View style={{ height: 16 }} />
              <PrimaryButton label="Send Code" loading={loading} disabled={!valid} onPress={handleSendCode} />
            </>
          ) : (
            <>
              <Eyebrow>{`Code sent to ${sentTo}`}</Eyebrow>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={t.muted}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                style={[styles.input, { color: t.text, borderBottomColor: t.hairline }]}
              />
              <View style={{ height: 16 }} />
              <PrimaryButton label="Verify" loading={loading} disabled={code.length < 6} onPress={handleVerifyCode} />
              <View style={{ height: 12 }} />
              <GhostButton
                label={method === "email" ? "Use a different email" : "Use a different number"}
                onPress={() => {
                  setCodeSent(false);
                  setCode("");
                  setError(null);
                }}
              />
            </>
          )}

          {error ? <Text style={[styles.error, { color: t.alert }]}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
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
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 },
  divider: { flex: 1, height: 1 },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 999, padding: 3 },
  segmentItem: { flex: 1, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  segmentLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2 },
  input: { fontFamily: fonts.displayMedium, fontSize: 16, borderBottomWidth: 1, paddingVertical: 10, marginTop: 8 },
  error: { marginTop: 16, fontFamily: fonts.mono, fontSize: 12 },
});
