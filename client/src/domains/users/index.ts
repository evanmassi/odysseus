/**
 * Users Domain Public API
 *
 * Services and hooks for user account management.
 */

export { PersonService, type UpdatePersonProfileWithPassword } from './services/PersonService';
export { UserSessionService, type ActiveSession } from './services/UserSessionService';
export { UserSettingsService, userSettingsService } from './services/UserSettingsService';
export { UserPasswordService } from './services/UserPasswordService';
export { UserLookupService, userLookupService } from './services/UserLookupService';
export { useUserProfile, useUserProfileActions } from './hooks/useUserProfile';
export { useChangePassword } from './hooks/useChangePassword';
export { useUserSessions } from './hooks/useUserSessions';
export {
  useUserSettings,
  useUserSettingsActions,
  useUserSettingsQuery,
} from './hooks/useUserSettings';
export { useUserLookupQuery } from './hooks/useUserLookupQuery';
export { useActiveUsersQuery } from './hooks/useActiveUsersQuery';
export { usePresenceQuery } from './hooks/usePresenceQuery';
