# Comprehensive Plan: Centralize Constants & Eliminate Drift

## Architecture Alignment

**Single Source of Truth:** `@odysseus/shared-schemas` package
- All constants, defaults, and validation rules live here
- Both frontend and backend import from this package
- Type-safe across entire stack
- Version-controlled together to prevent drift

## Phase 1: Create Constants Structure in Shared Schemas

### 1.1 Create `@odysseus/shared-schemas/src/constants/` directory structure:

```
shared-schemas/src/constants/
├── index.ts                    // Barrel export
├── equipmentDefaults.ts        // Equipment configuration defaults
├── validationLimits.ts         // Validation constraints
├── systemDefaults.ts           // System-wide defaults
├── namingPatterns.ts           // Naming conventions and templates
└── gridTemplates.ts            // Grid configuration templates
```

### 1.2 File Contents (following naming conventions):

**equipmentDefaults.ts:**
```typescript
export const EQUIPMENT_DEFAULTS = {
  BOXES_PER_RACK: 10,           // Default boxes when creating new rack (A-J)
  GRID_ROWS: 9,                  // Default grid dimensions
  GRID_COLS: 9,
  POSITIONS_PER_BOX: 81,         // Default 9x9 grid
} as const;
```

**validationLimits.ts:**
```typescript
export const VALIDATION_LIMITS = {
  TANK: {
    ID_MAX_LENGTH: 50,
    NAME_MAX_LENGTH: 100,
    MIN_RACKS: 1,
    MAX_RACKS: 100,
  },
  RACK: {
    MIN_BOXES: 1,
    MAX_BOXES: 26,              // Limited by A-Z alphabet
  },
  BOX: {
    MIN_POSITIONS: 1,
    MAX_POSITIONS: 1000,
    MIN_GRID_DIMENSION: 1,
  },
} as const;
```

**systemDefaults.ts:**
```typescript
export const SYSTEM_DEFAULTS = {
  LAB: {
    NAME: 'Standard Laboratory',
    ORGANIZATION: 'Default Organization',
  },
  SETTINGS: {
    TIMEZONE: 'America/Los_Angeles',  // Pacific Time (San Francisco)
    THEME: 'light' as const,
    LANGUAGE: 'en',
    AUTO_BACKUP: true,
    REQUIRE_AUTH: true,
    ENABLE_REAL_TIME_SYNC: true,
    AUDIT_TRAIL_ENABLED: false,
  },
  CONFIGURATION: {
    VERSION: '2.0.0',
  },
} as const;
```

**namingPatterns.ts:**
```typescript
export const NAMING_PATTERNS = {
  TANK: {
    PREFIX: 'tank-',                                    // Programmatic ID prefix
    DEFAULT_NAME: (n: number) => `Tank ${n}`,          // Display name generator
    ID_PATTERN: (n: number) => `tank-${n}`,            // Full ID generator (tank-1, tank-2, etc.)
    DEFAULT_LOCATION: 'Main Laboratory',               // Default physical location for tanks
  },
  RACK: {
    DEFAULT_NAME: (n: number) => `Rack ${n}`,          // Display name generator
    // Note: Racks don't need location - it's implied by parent tank (nested relationship)
  },
  BOX: {
    LETTER_NAME: (index: number) => String.fromCharCode(65 + index),  // Generates A-Z box names
  },
} as const;
```

**gridTemplates.ts:**
```typescript
import { GridConfiguration } from '../types';

/**
 * Grid Templates - Square storage boxes only (5x5 to 10x10)
 * Storage boxes are typically square and range from 5x5 to 10x10
 */
export const GRID_TEMPLATES: readonly GridConfiguration[] = [
  { rows: 5, cols: 5, template: 'extra-small' },   // 25 positions
  { rows: 6, cols: 6, template: 'small' },         // 36 positions
  { rows: 7, cols: 7, template: 'compact' },       // 49 positions
  { rows: 8, cols: 8, template: 'medium' },        // 64 positions
  { rows: 9, cols: 9, template: 'standard' },      // 81 positions (default)
  { rows: 10, cols: 10, template: 'large' },       // 100 positions
] as const;

export const DEFAULT_GRID_CONFIG: GridConfiguration = {
  rows: 9,
  cols: 9,
  template: 'standard',
};
```

**index.ts (barrel export):**
```typescript
export * from './equipmentDefaults';
export * from './validationLimits';
export * from './systemDefaults';
export * from './namingPatterns';
export * from './gridTemplates';
```

### 1.3 Update `@odysseus/shared-schemas/src/index.ts`:
```typescript
export * from './types';
export * from './constants'; // Add this line
```

## Phase 2: Update Backend to Use Shared Constants

### 2.1 Files to Update:

**server/src/domain/valueObjects/Equipment.ts:**
- Replace all hardcoded numbers with `VALIDATION_LIMITS.*`
- Replace default values with `EQUIPMENT_DEFAULTS.*`
- Import from `@odysseus/shared-schemas`

**server/src/domain/entities/Configuration.ts:**
- Use `EQUIPMENT_DEFAULTS.*` for `addRack()` defaults
- Use `NAMING_PATTERNS.*` for default names
- Use `SYSTEM_DEFAULTS.*` in `createDefault()`
- Use `GRID_TEMPLATES` and `DEFAULT_GRID_CONFIG`

