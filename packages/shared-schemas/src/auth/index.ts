/**
 * Authentication Barrel
 *
 * Registration, email verification, password reset, and password validation.
 */

export {
  registerWithProfileSchema,
  verifyEmailRequestSchema,
  resendVerificationRequestSchema,
  verificationStatusResponseSchema,
  systemAdminSetupSchema,
  validateInviteCodeRequestSchema,
  validateInviteCodeResponseSchema,
  type RegisterWithProfileRequest,
  type VerifyEmailRequest,
  type ResendVerificationRequest,
  type VerificationStatusResponse,
  type SystemAdminSetupRequest,
  type ValidateInviteCodeRequest,
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
  type FirstTimeResponse,
  type VerifyEmailResponse,
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
  passwordChangeRequiredResponseSchema,
  type AdminResetPasswordRequest,
  type GeneratePasswordResetTokenResponse,
  type ResetPasswordWithTokenRequest,
  type ForceChangePasswordRequest,
  type PasswordChangeRequiredResponse,
} from './passwordResetSchemas';
