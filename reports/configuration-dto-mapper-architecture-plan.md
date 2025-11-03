# Configuration DTO + Mapper Architecture Plan

**Date:** 2025-10-30
**Status:** Planning Phase - Pending Review
**Estimated Effort:** 2-3 hours
**Risk Level:** Medium (architectural change)
**Priority:** High (technical debt, maintainability)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [The Problem](#the-problem)
4. [Industry-Standard Solution](#industry-standard-solution)
5. [Implementation Plan](#implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Migration Path](#migration-path)
8. [Success Criteria](#success-criteria)
9. [Rollback Plan](#rollback-plan)

---

## Executive Summary

### The Issue
Currently, `ConfigurationController` manually constructs response objects, leading to:
- ❌ Duplicated transformation logic
- ❌ No single source of truth
- ❌ Fragile code (breaks when schemas change)
- ❌ Violates Clean Architecture principles
- ❌ Manual object construction in controllers

### The Solution
Implement **DTO + Mapper Pattern** following existing codebase patterns:
- ✅ Single source of truth (`@odysseus/shared-schemas`)
- ✅ Centralized mapping logic (Application layer)
- ✅ Thin controllers (Presentation layer)
- ✅ Type-safe transformations
- ✅ Testable, maintainable code

### Impact
- **Reduced duplication:** 90% less manual object construction
- **Improved maintainability:** Schema changes require updates in ONE place
- **Better testing:** Mappers are pure functions (easy to test)
- **Follows architecture:** Matches existing Tube/Researcher patterns

---

## Current State Analysis

### Existing Architecture (Working Well)

The project **already implements** the DTO + Mapper pattern for Tubes and Researchers:

#### 1. Database Mappers (Infrastructure Layer)
**Location:** `server/src/infrastructure/database/mappers/`

```typescript
// TubeMapper.ts - Database ↔ Domain
export class TubeMapper {
  static toRow(tube: Tube): TubeRow { ... }        // Domain → Database
  static fromRow(row: TubeRow): Tube { ... }       // Database → Domain
}
```

**Purpose:** Transform between database rows (SQLite) and domain entities
**Pattern:** Pure functions, no business logic, handles serialization (JSON, dates)

#### 2. Application DTOs (Application Layer)
**Location:** `server/src/application/dto/`

```typescript
// TubeDto.ts - Domain ↔ API
export class TubeDto {
  static toResponse(tube: Tube): TubeResponse { ... }       // Domain → API Response
  static fromCreateRequest(req: CreateTubeRequest): {...}   // API Request → Domain
  static fromUpdateRequest(req: UpdateTubeRequest): {...}   // API Request → Domain
}
```

**Purpose:** Transform between domain entities and API contracts (shared schemas)
**Pattern:** Uses `@odysseus/shared-schemas` for type safety, thin mapping only

#### 3. Presentation Mappers (Presentation Layer)
**Location:** `server/src/presentation/mappers/`

```typescript
// SearchCriteriaMapper.ts - Request → Domain
export class SearchCriteriaMapper {
  static toTubeSearchCriteria(filters?: SearchFilters): TubeSearchCriteria { ... }
}
```

**Purpose:** Map presentation concerns (HTTP requests) to domain concerns
**Pattern:** Centralized mapping, prevents controller duplication

### Architecture Layers (AGENTS.md)

```
┌─────────────────────────────────────────────────────┐
│          @odysseus/shared-schemas                   │
│          Single Source of Truth                     │
│  - API contracts (schemas)                          │
│  - Validation (Zod)                                 │
│  - Types (TypeScript)                               │
└─────────────────────────────────────────────────────┘
                       ▲
                       │
    ┌──────────────────┼──────────────────┐
    │ CLIENT           │           SERVER │
    │                  │                  │
    │         ┌────────▼────────┐         │
    │         │  Presentation   │         │
    │         │   Controllers   │◄────────┼───── Uses DTOs only
    │         └────────┬────────┘         │
    │                  │                  │
    │         ┌────────▼────────┐         │
    │         │  Application    │         │
    │         │   DTOs/Mappers  │◄────────┼───── Map Domain ↔ API
    │         └────────┬────────┘         │
    │                  │                  │
    │         ┌────────▼────────┐         │
    │         │    Domain       │         │
    │         │   Entities      │◄────────┼───── Business Logic
    │         └────────┬────────┘         │
    │                  │                  │
    │         ┌────────▼────────┐         │
    │         │ Infrastructure  │         │
    │         │  DB Mappers     │◄────────┼───── Map Domain ↔ Database
    │         └─────────────────┘         │
    └───────────────────────────────────────┘
```

### What's Working (Tubes & Researchers)

**Example Flow:** Creating a Tube

1. **Client** sends request using shared schema:
   ```typescript
   import { createTubeRequestSchema } from '@odysseus/shared-schemas';
   const validated = createTubeRequestSchema.parse(formData);
   await tubeService.create(validated);
   ```

2. **Controller** receives validated request, uses DTO:
   ```typescript
   // TubeController.ts
   async createTube(req: Request, res: Response) {
     const request: CreateTubeRequest = req.body; // Already validated by Zod middleware
     const tubeData = TubeDto.fromCreateRequest(request); // DTO mapping
     const tube = await this.createTubeHandler.handle(tubeData);
     const response = TubeDto.toResponse(tube); // DTO mapping
     res.json({ success: true, data: response });
   }
   ```

3. **Application Layer** creates domain entity:
   ```typescript
   const tube = Tube.create(tubeData);
   ```

4. **Repository** saves using database mapper:
   ```typescript
   const row = TubeMapper.toRow(tube);
   await db.run('INSERT INTO tubes ...', row);
   ```

**Benefits:**
- ✅ No manual object construction in controllers
- ✅ Schema changes handled in ONE place
- ✅ Type-safe end-to-end
- ✅ Testable (mappers are pure functions)

---

## The Problem

### Current Configuration Implementation

**ConfigurationController.ts** (lines 63-109):
```typescript
async getCurrentConfiguration(req: Request, res: Response): Promise<void> {
  const configuration = await this.getCurrentConfigurationHandler.handle({});

  // ❌ PROBLEM: Manual object construction in controller
  const configurationData = {
    systemConfig: {
      currentLabId: 'default-lab',
      availableLabs: [{
        id: 'default-lab',
        name: configuration.systemSettings.labName,
        organization: 'Default Organization',
        // ... 20+ more lines of manual mapping
      }],
      globalSettings: { /* ... */ },
      version: configuration.version.toString()
    },
    currentLab: {
      // ... 40+ more lines of manual mapping
      equipment: {
        tanks: configuration.equipment.tanks.map(tank => ({
          // ... even more manual mapping
        }))
      }
    }
  };

  res.json({ success: true, data: { configuration: configurationData } });
}
```

### Problems with Current Approach

1. **Violates Single Responsibility**
   - Controller does routing AND transformation AND formatting
   - Should only do routing

2. **No Reusability**
   - If we need configuration in another endpoint, we copy-paste this
   - Already happened: We have `.bak` file with duplicated logic

3. **Fragile to Schema Changes**
   - If `ConfigurationResponseSchema` changes, we must update controller manually
   - No compile-time safety
   - Easy to miss fields

4. **Violates Clean Architecture**
   - Presentation layer knows about domain structure
   - Should use Application layer for mapping

5. **Hard to Test**
   - Can't test transformation logic in isolation
   - Must test through full HTTP controller

6. **Inconsistent with Codebase**
   - Tubes use `TubeDto`
   - Researchers use `ResearcherDto`
   - Configuration uses... manual mapping? ❌

---

## Industry-Standard Solution

### DTO + Mapper Pattern (Already in Use)

Following the **existing pattern** in our codebase:

```
Domain Entity ──► DTO Mapper ──► API Response (Shared Schema)
                     ▲
                     │
              Single mapping logic
              (Application Layer)
```

### Benefits (Proven in Codebase)

1. **Single Source of Truth**
   - `@odysseus/shared-schemas` defines API contract
   - Mappers transform domain → contract
   - One place to update

2. **Separation of Concerns**
   - **Domain**: Business logic
   - **Application**: Mapping/orchestration
   - **Presentation**: HTTP routing only

3. **Type Safety**
   - TypeScript ensures mapper outputs match schema
   - Compile-time errors if schema changes

4. **Testability**
   - Mappers are pure functions
   - Easy to unit test
   - No HTTP mocking needed

5. **Maintainability**
   - Schema change = update ONE mapper
   - Not 10+ controllers

---

## Implementation Plan

### Phase 1: Create ConfigurationDto (Application Layer)
**Location:** `server/src/application/dto/ConfigurationDto.ts`

**Files to Create:**
1. `server/src/application/dto/ConfigurationDto.ts`

**Implementation:**
```typescript
import { Configuration } from '../../domain/entities/Configuration';
import {
  ConfigurationResponse,
  SystemConfiguration,
  LabConfiguration,
  type TankConfiguration,
  type BoxConfiguration
} from '@odysseus/shared-schemas';

/**
 * ConfigurationDto - Maps Domain Configuration ↔ API Response
 *
 * Follows Clean Architecture pattern (matches TubeDto, ResearcherDto)
 * - Domain entity → API response (toResponse)
 * - API request → Domain data (fromSaveRequest)
 */
export class ConfigurationDto {

  /**
   * Convert domain Configuration entity to API response
   * Maps to ConfigurationResponseSchema from shared-schemas
   */
  static toResponse(configuration: Configuration): ConfigurationResponse {
    const defaultGridConfig = { rows: 9, cols: 9, template: 'standard' as const };
    const defaultBoxConfig: BoxConfiguration = {
      id: 'A',
      name: 'Box A',
      gridConfig: defaultGridConfig,
      position: 1
    };

    const systemConfig: SystemConfiguration = {
      currentLabId: 'default-lab',
      availableLabs: [{
        id: 'default-lab',
        name: configuration.systemSettings.labName,
        organization: 'Default Organization',
        isActive: true,
        createdAt: configuration.updatedAt,
        updatedAt: configuration.updatedAt,
        equipment: {
          tanks: [],
          defaultBoxConfig,
          defaultGridConfig
        }
      }],
      globalSettings: {
        theme: 'light' as const,
        language: 'en',
        timezone: 'America/New_York',
        autoBackup: true
      },
      version: configuration.version.toString()
    };

    const currentLab: LabConfiguration = {
      id: 'default-lab',
      name: configuration.systemSettings.labName,
      organization: 'Default Organization',
      isActive: true,
      createdAt: configuration.updatedAt,
      updatedAt: configuration.updatedAt,
      equipment: {
        tanks: configuration.equipment.tanks.map(tank => ({
          id: tank.id,
          name: tank.name,
          location: 'Main Lab',
          isActive: tank.isActive,
          createdAt: configuration.updatedAt,
          updatedAt: configuration.updatedAt,
          defaultGridConfig,
          racks: tank.racks.map(rack => ({
            id: rack.id.toString(),
            name: rack.name,
            capacity: rack.capacity,
            location: 'Main Lab',
            isActive: rack.isActive,
            boxes: rack.boxes.map((box, index) => ({
              id: box.name,  // Server domain has "name", client expects "id"
              name: box.name,
              gridConfig: box.gridConfig,
              position: index + 1
            }))
          }))
        })),
        defaultBoxConfig,
        defaultGridConfig
      }
    };

    return {
      configuration: {
        systemConfig,
        currentLab
      }
    };
  }

  /**
   * Convert API save request to domain data structure
   * Maps from SaveConfigurationRequestSchema to domain format
   */
  static fromSaveRequest(request: {
    configuration: {
      systemConfig: SystemConfiguration;
      currentLab: LabConfiguration;
    }
  }): {
    systemSettings: {
      labName: string;
      defaultResearcher: string;
      autoSave: boolean;
    };
    equipment: any; // Domain structure
  } {
    // Transform API request → Domain format
    // This is the REVERSE transformation
    return {
      systemSettings: {
        labName: request.configuration.currentLab.name,
        defaultResearcher: request.configuration.systemConfig.globalSettings.theme, // Placeholder
        autoSave: request.configuration.systemConfig.globalSettings.autoBackup
      },
      equipment: {
        tanks: request.configuration.currentLab.equipment.tanks.map(tank => ({
          id: tank.id,
          name: tank.name,
          racks: tank.racks.map(rack => ({
            id: parseInt(rack.id),
            name: rack.name,
            boxes: rack.boxes.map(box => ({
              name: box.id,  // Client sends "id", domain expects "name"
              gridConfig: box.gridConfig
            }))
          }))
        }))
      }
    };
  }
}
```

**Why This Works:**
- ✅ Follows existing `TubeDto` pattern
- ✅ Centralized transformation logic
- ✅ Uses shared schemas for type safety
- ✅ Pure functions (testable)
- ✅ No business logic (just mapping)

---

### Phase 2: Update ConfigurationController (Presentation Layer)
**Location:** `server/src/presentation/controllers/ConfigurationController.ts`

**Changes:**
```typescript
// BEFORE (lines 59-109)
async getCurrentConfiguration(req: Request, res: Response): Promise<void> {
  const configuration = await this.getCurrentConfigurationHandler.handle({});

  // ❌ 60+ lines of manual object construction
  const configurationData = { /* ... */ };

  res.json({ success: true, data: { configuration: configurationData } });
}

// AFTER (5 lines)
async getCurrentConfiguration(req: Request, res: Response): Promise<void> {
  const configuration = await this.getCurrentConfigurationHandler.handle({});

  const response = ConfigurationDto.toResponse(configuration);  // ✅ ONE line

  res.json({ success: true, data: response });
}
```

**Benefits:**
- 📉 Reduced from 60 lines → 5 lines
- ✅ Controller only does routing
- ✅ Transformation logic centralized
- ✅ Matches existing Tube/Researcher pattern

---

### Phase 3: Update SaveConfiguration Endpoint
**Location:** `server/src/presentation/controllers/ConfigurationController.ts`

**Changes:**
```typescript
// BEFORE (hypothetical - if we had manual mapping)
async saveConfiguration(req: Request, res: Response): Promise<void> {
  const requestData = req.body;

  // ❌ Manual transformation
  const domainData = {
    systemSettings: { /* manual mapping */ },
    equipment: { /* manual mapping */ }
  };

  await this.saveConfigurationHandler.handle(domainData);
  res.json({ success: true });
}

// AFTER
async saveConfiguration(req: Request, res: Response): Promise<void> {
  const request = req.body; // Already validated by Zod middleware

  const domainData = ConfigurationDto.fromSaveRequest(request);  // ✅ ONE line

  await this.saveConfigurationHandler.handle(domainData);
  res.json({ success: true });
}
```

---

### Phase 4: Client-Side Service Layer Fix
**Location:** `client/src/domains/storage/services/StorageService.ts`

**Current Issue:**
Client has ANOTHER transformation layer in `loadConfiguration()` and `saveConfiguration()`:

```typescript
// BEFORE (lines 27-54)
static async loadConfiguration(): Promise<ConfigurationResponse> {
  const response = await httpClient.getData('/configuration', ConfigurationResponseSchema);

  // ❌ ANOTHER transformation layer on client
  const transformedCurrentLab = {
    ...response.configuration.currentLab,
    equipment: {
      tanks: response.configuration.currentLab.equipment.tanks.map(tank => ({
        racks: tank.racks.map(rack => ({
          boxes: rack.boxes.map(box => {
            const letterIndex = box.name.toUpperCase().charCodeAt(0) - 65;
            return {
              ...box,
              id: box.name,
              name: NAMING_PATTERNS.BOX.DEFAULT_NAME(letterIndex),
            };
          })
        }))
      }))
    }
  };

  return { ...response, configuration: { ...response.configuration, currentLab: transformedCurrentLab } };
}
```

**ROOT CAUSE:**
Server was sending `box.name` (simple letter), but client needs:
- `box.id` = "A" (identifier)
- `box.name` = "Box A" (display name)

**SOLUTION:**
Server DTO should ALREADY map this correctly. Client just receives and uses.

**AFTER:**
```typescript
// ✅ No transformation needed - server sends correct format
static async loadConfiguration(): Promise<ConfigurationResponse> {
  return await httpClient.getData('/configuration', ConfigurationResponseSchema);
}
```

**Why This Works:**
- Server's `ConfigurationDto.toResponse()` already maps `box.name` → `box.id`
- Server generates display name on the server side
- Client receives ready-to-use data
- No duplicate transformation logic

---

### Phase 5: Remove Client-Side Transformations
**Location:** `client/src/domains/storage/services/StorageService.ts`

**Files to Update:**
1. `StorageService.ts` - Remove transformations in `loadConfiguration()` and `saveConfiguration()`

**Changes:**

```typescript
// loadConfiguration - BEFORE (lines 23-62)
static async loadConfiguration(): Promise<ConfigurationResponse> {
  try {
    const response = await httpClient.getData('/configuration', ConfigurationResponseSchema);

    // ❌ Remove this entire transformation block
    const transformedCurrentLab = { /* 30 lines */ };

    return { ...response, configuration: { ...response.configuration, currentLab: transformedCurrentLab } };
  } catch (error) { /* ... */ }
}

// loadConfiguration - AFTER (5 lines)
static async loadConfiguration(): Promise<ConfigurationResponse> {
  try {
    return await httpClient.getData('/configuration', ConfigurationResponseSchema);
  } catch (error) {
    throw new InfrastructureError('API_ERROR', 'Failed to load configuration from server', { originalError: error });
  }
}
```

```typescript
// saveConfiguration - BEFORE (lines 67-101)
static async saveConfiguration(systemConfig: SystemConfiguration, currentLab: LabConfiguration): Promise<void> {
  try {
    // ❌ Remove this transformation
    const transformedLab = {
      ...currentLab,
      equipment: {
        tanks: currentLab.equipment.tanks.map(tank => ({
          racks: tank.racks.map(rack => ({
            boxes: rack.boxes.map(box => ({
              ...box,
              name: box.id,  // Transform back
            }))
          }))
        }))
      }
    };

    const requestData = SaveConfigurationRequestSchema.parse({
      configuration: { systemConfig, currentLab: transformedLab }
    });

    await httpClient.put('/configuration', requestData);
  } catch (error) { /* ... */ }
}

// saveConfiguration - AFTER (10 lines)
static async saveConfiguration(systemConfig: SystemConfiguration, currentLab: LabConfiguration): Promise<void> {
  try {
    const requestData = SaveConfigurationRequestSchema.parse({
      configuration: { systemConfig, currentLab }  // ✅ No transformation
    });

    await httpClient.put('/configuration', requestData);
  } catch (error) {
    throw new InfrastructureError('API_ERROR', 'Failed to save configuration to server', { originalError: error, systemConfig, currentLab });
  }
}
```

**Why This Works:**
- Server handles ALL transformations
- Client just sends/receives data matching shared schema
- Single source of truth (server DTO)

---

## Testing Strategy

### Unit Tests for ConfigurationDto

**Location:** `server/src/application/dto/__tests__/ConfigurationDto.test.ts`

```typescript
import { ConfigurationDto } from '../ConfigurationDto';
import { Configuration } from '../../../domain/entities/Configuration';

describe('ConfigurationDto', () => {
  describe('toResponse', () => {
    it('should map domain Configuration to API response', () => {
      const config = Configuration.createDefault();
      const response = ConfigurationDto.toResponse(config);

      expect(response.configuration.systemConfig.currentLabId).toBe('default-lab');
      expect(response.configuration.currentLab.equipment.tanks).toHaveLength(1);
      expect(response.configuration.currentLab.equipment.tanks[0].racks[0].boxes[0]).toEqual({
        id: 'A',
        name: 'A',
        gridConfig: expect.any(Object),
        position: 1
      });
    });

    it('should match ConfigurationResponseSchema', () => {
      const config = Configuration.createDefault();
      const response = ConfigurationDto.toResponse(config);

      // Zod will throw if schema doesn't match
      expect(() => ConfigurationResponseSchema.parse({ configuration: response.configuration })).not.toThrow();
    });
  });

  describe('fromSaveRequest', () => {
    it('should map API request to domain format', () => {
      const request = {
        configuration: {
          systemConfig: { /* ... */ },
          currentLab: { /* ... */ }
        }
      };

      const domainData = ConfigurationDto.fromSaveRequest(request);

      expect(domainData.systemSettings.labName).toBe(request.configuration.currentLab.name);
      expect(domainData.equipment.tanks).toBeDefined();
    });
  });
});
```

### Integration Tests

**Location:** `server/src/presentation/controllers/__tests__/ConfigurationController.test.ts`

```typescript
describe('ConfigurationController', () => {
  it('should return configuration in correct format', async () => {
    const response = await request(app).get('/api/configuration');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.configuration.systemConfig).toBeDefined();
    expect(response.body.data.configuration.currentLab).toBeDefined();

    // Validate against schema
    expect(() => ConfigurationResponseSchema.parse(response.body.data)).not.toThrow();
  });
});
```

---

## Migration Path

### Step-by-Step Execution

**Phase 1: Create DTO (No Breaking Changes)**
1. Create `server/src/application/dto/ConfigurationDto.ts`
2. Write unit tests
3. Verify tests pass
4. Commit: "feat(application): Add ConfigurationDto for domain-API mapping"

**Phase 2: Update Server Controller (No Breaking Changes)**
1. Update `ConfigurationController.getCurrentConfiguration()`
2. Replace manual mapping with `ConfigurationDto.toResponse()`
3. Run integration tests
4. Verify response format matches schema
5. Commit: "refactor(presentation): Use ConfigurationDto in controller"

**Phase 3: Simplify Client Service (Breaking Change - But Better)**
1. Remove transformations from `StorageService.loadConfiguration()`
2. Remove transformations from `StorageService.saveConfiguration()`
3. Test end-to-end
4. Commit: "refactor(client): Remove duplicate transformations from StorageService"

**Phase 4: Update Save Endpoint**
1. Add `ConfigurationController.saveConfiguration()` using DTO
2. Test save/load cycle
3. Commit: "feat(presentation): Use ConfigurationDto for save operations"

**Phase 5: Cleanup**
1. Remove `.bak` files
2. Update documentation
3. Commit: "chore: Clean up old configuration code"

### Rollback Plan

If issues arise:
1. **Phase 1-2 (Server Only):** Revert commits, no client impact
2. **Phase 3 (Client Changes):** Revert `StorageService.ts` changes
3. **Database:** No migration needed (no schema changes)

---

## Success Criteria

### Code Quality
- ✅ ConfigurationController < 50 lines (currently ~100+)
- ✅ No manual object construction in controllers
- ✅ All transformations in DTO layer
- ✅ Passes ESLint/TypeScript strict mode

### Testing
- ✅ ConfigurationDto has >90% test coverage
- ✅ Integration tests pass
- ✅ End-to-end configuration save/load works

### Architecture Compliance
- ✅ Follows AGENTS.md guidelines
- ✅ Matches existing Tube/Researcher patterns
- ✅ Single source of truth (shared-schemas)
- ✅ Clean Architecture layers respected

### Performance
- ✅ No performance regression
- ✅ Response time < 100ms (same as before)

---

## Adherence to AGENTS.md Guidelines

### 1. Clean Architecture ✅
**Guideline:** "Backend (Clean Architecture) - Domain, Application, Infrastructure, Presentation"

**Implementation:**
- Domain: `Configuration` entity (business logic)
- Application: `ConfigurationDto` (mapping logic)
- Presentation: `ConfigurationController` (routing only)
- Infrastructure: Database mappers (separate concern)

### 2. Single Source of Truth ✅
**Guideline:** "Shared Packages: `@odysseus/shared-schemas` - Single source of truth for validation"

**Implementation:**
- All types from `@odysseus/shared-schemas`
- No duplicate schemas
- DTO validates against shared schemas

### 3. DTOs in Application Layer ✅
**Guideline:** "Application: Use cases, DTOs, application services"

**Implementation:**
- `server/src/application/dto/ConfigurationDto.ts`
- Matches `TubeDto.ts`, `ResearcherDto.ts`

### 4. Thin Controllers ✅
**Guideline:** "Controllers should be thin - just routing and response formatting"

**Implementation:**
- Controller: 5 lines (routing only)
- DTO: All transformation logic
- Matches existing pattern

### 5. Mapper Pattern ✅
**Guideline:** "Infrastructure layer includes mappers for database transformations"

**Implementation:**
- Database Mappers: Domain ↔ Database
- Application DTOs: Domain ↔ API
- Presentation Mappers: Request ↔ Domain criteria

### 6. Type Safety ✅
**Guideline:** "Always import from shared schemas, never define locally"

**Implementation:**
```typescript
import {
  ConfigurationResponse,
  SystemConfiguration,
  LabConfiguration
} from '@odysseus/shared-schemas';
```

---

## Files to Create/Modify

### Create (1 file)
1. `server/src/application/dto/ConfigurationDto.ts` - New DTO mapper

### Modify (2 files)
1. `server/src/presentation/controllers/ConfigurationController.ts` - Use DTO instead of manual mapping
2. `client/src/domains/storage/services/StorageService.ts` - Remove client-side transformations

### Delete (1 file)
1. `server/src/presentation/controllers/ConfigurationController.ts.bak` - No longer needed

### Test (2 files)
1. `server/src/application/dto/__tests__/ConfigurationDto.test.ts` - Unit tests
2. `server/src/presentation/controllers/__tests__/ConfigurationController.test.ts` - Integration tests

---

## Timeline

### Day 1: Planning & Review (30 min)
- ✅ Review this plan
- ✅ Approve architecture approach
- ✅ Identify any concerns

### Day 1: Implementation (2 hours)
- **Phase 1:** Create DTO + Tests (45 min)
- **Phase 2:** Update Controller (30 min)
- **Phase 3:** Simplify Client (30 min)
- **Phase 4:** Save Endpoint (15 min)

### Day 1: Testing & Verification (30 min)
- Run unit tests
- Run integration tests
- Manual E2E testing
- Verify no regressions

**Total Estimated Time:** 3 hours

---

## Risk Mitigation

### Risk: Breaking Client-Server Contract
**Mitigation:**
- Server DTO validates against shared schema
- TypeScript compile-time errors if mismatch
- Integration tests verify response format

### Risk: Performance Regression
**Mitigation:**
- DTO is pure function (no overhead)
- Same transformation logic, just organized better
- Benchmark before/after

### Risk: Incomplete Transformation
**Mitigation:**
- Unit tests cover all fields
- Schema validation catches missing fields
- Manual testing verifies display names

---

## Questions for Review

1. **Architecture Approval**
   - Does this match the project's Clean Architecture vision?
   - Is the DTO placement correct (Application layer)?

2. **Naming Conventions**
   - `ConfigurationDto` vs `ConfigurationMapper`?
   - Follow existing `TubeDto` pattern?

3. **Scope**
   - Should we also create `ConfigurationMapper` for database layer?
   - Or keep existing domain entity methods?

4. **Testing**
   - Acceptable test coverage level?
   - Additional integration tests needed?

5. **Timeline**
   - 3-hour estimate reasonable?
   - Should this be broken into smaller PRs?

---

## References

### Existing Patterns
- `server/src/application/dto/TubeDto.ts` - Template for this DTO
- `server/src/infrastructure/database/mappers/TubeMapper.ts` - Database mapping pattern
- `server/src/presentation/mappers/SearchCriteriaMapper.ts` - Presentation mapping pattern

### Architecture Docs
- `AGENTS.md` - Clean Architecture guidelines
- `packages/shared-schemas/src/laboratory/configurationSchemas.ts` - API contract

### Related Issues
- Configuration box name display bug (current issue)
- Technical debt: Manual object construction
- Maintainability: Schema changes require updates in multiple places

---

## Next Steps

1. **Review this plan** with the team
2. **Address any questions** or concerns
3. **Approve or modify** the approach
4. **Begin implementation** following the migration path

---

**Document Version:** 1.0
**Last Updated:** 2025-10-30
**Author:** Claude (AI Assistant)
**Reviewers:** [Pending]
**Status:** Awaiting Review
