import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import type { ThemeColors } from '@/theme';
import { eventDisplayDate, fetchEventById } from '@/services/eventService';
import {
  deleteJudgeInvite,
  fetchJudgeAssignments,
  fetchJudgeInvites,
  fetchJudgesByIds,
  inviteJudgeByEmail,
  revokeJudgeAssignment,
  revokeJudgeInvite,
  subscribeToJudgeData,
} from '@/services/judgeService';
import { checkedInAt, fetchRegistrations, isCheckedIn, subscribeToRegistrations } from '@/services/participantService';
import { computeJudgeProgress, fetchScoresForEvent, subscribeToScores } from '@/services/scoringService';
import { judgeAccessQRValue, participantRegistrationQRValue, spectatorViewQRValue } from '@/services/qrService';
import { fetchTournaments, subscribeToTournaments } from '@/services/bracketService';
import { exportEventResults } from '@/services/resultsExportService';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { QRCard } from '@/components/organizer/QRCard';
import { ErrorState, LoadingState, EmptyState } from '@/components/organizer/OrganizerStates';
import { CheckInScannerScreen } from '@/screens/organizer/CheckInScannerScreen';
import { isValidEmail } from '@/utils/validation';
import { useLiveRefresh } from '@/utils/liveRefresh';
import type {
  EventRow,
  JudgeAssignmentRow,
  JudgeInviteRow,
  JudgeRow,
  RegistrationRow,
  ScoreRow,
  TournamentMatch,
  TournamentRow,
} from '@/types/organizer';

type DetailTab = 'overview' | 'participants' | 'judges' | 'scoring' | 'bracket';

const TABS: { key: DetailTab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'overview', label: 'Overview', icon: 'info' },
  { key: 'participants', label: 'Participants', icon: 'users' },
  { key: 'judges', label: 'Judges', icon: 'shield' },
  { key: 'scoring', label: 'Scoring', icon: 'bar-chart-2' },
  { key: 'bracket', label: 'Bracket', icon: 'git-branch' },
];

export function EventDetailsScreen({ eventId, onBack, tabBarHeight }: { eventId: number; onBack: () => void; tabBarHeight: number }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [event, setEvent] = useState<EventRow | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [assignments, setAssignments] = useState<JudgeAssignmentRow[]>([]);
  const [judges, setJudges] = useState<JudgeRow[]>([]);
  const [invites, setInvites] = useState<JudgeInviteRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      setError('');

      try {
        const [eventRow, registrationRows, assignmentRows, inviteRows, scoreRows, tournamentRows] = await Promise.all([
          fetchEventById(eventId),
          fetchRegistrations(eventId),
          fetchJudgeAssignments(eventId),
          fetchJudgeInvites(eventId),
          fetchScoresForEvent(eventId),
          fetchTournaments(eventId),
        ]);

        setEvent(eventRow);
        setRegistrations(registrationRows);
        setAssignments(assignmentRows);
        setInvites(inviteRows);
        setScores(scoreRows);
        setTournaments(tournamentRows);

        const judgeIds = assignmentRows.map((assignment) => assignment.judge_id);
        setJudges(judgeIds.length ? await fetchJudgesByIds(judgeIds) : []);
      } catch (err) {
        setError('Unable to load event details. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    load();
    const unsubscribeJudges = subscribeToJudgeData(eventId, () => load());
    const unsubscribeRegistrations = subscribeToRegistrations(eventId, () => load());
    const unsubscribeScores = subscribeToScores(eventId, () => load());
    const unsubscribeTournaments = subscribeToTournaments(eventId, () => load());

    return () => {
      unsubscribeJudges();
      unsubscribeRegistrations();
      unsubscribeScores();
      unsubscribeTournaments();
    };
  }, [eventId, load]);

  useLiveRefresh(load);

  const judgeProgress = useMemo(
    () => (event ? computeJudgeProgress(event, assignments, judges, scores) : []),
    [event, assignments, judges, scores]
  );

  const handleExportResults = async () => {
    if (!event || exporting) return;
    setExporting(true);
    const result = await exportEventResults({ event, tournaments, scores });
    setExporting(false);

    if (!result.success) {
      Alert.alert('Export failed', result.error || 'Unable to export results. Please try again.');
    }
  };

  if (scannerOpen) {
    return (
      <CheckInScannerScreen
        registrations={registrations}
        onClose={() => setScannerOpen(false)}
        onCheckedIn={() => load()}
      />
    );
  }

  return (
    <View style={styles.shell}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to events"
        >
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {event?.title || 'Event details'}
        </Text>
        <Pressable
          onPress={handleExportResults}
          disabled={exporting || !event}
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Export event results"
        >
          {exporting ? <ActivityIndicator size="small" color={colors.blue} /> : <Feather name="share" size={16} color={colors.textPrimary} />}
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabButton, active && { backgroundColor: colors.blueLight, borderColor: colors.borderActive }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Feather name={tab.icon} size={14} color={active ? colors.blue : colors.textSecondary} />
              <Text style={[styles.tabButtonText, { color: active ? colors.blue : colors.textSecondary }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <LoadingState label="Loading event details..." />
      ) : error || !event ? (
        <ErrorState message={error || 'Event not found.'} onRetry={() => load()} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.blue} />}
        >
          {activeTab === 'overview' && <OverviewTab event={event} judgeCount={assignments.length} colors={colors} />}
          {activeTab === 'participants' && (
            <ParticipantsTab
              event={event}
              registrations={registrations}
              colors={colors}
              onOpenScanner={() => setScannerOpen(true)}
            />
          )}
          {activeTab === 'judges' && (
            <JudgesTab event={event} assignments={assignments} judges={judges} invites={invites} colors={colors} onChanged={() => load()} />
          )}
          {activeTab === 'scoring' && <ScoringTab event={event} progress={judgeProgress} colors={colors} />}
          {activeTab === 'bracket' && <BracketTab tournaments={tournaments} colors={colors} />}
        </ScrollView>
      )}
    </View>
  );
}

