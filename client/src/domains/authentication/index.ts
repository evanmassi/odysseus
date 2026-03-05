/**
 * Public API for Authentication Domain
 */

// UI Components
export { AuthGateway } from './ui/components/AuthGateway';
export { RegisterModal } from './ui/components/RegisterModal';

// Store
export { useAuthStore } from './stores/authStore';

// Hooks
export { useUserSettings, useUserSettingsActions } from '@domains/users/hooks/useUserSettings';

// Types
export * from './types';
