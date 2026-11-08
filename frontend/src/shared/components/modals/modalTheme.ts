import { useComputedColorScheme } from '@mantine/core';

/**
 * The modal frame's shared measurements. Every dialog in the app uses these so
 * the shell is identical from the login screen to the incident desk.
 */

/** Brand orange: the accent for everything that is not destructive. */
export const ORANGE = 'var(--mantine-color-orange-6)';

/** Destructive red, reserved for actions that remove data for good. */
export const DANGER = 'var(--mantine-color-red-6)';

/** A modal is either brand-accented or a destructive confirmation. */
export type ModalTone = 'brand' | 'danger';

/**
 * The two accents a modal may use. `tile` is the icon square's background,
 * `icon` its glyph, `solid` a filled button, and `soft` a tinted surface.
 * They are theme tokens, so both colour schemes stay readable.
 */
export const MODAL_TONES: Record<
  ModalTone,
  { tile: string; icon: string; solid: string; soft: string }
> = {
  brand: {
    tile: 'var(--mantine-color-orange-6)',
    icon: 'var(--mantine-color-white)',
    solid: 'var(--mantine-color-orange-6)',
    soft: 'var(--mantine-color-orange-light)',
  },
  danger: {
    tile: 'var(--mantine-color-red-light)',
    icon: 'var(--mantine-color-red-6)',
    solid: 'var(--mantine-color-red-6)',
    soft: 'var(--mantine-color-red-light)',
  },
};

/*
 * Small text and icons sitting on pale orange surfaces need a deeper shade in
 * light mode; dark mode flips to the lighter tint so they stay legible.
 */
const ACCENT_LIGHT = '#C2410C';
const ACCENT_DARK = 'var(--mantine-color-orange-4)';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * A modal is a sheet, not a page: these widths stay narrow enough to read a
 * single column of text, and are clamped to the viewport on a phone.
 */
export const MODAL_WIDTHS: Record<ModalSize, number> = {
  sm: 380,
  md: 440,
  lg: 560,
  xl: 640,
};

/**
 * How tall each size may grow before it scrolls instead. These keep a dialog a
 * floating sheet on a phone: even a long document leaves the page visible
 * above and below it, rather than taking over the whole screen.
 */
export const MODAL_MAX_HEIGHTS: Record<ModalSize, number> = {
  sm: 420,
  md: 520,
  lg: 600,
  xl: 640,
};

/** Fluid gutters shared by the header, body, and footer. */
export const MODAL_PADDING_X = { base: 18, sm: 24 } as const;
export const MODAL_PADDING_Y = { base: 18, sm: 22 } as const;

/** One radius for every modal corner. */
export const MODAL_RADIUS = 16;

/** Comfortable touch height; smaller than the old 54px buttons. */
export const MODAL_BUTTON_HEIGHT = 44;

export function useModalAccent() {
  const isDark =
    useComputedColorScheme('light', { getInitialValueInEffect: true }) === 'dark';

  return { isDark, accent: isDark ? ACCENT_DARK : ACCENT_LIGHT };
}
