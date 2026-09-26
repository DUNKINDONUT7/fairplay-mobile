import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AuthContainer } from '@/components/auth/AuthContainer';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { FormField } from '@/components/auth/FormField';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import { friendlyAuthError } from '@/utils/authErrors';
import { isValidEmail } from '@/utils/validation';

type AuthResult = { success: boolean; error?: string; message?: string };

export function ForgotPasswordScreen({
  authConfigured,
  onSendResetLink,
  onNavigateBack,
}: {
  authConfigured?: boolean;
  onSendResetLink?: (email: string) => Promise<AuthResult>;
  onNavigateBack: () => void;
}) {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (busy) return;
    setFormError('');
    setFormMessage('');

    if (!email.trim()) {
      setEmailError('Email is required.');
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');

    setBusy(true);
    const result = await onSendResetLink?.(email.trim());
    setBusy(false);

    if (result?.success) {
      setFormMessage(result.message || 'Check your email for a link to reset your password.');
    } else {
      setFormError(friendlyAuthError(result?.error));
    }
  };

  return (
    <AuthContainer onBack={onNavigateBack}>
      <AuthHeader title="Reset Password" subtitle="Enter your account email and we'll send you a link to reset your password." />

      {!authConfigured ? (
        <View style={[styles.banner, { backgroundColor: colors.amberLight, borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
          <Feather name="alert-triangle" size={14} color={colors.amber} />
          <Text style={[styles.bannerText, { color: colors.textPrimary }]}>
            Supabase auth is not configured yet, so password reset will not work until the environment variables are
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

      {formMessage ? (
        <View style={[styles.banner, { backgroundColor: colors.greenLight, borderColor: 'rgba(34, 197, 94, 0.4)' }]}>
          <Feather name="check-circle" size={14} color={colors.green} />
          <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{formMessage}</Text>
        </View>
      ) : null}

      <FormField
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (emailError) setEmailError('');
        }}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@example.com"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <Pressable
        style={[styles.primaryButton, { backgroundColor: colors.blue }, busy && styles.disabled]}
        onPress={handleSubmit}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Send reset link"
        accessibilityState={{ disabled: busy, busy }}
      >
        {busy ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={[styles.primaryButtonText, { color: colors.white }]}>Send reset link</Text>
        )}
      </Pressable>

      <View style={styles.switchRow}>
        <Pressable onPress={onNavigateBack} accessibilityRole="button" accessibilityLabel="Back to sign in">
          <Text style={[styles.switchLink, { color: colors.blue }]}>Back to sign in</Text>
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
    marginTop: 24,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
