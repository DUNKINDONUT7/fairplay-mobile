export const breakpoints = {
  small: 360,
  tablet: 768,
};

export type ScreenSize = 'small' | 'phone' | 'tablet';

export function getScreenSize(width: number): ScreenSize {
  if (width >= breakpoints.tablet) return 'tablet';
  if (width < breakpoints.small) return 'small';
  return 'phone';
}
