import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppLogo } from '@/components/common/AppLogo';
import { useAppTheme } from '@/contexts/ThemeContext';

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrap}>
      <AppLogo width={117} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
});
