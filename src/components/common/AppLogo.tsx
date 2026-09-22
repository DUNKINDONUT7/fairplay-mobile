import React from 'react';
import Logo from '@/assets/logo.svg';

// Matches the viewBox of src/assets/logo.svg (228x80) so a single dimension
// can be passed without distorting the artwork.
const LOGO_ASPECT_RATIO = 228 / 80;

interface AppLogoProps {
  width?: number;
  height?: number;
}

export function AppLogo({ width, height }: AppLogoProps) {
  const resolvedWidth = width ?? (height ? height * LOGO_ASPECT_RATIO : 140);
  const resolvedHeight = height ?? resolvedWidth / LOGO_ASPECT_RATIO;

  return <Logo width={resolvedWidth} height={resolvedHeight} />;
}
