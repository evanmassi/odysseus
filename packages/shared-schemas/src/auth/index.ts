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
  refreshTokenResponseSchema,
  loginResponseSchema,
  registerWithProfileResponseSchema,
  passwordRequirementsResponseSchema,
  type TokenPair,
  type PublicUserData,
  type AuthResponse,
  type RefreshTokenResponse,
  type LoginResponse,
  type RegisterWithProfileResponse,
  type PasswordRequirementsResponse,
  firstTimeResponseSchema,
  verifyEmailResponseSchema,
  sessionInfoResponseSchema,
  type FirstTimeResponse,
  type VerifyEmailResponse,
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