function OverviewTab({ event, judgeCount, colors }: { event: EventRow; judgeCount: number; colors: ThemeColors }) {
  return (
    <View style={{ gap: 14 }}>
      <View style={[sectionCardStyle(colors)]}>
        <View style={rowBetween}>
          <StatusBadge status={event.status} />
          {event.type ? <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{event.type}</Text> : null}
        </View>
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 10 }}>{event.title}</Text>
        {event.description ? (
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 }}>{event.description}</Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <InfoTile icon="calendar" label="Date" value={eventDisplayDate(event)} colors={colors} />
        <InfoTile icon="map-pin" label="Venue" value={event.location || 'TBD'} colors={colors} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <InfoTile icon="users" label="Participants" value={String(event.participants || 0)} colors={colors} />
        <InfoTile icon="shield" label="Judges" value={String(judgeCount)} colors={colors} />
      </View>

      {event.max_participants ? (
        <InfoTile icon="target" label="Capacity" value={`${event.participants || 0} / ${event.max_participants}`} colors={colors} full />
      ) : null}

      <QRCard
        title="Share with Audience"
        subtitle="Scan for a live, public view of this event's overview, leaderboard, and bracket — no login needed. Always shows real, up-to-date results."
        value={spectatorViewQRValue(event.id)}
      />
    </View>
  );
}

