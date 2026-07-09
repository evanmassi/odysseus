/**
 * Password Reset Schemas
 *
 * Admin-initiated and token-based password reset flows with 15-minute token expiry.
 */

import { z } from 'zod';

const passwordField = z.string()
  .min(4, 'Password must be at least 4 characters')
  .max(128, 'Password cannot exceed 128 characters');

/**
 * Admin directly resets user password
 *
 * Used when admin needs immediate access restoration (locked account, forgotten password).
 * requirePasswordChange forces user to set own password on next login.
 */
export const adminResetPasswordRequestSchema = z.object({
  newPassword: passwordField,

  requirePasswordChange: z.boolean()
    .optional()
    .default(true)
});

/**
 * Admin generates password reset token response
 *
 * Returns full reset URL with embedded token.
 * Admin shares this link manually (no email dependency).
 */
export const generatePasswordResetTokenResponseSchema = z.object({
  resetUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  message: z.string(),
});

export type GeneratePasswordResetTokenResponse = z.infer<typeof generatePasswordResetTokenResponseSchema>;

/**
 * User resets password with token (public endpoint)
 *
 * Token is 32+ character hashed string, expires after 15 minutes or one-time use.
 * No authentication required - token itself is the authentication.
 */
export const resetPasswordWithTokenRequestSchema = z.object({
  token: z.string()
    .min(32, 'Invalid reset token')
    .max(256, 'Token too long'),

  newPassword: passwordField,
});

/**
 * Force Change Password Request
 *
 * Used when user logs in with temp password and requirePasswordChange is true.
 * Temp token is short-lived (5 min) and only allows password change endpoint.
 */
export const forceChangePasswordRequestSchema = z.object({
  tempToken: z.string()
    .min(20, 'Invalid temp token')
    .max(512, 'Token too long'),

  newPassword: passwordField,
});

/**
 * Password Change Required Response
 *
 * Returned from login when user has requirePasswordChange flag set.
 * Contains temp token for force-change-password endpoint.
 */
export const passwordChangeRequiredResponseSchema = z.object({
  requirePasswordChange: z.literal(true),
  tempToken: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string()
  })
});

export type PasswordChangeRequiredResponse = z.infer<typeof passwordChangeRequiredResponseSchema>;
