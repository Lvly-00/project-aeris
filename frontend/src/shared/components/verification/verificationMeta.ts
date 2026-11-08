/** Shared copy and helpers for the verification-code flow. */

export const CODE_TTL_SECONDS = 300;
export const RESEND_COOLDOWN_SECONDS = 55;

/** mm:ss for the code's remaining lifetime. */
export function formatClock(totalSeconds: number) {
  const safe = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** Keeps most of the address private while still being recognisable. */
export function maskEmail(value: string) {
  if (!value) return '';
  const [name, domain] = value.split('@');
  return `${name.substring(0, 2)}${'*'.repeat(8)}@${domain}`;
}
