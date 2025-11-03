# Flexible Position Display Format - Implementation Plan

**Date:** 2025-01-31
**Last Updated:** 2025-10-31
**Status:** Phase 6.5 Complete - User Settings Foundation (Phase 6.6) In Progress
**Architecture:** Clean Architecture + Domain-Driven Design
**Scope:** Add support for both numeric (1-81) and alphanumeric (A1-H12) position display formats with multi-tier hierarchy

---

## Executive Summary

This plan implements flexible position display formats to support real-world laboratory freezer boxes. While some boxes use numeric labels (1-81), most commercial freezer boxes use alphanumeric row/column labels (A1, B5, H12). This enhancement maintains backward compatibility while providing flexible configuration at multiple levels.

**Key Design Principles:**
- Database remains numeric (integers 1-N) for data integrity
- Display format is a presentation concern only
- Multi-tier configuration hierarchy for maximum flexibility
- Support both numeric and alphanumeric formats
- Search/filter works with both input formats
- Import/export handles both formats

**Implementation Approach:**
- **Fresh database start** - No migration needed (current database is dummy data only)
- Delete existing database and recreate with updated schema
- Simpler, faster implementation
- Zero risk of migration errors

---

## Current Implementation Status

### ✅ Phase 6.5: Lab-Wide Defaults (COMPLETED - 2025-10-31)

**Objective:** Add lab-wide default position display configuration to avoid per-box repetition.

**Completed Work:**

**Backend:**
- ✅ Added `defaultPositionDisplay` field to `LabConfiguration.settings` schema
- ✅ Updated `Configuration` entity with `updateLabDefaultPositionDisplay()` method
- ✅ Created `UpdateLabDefaultPositionDisplayCommandHandler`
- ✅ Added API endpoint: `PUT /api/configuration/lab-position-display`
- ✅ Added API endpoint: `GET /api/configuration/position-display-presets`
- ✅ Wired through dependency injection (ServiceContainer)

**Frontend:**
- ✅ Added `updateLabDefaultPositionDisplay()` to StorageService
- ✅ Created `useUpdateLabDefaultPositionDisplayMutation()` hook
- ✅ Updated `positionDisplayUtils.ts` with three-tier fallback hierarchy
- ✅ Enhanced `PositionDisplaySelector` component with hierarchy indicators

**Hierarchy Implemented (3 Tiers):**
```
Box Override → Lab Default → System Default (Alphanumeric)
```

**Files Modified:**
- `packages/shared-schemas/src/storage/configurationSchemas.ts`
- `server/src/domain/entities/Configuration.ts`
- `server/src/application/commands/ConfigurationCommands.ts`
- `server/src/presentation/controllers/ConfigurationController.ts`
- `server/src/presentation/routes/ConfigurationRouteModule.ts`
- `server/src/infrastructure/di/ServiceContainer.ts`
- `client/src/domains/storage/services/StorageService.ts`
- `client/src/domains/storage/hooks/useBoxPositionDisplay.ts`
- `client/src/domains/storage/utils/positionDisplayUtils.ts`
- `client/src/domains/storage/ui/components/PositionDisplaySelector.tsx`

**Testing:**
- ✅ Server TypeScript compilation: PASS
- ✅ Client TypeScript compilation: PASS
- ✅ Dev server running: PASS

---

## Next Phase: User Settings Foundation

### 🔄 Phase 6.6: User Settings Infrastructure (IN PROGRESS)

**Objective:** Create user settings system with position display preference as the first setting.

**New Hierarchy (4 Tiers):**
```
User Preference → Box Override → Lab Default → System Default
```

**Rationale:**
- Users can set their preferred display format (applies to all boxes they view)
- Individual boxes can still override for specific physical labeling
- Lab can set organization-wide defaults
- System provides final fallback
- Infrastructure supports future user customization (profile, theme, notifications, etc.)

---

## Architecture Overview

### Storage vs Display Separation

**Database Layer (Storage - UNCHANGED):**
```sql
position INTEGER NOT NULL  -- Always 1-based integers (1, 2, 3, ..., 81)
```

**Domain Layer (Business Logic):**
```typescript
// Internal representation remains numeric
position: number  // 1-81 for 9x9 grid

// New conversion utilities
positionToLabel(position: number, config: PositionDisplayConfig): string
labelToPosition(label: string, config: PositionDisplayConfig): number
```

**Presentation Layer (Display):**
```typescript
// UI shows formatted labels based on configuration hierarchy
"23" → "23" (numeric mode)
"23" → "C5" (alphanumeric mode, 9x9 grid)
```

**Configuration Hierarchy:**
```typescript
// Highest priority
1. User preference (settings.defaultPositionDisplay)
2. Box override (box.positionDisplay)
3. Lab default (lab.settings.defaultPositionDisplay)
4. System default (ALPHANUMERIC_STANDARD)
// Lowest priority
```

---

## Phase 1: Schema & Type Definitions (Shared Package)

### 1.1 Position Display Configuration Schema

**File:** `packages/shared-schemas/src/laboratory/positionSchemas.ts` (NEW)

```typescript
import { z } from 'zod';

// Position display format types
export const positionDisplayFormatSchema = z.enum(['numeric', 'alphanumeric']);

export type PositionDisplayFormat = z.infer<typeof positionDisplayFormatSchema>;

// Alphanumeric labeling configuration
export const alphanumericConfigSchema = z.object({
  rowLabels: z.array(z.string()).min(1), // ['A', 'B', 'C', ...] or ['1', '2', '3', ...]
  colLabels: z.array(z.string()).min(1), // ['1', '2', '3', ...] or ['A', 'B', 'C', ...]
  format: z.enum(['row-col', 'col-row']).default('row-col'), // "A5" vs "5A"
});

export type AlphanumericConfig = z.infer<typeof alphanumericConfigSchema>;

// Complete position display configuration
export const positionDisplayConfigSchema = z.object({
  format: positionDisplayFormatSchema,
  alphanumericConfig: alphanumericConfigSchema.optional(),
});

export type PositionDisplayConfig = z.infer<typeof positionDisplayConfigSchema>;

// Presets for common lab box types
export const POSITION_DISPLAY_PRESETS = {
  NUMERIC: {
    format: 'numeric' as const,
  },
  ALPHANUMERIC_STANDARD: {
    format: 'alphanumeric' as const,
    alphanumericConfig: {
      rowLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
      colLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      format: 'row-col' as const, // A1, A2, B1, B2...
    },
  },
  ALPHANUMERIC_REVERSE: {
    format: 'alphanumeric' as const,
    alphanumericConfig: {
      rowLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      colLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
      format: 'col-row' as const, // 1A, 2A, 1B, 2B...
    },
  },
} as const;
```

### 1.2 Update Box Configuration Schema

**File:** `packages/shared-schemas/src/laboratory/configurationSchemas.ts` (EDIT)

```typescript
import { positionDisplayConfigSchema, POSITION_DISPLAY_PRESETS } from './positionSchemas';

export const boxConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  gridConfig: gridConfigurationSchema,
  positionDisplay: positionDisplayConfigSchema.default(POSITION_DISPLAY_PRESETS.ALPHANUMERIC_STANDARD),
  // ... existing fields
});

export type BoxConfiguration = z.infer<typeof boxConfigurationSchema>;
```

### 1.3 Position Conversion Utilities

**File:** `packages/shared-schemas/src/laboratory/positionFormatters.ts` (NEW)

```typescript
import type { PositionDisplayConfig, AlphanumericConfig } from './positionSchemas';
import { ValidationError } from '../errors';

/**
 * Convert numeric position to display label
 *
 * @param position - 1-based position number (1-81 for 9x9 grid)
 * @param gridRows - Number of rows in grid
 * @param gridCols - Number of columns in grid
 * @param config - Display format configuration
 * @returns Formatted label ("23" or "C5" depending on config)
 */
export function positionToLabel(
  position: number,
  gridRows: number,
  gridCols: number,
  config: PositionDisplayConfig
): string {
  if (config.format === 'numeric') {
    return position.toString();
  }

  if (!config.alphanumericConfig) {
    throw new ValidationError('Alphanumeric config required for alphanumeric format');
  }

  const { rowLabels, colLabels, format } = config.alphanumericConfig;

  // Validate labels match grid dimensions
  if (rowLabels.length !== gridRows) {
    throw new ValidationError(`Row labels (${rowLabels.length}) must match grid rows (${gridRows})`);
  }
  if (colLabels.length !== gridCols) {
    throw new ValidationError(`Column labels (${colLabels.length}) must match grid cols (${gridCols})`);
  }

  // Convert 1-based position to 0-based row/col
  const index = position - 1;
  const row = Math.floor(index / gridCols);
  const col = index % gridCols;

  // Validate position is within grid
  if (row >= gridRows || col >= gridCols) {
    throw new ValidationError(`Position ${position} out of bounds for ${gridRows}x${gridCols} grid`);
  }

  const rowLabel = rowLabels[row];
  const colLabel = colLabels[col];

  return format === 'row-col' ? `${rowLabel}${colLabel}` : `${colLabel}${rowLabel}`;
}

/**
 * Convert display label to numeric position
 *
 * @param label - Display label ("23" or "C5")
 * @param gridRows - Number of rows in grid
 * @param gridCols - Number of columns in grid
 * @param config - Display format configuration
 * @returns 1-based position number
 * @throws ValidationError if label is invalid
 */
export function labelToPosition(
  label: string,
  gridRows: number,
  gridCols: number,
  config: PositionDisplayConfig
): number {
  // Numeric format - direct conversion
  if (config.format === 'numeric') {
    const position = parseInt(label, 10);
    if (isNaN(position) || position < 1 || position > gridRows * gridCols) {
      throw new ValidationError(`Invalid numeric position: ${label}`);
    }
    return position;
  }

  // Alphanumeric format - parse label
  if (!config.alphanumericConfig) {
    throw new ValidationError('Alphanumeric config required for alphanumeric format');
  }

  const { rowLabels, colLabels, format } = config.alphanumericConfig;

  // Parse label based on format
  let rowLabel: string;
  let colLabel: string;

  if (format === 'row-col') {
    // Format: A5 (letter first, then number)
    const match = label.match(/^([A-Za-z]+)(\d+)$/);
    if (!match) {
      throw new ValidationError(`Invalid alphanumeric label (expected format like A5): ${label}`);
    }
    rowLabel = match[1].toUpperCase();
    colLabel = match[2];
  } else {
    // Format: 5A (number first, then letter)
    const match = label.match(/^(\d+)([A-Za-z]+)$/);
    if (!match) {
      throw new ValidationError(`Invalid alphanumeric label (expected format like 5A): ${label}`);
    }
    colLabel = match[1];
    rowLabel = match[2].toUpperCase();
  }

  // Find indices
  const rowIndex = rowLabels.findIndex(l => l.toUpperCase() === rowLabel);
  const colIndex = colLabels.findIndex(l => l === colLabel);

  if (rowIndex === -1) {
    throw new ValidationError(`Invalid row label: ${rowLabel}`);
  }
  if (colIndex === -1) {
    throw new ValidationError(`Invalid column label: ${colLabel}`);
  }

  // Convert 0-based row/col to 1-based position
  return rowIndex * gridCols + colIndex + 1;
}

/**
 * Validate that a label is valid for the given configuration
 */
export function isValidPositionLabel(
  label: string,
  gridRows: number,
  gridCols: number,
  config: PositionDisplayConfig
): boolean {
  try {
    labelToPosition(label, gridRows, gridCols, config);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate all valid position labels for a grid
 */
export function generatePositionLabels(
  gridRows: number,
  gridCols: number,
  config: PositionDisplayConfig
): string[] {
  const totalPositions = gridRows * gridCols;
  const labels: string[] = [];

  for (let position = 1; position <= totalPositions; position++) {
    labels.push(positionToLabel(position, gridRows, gridCols, config));
  }

  return labels;
}
```

