/**
 * Authentication API Response Types
 *
 * Type definitions for API responses from authentication endpoints.
 */

import type { TokenPair } from '@shared/session/types';
import type { User } from './index';

/**
 * Standard authentication response with user and tokens
 */
export interface AuthResponse {
  user: User;
  tokens: TokenPair;
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
