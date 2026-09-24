import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppLogo } from '@/components/common/AppLogo';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import type { ThemeColors } from '@/theme';
import { eventDisplayDate } from '@/services/eventService';
import type { EventRow } from '@/types/organizer';

type FeatherIconName = keyof typeof Feather.glyphMap;

const FEATURES: { icon: FeatherIconName; label: string; title: string; text: string }[] = [
  {
    icon: 'user-check',
    label: 'Identity',
    title: 'Verified user profile',
    text: 'Each QR session is tied to a real FairPlay account for safer and clearer access.',
  },
  {
    icon: 'maximize',
    label: 'QR access',
    title: 'Scan and enter fast',
    text: 'Use the app to scan event QR codes and go straight to the correct judge, scorer, or participant dashboard.',
  },
  {
    icon: 'globe',
    label: 'Public view',
    title: 'Browse events',
    text: 'Check upcoming events and public schedules before you sign in or join a session.',
  },
];

export function WelcomeScreen({
  events,
  onNavigateLogin,
  onNavigateRegister,
}: {
  events: EventRow[];
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Same "hide unpublished/finished" rule as the web app's participant
  // pages — a draft hasn't been published by its organizer yet, and a
  // completed event isn't "upcoming" anymore.
  const upcomingEvents = useMemo(
    () => events.filter((event) => event.status !== 'draft' && event.status !== 'completed'),
    [events]
  );

  return (
    <View style={styles.shell}>
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <AppLogo width={97} />
        <View style={styles.scanButtonDisabled}>
          <Feather name="camera" size={14} color={colors.textMuted} />
          <Text style={styles.scanTextDisabled}>Scan QR</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.badge}>
            <Feather name="check-circle" size={12} color={colors.cyan} />
            <Text style={styles.badgeText}>Verified access</Text>
          </View>
          <Text style={styles.heroTitle}>Sign in to access FairPlay QR flows</Text>
          <Text style={styles.heroSubtitle}>
            Create an account or log in so your identity is tied to your QR access, event entry, and role-specific
            dashboard.
          </Text>

          <View style={styles.heroActions}>
            <Pressable
              style={styles.primaryButton}
              onPress={onNavigateLogin}
              accessibilityRole="button"
              accessibilityLabel="Log in"
            >
              <Text style={styles.primaryButtonText}>Log in</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={onNavigateRegister}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              <Text style={styles.secondaryButtonText}>Create account</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.featureGrid}>
          {FEATURES.map((feature) => (
            <View key={feature.label} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Feather name={feature.icon} size={16} color={colors.blue} />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Upcoming events</Text>
          {upcomingEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No public events loaded yet.</Text>
            </View>
          ) : (
            upcomingEvents.slice(0, 3).map((event) => (
              <View key={String(event.id)} style={styles.eventItem}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventTag}>
                    <Text style={styles.eventTagText}>{event.type || 'Event'}</Text>
                  </View>
                </View>
                <Text style={styles.eventMeta}>{event.location || 'Location TBD'}</Text>
                <Text style={styles.eventMeta}>{eventDisplayDate(event)}</Text>
              </View>
            ))
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
    scanButtonDisabled: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    scanTextDisabled: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    content: {
      padding: 20,
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: colors.cyanLight,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeText: {
      color: colors.cyan,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 18,
      gap: 10,
    },
    heroTitle: {
      color: colors.textPrimary,
      fontSize: 26,
      fontWeight: '800',
      lineHeight: 32,
    },
    heroSubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    heroActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.blue,
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '700',
    },
    secondaryButton: {
      flex: 1,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    featureGrid: {
      gap: 10,
      marginBottom: 18,
    },
    featureCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    featureIconWrap: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      backgroundColor: colors.blueLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    featureLabel: {
      color: colors.blue,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    featureTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4,
    },
    featureText: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    sectionWrap: {
      marginBottom: 18,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    eventItem: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    eventHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    eventTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
      marginRight: 8,
    },
    eventTag: {
      backgroundColor: colors.blueLight,
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    eventTagText: {
      color: colors.blue,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    eventMeta: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
  });