### 1.4 Update Tube Formatters

**File:** `packages/shared-schemas/src/tubes/tubeFormatters.ts` (EDIT)

```typescript
import { positionToLabel } from '../laboratory/positionFormatters';
import type { PositionDisplayConfig } from '../laboratory/positionSchemas';

export interface TubeLocationFormatOptions {
  includePosition?: boolean;
  positionDisplayConfig?: PositionDisplayConfig;
  gridRows?: number;
  gridCols?: number;
}

export function formatTubeLocation(
  location: { tankId: string; rackId: string; boxId: string; position: number },
  options: TubeLocationFormatOptions = {}
): string {
  const { includePosition = true, positionDisplayConfig, gridRows = 9, gridCols = 9 } = options;

  const base = `Tank ${location.tankId}, Rack ${location.rackId}, Box ${location.boxId}`;

  if (!includePosition) {
    return base;
  }

  // Use position display config if provided
  let positionLabel = location.position.toString();
  if (positionDisplayConfig) {
    try {
      positionLabel = positionToLabel(
        location.position,
        gridRows,
        gridCols,
        positionDisplayConfig
      );
    } catch {
      // Fall back to numeric if conversion fails
      positionLabel = location.position.toString();
    }
  }

  return `${base}, Position ${positionLabel}`;
}
```

### 1.5 Update Shared Package Exports

**File:** `packages/shared-schemas/src/index.ts` (EDIT)

```typescript
// Position display schemas and utilities
export {
  positionDisplayFormatSchema,
  alphanumericConfigSchema,
  positionDisplayConfigSchema,
  POSITION_DISPLAY_PRESETS,
  type PositionDisplayFormat,
  type AlphanumericConfig,
  type PositionDisplayConfig,
} from './laboratory/positionSchemas';

export {
  positionToLabel,
  labelToPosition,
  isValidPositionLabel,
  generatePositionLabels,
} from './laboratory/positionFormatters';

// Update existing exports
export type { TubeLocationFormatOptions } from './tubes/tubeFormatters';
```

### 1.6 Build Shared Package

```bash
cd packages/shared-schemas
npm run build
```

---

## Phase 2: Backend Domain Layer

### 2.1 Update Equipment Value Objects

**File:** `server/src/domain/valueObjects/Equipment.ts` (EDIT)

```typescript
import {
  type PositionDisplayConfig,
  POSITION_DISPLAY_PRESETS,
  positionToLabel,
  labelToPosition,
} from '@odysseus/shared-schemas';

export class Box {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _gridConfig: GridConfig;
  private readonly _positionDisplay: PositionDisplayConfig;

  constructor(
    id: string,
    name: string,
    gridConfig: GridConfig,
    positionDisplay?: PositionDisplayConfig
  ) {
    this._id = id;
    this._name = name;
    this._gridConfig = gridConfig;
    this._positionDisplay = positionDisplay ?? POSITION_DISPLAY_PRESETS.ALPHANUMERIC_STANDARD;
  }

  get positionDisplay(): PositionDisplayConfig {
    return this._positionDisplay;
  }

  // Convert position number to display label
  formatPosition(position: number): string {
    return positionToLabel(
      position,
      this._gridConfig.rows,
      this._gridConfig.cols,
      this._positionDisplay
    );
  }

  // Convert display label to position number
  parsePositionLabel(label: string): number {
    return labelToPosition(
      label,
      this._gridConfig.rows,
      this._gridConfig.cols,
      this._positionDisplay
    );
  }

  // Get all valid position labels for this box
  getAllPositionLabels(): string[] {
    const labels: string[] = [];
    const totalPositions = this._gridConfig.rows * this._gridConfig.cols;
    for (let pos = 1; pos <= totalPositions; pos++) {
      labels.push(this.formatPosition(pos));
    }
    return labels;
  }

  // Existing methods...
  positionToGridCoordinates(position: number): { row: number; col: number } {
    // ... existing implementation
  }

  gridCoordinatesToPosition(row: number, col: number): number {
    // ... existing implementation
  }
}
```

### 2.2 Update Domain Services

**File:** `server/src/domain/services/TubePositionService.ts` (EDIT)

```typescript
import { labelToPosition, type PositionDisplayConfig } from '@odysseus/shared-schemas';

export class TubePositionService {
  // Add method to support label-based position lookup
  async validatePositionByLabel(
    tankId: string,
    rackId: string,
    boxId: string,
    positionLabel: string,
    positionDisplayConfig: PositionDisplayConfig,
    gridRows: number,
    gridCols: number,
    excludeTubeId?: string
  ): Promise<ValidationResult> {
    // Convert label to numeric position
    const position = labelToPosition(positionLabel, gridRows, gridCols, positionDisplayConfig);

    // Use existing numeric validation
    return this.validatePosition(tankId, rackId, boxId, position, excludeTubeId);
  }

  // Existing methods remain unchanged
  async validatePosition(...): Promise<ValidationResult> {
    // ... existing implementation
  }
}
```

---

## Phase 3: Backend Infrastructure Layer

**SIMPLIFIED APPROACH:** Since the current database contains only dummy data, we can delete it and start fresh with the updated schema. This eliminates the need for migration scripts and reduces complexity.

### 3.1 Update Database Schema (Fresh Start)

**File:** `server/src/infrastructure/database/SQLiteContext.ts` (EDIT)

**Action:** Update the schema creation logic to include the new `boxPositionDisplayConfigs` column. The database will be deleted and recreated automatically.

