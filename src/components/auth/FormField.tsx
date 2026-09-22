import React from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export function FormField({ label, error, hint, style, ...inputProps }: FormFieldProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.inputBackground,
            borderColor: error ? colors.red : colors.border,
          },
          style,
        ]}
        placeholderTextColor={colors.placeholder}
        accessibilityLabel={label}
        {...inputProps}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.red }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
});
