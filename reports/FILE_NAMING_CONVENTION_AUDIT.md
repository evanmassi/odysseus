# File Naming Convention Audit

**Created:** 2026-01-08
**Status:** Server and Client Casing Fixed
**Last Updated:** 2026-01-08

---

## Executive Summary

This document tracks file naming inconsistencies across the codebase and provides a systematic approach to standardization. The goal is to establish clear, consistent naming conventions that align with industry standards and improve code navigability.

---

## Naming Convention Standards

### Adopted Conventions

| File Type | Convention | Example | Rationale |
|-----------|------------|---------|-----------|
| **Entities/Classes** | PascalCase | `User.ts`, `Tube.ts` | Matches exported class/type name |
| **Services** | PascalCase | `ValidationService.ts` | Matches exported class name |
| **Types/Interfaces** | PascalCase | `Configuration.ts` | Matches exported type name |
| **DTOs** | PascalCase | `TubeDto.ts` | Matches exported class name |
| **Controllers** | PascalCase | `TubeController.ts` | Matches exported class name |
| **Repositories** | PascalCase | `TubeRepository.ts` | Matches exported class name |
| **Value Objects** | PascalCase | `Location.ts` | Matches exported class name |
| **Events** | PascalCase | `TubeEvents.ts` | Matches exported type name |
| **Errors** | PascalCase | `ValidationError.ts` | Matches exported class name |
| **Utilities** | camelCase | `logger.ts`, `formatDate.ts` | Exports functions, not classes |
| **Hooks** | camelCase | `useDebounce.ts` | React convention for hooks |
| **Constants** | camelCase | `validationLimits.ts` | Exports const objects |
| **Barrel files** | lowercase | `index.ts` | Universal convention |
| **Test files** | Match source + suffix | `User.test.ts` | Matches source file casing |

### Key Rule

> **Folder purpose determines exception handling:**
> - Files in `types/` folders: PascalCase (they define types/interfaces)
> - Files in `utils/` folders: camelCase (they export functions)
> - Files in `constants/` folders: camelCase (they export const values)
> - Files in `hooks/` folders: camelCase with `use` prefix (React convention)

---

## Server Audit

### Domain Layer (`server/src/domain/`)

#### `domain/types/` - COMPLETE

| Current Name | Recommended Name | Status | Reason | Imports Updated |
|--------------|------------------|--------|--------|-----------------|
| `Configuration.ts` | `Configuration.ts` | **DONE** | Contains `ConfigurationUpdateData`, `ConfigurationImportData` interfaces | 2 |
| `Validation.ts` | `Validation.ts` | **DONE** | Contains `DomainValidationResult`, `BulkValidationResult` interfaces | 2 |
| `Position.ts` | `Position.ts` | **DONE** | Contains `PositionConflict` interface | 1 |
| `FieldChange.ts` | `FieldChange.ts` | **DONE** | Contains `FieldChange` interface | 7 |

#### `domain/types/services/` - OK

| Current Name | Status | Notes |
|--------------|--------|-------|
| `AccessControl.ts` | OK | PascalCase, correct |
| `TubeOperation.ts` | OK | PascalCase, recently renamed from misnamed `Validation.ts` |
| `TubePosition.ts` | OK | PascalCase, correct |
| `index.ts` | OK | Barrel file |

#### `domain/types/repository/` - OK

| Current Name | Status | Notes |
|--------------|--------|-------|
| `QueryOptions.ts` | OK | PascalCase, correct |
| `Stats.ts` | OK | PascalCase, correct |
| `SearchCriteria.ts` | OK | PascalCase, correct |
| `index.ts` | OK | Barrel file |

#### `domain/utils/` - OK (utility exception)

| Current Name | Status | Notes |
|--------------|--------|-------|
| `generateId.ts` | OK | camelCase for utility function |
| `index.ts` | OK | Barrel file |

#### `domain/entities/` - OK

All files follow PascalCase: `Configuration.ts`, `Person.ts`, `RefreshToken.ts`, `Researcher.ts`, `Tube.ts`, `User.ts`, `UserSession.ts`

#### `domain/services/` - OK

