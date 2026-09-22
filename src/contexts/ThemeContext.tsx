import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, spacing, typography, type ThemeColors } from '@/theme';

type AppTheme = {
  colorScheme: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof spacing;
  typography: typeof typography;
};

const ThemeContext = createContext<AppTheme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Follows the phone's system theme (Settings > Display) and re-renders
  // automatically when the user switches it while the app is open.
  const systemScheme = useColorScheme();
  const colorScheme: 'light' | 'dark' = systemScheme === 'dark' ? 'dark' : 'light';

  const value = useMemo<AppTheme>(
    () => ({
      colorScheme,
      colors: colorScheme === 'dark' ? darkColors : lightColors,
      spacing,
      typography,
    }),
    [colorScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return theme;
}
