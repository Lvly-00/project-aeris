/**
 * Centralised login error handling (FR-LG-007 + "Expected Errors" matrix).
 *
 * Security note (NFR-LG-009): the system intentionally returns ONE combined
 * message ("Invalid email or password.") instead of separate "Invalid email."
 * / "Invalid password." responses — revealing WHICH field was wrong would let
 * attackers enumerate registered accounts. This satisfies NFR-LG-009 /
 * NFR-LG-008, which take precedence over granular per-field feedback.
 */

export const AUTH_MESSAGES = {
  MISSING_EMAIL: 'Email Address is required.',
  MISSING_PASSWORD: 'Password is required.',
  INVALID_EMAIL: 'Invalid email.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  SERVICE_UNAVAILABLE: 'Unable to sign in right now. Please try again later.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  ACCOUNT_LOCKED:
    'Your account is temporarily locked. Please try again later or use Forgot Password if available.',
  RESET_SENT:
    'If an account exists for the provided information, password reset instructions will be sent.',
} as const;

function firstFieldError(data: any, field: string): string | undefined {
  const value = data?.[field];
  return Array.isArray(value) && value.length > 0 ? String(value[0]) : undefined;
}

/** Maps an axios error from POST /accounts/login/ to a user-facing message. */
export function mapLoginError(err: any): string {
  const status: number | undefined = err?.response?.status;
  const data = err?.response?.data;

  // Account temporarily locked after too many failed attempts (FR-LG-010)
  if (status === 423) return AUTH_MESSAGES.ACCOUNT_LOCKED;

  // Per-client rate limit exceeded (FR-LG-009 / NFR-LG-007)
  if (status === 429) return AUTH_MESSAGES.RATE_LIMITED;

  if (status === 400 && data && typeof data === 'object') {
    const emailError = firstFieldError(data, 'email');
    if (emailError) {
      return emailError.toLowerCase().includes('required')
        ? AUTH_MESSAGES.MISSING_EMAIL
        : AUTH_MESSAGES.INVALID_EMAIL;
    }
    const passwordError = firstFieldError(data, 'password');
    if (passwordError) {
      return passwordError.toLowerCase().includes('required')
        ? AUTH_MESSAGES.MISSING_PASSWORD
        : AUTH_MESSAGES.MISSING_PASSWORD;
    }
    if (typeof data.detail === 'string') return data.detail;
  }

  // Bad credentials (or disabled account — detail passes through)
  if (status === 401 || status === 403) {
    if (typeof data?.detail === 'string' && data.detail.includes('disabled')) {
      return data.detail;
    }
    return AUTH_MESSAGES.INVALID_CREDENTIALS;
  }

  // Backend unreachable / crashed
  if (!err.response || (status !== undefined && status >= 500)) {
    return AUTH_MESSAGES.SERVICE_UNAVAILABLE;
  }

  if (typeof data?.detail === 'string') return data.detail;
  return AUTH_MESSAGES.INVALID_CREDENTIALS;
}
