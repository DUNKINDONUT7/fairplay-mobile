import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    <KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={onDone}
          style={styles.closeButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Feather name="x" size={18} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.badgeWrap}>
            <View style={styles.badgeCircle}>
              <Feather name="user-check" size={30} color="#fff" />
            </View>
          </View>

          <AppLogo width={100} />

          {done ? (
            <View style={styles.doneWrap}>
              <View style={[styles.successCircle, { backgroundColor: colors.greenLight }]}>
                <Feather name="check" size={32} color={colors.green} />
              </View>
              <Text style={styles.doneTitle}>You're checked in!</Text>
              <Text style={styles.doneSubtitle}>
                Thanks, {name.trim()}. Your attendance for{'\n'}
                <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{event.title}</Text> has been recorded.
              </Text>

              <Pressable style={styles.doneButton} onPress={onDone} accessibilityRole="button" accessibilityLabel="Done">
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.headline}>Audience Check-In</Text>
              <View style={styles.eventPill}>
                <Feather name="calendar" size={12} color={colors.violet} />
                <Text style={styles.eventPillText} numberOfLines={1}>
                  {event.title}
                </Text>
              </View>
              <Text style={styles.helperText}>Just enter your name below — no account or login needed.</Text>

              <View style={styles.formCard}>
                {formError ? (
                  <View style={[styles.banner, { backgroundColor: colors.redLight }]}>
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
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />

                <Pressable
                  style={[styles.submitButton, busy && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Submit attendance"
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={16} color="#fff" />
                      <Text style={styles.submitText}>Mark My Attendance</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    shell: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      paddingHorizontal: 20,
    },
    closeButton: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    inner: {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      alignItems: 'center',
      gap: 10,
    },
    badgeWrap: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 6,
    },
    badgeCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.violet,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      shadowColor: colors.violet,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    headline: {
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 18,
    },
    eventPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.violetLight,
      borderRadius: radius.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 10,
      maxWidth: '100%',
    },
    eventPillText: {
      color: colors.violet,
      fontSize: 12,
      fontWeight: '700',
      flexShrink: 1,
    },
    helperText: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
      marginTop: 10,
      marginBottom: 6,
      paddingHorizontal: 8,
    },
    formCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: 20,
      marginTop: 8,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderRadius: radius.md,
      padding: 12,
      marginBottom: 14,
    },
    bannerText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.violet,
      borderRadius: radius.md,
      paddingVertical: 15,
      marginTop: 6,
      minHeight: 52,
    },
    submitText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    doneWrap: {
      width: '100%',
      alignItems: 'center',
      gap: 6,
      marginTop: 18,
    },
    successCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    doneTitle: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
    },
    doneSubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 21,
      marginTop: 6,
      paddingHorizontal: 8,
    },
    doneButton: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 32,
      paddingVertical: 13,
      marginTop: 24,
    },
    doneButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
