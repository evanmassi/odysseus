/**
 * Authentication Service
 *
 * Handles user authentication, registration, and session verification.
 */
import {
  type RegisterWithResearcherRequest,
  authResponseSchema,
  loginResponseSchema,
  registerWithResearcherResponseSchema,
  passwordRequirementsResponseSchema,
  verificationStatusResponseSchema,
  validateInviteCodeResponseSchema,
  type VerificationStatusResponse,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

import { queryClient } from '@app/cache/queryClient';
import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';

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

const firstTimeResponseSchema = z.object({
  isFirstTime: z.boolean(),
  needsSystemAdmin: z.boolean().optional(),
});

const verifyEmailResponseSchema = z.object({
  emailVerified: z.boolean(),
});

const messageResponseSchema = z.object({
  message: z.string(),
});

const resetPasswordResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export class AuthService {
  /**
   * Register new user (first-time setup)
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      const data = await httpClient.postData('/public/auth/register', request, authResponseSchema);
      return { user: data.user, tokens: data.tokens } as unknown as AuthResponse;
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
      const data = await httpClient.postData(
        '/public/auth/register-with-researcher',
        request,
        registerWithResearcherResponseSchema
      );
      return {
        user: data.user,
        tokens: data.tokens,
        status: data.status,
        message: data.message,
      } as unknown as RegisterWithResearcherResponse;
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
      const data = await httpClient.postData('/public/auth/login', request, loginResponseSchema);

      if ('requirePasswordChange' in data && data.requirePasswordChange) {
        return data as unknown as PasswordChangeRequiredResponse;
      }

      return {
        user: data.user,
        tokens: (data as { tokens: unknown }).tokens,
      } as unknown as AuthResponse;
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
      const data = await httpClient.postData(
        '/public/auth/force-change-password',
        { tempToken, newPassword },
        authResponseSchema
      );
      return { user: data.user, tokens: data.tokens } as unknown as AuthResponse;
    } catch (error) {
      rethrow(error, 'Password change failed');
    }
  }

  /**
   * Verify current session
   */
  async verifySession(): Promise<AuthResponse> {
    const data = await httpClient.getData('/auth/verify', authResponseSchema);
    return { user: data.user, tokens: data.tokens } as unknown as AuthResponse;
  }

  /**
   * Check if this is first-time setup
   */
  async checkFirstTime(): Promise<{ isFirstTime: boolean; needsSystemAdmin: boolean }> {
    try {
      const data = await httpClient.getData('/public/auth/first-time', firstTimeResponseSchema);
      return {
        isFirstTime: data.isFirstTime,
        needsSystemAdmin: data.needsSystemAdmin ?? false,
      };
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
      return await httpClient.postData(
        '/public/invite-codes/validate',
        { code },
        validateInviteCodeResponseSchema
      );
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
      const result = await httpClient.postData(
        '/public/auth/setup-system-admin',
        data,
        authResponseSchema
      );
      return { user: result.user, tokens: result.tokens } as unknown as AuthResponse;
    } catch (error) {
      rethrow(error, 'System admin setup failed');
    }
  }

  /**
   * Get password requirements (for registration form validation)
   */
  async getPasswordRequirements(): Promise<PasswordRequirements> {
    try {
      return await httpClient.getData(
        '/public/auth/password-requirements',
        passwordRequirementsResponseSchema
      );
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
      await httpClient.postData('/public/auth/verify-email', { token }, verifyEmailResponseSchema);
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
      await httpClient.postData(
        '/public/auth/resend-verification',
        { usernameOrEmail },
        messageResponseSchema
      );
    } catch (error) {
      rethrow(error, 'Failed to resend verification email');
    }
  }

  /**
   * Get email verification status for authenticated user
   */
  async getVerificationStatus(): Promise<VerificationStatusResponse> {
    try {
      return await httpClient.getData(
        '/auth/verification-status',
        verificationStatusResponseSchema
      );
    } catch (error) {
      rethrow(error, 'Failed to get verification status');
    }
  }

  /**
   * Reset password using token (public endpoint - no auth required)
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    try {
      await httpClient.postData(
        '/public/auth/reset-password',
        {
          token,
          newPassword,
        },
        resetPasswordResponseSchema
      );
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
