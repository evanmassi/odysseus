/**
 * Authentication Domain Schemas
 *
 * Validation schemas for user registration and authentication, shared by client and server.
 */

import { z } from 'zod';
import { dateField } from '../utils/dateFields';
import { passwordChangeRequiredResponseSchema } from './passwordResetSchemas';

export const USER_ROLES = ['system_admin', 'lab_admin', 'user'] as const;
export const USER_STATUSES = ['pending', 'approved', 'rejected', 'deactivated', 'suspended'] as const;
export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export function isAdminRole(role?: string): role is 'system_admin' | 'lab_admin' {
  return role === 'system_admin' || role === 'lab_admin';
}

const passwordField = z.string()
  .min(4, 'Password must be at least 4 characters')
  .max(128, 'Password cannot exceed 128 characters');

/**
 * User Registration With Profile
 *
 * Creates User account with Person profile. Researcher profile creation
 * is determined by the invite code, not by the registration request.
 */
export const registerWithProfileSchema = z.object({
  password: passwordField,

  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .transform(val => val.trim()),

  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
    .transform(val => val.trim()),

  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email cannot exceed 255 characters')
    .transform(val => val.trim()),

  department: z.string()
    .max(100, 'Department cannot exceed 100 characters')
    .transform(val => val.trim())
    .optional()
    .or(z.literal('')),

  position: z.string()
    .max(100, 'Position cannot exceed 100 characters')
    .transform(val => val.trim())
    .optional()
    .or(z.literal('')),

  inviteCode: z.string()
    .min(1, 'Invite code is required')
    .max(20, 'Invite code too long')
    .transform(val => val.trim().toUpperCase())
    .optional(),
});

export type RegisterWithProfileRequest = z.infer<typeof registerWithProfileSchema>;

/**
 * System admin one-time setup
 *
 * Creates the initial system admin account. Only works when no system admin exists.
 * In production, requires a setup key from environment variable.
 */
export const systemAdminSetupSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(50, 'Username cannot exceed 50 characters')
    .transform(val => val.trim()),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),

  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email cannot exceed 255 characters')
    .transform(val => val.trim()),

  setupKey: z.string().optional(),
});

export type SystemAdminSetupRequest = z.infer<typeof systemAdminSetupSchema>;

/**
 * Invite code validation (public endpoint for registration flow)
 */
export const validateInviteCodeRequestSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

export type ValidateInviteCodeRequest = z.infer<typeof validateInviteCodeRequestSchema>;

export const validateInviteCodeResponseSchema = z.object({
  valid: z.boolean(),
  labName: z.string().optional(),
  role: z.enum(['lab_admin', 'user']).optional(),
  createResearcher: z.boolean().optional(),
});

export type ValidateInviteCodeResponse = z.infer<typeof validateInviteCodeResponseSchema>;

/**
 * Email verification token validation
 *
 * Tokens are 32+ character hashed strings generated server-side.
 * Used for email verification link clicked by user.
 */
export const verifyEmailRequestSchema = z.object({
  token: z.string()
    .min(32, 'Invalid verification token')
    .max(256, 'Token too long')
});

export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;

/**
 * Resend verification email request
 *
 * No body needed - user ID extracted from JWT token.
 * Rate limited to prevent abuse (5 minute cooldown between requests).
 */
export const resendVerificationRequestSchema = z.object({});

export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;

export const verificationStatusResponseSchema = z.object({
  emailVerified: z.boolean(),
  email: z.string().email()
});

export type VerificationStatusResponse = z.infer<typeof verificationStatusResponseSchema>;

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiry: dateField,
  refreshTokenExpiry: dateField,
  tokenType: z.literal('Bearer'),
  lastActivityTime: dateField,
  sessionTimeoutMinutes: z.number().int().optional(),
  idleWarningMinutes: z.number().int().optional(),
});

export type TokenPair = z.infer<typeof tokenPairSchema>;

export const publicUserDataSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(USER_ROLES),
  createdAt: dateField,
  lastActivity: dateField,
  status: z.enum(USER_STATUSES),
  isDemo: z.boolean(),
  researcherId: z.string().optional(),
  personId: z.string().optional(),
  labId: z.string().optional(),
});

export type PublicUserData = z.infer<typeof publicUserDataSchema>;

export const authResponseSchema = z.object({
  user: publicUserDataSchema,
  sessionToken: z.string(),
  tokens: tokenPairSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const loginResponseSchema = z.union([
  authResponseSchema,
  passwordChangeRequiredResponseSchema,
]);

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const registerWithProfileResponseSchema = z.object({
  user: publicUserDataSchema,
  tokens: tokenPairSchema.optional(),
  status: z.enum(['approved', 'pending'] as const),
  message: z.string(),
});

export type RegisterWithProfileResponse = z.infer<typeof registerWithProfileResponseSchema>;

export const passwordRequirementsResponseSchema = z.object({
  passwordMinLength: z.number().int(),
  requireStrongPasswords: z.boolean(),
  passwordRequireSpecialChars: z.boolean(),
});

export type PasswordRequirementsResponse = z.infer<typeof passwordRequirementsResponseSchema>;

// Response schemas

export const firstTimeResponseSchema = z.object({
  isFirstTime: z.boolean(),
  needsSystemAdmin: z.boolean().optional(),
});

export type FirstTimeResponse = z.infer<typeof firstTimeResponseSchema>;

export const verifyEmailResponseSchema = z.object({
  emailVerified: z.boolean(),
});

export type VerifyEmailResponse = z.infer<typeof verifyEmailResponseSchema>;
