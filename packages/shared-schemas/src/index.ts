/**
 * @odysseus/shared-schemas
 *
 * Validation schemas used by both client and server.
 */

export {
  // Constants
  CONCENTRATION_UNITS,
  UNKNOWN_RESEARCHER,

  // Domain Schemas
  tubeLocationSchema,
  tubeSampleSchema,
  tubeTimestampsSchema,
  tubeDataSchema,
  tubeDataArraySchema,

  // API Schemas (Client & Server use these directly)
  createTubeRequestSchema,
  updateTubeRequestSchema,
  tubeQueryFiltersSchema,
  batchTubeOperationSchema,
  tubeValidationResultSchema,

  // Types
  type TubeData,
  type TubeLocation,
  type TubeSample,
  type TubeUpdateSample,
  type TubeTimestamps,
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type TubeQueryFilters,
  type BatchTubeOperation,
  type TubeValidationResult,
  type ConcentrationUnit,

  // Form Input Types (z.input - raw form state before Zod transformations)
  type CreateTubeFormInput,
  type UpdateTubeFormInput,

  // Utilities
  validateTubePosition,
  validateConcentrationUnit
} from './tubes/tubeSchemas';

// Tube Validation Utilities
export {
  parseConcentrationInput,
  concentrationPreprocessor,
  concentrationPreprocessorNullable,
  parseDate,
  datePreprocessor,
  datePreprocessorNullable,
  optionalFromEmpty,
  nullableOptionalFromEmpty,
  validateConcentrationUnit as validateConcentrationUnitInvariant,
  concentrationUnitRefinement
} from './tubes/tubeValidation';

// Tube Display Formatters (Presentation layer only)
export {
  formatConcentrationDisplay,
  formatTubeLocation,
  formatTubeLocationShort,
  formatTubeDate,
  parseConcentrationDisplay,
  type TubeLocationFormatOptions
} from './tubes/tubeFormatters';

// Tube Data Mappers
export {
  tubeDataToCreateRequest,
  tubeDataArrayToCreateRequests
} from './tubes/tubeMappers';

// Tube Lock Schemas (Lock/Unlock operations)
export {
  // Request Schemas
  lockTubesRequestSchema,
  unlockTubesRequestSchema,
  shareTubeAccessRequestSchema,
  revokeTubeAccessRequestSchema,

  // Result Schemas
  skippedTubeSchema,
  batchLockResultSchema,
  batchUnlockResultSchema,
  shareAccessResultSchema,
  revokeAccessResultSchema,

  // Request Types
  type LockTubesRequest,
  type UnlockTubesRequest,
  type ShareTubeAccessRequest,
  type RevokeTubeAccessRequest,

  // Result Types
  type SkippedTube,
  type BatchLockResult,
  type BatchUnlockResult,
  type ShareAccessResult,
  type RevokeAccessResult,
} from './tubes/tubeLockSchemas';

// Lookup Schemas (Admin-managed dropdown values)
export {
  LOOKUP_CATEGORIES,
  lookupValueSchema,
  lookupValueWithCountSchema,
  createLookupValueRequestSchema,
  renameLookupValueRequestSchema,
  type LookupCategory,
  type LookupValue,
  type LookupValueWithCount,
  type CreateLookupValueRequest,
  type RenameLookupValueRequest,
} from './lookups';

// Search Schemas
export {
  // Schemas
  SearchFiltersSchema,
  AdvancedSearchOptionsSchema,
  SearchPaginationSchema,
  SearchMetadataSchema,
  SearchResultSchema,
  GroupedResultSchema,
  SearchResultsSchema,
  SearchSuggestionsResponseSchema,
  SaveSearchResponseSchema,
  SavedSearchSchema,
  SavedSearchesResponseSchema,
  FilterOptionsResponseSchema,
  
  // Types
  type SearchFilters,
  type AdvancedSearchOptions,
  type SearchResult,
  type GroupedResult,
  type SearchResults,
  type SearchSuggestionsResponse,
  type SaveSearchResponse,
  type SavedSearch,
  type SavedSearchesResponse,
  type FilterOptionsResponse
} from './search/searchSchemas';

