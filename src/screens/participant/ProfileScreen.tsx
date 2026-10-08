import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { coloredShadow, radius, shadows } from '@/theme';
import type { ThemeColors } from '@/theme';
import { FormField } from '@/components/auth/FormField';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { changePassword, updateOwnProfile, type ProfileRow } from '@/services/profileService';
import { getPasswordStrength, PASSWORD_CHANGE_MIN_LENGTH } from '@/utils/validation';

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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const handleChangePassword = async () => {
    if (passwordBusy) return;
    setPasswordError('');
    setPasswordMessage('');

    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (!strength.meetsAllChecks) {
      setPasswordError(`Password must be at least ${PASSWORD_CHANGE_MIN_LENGTH} characters and include an uppercase letter, a lowercase letter, and a number.`);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('Your new password must be different from your current one.');
      return;
    }

    setPasswordBusy(true);
    const result = await changePassword(email || '', currentPassword, newPassword);
    setPasswordBusy(false);

    if (result.success) {
      setPasswordMessage('Password updated. Use your new password the next time you sign in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setPasswordError(result.error || 'Unable to update your password. Please try again.');
    }
  };

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
            style={[styles.saveButton, { backgroundColor: colors.blue, ...coloredShadow(colors.blue) }, busy && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Save profile"
          >
            {busy ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.saveButtonText}>Save changes</Text>}
          </Pressable>
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.sectionHeading}>Change Password</Text>

          {passwordError ? (
            <View style={[styles.banner, { backgroundColor: colors.redLight }]}>
              <Feather name="alert-circle" size={14} color={colors.red} />
              <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{passwordError}</Text>
            </View>
          ) : null}

          {passwordMessage ? (
            <View style={[styles.banner, { backgroundColor: colors.greenLight }]}>
              <Feather name="check-circle" size={14} color={colors.green} />
              <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{passwordMessage}</Text>
            </View>
          ) : null}

          <PasswordInput
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <PasswordInput
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            autoComplete="password-new"
          />

          {newPassword ? (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthHeader}>
                <Text style={styles.strengthLabel}>Password strength</Text>
                <Text style={[styles.strengthValue, { color: colors[strength.color] }]}>{strength.label}</Text>
              </View>
              <View style={[styles.strengthTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.strengthFill, { width: `${strength.percent}%`, backgroundColor: colors[strength.color] }]} />
              </View>

              <View style={styles.checksGrid}>
                <PasswordCheckRow label="8+ characters" met={strength.checks.length} colors={colors} />
                <PasswordCheckRow label="Uppercase letter" met={strength.checks.uppercase} colors={colors} />
                <PasswordCheckRow label="Lowercase letter" met={strength.checks.lowercase} colors={colors} />
                <PasswordCheckRow label="Number" met={strength.checks.number} colors={colors} />
              </View>
            </View>
          ) : null}

          <PasswordInput
            label="Confirm new password"
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            placeholder="••••••••"
            autoComplete="password-new"
          />

          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.blue, ...coloredShadow(colors.blue) }, passwordBusy && { opacity: 0.7 }]}
            onPress={handleChangePassword}
            disabled={passwordBusy}
            accessibilityRole="button"
            accessibilityLabel="Update password"
          >
            {passwordBusy ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.saveButtonText}>Update password</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function PasswordCheckRow({ label, met, colors }: { label: string; met: boolean; colors: ThemeColors }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: '50%', marginTop: 8 }}>
      <Feather name={met ? 'check-circle' : 'circle'} size={13} color={met ? colors.green : colors.textMuted} />
      <Text style={{ color: met ? colors.textPrimary : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
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
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.card,
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
      ...shadows.card,
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
    sectionHeading: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 16,
    },
    strengthWrap: {
      marginTop: -8,
      marginBottom: 16,
    },
    strengthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    strengthLabel: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    strengthValue: {
      fontSize: 12,
      fontWeight: '800',
    },
    strengthTrack: {
      height: 6,
      borderRadius: radius.full,
      overflow: 'hidden',
    },
    strengthFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    checksGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 2,
    },
  });
