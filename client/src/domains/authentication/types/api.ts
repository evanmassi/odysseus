/**
 * Authentication API Response Types
 *
 * Type definitions for API responses from authentication endpoints.
 */

import type { User } from './index';
import type { TokenPair } from '@shared/session/types';

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

/**
 * Response when user must change password before login completes
 * Returned when requirePasswordChange=true after admin password reset
 */
export interface PasswordChangeRequiredResponse {
  requirePasswordChange: true;
  tempToken: string;
  user: {
    id: string;
    username: string;
  };
}

/**
 * Login response - can be either normal auth or password change required
 */
export type LoginResponse = AuthResponse | PasswordChangeRequiredResponse;

export function isPasswordChangeRequired(
  response: LoginResponse
): response is PasswordChangeRequiredResponse {
  return 'requirePasswordChange' in response && response.requirePasswordChange === true;
}

/**
 * Registration with researcher profile response
 * Supports both approved (with tokens) and pending (awaiting approval) states
 */
export interface RegisterWithResearcherResponse {
  user: User;
  tokens?: TokenPair;
  status: 'approved' | 'pending';
  message: string;
}
