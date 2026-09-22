import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';

export function AuthContainer({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {onBack ? (
        <View style={[styles.backBar, { paddingTop: insets.top + 12 }]}>
          <Pressable
            onPress={onBack}
            style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: onBack ? 8 : insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backBar: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
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
  },
});
