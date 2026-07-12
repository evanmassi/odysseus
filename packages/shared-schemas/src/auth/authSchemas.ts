/**
 * Authentication Domain Schemas
 *
 * Validation schemas for user registration and authentication, shared by client and server.
 */

import { z } from 'zod';
import { dateField } from '../utils/dateFields';
import { passwordChangeRequiredResponseSchema, passwordField } from './passwordResetSchemas';

export const USER_ROLES = ['system_admin', 'lab_admin', 'user'] as const;
export const USER_STATUSES = ['pending', 'approved', 'rejected', 'deactivated', 'suspended'] as const;
export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export function isAdminRole(role?: string): role is 'system_admin' | 'lab_admin' {
  return role === 'system_admin' || role === 'lab_admin';
}

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
 * Invite code validation (public endpoint for registration flow)
 */
export const validateInviteCodeRequestSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

export const validateInviteCodeResponseSchema = z.object({
  valid: z.boolean(),
  labName: z.string().optional(),
  role: z.enum(['lab_admin', 'user']).optional(),
  createResearcher: z.boolean().optional(),
});

export type ValidateInviteCodeResponse = z.infer<typeof validateInviteCodeResponseSchema>;

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
  researcherActive: z.boolean().optional(),
  personId: z.string().optional(),
  labId: z.string().optional(),
});

export type PublicUserData = z.infer<typeof publicUserDataSchema>;

export const authResponseSchema = z.object({
  user: publicUserDataSchema,
  tokens: tokenPairSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/** Rotation: every refresh issues a new refresh token, so the client must persist both. */
export const refreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiry: dateField,
  refreshToken: z.string(),
  refreshTokenExpiry: dateField,
  tokenType: z.literal('Bearer'),
});

export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

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

export const firstTimeResponseSchema = z.object({
  isFirstTime: z.boolean(),
  needsSystemAdmin: z.boolean().optional(),
});

export type FirstTimeResponse = z.infer<typeof firstTimeResponseSchema>;

export const verifyEmailResponseSchema = z.object({
  emailVerified: z.boolean(),
});

export type VerifyEmailResponse = z.infer<typeof verifyEmailResponseSchema>;

export const sessionInfoResponseSchema = z.object({
  isAuthenticated: z.boolean(),
  reason: z.string().optional(),
  timeUntilIdleTimeoutMs: z.number().optional(),
  showWarning: z.boolean().optional(),
  idleWarningMinutes: z.number().optional(),
});

export type SessionInfoResponse = z.infer<typeof sessionInfoResponseSchema>;
