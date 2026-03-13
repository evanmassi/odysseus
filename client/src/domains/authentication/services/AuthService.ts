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
  /** Used only during first-time setup — bypasses approval workflow. */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    const data = await httpClient.postData('/public/auth/register', request, authResponseSchema);
    return { user: data.user, tokens: data.tokens } as unknown as AuthResponse;
  }

  /**
   * First user: auto-approved as admin (returns tokens).
   * Subsequent users: pending approval (no tokens).
   */
  async registerWithResearcher(
    request: RegisterWithResearcherRequest
  ): Promise<RegisterWithResearcherResponse> {
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
  }

  /** Returns PasswordChangeRequiredResponse when a forced reset is pending. */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const data = await httpClient.postData('/public/auth/login', request, loginResponseSchema);

    if ('requirePasswordChange' in data && data.requirePasswordChange) {
      return data as unknown as PasswordChangeRequiredResponse;
    }

    return {
      user: data.user,
      tokens: (data as { tokens: unknown }).tokens,
    } as unknown as AuthResponse;
  }

  /** Called when login returns requirePasswordChange=true. */
  async forceChangePassword(tempToken: string, newPassword: string): Promise<AuthResponse> {
    const data = await httpClient.postData(
      '/public/auth/force-change-password',
      { tempToken, newPassword },
      authResponseSchema
    );
    return { user: data.user, tokens: data.tokens } as unknown as AuthResponse;
  }

  async verifySession(): Promise<AuthResponse> {
    const data = await httpClient.getData('/auth/verify', authResponseSchema);
    return { user: data.user, tokens: data.tokens } as unknown as AuthResponse;
  }

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
    const result = await httpClient.postData(
      '/public/auth/setup-system-admin',
      data,
      authResponseSchema
    );
    return { user: result.user, tokens: result.tokens } as unknown as AuthResponse;
  }

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

  async verifyEmail(token: string): Promise<void> {
    await httpClient.postData('/public/auth/verify-email', { token }, verifyEmailResponseSchema);
  }

  // Rate limited — 5 minute cooldown between requests
  async resendVerificationEmail(usernameOrEmail: string): Promise<void> {
    await httpClient.postData(
      '/public/auth/resend-verification',
      { usernameOrEmail },
      messageResponseSchema
    );
  }

  async getVerificationStatus(): Promise<VerificationStatusResponse> {
    return await httpClient.getData('/auth/verification-status', verificationStatusResponseSchema);
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    await httpClient.postData(
      '/public/auth/reset-password',
      { token, newPassword },
      resetPasswordResponseSchema
    );
  }

  async logout(): Promise<void> {
    // SessionService will handle token cleanup and HTTP client state
    queryClient.clear();
  }
}

export const authService = new AuthService();
