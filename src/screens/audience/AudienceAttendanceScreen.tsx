import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppLogo } from '@/components/common/AppLogo';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import type { ThemeColors } from '@/theme';
import { FormField } from '@/components/auth/FormField';
import { checkInAudienceMember } from '@/services/attendanceService';
import type { EventRow } from '@/types/organizer';

// No auth anywhere in this screen on purpose — scanning the organizer's
// audience QR must work for anyone, with nothing more than their name.
export function AudienceAttendanceScreen({ event, onDone }: { event: EventRow; onDone: () => void }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (busy) return;
    setFormError('');

    if (!name.trim()) {
      setNameError('Please enter your name.');
      return;
    }
    setNameError('');

    setBusy(true);
    const result = await checkInAudienceMember({ event, name });
    setBusy(false);

    if (result.success) {
      setDone(true);
    } else {
      setFormError(result.error || 'Unable to record your attendance. Please try again.');
    }
  };

  return (
    <View style={styles.shell}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={onDone}
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Feather name="x" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>Audience Attendance</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        <AppLogo width={110} />

        <View style={styles.eventCard}>
          <Feather name="users" size={18} color={colors.violet} />
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventSubtitle}>Marking your attendance for this event — no account needed.</Text>
        </View>

        {done ? (
          <View style={[styles.banner, { backgroundColor: colors.greenLight }]}>
            <Feather name="check-circle" size={18} color={colors.green} />
            <Text style={[styles.bannerText, { color: colors.textPrimary }]}>
              Thanks, {name.trim()}! Your attendance has been recorded.
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

            <FormField
              label="Your name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError('');
              }}
              error={nameError}
              placeholder="Full name"
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <Pressable
              style={[styles.submitButton, { backgroundColor: colors.violet }, busy && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Submit attendance"
            >
              {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Mark Attendance</Text>}
            </Pressable>
          </View>
        )}
      </View>
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
      flex: 1,
      padding: 24,
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      justifyContent: 'center',
      gap: 20,
      alignItems: 'center',
    },
    eventCard: {
      width: '100%',
      backgroundColor: colors.violetLight,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.violet,
      padding: 20,
      alignItems: 'center',
      gap: 8,
    },
    eventTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    eventSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
    },
    formCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 18,
    },
    banner: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderRadius: radius.md,
      padding: 14,
    },
    bannerText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
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
