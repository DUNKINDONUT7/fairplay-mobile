export type ThemeColors = {
  bg: string;
  topBar: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderActive: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  inputBackground: string;
  placeholder: string;
  overlay: string;
  disabled: string;
  blue: string;
  blueLight: string;
  cyan: string;
  cyanLight: string;
  green: string;
  greenLight: string;
  amber: string;
  amberLight: string;
  red: string;
  redLight: string;
  white: string;
};

// Brand accent colors mirror the FairPlay web app (src/styles/globals.css /
// variables.css) and stay the same across both themes.
const brand = {
  blue: '#2563EB',
  cyan: '#0891B2',
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',
};

export const lightColors: ThemeColors = {
  bg: '#FFFFFF',
  topBar: 'rgba(255, 255, 255, 0.96)',
  surface: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  borderActive: 'rgba(37, 99, 235, 0.35)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  inputBackground: '#F8FAFC',
  placeholder: '#94A3B8',
  overlay: 'rgba(15, 23, 42, 0.55)',
  disabled: 'rgba(100, 116, 139, 0.35)',
  blue: brand.blue,
  blueLight: 'rgba(37, 99, 235, 0.10)',
  cyan: brand.cyan,
  cyanLight: 'rgba(8, 145, 178, 0.10)',
  green: brand.green,
  greenLight: 'rgba(34, 197, 94, 0.12)',
  amber: brand.amber,
  amberLight: 'rgba(245, 158, 11, 0.12)',
  red: brand.red,
  redLight: 'rgba(239, 68, 68, 0.12)',
  white: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  bg: '#0A1120',
  topBar: 'rgba(10, 17, 32, 0.96)',
  surface: '#141F35',
  surfaceAlt: '#101A2E',
  border: 'rgba(148, 163, 184, 0.14)',
  borderActive: 'rgba(37, 99, 235, 0.45)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  inputBackground: '#141F35',
  placeholder: '#64748B',
  overlay: 'rgba(5, 9, 18, 0.96)',
  disabled: 'rgba(148, 163, 184, 0.4)',
  blue: brand.blue,
  blueLight: 'rgba(37, 99, 235, 0.16)',
  cyan: brand.cyan,
  cyanLight: 'rgba(8, 145, 178, 0.16)',
  green: brand.green,
  greenLight: 'rgba(34, 197, 94, 0.16)',
  amber: brand.amber,
  amberLight: 'rgba(245, 158, 11, 0.16)',
  red: brand.red,
  redLight: 'rgba(239, 68, 68, 0.16)',
  white: '#FFFFFF',
};