```typescript
// Update lab_configuration table creation to include position display configs
async initializeTables(): Promise<void> {
  await this.db.exec(`
    CREATE TABLE IF NOT EXISTS lab_configuration (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tanks TEXT NOT NULL DEFAULT '[]',
      boxPositionDisplayConfigs TEXT DEFAULT '{}',  -- NEW: JSON mapping boxId -> PositionDisplayConfig
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- Other tables remain unchanged (tubes, researchers, users)
    -- Position column in tubes table stays INTEGER (no change needed)
  `);

  // Initialize default configuration if not exists
  const config = await this.db.get('SELECT * FROM lab_configuration WHERE id = 1');
  if (!config) {
    await this.db.run(
      `INSERT INTO lab_configuration (id, tanks, boxPositionDisplayConfigs, createdAt, updatedAt)
       VALUES (1, '[]', '{}', ?, ?)`,
      [new Date().toISOString(), new Date().toISOString()]
    );
  }
}
```

**JSON Structure for boxPositionDisplayConfigs:**
```json
{
  "A": {
    "format": "alphanumeric",
    "alphanumericConfig": {
      "rowLabels": ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
      "colLabels": ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      "format": "row-col"
    }
  },
  "B": {
    "format": "numeric"
  }
}
```

### 3.2 Update Configuration Repository

**File:** `server/src/infrastructure/repositories/SQLiteConfigurationRepository.ts` (EDIT)

```typescript
import {
  type LabConfiguration,
  type BoxConfiguration,
  type PositionDisplayConfig,
  POSITION_DISPLAY_PRESETS,
  positionDisplayConfigSchema,
} from '@odysseus/shared-schemas';

export class SQLiteConfigurationRepository implements ConfigurationRepository {
  async getConfiguration(): Promise<LabConfiguration> {
    const row = await this.db.get('SELECT * FROM lab_configuration WHERE id = 1');

    // Parse box position display configs from JSON
    const boxPositionDisplayConfigs = row.boxPositionDisplayConfigs
      ? JSON.parse(row.boxPositionDisplayConfigs)
      : {};

    // Parse existing box configurations
    const tanks = JSON.parse(row.tanks || '[]');

    // Enhance box configurations with position display settings
    const enhancedTanks = tanks.map((tank: any) => ({
      ...tank,
      racks: tank.racks.map((rack: any) => ({
        ...rack,
        boxes: rack.boxes.map((box: any) => ({
          ...box,
          positionDisplay:
            boxPositionDisplayConfigs[box.id] ??
            POSITION_DISPLAY_PRESETS.ALPHANUMERIC_STANDARD,
        })),
      })),
    }));

    return {
      ...row,
      tanks: enhancedTanks,
    };
  }

  async updateConfiguration(config: LabConfiguration): Promise<void> {
    // Extract position display configs from boxes
    const boxPositionDisplayConfigs: Record<string, PositionDisplayConfig> = {};

    config.tanks.forEach((tank) => {
      tank.racks.forEach((rack) => {
        rack.boxes.forEach((box) => {
          if (box.positionDisplay) {
            boxPositionDisplayConfigs[box.id] = box.positionDisplay;
          }
        });
      });
    });

    await this.db.run(
      `UPDATE lab_configuration
       SET tanks = ?,
           boxPositionDisplayConfigs = ?,
           updatedAt = ?
       WHERE id = 1`,
      [
        JSON.stringify(config.tanks),
        JSON.stringify(boxPositionDisplayConfigs),
        new Date().toISOString(),
      ]
    );
  }
}
```

---

## Phase 4: Backend Application/Presentation Layer

### 4.1 Update Configuration Endpoints

**File:** `server/src/presentation/controllers/ConfigurationController.ts` (EDIT)

```typescript
export class ConfigurationController {
  // Add endpoint to update box position display config
  async updateBoxPositionDisplay(
    req: Request<{ boxId: string }>,
    res: Response
  ): Promise<void> {
    const { boxId } = req.params;
    const positionDisplayConfig = positionDisplayConfigSchema.parse(req.body);

    const config = await this.configService.getConfiguration();

    // Find and update box
    let found = false;
    for (const tank of config.tanks) {
      for (const rack of tank.racks) {
        const box = rack.boxes.find((b) => b.id === boxId);
        if (box) {
          box.positionDisplay = positionDisplayConfig;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      res.status(404).json({ error: 'Box not found' });
      return;
    }

    await this.configService.updateConfiguration(config);

    res.json({ success: true, positionDisplay: positionDisplayConfig });
  }

  // Add endpoint to get position display presets
  async getPositionDisplayPresets(req: Request, res: Response): Promise<void> {
    res.json(POSITION_DISPLAY_PRESETS);
  }
}
```

**File:** `server/src/presentation/routes/ConfigurationRouteModule.ts` (EDIT)

```typescript
router.put(
  '/boxes/:boxId/position-display',
  authMiddleware,
  asyncHandler(controller.updateBoxPositionDisplay.bind(controller))
);

router.get(
  '/position-display/presets',
  authMiddleware,
  asyncHandler(controller.getPositionDisplayPresets.bind(controller))
);
```

### 4.2 Update Search Controller

**File:** `server/src/presentation/controllers/SearchController.ts` (EDIT)

```typescript
export class SearchController {
  async searchTubes(req: Request, res: Response): Promise<void> {
    const filters = req.body;

    // Support position label search in addition to numeric
    // Parse position labels if provided
    if (filters.positionLabel && filters.boxId) {
      const config = await this.configService.getConfiguration();
      const box = this.findBox(config, filters.boxId);

      if (box && box.positionDisplay) {
        try {
          const numericPosition = labelToPosition(
            filters.positionLabel,
            box.gridConfig.rows,
            box.gridConfig.cols,
            box.positionDisplay
          );
          filters.position = numericPosition;
        } catch (error) {
          res.status(400).json({ error: `Invalid position label: ${filters.positionLabel}` });
          return;
        }
      }
    }

    // Continue with existing search logic
    const results = await this.searchService.searchTubes(filters);
    res.json(results);
  }
}
```

---

## Phase 5: Frontend Domain Layer (Configuration)

### 5.1 Configuration Service Updates

**File:** `client/src/domains/laboratory/services/ConfigurationService.ts` (EDIT)

```typescript
import {
  type PositionDisplayConfig,
  type BoxConfiguration,
  POSITION_DISPLAY_PRESETS,
} from '@odysseus/shared-schemas';
import { httpClient } from '@infra/api/httpClient';

export const ConfigurationService = {
  // Fetch position display presets
  async getPositionDisplayPresets(): Promise<typeof POSITION_DISPLAY_PRESETS> {
    const response = await httpClient.get('/api/configuration/position-display/presets');
    return response.data;
  },

  // Update box position display config
  async updateBoxPositionDisplay(
    boxId: string,
    config: PositionDisplayConfig
  ): Promise<void> {
    await httpClient.put(`/api/configuration/boxes/${boxId}/position-display`, config);
  },

  // Existing methods...
};
```

### 5.2 Configuration Hooks

**File:** `client/src/domains/laboratory/hooks/useBoxPositionDisplay.ts` (NEW)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfigurationService } from '../services/ConfigurationService';
import { queryKeys } from '@app/queryKeys';
import type { PositionDisplayConfig } from '@odysseus/shared-schemas';
import toast from 'react-hot-toast';

export function useUpdateBoxPositionDisplay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boxId, config }: { boxId: string; config: PositionDisplayConfig }) =>
      ConfigurationService.updateBoxPositionDisplay(boxId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configuration.all });
      toast.success('Position display format updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update position display: ${error.message}`);
    },
  });
}
```

### 5.3 Configuration Store Updates

**File:** `client/src/domains/laboratory/stores/configurationStore.ts` (EDIT)

```typescript
import { type BoxConfiguration, type PositionDisplayConfig } from '@odysseus/shared-schemas';

interface ConfigurationState {
  // ... existing state

  // Get position display config for a specific box
  getBoxPositionDisplay: (tankId: string, rackId: string, boxId: string) => PositionDisplayConfig | null;
}

export const useConfigurationStore = create<ConfigurationState>((set, get) => ({
  // ... existing implementation

  getBoxPositionDisplay: (tankId, rackId, boxId) => {
    const state = get();
    const tank = state.tanks.find((t) => t.id === tankId);
    if (!tank) return null;

    const rack = tank.racks.find((r) => r.id === rackId);
    if (!rack) return null;

    const box = rack.boxes.find((b) => b.id === boxId);
    return box?.positionDisplay ?? null;
  },
}));
```

---

## Phase 6: Frontend UI Components

### 6.1 Position Display Utilities Hook

**File:** `client/src/domains/laboratory/hooks/usePositionDisplay.ts` (NEW)

```typescript
import { useMemo } from 'react';
import { useConfigurationStore } from '../stores/configurationStore';
import {
  positionToLabel,
  labelToPosition,
  generatePositionLabels,
  type PositionDisplayConfig,
} from '@odysseus/shared-schemas';

interface UsePositionDisplayOptions {
  tankId: string;
  rackId: string;
  boxId: string;
}

export function usePositionDisplay({ tankId, rackId, boxId }: UsePositionDisplayOptions) {
  const getBoxPositionDisplay = useConfigurationStore((s) => s.getBoxPositionDisplay);
  const config = getBoxPositionDisplay(tankId, rackId, boxId);

  const box = useConfigurationStore((s) => {
    const tank = s.tanks.find((t) => t.id === tankId);
    const rack = tank?.racks.find((r) => r.id === rackId);
    return rack?.boxes.find((b) => b.id === boxId);
  });

  const gridRows = box?.gridConfig.rows ?? 9;
  const gridCols = box?.gridConfig.cols ?? 9;

  return useMemo(() => {
    if (!config) {
      return {
        formatPosition: (position: number) => position.toString(),
        parsePosition: (label: string) => parseInt(label, 10),
        allLabels: [],
        config: null,
        isAlphanumeric: false,
      };
    }

    return {
      formatPosition: (position: number) =>
        positionToLabel(position, gridRows, gridCols, config),
      parsePosition: (label: string) =>
        labelToPosition(label, gridRows, gridCols, config),
      allLabels: generatePositionLabels(gridRows, gridCols, config),
      config,
      isAlphanumeric: config.format === 'alphanumeric',
    };
  }, [config, gridRows, gridCols]);
}
```

### 6.2 Update Grid Position Component

**File:** `client/src/domains/laboratory/ui/components/GridPosition.tsx` (EDIT)

```typescript
import { usePositionDisplay } from '../../hooks/usePositionDisplay';

interface GridPositionProps {
  position: number;
  tankId: string;
  rackId: string;
  boxId: string;
  // ... other props
}

export const GridPosition: React.FC<GridPositionProps> = ({
  position,
  tankId,
  rackId,
  boxId,
  // ... other props
}) => {
  const { formatPosition } = usePositionDisplay({ tankId, rackId, boxId });

  const displayLabel = formatPosition(position);

  return (
    <div className="grid-position">
      {/* Position label */}
      <div className="position-label">
        {displayLabel}
      </div>
      {/* Rest of component */}
    </div>
  );
};
```

### 6.3 Update Location Display Component

**File:** `client/src/domains/tubes/ui/components/LocationDisplay.tsx` (EDIT)

```typescript
import { usePositionDisplay } from '@domains/laboratory/hooks/usePositionDisplay';

export const LocationDisplay: React.FC<{ location: TubeLocation }> = ({ location }) => {
  const { formatPosition } = usePositionDisplay({
    tankId: location.tankId,
    rackId: location.rackId,
    boxId: location.boxId,
  });

  const positionLabel = formatPosition(location.position);

  return (
    <div className="location-display">
      <span>Tank {location.tankId}</span>
      <span>Rack {location.rackId}</span>
      <span>Box {location.boxId}</span>
      <span className="font-semibold">Position {positionLabel}</span>
    </div>
  );
};
```

### 6.4 Update Tube Info Panel

**File:** `client/src/domains/tubes/ui/components/TubeInfoPanel.tsx` (EDIT)

```typescript
import { usePositionDisplay } from '@domains/laboratory/hooks/usePositionDisplay';

export const TubeInfoPanel: React.FC<TubeInfoPanelProps> = ({ tubes }) => {
  const firstTube = tubes[0];
  const { formatPosition } = usePositionDisplay({
    tankId: firstTube.location.tankId,
    rackId: firstTube.location.rackId,
    boxId: firstTube.location.boxId,
  });

  // Format position or position ranges
  const positionDisplay = tubes.length === 1
    ? formatPosition(tubes[0].location.position)
    : formatPositionRange(tubes.map((t) => t.location.position), formatPosition);

  return (
    <div className="tube-info-panel">
      <div>Position {positionDisplay}</div>
      {/* Rest of component */}
    </div>
  );
};

// Helper function for formatting position ranges with labels
function formatPositionRange(
  positions: number[],
  formatFn: (pos: number) => string
): string {
  // Sort positions
  const sorted = [...positions].sort((a, b) => a - b);

  // Format each position
  const labels = sorted.map(formatFn);

  // Group consecutive labels if possible
  // For numeric: "1-5, 10-12, 27"
  // For alphanumeric: "A1, A2, A3, B1" (less grouping)

  // Simple approach: just join with commas
  return labels.join(', ');
}
```

### 6.5 Position Input Component

**File:** `client/src/domains/laboratory/ui/components/PositionInput.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { usePositionDisplay } from '../../hooks/usePositionDisplay';

interface PositionInputProps {
  tankId: string;
  rackId: string;
  boxId: string;
  value: number | null;
  onChange: (position: number | null) => void;
  error?: string;
}

