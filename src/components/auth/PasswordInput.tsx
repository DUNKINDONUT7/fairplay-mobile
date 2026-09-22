import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';

type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry'> & {
  label: string;
  error?: string;
  hint?: string;
};

export function PasswordInput({ label, error, hint, style, ...inputProps }: PasswordInputProps) {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.inputBackground,
            borderColor: error ? colors.red : colors.border,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.textPrimary }, style]}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!visible}
          accessibilityLabel={label}
          {...inputProps}
        />
        <Pressable
          onPress={() => setVisible((value) => !value)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Feather name={visible ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
        </Pressable>
      </View>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 9,
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