// Researcher Schemas (Clean Architecture - Simple Domain Entities)
export {
  // Core Schemas
  researcherSchema,
  researchersArraySchema,
  createResearcherProfileSchema,
  updateResearcherProfileSchema,
  researcherQueryFiltersSchema,
  adminResearcherSchema,
  adminResearchersResponseSchema,

  // Types
  type Researcher,
  type CreateResearcherProfile,
  type UpdateResearcherProfile,
  type ResearcherQueryFilters,
  type AdminResearcher,
  type AdminResearchersResponse,

  // Utilities
  validateResearcherName,
  validateResearcherEmail,

  // Display Formatters
  formatResearcherListDisplay,
  formatResearcherDropdownDisplay,
  formatResearcherFullDisplay,

  // Duplicate Detection
  calculateNameSimilarity,
  findSimilarResearchers
} from './researchers/researcherSchemas';

// Transport Schemas
export {
  // Envelope Schemas (generic functions)
  successEnvelopeSchema,
  errorEnvelopeSchema,
  paginatedEnvelopeSchema,
  batchEnvelopeSchema,
  
  // Error Class
  ApiError,
  
  // Types
  type PaginatedResult,
  type BatchResult
} from './infrastructure/transportSchemas';

// Laboratory Configuration Schemas
export {
  // Schemas
  GridConfigurationSchema,
  BoxConfigurationSchema,
  RackConfigurationSchema,
  TankConfigurationSchema,
  ColorSchemeSchema,
  EquipmentConfigurationSchema,
  LabConfigurationSchema,
  GlobalSettingsSchema,
  SystemConfigurationSchema,
  ConfigurationResponseSchema,
  SaveConfigurationRequestSchema,
  DeleteTankResponseSchema,

  // Types
  type GridConfiguration,
  type BoxConfiguration,
  type RackConfiguration,
  type TankConfiguration,
  type ColorScheme,
  type EquipmentConfiguration,
  type LabConfiguration,
  type GlobalSettings,
  type SystemConfiguration,
  type ConfigurationResponse,
  type SaveConfigurationRequest,
  type DeleteTankResponse
} from './storage/configurationSchemas';

// Storage Formatters
export {
  formatResourceDisplayName
} from './storage/formatters';

// Position Display Schemas & Utilities
export {
  // Schemas
  positionDisplayFormatSchema,
  alphanumericConfigSchema,
  positionDisplayConfigSchema,
  positionDisplayPreferenceSchema,

  // Constants
  POSITION_DISPLAY_PRESETS,

  // Types
  type PositionDisplayFormat,
  type AlphanumericConfig,
  type PositionDisplayConfig,
  type PositionDisplayPreference,

  // Config Generators (flexible for any grid size)
  generateAlphabeticLabels,
  generateNumericLabels,
  createAlphanumericConfig,
  createNumericConfig,
  getDefaultPositionDisplay,
} from './storage/positionSchemas';

export {
  // Utilities
  positionToLabel,
  labelToPosition,
  isValidPositionLabel,
  generatePositionLabels,
} from './storage/positionFormatters';

// API Schemas
export {
  // Schemas
  websocketMessageSchema,
  queryParametersSchema,
  httpStatusSchema,

  // Constants
  API_ERROR_CODES,

  // Types
  type WebSocketMessage,
  type QueryParameters
} from './api/apiSchemas';

// System Constants
export {
  // Equipment Defaults
  EQUIPMENT_DEFAULTS,

  // Validation Limits
  VALIDATION_LIMITS,

  // System Defaults
  SYSTEM_DEFAULTS,

  // Naming Patterns
  NAMING_PATTERNS,

  // Grid Templates
  GRID_TEMPLATES,
  DEFAULT_GRID_CONFIG
} from './constants';

// Admin Schemas (Security, User Management, System Monitoring)
export {
  // Schemas
  securityConfigSchema,
  updateSecurityConfigSchema,
  adminUserSchema,
  systemMetricsSchema,
  auditLogEntrySchema,
  auditLogFiltersSchema,
  userSessionSchema,
  securityConfigResponseSchema,
  adminUsersResponseSchema,
  systemMetricsResponseSchema,
  auditLogResponseSchema,

  // Constants
  DEFAULT_SECURITY_CONFIG,

  // Types
  type SecurityConfig,
  type UpdateSecurityConfig,
  type AdminUser,
  type SystemMetrics,
  type AuditLogEntry,
  type AuditLogFilters,
  type UserSession,
  type SecurityConfigResponse,
  type AdminUsersResponse,
  type SystemMetricsResponse,
  type AuditLogResponse,
} from './admin/adminSchemas';

