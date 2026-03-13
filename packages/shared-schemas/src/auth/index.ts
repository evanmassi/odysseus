/**
 * Authentication Barrel
 *
 * Registration, email verification, password reset, and password validation.
 */

export {
  registerWithResearcherSchema,
  verifyEmailRequestSchema,
  resendVerificationRequestSchema,
  verificationStatusResponseSchema,
  systemAdminSetupSchema,
  validateInviteCodeRequestSchema,
  validateInviteCodeResponseSchema,
  type RegisterWithResearcherRequest,
  type VerifyEmailRequest,
  type ResendVerificationRequest,
  type VerificationStatusResponse,
  type SystemAdminSetupRequest,
  type ValidateInviteCodeRequest,
  type ValidateInviteCodeResponse,
  tokenPairSchema,
  publicUserDataSchema,
  authResponseSchema,
  loginResponseSchema,
  registerWithResearcherResponseSchema,
  passwordRequirementsResponseSchema,
  type TokenPair,
  type PublicUserData,
  type AuthResponse,
  type LoginResponse,
  type RegisterWithResearcherResponse,
  type PasswordRequirementsResponse,
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
