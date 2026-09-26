import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AuthContainer } from '@/components/auth/AuthContainer';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { FormField } from '@/components/auth/FormField';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import { friendlyAuthError } from '@/utils/authErrors';
import { isValidEmail } from '@/utils/validation';

type AuthResult = { success: boolean; error?: string; message?: string };

export function LoginScreen({
  authConfigured,
  onSignIn,
  onNavigateRegister,
  onNavigateBack,
  noticeMessage,
}: {
  authConfigured?: boolean;
  onSignIn?: (email: string, password: string) => Promise<AuthResult>;
  onNavigateRegister: () => void;
  onNavigateBack?: () => void;
  noticeMessage?: string;
}) {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!password) {
      nextErrors.password = 'Password is required.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (busy) return;
    setFormError('');
    if (!validate()) return;

    setBusy(true);
    const result = await onSignIn?.(email.trim(), password);
    setBusy(false);

    if (!result?.success) {
      setFormError(friendlyAuthError(result?.error));
    }
  };

  return (
    <AuthContainer onBack={onNavigateBack}>
      <AuthHeader title="Welcome Back" subtitle="Sign in to continue to your account." />

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
            Supabase auth is not configured yet, so sign-in will not work until the environment variables are
            connected.
          </Text>
        </View>
      ) : null}

      {formError ? (
        <View style={[styles.banner, { backgroundColor: colors.redLight, borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
          <Feather name="alert-circle" size={14} color={colors.red} />
          <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{formError}</Text>
        </View>
      ) : null}

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
        placeholder="••••••••"
        autoComplete="password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <Pressable
        style={[styles.primaryButton, { backgroundColor: colors.blue }, busy && styles.disabled]}
        onPress={handleSubmit}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Log in"
        accessibilityState={{ disabled: busy, busy }}
      >
        {busy ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={[styles.primaryButtonText, { color: colors.white }]}>Log in</Text>
        )}
      </Pressable>

      <View style={styles.switchRow}>
        <Text style={[styles.switchText, { color: colors.textSecondary }]}>Don&apos;t have an account? </Text>
        <Pressable onPress={onNavigateRegister} accessibilityRole="button" accessibilityLabel="Create account">
          <Text style={[styles.switchLink, { color: colors.blue }]}>Create Account</Text>
        </Pressable>
      </View>
    </AuthContainer>
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
});
