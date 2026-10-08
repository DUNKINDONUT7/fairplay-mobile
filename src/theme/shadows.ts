import { Platform, type ViewStyle } from 'react-native';

// Cards across the app were flat (border only, no elevation) — the single
// biggest lever for a "premium" feel without touching the color palette.
// iOS reads shadowColor/Offset/Opacity/Radius; Android only reads elevation
// (and derives its own shadow color/angle from it), so both are always set
// together.
function shadow(opacity: number, radius: number, offsetY: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: {},
  }) as ViewStyle;
}

export const shadows = {
  // Standard resting card — section cards, list items, form cards.
  card: shadow(0.05, 10, 3, 2),
  // A card that should read as "above" the rest (modals, the active tab's
  // content, QR cards).
  raised: shadow(0.1, 20, 8, 6),
  // Floating elements (FAB, bottom sheets).
  floating: shadow(0.18, 24, 10, 10),
};

// A colored glow under a brand-colored primary button/FAB — the color must
// match the element's own background to read as a glow rather than a stray
// dark smudge, so this is a function, not a fixed token.
export function coloredShadow(color: string): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
    },
    android: { elevation: 6 },
    default: {},
  }) as ViewStyle;
}
