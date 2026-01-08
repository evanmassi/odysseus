# File Naming Convention Audit

**Created:** 2026-01-08
**Status:** In Progress
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

#### `domain/types/` - NEEDS ATTENTION

| Current Name | Recommended Name | Status | Reason | Imports to Update |
|--------------|------------------|--------|--------|-------------------|
| `configuration.ts` | `Configuration.ts` | Pending | Contains `ConfigurationUpdateData`, `ConfigurationImportData` interfaces | 2 |
| `validation.ts` | `Validation.ts` | Pending | Contains `DomainValidationResult`, `BulkValidationResult` interfaces | 2 |
| `position.ts` | `Position.ts` | Pending | Contains `PositionConflict` interface | 1 |
| `fieldChange.ts` | `FieldChange.ts` | Pending | Contains `FieldChange` interface (recently changed TO lowercase - needs reversal) | 7 |

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

#### `application/types/` - NEEDS ATTENTION

| Current Name | Recommended Name | Status | Reason | Imports to Update |
|--------------|------------------|--------|--------|-------------------|
| `audit.ts` | `Audit.ts` | Pending | Contains `AuditChange` interface | 1 |

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

### `client/src/shared/types/` - NEEDS ATTENTION

| Current Name | Recommended Name | Status | Reason |
|--------------|------------------|--------|--------|
| `forms.ts` | `Forms.ts` | Pending | Contains type definitions |
| `tubeTypes.ts` | `TubeTypes.ts` | Pending | Contains type definitions |
| `apiTypes.ts` | `ApiTypes.ts` | Pending | Contains type definitions |
| `bulkOperations.ts` | `BulkOperations.ts` | Pending | Contains type definitions |
| `clipboard.ts` | `Clipboard.ts` | Pending | Contains type definitions |
| `experimentalBrowserApis.ts` | `ExperimentalBrowserApis.ts` | Pending | Contains type definitions |
| `validationTypes.ts` | `ValidationTypes.ts` | Pending | Contains type definitions |
| `GridTypes.ts` | OK | Already PascalCase |

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

Beyond casing, some files may be misnamed based on their actual function:

| File | Current Name | Issue | Recommended Name |
|------|--------------|-------|------------------|
| ~~`domain/types/services/Validation.ts`~~ | ~~`Validation.ts`~~ | ~~Contains `TubeCreationData`, `TubeUpdateData` - not validation types~~ | ~~`TubeOperation.ts`~~ **FIXED** |
| TBD | TBD | Need to audit remaining files for function-name mismatch | TBD |

---

## Priority Action Items

### Priority 1: Server Type Files (5 files)

These are direct inconsistencies in the domain layer:

1. `domain/types/configuration.ts` → `Configuration.ts`
2. `domain/types/validation.ts` → `Validation.ts`
3. `domain/types/position.ts` → `Position.ts`
4. `domain/types/fieldChange.ts` → `FieldChange.ts`
5. `application/types/audit.ts` → `Audit.ts`

**Total imports to update:** ~13 files

### Priority 2: Client Type Files (7 files)

Files in `client/src/shared/types/` that need PascalCase.

### Priority 3: Shared Schemas Decision

Decide whether to standardize shared-schemas to PascalCase or document camelCase as the accepted pattern for schema files.

### Priority 4: Full Client Audit

Complete audit of client-side domain folders.

---

## Batch Execution Plan

### Batch 1: Server `domain/types/` (4 files)
- [ ] Rename files
- [ ] Update imports
- [ ] Verify build

### Batch 2: Server `application/types/` (1 file)
- [ ] Rename files
- [ ] Update imports
- [ ] Verify build

### Batch 3: Client `shared/types/` (7 files)
- [ ] Rename files
- [ ] Update imports
- [ ] Verify build

### Batch 4: Shared Schemas (if decided)
- [ ] TBD based on decision

---

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-01-08 | Initial audit document created | Claude |
| 2026-01-08 | Fixed `domain/types/services/Validation.ts` → `TubeOperation.ts` | Claude |
| 2026-01-08 | Fixed `domain/types/FieldChange.ts` → `fieldChange.ts` (pending reversal) | Claude |
| 2026-01-08 | Removed dead code `TubeCreationData` from `TubeApplicationService.ts` | Claude |

