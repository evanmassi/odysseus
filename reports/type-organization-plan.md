# Type Organization Restructuring Plan

## Executive Summary

The server codebase has inconsistent type organization with critical duplications and 80+ scattered type definitions. This plan outlines a 4-phase approach to consolidate all types into a proper layered structure with zero breaking changes.

## Current State Analysis

### Existing Type Locations

1. **server/src/types/** (Framework extensions only)
   - `express.d.ts` - Express Request interface augmentation

2. **server/src/shared/types/** (Cross-layer shared types)
   - `ApiTypes.ts` - API response/request formats, pagination, search
   - `TokenTypes.ts` - OAuth 2.0 / JWT authentication types

3. **server/src/domain/types/** (Domain-specific)
   - `position.ts` - PositionConflict interface
   - `configuration.ts` - ConfigurationUpdateData interface

4. **server/src/application/types/** (Application service layer)
   - `audit.ts` - AuditChange interface

5. **server/src/presentation/responses/** (DUPLICATE LOCATION)
   - `ApiResponse.ts` - Duplicate of shared/types/ApiTypes.ts + ResponseBuilder class

### Critical Issues

#### Issue 1: ApiResponse Duplication (HIGH SEVERITY)
Two nearly identical definitions exist:
- `server/src/shared/types/ApiTypes.ts` - Type definitions + error constants
- `server/src/presentation/responses/ApiResponse.ts` - Same types + ResponseBuilder utility class

**Impact:** Confusing, potential for drift between versions

#### Issue 2: ValidationResult Duplication (MEDIUM SEVERITY)
Three different ValidationResult interfaces:
1. `shared/types/ApiTypes.ts`: `{ isValid: boolean; errors: ValidationError[] }`
2. `domain/services/ValidationService.ts`: `{ isValid: boolean; errors: string[]; warnings: string[] }`
3. `domain/repositories/ResearcherRepository.ts`: `{ isValid: boolean; errors: string[]; warnings?: string[] }`

**Impact:** Name collision, unclear which to use where

#### Issue 3: Scattered Repository Types (MEDIUM SEVERITY)
67+ interface definitions scattered across repository files:
- ConfigurationRepository.ts: 14 interfaces
- ResearcherRepository.ts: 5 interfaces
- TubeRepository.ts: 2 interfaces
- UserRepository.ts: 2+ interfaces
- AuditRepository.ts: 3 interfaces

**Impact:** Difficult to reuse, potential for duplication, unclear what types are available

#### Issue 4: Scattered Service Types (MEDIUM SEVERITY)
19+ interface definitions scattered across service files:
- ValidationService.ts: 4+ interfaces
- TubePositionService.ts: 2+ interfaces
- AccessControlService.ts: 3+ interfaces
- ConfigurationChangeDetector.ts: 1+ interface

**Impact:** Same as Issue 3

## Target Structure (Option A: Strict Layer Separation)

```
server/src/
├── types/
│   └── express.d.ts                    [KEEP] Framework extensions only
│
├── shared/
│   └── types/
│       ├── api/
│       │   ├── ApiResponse.ts          [CONSOLIDATE] Merge both ApiResponse versions
│       │   ├── ApiError.ts             [NEW] Split from ApiResponse
│       │   ├── Pagination.ts           [NEW] Split from ApiResponse
│       │   ├── Search.ts               [NEW] Split from ApiResponse
│       │   └── Validation.ts           [NEW] API-level validation types
│       ├── auth/
│       │   └── TokenTypes.ts           [KEEP] No changes
│       └── common/
│           └── index.ts                [NEW] Common cross-cutting types if needed
│
├── domain/
│   └── types/
│       ├── configuration.ts            [KEEP] No changes
│       ├── position.ts                 [KEEP] No changes
│       ├── validation.ts               [NEW] DomainValidationResult
│       ├── repository/
│       │   ├── SearchCriteria.ts       [NEW] Extract from repositories
│       │   ├── Stats.ts                [NEW] Extract stats/summary types
│       │   ├── QueryOptions.ts         [NEW] Extract query/pagination types
│       │   └── Results.ts              [NEW] Extract result wrapper types
│       └── services/
│           ├── AccessControl.ts        [NEW] Extract from AccessControlService
│           ├── TubePosition.ts         [NEW] Extract from TubePositionService
│           └── ConfigurationChange.ts  [NEW] Extract from ConfigurationChangeDetector
│
├── application/
│   └── types/
│       ├── audit.ts                    [KEEP] No changes
│       └── commands.ts                 [NEW] CQRS command types if needed
│
└── presentation/
    └── utilities/
        └── ResponseBuilder.ts          [MOVE] Extract class from ApiResponse.ts
```

## 4-Phase Implementation Plan

### Phase 1: Fix Critical Duplications (IMMEDIATE)

**Goal:** Eliminate ApiResponse duplication and rename ValidationResult conflicts

#### Step 1.1: Consolidate ApiResponse Types

1. **Review both ApiResponse files to identify differences**
   - File: `shared/types/ApiTypes.ts`
   - File: `presentation/responses/ApiResponse.ts`
   - Identify: Which has the most complete definitions

2. **Create consolidated shared/types/api/ directory**
   ```bash
   mkdir server/src/shared/types/api
   ```

3. **Create new ApiResponse.ts in shared location**
   - Path: `server/src/shared/types/api/ApiResponse.ts`
   - Include: All type definitions from both files
   - Include: Error code constants

4. **Extract ResponseBuilder to utilities**
   - Path: `server/src/presentation/utilities/ResponseBuilder.ts`
   - Import types from: `@shared/types/api/ApiResponse`
   - Keep only the builder class and helper methods

5. **Update imports in controllers**
   - File: `server/src/presentation/controllers/AuditController.ts`
   - File: `server/src/presentation/controllers/AuthController.ts`
   - Change: Import types from `@shared/types/api/ApiResponse`
   - Change: Import ResponseBuilder from `@presentation/utilities/ResponseBuilder`

6. **Run TypeScript compilation to verify**
   ```bash
   npx tsc --noEmit
   ```

7. **Delete old files**
   - Delete: `server/src/shared/types/ApiTypes.ts`
   - Delete: `server/src/presentation/responses/ApiResponse.ts`

8. **Run TypeScript compilation again to verify no broken imports**

9. **Git commit**
   ```bash
   git add -A
   git commit -m "Consolidate ApiResponse types to shared/types/api"
   ```

#### Step 1.2: Rename ValidationResult Conflicts

1. **Rename in ResearcherRepository**
   - File: `server/src/domain/repositories/ResearcherRepository.ts`
   - Find: `interface ValidationResult`
   - Rename to: `interface ResearcherValidationResult`
   - Update all usages in same file

2. **Create domain/types/validation.ts**
   - Path: `server/src/domain/types/validation.ts`
   - Extract: `DomainValidationResult` from ValidationService
   ```typescript
   export interface DomainValidationResult {
     isValid: boolean;
     errors: string[];
     warnings: string[];
   }

   export interface BulkValidationResult {
     isValid: boolean;
     results: Array<{
       id: string;
       isValid: boolean;
       errors: string[];
       warnings: string[];
     }>;
   }
   ```

3. **Update ValidationService.ts to import from types**
   - File: `server/src/domain/services/ValidationService.ts`
   - Add import: `import type { DomainValidationResult, BulkValidationResult } from '@domain/types/validation'`
   - Remove local interface definitions

4. **Rename in shared/types/api/ApiResponse.ts**
   - Find: `interface ValidationResult`
   - Rename to: `interface ApiValidationResult`
   - Update all usages

5. **Run TypeScript compilation**
   ```bash
   npx tsc --noEmit
   ```

6. **Git commit**
   ```bash
   git add -A
   git commit -m "Rename ValidationResult types to avoid conflicts"
   ```

**Phase 1 Completion Criteria:**
- [ ] No ApiResponse duplication
- [ ] No ValidationResult name conflicts
- [ ] TypeScript compilation passes
- [ ] All tests pass
- [ ] Git commits created

---

### Phase 2: Extract Repository Types (HIGH PRIORITY)

**Goal:** Centralize all repository-related type definitions

#### Step 2.1: Create Repository Types Directory Structure

```bash
mkdir server/src/domain/types/repository
```

#### Step 2.2: Extract Search Criteria Types

1. **Create SearchCriteria.ts**
   - Path: `server/src/domain/types/repository/SearchCriteria.ts`

2. **Extract from ConfigurationRepository.ts**
   ```typescript
   export interface ConfigurationSearchCriteria {
     dateFrom?: Date;
     dateTo?: Date;
     modifiedBy?: string;
     changeType?: string;
   }
   ```

3. **Extract from ResearcherRepository.ts**
   ```typescript
   export interface ResearcherSearchCriteria {
     name?: string;
     active?: boolean;
     hasLinkedUser?: boolean;
   }
   ```

4. **Extract from TubeRepository.ts**
   ```typescript
   export interface TubeSearchCriteria {
     researcherId?: string;
     tankId?: string;
     rackId?: string;
     boxId?: string;
     sampleType?: string;
     dateFrom?: Date;
     dateTo?: Date;
     // ... all other criteria
   }
   ```

5. **Extract from UserRepository.ts**
   ```typescript
   export interface UserSearchCriteria {
     username?: string;
     role?: string;
     active?: boolean;
     hasResearcher?: boolean;
   }
   ```

6. **Update repository files to import**
   - ConfigurationRepository.ts: `import type { ConfigurationSearchCriteria } from '@domain/types/repository/SearchCriteria'`
   - ResearcherRepository.ts: `import type { ResearcherSearchCriteria } from '@domain/types/repository/SearchCriteria'`
   - TubeRepository.ts: `import type { TubeSearchCriteria } from '@domain/types/repository/SearchCriteria'`
   - UserRepository.ts: `import type { UserSearchCriteria } from '@domain/types/repository/SearchCriteria'`

7. **Remove local interface definitions from repositories**

8. **Run TypeScript compilation**
   ```bash
   npx tsc --noEmit
   ```

9. **Git commit**
   ```bash
   git add -A
   git commit -m "Extract repository search criteria types"
   ```

#### Step 2.3: Extract Stats/Summary Types

1. **Create Stats.ts**
   - Path: `server/src/domain/types/repository/Stats.ts`

2. **Extract from ConfigurationRepository.ts**
   ```typescript
   export interface EquipmentSummary {
     totalTanks: number;
     activeTanks: number;
     totalRacks: number;
     activeRacks: number;
     totalBoxes: number;
     activeBoxes: number;
   }

   export interface CapacityInfo {
     totalPositions: number;
     occupiedPositions: number;
     availablePositions: number;
     utilizationPercentage: number;
   }
   ```

3. **Extract from TubeRepository.ts**
   ```typescript
   export interface TubeRepositoryStats {
     totalTubes: number;
     tubesByType: Record<string, number>;
     tubesByResearcher: Record<string, number>;
     averageAge: number;
   }
   ```

4. **Extract from UserRepository.ts**
   ```typescript
   export interface UserActivitySummary {
     userId: string;
     username: string;
     lastLogin?: Date;
     actionCount: number;
     tubesCreated: number;
     tubesModified: number;
   }
   ```

5. **Update repository imports and remove local definitions**

6. **Run TypeScript compilation**

7. **Git commit**
   ```bash
   git add -A
   git commit -m "Extract repository stats and summary types"
   ```

#### Step 2.4: Extract Query Options Types

1. **Create QueryOptions.ts**
   - Path: `server/src/domain/types/repository/QueryOptions.ts`

2. **Extract from AuditRepository.ts**
   ```typescript
   export interface PaginationOptions {
     page: number;
     pageSize: number;
   }

   export interface QueryOptions {
     sortBy?: string;
     sortOrder?: 'asc' | 'desc';
     pagination?: PaginationOptions;
   }
   ```

3. **Update repository imports**

4. **Run TypeScript compilation**

5. **Git commit**
   ```bash
   git add -A
   git commit -m "Extract repository query options types"
   ```

#### Step 2.5: Extract Result Wrapper Types

1. **Create Results.ts**
   - Path: `server/src/domain/types/repository/Results.ts`

2. **Extract from various repositories**
   ```typescript
   export interface PaginatedResult<T> {
     items: T[];
     total: number;
     page: number;
     pageSize: number;
     totalPages: number;
   }

   export interface ConfigurationHistory {
     id: string;
     timestamp: Date;
     userId: string;
     changeType: string;
     before: unknown;
     after: unknown;
   }

   export interface DuplicateCheckResult {
     hasDuplicates: boolean;
     duplicates: Array<{
       id: string;
       firstName: string;
       lastName: string;
       email: string;
       similarity: number;
     }>;
   }
   ```

3. **Update repository imports**

4. **Run TypeScript compilation**

5. **Git commit**
   ```bash
   git add -A
   git commit -m "Extract repository result wrapper types"
   ```

**Phase 2 Completion Criteria:**
- [ ] All search criteria types centralized
- [ ] All stats/summary types centralized
- [ ] All query option types centralized
- [ ] All result wrapper types centralized
- [ ] TypeScript compilation passes
- [ ] All tests pass
- [ ] Git commits created for each substep

---

### Phase 3: Extract Service Types (MEDIUM PRIORITY)

**Goal:** Centralize all service-related type definitions

#### Step 3.1: Create Service Types Directory Structure

```bash
mkdir server/src/domain/types/services
```

#### Step 3.2: Extract AccessControl Types

1. **Create AccessControl.ts**
   - Path: `server/src/domain/types/services/AccessControl.ts`

2. **Extract from AccessControlService.ts**
   ```typescript
   export interface AccessResult {
     allowed: boolean;
     reason: string;
   }

   export interface BulkAccessResult {
     allowed: boolean;
     results: Array<{
       id: string;
       allowed: boolean;
       reason: string;
     }>;
   }

   export interface BulkOperation {
     tubeIds: string[];
     operation: string;
   }
   ```

3. **Update AccessControlService.ts to import**
   - Add: `import type { AccessResult, BulkAccessResult, BulkOperation } from '@domain/types/services/AccessControl'`
   - Remove local interface definitions

4. **Run TypeScript compilation**

5. **Git commit**
   ```bash
   git add -A
   git commit -m "Extract access control service types"
   ```

#### Step 3.3: Extract TubePosition Types

1. **Create TubePosition.ts**
   - Path: `server/src/domain/types/services/TubePosition.ts`

2. **Extract from TubePositionService.ts**
   ```typescript
   export interface PositionValidationResult {
     isValid: boolean;
     errors: string[];
     warnings: string[];
     position?: number;
   }

   export interface BoxStatistics {
     totalPositions: number;
     occupiedPositions: number;
     availablePositions: number;
     utilizationPercentage: number;
     nextAvailablePosition?: number;
   }
   ```

3. **Update TubePositionService.ts to import**

4. **Run TypeScript compilation**

5. **Git commit**
   ```bash
   git add -A
   git commit -m "Extract tube position service types"
   ```

#### Step 3.4: Extract ConfigurationChange Types

1. **Create ConfigurationChange.ts**
   - Path: `server/src/domain/types/services/ConfigurationChange.ts`

2. **Extract from ConfigurationChangeDetector.ts**
   ```typescript
   export interface ConfigurationChangeSummary {
     hasChanges: boolean;
     tanksAdded: number;
     tanksRemoved: number;
     tanksModified: number;
     racksAdded: number;
     racksRemoved: number;
     racksModified: number;
     boxesAdded: number;
     boxesRemoved: number;
     boxesModified: number;
   }
   ```

3. **Update ConfigurationChangeDetector.ts to import**

4. **Run TypeScript compilation**

5. **Git commit**
   ```bash
   git add -A
   git commit -m "Extract configuration change service types"
   ```

#### Step 3.5: Extract Remaining Service Types

1. **Scan all remaining services for scattered types**
   - ValidationService.ts (already handled in Phase 1)
   - TubeApplicationService.ts
   - ResearcherApplicationService.ts
   - UserApplicationService.ts
   - Any other services

2. **Extract and centralize as needed**

3. **Run TypeScript compilation**

4. **Git commit**

**Phase 3 Completion Criteria:**
- [ ] All service types centralized
- [ ] TypeScript compilation passes
- [ ] All tests pass
- [ ] Git commits created for each substep

---

### Phase 4: Documentation & Guidelines (ONGOING)

**Goal:** Document the new structure and prevent future drift

#### Step 4.1: Create Type Organization Documentation

1. **Create TYPES_ORGANIZATION.md**
   - Path: `server/docs/TYPES_ORGANIZATION.md`

2. **Document the structure**
   ```markdown
   # Type Organization Guidelines

   ## Directory Structure

   ### server/src/types/
   **Purpose:** Framework and third-party library type extensions only
   **Examples:** Express.d.ts, global.d.ts
   **Rule:** Only for augmenting external types

   ### server/src/shared/types/
   **Purpose:** Cross-layer types used throughout the application
   **Examples:** API responses, authentication tokens, pagination
   **Rule:** Types that multiple layers need to import

   ### server/src/domain/types/
   **Purpose:** Domain-specific business logic types
   **Subdirectories:**
   - `repository/` - Repository interfaces and data structures
   - `services/` - Domain service types
   - Root level - Core domain types (configuration, position, etc.)

   ### server/src/application/types/
   **Purpose:** Application service layer types
   **Examples:** Command types, audit types, DTOs
   **Rule:** Types specific to application orchestration

   ### server/src/presentation/types/
   **Purpose:** Presentation layer types (if needed)
   **Note:** Most presentation types should use shared/types/api

   ## Guidelines

   ### Where to Place New Types

   1. **Framework extensions** → types/
   2. **API request/response** → shared/types/api/
   3. **Authentication/tokens** → shared/types/auth/
   4. **Repository interfaces** → domain/types/repository/
   5. **Service operation results** → domain/types/services/
   6. **Core domain concepts** → domain/types/
   7. **Application commands** → application/types/

   ### Naming Conventions

   - Use PascalCase for interfaces: `TubeSearchCriteria`
   - Use descriptive names that indicate purpose
   - Avoid generic names like `Data`, `Info`, `Result` alone
   - Use suffixes to clarify: `SearchCriteria`, `ValidationResult`, `Summary`

   ### Import Rules

   - Domain layer MUST NOT import from application/presentation
   - Application layer CAN import from domain/shared
   - Presentation layer CAN import from all layers
   - Shared types CAN be imported by any layer

   ### Anti-Patterns to Avoid

   - ❌ Defining types inline in service/repository files
   - ❌ Duplicating types across layers
   - ❌ Using `any` instead of proper types
   - ❌ Generic names that don't indicate purpose
   - ❌ Importing from wrong layers (e.g., domain importing from presentation)
   ```

3. **Add to main README.md**
   - Link to type organization docs

#### Step 4.2: Add ESLint Rules (Optional but Recommended)

1. **Install eslint-plugin-import if not present**

2. **Add import layer rules to .eslintrc**
   ```json
   {
     "rules": {
       "import/no-restricted-paths": ["error", {
         "zones": [
           {
             "target": "./server/src/domain",
             "from": "./server/src/application"
           },
           {
             "target": "./server/src/domain",
             "from": "./server/src/presentation"
           },
           {
             "target": "./server/src/application",
             "from": "./server/src/presentation"
           }
         ]
       }]
     }
   }
   ```

3. **Test that rules work**

4. **Git commit**
   ```bash
   git add -A
   git commit -m "Add type organization documentation and linting rules"
   ```

#### Step 4.3: Create Type Index Files (Optional)

1. **Create index.ts in each types directory**
   - `shared/types/api/index.ts` - Re-export all API types
   - `domain/types/repository/index.ts` - Re-export all repository types
   - `domain/types/services/index.ts` - Re-export all service types

2. **Benefit:** Cleaner imports
   ```typescript
   // Before
   import type { TubeSearchCriteria } from '@domain/types/repository/SearchCriteria';
   import type { TubeRepositoryStats } from '@domain/types/repository/Stats';

   // After
   import type { TubeSearchCriteria, TubeRepositoryStats } from '@domain/types/repository';
   ```

3. **Git commit**

**Phase 4 Completion Criteria:**
- [ ] Documentation created
- [ ] ESLint rules added (optional)
- [ ] Index files created (optional)
- [ ] Team reviewed guidelines
- [ ] Git commits created

---

## Safety Measures

### TypeScript Compilation Checks

After EVERY step:
```bash
cd server
npx tsc --noEmit
```

If compilation fails, the import is broken. Fix immediately before proceeding.

### Test Execution

After each phase:
```bash
npm test
```

Ensure no runtime behavior changes.

### Git Strategy

1. Create a feature branch for this work:
   ```bash
   git checkout -b refactor/type-organization
   ```

2. Commit after each logical step (as outlined above)

3. If anything breaks, revert the last commit:
   ```bash
   git revert HEAD
   ```

4. When complete, merge to main

### Rollback Plan

If major issues occur:
```bash
git reset --hard HEAD~N  # N = number of commits to undo
```

All changes are non-functional refactoring, so rollback is safe.

---

## Estimated Timeline

- **Phase 1:** 2-3 hours (critical duplications)
- **Phase 2:** 4-6 hours (repository types extraction)
- **Phase 3:** 3-4 hours (service types extraction)
- **Phase 4:** 1-2 hours (documentation)

**Total:** 10-15 hours of focused work

Can be broken into smaller sessions. Each phase is independently committable.

---

## Success Metrics

1. **Zero TypeScript compilation errors**
2. **All tests passing**
3. **No type duplications**
4. **All 80+ scattered types centralized**
5. **Clear guidelines documented**
6. **ESLint rules enforcing structure (optional)**

---

## Post-Implementation Benefits

1. **Discoverability:** Developers know exactly where to find types
2. **Reusability:** Types are easily imported across files
3. **Consistency:** Clear patterns for where new types go
4. **Maintainability:** Changes to types happen in one place
5. **Layer enforcement:** ESLint prevents architectural violations
6. **Onboarding:** New developers understand structure quickly

---

## Questions & Answers

**Q: Will this break any running code?**
A: No. This is pure refactoring of imports. TypeScript compiler catches all issues at compile time.

**Q: Can we do this incrementally?**
A: Yes. Each phase is independent and can be done separately.

**Q: What if we find new types during implementation?**
A: Add them to the plan and follow the same pattern.

**Q: Should we update the client side too?**
A: Client has fewer issues. Evaluate separately after server is complete.

**Q: How do we prevent this from happening again?**
A: Phase 4 documentation + ESLint rules + code review guidelines.

---

## Approval Checklist

Before starting implementation:
- [ ] Plan reviewed and approved
- [ ] Team aware of upcoming changes
- [ ] Feature branch created
- [ ] Backup of current state taken
- [ ] Time allocated for careful execution

---

**Document Version:** 1.0
**Created:** 2025-01-12
**Author:** Claude Code
**Status:** Pending Approval