// Authentication Schemas (Registration, Login, Email Verification)
export {
  // Schemas
  registerWithResearcherSchema,
  verifyEmailRequestSchema,
  resendVerificationRequestSchema,
  verificationStatusResponseSchema,
  systemAdminSetupSchema,
  validateInviteCodeRequestSchema,
  validateInviteCodeResponseSchema,

  // Types
  type RegisterWithResearcherRequest,
  type VerifyEmailRequest,
  type ResendVerificationRequest,
  type VerificationStatusResponse,
  type SystemAdminSetupRequest,
  type ValidateInviteCodeRequest,
  type ValidateInviteCodeResponse
} from './auth/authSchemas';

// Lab & Invite Code Schemas (Multi-tenancy)
export {
  // Schemas
  labDataSchema,
  labPublicDataSchema,
  inviteCodeDataSchema,
  createLabRequestSchema,
  createInviteCodeRequestSchema,

  labDetailsSchema,
  labDetailsUserSchema,

  // Types
  type LabData,
  type LabPublicData,
  type InviteCodeData,
  type CreateLabRequest,
  type CreateInviteCodeRequest,
  type LabDetails,
  type LabDetailsUser,
  type LabDetailsResearcher,

  systemOverviewSchema,
  type SystemOverview,
} from './labs/labSchemas';

// Password Validation
export {
  // Validator
  PasswordValidator,

  // Types
  type PasswordRequirementsConfig,
  type PasswordRequirement,
  type PasswordValidationResult
} from './auth/passwordValidation';

// Password Reset Schemas (Admin-initiated, no email dependency)
export {
  // Schemas
  adminResetPasswordRequestSchema,
  generatePasswordResetTokenResponseSchema,
  resetPasswordWithTokenRequestSchema,
  forceChangePasswordRequestSchema,
  passwordChangeRequiredResponseSchema,

  // Types
  type AdminResetPasswordRequest,
  type GeneratePasswordResetTokenResponse,
  type ResetPasswordWithTokenRequest,
  type ForceChangePasswordRequest,
  type PasswordChangeRequiredResponse
} from './auth/passwordResetSchemas';

// User Settings Schemas (Per-user preferences and configuration)
export {
  // Schemas
  userSettingsSchema,
  updateUserSettingsRequestSchema,
  userSettingsResponseSchema,
  themePreferenceSchema,

  // Constants
  DEFAULT_USER_SETTINGS,

  // Types
  type UserSettings,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
  type ThemePreference
} from './users/userSettingsSchemas';

// User Lookup Schemas (Public endpoint for display info)
export {
  // Schemas
  userLookupRequestSchema,
  userDisplayInfoSchema,
  userLookupResponseSchema,
  activeUsersListResponseSchema,

  // Types
  type UserLookupRequest,
  type UserDisplayInfo,
  type UserLookupResponse,
  type ActiveUsersListResponse
} from './users/userLookupSchemas';

// Demo Infrastructure Schemas (Seeding, Limits)
export {
  // Schemas
  DemoLimitsSchema,
  UpdateDemoLimitsSchema,
  SeedDemoResponseSchema,
  UnseedDemoResponseSchema,

  // Constants
  DEMO_LIMITS_DEFAULTS,

  // Types
  type DemoLimits,
  type UpdateDemoLimits,
  type SeedDemoResponse,
  type UnseedDemoResponse,
} from './demo/demoSchemas';

// Person Schemas (Core profile entity)
export {
  // Schemas
  personSchema,
  updatePersonProfileSchema,
  personProfileResponseSchema,

  // Types
  type Person,
  type UpdatePersonProfile,
  type PersonProfileResponse,
  type NameSortable,

  // Utilities
  sortByName
} from './persons/personSchemas';
