# Concurrency & Architecture Remediation Plan

## Executive Summary

This document outlines a comprehensive plan to address critical concurrency vulnerabilities and architectural gaps identified in the Odysseus CRUD operations. The issues span configuration management, tube operations, equipment deletion, and real-time event handling.

**Severity Assessment:**
- **CRITICAL:** 4 issues (data loss, silent failures, orphaned data)
- **HIGH:** 3 issues (race conditions, partial failures)
- **MEDIUM:** 1 issue (performance/thundering herd)

---

## Issue 1: Configuration Lost Updates (No Optimistic Locking)

### Investigation Status: COMPLETE (2026-01-12)

### Implementation Status: COMPLETE (2026-01-12)

**Backend (COMPLETE):**
- ✅ Created `ConflictError` class in `domain/errors/ConflictError.ts`
- ✅ Added `saveWithOptimisticLock()` method to `ConfigurationRepository` interface
- ✅ Implemented optimistic locking in infrastructure repository (version check in WHERE clause)
- ✅ Updated all 24 command handlers to use `saveWithOptimisticLock()` with expected version
- ✅ Added 409 Conflict error handling in `ConfigurationController.handleError()`

**Client (COMPLETE):**
- ✅ Created `useConfigurationVersion` hook to read version from React Query cache
- ✅ Added `isConflictError()` helper function in mutation hooks
- ✅ Added `handleConflictError()` to show user-friendly message and refresh cache
- ✅ Updated all 15 storage mutation hooks with conflict error handling:
  - Tank: add, update, delete (3)
  - Rack: add, update, delete, assign (4)
  - Box: add, update, delete, assign (4)
  - Bulk: unassign, reassign (2)
  - Other: initialize, updateResourceLabel (2)
- ✅ Both server and client builds pass with no errors

### Current State

**Location:** `server/src/infrastructure/repositories/ConfigurationRepository.ts`

The configuration system stores all equipment (tanks, racks, boxes) as a single JSON document. Multiple concurrent operations can cause **lost updates**:

```typescript
// Current UPDATE statement (lines 153-157)
await client.query(
  `UPDATE configuration_current
   SET version = $1, updated_at = $2, config_json = $3
   WHERE id = 1`,  // <-- No version check!
  [newVersion, now, configJson]
);
```

**Race Condition Example:**
```
User A: Read config (v2) → Modify → Save (overwrites with v3)
User B: Read config (v2) → Modify → Save (overwrites with v4, losing User A's changes)
```

### Investigation Findings

#### Configuration Entity (`domain/entities/Configuration.ts`)
- Version field exists: `private _version: number`
- All update methods return new Configuration with incremented version (`this._version + 1`)
- Immutable pattern - `update*` methods return new instance
- `toData()` serializes version for persistence
- `toApiData()` exposes version in response metadata

#### ConfigurationRepository (`infrastructure/repositories/ConfigurationRepository.ts`)
- `save()` delegates to `saveWithVersioning()` (line 47)
- `saveWithVersioning()` (lines 136-167):
  - Gets new version from auto-increment INSERT into `configuration_versions`
  - UPDATE has **NO version check** in WHERE clause: `WHERE id = 1`
  - **CRITICAL VULNERABILITY**: Version is set to new value regardless of what client expected

#### API Response Format
- `ConfigurationDto.toResponse()` includes version at path: `configuration.systemConfig.version`
- All command endpoints return version in responses (e.g., `version: updatedConfiguration.version`)
- Version is available to clients but **clients don't send it back in requests**

#### Client Integration
- **Client receives version** in GET `/api/configuration` response
- **Client does NOT send expectedVersion** in any mutation requests (verified via grep)
- No conflict handling exists in client-side React Query hooks

#### Complete List of Save Points (24 handlers)

| File | Handler | Method Used |
|------|---------|-------------|
| TankCommands.ts | AddTankCommandHandler | `save()` |
| TankCommands.ts | UpdateTankCommandHandler | `save()` |
| TankCommands.ts | DeleteTankCommandHandler | `save()` |
| RackCommands.ts | AddRacksCommandHandler | `save()` |
| RackCommands.ts | UpdateRackCommandHandler | `save()` |
| RackCommands.ts | DeleteRackCommandHandler | `save()` |
| RackCommands.ts | AssignRackCommandHandler | `save()` |
| BoxCommands.ts | AddBoxesCommandHandler | `save()` |
| BoxCommands.ts | UpdateBoxCommandHandler | `save()` |
| BoxCommands.ts | DeleteBoxCommandHandler | `save()` |
| BoxCommands.ts | AssignBoxCommandHandler | `save()` |
| ConfigurationCommands.ts | UpdateSystemConfigurationCommandHandler | `saveWithVersioning()` |
| ConfigurationCommands.ts | UpdateEquipmentConfigurationCommandHandler | `saveWithVersioning()` |
| ConfigurationCommands.ts | ResetConfigurationToDefaultCommandHandler | `save()` |
| ConfigurationCommands.ts | ImportConfigurationCommandHandler | `save()` |
| ConfigurationCommands.ts | UpdateBoxPositionDisplayCommandHandler | `save()` |
| ConfigurationCommands.ts | UpdateLabDefaultPositionDisplayCommandHandler | `save()` |
| ConfigurationCommands.ts | UpdateResourceLabelCommandHandler | `save()` |
| BulkAssignmentCommands.ts | BulkUnassignResourcesCommandHandler | `save()` |
| BulkAssignmentCommands.ts | BulkReassignResourcesCommandHandler | `save()` |
| InitializeConfigurationCommand.ts | InitializeConfigurationCommandHandler | `save()` |
| UserCommands.ts | DeleteUserCommandHandler | `save()` (clears assignments) |

**Note:** Both `save()` and `saveWithVersioning()` ultimately call the same UPDATE without version check.

### Current Architecture Strengths
- Version field exists in Configuration entity (`_version: number`)
- Append-only history table (`configuration_versions`) with auto-increment
- PostgreSQL transaction support available
- Version included in API responses
- Immutable entity pattern (all updates return new instances)