export const PositionInput: React.FC<PositionInputProps> = ({
  tankId,
  rackId,
  boxId,
  value,
  onChange,
  error,
}) => {
  const { formatPosition, parsePosition, isAlphanumeric, allLabels } = usePositionDisplay({
    tankId,
    rackId,
    boxId,
  });

  const [inputValue, setInputValue] = useState(
    value !== null ? formatPosition(value) : ''
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim().toUpperCase();
    setInputValue(newValue);

    if (!newValue) {
      onChange(null);
      setValidationError(null);
      return;
    }

    try {
      const position = parsePosition(newValue);
      onChange(position);
      setValidationError(null);
    } catch (err: any) {
      setValidationError(err.message);
      onChange(null);
    }
  };

  const handleBlur = () => {
    // Reformat on blur if valid
    if (value !== null) {
      setInputValue(formatPosition(value));
    }
  };

  return (
    <div className="position-input-container">
      <label className="block text-sm font-medium mb-1">
        Position {isAlphanumeric && <span className="text-gray-500">(e.g., A5, B12)</span>}
      </label>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={isAlphanumeric ? 'A1' : '1'}
        className="w-full px-3 py-2 border rounded"
      />
      {validationError && (
        <p className="text-red-500 text-sm mt-1">{validationError}</p>
      )}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {/* Optional: Autocomplete dropdown */}
      {isAlphanumeric && inputValue && (
        <PositionAutocomplete
          searchTerm={inputValue}
          allLabels={allLabels}
          onSelect={(label) => {
            setInputValue(label);
            onChange(parsePosition(label));
          }}
        />
      )}
    </div>
  );
};
```

### 6.6 Position Display Configuration Modal

**File:** `client/src/domains/laboratory/ui/components/PositionDisplayConfigModal.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { POSITION_DISPLAY_PRESETS, type PositionDisplayConfig } from '@odysseus/shared-schemas';
import { useUpdateBoxPositionDisplay } from '../../hooks/useBoxPositionDisplay';

interface PositionDisplayConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  boxId: string;
  currentConfig: PositionDisplayConfig;
}

export const PositionDisplayConfigModal: React.FC<PositionDisplayConfigModalProps> = ({
  isOpen,
  onClose,
  boxId,
  currentConfig,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof POSITION_DISPLAY_PRESETS>('ALPHANUMERIC_STANDARD');
  const updateMutation = useUpdateBoxPositionDisplay();

  const handleSave = async () => {
    const config = POSITION_DISPLAY_PRESETS[selectedPreset];
    await updateMutation.mutateAsync({ boxId, config });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="text-xl font-bold mb-4">Position Display Format</h2>

        <div className="space-y-4">
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="preset"
                value="NUMERIC"
                checked={selectedPreset === 'NUMERIC'}
                onChange={(e) => setSelectedPreset(e.target.value as any)}
              />
              <div>
                <div className="font-medium">Numeric (1-81)</div>
                <div className="text-sm text-gray-500">
                  Simple numeric labels: 1, 2, 3, ..., 81
                </div>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="preset"
                value="ALPHANUMERIC_STANDARD"
                checked={selectedPreset === 'ALPHANUMERIC_STANDARD'}
                onChange={(e) => setSelectedPreset(e.target.value as any)}
              />
              <div>
                <div className="font-medium">Alphanumeric - Row/Column (A1-I9)</div>
                <div className="text-sm text-gray-500">
                  Standard freezer box format: A1, A2, B1, B2, ..., I9
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Most common for commercial freezer boxes
                </div>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="preset"
                value="ALPHANUMERIC_REVERSE"
                checked={selectedPreset === 'ALPHANUMERIC_REVERSE'}
                onChange={(e) => setSelectedPreset(e.target.value as any)}
              />
              <div>
                <div className="font-medium">Alphanumeric - Column/Row (1A-9I)</div>
                <div className="text-sm text-gray-500">
                  Reverse format: 1A, 2A, 1B, 2B, ..., 9I
                </div>
              </div>
            </label>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Preview</h3>
            <div className="text-sm">
              First 5 positions:{' '}
              {getPreviewLabels(POSITION_DISPLAY_PRESETS[selectedPreset], 5).join(', ')}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="btn-primary"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

function getPreviewLabels(config: PositionDisplayConfig, count: number): string[] {
  // Generate preview labels
  if (config.format === 'numeric') {
    return Array.from({ length: count }, (_, i) => (i + 1).toString());
  }

  const { rowLabels, colLabels, format } = config.alphanumericConfig!;
  const labels: string[] = [];

  for (let i = 0; i < count && i < rowLabels.length * colLabels.length; i++) {
    const row = Math.floor(i / colLabels.length);
    const col = i % colLabels.length;
    const label = format === 'row-col'
      ? `${rowLabels[row]}${colLabels[col]}`
      : `${colLabels[col]}${rowLabels[row]}`;
    labels.push(label);
  }

  return labels;
}
```

---

## Phase 6.6: User Settings Infrastructure

**Objective:** Create extensible user settings system with position display preference as the first setting.

**Time Estimate:** 8-10 hours

**Scope:**
- User settings database schema
- Backend API for user settings CRUD
- Frontend user settings store and hooks
- User settings modal UI with tab system
- Position display preference as first setting
- Foundation for future settings (profile, theme, notifications, etc.)

---

### 6.6.1 Shared Schemas - User Settings Types

**File:** `packages/shared-schemas/src/users/userSettingsSchemas.ts` (NEW)

```typescript
import { z } from 'zod';
import { positionDisplayConfigSchema } from '../storage/positionSchemas';

/**
 * User Settings Schema
 *
 * Extensible schema for per-user preferences and settings.
 * All fields are optional to allow incremental addition of settings.
 */
export const userSettingsSchema = z.object({
  // Display Preferences
  defaultPositionDisplay: positionDisplayConfigSchema.optional(),

  // Future settings can be added here:
  // theme: z.enum(['light', 'dark', 'auto']).optional(),
  // language: z.string().optional(),
  // emailNotifications: z.boolean().optional(),
  // gridDensity: z.enum(['compact', 'normal', 'comfortable']).optional(),
}).strict();

export type UserSettings = z.infer<typeof userSettingsSchema>;

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  // No defaults set - user preferences override everything when set
};

/**
 * Request/Response schemas for API
 */
export const updateUserSettingsRequestSchema = z.object({
  settings: userSettingsSchema,
});

export type UpdateUserSettingsRequest = z.infer<typeof updateUserSettingsRequestSchema>;

export const userSettingsResponseSchema = z.object({
  success: z.boolean(),
  settings: userSettingsSchema,
});

export type UserSettingsResponse = z.infer<typeof userSettingsResponseSchema>;
```

**File:** `packages/shared-schemas/src/users/userSchemas.ts` (EDIT)

```typescript
import { userSettingsSchema } from './userSettingsSchemas';

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: roleSchema,
  settings: userSettingsSchema.optional(), // NEW
  // ... existing fields
});

export type User = z.infer<typeof userSchema>;
```

**File:** `packages/shared-schemas/src/index.ts` (EDIT)

```typescript
// Export user settings schemas
export {
  userSettingsSchema,
  updateUserSettingsRequestSchema,
  userSettingsResponseSchema,
  DEFAULT_USER_SETTINGS,
  type UserSettings,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
} from './users/userSettingsSchemas';
```

---

### 6.6.2 Backend Domain Layer

**File:** `server/src/domain/entities/User.ts` (EDIT)

```typescript
import { type UserSettings, DEFAULT_USER_SETTINGS } from '@odysseus/shared-schemas';

export class User {
  private readonly _id: string;
  private readonly _email: string;
  private readonly _role: Role;
  private readonly _settings: UserSettings; // NEW

  constructor(
    id: string,
    email: string,
    role: Role,
    settings?: UserSettings
  ) {
    this._id = id;
    this._email = email;
    this._role = role;
    this._settings = settings ?? DEFAULT_USER_SETTINGS;
  }

  get settings(): UserSettings {
    return this._settings;
  }

  /**
   * Update user settings (immutable)
   */
  updateSettings(newSettings: UserSettings): User {
    return new User(
      this._id,
      this._email,
      this._role,
      newSettings
    );
  }

  // Existing methods...
  toData(): any {
    return {
      id: this._id,
      email: this._email,
      role: this._role.toData(),
      settings: this._settings, // NEW
      // ... existing fields
    };
  }

  static fromData(data: any): User {
    return new User(
      data.id,
      data.email,
      Role.fromData(data.role),
      data.settings ?? DEFAULT_USER_SETTINGS // NEW
    );
  }
}
```

---

### 6.6.3 Backend Infrastructure Layer

**File:** `server/src/infrastructure/database/SQLiteContext.ts` (EDIT)

```typescript
async initializeTables(): Promise<void> {
  await this.db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT,
      role TEXT NOT NULL,
      settings TEXT DEFAULT '{}', -- NEW: JSON user settings
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- Other tables...
  `);
}
```

**File:** `server/src/infrastructure/repositories/SQLiteUserRepository.ts` (EDIT)

```typescript
import { type UserSettings, DEFAULT_USER_SETTINGS } from '@odysseus/shared-schemas';

export class SQLiteUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const row = await this.db.get('SELECT * FROM users WHERE id = ?', [id]);

    if (!row) return null;

    // Parse settings from JSON
    const settings: UserSettings = row.settings
      ? JSON.parse(row.settings)
      : DEFAULT_USER_SETTINGS;

    return User.fromData({
      ...row,
      settings,
    });
  }

  async save(user: User): Promise<void> {
    const data = user.toData();

    await this.db.run(
      `INSERT OR REPLACE INTO users (id, email, passwordHash, role, settings, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.email,
        data.passwordHash,
        data.role,
        JSON.stringify(data.settings), // NEW
        data.createdAt,
        new Date().toISOString(),
      ]
    );
  }

  // Existing methods...
}
```

---

### 6.6.4 Backend Application Layer

**File:** `server/src/application/commands/UserCommands.ts` (NEW or EDIT)

```typescript
import { type UserSettings } from '@odysseus/shared-schemas';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ValidationError } from '@shared/errors/AppError';

/**
 * Update User Settings Command
 */
export interface UpdateUserSettingsCommand {
  userId: string;
  settings: UserSettings;
}

/**
 * Update User Settings Command Handler
 */
export class UpdateUserSettingsCommandHandler {
  constructor(private userRepository: UserRepository) {}

  async handle(command: UpdateUserSettingsCommand): Promise<User> {
    // Fetch current user
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new ValidationError(`User not found: ${command.userId}`);
    }

