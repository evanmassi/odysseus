/**
 * Users Domain - Public API
 *
 * Exports services and hooks for user account management:
 * - PersonService: Profile data operations
 * - UserSessionService: Session management operations
 * - UserSettingsService: User preferences and settings
 * - UserPasswordService: Password management operations
 * - useUserProfile: Profile query and mutation hooks
 * - useChangePassword: Password change mutation hooks
 */

export { PersonService, type UpdatePersonProfileWithPassword } from './services/PersonService';
export { UserSessionService, type ActiveSession } from './services/UserSessionService';
export { UserSettingsService, userSettingsService } from './services/UserSettingsService';
export { UserPasswordService } from './services/UserPasswordService';
export {
  useUserProfile,
  useUserProfileActions,
  useUserProfileQuery,
  useUpdateUserProfileMutation
} from './hooks/useUserProfile';
export {
  useChangePassword,
  useChangePasswordMutation
} from './hooks/useChangePassword';