### Missing Components
- No version predicate in UPDATE WHERE clause
- No `ConflictError` exception type (verified: doesn't exist in `domain/errors/`)
- Repository methods don't accept `expectedVersion` parameter
- Controller doesn't extract version from request body
- No 409 Conflict response handling
- Client doesn't track or send version

### Implementation Plan

#### Phase 1: Domain Layer Changes

**1.1 Create ConflictError** (`server/src/domain/errors/ConflictError.ts`)
```typescript
export class ConflictError extends DomainError {
  constructor(
    message: string,
    public readonly currentVersion: number,
    public readonly expectedVersion: number
  ) {
    super('CONFLICT', message);
  }

  static configurationConflict(expected: number, current: number): ConflictError {
    return new ConflictError(
      `Configuration was modified by another user. Expected version ${expected}, but current version is ${current}. Please refresh and try again.`,
      current,
      expected
    );
  }
}
```

**1.2 Update ConfigurationRepository Interface** (`server/src/domain/repositories/ConfigurationRepository.ts`)
```typescript
export interface ConfigurationRepository {
  getCurrent(): Promise<Configuration | null>;

  // New method with optimistic locking
  saveWithVersion(
    configuration: Configuration,
    expectedVersion: number,
    changeDescription?: string,
    changedBy?: string
  ): Promise<void>; // throws ConflictError

  // Keep existing for backward compatibility during migration
  save(configuration: Configuration): Promise<void>;
}
```

#### Phase 2: Infrastructure Layer Changes

**2.1 Implement Optimistic Locking in Repository** (`ConfigurationRepository.ts`)
```typescript
async saveWithVersion(
  configuration: Configuration,
  expectedVersion: number,
  changeDescription?: string,
  changedBy: string = 'system'
): Promise<void> {
  await this.context.transaction(async (client) => {
    const now = new Date();
    const configJson = JSON.stringify(configuration.toData());

    // Insert new version record
    const versionResult = await client.query(
      `INSERT INTO configuration_versions (updated_at, change_description, changed_by, config_json)
       VALUES ($1, $2, $3, $4)
       RETURNING version`,
      [now, changeDescription, changedBy, configJson]
    );
    const newVersion = versionResult.rows[0].version;

    // Optimistic lock: only update if version matches
    const updateResult = await client.query(
      `UPDATE configuration_current
       SET version = $1, updated_at = $2, config_json = $3
       WHERE id = 1 AND version = $4`,
      [newVersion, now, configJson, expectedVersion]
    );

    if (updateResult.rowCount === 0) {
      // Version mismatch - fetch current version for error message
      const currentConfig = await client.query(
        'SELECT version FROM configuration_current WHERE id = 1'
      );
      const currentVersion = currentConfig.rows[0]?.version ?? 0;
      throw ConflictError.configurationConflict(expectedVersion, currentVersion);
    }
  });
}
```

#### Phase 3: Application Layer Changes

**3.1 Update Command Handlers to Pass Expected Version**

All configuration command handlers need modification. Example for `AddTankCommandHandler`:

```typescript
// Before
await this.configurationRepository.save(currentConfig);

// After
await this.configurationRepository.saveWithVersion(
  currentConfig,
  currentConfig.version, // Expected version from when we read it
  `Added tank '${command.name}'`,
  command.userId
);
```

**Affected Command Handlers:**
- `AddTankCommandHandler` (TankCommands.ts)
- `UpdateTankCommandHandler` (TankCommands.ts)
- `DeleteTankCommandHandler` (TankCommands.ts)
- `AddRacksCommandHandler` (RackCommands.ts)
- `UpdateRackCommandHandler` (RackCommands.ts)
- `DeleteRackCommandHandler` (RackCommands.ts)
- `AssignRackCommandHandler` (RackCommands.ts)
- `AddBoxesCommandHandler` (BoxCommands.ts)
- `UpdateBoxCommandHandler` (BoxCommands.ts)
- `DeleteBoxCommandHandler` (BoxCommands.ts)
- `AssignBoxCommandHandler` (BoxCommands.ts)
- `UpdateBoxPositionDisplayCommandHandler` (ConfigurationCommands.ts)
- `UpdateLabDefaultPositionDisplayCommandHandler` (ConfigurationCommands.ts)
- `UpdateResourceLabelCommandHandler` (ConfigurationCommands.ts)

#### Phase 4: Presentation Layer Changes

**4.1 Handle ConflictError in Controllers**

```typescript
// ConfigurationController.ts - Add to error handling
} catch (error) {
  if (error instanceof ConflictError) {
    res.status(409).json({
      success: false,
      error: {
        code: 'CONFIGURATION_CONFLICT',
        message: error.message,
        currentVersion: error.currentVersion,
        expectedVersion: error.expectedVersion
      }
    });
    return;
  }
  // ... existing error handling
}
```

**4.2 Update API Responses to Include Version**

Ensure all configuration GET endpoints return version for client tracking:
```typescript
res.json({
  success: true,
  data: {
    ...configData,
    version: configuration.version
  }
});
```

#### Phase 5: Client-Side Changes

**5.1 Track Configuration Version in React Query**

```typescript
// Store version from GET responses
const { data: config } = useQuery({
  queryKey: queryKeys.storage.storage(),
  // ...
});
const configVersion = config?.version;

// Include version in mutation requests
const addTankMutation = useMutation({
  mutationFn: (data) => api.addTank({ ...data, expectedVersion: configVersion }),
});
```

**5.2 Handle 409 Conflict Responses**

```typescript
// In mutation error handler
onError: (error) => {
  if (error.response?.status === 409) {
    // Invalidate cache to get fresh data
    queryClient.invalidateQueries({ queryKey: queryKeys.storage.storage() });
    toast.error('Configuration was modified. Please try again.');
    return;
  }
  // ... handle other errors
}
```

### Testing Checklist
- [ ] Unit test: ConflictError creation and properties
- [ ] Unit test: Repository throws ConflictError on version mismatch
- [ ] Unit test: Repository succeeds when version matches
- [ ] Integration test: Two concurrent saves, second fails
- [ ] Integration test: Retry after conflict succeeds
- [ ] E2E test: UI handles 409 response gracefully

---

## Issue 2: Position Collision Race Conditions (Tubes)

### Current State

**Location:** `server/src/application/services/TubePositionService.ts`

Position validation uses a check-then-act pattern vulnerable to races:

```typescript
// Line 118-138: checkPositionConflicts()
const existingTube = await this.tubeRepository.findByLocation(location);
if (existingTube && existingTube.id !== excludeTubeId) {
  // Position occupied
}
// RACE WINDOW: Another request can claim this position before INSERT
```

**Database Constraint:**
```sql
UNIQUE(tank_id, rack_id, box_id, position)  -- Catches race at DB level
```

### Current Architecture Strengths
- UNIQUE constraint exists at database level
- `excludeTubeId` parameter prevents self-conflict on updates
- Transaction support available in PostgresContext

### Missing Components
- No pessimistic locking (SELECT FOR UPDATE)
- Application-level validation can pass for both concurrent requests
- Unclear error handling when UNIQUE constraint violated

### Implementation Plan

#### Phase 1: Add Pessimistic Locking for Position Validation

**1.1 Create Position Lock Query**

```typescript
// TubeRepository.ts - New method
async lockPosition(
  location: Location,
  client: PoolClient,
  excludeTubeId?: string
): Promise<Tube | null> {
  const query = excludeTubeId
    ? `SELECT * FROM tubes
       WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3 AND position = $4
       AND id != $5
       FOR UPDATE`
    : `SELECT * FROM tubes
       WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3 AND position = $4
       FOR UPDATE`;

  const params = excludeTubeId
    ? [location.tankId, location.rackId, location.boxId, location.position, excludeTubeId]
    : [location.tankId, location.rackId, location.boxId, location.position];

  const result = await client.query(query, params);
  return result.rows[0] ? TubeMapper.toDomain(result.rows[0]) : null;
}
```

**1.2 Update TubeApplicationService.createTube()**

```typescript
async createTube(request: CreateTubeRequest, user: AuthenticatedUser): Promise<TubeDTO> {
  // ... permission checks ...

  return await this.context.transaction(async (client) => {
    // Lock position within transaction
    const existingTube = await this.tubeRepository.lockPosition(location, client);

    if (existingTube) {
      throw new ValidationError(
        `Position ${location.position} in ${location.boxId} is already occupied by tube ${existingTube.id}`
      );
    }

    // Create and save tube within same transaction
    const tube = Tube.create({ ... });
    await this.tubeRepository.saveWithClient(tube, client);

    // Publish event after transaction commits
    await this.eventBus.publish(new TubeCreatedEvent(...));

    return TubeMapper.toDTO(tube);
  });
}
```

#### Phase 2: Handle Database Constraint Violations Gracefully

**2.1 Catch UNIQUE Constraint Errors**

```typescript
// TubeRepository.save() - Enhanced error handling
async save(tube: Tube): Promise<void> {
  try {
    await this.context.query(
      `INSERT INTO tubes (...) VALUES (...)
       ON CONFLICT (id) DO UPDATE SET ...`,
      [...]
    );
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      const match = error.detail?.match(/Key \(tank_id, rack_id, box_id, position\)/);
      if (match) {
        throw new ValidationError(
          'Position is already occupied. Another tube was placed there moments ago.'
        );
      }
    }
    throw error;
  }
}
```

#### Phase 3: Atomic Bulk Operations

**3.1 Rewrite bulkUpdateTubes() for Atomic Position Changes**

```typescript
async bulkUpdateTubes(
  request: BulkUpdateRequest,
  user: AuthenticatedUser
): Promise<BulkUpdateResult> {
  return await this.context.transaction(async (client) => {
    const results: BulkUpdateResult = { succeeded: [], failed: [] };

    // Phase 1: Lock all source and target positions
    const positionLocks = new Map<string, Tube | null>();
    for (const update of request.updates) {
      if (update.updates.location) {
        const lockKey = `${update.updates.location.tankId}:${update.updates.location.rackId}:${update.updates.location.boxId}:${update.updates.location.position}`;
        const existing = await this.tubeRepository.lockPosition(
          update.updates.location,
          client,
          update.id // Exclude self
        );
        positionLocks.set(lockKey, existing);
      }
    }

    // Phase 2: Validate all positions are available
    for (const [key, existing] of positionLocks) {
      if (existing) {
        throw new ValidationError(`Position conflict detected at ${key}`);
      }
    }

    // Phase 3: Apply all updates atomically
    for (const update of request.updates) {
      const tube = await this.tubeRepository.findById(update.id);
      const updatedTube = tube.update(update.updates);
      await this.tubeRepository.saveWithClient(updatedTube, client);
      results.succeeded.push(update.id);
    }

    return results;
  });
}
```

### Testing Checklist
- [ ] Unit test: Position lock returns existing tube
- [ ] Unit test: Position lock returns null for empty position
- [ ] Integration test: Two concurrent creates to same position, one fails
- [ ] Integration test: Bulk update with swapping positions succeeds
- [ ] Integration test: Bulk update with conflict fails atomically
- [ ] Load test: 10 concurrent position claims, exactly 1 succeeds

---

## Issue 3: Tube Updates Last-Write-Wins (No Version Field)

### Implementation Status: COMPLETE (2026-01-12)

**Solution Implemented:**
- Added `version` column to tubes database schema (DEFAULT 1 for existing tubes)
- Added `_version` field to Tube entity with increment on all mutations
- Added `ConflictError.tube()` factory method for 409 responses
- Updated TubeMapper to handle version in row ↔ entity conversion
- Added `saveWithOptimisticLock()` to TubeRepository interface and implementation
- Updated TubeApplicationService to use optimistic locking for updateTube(), lockTubes(), unlockTubes()
- Added version to shared schemas (tubeDataSchema)
- Added conflict error handling in client useTubeMutations hook

**Files Modified:**
- `server/src/infrastructure/database/schema.sql` - Added version column
- `server/src/infrastructure/database/PostgresContext.ts` - Migration for existing DBs
- `server/src/domain/entities/Tube.ts` - Added _version field, increments on mutations
- `server/src/domain/errors/ConflictError.ts` - Added tube() factory method
- `server/src/domain/repositories/TubeRepository.ts` - Added saveWithOptimisticLock interface
- `server/src/infrastructure/database/mappers/TubeMapper.ts` - Version mapping
- `server/src/infrastructure/repositories/TubeRepository.ts` - Implemented saveWithOptimisticLock
- `server/src/application/services/TubeApplicationService.ts` - Uses optimistic locking
- `packages/shared-schemas/src/tubes/tubeSchemas.ts` - Added version to schema
- `client/src/domains/tubes/hooks/useTubeMutations.ts` - Conflict error handling
- `client/src/domains/tubes/hooks/useOptimisticTubeMutations.ts` - Added version to optimistic create
- `client/src/__tests__/utils/mockData.ts` - Added version to mock data

### Original Problem State

**Location:** `server/src/domain/entities/Tube.ts`

The Tube entity lacked a version field for optimistic locking:

```typescript
// Current fields
private readonly _createdAt: Date;
private _updatedAt: Date;
// NO version field
```

**Consequence:** Two users editing the same tube simultaneously will have the second save silently overwrite the first.

### Implementation Plan

#### Phase 1: Add Version Field to Tube Entity

**1.1 Update Tube Entity** (`server/src/domain/entities/Tube.ts`)

```typescript
export class Tube {
  private constructor(
    private readonly _id: string,
    private _location: Location,
    private _sampleData: SampleData,
    private _researcherId: string,
    private _notes: string,
    private _tags: string[],
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _isLocked: boolean,
    private _lockedBy?: string,
    private _lockNote?: string,
    private _version: number  // NEW
  ) {}

  get version(): number { return this._version; }

  // Update method increments version
  update(changes: Partial<TubeUpdateData>): Tube {
    return new Tube(
      this._id,
      // ... updated fields ...
      this._version + 1  // Increment on update
    );
  }
}
```

**1.2 Update Database Schema**

```sql
-- Migration script
ALTER TABLE tubes ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Index for potential queries
CREATE INDEX idx_tubes_version ON tubes(id, version);
```

**1.3 Update TubeMapper**

```typescript
// TubeMapper.ts
static toRow(tube: Tube): TubeRow {
  return {
    // ... existing fields ...
    version: tube.version
  };
}

static toDomain(row: TubeRow): Tube {
  return Tube.reconstitute({
    // ... existing fields ...
    version: row.version
  });
}
```

#### Phase 2: Implement Optimistic Locking in Repository

**2.1 Update TubeRepository.save()**

```typescript
async saveWithVersion(tube: Tube, expectedVersion: number): Promise<void> {
  const result = await this.context.query(
    `UPDATE tubes SET
       tank_id = $1, rack_id = $2, box_id = $3, position = $4,
       cell_type = $5, passage = $6, concentration = $7,
       concentration_unit = $8, date = $9, notes = $10,
       tags = $11, researcher_id = $12, is_locked = $13,
       locked_by = $14, lock_note = $15, updated_at = $16,
       version = $17
     WHERE id = $18 AND version = $19`,
    [
      tube.location.tankId, tube.location.rackId, tube.location.boxId,
      tube.location.position, tube.sampleData.cellType, tube.sampleData.passage,
      tube.sampleData.concentration, tube.sampleData.concentrationUnit,
      tube.sampleData.date, tube.notes, JSON.stringify(tube.tags),
      tube.researcherId, tube.isLocked, tube.lockedBy, tube.lockNote,
      new Date(), tube.version, tube.id, expectedVersion
    ]
  );

  if (result.rowCount === 0) {
    // Fetch current version
    const current = await this.findById(tube.id);
    throw new ConflictError(
      `Tube was modified by another user`,
      current?.version ?? 0,
      expectedVersion
    );
  }
}
```

#### Phase 3: Update Application Service

**3.1 Pass Version Through Update Flow**

```typescript
// TubeApplicationService.updateTube()
async updateTube(
  tubeId: string,
  updates: TubeUpdateDTO,
  user: AuthenticatedUser
): Promise<TubeDTO> {
  const existingTube = await this.tubeRepository.findById(tubeId);
  if (!existingTube) {
    throw new NotFoundError(`Tube ${tubeId} not found`);
  }

  // ... permission checks, validation ...

  const updatedTube = existingTube.update(updates);

  // Pass expected version
  await this.tubeRepository.saveWithVersion(
    updatedTube,
    existingTube.version  // Version from when we read it
  );

  await this.eventBus.publish(new TubeUpdatedEvent(...));

  return TubeMapper.toDTO(updatedTube);
}
```

#### Phase 4: API and Client Changes

**4.1 Include Version in API Responses**

```typescript
// TubeDTO should include version
export interface TubeDTO {
  id: string;
  // ... existing fields ...
  version: number;
}
```

**4.2 Accept Version in Update Requests**

```typescript
// Update endpoint accepts expectedVersion
router.put('/tubes/:id', async (req, res) => {
  const { expectedVersion, ...updates } = req.body;
  // Pass to service
});
```

**4.3 Client Sends Version with Updates**

```typescript
// React Query mutation
const updateTubeMutation = useMutation({
  mutationFn: ({ id, updates, version }) =>
    api.updateTube(id, { ...updates, expectedVersion: version }),
});

// Usage
updateTubeMutation.mutate({
  id: tube.id,
  updates: formData,
  version: tube.version  // From query cache
});
```

### Testing Checklist
- [ ] Unit test: Tube.update() increments version
- [ ] Unit test: Repository throws ConflictError on version mismatch
- [ ] Integration test: Concurrent updates, second fails
- [ ] Migration test: Existing tubes get version=1
- [ ] E2E test: UI shows conflict message and refreshes

---

## Issue 4: Equipment Deletion TOCTOU Vulnerabilities

### Implementation Status: COMPLETE (2026-01-12)

**Solution Implemented:**
- Added `transactionSerializable()` method to PostgresContext for SERIALIZABLE isolation level
- Added atomic delete methods to ConfigurationRepository interface:
  - `deleteEmptyTank(tankId, changedBy)`
  - `deleteEmptyRack(tankId, rackId, changedBy)`
  - `deleteEmptyBox(tankId, rackId, boxId, changedBy)`
- Each method performs tube count check and equipment deletion in same SERIALIZABLE transaction
- Includes automatic retry logic (up to 3 attempts) for serialization failures
- Updated DeleteTankCommandHandler, DeleteRackCommandHandler, DeleteBoxCommandHandler to use atomic methods

**Files Modified:**
- `server/src/domain/repositories/ConfigurationRepository.ts` - Added interface methods
- `server/src/infrastructure/database/PostgresContext.ts` - Added `transactionSerializable()`
- `server/src/infrastructure/repositories/ConfigurationRepository.ts` - Implemented atomic deletes
- `server/src/application/commands/TankCommands.ts` - Simplified DeleteTankCommandHandler
- `server/src/application/commands/RackCommands.ts` - Simplified DeleteRackCommandHandler
- `server/src/application/commands/BoxCommands.ts` - Simplified DeleteBoxCommandHandler

### Original Problem State

**Location:** `server/src/application/commands/TankCommands.ts`, `RackCommands.ts`, `BoxCommands.ts`

Equipment deletion had a Time-Of-Check to Time-Of-Use race condition:

```typescript
// DeleteRackCommandHandler - BEFORE FIX
const tubesInRack = await this.tubeRepository.findByTankAndRack(tankId, rackId);
// RACE WINDOW: Tube can be added here
if (tubesInRack.length > 0) {
  throw new ValidationError('Cannot delete: tubes exist');
}
// RACE WINDOW: Tube can be added here
currentConfig.removeRack(tankId, rackId);
await this.configurationRepository.save(currentConfig);  // Rack deleted, tube orphaned
```

### Architecture Constraints
- Configuration stored as JSON document (separate from tubes table)
- No foreign key constraints between tubes and equipment
- Tubes reference equipment by string IDs

### Implementation Plan

#### Phase 1: Atomic Check-and-Delete with Locking

**1.1 Create Locked Tube Check Method**

```typescript
// TubeRepository.ts
async countTubesInRackWithLock(
  tankId: string,
  rackId: string,
  client: PoolClient
): Promise<number> {
  // Use FOR UPDATE to prevent concurrent tube insertions
  const result = await client.query(
    `SELECT COUNT(*) as count FROM tubes
     WHERE tank_id = $1 AND rack_id = $2
     FOR UPDATE`,
    [tankId, rackId]
  );
  return parseInt(result.rows[0].count, 10);
}

async countTubesInBoxWithLock(
  tankId: string,
  rackId: string,
  boxId: string,
  client: PoolClient
): Promise<number> {
  const result = await client.query(
    `SELECT COUNT(*) as count FROM tubes
     WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3
     FOR UPDATE`,
    [tankId, rackId, boxId]
  );
  return parseInt(result.rows[0].count, 10);
}

async countTubesInTankWithLock(
  tankId: string,
  client: PoolClient
): Promise<number> {
  const result = await client.query(
    `SELECT COUNT(*) as count FROM tubes
     WHERE tank_id = $1
     FOR UPDATE`,
    [tankId]
  );
  return parseInt(result.rows[0].count, 10);
}
```

**1.2 Rewrite DeleteRackCommandHandler**

```typescript
async handle(command: DeleteRackCommand): Promise<void> {
  const user = await this.getUserById(command.userId);
  if (!user.role.isAdmin()) {
    throw PermissionError.configurationManagement('delete rack', command.userId);
  }

  // Execute check and delete atomically
  await this.context.transaction(async (client) => {
    // Lock tubes table rows for this rack
    const tubeCount = await this.tubeRepository.countTubesInRackWithLock(
      command.tankId,
      command.rackId,
      client
    );

    if (tubeCount > 0) {
      throw new ValidationError(
        `Cannot delete rack: ${tubeCount} tube(s) are stored in this location. ` +
        `Move or delete the tubes first.`
      );
    }

    // Now safe to delete rack - tubes table is locked
    const currentConfig = await this.configurationRepository.getCurrentWithClient(client);
    if (!currentConfig) {
      throw new ValidationError('No configuration found');
    }

    const rack = this.findRack(currentConfig, command.tankId, command.rackId);
    const rackName = rack.name;

    currentConfig.removeRack(command.tankId, command.rackId);

    await this.configurationRepository.saveWithClient(
      currentConfig,
      currentConfig.version,
      `Deleted rack '${rackName}'`,
      command.userId,
      client
    );

    // Event published after transaction commits successfully
    this.pendingEvent = new RackDeletedEvent(
      command.userId,
      command.tankId,
      command.rackId,
      rackName
    );
  });

  // Publish event outside transaction
  await this.eventBus.publish(this.pendingEvent);
}
```

#### Phase 2: Add Database-Level Safeguards

**2.1 Create Equipment Reference Table** (Optional but recommended)

```sql
-- New table to track valid equipment references
CREATE TABLE equipment_references (
  tank_id TEXT NOT NULL,
  rack_id TEXT,
  box_id TEXT,
  PRIMARY KEY (tank_id, COALESCE(rack_id, ''), COALESCE(box_id, ''))
);

-- Trigger to sync with configuration_current
CREATE OR REPLACE FUNCTION sync_equipment_references()
RETURNS TRIGGER AS $$
BEGIN
  -- Clear and rebuild from JSON
  DELETE FROM equipment_references;

  INSERT INTO equipment_references (tank_id, rack_id, box_id)
  SELECT
    tank->>'id',
    rack->>'id',
    box->>'id'
  FROM configuration_current,
    jsonb_array_elements(config_json::jsonb->'tanks') AS tank,
    jsonb_array_elements(tank->'racks') AS rack,
    jsonb_array_elements(rack->'boxes') AS box;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_references_sync
AFTER INSERT OR UPDATE ON configuration_current
FOR EACH ROW EXECUTE FUNCTION sync_equipment_references();

-- Add foreign key to tubes
ALTER TABLE tubes ADD CONSTRAINT fk_tubes_equipment
FOREIGN KEY (tank_id, rack_id, box_id)
REFERENCES equipment_references(tank_id, rack_id, box_id)
ON DELETE RESTRICT;
```

**Note:** This Phase 2 approach adds significant complexity. Phase 1 alone provides adequate protection for most use cases.

#### Phase 3: Apply to All Delete Handlers

Replicate the pattern from Phase 1.2 to:
- `DeleteTankCommandHandler`
- `DeleteBoxCommandHandler`

### Testing Checklist
- [ ] Unit test: Locked check returns correct count
- [ ] Integration test: Delete rack while tube insertion in progress - insertion blocked
- [ ] Integration test: Delete box while tube move in progress - one operation succeeds
- [ ] Stress test: 100 concurrent delete + add operations, no orphans created
- [ ] Rollback test: Failed deletion doesn't leave partial state

---

## Issue 5: Bulk Operations Partial Failures

### Investigation Status: COMPLETE (2026-01-12)

### Implementation Status: COMPLETE (2026-01-12)

**Solution Implemented:**
- Fixed `createTubes()` to use partial success pattern matching `bulkUpdateTubes()`
- Returns `{ success: boolean; created: TubeResponse[]; failed: Array<{ index, request, error }> }`
- Updated TubeController to return HTTP 207 Multi-Status for partial success
- Updated client-side TubeService.pasteTubes() to handle new response format
- Updated usePasteTubesMutation hook with new PasteTubesResult type

**Files Modified:**
- `server/src/application/services/TubeApplicationService.ts` - Fixed createTubes() to handle partial failures
- `server/src/presentation/controllers/TubeController.ts` - Returns 201 for full success, 207 for partial
- `client/src/domains/tubes/services/TubeService.ts` - Updated pasteTubes() response handling
- `client/src/domains/tubes/hooks/useTubeMutations.ts` - Updated PasteTubesResult type and hook

### Current State

**Location:** `server/src/application/services/TubeApplicationService.ts`

#### Investigation Findings

**Critical Bug Found: `createTubes()` (lines 168-178)**

```typescript
async createTubes(requests: CreateTubeRequest[], authenticatedUser: User): Promise<TubeResponse[]> {
  const tubes: TubeResponse[] = [];
  for (const request of requests) {
    const tube = await this.createTube(request, authenticatedUser);  // NO try/catch!
    tubes.push(tube);
  }
  return tubes;
}
```

**Problem:** Unlike `bulkUpdateTubes()`, this method does NOT use try/catch. If tube 5 of 10 fails:
- Tubes 1-4 are already saved to database
- Method throws exception
- Caller receives error with no information about partial success
- **System left in inconsistent state**

**Bulk Operations Audit (TubeApplicationService.ts):**

| Method | Line | Pattern | Issue |
|--------|------|---------|-------|
| `createTubes()` | 168-178 | Loop without try/catch | **BUG: Partial state on failure** |
| `bulkUpdateTubes()` | 486-526 | Loop with try/catch | Intentional partial success |
| `bulkDeleteTubes()` | 531-562 | Loop with try/catch | Intentional partial success |
| `lockTubes()` | 568-639 | Loop with skip pattern | Intentional partial success |
| `unlockTubes()` | 645-694 | Loop with skip pattern | Intentional partial success |
| `shareTubeAccess()` | 700-746 | Loop with skip pattern | Intentional partial success |
| `revokeTubeAccess()` | 752-798 | Loop with skip pattern | Intentional partial success |

**Repository Transaction Audit (TubeRepository.ts):**

| Method | Line | Transaction? | Notes |
|--------|------|--------------|-------|
| `save()` | 42-82 | No | Single UPSERT - atomic at SQL level ✓ |
| `delete()` | 84-87 | No | Single DELETE - atomic at SQL level ✓ |
| `saveMany()` | 873-917 | Yes ✓ | Transaction wraps loop of inserts |
| `deleteMany()` | 919-928 | No | Single DELETE IN - atomic at SQL level ✓ |

**Conclusion:** The repository layer is correctly using transactions where needed. The issue is in the application service layer where `createTubes()` doesn't handle partial failures.

### Original Issue Description

Bulk operations iterate without transaction wrapping:

```typescript
async bulkUpdateTubes(request): Promise<BulkResult> {
  for (const item of request.updates) {
    try {
      await this.updateTube(item.id, item.updates, user);
      succeeded.push(item.id);
    } catch (error) {
      failed.push({ id: item.id, error: error.message });
    }
  }
  return { succeeded, failed };
}
```

**Note:** The partial success pattern in `bulkUpdateTubes()` is actually intentional design - it returns `{ succeeded, failed }`. The real bug is `createTubes()` which doesn't follow this pattern.

### Implementation Plan

#### Phase 0: Fix `createTubes()` Partial Failure Bug (Quick Fix)

**0.1 Update `createTubes()` to Return Partial Results**

```typescript
// TubeApplicationService.ts - lines 168-178
// Option A: Match bulkUpdateTubes() pattern (partial success)
async createTubes(
  requests: CreateTubeRequest[],
  authenticatedUser: User
): Promise<{
  success: boolean;
  created: TubeResponse[];
  failed: Array<{ index: number; error: string }>;
}> {
  const created: TubeResponse[] = [];
  const failed: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < requests.length; i++) {
    try {
      const tube = await this.createTube(requests[i], authenticatedUser);
      created.push(tube);
    } catch (error) {
      failed.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return {
    success: failed.length === 0,
    created,
    failed
  };
}
```

**Breaking Change Note:** This changes the return type. Callers need to be updated to use `result.created` instead of directly using the array.

**Alternative: Option B (All-or-Nothing with Transaction)**

```typescript
// If all-or-nothing semantics are preferred:
async createTubes(
  requests: CreateTubeRequest[],
  authenticatedUser: User
): Promise<TubeResponse[]> {
  // Validate all tubes first (before any saves)
  for (const request of requests) {
    const tubeData = TubeDto.fromCreateRequest(request);
    const positionResult = await this.tubePositionService.validatePosition(
      tubeData.location.tankId,
      tubeData.location.rackId,
      tubeData.location.boxId,
      tubeData.location.position,
      this.tubeRepository
    );
    if (!positionResult.isValid) {
      throw new ValidationError(`Position conflict: ${positionResult.reason}`);
    }
  }

  // Then create all atomically using saveMany()
  const tubes = requests.map(request => {
    const tubeData = TubeDto.fromCreateRequest(request);
    return Tube.create(tubeData);
  });

  await this.tubeRepository.saveMany(tubes);

  // Publish events
  for (const tube of tubes) {
    await this.eventBus.publish(new TubeCreatedEvent(
      tube.id,
      tube.location,
      tube.sampleData,
      authenticatedUser.id
    ));
  }

  return TubeDto.toResponseList(tubes);
}
```

#### Phase 1: Add All-or-Nothing Transaction Mode

**1.1 Add Mode Parameter to Bulk Operations**

```typescript
interface BulkUpdateRequest {
  updates: Array<{ id: string; updates: TubeUpdateDTO }>;
  mode: 'all-or-nothing' | 'best-effort';  // NEW
}
```

**1.2 Implement Transactional Bulk Update**

```typescript
async bulkUpdateTubes(request: BulkUpdateRequest, user: AuthenticatedUser): Promise<BulkResult> {
  if (request.mode === 'all-or-nothing') {
    return this.bulkUpdateAtomic(request.updates, user);
  }
  return this.bulkUpdateBestEffort(request.updates, user);
}

private async bulkUpdateAtomic(
  updates: TubeUpdate[],
  user: AuthenticatedUser
): Promise<BulkResult> {
  return await this.context.transaction(async (client) => {
    const results: TubeDTO[] = [];

    for (const { id, updates: tubeUpdates } of updates) {
      const tube = await this.tubeRepository.findByIdWithClient(id, client);
      if (!tube) {
        throw new ValidationError(`Tube ${id} not found. No changes were made.`);
      }

      // All validation happens within transaction
      await this.validateTubeUpdate(tube, tubeUpdates, user, client);

      const updatedTube = tube.update(tubeUpdates);
      await this.tubeRepository.saveWithClient(updatedTube, client);
      results.push(TubeMapper.toDTO(updatedTube));
    }

    return { succeeded: results.map(t => t.id), failed: [] };
  });
}
```

#### Phase 2: Return Detailed Failure Information

**2.1 Enhanced Error Response**

```typescript
interface BulkResult {
  succeeded: string[];
  failed: Array<{
    id: string;
    error: string;
    errorCode: string;
  }>;
  mode: 'all-or-nothing' | 'best-effort';
  rollbackPerformed: boolean;
}
```

### Testing Checklist
- [x] Implementation: createTubes() uses partial success pattern
- [x] Implementation: TubeController returns HTTP 207 for partial success
- [x] Implementation: Client handles new response format
- [x] Build verification: Server and client build without errors
- [ ] Unit test: Best-effort mode continues after failure
- [ ] Integration test: Bulk create with some failures returns partial success
- [ ] E2E test: UI correctly shows partial vs complete failure

---

## Issue 6: Socket Event Errors Silently Ignored

### Current State

**Complete Audit Results:**
- **Total eventBus.publish() calls:** 51
- **With await (correct):** 32
- **Without await (need fixing):** 19

```typescript
// Example: UserApplicationService.ts
this.eventBus.publish(new UserApprovedEvent(...));  // Fire-and-forget (no await)
```

**Consequence:** Event handler failures are swallowed. Clients may not receive real-time updates. Audit logs may be incomplete.

### Complete Audit: Missing Awaits (19 instances)

#### UserApplicationService.ts (3 instances)
| Line | Event | Status |
|------|-------|--------|
| 578 | `UserApprovedEvent` | Missing await |
| 683 | `UserLinkedToResearcherEvent` | Missing await |
| 735 | `UserUnlinkedFromResearcherEvent` | Missing await |

#### TubeApplicationService.ts (2 instances)
| Line | Event | Status |
|------|-------|--------|
| 153 | `TubeCreatedEvent` | Missing await |
| 475 | `TubeDeletedEvent` | Missing await |

#### ResearcherApplicationService.ts (6 instances)
| Line | Event | Status |
|------|-------|--------|
| 183 | `ResearcherCreatedEvent` | Missing await |
| 220 | `ResearcherCreatedEvent` | Missing await |
| 246 | `ResearcherCreatedEvent` | Missing await |
| 324 | `ResearcherUpdatedEvent` | Missing await |
| 392 | `ResearcherDeletedEvent` | Missing await |
| 425 | `ResearcherDeactivatedEvent` | Missing await |
| 458 | `ResearcherReactivatedEvent` | Missing await |

#### ConfigurationCommands.ts (2 instances)
| Line | Event | Status |
|------|-------|--------|
| 688 | `RackLabelUpdatedEvent` | Missing await |
| 698 | `BoxLabelUpdatedEvent` | Missing await |

#### PasswordResetCommands.ts (3 instances)
| Line | Event | Status |
|------|-------|--------|
| 62 | `PasswordResetByAdminEvent` | Missing await |
| 119 | `PasswordResetTokenGeneratedEvent` | Missing await |
| 173 | `PasswordResetCompletedEvent` | Missing await |

#### UserCommands.ts (1 instance)
| Line | Event | Status |
|------|-------|--------|
| 333 | `UserLoggedInEvent` | Missing await |

#### AuthController.ts (1 instance)
| Line | Event | Status |
|------|-------|--------|
| 387 | `UserLoggedOutEvent` | Missing await |

### Files With Correct Awaits (for reference)

The following files already have proper `await` on all publish() calls:
- `TankCommands.ts` (3 calls) ✓
- `RackCommands.ts` (6 calls) ✓
- `BoxCommands.ts` (6 calls) ✓
- `BulkAssignmentCommands.ts` (2 calls) ✓
- `UserCommands.ts` (4 of 5 calls) ✓
- `EmailVerificationCommands.ts` (3 calls) ✓
- `InitializeConfigurationCommand.ts` (1 call) ✓
- `TubeApplicationService.ts` (6 of 8 calls) ✓

### Implementation Plan

#### Phase 1: Add Await to All Publish Calls

**1.1 Fix All 19 Missing Awaits**

Each file requires a simple change:
```typescript
// Before
this.eventBus.publish(new UserApprovedEvent(userId, user.email, approvedBy));

// After
await this.eventBus.publish(new UserApprovedEvent(userId, user.email, approvedBy));
```

**Files to modify:**
1. `UserApplicationService.ts` - 3 fixes (lines 578, 683, 735)
2. `TubeApplicationService.ts` - 2 fixes (lines 153, 475)
3. `ResearcherApplicationService.ts` - 7 fixes (lines 183, 220, 246, 324, 392, 425, 458)
4. `ConfigurationCommands.ts` - 2 fixes (lines 688, 698)
5. `PasswordResetCommands.ts` - 3 fixes (lines 62, 119, 173)
6. `UserCommands.ts` - 1 fix (line 333)
7. `AuthController.ts` - 1 fix (line 387)

#### Phase 2: Add Try-Catch for Event Publishing

**2.1 Wrap Event Publishing in Error Handling**

```typescript
// Create helper method in base service
protected async publishEvent(event: DomainEvent): Promise<void> {
  try {
    await this.eventBus.publish(event);
  } catch (error) {
    logger.error('Failed to publish event', {
      eventType: event.constructor.name,
      eventData: event,
      error: error.message
    });
    // Don't rethrow - domain operation succeeded, event delivery failed
    // Consider: Add to retry queue for critical events
  }
}

// Usage
await this.publishEvent(new UserApprovedEvent(userId, email, approvedBy));
```

#### Phase 3: Add Event Publishing Observability

**3.1 Add Metrics to EventBus**

```typescript
// InMemoryEventBus.ts
async publish(event: DomainEvent): Promise<void> {
  const startTime = Date.now();
  const eventType = event.constructor.name;

  try {
    await this.processEvent(event);
    metrics.eventPublished(eventType, Date.now() - startTime, 'success');
  } catch (error) {
    metrics.eventPublished(eventType, Date.now() - startTime, 'failure');
    throw error;
  }
}
```

### Testing Checklist
- [x] Audit: All publish() calls identified (51 total, 19 missing await)
- [x] Verify: All 19 fixes applied across 7 files (completed 2026-01-12)
- [x] Grep verification: All 51 `eventBus.publish()` calls now have `await`
- [x] Build verification: Server builds successfully with no type errors
- [ ] Unit test: Failed handler doesn't crash publish()
- [ ] Unit test: Error is logged with event details
- [ ] Integration test: Event delivery failure doesn't fail API request
- [ ] Smoke test: Create tube, researcher, user - all emit socket events

### Implementation Status: COMPLETE

**Files Modified:**
1. `UserApplicationService.ts` - 3 awaits added (lines 578, 683, 735)
2. `TubeApplicationService.ts` - 2 awaits added (lines 153, 475)
3. `ResearcherApplicationService.ts` - 7 awaits added (lines 183, 220, 246, 324, 392, 425, 458)
4. `ConfigurationCommands.ts` - 2 awaits added (lines 688, 698)
5. `PasswordResetCommands.ts` - 3 awaits added (lines 62, 119, 173)
6. `UserCommands.ts` - 1 await added (line 333)
7. `AuthController.ts` - 1 await added (line 387)

---

## Issue 7: Cache Invalidation Thundering Herd

### Current State

**Location:** `client/src/infrastructure/socket/queryBridge.ts`

Some events trigger aggressive cache invalidation:

```typescript
// tubes_locked, tubes_unlocked, tube_access_shared, tube_access_revoked
queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
```

**Consequence:** All tube queries refetch simultaneously, causing server load spike.

### Implementation Plan

#### Phase 1: Granular Cache Invalidation

**1.1 Update Lock Event Handlers**

```typescript
// Current (aggressive)
socket.on('tubes_locked', () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
});

// Improved (granular)
socket.on('tubes_locked', (data: { tubeIds: string[] }) => {
  for (const tubeId of data.tubeIds) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.tubes.detail(tubeId)
    });
  }
  // Only invalidate stats, not all lists
  queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
});
```

**1.2 Update Server Events to Include IDs**

```typescript
// TubesLockedEvent should include affected IDs
export class TubesLockedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tubeIds: string[],  // Include affected IDs
    public readonly lockNote?: string
  ) {
    super();
  }
}
```

#### Phase 2: Add Debouncing for Rapid Events

**2.1 Client-Side Debounce**

```typescript
// queryBridge.ts
const debouncedInvalidateAll = debounce(() => {
  queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
}, 500, { leading: true, trailing: true });

socket.on('bulk_tubes_updated', () => {
  debouncedInvalidateAll();
});
```

### Testing Checklist
- [ ] Performance test: Lock 10 tubes, only 10 detail queries refetch
- [ ] Performance test: Rapid events within 500ms coalesced

---

## Issue 8: Equipment Hierarchy Cascade Issues

### Current State

The application stores equipment hierarchy in a denormalized JSON structure. When equipment is deleted or modified, there's no automatic cascade to related data.

### Already Addressed

This issue is largely resolved by Issue 4 (TOCTOU) fixes. The atomic transaction approach prevents cascades from creating orphans.

### Additional Safeguard: Startup Integrity Check

```typescript
// server/src/infrastructure/startup/IntegrityChecker.ts
export class IntegrityChecker {
  async checkOrphanedTubes(): Promise<OrphanReport> {
    const orphans = await this.context.query(`
      SELECT t.id, t.tank_id, t.rack_id, t.box_id
      FROM tubes t
      WHERE NOT EXISTS (
        SELECT 1 FROM configuration_current c
        WHERE c.config_json::jsonb @> jsonb_build_object(
          'tanks', jsonb_build_array(
            jsonb_build_object('id', t.tank_id)
          )
        )
      )
    `);

    if (orphans.rows.length > 0) {
      logger.warn('Orphaned tubes detected', { count: orphans.rows.length });
      return { hasOrphans: true, orphanedTubeIds: orphans.rows.map(r => r.id) };
    }

    return { hasOrphans: false, orphanedTubeIds: [] };
  }
}
```

---

## Implementation Priority

| Issue | Severity | Effort | Priority | Status |
|-------|----------|--------|----------|--------|
| 1. Configuration Optimistic Locking | CRITICAL | Medium | P1 | **COMPLETE** |
| 4. Equipment Deletion TOCTOU | CRITICAL | Medium | P1 | **COMPLETE** |
| 6. Socket Event Missing Awaits | CRITICAL | Low | P1 | **COMPLETE** |
| 5. Bulk Operation Transactions | HIGH | Medium | P2 | **COMPLETE** |
| 3. Tube Version Field | HIGH | Medium | P2 | **COMPLETE** |
| 2. Position Collision Races | HIGH | Medium | P2 | Pending |
| 7. Cache Invalidation | MEDIUM | Low | P3 | Pending |
| 8. Cascade Integrity | MEDIUM | Low | P3 | Pending |

**Recommended Implementation Order:**
1. ~~Issue 6 (quick win, low effort)~~ **COMPLETE** (2026-01-12)
2. ~~Issue 1 (foundational for all configuration operations)~~ **COMPLETE** (2026-01-12)
3. ~~Issue 4 (prevents data corruption in equipment deletion)~~ **COMPLETE** (2026-01-12)
4. ~~Issue 5 (fix `createTubes()` bug - partial success pattern)~~ **COMPLETE** (2026-01-12)
5. ~~Issue 3 (tube versioning)~~ **COMPLETE** (2026-01-12)
6. Issue 2 (position locking, builds on Issue 3)
7. Issues 7-8 (optimization and safeguards)

---

## Summary

This plan addresses 8 critical-to-medium severity concurrency and architecture issues. The fixes follow Clean Architecture principles, use existing infrastructure (PostgreSQL transactions, EventBus), and maintain backward compatibility where possible.

**Key Patterns Applied:**
- Optimistic locking with version fields
- Pessimistic locking with SELECT FOR UPDATE
- Atomic transactions for multi-step operations
- Proper async/await for event publishing
- Granular cache invalidation

**Estimated Total Effort:** 3-4 implementation phases

**Risk Mitigation:** Each fix can be implemented and tested independently, allowing incremental rollout with verification at each step.
