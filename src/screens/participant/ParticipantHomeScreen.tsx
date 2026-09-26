import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { AppLogo } from '@/components/common/AppLogo';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import type { ThemeColors } from '@/theme';
import { eventDisplayDate } from '@/services/eventService';
import { fetchAllRegistrations, isMyRegistration, subscribeToAllRegistrations } from '@/services/participantService';
import { fetchAttendanceForEvents, isCheckedIn } from '@/services/attendanceService';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/organizer/OrganizerStates';
import { RegisterForEventScreen } from '@/screens/participant/RegisterForEventScreen';
import { ProfileScreen } from '@/screens/participant/ProfileScreen';
import type { ProfileRow } from '@/services/profileService';
import { useLiveRefresh } from '@/utils/liveRefresh';
import type { AttendanceRow, EventRow, RegistrationRow } from '@/types/organizer';

const HIDDEN_STATUSES = new Set(['draft', 'completed', 'rejected', 'archived']);
type HomeTab = 'events' | 'history';

export function ParticipantHomeScreen({
  events,
  authUserId,
  userEmail,
  userName,
  profile,
  onSignOut,
  onProfileUpdated,
}: {
  events: EventRow[];
  authUserId: string;
  userEmail?: string | null;
  userName?: string | null;
  profile?: ProfileRow | null;
  onSignOut?: () => Promise<void> | void;
  onProfileUpdated?: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [registeringEvent, setRegisteringEvent] = useState<EventRow | null>(null);
  const [homeTab, setHomeTab] = useState<HomeTab>('events');
  const [expandedRegId, setExpandedRegId] = useState<number | null>(null);
  const [showProfile, setShowProfile] = useState(false);

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

  useLiveRefresh(load);

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

  const myEventIdsKey = Array.from(registeredEventIds).sort().join(',');

  useEffect(() => {
    const eventIds = myEventIdsKey ? myEventIdsKey.split(',').map(Number) : [];
    if (eventIds.length === 0) {
      setAttendanceRows([]);
      return;
    }

    let isMounted = true;
    fetchAttendanceForEvents(eventIds)
      .then((rows) => {
        if (isMounted) setAttendanceRows(rows);
      })
      .catch(() => {
        if (isMounted) setAttendanceRows([]);
      });

    return () => {
      isMounted = false;
    };
  }, [myEventIdsKey]);

  // Splits registrations by whether their event has wrapped up, so a
  // finished event doesn't keep cluttering "My Registrations" and instead
  // shows up in History with its final status.
  const { activeRegistrations, pastRegistrations } = useMemo(() => {
    const active: RegistrationRow[] = [];
    const past: RegistrationRow[] = [];

    myRegistrations.forEach((registration) => {
      const event = eventsById.get(registration.event_id);
      const isPast = (event?.status || '').toLowerCase() === 'completed';
      (isPast ? past : active).push(registration);
    });

    return { activeRegistrations: active, pastRegistrations: past };
  }, [myRegistrations, eventsById]);

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

  if (showProfile) {
    return (
      <ProfileScreen
        authUserId={authUserId}
        email={userEmail}
        profile={profile ?? null}
        onBack={() => setShowProfile(false)}
        onSaved={() => onProfileUpdated?.()}
      />
    );
  }

  return (
    <View style={styles.shell}>
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <AppLogo width={97} />
        <View style={styles.topActions}>
          <Pressable style={styles.iconButton} onPress={() => setShowProfile(true)} accessibilityRole="button" accessibilityLabel="My profile">
            <Feather name="user" size={18} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => onSignOut?.()} accessibilityRole="button" accessibilityLabel="Sign out">
            <Feather name="log-out" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
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

        <View style={styles.tabRow}>
          {(
            [
              { key: 'events' as const, label: 'Events' },
              { key: 'history' as const, label: 'History' },
            ]
          ).map((tab) => {
            const active = homeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setHomeTab(tab.key)}
                style={[
                  styles.tabChip,
                  { borderColor: colors.border },
                  active && { backgroundColor: colors.blueLight, borderColor: colors.borderActive },
                ]}
              >
                <Text style={[styles.tabChipText, { color: active ? colors.blue : colors.textSecondary }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {homeTab === 'events' ? (
          <>
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>My Registrations</Text>
              {loading ? (
                <LoadingState label="Loading your registrations..." />
              ) : activeRegistrations.length === 0 ? (
                <EmptyState
                  icon="user-check"
                  title="No registrations yet"
                  message="Scan an event's registration QR code, or register from the FairPlay web app, to see it here."
                />
              ) : (
                activeRegistrations.map((registration) => {
                  const event = eventsById.get(registration.event_id);
                  const expanded = expandedRegId === registration.id;
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

                      <Pressable
                        onPress={() => setExpandedRegId(expanded ? null : registration.id)}
                        style={styles.qrToggle}
                        accessibilityRole="button"
                        accessibilityLabel={expanded ? 'Hide check-in QR code' : 'Show check-in QR code'}
                      >
                        <Feather name="maximize" size={12} color={colors.blue} />
                        <Text style={[styles.qrToggleText, { color: colors.blue }]}>
                          {expanded ? 'Hide check-in QR' : 'Show check-in QR'}
                        </Text>
                      </Pressable>

                      {expanded ? (
                        registration.individual_details?.qrToken ? (
                          <View style={styles.qrWrap}>
                            <View style={[styles.qrCard, { backgroundColor: colors.white }]}>
                              <QRCode
                                value={registration.individual_details.qrToken}
                                size={140}
                                backgroundColor={colors.white}
                                color="#0F172A"
                              />
                            </View>
                            <Text style={[styles.qrHint, { color: colors.textSecondary }]}>
                              {isCheckedIn(registration, attendanceRows)
                                ? "You're checked in for this event."
                                : 'Show this to event staff to check in on-site.'}
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.qrHint, { color: colors.textMuted, marginTop: 10 }]}>
                            Check-in QR is not available for this registration.
                          </Text>
                        )
                      ) : null}
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
          </>
        ) : (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>History</Text>
            {loading ? (
              <LoadingState label="Loading your history..." />
            ) : pastRegistrations.length === 0 ? (
              <EmptyState icon="clock" title="No past events yet" message="Events you've registered for will show up here once they're completed." />
            ) : (
              pastRegistrations.map((registration) => {
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
                    {event?.location ? (
                      <View style={styles.metaRow}>
                        <Feather name="map-pin" size={11} color={colors.textMuted} />
                        <Text style={styles.metaRowText}>{event.location}</Text>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <Feather
                        name={isCheckedIn(registration, attendanceRows) ? 'check-circle' : 'circle'}
                        size={12}
                        color={isCheckedIn(registration, attendanceRows) ? colors.green : colors.textMuted}
                      />
                      <Text
                        style={{
                          color: isCheckedIn(registration, attendanceRows) ? colors.green : colors.textMuted,
                          fontSize: 11,
                          fontWeight: '700',
                        }}
                      >
                        {isCheckedIn(registration, attendanceRows) ? 'Attended (checked in)' : 'Not checked in'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
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
    topActions: {
      flexDirection: 'row',
      gap: 8,
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
    tabRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 18,
    },
    tabChip: {
      borderWidth: 1,
      borderRadius: radius.full,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    tabChipText: {
      fontSize: 12,
      fontWeight: '700',
    },
    qrToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    qrToggleText: {
      fontSize: 12,
      fontWeight: '700',
    },
    qrWrap: {
      alignItems: 'center',
      marginTop: 12,
      gap: 8,
    },
    qrCard: {
      padding: 12,
      borderRadius: radius.lg,
    },
    qrHint: {
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 16,
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
