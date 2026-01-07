/**
 * Authentication API Response Types
 *
 * Type definitions for API responses from authentication endpoints.
 */

import type { User } from './index';
import type { TokenPair } from '@shared/session/types';

/**
 * Standard authentication response with user and tokens
 */
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

/**
 * Type guard to check if login response requires password change
 */
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

/**
 * Raw API response from authentication endpoints
 * Returned by httpClient before transformation
 */
export interface AuthApiResponse {
  data: AuthResponse;
}

/**
 * Raw API response from register with researcher endpoint
 */
export interface RegisterWithResearcherApiResponse {
  data: RegisterWithResearcherResponse;
}
