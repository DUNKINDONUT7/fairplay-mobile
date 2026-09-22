import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import type { ThemeColors } from '@/theme';
import { eventDisplayDate, fetchOrganizerEvents, subscribeToOrganizerEvents } from '@/services/eventService';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { ErrorState, LoadingState, EmptyState } from '@/components/organizer/OrganizerStates';
import type { EventRow } from '@/types/organizer';

type FeatherIconName = keyof typeof Feather.glyphMap;

export function OrganizerDashboardScreen({
  authUserId,
  organizerName,
  profileStatus,
  onOpenEvents,
  onOpenEvent,
  tabBarHeight,
}: {
  authUserId: string;
  organizerName: string;
  profileStatus?: string | null;
  onOpenEvents: () => void;
  onOpenEvent: (eventId: number) => void;
  tabBarHeight: number;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      setError('');

      try {
        const rows = await fetchOrganizerEvents(authUserId);
        setEvents(rows);
      } catch (err) {
        setError('Unable to load your events. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authUserId]
  );

  useEffect(() => {
    load();
    const unsubscribe = subscribeToOrganizerEvents(() => load());
    return unsubscribe;
  }, [load]);

  const stats = useMemo(() => {
    const upcoming = events.filter((event) => (event.status || '').toLowerCase() === 'upcoming').length;
    const active = events.filter((event) => (event.status || '').toLowerCase() === 'active').length;
    const completed = events.filter((event) => (event.status || '').toLowerCase() === 'completed').length;
    const totalParticipants = events.reduce((sum, event) => sum + (event.participants || 0), 0);

    return { total: events.length, upcoming, active, completed, totalParticipants };
  }, [events]);

  const recentEvents = events.slice(0, 4);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 40 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.blue} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Organizer</Text>
        <Text style={styles.heroTitle}>{organizerName}</Text>
        <Text style={styles.heroSubtitle}>Your events, participants, and judges, synced with the FairPlay web dashboard.</Text>
        {profileStatus && profileStatus.toLowerCase() === 'pending' ? (
          <View style={styles.pendingBanner}>
            <Feather name="clock" size={14} color={colors.amber} />
            <Text style={styles.pendingText}>Your organizer account is pending admin approval.</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <LoadingState label="Loading your events..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <>
          <View style={styles.statsGrid}>
            <StatTile icon="calendar" label="Total events" value={stats.total} tone="blue" colors={colors} />
            <StatTile icon="clock" label="Upcoming" value={stats.upcoming} tone="cyan" colors={colors} />
            <StatTile icon="zap" label="Active" value={stats.active} tone="green" colors={colors} />
            <StatTile icon="check-circle" label="Completed" value={stats.completed} tone="amber" colors={colors} />
          </View>

          <View style={[styles.totalParticipantsCard]}>
            <View style={styles.totalParticipantsIconWrap}>
              <Feather name="users" size={18} color={colors.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalParticipantsLabel}>Total participants across your events</Text>
              <Text style={styles.totalParticipantsValue}>{stats.totalParticipants}</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent events</Text>
            <Pressable onPress={onOpenEvents} accessibilityRole="button" accessibilityLabel="View all events">
              <Text style={styles.sectionLink}>View all</Text>
            </Pressable>
          </View>

          {recentEvents.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No events yet"
              message="Events you create or manage on the FairPlay web app will appear here automatically."
            />
          ) : (
            recentEvents.map((event) => (
              <Pressable key={event.id} style={styles.eventCard} onPress={() => onOpenEvent(event.id)}>
                <View style={styles.eventCardHeader}>
                  <Text style={styles.eventCardTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <StatusBadge status={event.status} />
                </View>
                <Text style={styles.eventCardMeta}>{eventDisplayDate(event)}</Text>
                <View style={styles.eventCardFooter}>
                  <Feather name="users" size={12} color={colors.textMuted} />
                  <Text style={styles.eventCardFooterText}>{event.participants || 0} participants</Text>
                </View>
              </Pressable>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
  colors,
}: {
  icon: FeatherIconName;
  label: string;
  value: number;
  tone: 'blue' | 'cyan' | 'green' | 'amber';
  colors: ThemeColors;
}) {
  const fg = colors[tone];
  const bg = colors[`${tone}Light` as 'blueLight'];

  return (
    <View style={[tileStyles.tile, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: fg }]}>
      <View style={[tileStyles.iconWrap, { backgroundColor: bg }]}>
        <Feather name={icon} size={14} color={fg} />
      </View>
      <Text style={[tileStyles.value, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[tileStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const tileStyles = StyleSheet.create({
  tile: {
    width: '48%',
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      padding: 20,
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 18,
      gap: 6,
    },
    heroEyebrow: {
      color: colors.cyan,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    heroTitle: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
    },
    heroSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    pendingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.amberLight,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.4)',
      padding: 10,
      marginTop: 6,
    },
    pendingText: {
      color: colors.textPrimary,
      fontSize: 12,
      flex: 1,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    totalParticipantsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 18,
    },
    totalParticipantsIconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: colors.blueLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    totalParticipantsLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    totalParticipantsValue: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      marginTop: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    sectionLink: {
      color: colors.blue,
      fontSize: 12,
      fontWeight: '700',
    },
    eventCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 10,
      gap: 6,
    },
    eventCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    eventCardTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
      flex: 1,
    },
    eventCardMeta: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    eventCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    eventCardFooterText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
  });