All files follow PascalCase: `AccessControlService.ts`, `ConfigurationChangeDetector.ts`, `EmailService.ts`, `RolePermissionService.ts`, `TubePositionService.ts`, `ValidationService.ts`

#### `domain/valueObjects/` - OK

All files follow PascalCase: `Equipment.ts`, `Location.ts`, `Media.ts`, `Permission.ts`, `SampleData.ts`, `UserRole.ts`

#### `domain/events/` - OK

All files follow PascalCase: `ConfigurationEvents.ts`, `DomainEvent.ts`, `DomainEventMap.ts`, `EmailVerificationEvents.ts`, etc.

#### `domain/errors/` - OK

All files follow PascalCase: `DomainError.ts`, `EmailVerificationError.ts`, `NotFoundError.ts`, `PasswordResetError.ts`, etc.

#### `domain/repositories/` - OK

All files follow PascalCase: `AuditRepository.ts`, `ConfigurationRepository.ts`, `PersonRepository.ts`, etc.

---

### Application Layer (`server/src/application/`)

#### `application/types/` - COMPLETE

| Current Name | Recommended Name | Status | Reason | Imports Updated |
|--------------|------------------|--------|--------|-----------------|
| `Audit.ts` | `Audit.ts` | **DONE** | Contains `AuditChange` interface | 1 |

#### `application/services/` - OK

All files follow PascalCase.

#### `application/commands/` - OK

All files follow PascalCase.

#### `application/queries/` - OK

All files follow PascalCase.

#### `application/dto/` - OK

All files follow PascalCase.

#### `application/contracts/` - OK

All files follow PascalCase.

#### `application/eventHandlers/` - OK

All files follow PascalCase.

---

### Infrastructure Layer (`server/src/infrastructure/`)

#### `infrastructure/database/` - MIXED

| Current Name | Status | Notes |
|--------------|--------|-------|
| `PostgresContext.ts` | OK | PascalCase |
| `DatabaseErrors.ts` | OK | PascalCase |
| `searchUtils.ts` | OK | camelCase for utility (exception) |

#### `infrastructure/database/mappers/` - OK

All files follow PascalCase.

#### Other infrastructure folders - OK

All files follow PascalCase.

---

### Presentation Layer (`server/src/presentation/`)

All folders and files follow PascalCase. No issues found.

---

### Middleware (`server/src/middleware/`)

| Current Name | Status | Notes |
|--------------|--------|-------|
| `RateLimiting.ts` | OK | PascalCase |
| `Validation.ts` | OK | PascalCase |

---

### Utils (`server/src/utils/`) - OK (utility exception)

| Current Name | Status | Notes |
|--------------|--------|-------|
| `logger.ts` | OK | camelCase for utility |
| `featureFlags.ts` | OK | camelCase for utility |

---

## Client Audit

### `client/src/shared/types/` - COMPLETE

| Current Name | Recommended Name | Status | Imports Updated |
|--------------|------------------|--------|-----------------|
| `forms.ts` | `Forms.ts` | **DONE** | 1 (barrel) |
| `tubeTypes.ts` | `TubeTypes.ts` | **DONE** | 18 |
| `apiTypes.ts` | `ApiTypes.ts` | **DONE** | 1 (barrel) |
| `bulkOperations.ts` | `BulkOperations.ts` | **DONE** | 5 |
| `clipboard.ts` | `Clipboard.ts` | **DONE** | 6 |
| `experimentalBrowserApis.ts` | `ExperimentalBrowserApis.ts` | **DONE** | 1 (barrel) |
| `validationTypes.ts` | `ValidationTypes.ts` | **DONE** | 2 |
| `GridTypes.ts` | OK | Already PascalCase | - |

### `client/src/shared/utils/` - OK (utility exception)

All files use camelCase which is correct for utilities.

### `client/src/shared/hooks/` - OK

Hooks follow `useXxx.ts` convention which is correct.

### `client/src/shared/stores/` - NEEDS REVIEW

| Current Name | Status | Notes |
|--------------|--------|-------|
| `gridUiStore.ts` | Review | Could be `GridUiStore.ts` if it exports a class-like store |

### `client/src/domains/*/types/` - NEEDS REVIEW

