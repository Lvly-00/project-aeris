/**
 * Centralised login error handling (FR-LG-007 + "Expected Errors" matrix).
 *
 * Errors are split into two categories:
 * - Field errors → shown inline below the input (email/password required, invalid email)
 * - Banner errors → shown in the Alert at the bottom (invalid credentials, rate limited, etc.)
 */

export const AUTH_MESSAGES = {
  MISSING_EMAIL: 'Email Address is required.',
  MISSING_PASSWORD: 'Password is required.',
  INVALID_EMAIL: 'Invalid email.',
  INVALID_CREDENTIALS: 'Invalid password.',
  SERVICE_UNAVAILABLE: 'Unable to sign in right now. Please try again later.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  ACCOUNT_LOCKED:
    'Your account is temporarily locked. Please try again later or use Forgot Password if available.',
  RESET_SENT:
    'A verification code has been sent to your email address. Please check your inbox.',
  RESET_FAILED:
    'We could not send a reset code. Please check the email and try again.',
} as const;

export interface LoginFieldError {
  field: 'email' | 'password';
  message: string;
}

export interface LoginErrorResult {
  /** If set, show this message below the given field. */
  fieldError?: LoginFieldError;
  /** If set, show this message in the Alert banner. */
  bannerError?: string;
  /** If > 0, the login button is disabled and shows a countdown of this many seconds. */
  throttleSeconds?: number;
}

function firstFieldError(data: any, field: string): string | undefined {
  const value = data?.[field];
  return Array.isArray(value) && value.length > 0 ? String(value[0]) : undefined;
}

/** Parses "Request was throttled. Expected available in 15 seconds." → 15 */
function parseThrottleSeconds(detail: unknown): number {
  if (typeof detail !== 'string') return 0;
  const match = detail.match(/(\d+)\s+seconds?/i);
  if (!match) return 0;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Maps an axios error from POST /accounts/login/ to a structured result
 * with either a field-level error or a banner-level error.
 */
export function mapLoginError(err: any): LoginErrorResult {
  const status: number | undefined = err?.response?.status;
  const data = err?.response?.data;

  // Account temporarily locked after too many failed attempts (FR-LG-010)
  if (status === 423) return { bannerError: AUTH_MESSAGES.ACCOUNT_LOCKED };

  // Per-client rate limit exceeded (FR-LG-009 / NFR-LG-007).
  // Disable the login button and show a countdown timer.
  if (status === 429) {
    return {
      bannerError: AUTH_MESSAGES.RATE_LIMITED,
      throttleSeconds: parseThrottleSeconds(data?.detail),
    };
  }

  if (status === 400 && data && typeof data === 'object') {
    // Email field errors → show below email input
    const emailError = firstFieldError(data, 'email');
    if (emailError) {
      return {
        fieldError: {
          field: 'email',
          message: emailError.toLowerCase().includes('required')
            ? AUTH_MESSAGES.MISSING_EMAIL
            : AUTH_MESSAGES.INVALID_EMAIL,
        },
      };
    }
    // Password field errors → show below password input
    const passwordError = firstFieldError(data, 'password');
    if (passwordError) {
      return {
        fieldError: {
          field: 'password',
          message: AUTH_MESSAGES.MISSING_PASSWORD,
        },
      };
    }
    if (typeof data.detail === 'string') return { bannerError: data.detail };
  }

  // Bad credentials (or disabled account — detail passes through).
  // FR-LG-008/NFR-LG-009 deliberately return ONE combined message; we show it
  // below the password field since the wrong credential is never revealed.
  if (status === 401 || status === 403) {
    if (typeof data?.detail === 'string' && data.detail.includes('disabled')) {
      return { bannerError: data.detail };
    }
    return {
      fieldError: {
        field: 'password',
        message: AUTH_MESSAGES.INVALID_CREDENTIALS,
      },
    };
  }

  // Backend unreachable / crashed
  if (!err.response || (status !== undefined && status >= 500)) {
    return { bannerError: AUTH_MESSAGES.SERVICE_UNAVAILABLE };
  }

  if (typeof data?.detail === 'string') return { bannerError: data.detail };
  return {
    fieldError: {
      field: 'password',
      message: AUTH_MESSAGES.INVALID_CREDENTIALS,
    },
  };
}
