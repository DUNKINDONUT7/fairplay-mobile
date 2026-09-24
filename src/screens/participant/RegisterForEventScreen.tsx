import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import type { ThemeColors } from '@/theme';
import { FormField } from '@/components/auth/FormField';
import { eventDisplayDate } from '@/services/eventService';
import { registerForEvent } from '@/services/participantService';
import { isValidEmail } from '@/utils/validation';
import type { EventRow } from '@/types/organizer';

export function RegisterForEventScreen({
  event,
  defaultName,
  defaultEmail,
  onBack,
  onRegistered,
}: {
  event: EventRow;
  defaultName?: string | null;
  defaultEmail?: string | null;
  onBack: () => void;
  onRegistered: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState(defaultName || '');
  const [email, setEmail] = useState(defaultEmail || '');
  const [category, setCategory] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (busy) return;
    setFormError('');

    let hasError = false;
    if (!name.trim()) {
      setNameError('Your name is required.');
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
    const result = await registerForEvent({ event, participantName: name, email, category });
    setBusy(false);

    if (result.success) {
      setDone(true);
      onRegistered();
    } else {
      setFormError(result.error || 'Unable to submit your registration. Please try again.');
    }
  };

  return (
    <View style={styles.shell}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          Register
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.type ? <Text style={styles.eventType}>{event.type}</Text> : null}
          <Text style={styles.eventMeta}>{eventDisplayDate(event)}</Text>
          {event.location ? <Text style={styles.eventMeta}>{event.location}</Text> : null}
        </View>

        {done ? (
          <View style={[styles.banner, { backgroundColor: colors.greenLight }]}>
            <Feather name="check-circle" size={16} color={colors.green} />
            <Text style={[styles.bannerText, { color: colors.textPrimary }]}>
              You're registered! The organizer can now see you under this event's participants.
            </Text>
          </View>
        ) : (
          <View style={styles.formCard}>
            {formError ? (
              <View style={[styles.banner, { backgroundColor: colors.redLight, marginBottom: 12 }]}>
                <Feather name="alert-circle" size={16} color={colors.red} />
                <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{formError}</Text>
              </View>
            ) : null}

            <FormField label="Full name" value={name} onChangeText={setName} error={nameError} placeholder="Your full name" />
            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FormField
              label="Category (optional)"
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. Beginner, Open, Grade 11"
            />

            <Pressable
              style={[styles.submitButton, { backgroundColor: colors.blue }, busy && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Submit registration"
            >
              {busy ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.submitText}>Submit Registration</Text>
              )}
            </Pressable>
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
    content: {
      padding: 20,
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
    },
    eventCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 18,
      gap: 3,
    },
    eventTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: '800',
    },
    eventType: {
      color: colors.blue,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    eventMeta: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 16,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderRadius: radius.md,
      padding: 12,
    },
    bannerText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
    },
    submitButton: {
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      minHeight: 50,
    },
    submitText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
  });
