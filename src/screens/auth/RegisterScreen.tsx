import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AuthContainer } from '@/components/auth/AuthContainer';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { FormField } from '@/components/auth/FormField';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/theme';
import { radius } from '@/theme';
import { friendlyAuthError } from '@/utils/authErrors';
import { getPasswordStrength, isValidEmail, PASSWORD_CHANGE_MIN_LENGTH } from '@/utils/validation';

type AuthResult = { success: boolean; error?: string; message?: string };

type RegisterErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function RegisterScreen({
  authConfigured,
  onSignUp,
  onNavigateLogin,
  onNavigateBack,
  noticeMessage,
}: {
  authConfigured?: boolean;
  onSignUp?: (payload: { fullName: string; email: string; password: string }) => Promise<AuthResult>;
  onNavigateLogin: () => void;
  onNavigateBack?: () => void;
  noticeMessage?: string;
}) {
  const { colors } = useAppTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const validate = () => {
    const nextErrors: RegisterErrors = {};
    if (!fullName.trim()) nextErrors.fullName = 'Full name is required.';

    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (!strength.meetsAllChecks) {
      nextErrors.password = `Password must be at least ${PASSWORD_CHANGE_MIN_LENGTH} characters and include an uppercase letter, a lowercase letter, and a number.`;
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (busy) return;
    setFormError('');
    setFormMessage('');
    if (!validate()) return;

    setBusy(true);
    const result = await onSignUp?.({ fullName: fullName.trim(), email: email.trim(), password });
    setBusy(false);

    if (result?.success) {
      setFormMessage(result.message || 'Account created successfully.');
    } else {
      setFormError(friendlyAuthError(result?.error));
    }
  };

  return (
    <AuthContainer onBack={onNavigateBack}>
      <AuthHeader title="Create Account" subtitle="Create your account to get started." />

      {noticeMessage ? (
        <View style={[styles.banner, { backgroundColor: colors.blueLight, borderColor: 'rgba(37, 99, 235, 0.4)' }]}>
          <Feather name="info" size={14} color={colors.blue} />
          <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{noticeMessage}</Text>
        </View>
      ) : null}

      {!authConfigured ? (
        <View style={[styles.banner, { backgroundColor: colors.amberLight, borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
          <Feather name="alert-triangle" size={14} color={colors.amber} />
          <Text style={[styles.bannerText, { color: colors.textPrimary }]}>
            Supabase auth is not configured yet, so account creation will not work until the environment variables
            are connected.
          </Text>
        </View>
      ) : null}

      {formError ? (
        <View style={[styles.banner, { backgroundColor: colors.redLight, borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
          <Feather name="alert-circle" size={14} color={colors.red} />
          <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{formError}</Text>
        </View>
      ) : null}

      {formMessage ? (
        <View style={[styles.banner, { backgroundColor: colors.greenLight, borderColor: 'rgba(34, 197, 94, 0.4)' }]}>
          <Feather name="check-circle" size={14} color={colors.green} />
          <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{formMessage}</Text>
        </View>
      ) : null}

      <FormField
        label="Full Name"
        value={fullName}
        onChangeText={(text) => {
          setFullName(text);
          if (errors.fullName) setErrors((current) => ({ ...current, fullName: undefined }));
        }}
        error={errors.fullName}
        autoComplete="name"
        placeholder="Your full name"
        returnKeyType="next"
      />

      <FormField
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
        }}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@example.com"
        returnKeyType="next"
      />

      <PasswordInput
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
        }}
        error={errors.password}
        hint={errors.password ? undefined : `At least ${PASSWORD_CHANGE_MIN_LENGTH} characters, with uppercase, lowercase, and a number.`}
        placeholder="••••••••"
        autoComplete="password-new"
        returnKeyType="next"
      />

      {password ? (
        <View style={styles.strengthWrap}>
          <View style={styles.strengthHeader}>
            <Text style={[styles.strengthLabel, { color: colors.textSecondary }]}>Password strength</Text>
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
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          if (errors.confirmPassword) setErrors((current) => ({ ...current, confirmPassword: undefined }));
        }}
        error={errors.confirmPassword}
        placeholder="••••••••"
        autoComplete="password-new"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <Pressable
        style={[styles.primaryButton, { backgroundColor: colors.blue }, busy && styles.disabled]}
        onPress={handleSubmit}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Create account"
        accessibilityState={{ disabled: busy, busy }}
      >
        {busy ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={[styles.primaryButtonText, { color: colors.white }]}>Create Account</Text>
        )}
      </Pressable>

      <View style={styles.switchRow}>
        <Text style={[styles.switchText, { color: colors.textSecondary }]}>Already have an account? </Text>
        <Pressable onPress={onNavigateLogin} accessibilityRole="button" accessibilityLabel="Sign in">
          <Text style={[styles.switchLink, { color: colors.blue }]}>Sign In</Text>
        </Pressable>
      </View>
    </AuthContainer>
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

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 50,
  },
  disabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '700',
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