    // Update settings (immutable)
    const updatedUser = user.updateSettings(command.settings);

    // Persist
    await this.userRepository.save(updatedUser);

    return updatedUser;
  }
}

/**
 * Get User Settings Query
 */
export interface GetUserSettingsQuery {
  userId: string;
}

/**
 * Get User Settings Query Handler
 */
export class GetUserSettingsQueryHandler {
  constructor(private userRepository: UserRepository) {}

  async handle(query: GetUserSettingsQuery): Promise<UserSettings> {
    const user = await this.userRepository.findById(query.userId);

    if (!user) {
      throw new ValidationError(`User not found: ${query.userId}`);
    }

    return user.settings;
  }
}
```

---

### 6.6.5 Backend API Layer

**File:** `server/src/presentation/controllers/UserController.ts` (EDIT or NEW)

```typescript
import { Request, Response } from 'express';
import { UpdateUserSettingsCommandHandler, GetUserSettingsQueryHandler } from '@application/commands/UserCommands';
import { userSettingsSchema } from '@odysseus/shared-schemas';

export class UserController {
  constructor(
    private updateUserSettingsHandler: UpdateUserSettingsCommandHandler,
    private getUserSettingsHandler: GetUserSettingsQueryHandler
  ) {}

  /**
   * GET /api/users/me/settings
   * Get current user's settings
   */
  async getCurrentUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);

      const settings = await this.getUserSettingsHandler.handle({ userId });

      res.json({
        success: true,
        settings,
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to get user settings');
    }
  }

  /**
   * PUT /api/users/me/settings
   * Update current user's settings
   */
  async updateCurrentUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const settings = userSettingsSchema.parse(req.body.settings);

      const updatedUser = await this.updateUserSettingsHandler.handle({
        userId,
        settings,
      });

      res.json({
        success: true,
        settings: updatedUser.settings,
        message: 'User settings updated successfully',
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to update user settings');
    }
  }

  private extractUserId(req: Request): string {
    const user = (req as any).user;
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  private handleError(error: any, res: Response, message: string): void {
    console.error(`❌ [UserController] ${message}:`, error);
    res.status(error.statusCode || 500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || message,
      },
    });
  }
}
```

**File:** `server/src/presentation/routes/UserRouteModule.ts` (NEW)

```typescript
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { AuthMiddleware } from '../../infrastructure/security/AuthMiddleware';
import { RouteModule } from './RouteModule';

/**
 * User Route Module
 *
 * Handles user-related HTTP routes (settings, profile, etc.)
 */
export class UserRouteModule implements RouteModule {
  constructor(
    private userController: UserController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/users';
  }

  getMiddleware(): any[] {
    return [
      this.authMiddleware.authenticate.bind(this.authMiddleware)
    ];
  }

  configure(router: Router): void {
    /**
     * GET /api/users/me/settings
     * Get current user's settings
     */
    router.get('/me/settings',
      this.userController.getCurrentUserSettings.bind(this.userController)
    );

    /**
     * PUT /api/users/me/settings
     * Update current user's settings
     */
    router.put('/me/settings',
      this.userController.updateCurrentUserSettings.bind(this.userController)
    );
  }

  getRouteCount(): number {
    return 2;
  }
}
```

**File:** `server/src/infrastructure/di/ServiceContainer.ts` (EDIT)

```typescript
import {
  UpdateUserSettingsCommandHandler,
  GetUserSettingsQueryHandler
} from '@application/commands/UserCommands';
import { UserController } from '@presentation/controllers/UserController';
import { UserRouteModule } from '@presentation/routes/UserRouteModule';

export class ServiceContainer {
  // ... existing properties

  // User Settings Handlers
  private updateUserSettingsHandler?: UpdateUserSettingsCommandHandler;
  private getUserSettingsHandler?: GetUserSettingsQueryHandler;

  // User Controller & Routes
  private userController?: UserController;
  private userRouteModule?: UserRouteModule;

  // Getters for User Settings Handlers
  getUpdateUserSettingsHandler(): UpdateUserSettingsCommandHandler {
    if (!this.updateUserSettingsHandler) {
      this.updateUserSettingsHandler = new UpdateUserSettingsCommandHandler(
        this.getUserRepository()
      );
    }
    return this.updateUserSettingsHandler;
  }

  getGetUserSettingsHandler(): GetUserSettingsQueryHandler {
    if (!this.getUserSettingsHandler) {
      this.getUserSettingsHandler = new GetUserSettingsQueryHandler(
        this.getUserRepository()
      );
    }
    return this.getUserSettingsHandler;
  }

  // User Controller
  getUserController(): UserController {
    if (!this.userController) {
      this.userController = new UserController(
        this.getUpdateUserSettingsHandler(),
        this.getGetUserSettingsHandler()
      );
    }
    return this.userController;
  }

  // User Route Module
  getUserRouteModule(): UserRouteModule {
    if (!this.userRouteModule) {
      this.userRouteModule = new UserRouteModule(
        this.getUserController(),
        this.getAuthMiddleware()
      );
    }
    return this.userRouteModule;
  }

  // Update getAllRouteModules() to include UserRouteModule
  getAllRouteModules(): RouteModule[] {
    return [
      this.getPublicRouteModule(),
      this.getAuthRouteModule(),
      this.getAdminRouteModule(),
      this.getResourceRouteModule(),
      this.getConfigurationRouteModule(),
      this.getSearchRouteModule(),
      this.getUserRouteModule(), // NEW
    ];
  }
}
```

---

### 6.6.6 Frontend Services & Hooks

**File:** `client/src/domains/users/services/UserSettingsService.ts` (NEW)

```typescript
import { httpClient } from '@infra/api/httpClient';
import { type UserSettings, userSettingsSchema } from '@odysseus/shared-schemas';
import { InfrastructureError } from '@shared/errors/AppError';
import { z } from 'zod';

/**
 * User Settings Service
 *
 * Handles API calls for user settings CRUD operations
 */
export class UserSettingsService {
  /**
   * Get current user's settings
   */
  static async getUserSettings(): Promise<UserSettings> {
    try {
      const responseSchema = z.object({
        success: z.boolean(),
        settings: userSettingsSchema,
      });

      const response = await httpClient.getData('/users/me/settings', responseSchema);
      return response.settings;
    } catch (error) {
      console.error('❌ [UserSettingsService] Get settings failed:', error);
      throw new InfrastructureError(
        'API_ERROR',
        'Failed to load user settings',
        { originalError: error }
      );
    }
  }

  /**
   * Update current user's settings
   */
  static async updateUserSettings(settings: UserSettings): Promise<UserSettings> {
    try {
      const responseSchema = z.object({
        success: z.boolean(),
        settings: userSettingsSchema,
      });

      const response = await httpClient.put('/users/me/settings',
        { settings },
        responseSchema
      );

      return response.settings;
    } catch (error) {
      console.error('❌ [UserSettingsService] Update settings failed:', error);
      throw new InfrastructureError(
        'API_ERROR',
        'Failed to update user settings',
        { originalError: error, settings }
      );
    }
  }
}
```

**File:** `client/src/domains/users/hooks/useUserSettings.ts` (NEW)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserSettingsService } from '../services/UserSettingsService';
import { queryKeys } from '@app/queryKeys';
import { type UserSettings, type PositionDisplayConfig } from '@odysseus/shared-schemas';
import toast from 'react-hot-toast';

/**
 * Query hook for user settings
 */
export const useUserSettingsQuery = (config?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.users.settings(),
    queryFn: () => UserSettingsService.getUserSettings(),
    enabled: config?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

/**
 * Mutation hook for updating user settings
 */
export const useUpdateUserSettingsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['users', 'updateSettings'],
    mutationFn: (settings: UserSettings) => UserSettingsService.updateUserSettings(settings),

    onSuccess: (updatedSettings) => {
      // Update cache
      queryClient.setQueryData(queryKeys.users.settings(), updatedSettings);

      // Also invalidate storage queries since position display may have changed
      queryClient.invalidateQueries({
        queryKey: queryKeys.storage.storage(),
      });

      toast.success('Settings updated successfully');
    },

    onError: (error: any) => {
      console.error('❌ [useUpdateUserSettingsMutation] Failed:', error);
      toast.error(`Failed to update settings: ${error.message || 'Unknown error'}`);
    },
  });
};

/**
 * Convenience hook for updating just position display preference
 */
export const useUpdatePositionDisplayPreferenceMutation = () => {
  const queryClient = useQueryClient();
  const { data: currentSettings } = useUserSettingsQuery();

  return useMutation({
    mutationKey: ['users', 'updatePositionDisplayPreference'],
    mutationFn: (positionDisplay: PositionDisplayConfig | null) => {
      const newSettings: UserSettings = {
        ...currentSettings,
        defaultPositionDisplay: positionDisplay ?? undefined,
      };
      return UserSettingsService.updateUserSettings(newSettings);
    },

    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(queryKeys.users.settings(), updatedSettings);
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.storage() });

      const formatName = updatedSettings.defaultPositionDisplay?.format === 'numeric'
        ? 'Numeric (1-81)'
        : 'Alphanumeric (A1-I9)';

      toast.success(
        updatedSettings.defaultPositionDisplay
          ? `Position display preference set to ${formatName}`
          : 'Position display preference cleared'
      );
    },

    onError: (error: any) => {
      console.error('❌ [useUpdatePositionDisplayPreferenceMutation] Failed:', error);
      toast.error(`Failed to update preference: ${error.message || 'Unknown error'}`);
    },
  });
};
```

**File:** `client/src/app/queryKeys.ts` (EDIT)

```typescript
export const queryKeys = {
  // ... existing keys

  // User settings
  users: {
    all: ['users'] as const,
    settings: () => [...queryKeys.users.all, 'settings'] as const,
  },
};
```

---

### 6.6.7 Frontend User Settings Store (Optional - if needed)

**File:** `client/src/domains/users/stores/userSettingsStore.ts` (NEW - Optional)

```typescript
import { create } from 'zustand';
import { type UserSettings, DEFAULT_USER_SETTINGS } from '@odysseus/shared-schemas';

interface UserSettingsState {
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

/**
 * User Settings Store
 *
 * Optional store for user settings (React Query may be sufficient)
 */
export const useUserSettingsStore = create<UserSettingsState>((set) => ({
  settings: DEFAULT_USER_SETTINGS,

  setSettings: (settings) => set({ settings }),

  updateSetting: (key, value) => set((state) => ({
    settings: {
      ...state.settings,
      [key]: value,
    },
  })),
}));
```