Need to audit each domain's types folder for consistency.

### `client/src/domains/*/services/` - OK

Services follow PascalCase: `ResearcherService.ts`, `SearchService.ts`, etc.

### `client/src/domains/*/hooks/` - OK

Hooks follow camelCase with `use` prefix.

---

## Shared Schemas Audit (`packages/shared-schemas/`)

### Current Pattern: camelCase throughout

| Folder | Files | Current Pattern |
|--------|-------|-----------------|
| `auth/` | `authSchemas.ts`, `passwordValidation.ts`, `passwordResetSchemas.ts` | camelCase |
| `tubes/` | `tubeSchemas.ts`, `tubeMappers.ts`, `tubeValidation.ts`, `tubeLockSchemas.ts`, `tubeFormatters.ts` | camelCase |
| `storage/` | `configurationSchemas.ts`, `positionSchemas.ts`, `positionFormatters.ts`, `formatters.ts` | camelCase |
| `constants/` | `validationLimits.ts`, `equipmentDefaults.ts`, `namingPatterns.ts`, etc. | camelCase |
| `users/` | `userSettingsSchemas.ts`, `userLookupSchemas.ts` | camelCase |
| `persons/` | `personSchemas.ts` | camelCase |
| `researchers/` | `researcherSchemas.ts` | camelCase |
| `admin/` | `adminSchemas.ts` | camelCase |
| `api/` | `apiSchemas.ts` | camelCase |
| `search/` | `searchSchemas.ts` | camelCase |
| `infrastructure/` | `transportSchemas.ts` | camelCase |

### Recommendation for shared-schemas

The shared-schemas package consistently uses camelCase. Two options:

1. **Keep camelCase** - These are schema definitions (Zod), not type/class files. camelCase is acceptable.
2. **Convert to PascalCase** - For consistency with server type files.

**Decision:** TBD - Discuss whether schema files should follow the same convention as type files.

---

## Functional Naming Issues

Beyond casing, some files may be misnamed based on their actual function.

### Server-Side Functional Audit: COMPLETE

**Audit Date:** 2026-01-08

All server-side files were reviewed to verify that file names match their contents/function.

| Layer | Files Audited | Issues Found |
|-------|---------------|--------------|
| `domain/types/` | 4 files | None (casing only) |
| `domain/types/services/` | 3 files | 1 - FIXED (Validation.ts → TubeOperation.ts) |
| `domain/types/repository/` | 3 files | None |
| `domain/services/` | 6 files | None |
| `domain/entities/` | 7 files | None |
| `domain/valueObjects/` | 6 files | None |
| `domain/events/` | 8 files | None |
| `domain/errors/` | 7 files | None |
| `domain/repositories/` | 7 files | None |
| `application/types/` | 1 file | None (casing only) |
| `application/services/` | 4 files | None |
| `application/commands/` | 10 files | None |
| `application/dto/` | 6 files | None |
| `application/queries/` | 2 files | None |
| `application/contracts/` | 2 files | None |
| `application/eventHandlers/` | 2 files | None |
| `infrastructure/` | All files | None |
| `presentation/` | All files | None |
| `middleware/` | 2 files | None |
| `utils/` | 2 files | None |

**Result:** Only one functional naming issue was found and fixed:

| File | Current Name | Issue | Recommended Name | Status |
|------|--------------|-------|------------------|--------|
| `domain/types/services/Validation.ts` | `Validation.ts` | Contains `TubeCreationData`, `TubeUpdateData` - not validation types | `TubeOperation.ts` | **FIXED** |

### Client-Side Functional Audit: COMPLETE

**Audit Date:** 2026-01-08

All client-side files were reviewed to verify that file names match their contents/function.

| Layer | Files Audited | Issues Found |
|-------|---------------|--------------|
| `shared/types/` | 8 files | 2 minor (noted below) |
| `shared/utils/` | 15+ files | None |
| `shared/hooks/` | 10+ files | None |
| `shared/stores/` | 1 file | None |
| `domains/authentication/` | All files | None |
| `domains/tubes/` | All files | None |
| `domains/storage/` | All files | None |
| `domains/search/` | All files | None |
| `domains/researchers/` | All files | None |
| `domains/users/` | All files | None |
| `domains/admin/` | All files | None |
| `domains/grid/` | All files | None |
| `app/` | All files | None |
| `infrastructure/` | All files | None |