function InfoTile({
  icon,
  label,
  value,
  colors,
  full,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: ThemeColors;
  full?: boolean;
}) {
  return (
    <View style={[sectionCardStyle(colors), { flex: full ? undefined : 1, width: full ? '100%' : undefined, gap: 6 }]}>
      <Feather name={icon} size={14} color={colors.blue} />
      <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ParticipantsTab({
  event,
  registrations,
  colors,
  onOpenScanner,
}: {
  event: EventRow;
  registrations: RegistrationRow[];
  colors: ThemeColors;
  onOpenScanner: () => void;
}) {
  const checkedInCount = registrations.filter(isCheckedIn).length;

  return (
    <View style={{ gap: 16 }}>
      <QRCard
        title="Participant Registration"
        subtitle="Scan this QR code to register for this event."
        value={participantRegistrationQRValue(event.id)}
      />

      <Pressable
        style={[scanButtonStyle(colors)]}
        onPress={onOpenScanner}
        accessibilityRole="button"
        accessibilityLabel="Scan participant QR to check in"
      >
        <Feather name="camera" size={16} color={colors.white} />
        <Text style={{ color: colors.white, fontSize: 13, fontWeight: '700' }}>Scan to check in</Text>
      </Pressable>

      <View>
        <View style={[rowBetween, { marginBottom: 10 }]}>
          <Text style={sectionTitleStyle(colors)}>{event.participants || 0} Registered</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{checkedInCount} checked in</Text>
        </View>
        {registrations.length === 0 ? (
          <EmptyState icon="users" title="No participants have registered for this event." />
        ) : (
          registrations.map((registration) => {
            const checkedIn = isCheckedIn(registration);
            return (
              <View key={registration.id} style={[sectionCardStyle(colors), { marginBottom: 10 }]}>
                <View style={rowBetween}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {registration.team_name || registration.participant_name}
                  </Text>
                  <StatusBadge status={registration.status} />
                </View>
                {registration.team_name ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{registration.participant_name}</Text>
                ) : null}
                {registration.category ? (
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{registration.category}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Feather name={checkedIn ? 'check-circle' : 'circle'} size={12} color={checkedIn ? colors.green : colors.textMuted} />
                  <Text style={{ color: checkedIn ? colors.green : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                    {checkedIn ? `Checked in ${formatCheckInTime(checkedInAt(registration))}` : 'Not checked in'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

function formatCheckInTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function scanButtonStyle(colors: ThemeColors) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 13,
  };
}

function JudgesTab({
  event,
  assignments,
  judges,
  invites,
  colors,
  onChanged,
}: {
  event: EventRow;
  assignments: JudgeAssignmentRow[];
  judges: JudgeRow[];
  invites: JudgeInviteRow[];
  colors: ThemeColors;
  onChanged: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);

  const judgesById = new Map(judges.map((judge) => [judge.id, judge]));
  const pendingInvites = invites.filter((invite) => invite.status === 'pending');

  const handleInvite = async () => {
    if (busy) return;
    setFormError('');
    setFormMessage('');

    let hasError = false;
    if (!name.trim()) {
      setNameError('Judge name is required.');
      hasError = true;
    } else {
      setNameError('');
    }
    if (!email.trim()) {
      setEmailError('Email is required.');
      hasError = true;
    } else if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      hasError = true;
    } else {
      setEmailError('');
    }
    if (hasError) return;

    setBusy(true);
    const result = await inviteJudgeByEmail(event, name, email);
    setBusy(false);

    if (result.success) {
      setFormMessage(result.message || 'Invitation sent successfully.');
      setName('');
      setEmail('');
      onChanged();
    } else {
      setFormError(result.error || 'Unable to send the invitation right now.');
    }
  };

  const confirmRevokeAssignment = (assignment: JudgeAssignmentRow, judgeName: string) => {
    Alert.alert('Revoke judge access?', `${judgeName} will lose access to score this event.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          setManagingId(assignment.id);
          const result = await revokeJudgeAssignment(assignment.id);
          setManagingId(null);
          if (result.success) {
            onChanged();
          } else {
            Alert.alert('Unable to revoke', result.error || 'Please try again.');
          }
        },
      },
    ]);
  };

  const confirmRevokeInvite = (invite: JudgeInviteRow) => {
    Alert.alert('Revoke this invitation?', `${invite.judge_name} will no longer be able to accept this invite.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          setManagingId(String(invite.id));
          const result = await revokeJudgeInvite(invite.id);
          setManagingId(null);
          if (result.success) {
            onChanged();
          } else {
            Alert.alert('Unable to revoke', result.error || 'Please try again.');
          }
        },
      },
    ]);
  };

  const confirmDeleteInvite = (invite: JudgeInviteRow) => {
    Alert.alert('Delete this invitation?', `This removes the invitation to ${invite.judge_name} entirely.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setManagingId(String(invite.id));
          const result = await deleteJudgeInvite(invite.id);
          setManagingId(null);
          if (result.success) {
            onChanged();
          } else {
            Alert.alert('Unable to delete', result.error || 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={sectionTitleStyle(colors)}>Assigned judges</Text>
        {assignments.length === 0 ? (
          <EmptyState icon="shield" title="No judges assigned yet." />
        ) : (
          assignments.map((assignment) => {
            const judge = judgesById.get(assignment.judge_id);
            const judgeName = judge?.name || 'Judge';
            const isRevoked = assignment.status === 'revoked';
            const isBusy = managingId === assignment.id;
            return (
              <View key={assignment.id} style={[sectionCardStyle(colors), { marginBottom: 10 }]}>
                <View style={rowBetween}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>{judgeName}</Text>
                  <StatusBadge status={assignment.status} />
                </View>
                {judge?.email ? <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{judge.email}</Text> : null}
                {!isRevoked ? (
                  <Pressable
                    onPress={() => confirmRevokeAssignment(assignment, judgeName)}
                    disabled={isBusy}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, opacity: isBusy ? 0.6 : 1 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Revoke access for ${judgeName}`}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.red} />
                    ) : (
                      <Feather name="slash" size={13} color={colors.red} />
                    )}
                    <Text style={{ color: colors.red, fontSize: 12, fontWeight: '700' }}>Revoke access</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      {pendingInvites.length > 0 ? (
        <View>
          <Text style={sectionTitleStyle(colors)}>Pending invitations</Text>
          {pendingInvites.map((invite) => {
            const isBusy = managingId === String(invite.id);
            return (
              <View key={invite.id} style={[sectionCardStyle(colors), { marginBottom: 10 }]}>
                <View style={rowBetween}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>{invite.judge_name}</Text>
                  <StatusBadge status={invite.status} />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{invite.judge_email}</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                  <Pressable
                    onPress={() => confirmRevokeInvite(invite)}
                    disabled={isBusy}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: isBusy ? 0.6 : 1 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Revoke invitation for ${invite.judge_name}`}
                  >
                    <Feather name="slash" size={13} color={colors.amber} />
                    <Text style={{ color: colors.amber, fontSize: 12, fontWeight: '700' }}>Revoke</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDeleteInvite(invite)}
                    disabled={isBusy}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: isBusy ? 0.6 : 1 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete invitation for ${invite.judge_name}`}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.red} />
                    ) : (
                      <Feather name="trash-2" size={13} color={colors.red} />
                    )}
                    <Text style={{ color: colors.red, fontSize: 12, fontWeight: '700' }}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={sectionCardStyle(colors)}>
        <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 12 }}>Invite a judge</Text>

        {formError ? <FormBanner text={formError} tone="red" colors={colors} /> : null}
        {formMessage ? <FormBanner text={formMessage} tone="green" colors={colors} /> : null}

        <SmallField label="Judge name" value={name} onChangeText={setName} error={nameError} colors={colors} placeholder="Full name" />
        <SmallField
          label="Judge email"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          colors={colors}
          placeholder="judge@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Pressable
          style={[inviteButtonStyle(colors), busy && { opacity: 0.7 }]}
          onPress={handleInvite}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Send invitation"
        >
          {busy ? <ActivityIndicator size="small" color={colors.white} /> : (
            <>
              <Feather name="send" size={14} color={colors.white} />
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: '700' }}>Send invitation</Text>
            </>
          )}
        </Pressable>
      </View>

      <QRCard title="Judge Access" subtitle="Scan to access the assigned scoring interface." value={judgeAccessQRValue(event.id)} />
    </View>
  );
}

function ScoringTab({ event, progress, colors }: { event: EventRow; progress: ReturnType<typeof computeJudgeProgress>; colors: ThemeColors }) {
  const criteria = event.criteria || [];

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={sectionTitleStyle(colors)}>Criteria</Text>
        {criteria.length === 0 ? (
          <EmptyState icon="bar-chart-2" title="No scoring criteria configured yet." />
        ) : (
          criteria.map((criterion) => (
            <View key={criterion.id} style={[sectionCardStyle(colors), { marginBottom: 10 }]}>
              <View style={rowBetween}>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                  {criterion.name}
                </Text>
                <Text style={{ color: colors.blue, fontSize: 14, fontWeight: '800' }}>{criterion.weight}%</Text>
              </View>
              {criterion.description ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{criterion.description}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View>
        <Text style={sectionTitleStyle(colors)}>Scoring progress</Text>
        {progress.length === 0 ? (
          <EmptyState icon="users" title="No judges assigned yet." message="Invite a judge from the Judges tab to start scoring." />
        ) : (
          progress.map((item) => (
            <View key={item.judgeId} style={[sectionCardStyle(colors), { marginBottom: 10 }]}>
              <View style={rowBetween}>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>{item.judgeName}</Text>
                <View
                  style={{
                    backgroundColor: item.done ? colors.greenLight : colors.amberLight,
                    borderRadius: radius.full,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: item.done ? colors.green : colors.amber, fontSize: 11, fontWeight: '800' }}>
                    {item.done ? 'Submitted' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                {item.scoredCount} of {item.contestantCount} scored
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function BracketTab({ tournaments, colors }: { tournaments: TournamentRow[]; colors: ThemeColors }) {
  if (tournaments.length === 0) {
    return (
      <EmptyState
        icon="git-branch"
        title="No bracket created for this event yet."
        message="Set up a bracket on the FairPlay web app to see it here."
      />
    );
  }

  return (
    <View style={{ gap: 20 }}>
      {tournaments.map((tournament) => {
        const matches = tournament.matches || [];
        const rounds = new Map<number, TournamentMatch[]>();
        matches.forEach((match) => {
          const roundNumber = match.round ?? 0;
          const roundMatches = rounds.get(roundNumber) || [];
          roundMatches.push(match);
          rounds.set(roundNumber, roundMatches);
        });
        const sortedRounds = Array.from(rounds.entries()).sort(([a], [b]) => a - b);

        return (
          <View key={tournament.id}>
            <View style={rowBetween}>
              <Text style={sectionTitleStyle(colors)} numberOfLines={1}>
                {tournament.title || tournament.name || 'Bracket'}
              </Text>
              <StatusBadge status={tournament.is_published ? 'published' : 'draft'} />
            </View>

            {tournament.champion?.name ? (
              <View style={[sectionCardStyle(colors), { marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <Feather name="award" size={16} color={colors.amber} />
                <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700' }}>
                  Champion: {tournament.champion.name}
                </Text>
              </View>
            ) : null}

            {matches.length === 0 ? (
              <EmptyState icon="git-branch" title="No matches have been set up for this bracket yet." />
            ) : (
              sortedRounds.map(([roundNumber, roundMatches]) => (
                <View key={roundNumber} style={{ marginBottom: 14 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>
                    Round {roundNumber}
                  </Text>
                  {roundMatches.map((match) => (
                    <MatchCard key={match.id} match={match} colors={colors} />
                  ))}
                </View>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

function MatchCard({ match, colors }: { match: TournamentMatch; colors: ThemeColors }) {
  const nameA = match.team1?.name || 'TBD';
  const nameB = match.team2?.name || 'TBD';
  const winnerIsA = match.winner?.id != null && match.winner.id === match.team1?.id;
  const winnerIsB = match.winner?.id != null && match.winner.id === match.team2?.id;

  return (
    <View style={[sectionCardStyle(colors), { marginBottom: 10, gap: 8 }]}>
      <MatchParticipantRow name={nameA} score={match.score1} isWinner={winnerIsA} colors={colors} />
      <View style={{ height: 1, backgroundColor: colors.border }} />
      <MatchParticipantRow name={nameB} score={match.score2} isWinner={winnerIsB} colors={colors} />
      {match.status ? (
        <View style={{ marginTop: 4 }}>
          <StatusBadge status={match.status} />
        </View>
      ) : null}
    </View>
  );
}

function MatchParticipantRow({
  name,
  score,
  isWinner,
  colors,
}: {
  name: string;
  score?: number | null;
  isWinner: boolean;
  colors: ThemeColors;
}) {
  return (
    <View style={rowBetween}>
      <Text
        style={{ color: isWinner ? colors.green : colors.textPrimary, fontSize: 14, fontWeight: isWinner ? '800' : '600', flex: 1 }}
        numberOfLines={1}
      >
        {name}
        {isWinner ? '  🏆' : ''}
      </Text>
      {score != null ? <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '700' }}>{score}</Text> : null}
    </View>
  );
}

function FormBanner({ text, tone, colors }: { text: string; tone: 'red' | 'green'; colors: ThemeColors }) {
  const fg = colors[tone];
  const bg = colors[`${tone}Light` as 'redLight'];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.md, padding: 10, marginBottom: 10 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

function SmallField({
  label,
  value,
  onChangeText,
  error,
  colors,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  colors: ThemeColors;
  placeholder?: string;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={{
          borderWidth: 1,
          borderColor: error ? colors.red : colors.border,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: colors.textPrimary,
          backgroundColor: colors.inputBackground,
        }}
        placeholderTextColor={colors.placeholder}
        {...rest}
      />
      {error ? <Text style={{ color: colors.red, fontSize: 11, marginTop: 4, fontWeight: '600' }}>{error}</Text> : null}
    </View>
  );
}

const rowBetween = { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const };

function sectionCardStyle(colors: ThemeColors) {
  return {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
  };
}

function sectionTitleStyle(colors: ThemeColors) {
  return {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  };
}

function inviteButtonStyle(colors: ThemeColors) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 13,
  };
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    shell: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 12,
      backgroundColor: colors.topBar,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
    },
    tabRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.topBar,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: 'transparent',
      borderRadius: radius.full,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    tabButtonText: {
      fontSize: 12,
      fontWeight: '700',
    },
    content: {
      padding: 20,
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
    },
  });
