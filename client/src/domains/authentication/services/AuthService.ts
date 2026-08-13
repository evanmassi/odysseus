/**
 * Authentication Service
 *
 * Handles user authentication, registration, and session verification.
 */
import {
  type RegisterWithProfileRequest,
  authResponseSchema,
  loginResponseSchema,
  registerWithProfileResponseSchema,
  passwordRequirementsResponseSchema,
  validateInviteCodeResponseSchema,
  firstTimeResponseSchema,
  verifyEmailResponseSchema,
  messageResponseSchema,
  type AuthResponse,
  type LoginResponse,
  type RegisterWithProfileResponse,
  type PasswordChangeRequiredResponse,
  type PasswordRequirementsResponse,
  type ValidateInviteCodeResponse,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';

export function isPasswordChangeRequired(
  response: LoginResponse
): response is PasswordChangeRequiredResponse {
  return 'requirePasswordChange' in response && response.requirePasswordChange === true;
}

interface LoginRequest {
  username: string;
  password: string;
}

class AuthService {
  /**
   * First user: auto-approved as admin (returns tokens).
   * Subsequent users: pending approval (no tokens).
   */
  async registerWithProfile(
    request: RegisterWithProfileRequest
  ): Promise<RegisterWithProfileResponse> {
    return await httpClient.postData(
      '/public/auth/register-with-profile',
      request,
      registerWithProfileResponseSchema
    );
  }

  /** Returns PasswordChangeRequiredResponse when a forced reset is pending. */
  async login(request: LoginRequest): Promise<LoginResponse> {
    return await httpClient.postData('/public/auth/login', request, loginResponseSchema);
  }

  /** Password-free sign-in to the shared demo account. 404s when no demo is configured. */
  async demoLogin(): Promise<AuthResponse> {
    return await httpClient.postData('/public/auth/demo-login', {}, authResponseSchema);
  }

  /** Called when login returns requirePasswordChange=true. */
  async forceChangePassword(tempToken: string, newPassword: string): Promise<AuthResponse> {
    return await httpClient.postData(
      '/public/auth/force-change-password',
      { tempToken, newPassword },
      authResponseSchema
    );
  }

  async checkFirstTime(): Promise<{
    isFirstTime: boolean;
    needsSystemAdmin: boolean;
    demoAvailable: boolean;
  }> {
    try {
      const data = await httpClient.getData('/public/auth/first-time', firstTimeResponseSchema);
      return {
        isFirstTime: data.isFirstTime,
        needsSystemAdmin: data.needsSystemAdmin ?? false,
        demoAvailable: data.demoAvailable ?? false,
      };
    } catch (error) {
      // A failed probe must not strand the gateway, and must not advertise a demo that may not exist.
      logger.error('Failed to check first-time setup', { error });
      return { isFirstTime: false, needsSystemAdmin: false, demoAvailable: false };
    }
  }

  async validateInviteCode(code: string): Promise<ValidateInviteCodeResponse> {
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
    return await httpClient.postData('/public/auth/setup-system-admin', data, authResponseSchema);
  }

  async getPasswordRequirements(): Promise<PasswordRequirementsResponse> {
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

  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    await httpClient.postData(
      '/public/auth/reset-password',
      { token, newPassword },
      messageResponseSchema
    );
  }

  async logout(): Promise<void> {
    // Best-effort server-side session revocation; never block local logout if it fails
    // (e.g. the access token already expired).
    try {
      await httpClient.postData('/auth/logout', {}, messageResponseSchema);
    } catch (error) {
      logger.error('Server logout failed; clearing local session anyway', { error });
    }
  }
}

export const authService = new AuthService();