**server/src/application/commands/ConfigurationCommands.ts:**
- Move `CONFIRMATION_TOKEN` to shared constants
- Use shared defaults

**server/src/infrastructure/repositories/SQLiteConfigurationRepository.ts:**
- Use shared constants where applicable

## Phase 3: Update Frontend to Use Shared Constants

### 3.1 Files to Update:

**client/src/domains/laboratory/stores/configurationStore.ts:**
- Replace `DEFAULT_GRID_CONFIG` with import from shared-schemas
- Replace all hardcoded `9`, `10` with `EQUIPMENT_DEFAULTS.*`
- Use `NAMING_PATTERNS.*` for default names
- Use `SYSTEM_DEFAULTS.*` for system settings

**client/src/domains/laboratory/utils/gridHelpers.ts:**
- Remove `GRID_TEMPLATES` (use from shared-schemas)
- Remove `DEFAULT_GRID_CONFIG` (use from shared-schemas)
- Keep helper functions (`getGridTotalPositions`, `getGridDisplayName`)

**client/src/domains/tubes/ui/components/modals/LabSetupModal.tsx:**
- Replace all magic numbers with `EQUIPMENT_DEFAULTS.*`
- Use `NAMING_PATTERNS.*` for generating names

## Phase 4: Testing & Validation

### 4.1 Verification Checklist:
- [ ] Build shared-schemas package successfully
- [ ] Backend build succeeds with no errors
- [ ] Frontend build succeeds with no errors
- [ ] No TypeScript errors
- [ ] Test creating new rack → shows A-J boxes
- [ ] Test creating new tank → shows A-J boxes
- [ ] Test backend validation accepts 10 boxes with capacity 10
- [ ] Verify grid templates work in UI
- [ ] Check that all imports resolve correctly

### 4.2 Search for Remaining Hardcoded Values:
- Grep for `length: 9` or `length: 10`
- Grep for `capacity: 9` or `capacity: 10`
- Grep for `'Main Laboratory'`
- Grep for `'Standard Laboratory'`
- Grep for `String.fromCharCode(65`
- Grep for magic number patterns

## Phase 5: Documentation

### 5.1 Add JSDoc Comments:
- Document each constant with business reasoning
- Add examples of usage
- Note dependencies between constants

### 5.2 Update README (if exists):
- Document constants architecture
- Explain why shared-schemas is source of truth
- Add examples for developers

## Implementation Order:

1. **Step 1:** Create all files in `shared-schemas/src/constants/`
2. **Step 2:** Update `shared-schemas` barrel exports
3. **Step 3:** Build shared-schemas package
4. **Step 4:** Update backend files (Equipment.ts → Configuration.ts → ConfigurationCommands.ts)
5. **Step 5:** Test backend builds
6. **Step 6:** Update frontend files (gridHelpers.ts → configurationStore.ts → LabSetupModal.tsx)
7. **Step 7:** Test frontend builds
8. **Step 8:** Run full integration test
9. **Step 9:** Search and eliminate any remaining hardcoded values

## Benefits of This Approach:

✅ **No Drift:** Frontend and backend use exact same values
✅ **DRY:** Change once, affects everywhere
✅ **Type-Safe:** TypeScript enforces correctness
✅ **Maintainable:** Clear what each constant means
✅ **Scalable:** Easy to add new constants
✅ **Testable:** Import constants in tests
✅ **Self-Documenting:** Constants are named clearly
✅ **Architecture-Compliant:** Follows monorepo shared-schemas pattern

## Current Status:

- [x] Phase 1: Create Constants Structure ✅
- [x] Phase 2: Update Backend ✅
- [ ] Phase 3: Update Frontend
- [ ] Phase 4: Testing & Validation
- [ ] Phase 5: Documentation

## Notes:

- This refactor eliminates the current issue where `capacity: 9` but `boxes.length: 10` causes 400 errors
- All hardcoded magic numbers will be replaced with semantic constants
- Future changes only require updating shared-schemas constants

### ID Pattern Design Decisions:

**Tanks have ID patterns (`tank-1`, `tank-2`, etc.):**
- Tanks are **globally unique** across the entire system
- Programmatic identifiers with prefix + sequential number
- Used in code to uniquely identify tanks everywhere

**Racks use simple sequential IDs (`"1"`, `"2"`, `"3"`):**
- Racks are **scoped within their parent tank** (Tank 1's Rack 1 ≠ Tank 2's Rack 1)
- Full identifier is the combination: `tankId + rackId`
- Simpler pattern, just increment within tank context

**Boxes use single letters (`"A"`, `"B"`, `"C"`):**
- Boxes are **scoped within their parent rack**
- The letter IS the identifier (no prefix needed)
- Generated using ASCII: `String.fromCharCode(65 + index)` where 65 = 'A'

### User Preferences Applied:

1. ✅ **Tank-only location**: Only tanks have `DEFAULT_LOCATION` - racks inherit location from parent tank (nested relationship)
2. ✅ **Timezone**: `'America/Los_Angeles'` (Pacific Time - San Francisco)
3. ✅ **Square boxes only**: Grid templates range from 5x5 to 10x10 (removed rectangular 12x8)
