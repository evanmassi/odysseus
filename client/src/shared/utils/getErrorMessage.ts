/**
 * Error Message Resolver
 *
 * Maps any thrown value to the text shown to the user. Server 4xx responses carry specific,
 * user-ready messages and are surfaced verbatim — the server owns error text. Infrastructure
 * failures (network, timeout, 5xx, rate limit) have no actionable server message and get canned copy.
 */

const NETWORK_STATUS = 0;
const RATE_LIMITED_STATUS = 429;
const SERVER_ERROR_STATUS = 500;
const CLIENT_ERROR_STATUS = 400;

// Legacy client-side network marker; kept for parity with older error paths that set it.
const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

const MESSAGES = {
  rateLimited: 'Too many requests. Please wait a moment and try again.',
  serverError: 'Server error. Please try again.',
  networkError: 'Network error. Check your connection.',
  generic: 'Something went wrong. Please try again.',
} as const;

export function hasStatus(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as Record<string, unknown>)['status'] === 'number'
  );
}

export function hasMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>)['message'] === 'string'
  );
}

function hasCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>)['code'] === 'string'
  );
}

/**
 * True for transport/server failures that carry no actionable server message — network drops,
 * timeouts, 5xx, and rate limiting. Used to gate which query failures are worth a toast.
 */
export function isInfrastructureError(error: unknown): boolean {
  if (hasStatus(error)) {
    if (
      error.status === NETWORK_STATUS ||
      error.status === RATE_LIMITED_STATUS ||
      error.status >= SERVER_ERROR_STATUS
    ) {
      return true;
    }
  }
  return hasCode(error) && error.code === NETWORK_ERROR_CODE;
}

/** The single source of truth for error text shown to the user. */
export function getErrorMessage(error: unknown): string {
  if (hasStatus(error)) {
    if (error.status === RATE_LIMITED_STATUS) return MESSAGES.rateLimited;
    if (error.status >= SERVER_ERROR_STATUS) return MESSAGES.serverError;
    if (error.status === NETWORK_STATUS) return MESSAGES.networkError;
    if (error.status >= CLIENT_ERROR_STATUS) {
      return hasMessage(error) && error.message ? error.message : MESSAGES.generic;
    }
  }

  if (hasCode(error) && error.code === NETWORK_ERROR_CODE) return MESSAGES.networkError;

  return hasMessage(error) && error.message ? error.message : MESSAGES.generic;
}
