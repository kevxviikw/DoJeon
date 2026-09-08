// IC (Infinite Challenge) tone-and-manner tokens, ported directly from
// ic-tone-and-manner-toggle.html -- this is the club's actual brand guide,
// not a placeholder palette. Keep these values in sync with that file by
// hand if the guide changes.

export const lightTokens = {
  bg: "#F6F6F3",
  surface: "#FFFFFF",
  text: "#101114",
  muted: "rgba(16,17,20,0.62)",
  hairline: "rgba(16,17,20,0.12)",
  accent: "#378ADD",
  accentHover: "#85B7EB",
  alert: "#C7373C",
  onAccent: "#FFFFFF",
};

export const darkTokens = {
  bg: "#0A0A0A",
  surface: "#141414",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.6)",
  hairline: "rgba(255,255,255,0.14)",
  accent: "#3F9FFF",
  accentHover: "#8FBFFF",
  alert: "#E5484D",
  onAccent: "#FFFFFF",
};

export type ThemeTokens = typeof lightTokens;

export function tokensFor(darkMode: boolean): ThemeTokens {
  return darkMode ? darkTokens : lightTokens;
}

// Font family names as registered by useFonts() in app/_layout.tsx.
export const fonts = {
  displayBold: "SpaceGrotesk_700Bold",
  displayMedium: "SpaceGrotesk_500Medium",
  mono: "JetBrainsMono_500Medium",
  monoSemiBold: "JetBrainsMono_600SemiBold",
  serifItalic: "CormorantGaramond_600SemiBold_Italic",
};

// RN's `letterSpacing` is absolute px, not em-relative, so the manual's
// em-based tracking (-0.03~-0.04em display, 0.18-0.22em mono) is
// hand-tuned per font size at each call site instead of a shared formula.