---

### 6.6.8 Frontend UI Components

**File:** `client/src/domains/users/ui/components/UserSettingsModal.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { Dialog } from '@shared/ui/primitives/dialog/Dialog';
import { Tabs, TabList, Tab, TabPanel } from '@shared/ui/primitives/tabs/Tabs';
import { PositionDisplayPreferenceTab } from './PositionDisplayPreferenceTab';
import { useUserSettingsQuery } from '../../hooks/useUserSettings';

export interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * User Settings Modal
 *
 * Tab-based settings modal for user preferences and configuration.
 * Extensible architecture - add new tabs for new settings.
 */
export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const { data: settings, isLoading } = useUserSettingsQuery({ enabled: isOpen });

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="User Settings"
      size="lg"
    >
      <div className="user-settings-modal">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="loading-spinner" />
            <span className="ml-3 text-gray-600">Loading settings...</span>
          </div>
        ) : (
          <Tabs selectedIndex={activeTab} onSelect={(index) => setActiveTab(index)}>
            <TabList>
              <Tab>Display</Tab>
              {/* Future tabs */}
              {/* <Tab>Profile</Tab> */}
              {/* <Tab>Notifications</Tab> */}
              {/* <Tab>Accessibility</Tab> */}
            </TabList>

            <div className="mt-6">
              <TabPanel>
                <PositionDisplayPreferenceTab settings={settings} />
              </TabPanel>

              {/* Future tab panels */}
              {/* <TabPanel><ProfileTab settings={settings} /></TabPanel> */}
              {/* <TabPanel><NotificationsTab settings={settings} /></TabPanel> */}
              {/* <TabPanel><AccessibilityTab settings={settings} /></TabPanel> */}
            </div>
          </Tabs>
        )}
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t">
        <button onClick={onClose} className="btn-primary">
          Close
        </button>
      </div>
    </Dialog>
  );
};
```

**File:** `client/src/domains/users/ui/components/PositionDisplayPreferenceTab.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { type UserSettings, type PositionDisplayConfig } from '@odysseus/shared-schemas';
import { usePositionDisplayPresetsQuery } from '@domains/storage/hooks/useBoxPositionDisplay';
import { useUpdatePositionDisplayPreferenceMutation } from '../../hooks/useUserSettings';

export interface PositionDisplayPreferenceTabProps {
  settings?: UserSettings;
}

/**
 * Position Display Preference Tab
 *
 * Allows users to set their preferred position display format.
 * This preference applies to all boxes they view (unless box has custom override).
 */
export const PositionDisplayPreferenceTab: React.FC<PositionDisplayPreferenceTabProps> = ({
  settings,
}) => {
  const currentPreference = settings?.defaultPositionDisplay;
  const [selectedFormat, setSelectedFormat] = useState<'numeric' | 'alphanumeric' | null>(
    currentPreference?.format ?? null
  );

  const { data: presetsData, isLoading: isLoadingPresets } = usePositionDisplayPresetsQuery();
  const updateMutation = useUpdatePositionDisplayPreferenceMutation();

  const handleSave = () => {
    if (!presetsData) return;

    let positionDisplay: PositionDisplayConfig | null = null;

    if (selectedFormat === 'numeric') {
      positionDisplay = presetsData.presets.NUMERIC;
    } else if (selectedFormat === 'alphanumeric') {
      positionDisplay = presetsData.presets.ALPHANUMERIC_STANDARD;
    }

    updateMutation.mutate(positionDisplay);
  };

  const handleClear = () => {
    setSelectedFormat(null);
    updateMutation.mutate(null);
  };

  return (
    <div className="position-display-preference-tab space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Position Display Format</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose how you want to see position labels throughout the application.
          This setting applies to all boxes unless a specific box has a custom override.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="positionFormat"
            value="none"
            checked={selectedFormat === null}
            onChange={() => setSelectedFormat(null)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium">Use Lab/Box Defaults</div>
            <div className="text-sm text-gray-600 mt-1">
              Follow the lab-wide default or individual box configurations.
              No personal preference override.
            </div>
          </div>
        </label>

        <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="positionFormat"
            value="numeric"
            checked={selectedFormat === 'numeric'}
            onChange={() => setSelectedFormat('numeric')}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium">Numeric (1-81)</div>
            <div className="text-sm text-gray-600 mt-1">
              Simple numeric labels: 1, 2, 3, ..., 81
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Example: Position 23 displays as "23"
            </div>
          </div>
        </label>

        <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="positionFormat"
            value="alphanumeric"
            checked={selectedFormat === 'alphanumeric'}
            onChange={() => setSelectedFormat('alphanumeric')}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium">Alphanumeric (A1-I9)</div>
            <div className="text-sm text-gray-600 mt-1">
              Excel-style row/column labels: A1, A2, B1, B2, ..., I9
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Example: Position 23 displays as "C5"
            </div>
          </div>
        </label>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How This Works</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Priority Order:</strong></p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Your preference (if set) - highest priority</li>
            <li>Box custom override (if configured)</li>
            <li>Lab-wide default (if set)</li>
            <li>System default (Alphanumeric)</li>
          </ol>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        {selectedFormat !== null && (
          <button
            onClick={handleClear}
            disabled={updateMutation.isPending}
            className="btn-secondary"
          >
            Clear Preference
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending || isLoadingPresets}
          className="btn-primary"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Preference'}
        </button>
      </div>
    </div>
  );
};
```

---

### 6.6.9 Update Position Display Utils for 4-Tier Hierarchy

**File:** `client/src/domains/storage/utils/positionDisplayUtils.ts` (EDIT)

```typescript
import { useUserSettingsStore } from '@domains/users/stores/userSettingsStore';
// Or if using React Query:
// import { useUserSettingsQuery } from '@domains/users/hooks/useUserSettings';

/**
 * Get resolved position display config with 4-tier fallback hierarchy
 *
 * Hierarchy: user preference → box override → lab default → system default
 */
function getResolvedPositionDisplay(
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration
): PositionDisplayConfig {
  const storageState = useStorageStore.getState();

  // 1. Check for user preference (HIGHEST PRIORITY - NEW)
  const userSettings = useUserSettingsStore.getState().settings;
  if (userSettings.defaultPositionDisplay) {
    return userSettings.defaultPositionDisplay;
  }

  // 2. Check for box-specific override
  const boxOverride = storageState.getBoxPositionDisplay(tankId, rackId, boxId);
  if (boxOverride) {
    return boxOverride;
  }

  // 3. Check for lab-wide default
  const currentLab = storageState.currentLab;
  const labDefault = currentLab?.settings?.defaultPositionDisplay;
  if (labDefault) {
    return labDefault;
  }

  // 4. Fall back to system default (alphanumeric)
  return getDefaultPositionDisplay(gridConfig.rows, gridConfig.cols);
}
```

---

### 6.6.10 App Initialization - Load User Settings

**File:** `client/src/App.tsx` (EDIT)

```typescript
import { useUserSettingsQuery } from '@domains/users/hooks/useUserSettings';
import { useUserSettingsStore } from '@domains/users/stores/userSettingsStore';

function App() {
  const { data: authData } = useAuthQuery();
  const isAuthenticated = authData?.isAuthenticated ?? false;

  // Load user settings on mount (only if authenticated)
  const { data: userSettings } = useUserSettingsQuery({
    enabled: isAuthenticated
  });

  // Sync user settings to store
  React.useEffect(() => {
    if (userSettings) {
      useUserSettingsStore.getState().setSettings(userSettings);
    }
  }, [userSettings]);

  // ... rest of App
}
```

---

### 6.6.11 Testing

**File:** `server/src/application/commands/UserCommands.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateUserSettingsCommandHandler } from './UserCommands';
import { InMemoryUserRepository } from '@infrastructure/repositories/InMemoryUserRepository';
import { User } from '@domain/entities/User';
import { POSITION_DISPLAY_PRESETS } from '@odysseus/shared-schemas';

describe('UpdateUserSettingsCommandHandler', () => {
  let handler: UpdateUserSettingsCommandHandler;
  let userRepository: InMemoryUserRepository;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    handler = new UpdateUserSettingsCommandHandler(userRepository);
  });

  it('should update user settings', async () => {
    // Create test user
    const user = User.create('test@example.com', 'password', Role.createUser());
    await userRepository.save(user);

    // Update settings
    const newSettings = {
      defaultPositionDisplay: POSITION_DISPLAY_PRESETS.NUMERIC,
    };

    const updatedUser = await handler.handle({
      userId: user.id,
      settings: newSettings,
    });

    expect(updatedUser.settings.defaultPositionDisplay).toEqual(POSITION_DISPLAY_PRESETS.NUMERIC);
  });
});
```

---

## Phase 7: Search & Filter Integration

### 7.1 Update Search Filters

**File:** `client/src/domains/search/types/index.ts` (EDIT)

```typescript
export interface SearchFilters {
  // ... existing filters

  // Position can be numeric or label
  position?: number;
  positionLabel?: string; // User-entered label (A5, B12, etc.)
}
```

### 7.2 Update Search Service

**File:** `client/src/domains/search/services/SearchService.ts` (EDIT)

```typescript
import { labelToPosition } from '@odysseus/shared-schemas';
import { useConfigurationStore } from '@domains/laboratory/stores/configurationStore';

export const SearchService = {
  async searchTubes(filters: SearchFilters): Promise<SearchResult[]> {
    // Convert position label to numeric if provided
    const processedFilters = { ...filters };

    if (filters.positionLabel && filters.boxId) {
      const store = useConfigurationStore.getState();
      const positionDisplay = store.getBoxPositionDisplay(
        filters.tankId!,
        filters.rackId!,
        filters.boxId
      );

      if (positionDisplay) {
        const box = /* get box from config */;
        const position = labelToPosition(
          filters.positionLabel,
          box.gridConfig.rows,
          box.gridConfig.cols,
          positionDisplay
        );
        processedFilters.position = position;
        delete processedFilters.positionLabel;
      }
    }

    const response = await httpClient.post('/api/search/tubes/advanced', processedFilters);
    return response.data;
  },
};
```

### 7.3 Update Search UI Components

**File:** `client/src/domains/search/ui/components/FilterPanel.tsx` (EDIT)

