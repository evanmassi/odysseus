/**
 * Authentication Domain Schemas
 *
 * Validation schemas for user authentication and registration.
 * Used by both client (form validation) and server (API validation).
 */

import { z } from 'zod';

const passwordField = z.string()
  .min(4, 'Password must be at least 4 characters')
  .max(128, 'Password cannot exceed 128 characters');

/**
 * Registration with researcher profile
 *
 * Creates User account with optional Researcher profile.
 * Username is auto-generated from user name (firstname.lastname).
 * Validates user credentials AND researcher information in one schema.
 *
 * If createResearcher is false, user is created without researcher profile
 * (useful for admin/IT staff who won't be creating tubes).
 */
export const registerWithResearcherSchema = z.object({
  // User credentials (username auto-generated server-side from name)
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

  // Optional flag to create researcher profile (defaults to true for backward compatibility)
  createResearcher: z.boolean()
    .optional()
    .default(true),

  // Invite code for lab assignment (required for non-first-user registration)
  inviteCode: z.string()
    .min(1, 'Invite code is required')
    .max(20, 'Invite code too long')
    .transform(val => val.trim().toUpperCase())
    .optional(),
});

export type RegisterWithResearcherRequest = z.infer<typeof registerWithResearcherSchema>;

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
