import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';

export function QRCard({ title, subtitle, value }: { title: string; subtitle: string; value: string }) {
  const { colors } = useAppTheme();

  const handleShare = () => {
    Share.share({ message: value }).catch(() => {});
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

      <View style={[styles.qrWrap, { backgroundColor: colors.white }]}>
        <QRCode value={value} size={168} backgroundColor={colors.white} color="#0F172A" />
      </View>

      <View style={[styles.linkRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Text style={[styles.linkText, { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      </View>

      <Pressable
        style={[styles.shareButton, { backgroundColor: colors.blueLight, borderColor: colors.borderActive }]}
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel="Share link"
      >
        <Feather name="share-2" size={14} color={colors.blue} />
        <Text style={[styles.shareText, { color: colors.blue }]}>Share link</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  qrWrap: {
    padding: 14,
    borderRadius: radius.lg,
    marginTop: 4,
  },
  linkRow: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  linkText: {
    fontSize: 11,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  shareText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
