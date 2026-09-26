import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppLogo } from '@/components/common/AppLogo';
import { useAppTheme } from '@/contexts/ThemeContext';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { WelcomeScreen } from '@/screens/auth/WelcomeScreen';
import { ScanEventQRScreen } from '@/screens/auth/ScanEventQRScreen';
import { OrganizerDashboardScreen } from '@/screens/organizer/OrganizerDashboardScreen';
import { OrganizerEventsScreen } from '@/screens/organizer/OrganizerEventsScreen';
import { EventDetailsScreen } from '@/screens/organizer/EventDetailsScreen';
import { ParticipantHomeScreen } from '@/screens/participant/ParticipantHomeScreen';
import { fetchOrganizerEvents, subscribeToOrganizerEvents } from '@/services/eventService';
import { subscribeToOrganizerActivity } from '@/services/organizerActivityService';
import { presentLocalNotification, requestNotificationPermissions } from '@/services/notificationService';
import { registerForEvent } from '@/services/participantService';
import type { ProfileRow } from '@/services/profileService';
import type { ThemeColors } from '@/theme';
import type { EventRow } from '@/types/organizer';

export type MobileDashboard = 'dashboard' | 'events';

type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
};

type FeatherIconName = keyof typeof Feather.glyphMap;

const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999 };

const DASHBOARD_TABS: { key: MobileDashboard; label: string; icon: FeatherIconName }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { key: 'events', label: 'Events', icon: 'calendar' },
];

function getBotReply(question: string) {
  const text = question.toLowerCase();

  if (text.includes('invite') || text.includes('judge')) {
    return 'Open an event, go to the Judges tab, and use "Invite a judge" to send an email invitation. You can also share the Judge Access QR from the same tab.';
  }

  if (text.includes('participant') || text.includes('register') || text.includes('team')) {
    return 'Open an event, go to the Participants tab to see who has registered, and share the Participant Registration QR to collect more sign-ups.';
  }

  if (text.includes('score') || text.includes('criteria') || text.includes('weight')) {
    return 'The Scoring tab on each event shows the criteria and weights configured on the web app, plus live progress for each assigned judge.';
  }

  if (text.includes('qr')) {
    return 'Participant and Judge QR codes live inside each event, under the Participants and Judges tabs. They point to the same registration and access links as the web app.';
  }

  if (text.includes('refresh') || text.includes('sync') || text.includes('update')) {
    return 'Pull down on any list to refresh, or just wait — event, participant, judge, and score changes made on the web app sync here automatically.';
  }

  return 'I can help with inviting judges, tracking participant registrations, sharing QR codes, and checking scoring progress for your events.';
}

