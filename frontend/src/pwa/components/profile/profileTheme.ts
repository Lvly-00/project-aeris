import { useComputedColorScheme } from '@mantine/core';

/** Brand orange used for the avatar ring and photo control. */
export const ORANGE = '#FF6B00';

/** Cards tighten their inner padding on phones and relax it from `sm` up. */
export const CARD_PADDING = { base: 'md', sm: 'lg' } as const;

/*
 * Filled buttons and switches share Mantine's orange 6. Small text and icons
 * need a deeper shade so they stay readable on the pale orange surfaces.
 */
const ACCENT_LIGHT ='var(--mantine-color-orange-6)';
const ACCENT_DARK = 'var(--mantine-color-orange-4)';

export function useProfileAccent() {
  const isDark =
    useComputedColorScheme('light', { getInitialValueInEffect: true }) === 'dark';

  return { isDark, accent: isDark ? ACCENT_DARK : ACCENT_LIGHT };
}
