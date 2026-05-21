import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadSettings, saveSettings } from './storage';
import { applyTheme, colors } from './theme';

const ThemeContext = createContext({ isDark: true, toggleTheme: () => {}, themeKey: 0 });

export function ThemeProvider({ children }) {
  const [isDark,    setIsDark]    = useState(true);
  const [themeKey,  setThemeKey]  = useState(0);

  useEffect(() => {
    loadSettings().then(s => {
      const dark = s.isDark !== false; // default dark
      applyTheme(dark);
      setIsDark(dark);
      setThemeKey(k => k + 1);
    });
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = !isDark;
    applyTheme(next);                       // mutate colors object
    setIsDark(next);
    setThemeKey(k => k + 1);               // force full remount so StyleSheet re-evaluates
    const s = await loadSettings();
    await saveSettings({ ...s, isDark: next });
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, themeKey }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
