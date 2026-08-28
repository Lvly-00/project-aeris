/**
 * Shared password security rules (FR-PP-005).
 * Mirrors the Django-side ComplexityPasswordValidator so the UI surfaces the
 * exact same requirements before the backend rejects the request.
 */

export const PASSWORD_MIN_LENGTH = 8;

/** Project-specific common-password list (Django also ships its own list). */
export const COMMON_PASSWORDS = new Set([
  'password', 'password123', 'password1', '123456', '12345678', '123456789',
  '1234567890', '12345', 'qwerty', 'qwerty123', 'qwertyuiop', 'admin',
  'admin123', 'admin1234', 'administrator', 'letmein', 'welcome', 'iloveyou',
  'monkey', 'dragon', 'abc123', 'football', 'baseball', 'sunshine', 'princess',
  'superman', 'mustang', 'batman', 'trustno1', 'michael', '123123', '111111',
  '000000', 'master', 'shadow', '654321', 'jordan23',
]);

export interface PasswordCheck {
  label: string;
  ok: boolean;
}

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has((password || '').toLowerCase());
}

export function getPasswordChecks(password: string): PasswordCheck[] {
  const value = password || '';
  return [
    { label: 'At least 8 characters', ok: value.length >= PASSWORD_MIN_LENGTH },
    { label: 'One uppercase letter', ok: /[A-Z]/.test(value) },
    { label: 'One lowercase letter', ok: /[a-z]/.test(value) },
    { label: 'One number', ok: /\d/.test(value) },
    { label: 'One special character', ok: /[^A-Za-z0-9]/.test(value) },
    { label: 'Not a commonly used password', ok: !isCommonPassword(value) },
  ];
}

export type PasswordStrength = 'Weak' | 'Fair' | 'Strong';

export function getPasswordStrength(password: string): PasswordStrength {
  const value = password || '';

  if (!value || isCommonPassword(value)) return 'Weak';
  if (value.length < PASSWORD_MIN_LENGTH) return 'Weak';

  const variety = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/]
    .filter((re) => re.test(value)).length;

  let score = value.length >= 12 ? 2 : 1;
  score += variety; // 0..4 → total 1..6

  if (score <= 2) return 'Weak';
  if (score <= 4) return 'Fair';
  return 'Strong';
}

/**
 * Returns an error message when the password does not meet every requirement,
 * or `null` when it is acceptable.
 */
export function validatePassword(password: string): string | null {
  if (!password || !password.trim()) return 'Password is required.';
  if (isCommonPassword(password)) {
    return 'This password is too common. Please choose a stronger one.';
  }
  const failed = getPasswordChecks(password).find((c) => !c.ok);
  return failed ? failed.label : null;
}