import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import type { ThemeColors } from '@/theme';
import { eventDisplayDate, fetchOrganizerEvents, subscribeToOrganizerEvents } from '@/services/eventService';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { ErrorState, LoadingState, EmptyState } from '@/components/organizer/OrganizerStates';
import type { EventRow } from '@/types/organizer';

type StatusFilter = 'all' | 'active' | 'upcoming' | 'completed' | 'draft';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'draft', label: 'Draft' },
];

export function OrganizerEventsScreen({
  authUserId,
  onOpenEvent,
  tabBarHeight,
}: {
  authUserId: string;
  onOpenEvent: (eventId: number) => void;
  tabBarHeight: number;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesStatus = statusFilter === 'all' || (event.status || '').toLowerCase() === statusFilter;
      const matchesQuery =
        !query ||
        event.title.toLowerCase().includes(query) ||
        (event.location || '').toLowerCase().includes(query) ||
        (event.type || '').toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [events, search, statusFilter]);

  if (loading) {
    return (
      <View style={styles.stateWrap}>
        <LoadingState label="Loading your events..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateWrap}>
        <ErrorState message={error} onRetry={() => load()} />
      </View>
    );
  }

  return (
    <FlatList
      data={filteredEvents}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 40 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.blue} />}
      ListHeaderComponent={
        <View style={styles.filtersWrap}>
          <View style={[styles.searchRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search events by name, venue, or type"
              placeholderTextColor={colors.placeholder}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              accessibilityLabel="Search events"
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                <Feather name="x" size={15} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.chipRow}>
            {FILTERS.map((filter) => {
              const active = statusFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setStatusFilter(filter.key)}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    active && { backgroundColor: colors.blueLight, borderColor: colors.borderActive },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? colors.blue : colors.textSecondary }]}>{filter.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      }
      ListEmptyComponent={
        events.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No events yet"
            message="Events you create or manage on the FairPlay web app will appear here automatically."
          />
        ) : (
          <EmptyState icon="search" title="No events match your search" message="Try a different keyword or filter." />
        )
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => onOpenEvent(item.id)} accessibilityRole="button" accessibilityLabel={item.title}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <StatusBadge status={item.status} />
          </View>
          {item.type ? <Text style={styles.cardType}>{item.type}</Text> : null}
          <Text style={styles.cardMeta}>{eventDisplayDate(item)}</Text>
          {item.location ? (
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={11} color={colors.textMuted} />
              <Text style={styles.metaRowText}>{item.location}</Text>
            </View>
          ) : null}
          <View style={styles.footerRow}>
            <View style={styles.metaRow}>
              <Feather name="users" size={12} color={colors.textMuted} />
              <Text style={styles.metaRowText}>{item.participants || 0} participants</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </View>
        </Pressable>
      )}
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    stateWrap: {
      flex: 1,
      justifyContent: 'center',
    },
    listContent: {
      padding: 20,
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
    },
    filtersWrap: {
      marginBottom: 4,
      gap: 10,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 4,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    chip: {
      borderWidth: 1,
      borderRadius: radius.full,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '700',
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 12,
      gap: 4,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
    },
    cardType: {
      color: colors.blue,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    cardMeta: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    metaRowText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
  });