```typescript
import { PositionInput } from '@domains/laboratory/ui/components/PositionInput';

export const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onChange }) => {
  return (
    <div className="filter-panel">
      {/* ... existing filters */}

      {/* Position filter - auto-adapts to box format */}
      {filters.tankId && filters.rackId && filters.boxId && (
        <PositionInput
          tankId={filters.tankId}
          rackId={filters.rackId}
          boxId={filters.boxId}
          value={filters.position ?? null}
          onChange={(position) => onChange({ ...filters, position: position ?? undefined })}
        />
      )}
    </div>
  );
};
```

---

## Phase 8: Import/Export Support

### 8.1 CSV Export with Position Labels

**File:** `client/src/domains/tubes/services/TubeExportService.ts` (EDIT)

```typescript
import { usePositionDisplay } from '@domains/laboratory/hooks/usePositionDisplay';

export const TubeExportService = {
  exportToCSV(tubes: TubeData[], includePositionLabels: boolean = true): string {
    const headers = [
      'ID',
      'Tank',
      'Rack',
      'Box',
      'Position',
      includePositionLabels ? 'Position Label' : null,
      'Cell Type',
      // ... other fields
    ].filter(Boolean);

    const rows = tubes.map((tube) => {
      const positionLabel = includePositionLabels
        ? this.getPositionLabel(tube)
        : null;

      return [
        tube.id,
        tube.location.tankId,
        tube.location.rackId,
        tube.location.boxId,
        tube.location.position,
        positionLabel,
        tube.sample.cellType,
        // ... other fields
      ].filter((v) => v !== null);
    });

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
  },

  getPositionLabel(tube: TubeData): string {
    const store = useConfigurationStore.getState();
    const config = store.getBoxPositionDisplay(
      tube.location.tankId,
      tube.location.rackId,
      tube.location.boxId
    );

    if (!config) return tube.location.position.toString();

    const box = /* get box */;
    return positionToLabel(
      tube.location.position,
      box.gridConfig.rows,
      box.gridConfig.cols,
      config
    );
  },
};
```

### 8.2 CSV Import with Position Label Support

**File:** `client/src/domains/tubes/services/TubeImportService.ts` (EDIT)

```typescript
import { labelToPosition } from '@odysseus/shared-schemas';

export const TubeImportService = {
  parseCSV(csvContent: string): ParsedTubeData[] {
    const lines = csvContent.split('\n');
    const headers = this.parseCSVLine(lines[0]);

    // Detect if CSV has Position Label column
    const hasPositionLabel = headers.includes('Position Label');
    const positionIndex = headers.indexOf('Position');
    const positionLabelIndex = headers.indexOf('Position Label');

    return lines.slice(1).map((line) => {
      const values = this.parseCSVLine(line);

      // Determine position value
      let position: number;

      if (hasPositionLabel && values[positionLabelIndex]) {
        // Parse position label (A5, B12, etc.)
        const tankId = values[headers.indexOf('Tank')];
        const rackId = values[headers.indexOf('Rack')];
        const boxId = values[headers.indexOf('Box')];
        const positionLabel = values[positionLabelIndex];

        const config = this.getBoxConfig(tankId, rackId, boxId);
        const box = this.getBox(tankId, rackId, boxId);

        position = labelToPosition(
          positionLabel,
          box.gridConfig.rows,
          box.gridConfig.cols,
          config
        );
      } else {
        // Use numeric position
        position = parseInt(values[positionIndex], 10);
      }

      return {
        // ... map other fields
        location: {
          tankId: values[headers.indexOf('Tank')],
          rackId: values[headers.indexOf('Rack')],
          boxId: values[headers.indexOf('Box')],
          position,
        },
      };
    });
  },
};
```

---

## Phase 9: Testing

### 9.1 Unit Tests for Position Conversion

**File:** `packages/shared-schemas/src/laboratory/positionFormatters.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { positionToLabel, labelToPosition } from './positionFormatters';
import { POSITION_DISPLAY_PRESETS } from './positionSchemas';

describe('positionFormatters', () => {
  describe('positionToLabel', () => {
    it('should format numeric positions', () => {
      const config = POSITION_DISPLAY_PRESETS.NUMERIC;
      expect(positionToLabel(1, 9, 9, config)).toBe('1');
      expect(positionToLabel(23, 9, 9, config)).toBe('23');
      expect(positionToLabel(81, 9, 9, config)).toBe('81');
    });

    it('should format alphanumeric positions (row-col)', () => {
      const config = POSITION_DISPLAY_PRESETS.ALPHANUMERIC_STANDARD;
      expect(positionToLabel(1, 9, 9, config)).toBe('A1');
      expect(positionToLabel(9, 9, 9, config)).toBe('A9');
      expect(positionToLabel(10, 9, 9, config)).toBe('B1');
      expect(positionToLabel(23, 9, 9, config)).toBe('C5');
      expect(positionToLabel(81, 9, 9, config)).toBe('I9');
    });

    it('should handle different grid sizes', () => {
      const config = POSITION_DISPLAY_PRESETS.ALPHANUMERIC_STANDARD;

      // 10x10 grid
      const config10x10 = {
        ...config,
        alphanumericConfig: {
          ...config.alphanumericConfig!,
          rowLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
          colLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        },
      };

      expect(positionToLabel(1, 10, 10, config10x10)).toBe('A1');
      expect(positionToLabel(11, 10, 10, config10x10)).toBe('B1');
      expect(positionToLabel(100, 10, 10, config10x10)).toBe('J10');
    });
  });

  describe('labelToPosition', () => {
    it('should parse numeric labels', () => {
      const config = POSITION_DISPLAY_PRESETS.NUMERIC;
      expect(labelToPosition('1', 9, 9, config)).toBe(1);
      expect(labelToPosition('23', 9, 9, config)).toBe(23);
      expect(labelToPosition('81', 9, 9, config)).toBe(81);
    });

    it('should parse alphanumeric labels (row-col)', () => {
      const config = POSITION_DISPLAY_PRESETS.ALPHANUMERIC_STANDARD;
      expect(labelToPosition('A1', 9, 9, config)).toBe(1);
      expect(labelToPosition('A9', 9, 9, config)).toBe(9);
      expect(labelToPosition('B1', 9, 9, config)).toBe(10);
      expect(labelToPosition('C5', 9, 9, config)).toBe(23);
      expect(labelToPosition('I9', 9, 9, config)).toBe(81);
    });

    it('should handle case-insensitive input', () => {
      const config = POSITION_DISPLAY_PRESETS.ALPHANUMERIC_STANDARD;
      expect(labelToPosition('a1', 9, 9, config)).toBe(1);
      expect(labelToPosition('c5', 9, 9, config)).toBe(23);
    });

    it('should throw error for invalid labels', () => {
      const config = POSITION_DISPLAY_PRESETS.ALPHANUMERIC_STANDARD;

      expect(() => labelToPosition('Z99', 9, 9, config)).toThrow();
      expect(() => labelToPosition('A0', 9, 9, config)).toThrow();
      expect(() => labelToPosition('invalid', 9, 9, config)).toThrow();
    });
  });

  describe('round-trip conversion', () => {
    it('should convert position → label → position correctly', () => {
      const config = POSITION_DISPLAY_PRESETS.ALPHANUMERIC_STANDARD;

      for (let pos = 1; pos <= 81; pos++) {
        const label = positionToLabel(pos, 9, 9, config);
        const backToPosition = labelToPosition(label, 9, 9, config);
        expect(backToPosition).toBe(pos);
      }
    });
  });
});
```

### 9.2 Integration Tests

**File:** `client/src/domains/laboratory/hooks/usePositionDisplay.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePositionDisplay } from './usePositionDisplay';
import { useConfigurationStore } from '../stores/configurationStore';

describe('usePositionDisplay', () => {
  it('should format and parse positions correctly', () => {
    // Setup mock configuration
    useConfigurationStore.setState({
      tanks: [
        {
          id: 'tank-1',
          racks: [
            {
              id: '1',
              boxes: [
                {
                  id: 'A',
                  gridConfig: { rows: 9, cols: 9 },
                  positionDisplay: POSITION_DISPLAY_PRESETS.ALPHANUMERIC_STANDARD,
                },
              ],
            },
          ],
        },
      ],
    });

    const { result } = renderHook(() =>
      usePositionDisplay({ tankId: 'tank-1', rackId: '1', boxId: 'A' })
    );

    expect(result.current.formatPosition(1)).toBe('A1');
    expect(result.current.parsePosition('A1')).toBe(1);
    expect(result.current.isAlphanumeric).toBe(true);
  });
});
```

### 9.3 E2E Tests

**File:** `client/src/__tests__/e2e/positionDisplay.test.tsx` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PositionInput } from '@domains/laboratory/ui/components/PositionInput';