export function MobileShell({
  events,
  selectedDashboard,
  onSelectDashboard,
  detectedUrl,
  user,
  profile,
  authConfigured,
  onLinkDetected,
  onSignIn,
  onSignUp,
  onSignOut,
}: {
  events: EventRow[];
  selectedDashboard: MobileDashboard;
  onSelectDashboard?: (dashboard: MobileDashboard) => void;
  detectedUrl?: string | null;
  user?: {
    id: string;
    email?: string | null;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  } | null;
  profile?: ProfileRow | null;
  authConfigured?: boolean;
  onLinkDetected?: (url: string) => void;
  onSignIn?: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  onSignUp?: (payload: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  onSignOut?: () => Promise<void> | void;
}) {
  const { colors: COLORS } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const tabBarHeight = 70 + insets.bottom;

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'FairPlay support is ready. Ask me about inviting judges, tracking participants, QR codes, or scoring progress.',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [authScreen, setAuthScreen] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [organizerEventIds, setOrganizerEventIds] = useState<Set<number>>(new Set());
  const [scanningEventQR, setScanningEventQR] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<EventRow | null>(null);

  // Tracks the organizer's own event ids (lightweight, id-only concern) so
  // realtime activity for OTHER organizers' events never triggers a
  // notification on this device.
  useEffect(() => {
    if (!user?.id) {
      setOrganizerEventIds(new Set());
      return;
    }

    let isMounted = true;

    const loadIds = () => {
      fetchOrganizerEvents(user.id)
        .then((rows) => {
          if (isMounted) setOrganizerEventIds(new Set(rows.map((row) => row.id)));
        })
        .catch(() => {});
    };

    loadIds();
    const unsubscribe = subscribeToOrganizerEvents(loadIds);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    requestNotificationPermissions();

    const unsubscribe = subscribeToOrganizerActivity(
      () => organizerEventIds,
      ({ title, body }) => presentLocalNotification(title, body)
    );

    return unsubscribe;
  }, [user?.id, organizerEventIds]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    profile?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'FairPlay Organizer');

  // Completes the "scan QR -> sign in -> auto-register" flow: once a scanned
  // event is pending and the sign-in/sign-up just above resolved into a real
  // user, register for it immediately instead of making them fill the
  // registration form again for an event they already scanned. The ref guard
  // (rather than a cleanup flag) ensures exactly one registerForEvent call
  // per scanned event even if effects double-fire.
  const autoRegisteringEventIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id || !pendingEvent) return;
    if (autoRegisteringEventIdRef.current === pendingEvent.id) return;
    autoRegisteringEventIdRef.current = pendingEvent.id;

    const event = pendingEvent;
    registerForEvent({ event, participantName: displayName, email: user.email || '' }).then((result) => {
      autoRegisteringEventIdRef.current = null;
      setPendingEvent(null);
      Alert.alert(
        result.success ? "You're registered!" : 'Registration incomplete',
        result.success
          ? `You're registered for ${event.title}.`
          : result.error || `Unable to register you for ${event.title} automatically. Open the event to register manually.`
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, pendingEvent]);

  const sendChatMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      text: trimmed,
    };

    setChatMessages((current) => [...current, userMessage]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const reply = getBotReply(trimmed);
      setChatMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: reply,
        },
      ]);
      setIsTyping(false);
    }, 300);
  };

  const handleSignOut = async () => {
    await onSignOut?.();
    setAuthScreen('welcome');
    setSelectedEventId(null);
  };

  const BrandMark = ({ compact = false }: { compact?: boolean }) => <AppLogo width={compact ? 81 : 106} />;

  if (!user) {
    if (scanningEventQR) {
      return (
        <ScanEventQRScreen
          events={events}
          onClose={() => setScanningEventQR(false)}
          onScanned={(event) => {
            setPendingEvent(event);
            setScanningEventQR(false);
            setAuthScreen('login');
          }}
        />
      );
    }

    const pendingNotice = pendingEvent ? `Sign in to complete your registration for "${pendingEvent.title}".` : undefined;

    const cancelPendingEvent = () => {
      setPendingEvent(null);
      setAuthScreen('welcome');
    };

    if (authScreen === 'login') {
      return (
        <LoginScreen
          authConfigured={authConfigured}
          onSignIn={onSignIn}
          onNavigateRegister={() => setAuthScreen('register')}
          onNavigateBack={cancelPendingEvent}
          noticeMessage={pendingNotice}
        />
      );
    }

    if (authScreen === 'register') {
      return (
        <RegisterScreen
          authConfigured={authConfigured}
          onSignUp={onSignUp}
          onNavigateLogin={() => setAuthScreen('login')}
          onNavigateBack={cancelPendingEvent}
          noticeMessage={pendingNotice}
        />
      );
    }

    return (
      <WelcomeScreen
        events={events}
        onNavigateLogin={() => setAuthScreen('login')}
        onNavigateRegister={() => setAuthScreen('register')}
        onScanQR={() => setScanningEventQR(true)}
      />
    );
  }

  // Everything below is organizer tooling (QR management, judge invites,
  // brackets, scoring oversight). Only a CONFIRMED organizer/admin profile
  // sees it — default to the participant screen otherwise, since `profile`
  // is briefly null right after sign-up (before its row loads) and a new
  // self-registered account (always role: 'participant', see App.tsx
  // handleSignUp) must never flash the Organizer Dashboard while that load
  // is in flight.
  const role = profile?.role;
  const isOrganizerOrAdmin = role === 'organizer' || role === 'admin';
  if (!isOrganizerOrAdmin) {
    return <ParticipantHomeScreen events={events} userEmail={user.email} userName={displayName} onSignOut={handleSignOut} />;
  }

  if (selectedEventId !== null) {
    return <EventDetailsScreen eventId={selectedEventId} onBack={() => setSelectedEventId(null)} tabBarHeight={0} />;
  }

  return (
    <View style={styles.shell}>
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <BrandMark compact />
        <View style={styles.topActions}>
          <Pressable style={styles.iconButton} onPress={handleSignOut} accessibilityRole="button" accessibilityLabel="Sign out">
            <Feather name="log-out" size={18} color={COLORS.textPrimary} />
          </Pressable>
        </View>
      </View>

      {selectedDashboard === 'dashboard' ? (
        <OrganizerDashboardScreen
          authUserId={user.id}
          organizerName={displayName}
          profileStatus={profile?.status}
          onOpenEvents={() => onSelectDashboard?.('events')}
          onOpenEvent={(eventId) => setSelectedEventId(eventId)}
          tabBarHeight={tabBarHeight}
        />
      ) : (
        <OrganizerEventsScreen authUserId={user.id} onOpenEvent={(eventId) => setSelectedEventId(eventId)} tabBarHeight={tabBarHeight} />
      )}

      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 12 }]}>
        {DASHBOARD_TABS.map((tab) => {
          const active = selectedDashboard === tab.key;
          return (
            <Pressable key={tab.key} style={styles.tabItem} onPress={() => onSelectDashboard?.(tab.key)}>
              <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                <Feather name={tab.icon} size={17} color={active ? COLORS.white : COLORS.textSecondary} />
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.chatFab, { bottom: tabBarHeight + 16 }]}
        onPress={() => setChatOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel="FairPlay support chat"
      >
        <Feather name={chatOpen ? 'x' : 'message-circle'} size={24} color={COLORS.white} />
      </Pressable>

      {chatOpen && (
        <View
          style={[
            styles.chatPanel,
            {
              bottom: tabBarHeight + 82,
              width: Math.min(windowWidth - 32, 380),
              height: Math.min(windowHeight * 0.55, 460),
            },
          ]}
        >
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>FairPlay Support</Text>
            <Pressable onPress={() => setChatOpen(false)}>
              <Feather name="x" size={18} color={COLORS.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.chatMessages} contentContainerStyle={styles.chatMessagesContent}>
            {chatMessages.map((message) => (
              <View key={message.id} style={[styles.chatBubble, message.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant]}>
                <Text style={styles.chatBubbleText}>{message.text}</Text>
              </View>
            ))}
            {isTyping && (
              <View style={[styles.chatBubble, styles.chatBubbleAssistant]}>
                <Text style={styles.chatBubbleText}>FairPlay is typing...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.chatComposer}>
            <TextInput
              value={chatInput}
              onChangeText={setChatInput}
              style={styles.chatInput}
              placeholder="Ask about judges, participants, or QR codes"
              placeholderTextColor={COLORS.placeholder}
            />
            <Pressable style={styles.chatSend} onPress={sendChatMessage}>
              <Feather name="send" size={16} color={COLORS.white} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) =>
  StyleSheet.create({
    shell: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    topBar: {
      paddingBottom: 16,
      paddingHorizontal: 20,
      backgroundColor: COLORS.topBar,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
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
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      backgroundColor: COLORS.topBar,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingTop: 8,
      paddingHorizontal: 8,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    tabIconWrap: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabIconWrapActive: {
      backgroundColor: COLORS.blue,
    },
    tabLabel: {
      color: COLORS.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    tabLabelActive: {
      color: COLORS.textPrimary,
    },
    chatFab: {
      position: 'absolute',
      right: 20,
      width: 56,
      height: 56,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.blue,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: COLORS.blue,
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    chatPanel: {
      position: 'absolute',
      right: 16,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xxl,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    chatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: COLORS.surfaceAlt,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    chatTitle: {
      color: COLORS.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    chatMessages: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    chatMessagesContent: {
      padding: 12,
    },
    chatBubble: {
      maxWidth: '82%',
      borderRadius: RADIUS.lg,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    chatBubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: COLORS.blue,
    },
    chatBubbleAssistant: {
      alignSelf: 'flex-start',
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    chatBubbleText: {
      color: COLORS.textPrimary,
      fontSize: 13,
      lineHeight: 18,
    },
    chatComposer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: COLORS.surfaceAlt,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    chatInput: {
      flex: 1,
      color: COLORS.textPrimary,
      backgroundColor: COLORS.bg,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
    },
    chatSend: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.blue,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
