import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';

const STATUS_TONE: Record<string, 'blue' | 'green' | 'amber' | 'red'> = {
  active: 'green',
  approved: 'green',
  upcoming: 'blue',
  draft: 'amber',
  pending: 'amber',
  completed: 'blue',
  rejected: 'red',
  revoked: 'red',
  claimed: 'green',
  assigned: 'blue',
};

export function StatusBadge({ status }: { status?: string | null }) {
  const { colors } = useAppTheme();
  const key = (status || 'draft').toLowerCase();
  const tone = STATUS_TONE[key] || 'blue';
  const fg = colors[tone];
  const bg = colors[`${tone}Light` as 'blueLight'];
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
