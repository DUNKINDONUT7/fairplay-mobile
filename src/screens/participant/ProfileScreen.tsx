import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import type { ThemeColors } from '@/theme';
import { FormField } from '@/components/auth/FormField';
import { updateOwnProfile, type ProfileRow } from '@/services/profileService';

export function ProfileScreen({
  authUserId,
  email,
  profile,
  onBack,
  onSaved,
}: {
  authUserId: string;
  email?: string | null;
  profile: ProfileRow | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (busy) return;
    setFormError('');
    setFormMessage('');

    if (!fullName.trim()) {
      setNameError('Full name is required.');
      return;
    }
    setNameError('');

    setBusy(true);
    const result = await updateOwnProfile(authUserId, { full_name: fullName.trim() });
    setBusy(false);

    if (result.success) {
      setFormMessage('Profile updated.');
      onSaved();
    } else {
      setFormError(result.error || 'Unable to update your profile. Please try again.');
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
        <Text style={styles.topBarTitle}>My Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {formError ? (
            <View style={[styles.banner, { backgroundColor: colors.redLight }]}>
              <Feather name="alert-circle" size={14} color={colors.red} />
              <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{formError}</Text>
            </View>
          ) : null}

          {formMessage ? (
            <View style={[styles.banner, { backgroundColor: colors.greenLight }]}>
              <Feather name="check-circle" size={14} color={colors.green} />
              <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{formMessage}</Text>
            </View>
          ) : null}

          <FormField
            label="Full name"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (nameError) setNameError('');
            }}
            error={nameError}
            placeholder="Your full name"
          />

          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>Email</Text>
            <Text style={styles.readOnlyValue}>{email || '—'}</Text>
          </View>

          {profile?.role ? (
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Account type</Text>
              <Text style={styles.readOnlyValue}>{profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.blue }, busy && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Save profile"
          >
            {busy ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.saveButtonText}>Save changes</Text>}
          </Pressable>
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
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 18,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderRadius: radius.md,
      padding: 12,
      marginBottom: 16,
    },
    bannerText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
    },
    readOnlyField: {
      marginBottom: 16,
    },
    readOnlyLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    readOnlyValue: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
    saveButton: {
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      minHeight: 50,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
  });
