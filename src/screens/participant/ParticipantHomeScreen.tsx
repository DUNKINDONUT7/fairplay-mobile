import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppLogo } from '@/components/common/AppLogo';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import type { ThemeColors } from '@/theme';
import { eventDisplayDate } from '@/services/eventService';
import { fetchAllRegistrations, isMyRegistration, subscribeToAllRegistrations } from '@/services/participantService';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/organizer/OrganizerStates';
import { RegisterForEventScreen } from '@/screens/participant/RegisterForEventScreen';
import type { EventRow, RegistrationRow } from '@/types/organizer';

const HIDDEN_STATUSES = new Set(['draft', 'completed', 'rejected', 'archived']);

export function ParticipantHomeScreen({
  events,
  userEmail,
  userName,
  onSignOut,
}: {
  events: EventRow[];
  userEmail?: string | null;
  userName?: string | null;
  onSignOut?: () => Promise<void> | void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [registeringEvent, setRegisteringEvent] = useState<EventRow | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError('');
    try {
      const rows = await fetchAllRegistrations();
      setRegistrations(rows);
    } catch (err) {
      setError('Unable to load your registrations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = subscribeToAllRegistrations(() => load());
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myRegistrations = useMemo(
    () => registrations.filter((registration) => isMyRegistration(registration, userEmail, userName)),
    [registrations, userEmail, userName]
  );

  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  const browseEvents = useMemo(
    () => events.filter((event) => !HIDDEN_STATUSES.has((event.status || '').toLowerCase())),
    [events]
  );

  const registeredEventIds = useMemo(() => new Set(myRegistrations.map((registration) => registration.event_id)), [myRegistrations]);

  if (registeringEvent) {
    return (
      <RegisterForEventScreen
        event={registeringEvent}
        defaultName={userName}
        defaultEmail={userEmail}
        onBack={() => setRegisteringEvent(null)}
        onRegistered={() => load()}
      />
    );
  }

  return (
    <View style={styles.shell}>
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <AppLogo width={97} />
        <Pressable style={styles.iconButton} onPress={() => onSignOut?.()} accessibilityRole="button" accessibilityLabel="Sign out">
          <Feather name="log-out" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.blue} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>PARTICIPANT</Text>
          <Text style={styles.heroTitle}>{userName || 'Welcome'}</Text>
          <Text style={styles.heroSubtitle}>
            Events you've registered for, and events you can still join — synced live with the FairPlay web app.
          </Text>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>My Registrations</Text>
          {loading ? (
            <LoadingState label="Loading your registrations..." />
          ) : myRegistrations.length === 0 ? (
            <EmptyState
              icon="user-check"
              title="No registrations yet"
              message="Scan an event's registration QR code, or register from the FairPlay web app, to see it here."
            />
          ) : (
            myRegistrations.map((registration) => {
              const event = eventsById.get(registration.event_id);
              return (
                <View key={registration.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {event?.title || registration.team_name || registration.participant_name}
                    </Text>
                    <StatusBadge status={registration.status} />
                  </View>
                  {registration.team_name ? <Text style={styles.cardMeta}>{registration.participant_name}</Text> : null}
                  {event ? <Text style={styles.cardMeta}>{eventDisplayDate(event)}</Text> : null}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Browse Events</Text>
          {error ? (
            <ErrorState message={error} onRetry={() => load()} />
          ) : browseEvents.length === 0 ? (
            <EmptyState icon="calendar" title="No open events right now" message="Check back soon for new events from FairPlay organizers." />
          ) : (
            browseEvents.map((event) => {
              const isRegistered = registeredEventIds.has(event.id);
              const isFull = Boolean(event.max_participants) && (event.participants || 0) >= (event.max_participants || 0);

              return (
                <View key={event.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <StatusBadge status={event.status} />
                  </View>
                  {event.type ? <Text style={styles.cardType}>{event.type}</Text> : null}
                  <Text style={styles.cardMeta}>{eventDisplayDate(event)}</Text>
                  {event.location ? (
                    <View style={styles.metaRow}>
                      <Feather name="map-pin" size={11} color={colors.textMuted} />
                      <Text style={styles.metaRowText}>{event.location}</Text>
                    </View>
                  ) : null}

                  {isRegistered ? (
                    <View style={[styles.registeredPill, { backgroundColor: colors.greenLight }]}>
                      <Feather name="check-circle" size={12} color={colors.green} />
                      <Text style={[styles.registeredPillText, { color: colors.green }]}>Registered</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={[styles.registerButton, { backgroundColor: colors.blue }, isFull && { opacity: 0.5 }]}
                      onPress={() => !isFull && setRegisteringEvent(event)}
                      disabled={isFull}
                      accessibilityRole="button"
                      accessibilityLabel={`Register for ${event.title}`}
                    >
                      <Text style={styles.registerButtonText}>{isFull ? 'Event full' : 'Register'}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    shell: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    topBar: {
      paddingBottom: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.topBar,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      padding: 20,
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
      gap: 6,
    },
    heroLabel: {
      color: colors.blue,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
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
      marginTop: 4,
    },
    sectionWrap: {
      marginBottom: 20,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 10,
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
      fontSize: 15,
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
      marginTop: 2,
    },
    metaRowText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    registerButton: {
      borderRadius: radius.md,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    registerButtonText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    registeredPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      borderRadius: radius.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 10,
    },
    registeredPillText: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
  });
