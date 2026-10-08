import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { coloredShadow, radius, shadows } from '@/theme';

export function QRCard({
  title,
  subtitle,
  value,
  icon,
  accentColor,
  accentLight,
}: {
  title: string;
  subtitle: string;
  value: string;
  // icon/accentColor/accentLight are opt-in: omitting them keeps the plain
  // look every existing QR card already has. Pass them for a QR that needs
  // to look visibly different at a glance (e.g. a public, no-login scan
  // target like audience attendance) so it's never confused with another
  // QR code on the same screen or printout.
  icon?: keyof typeof Feather.glyphMap;
  accentColor?: string;
  accentLight?: string;
}) {
  const { colors } = useAppTheme();
  const tint = accentColor || colors.blue;
  const tintLight = accentLight || colors.blueLight;

  const handleShare = () => {
    Share.share({ message: value }).catch(() => {});
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        accentColor && { borderTopColor: tint, borderTopWidth: 3 },
      ]}
    >
      {icon ? (
        <View style={[styles.iconBadge, { backgroundColor: tintLight }]}>
          <Feather name={icon} size={16} color={tint} />
        </View>
      ) : null}

      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

      <View style={[styles.qrWrap, { backgroundColor: colors.white }]}>
        <QRCode value={value} size={168} backgroundColor={colors.white} color={accentColor ? tint : '#0F172A'} />
      </View>

      <View style={[styles.linkRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Text style={[styles.linkText, { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      </View>

      <Pressable
        style={[styles.shareButton, { backgroundColor: tintLight, borderColor: accentColor ? tint : colors.borderActive }]}
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel="Share link"
      >
        <Feather name="share-2" size={14} color={tint} />
        <Text style={[styles.shareText, { color: tint }]}>Share link</Text>
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
    ...shadows.raised,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -2,
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
    ...shadows.card,
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
