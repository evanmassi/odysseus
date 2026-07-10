/**
 * Authentication Domain Public API
 */

export { AuthGateway } from './ui/components/gateway/AuthGateway';
export { AuthEmailVerificationPage } from './ui/components/gateway/AuthEmailVerificationPage';
export { AuthSessionTimeoutModal } from './ui/components/gateway/AuthSessionTimeoutModal';
export { AuthPasswordResetPage } from './ui/components/password/AuthPasswordResetPage';
export { PasswordRequirements } from './ui/components/password/PasswordRequirements';

export { useAuthStore, sessionManager } from './stores/authStore';

export { useLabId } from './hooks/useLabId';
export { useIsDemo } from './hooks/useIsDemo';
export { usePasswordRequirementsQuery } from './hooks/usePasswordRequirementsQuery';
export { firstTimeSetupQueryOptions } from './hooks/useFirstTimeSetupQuery';

export type { SessionDebugInfo } from './types/debugTypes';
