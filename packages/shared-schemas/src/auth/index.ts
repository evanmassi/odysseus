/**
 * Authentication Barrel
 *
 * Registration, email verification, password reset, and password validation.
 */

export {
  registerWithProfileSchema,
  validateInviteCodeRequestSchema,
  validateInviteCodeResponseSchema,
  type RegisterWithProfileRequest,
  type ValidateInviteCodeResponse,
  USER_ROLES,
  USER_STATUSES,
  type UserRole,
  type UserStatus,
  isAdminRole,
  tokenPairSchema,
  publicUserDataSchema,
  authResponseSchema,
  loginResponseSchema,
  registerWithProfileResponseSchema,
  passwordRequirementsResponseSchema,
  type TokenPair,
  type PublicUserData,
  type AuthResponse,
  type LoginResponse,
  type RegisterWithProfileResponse,
  type PasswordRequirementsResponse,
  firstTimeResponseSchema,
  verifyEmailResponseSchema,
  sessionInfoResponseSchema,
  type SessionInfoResponse,
} from './authSchemas';

export {
  PasswordValidator,
  type PasswordRequirementsConfig,
  type PasswordRequirement,
  type PasswordValidationResult,
} from './passwordValidation';

export {
  adminResetPasswordRequestSchema,
  generatePasswordResetTokenResponseSchema,
  resetPasswordWithTokenRequestSchema,
  forceChangePasswordRequestSchema,
  changePasswordRequestSchema,
  passwordChangeRequiredResponseSchema,
  type GeneratePasswordResetTokenResponse,
  type PasswordChangeRequiredResponse,
} from './passwordResetSchemas';