describe('Position Input E2E', () => {
  it('should accept alphanumeric input and convert to numeric', async () => {
    const onChange = vi.fn();

    render(
      <PositionInput
        tankId="tank-1"
        rackId="1"
        boxId="A"
        value={null}
        onChange={onChange}
      />
    );

    const input = screen.getByPlaceholderText('A1');
    fireEvent.change(input, { target: { value: 'C5' } });

    expect(onChange).toHaveBeenCalledWith(23); // C5 = position 23 in 9x9 grid
  });

  it('should show validation error for invalid labels', () => {
    const onChange = vi.fn();

    render(
      <PositionInput
        tankId="tank-1"
        rackId="1"
        boxId="A"
        value={null}
        onChange={onChange}
      />
    );

    const input = screen.getByPlaceholderText('A1');
    fireEvent.change(input, { target: { value: 'Z99' } });

    expect(screen.getByText(/Invalid row label/i)).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
```

---

## Phase 10: Documentation & User Guide

### 10.1 Update Configuration Help

**File:** `client/src/domains/laboratory/ui/components/PositionDisplayHelp.tsx` (NEW)

```typescript
export const PositionDisplayHelp: React.FC = () => {
  return (
    <div className="help-panel">
      <h3>Position Display Formats</h3>

      <div className="mb-4">
        <h4 className="font-medium">Numeric (1-81)</h4>
        <p className="text-sm text-gray-600">
          Simple numeric labels from 1 to the total number of positions in the box.
          Example: For a 9×9 grid, positions are labeled 1, 2, 3, ..., 81.
        </p>
      </div>

      <div className="mb-4">
        <h4 className="font-medium">Alphanumeric - Row/Column (A1-I9)</h4>
        <p className="text-sm text-gray-600">
          Standard freezer box format with row letters (A-I) and column numbers (1-9).
          Example: A1, A2, B1, B2, ..., I9.
          This is the most common format for commercial laboratory freezer boxes.
        </p>
      </div>

      <div className="mb-4">
        <h4 className="font-medium">Alphanumeric - Column/Row (1A-9I)</h4>
        <p className="text-sm text-gray-600">
          Reverse format with column numbers first, then row letters.
          Example: 1A, 2A, 1B, 2B, ..., 9I.
        </p>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h4 className="font-medium text-blue-900">Note</h4>
        <p className="text-sm text-blue-800">
          You can configure different formats for each box to match your physical freezer box labels.
          This only affects how positions are displayed - the underlying data remains numeric for consistency.
        </p>
      </div>
    </div>
  );
};
```

---

## Phase 11: Deployment Strategy

### 11.1 Database Reset (Fresh Start)

**Since current database contains only dummy data:**

1. **Delete existing database**
   ```bash
   # Development database
   cd server/data
   del odysseus.sqlite  # Windows
   rm odysseus.sqlite   # macOS/Linux
   ```

2. **Update schema in SQLiteContext.ts** (as outlined in Phase 3.1)

3. **Restart server** - Database will be recreated with new schema automatically

4. **Repopulate with fresh test data** if needed

### 11.2 Deployment Steps

**Step 1: Update Shared Schemas Package**
```bash
cd packages/shared-schemas
npm run build
```

**Step 2: Update Backend**
- Update SQLiteContext.ts with new schema
- Update repositories and services
- Add new API endpoints
- Test endpoints with Postman

**Step 3: Update Frontend**
- Update configuration service and hooks
- Add new UI components
- Update existing components to use position display
- Test UI functionality

**Step 4: Integration Testing**
- Delete database and restart
- Test configuration CRUD operations
- Test position display in all components
- Test search with alphanumeric input
- Test CSV import/export

**Step 5: Full Application Test**
- Build application: `npm run build`
- Package application: `npm run package`
- Test packaged .exe with fresh database
- Verify all features work in production mode

---

## Phase 12: Performance Considerations

### 12.1 Caching Strategy

**Client-side caching:**
- Cache position display configs in configuration store
- Memoize conversion functions with `useMemo`
- Cache generated label arrays per box

**Server-side caching:**
- Cache lab configuration (already implemented)
- No additional server-side conversion needed (conversion happens client-side)

### 12.2 Optimization Notes

- Position conversion is O(1) - simple arithmetic
- Label parsing uses regex - fast for single labels
- Batch operations should convert once and reuse
- Grid label generation is O(n) but cached

---

## Phase 13: Error Handling & Edge Cases

### 13.1 Validation Errors

**Invalid Labels:**
- Show clear error messages in UI
- Provide examples of valid formats
- Suggest corrections for common typos

**Mismatched Grid Sizes:**
- Validate label arrays match grid dimensions
- Prevent configuration with mismatched sizes
- Show warning if grid size changes after labels configured

**Import Errors:**
- Detect malformed position labels in CSV
- Provide row-by-row error reports
- Allow fallback to numeric if labels fail

### 13.2 Backward Compatibility

**Legacy Data:**
- All existing numeric positions continue to work
- No migration needed for tube position data
- Old CSV exports remain valid

**API Compatibility:**
- All endpoints accept numeric positions (no breaking changes)
- New label-based endpoints are additive
- Clients can choose to use labels or not

---

## Phase 14: Future Enhancements (Out of Scope)

### Potential Future Features

1. **Custom Label Patterns:**
   - User-defined row/column label schemes
   - Support for multi-character labels (A, B, ... Z, AA, AB, ...)
   - Custom separators (A-5, A_5, etc.)

2. **Visual Grid Customization:**
   - Display row/column headers on grid
   - Color-code rows or columns
   - Highlight specific label patterns

3. **Smart Label Suggestions:**
   - Autocomplete position labels as user types
   - Show nearby positions on hover
   - Quick-jump to position by label

4. **Batch Label Operations:**
   - Select positions by label range (A1-A9)
   - Filter by row (all A positions)
   - Filter by column (all position 5s)

5. **Multi-Box Label Coordination:**
   - Sync label formats across multiple boxes
   - Template system for common configurations
   - Bulk update position display formats

---

## Implementation Checklist

### Phase 1: Schema & Types
- [ ] Create `positionSchemas.ts` in shared-schemas
- [ ] Create `positionFormatters.ts` in shared-schemas
- [ ] Update `configurationSchemas.ts`
- [ ] Update `tubeFormatters.ts`
- [ ] Update shared-schemas exports
- [ ] Build shared-schemas package
- [ ] Verify types work in both client and server

### Phase 2: Backend Domain
- [ ] Update `Equipment.ts` value objects
- [ ] Update `TubePositionService.ts`
- [ ] Add position label validation methods

### Phase 3: Backend Infrastructure
- [ ] Update `SQLiteContext.ts` with new schema
- [ ] Delete existing database (dummy data)
- [ ] Restart server to recreate database
- [ ] Update `SQLiteConfigurationRepository.ts`
- [ ] Test configuration persistence with new schema

### Phase 4: Backend API
- [ ] Update `ConfigurationController.ts`
- [ ] Add position display endpoints
- [ ] Update `SearchController.ts` for label support
- [ ] Update route modules
- [ ] Test API endpoints with Postman/curl

### Phase 5: Frontend Configuration
- [ ] Update `ConfigurationService.ts`
- [ ] Create `useBoxPositionDisplay.ts` hook
- [ ] Update `configurationStore.ts`
- [ ] Test configuration queries

### Phase 6: Frontend UI
- [ ] Create `usePositionDisplay.ts` hook
- [ ] Update `GridPosition.tsx`
- [ ] Update `LocationDisplay.tsx`
- [ ] Update `TubeInfoPanel.tsx`
- [ ] Create `PositionInput.tsx` component
- [ ] Create `PositionDisplayConfigModal.tsx`
- [ ] Test UI components

### Phase 7: Search Integration
- [ ] Update search types
- [ ] Update `SearchService.ts`
- [ ] Update `FilterPanel.tsx`
- [ ] Test search with alphanumeric labels

### Phase 8: Import/Export
- [ ] Update `TubeExportService.ts`
- [ ] Update `TubeImportService.ts`
- [ ] Test CSV export with labels
- [ ] Test CSV import with labels

### Phase 9: Testing
- [ ] Write unit tests for formatters
- [ ] Write integration tests for hooks
- [ ] Write E2E tests for components
- [ ] Run full test suite
- [ ] Fix any failing tests

### Phase 10: Documentation
- [ ] Create help component
- [ ] Update user documentation
- [ ] Add inline help tooltips
- [ ] Document database reset procedure (for reference)

### Phase 11: Deployment
- [ ] Delete existing database (dummy data)
- [ ] Deploy backend with updated schema
- [ ] Restart server (database recreates automatically)
- [ ] Deploy frontend
- [ ] Repopulate with fresh test data if needed
- [ ] Verify functionality in development
- [ ] Build and package application
- [ ] Test packaged .exe

### Phase 12: Validation
- [ ] Test with real lab data
- [ ] Verify all conversions correct
- [ ] Monitor for errors
- [ ] Gather user feedback

---

## Risk Assessment

### Low Risk
- Database schema update (fresh start, no migration)
- Client-side conversion logic (isolated)
- New UI components (additive)
- Database recreation (dummy data only)

### Medium Risk
- CSV import parsing (edge cases with malformed labels)
- Search filter conversion (must handle all input formats)

### High Risk
- **NONE** - Architecture keeps position storage numeric (stable)
- **NONE** - No data migration required (fresh database)

### Mitigation Strategies
1. Extensive unit tests for conversion functions
2. Validation at every input point
3. Clear error messages for invalid labels
4. Fallback to numeric mode if conversion fails
5. Comprehensive testing before deployment

---

## Success Criteria

### Functional Requirements
✅ Users can configure position display format per box
✅ Grid displays positions in configured format
✅ Position input accepts both numeric and alphanumeric
✅ Search works with both input formats
✅ CSV export includes position labels
✅ CSV import supports position labels
✅ Existing numeric workflows unaffected

### Performance Requirements
✅ Position conversion < 1ms per position
✅ Grid rendering performance unchanged
✅ Search response time unchanged
✅ CSV import/export speed unchanged

### Quality Requirements
✅ Clean database recreation (no migration issues)
✅ 100% backward compatibility for future data
✅ All tests passing
✅ No console errors
✅ Clean Architecture maintained
✅ Schema properly initialized on fresh start

---

## Estimated Effort

**Total Implementation Time: 22-28 hours**

- Phase 1 (Schemas): 4 hours
- Phase 2 (Backend Domain): 2 hours
- Phase 3 (Backend Infrastructure): 2 hours *(simplified - no migration)*
- Phase 4 (Backend API): 2 hours
- Phase 5 (Frontend Config): 3 hours
- Phase 6 (Frontend UI): 8 hours
- Phase 7 (Search): 2 hours
- Phase 8 (Import/Export): 3 hours
- Phase 9 (Testing): 6 hours
- Phase 10 (Documentation): 2 hours
- Phase 11 (Deployment): 1 hour *(simplified - just delete & restart)*
- Phase 12 (Validation): 3 hours

**Recommended Approach:**
- Implement in phases over 3-4 days
- Test each phase before proceeding
- Delete database and restart between phases as needed
- No concern about data loss (dummy data only)

---

## Conclusion

This implementation plan provides complete flexibility for position display formats while maintaining a clean architecture and zero breaking changes. The separation between storage (numeric) and display (configurable) ensures data integrity while meeting real-world laboratory needs.

**Key Advantages of Fresh Database Approach:**
- No complex migration logic needed
- Faster implementation (22-28 hours vs 24-32 hours)
- Zero risk of migration errors or data corruption
- Clean slate ensures schema is correct from the start
- Simpler testing and validation

The modular approach allows for easy extension to additional label formats in the future, and the comprehensive testing strategy ensures reliability. By following Clean Architecture principles, the changes are isolated to appropriate layers and maintain the system's long-term maintainability.

Since the current database contains only dummy data, we can take advantage of a clean start, simplifying the deployment process and reducing implementation time by 2-4 hours.
