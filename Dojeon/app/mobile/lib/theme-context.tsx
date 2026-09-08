import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { tokensFor, type ThemeTokens } from "./theme";

interface ThemeContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
  t: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // Starts from the system setting, then the in-app toggle (mirroring the
  // design canvas prototype) takes over for the rest of the session.
  const [darkMode, setDarkMode] = useState(systemScheme === "dark");

  const value = useMemo<ThemeContextValue>(
    () => ({
      darkMode,
      toggleDarkMode: () => setDarkMode((d) => !d),
      t: tokensFor(darkMode),
    }),
    [darkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return ctx;
}
