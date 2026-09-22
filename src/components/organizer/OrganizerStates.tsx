import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.centerBlock}>
      <ActivityIndicator size="small" color={colors.blue} />
      <Text style={[styles.stateText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.centerBlock}>
      <Feather name="alert-circle" size={22} color={colors.red} />
      <Text style={[styles.stateText, { color: colors.textPrimary }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.blue }]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={[styles.retryText, { color: colors.white }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Feather name={icon} size={22} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{title}</Text>
      {message ? <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.blueLight, borderColor: colors.borderActive }]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.actionText, { color: colors.blue }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centerBlock: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  stateText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 4,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  actionButton: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
