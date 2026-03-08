/**
 * Authentication Service
 *
 * Handles user authentication, registration, and session verification.
 */
import {
  type RegisterWithResearcherRequest,
  type VerificationStatusResponse,
} from '@odysseus/shared-schemas';

import { queryClient } from '@app/cache/queryClient';
import { httpClient } from '@infra/api/HttpClient';
import { logger } from '@shared/infrastructure/logger';

import type { UserRole } from '../types';
import type {
  AuthResponse,
  RegisterWithResearcherResponse,
  LoginResponse,
  PasswordChangeRequiredResponse,
} from '../types/apiTypes';
export { isPasswordChangeRequired } from '../types/apiTypes';

export interface RegisterRequest {
  username: string;
  password: string;
  role?: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface PasswordRequirements {
  passwordMinLength: number;
  requireStrongPasswords: boolean;
  passwordRequireSpecialChars: boolean;
}

function rethrow(error: unknown, fallback: string): never {
  if (error && typeof error === 'object' && 'message' in error) {
    throw new Error((error as Error).message);
  }
  throw new Error(fallback);
}

export class AuthService {
  /**
   * Register new user (first-time setup)
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await httpClient.post<{ success: boolean; data: AuthResponse }>(
        '/public/auth/register',
        request
      );

      if (response.data.success && response.data.data) {
        const responseData = response.data.data;

        return {
          user: responseData.user,
          tokens: responseData.tokens,
        };
      }

      throw new Error('Registration failed');
    } catch (error) {
      rethrow(error, 'Registration failed');
    }
  }

  /**
   * Register user with researcher profile and approval workflow
   *
   * First user: Auto-approved as admin (returns tokens)
   * Subsequent users: Pending approval (no tokens)
   */
  async registerWithResearcher(
    request: RegisterWithResearcherRequest
  ): Promise<RegisterWithResearcherResponse> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: RegisterWithResearcherResponse;
      }>('/public/auth/register-with-researcher', request);

      if (response.data.success && response.data.data) {
        const responseData = response.data.data;

        return {
          user: responseData.user,
          tokens: responseData.tokens,
          status: responseData.status,
          message: responseData.message,
        };
      }

      throw new Error('Registration failed');
    } catch (error) {
      rethrow(error, 'Registration failed');
    }
  }

  /**
   * Login with username and password
   *
   * Returns either:
   * - AuthResponse: Normal login with tokens
   * - PasswordChangeRequiredResponse: User must change password first
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      // HttpClient automatically transforms dates using existing responseTransformers
      const response = await httpClient.post<{ success: boolean; data: LoginResponse }>(
        '/public/auth/login',
        request
      );

      if (response.data.success && response.data.data) {
        const responseData = response.data.data;

        if ('requirePasswordChange' in responseData && responseData.requirePasswordChange) {
          return responseData as PasswordChangeRequiredResponse;
        }

        return {
          user: (responseData as AuthResponse).user,
          tokens: (responseData as AuthResponse).tokens,
        };
      }

      throw new Error('Login failed');
    } catch (error) {
      rethrow(error, 'Login failed');
    }
  }

  /**
   * Force change password using temp token from login
   *
   * Called when login returns requirePasswordChange=true.
   * After successful password change, returns normal auth response.
   */
  async forceChangePassword(tempToken: string, newPassword: string): Promise<AuthResponse> {
    try {
      const response = await httpClient.post<{ success: boolean; data: AuthResponse }>(
        '/public/auth/force-change-password',
        { tempToken, newPassword }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Password change failed');
    } catch (error) {
      rethrow(error, 'Password change failed');
    }
  }

  /**
   * Verify current session
   */
  async verifySession(): Promise<AuthResponse> {
    const response = await httpClient.get<{ success: boolean; data: AuthResponse }>('/auth/verify');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    // SessionService will handle token cleanup on error
    throw new Error('Session verification failed');
  }

  /**
   * Check if this is first-time setup
   */
  async checkFirstTime(): Promise<{ isFirstTime: boolean; needsSystemAdmin: boolean }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: { isFirstTime: boolean; needsSystemAdmin: boolean };
      }>('/public/auth/first-time');

      if (response.data.success && response.data.data) {
        return {
          isFirstTime: response.data.data.isFirstTime,
          needsSystemAdmin: response.data.data.needsSystemAdmin ?? false,
        };
      }

      return { isFirstTime: false, needsSystemAdmin: false };
    } catch (error) {
      logger.error('Failed to check first-time setup', { error });
      return { isFirstTime: false, needsSystemAdmin: false };
    }
  }

  /**
   * Validate an invite code (public endpoint for registration flow)
   */
  async validateInviteCode(code: string): Promise<{ valid: boolean; labName?: string }> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: { valid: boolean; labName?: string };
      }>('/public/invite-codes/validate', { code });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return { valid: false };
    } catch (error) {
      logger.error('Failed to validate invite code', { error });
      return { valid: false };
    }
  }

  /**
   * One-time system admin account creation
   */
  async setupSystemAdmin(data: {
    username: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
    setupKey?: string;
    department?: string;
    position?: string;
  }): Promise<AuthResponse> {
    try {
      const response = await httpClient.post<{ success: boolean; data: AuthResponse }>(
        '/public/auth/setup-system-admin',
        data
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('System admin setup failed');
    } catch (error) {
      rethrow(error, 'System admin setup failed');
    }
  }

  /**
   * Get password requirements (for registration form validation)
   */
  async getPasswordRequirements(): Promise<PasswordRequirements> {
    try {
      const response = await httpClient.get<{ success: boolean; data: PasswordRequirements }>(
        '/public/auth/password-requirements'
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return {
        passwordMinLength: 8,
        requireStrongPasswords: false,
        passwordRequireSpecialChars: false,
      };
    } catch (error) {
      logger.error('Failed to get password requirements', { error });
      return {
        passwordMinLength: 8,
        requireStrongPasswords: false,
        passwordRequireSpecialChars: false,
      };
    }
  }

  /**
   * Verify email with token from verification link
   * Public endpoint - no authentication required
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const response = await httpClient.post<{ success: boolean; message: string }>(
        '/public/auth/verify-email',
        { token }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Email verification failed');
      }
    } catch (error) {
      rethrow(error, 'Email verification failed');
    }
  }

  /**
   * Resend verification email (public endpoint - no authentication required)
   * Rate limited - 5 minute cooldown between requests
   */
  async resendVerificationEmail(usernameOrEmail: string): Promise<void> {
    try {
      const response = await httpClient.post<{ success: boolean; message: string }>(
        '/public/auth/resend-verification',
        { usernameOrEmail }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      rethrow(error, 'Failed to resend verification email');
    }
  }

  /**
   * Get email verification status for authenticated user
   */
  async getVerificationStatus(): Promise<VerificationStatusResponse> {
    try {
      const response = await httpClient.get<VerificationStatusResponse>(
        '/auth/verification-status'
      );
      return response.data;
    } catch (error) {
      rethrow(error, 'Failed to get verification status');
    }
  }

  /**
   * Reset password using token (public endpoint - no auth required)
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    try {
      await httpClient.post('/public/auth/reset-password', {
        token,
        newPassword,
      });
    } catch (error) {
      rethrow(error, 'Failed to reset password');
    }
  }

  async logout(): Promise<void> {
    // SessionService will handle token cleanup and HTTP client state
    queryClient.clear();
  }
}

export const authService = new AuthService();