**Minor Functional Naming Observations (Low Priority):**

| File | Current Name | Observation | Recommendation |
|------|--------------|-------------|----------------|
| `shared/types/clipboard.ts` | `clipboard.ts` | Also contains Undo/Redo history types | Could be `ClipboardAndHistory.ts` but current name is acceptable |
| `domains/admin/types/metrics.ts` | `metrics.ts` | Also contains RetentionPolicy types | Could be `MetricsAndRetention.ts` but current name is acceptable |

**Result:** No critical functional naming issues found. All file names adequately describe their contents.

---

## Priority Action Items

### Priority 1: Server Type Files (5 files) - COMPLETE

~~These are direct inconsistencies in the domain layer:~~

1. ~~`domain/types/configuration.ts` → `Configuration.ts`~~ ✅
2. ~~`domain/types/validation.ts` → `Validation.ts`~~ ✅
3. ~~`domain/types/position.ts` → `Position.ts`~~ ✅
4. ~~`domain/types/fieldChange.ts` → `FieldChange.ts`~~ ✅
5. ~~`application/types/audit.ts` → `Audit.ts`~~ ✅

**Status:** All 5 files renamed, 13 imports updated, build verified.

### Priority 2: Client Type Files (7 files) - PENDING

Files in `client/src/shared/types/` that need PascalCase:

| Current Name | Recommended Name | Imports to Update |
|--------------|------------------|-------------------|
| `forms.ts` | `Forms.ts` | TBD |
| `tubeTypes.ts` | `TubeTypes.ts` | TBD |
| `apiTypes.ts` | `ApiTypes.ts` | TBD |
| `bulkOperations.ts` | `BulkOperations.ts` | TBD |
| `clipboard.ts` | `Clipboard.ts` | TBD |
| `experimentalBrowserApis.ts` | `ExperimentalBrowserApis.ts` | TBD |
| `validationTypes.ts` | `ValidationTypes.ts` | TBD |

### Priority 3: Shared Schemas Decision - PENDING

Decide whether to standardize shared-schemas to PascalCase or document camelCase as the accepted pattern for schema files.

**Recommendation:** Keep camelCase for shared-schemas. These are Zod schema definition files that export functions/constants, not type/class files. The camelCase convention is appropriate and consistently applied throughout the package.

### Priority 4: Full Client Audit - COMPLETE

All client-side domain folders have been audited. No critical functional naming issues found.

---

## Batch Execution Plan

### Batch 1: Server `domain/types/` (4 files)
- [x] Rename files
- [x] Update imports
- [x] Verify build

### Batch 2: Server `application/types/` (1 file)
- [x] Rename files
- [x] Update imports
- [x] Verify build

### Batch 3: Client `shared/types/` (7 files)
- [x] Rename files
- [x] Update imports (23 files updated)
- [x] Verify build

### Batch 4: Shared Schemas (if decided)
- [ ] TBD based on decision

---

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-01-08 | Initial audit document created | Claude |
| 2026-01-08 | Fixed `domain/types/services/Validation.ts` → `TubeOperation.ts` | Claude |
| 2026-01-08 | Fixed `domain/types/FieldChange.ts` → `fieldChange.ts` (pending reversal to PascalCase) | Claude |
| 2026-01-08 | Removed dead code `TubeCreationData` from `TubeApplicationService.ts` | Claude |
| 2026-01-08 | Completed server-side functional naming audit - no additional issues found | Claude |
| 2026-01-08 | Renamed `domain/types/` files to PascalCase (4 files, 12 imports updated) | Claude |
| 2026-01-08 | Renamed `application/types/audit.ts` to `Audit.ts` (1 import updated) | Claude |
| 2026-01-08 | Completed client-side functional naming audit - no critical issues found | Claude |
| 2026-01-08 | Renamed `client/src/shared/types/` files to PascalCase (7 files, 23 imports updated) | Claude |

