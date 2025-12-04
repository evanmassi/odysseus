# Storage State Architecture Refactor Guide

**Created:** 2025-12-02
**Status:** Future improvement
**Priority:** Low (sync bug fixed with Option B)

## Problem Summary

The storage domain currently duplicates server state in both React Query and Zustand, violating the project's own state management guideline:

> "React Query for ALL server state, Zustand ONLY for UI state" — AGENTS.md

This duplication caused a sync bug where label/assignment changes saved to the server weren't reflected in the UI because the Zustand store wasn't updated after React Query cache invalidation.

**Quick fix applied:** Removed the one-time sync guard in `useConfigurationSync.ts` so the Zustand store updates whenever React Query data changes.

**Proper fix:** Eliminate the duplication entirely by consuming storage data directly from React Query.

---

## Current Architecture (Problematic)

```
Server → React Query → useConfigurationSync → Zustand Store → Components
                            ↑
                     (sync can get stale)
```

**Files involved:**
- `hooks/useStorageQuery.ts` — React Query hooks (`useLoadStorageQuery`)
- `hooks/useConfigurationSync.ts` — Syncs React Query → Zustand
- `stores/storageStore.ts` — Zustand store holding `currentLab`, `systemConfig`
- ~15 component files consuming from Zustand

---

## Target Architecture (Correct)

```
Server → React Query → Components
              ↓
         Zustand (UI state only: selections, expanded nodes, etc.)
```

React Query becomes the single source of truth for server data. Zustand only holds UI-specific state.

---

## Refactor Steps

### Step 1: Create `useStorageData` Hook

Create a new hook that wraps React Query and provides the same API as the current Zustand selectors:

```typescript
// File: client/src/domains/storage/hooks/useStorageData.ts

import { useMemo } from 'react';
import { useLoadStorageQuery } from './useStorageQuery';
import type { LabConfiguration, TankConfiguration, RackConfiguration, BoxConfiguration } from '@domains/storage';

/**
 * Primary hook for accessing storage configuration data
 * Consumes directly from React Query - no Zustand duplication
 */
export function useStorageData() {
  const { data, isLoading, isError } = useLoadStorageQuery();

  const currentLab = data?.configuration.currentLab ?? null;
  const systemConfig = data?.configuration.systemConfig ?? null;

  // Derived getters (memoized)
  const getCurrentTanks = useMemo(() => {
    return (): TankConfiguration[] => {
      return currentLab?.equipment.tanks ?? [];
    };
  }, [currentLab]);

  const getCurrentRacks = useMemo(() => {
    return (tankId: string): RackConfiguration[] => {
      const tank = currentLab?.equipment.tanks.find(t => t.id === tankId);
      return tank?.racks ?? [];
    };
  }, [currentLab]);

  const getCurrentBoxes = useMemo(() => {
    return (tankId: string, rackId: string): BoxConfiguration[] => {
      const tank = currentLab?.equipment.tanks.find(t => t.id === tankId);
      const rack = tank?.racks.find(r => r.id === rackId);
      return rack?.boxes ?? [];
    };
  }, [currentLab]);

  const getBox = useMemo(() => {
    return (tankId: string, rackId: string, boxId: string): BoxConfiguration | undefined => {
      const tank = currentLab?.equipment.tanks.find(t => t.id === tankId);
      const rack = tank?.racks.find(r => r.id === rackId);
      return rack?.boxes.find(b => b.id === boxId);
    };
  }, [currentLab]);

  const getAvailableGridTemplates = useMemo(() => {
    return () => systemConfig?.gridTemplates ?? [];
  }, [systemConfig]);

  return {
    // Data
    currentLab,
    systemConfig,
    isLoading,
    isError,

    // Derived getters (same API as current Zustand store)
    getCurrentTanks,
    getCurrentRacks,
    getCurrentBoxes,
    getBox,
    getAvailableGridTemplates,
  };
}
```

### Step 2: Update Component Imports

Replace Zustand imports with the new hook. Example migrations:

**Before:**
```typescript
import { useStorageStore } from '@domains/storage';

const currentLab = useStorageStore(state => state.currentLab);
const { getCurrentTanks, getBox } = useStorageStore();
```

**After:**
```typescript
import { useStorageData } from '@domains/storage';

const { currentLab, getCurrentTanks, getBox } = useStorageData();
```

### Files to Update

| File | Current Usage | Migration |
|------|---------------|-----------|
| `StorageManagementModal.tsx` | `currentLab`, `replaceLab`, `getAvailableGridTemplates` | Use `useStorageData`, remove `replaceLab` (mutations handle updates) |
| `TubeEditorModal.tsx` | `currentLab`, `getBox` | Use `useStorageData` |
| `PositionDisplaySelector.tsx` | `currentLab` | Use `useStorageData` |
| `Dashboard.tsx` | `getCurrentTanks` | Use `useStorageData` |
| `TubeGrid.tsx` | `getBox` | Use `useStorageData` |
| `TubeInfoPanel.tsx` | `getCurrentTanks`, `getBox` | Use `useStorageData` |
| `BatchTubeEditorModal.tsx` | `getCurrentTanks`, `getBox` | Use `useStorageData` |
| `FilterPanel.tsx` | `getCurrentTanks` | Use `useStorageData` |
| `SearchResults.tsx` | `getCurrentTanks`, `getBox` | Use `useStorageData` |
| `LocationDisplay.tsx` | `getCurrentTanks` | Use `useStorageData` |
| `useGridController.ts` | `getBox` | Use `useStorageData` |

### Step 3: Handle Non-React Contexts

Some services access the store outside React components:
- `gridNavigationService.ts`
- `dataConsistencyService.ts`
- `positionDisplayUtils.ts`

**Options:**
1. **Pass data as parameters** — Cleanest, most testable
2. **Use React Query's `queryClient.getQueryData()`** — For imperative access
3. **Keep minimal Zustand cache** — Last resort

**Recommended approach for services:**
```typescript
// Instead of:
const { getCurrentRacks } = useStorageStore.getState();

// Pass data from the calling component:
function navigateToNextRack(currentLab: LabConfiguration, tankId: string) {
  const racks = currentLab.equipment.tanks.find(t => t.id === tankId)?.racks ?? [];
  // ... navigation logic
}
```

### Step 4: Simplify `useConfigurationSync`

After migration, this hook becomes much simpler — it only needs to handle:
1. Initial server setup (fresh install)
2. Multi-tab sync (optional)

The Zustand sync logic can be removed entirely.

### Step 5: Clean Up Zustand Store

Remove server-state properties from `storageStore.ts`:
- `currentLab`
- `systemConfig`
- `replaceLab`
- All derived getters (`getCurrentTanks`, `getBox`, etc.)

**Keep only UI state:**
- Navigation selections (if any)
- Expanded/collapsed state (if any)
- Modal open/close state (if not in modalStore)

---

## Benefits of This Refactor

1. **Single source of truth** — No sync bugs possible
2. **Automatic cache invalidation** — React Query handles freshness
3. **Simpler mental model** — Server data = React Query, UI state = Zustand
4. **Better testability** — Components receive data via props/hooks, not global store
5. **Smaller bundle** — Less Zustand code to ship

---

## Estimated Effort

| Task | Time |
|------|------|
| Create `useStorageData` hook | 30 min |
| Update 11 component files | 1 hour |
| Update 3 service files | 30 min |
| Simplify `useConfigurationSync` | 15 min |
| Clean up `storageStore.ts` | 15 min |
| Testing | 30 min |
| **Total** | **~3 hours** |

---

## Testing Checklist

After refactor, verify:
- [ ] Storage Management modal opens and shows correct data
- [ ] Label edits persist and show immediately after save
- [ ] Assignment changes persist and show immediately
- [ ] Tube editor shows correct location options
- [ ] Search filters show correct tank/rack options
- [ ] Grid navigation works correctly
- [ ] Multi-tab sync still works (if implemented)
- [ ] Fresh install flow works (no existing config)

---

## Notes

This refactor aligns the storage domain with how other domains (tubes, researchers) already work — they consume directly from React Query without Zustand duplication.

The quick fix (Option B) applied on 2025-12-02 resolves the immediate bug. This full refactor is a "nice to have" architectural improvement that can be done when time permits.

---

# Detailed Implementation Plan

**Updated:** 2025-12-03
**Status:** Ready for implementation

## Complete File Inventory

### Files That Consume from storageStore (20 total)

| # | File Path | Current Usage | Category |
|---|-----------|---------------|----------|
| 1 | `domains/storage/hooks/useConfigurationSync.ts` | `getState()`, `setState()` | Sync Logic |
| 2 | `domains/storage/ui/components/modals/StorageManagementModal.tsx` | `currentLab`, `replaceLab`, `getAvailableGridTemplates`, `getState()` | Write + Read |
| 3 | `app/components/layout/Dashboard.tsx` | `getCurrentTanks` | Read-only |
| 4 | `domains/storage/index.ts` | Re-exports store | Export |
| 5 | `domains/storage/stores/storageStore.ts` | Source file | Source |
| 6 | `domains/tubes/ui/components/grid/StorageNavigator.tsx` | `getCurrentTanks`, `getCurrentRacks`, `getCurrentBoxes` | Read-only |
| 7 | `domains/tubes/ui/components/modals/BatchTubeEditorModal.tsx` | `getCurrentTanks`, `getBox` | Read-only |
| 8 | `domains/storage/hooks/useResourceAssignment.ts` | `updateRack`, `updateBox`, `getState()` | Write |
| 9 | `domains/grid/services/gridNavigationService.ts` | `getState().getCurrentRacks/getCurrentBoxes` (dynamic import) | Service |
| 10 | `domains/tubes/ui/components/modals/TubeEditorModal.tsx` | `currentLab`, `getBox` | Read-only |
| 11 | `domains/tubes/services/dataConsistencyService.ts` | `getState()`, `setState()` | Service |
| 12 | `domains/tubes/ui/components/grid/AnimatedTreeLineOverlay.tsx` | `getCurrentTanks` | Read-only |
| 13 | `domains/tubes/ui/components/grid/TubeGrid.tsx` | `getBox` | Read-only |
| 14 | `domains/tubes/ui/components/grid/TubeInfoPanel.tsx` | `getCurrentTanks`, `getBox` | Read-only |
| 15 | `domains/tubes/ui/components/displays/LocationDisplay.tsx` | `getCurrentTanks` | Read-only |
| 16 | `domains/storage/ui/components/PositionDisplaySelector.tsx` | `currentLab` | Read-only |
| 17 | `domains/storage/utils/positionDisplayUtils.ts` | `getState()` | Utility |
| 18 | `domains/search/ui/components/FilterPanel.tsx` | `getCurrentTanks` | Read-only |
| 19 | `domains/search/ui/components/SearchResults.tsx` | `getCurrentTanks`, `getBox` | Read-only |
| 20 | `app/hooks/grid/useGridController.ts` | `getBox` | Read-only |

---

## Implementation Phases

### Phase 1: Create Foundation (No Breaking Changes)

**Goal:** Create the new `useStorageData` hook without breaking existing code.

#### 1.1 Create `useStorageData` Hook

**File:** `client/src/domains/storage/hooks/useStorageData.ts` (NEW)

```typescript
/**
 * Storage Data Hook
 *
 * Primary hook for accessing storage configuration data.
 * Consumes directly from React Query - single source of truth.
 *
 * This replaces the pattern of reading server state from Zustand.
 * Components should use this hook instead of useStorageStore for data access.
 */
import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';
import { GRID_TEMPLATES } from '../utils/gridHelpers';

import { useLoadStorageQuery } from './useStorageQuery';

import type {
  LabConfiguration,
  SystemConfiguration,
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
  GridConfiguration,
  PositionDisplayConfig,
} from '@odysseus/shared-schemas';

interface StorageDataResult {
  // Core data
  currentLab: LabConfiguration | null;
  systemConfig: SystemConfiguration | null;

  // Loading states
  isLoading: boolean;
  isError: boolean;
  isFetched: boolean;

  // Derived getters (stable references via useCallback)
  getCurrentTanks: () => TankConfiguration[];
  getCurrentRacks: (tankId?: string) => RackConfiguration[];
  getCurrentBoxes: (tankId: string, rackId: string) => BoxConfiguration[];
  getBox: (tankId: string, rackId: string, boxId: string) => BoxConfiguration | undefined;
  getBoxPositionDisplay: (tankId: string, rackId: string, boxId: string) => PositionDisplayConfig | undefined;
  getAvailableGridTemplates: () => readonly GridConfiguration[];
}

/**
 * Primary hook for accessing storage configuration data
 *
 * Replaces direct Zustand store access for server state.
 * Data comes directly from React Query cache.
 */
export function useStorageData(): StorageDataResult {
  const { data, isLoading, isError, isFetched } = useLoadStorageQuery();

  const currentLab = data?.configuration.currentLab ?? null;
  const systemConfig = data?.configuration.systemConfig ?? null;

  // Stable getter functions using useCallback
  const getCurrentTanks = useCallback((): TankConfiguration[] => {
    return currentLab?.equipment.tanks ?? [];
  }, [currentLab]);

  const getCurrentRacks = useCallback((tankId?: string): RackConfiguration[] => {
    const tanks = currentLab?.equipment.tanks ?? [];

    if (!tankId) {
      // Return all racks from all tanks
      return tanks.flatMap(tank => tank.racks ?? []);
    }

    const tank = tanks.find(t => t.id === tankId);
    return tank?.racks ?? [];
  }, [currentLab]);

  const getCurrentBoxes = useCallback((tankId: string, rackId: string): BoxConfiguration[] => {
    const tanks = currentLab?.equipment.tanks ?? [];
    const tank = tanks.find(t => t.id === tankId);
    const rack = tank?.racks?.find(r => r.id === rackId);
    return rack?.boxes ?? [];
  }, [currentLab]);

  const getBox = useCallback((tankId: string, rackId: string, boxId: string): BoxConfiguration | undefined => {
    const tanks = currentLab?.equipment.tanks ?? [];
    const tank = tanks.find(t => t.id === tankId);
    const rack = tank?.racks?.find(r => r.id === rackId);
    return rack?.boxes?.find(b => b.id === boxId);
  }, [currentLab]);

  const getBoxPositionDisplay = useCallback((tankId: string, rackId: string, boxId: string): PositionDisplayConfig | undefined => {
    const tanks = currentLab?.equipment.tanks ?? [];
    const tank = tanks.find(t => t.id === tankId);
    const rack = tank?.racks?.find(r => r.id === rackId);
    const box = rack?.boxes?.find(b => b.id === boxId);
    return box?.positionDisplay;
  }, [currentLab]);

  const getAvailableGridTemplates = useCallback((): readonly GridConfiguration[] => {
    return GRID_TEMPLATES;
  }, []);

  return {
    currentLab,
    systemConfig,
    isLoading,
    isError,
    isFetched,
    getCurrentTanks,
    getCurrentRacks,
    getCurrentBoxes,
    getBox,
    getBoxPositionDisplay,
    getAvailableGridTemplates,
  };
}

/**
 * Imperative access to storage data (for services outside React)
 *
 * Use this sparingly - prefer passing data as parameters.
 * This reads from React Query cache, not Zustand.
 */
export function getStorageDataFromCache(queryClient: ReturnType<typeof useQueryClient>): {
  currentLab: LabConfiguration | null;
  systemConfig: SystemConfiguration | null;
} {
  const data = queryClient.getQueryData<{ configuration: { systemConfig: SystemConfiguration; currentLab: LabConfiguration } }>(
    queryKeys.storage.storage()
  );

  return {
    currentLab: data?.configuration.currentLab ?? null,
    systemConfig: data?.configuration.systemConfig ?? null,
  };
}
```

#### 1.2 Export from Domain Index

**File:** `client/src/domains/storage/index.ts`

Add export:
```typescript
export { useStorageData, getStorageDataFromCache } from './hooks/useStorageData';
```

---

### Phase 2: Migrate Read-Only Components

**Goal:** Update all components that only READ from the store (no writes).

#### Files to Update (12 files):

| File | Changes Required |
|------|------------------|
| `Dashboard.tsx` | Replace `useStorageStore(state => state.getCurrentTanks)` with `useStorageData()` |
| `StorageNavigator.tsx` | Replace 3 selectors with `useStorageData()` destructuring |
| `BatchTubeEditorModal.tsx` | Replace 2 selectors with `useStorageData()` destructuring |
| `TubeEditorModal.tsx` | Replace 2 selectors with `useStorageData()` destructuring |
| `TubeGrid.tsx` | Replace `getBox` with `useStorageData()` destructuring |
| `TubeInfoPanel.tsx` | Replace 2 selectors with `useStorageData()` destructuring |
| `LocationDisplay.tsx` | Replace `getCurrentTanks` with `useStorageData()` destructuring |
| `AnimatedTreeLineOverlay.tsx` | Replace `getCurrentTanks` with `useStorageData()` destructuring |
| `PositionDisplaySelector.tsx` | Replace `currentLab` with `useStorageData()` destructuring |
| `FilterPanel.tsx` | Replace `getCurrentTanks` with `useStorageData()` destructuring |
| `SearchResults.tsx` | Replace 2 selectors with `useStorageData()` destructuring |
| `useGridController.ts` | Replace `getBox` with `useStorageData()` destructuring |

#### Example Migration Pattern:

**Before:**
```typescript
import { useStorageStore } from '@domains/storage';

export function MyComponent() {
  const getCurrentTanks = useStorageStore(state => state.getCurrentTanks);
  const getBox = useStorageStore(state => state.getBox);

  const tanks = getCurrentTanks();
  const box = getBox('tank-1', '1', 'A');
  // ...
}
```

**After:**
```typescript
import { useStorageData } from '@domains/storage';

export function MyComponent() {
  const { getCurrentTanks, getBox } = useStorageData();

  const tanks = getCurrentTanks();
  const box = getBox('tank-1', '1', 'A');
  // ...
}
```

---

### Phase 3: Migrate Write Components

**Goal:** Update components that WRITE to the store.

#### 3.1 StorageManagementModal.tsx

**Current pattern (problematic):**
```typescript
const replaceLab = useStorageStore(state => state.replaceLab);
// ... user makes changes to localLab ...
replaceLab(currentLabId, localLab);  // Updates Zustand
await saveConfigurationMutation.mutateAsync({ ... });  // Saves to server
```

**New pattern (correct):**
```typescript
const { currentLab } = useStorageData();
// ... user makes changes to localLab ...
// Skip Zustand update entirely - just save to server
await saveConfigurationMutation.mutateAsync({
  systemConfig: { ...systemConfig, availableLabs: updatedLabs },
  currentLab: localLab,
});
// React Query invalidation will refresh the data automatically
```

**Changes required:**
1. Replace `useStorageStore` imports with `useStorageData`
2. Remove `replaceLab` usage
3. Remove `useStorageStore.getState()` call
4. Rely on mutation + cache invalidation for updates

#### 3.2 useResourceAssignment.ts

**Current pattern:**
```typescript
const updateRack = useStorageStore(state => state.updateRack);
const updateBox = useStorageStore(state => state.updateBox);

// Updates Zustand directly for "optimistic" updates
updateRack(labId, tankId, rackId, { assignedUserId: userId });
```

**New pattern:**
This hook is used by StorageManagementModal for local editing before save.
Since the modal maintains its own `localLab` state, this hook should operate on that local state, not on any store.

**Refactor approach:**
1. Change the hook to accept the lab state as a parameter
2. Return updater functions that work on the passed state
3. The calling component manages the state and calls save when ready

```typescript
export function useResourceAssignment(
  localLab: LabConfiguration,
  setLocalLab: (lab: LabConfiguration) => void
) {
  const assignRack = useCallback((tankId: string, rackId: string, userId: string | undefined) => {
    // Update localLab state
    const updatedLab = assignRackInLab(localLab, tankId, rackId, userId);
    setLocalLab(updatedLab);
  }, [localLab, setLocalLab]);

  // ... similar for other assignment functions
}
```

---

### Phase 4: Migrate Service Files

**Goal:** Update non-React services to work without Zustand.

#### 4.1 gridNavigationService.ts

**Current pattern:**
```typescript
const { useStorageStore } = await import('@/domains/storage');
const { getCurrentRacks, getCurrentBoxes } = useStorageStore.getState();
```

**New pattern - Option A (Pass data as parameter):**
```typescript
public async navigateToTank(tankId: string, currentLab: LabConfiguration): Promise<NavigationResult> {
  const racks = currentLab.equipment.tanks.find(t => t.id === tankId)?.racks ?? [];
  // ...
}
```

**New pattern - Option B (Use queryClient):**
```typescript
import { queryClient } from '@app/queryClient';
import { getStorageDataFromCache } from '@domains/storage';

public async navigateToTank(tankId: string): Promise<NavigationResult> {
  const { currentLab } = getStorageDataFromCache(queryClient);
  const racks = currentLab?.equipment.tanks.find(t => t.id === tankId)?.racks ?? [];
  // ...
}
```

**Recommended:** Option A for cleaner code, Option B if callers can't easily pass data.

#### 4.2 dataConsistencyService.ts

**Analysis:** This service does tank ID correction for legacy data.

**Current pattern:**
```typescript
const configStore = useStorageStore.getState();
const currentTanks = configStore.getCurrentTanks();
// ... reads and writes to store
```

**Recommendation:**
- This service should be evaluated for removal if the consistency issue is no longer occurring
- If needed, refactor to accept `queryClient` and use `getStorageDataFromCache`
- Writes should trigger React Query mutation, not direct Zustand setState

#### 4.3 positionDisplayUtils.ts

**Current pattern:**
```typescript
const state = useStorageStore.getState();
const boxOverride = state.getBoxPositionDisplay(tankId, rackId, boxId);
```

**New pattern (pass data as parameter):**

All functions in this file should accept the data they need as parameters:

```typescript
export function formatPositionForBox(
  position: number,
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  currentLab: LabConfiguration,  // <-- Pass this
  userSettings?: UserSettings | null
): string {
  const config = getResolvedPositionDisplay(tankId, rackId, boxId, gridConfig, currentLab, userSettings);
  return positionToLabel(position, gridConfig.rows, gridConfig.cols, config);
}
```

**Callers update:**
Components using these utilities would need to pass `currentLab` from `useStorageData()`.

---

### Phase 5: Clean Up

**Goal:** Remove deprecated code and simplify architecture.

#### 5.1 Simplify useConfigurationSync.ts

**Keep:**
- Fresh install detection (save defaults to server if no config exists)
- Multi-tab sync (optional - invalidate React Query on storage events)

**Remove:**
- All `useStorageStore.setState()` calls
- Zustand-to-React-Query sync logic

**New implementation:**
```typescript
export function useConfigurationSync() {
  const { data, isSuccess, isError } = useLoadStorageQuery();
  const saveMutation = useSaveStorageMutation();
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);

  // Initialize server with defaults if no config exists (fresh install)
  useEffect(() => {
    if (isError && !hasInitialized.current && !saveMutation.isPending) {
      hasInitialized.current = true;
      // Get defaults and save to server
      const defaults = createDefaultConfiguration();
      saveMutation.mutate(defaults);
    }
  }, [isError, saveMutation]);

  // Multi-tab sync (optional)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'odysseus-configuration-version') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.storage.storage() });
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);

  return {
    isSyncing: !isSuccess && !isError,
    isError: isError && !hasInitialized.current,
    isSynced: isSuccess,
  };
}
```

#### 5.2 Clean Up storageStore.ts

**Remove (server state):**
- `systemConfig` state property
- `currentLab` state property
- `setCurrentLab`, `addLab`, `updateLab`, `replaceLab`, `deleteLab`
- `addTank`, `updateTank`, `deleteTank`, `deleteTankLocally`
- `addRack`, `updateRack`, `deleteRack`
- `updateBox`, `addBoxToRack`, `deleteBox`, `updateBoxGridConfig`
- `getCurrentTanks`, `getCurrentRacks`, `getCurrentBoxes`, `getBox`, `getBoxPositionDisplay`
- `getAvailableGridTemplates`
- `loadFromServer`, `saveToServer`
- `migrateConfigurationStructure`, `ensureDefaultConfiguration`, `initialize`
- `deriveCurrentLab`, `syncedSet` helper functions
- Utility hooks: `useCurrentLab`, `useCurrentTanks`, `useCurrentRacks`, `useCurrentBoxes`, `useGridTemplates`
- Persist middleware (no longer needed for server state)

**Keep (if any UI state exists):**
- Any UI-only state (expanded nodes, selections not stored elsewhere)
- If nothing remains, the file can be deleted entirely

#### 5.3 Update Domain Exports

**File:** `client/src/domains/storage/index.ts`

**Remove:**
```typescript
export * from './stores/storageStore';
```

**Keep:**
```typescript
export { useStorageData, getStorageDataFromCache } from './hooks/useStorageData';
```

---

## Implementation Order (Recommended)

1. **Phase 1** - Create foundation (30 min)
   - Create `useStorageData` hook
   - Add exports
   - Test that both old and new patterns work

2. **Phase 2** - Migrate read-only components (1 hour)
   - Update 12 files one by one
   - Test each component after migration
   - Commit after each successful migration

3. **Phase 3** - Migrate write components (45 min)
   - StorageManagementModal (most complex)
   - useResourceAssignment

4. **Phase 4** - Migrate services (30 min)
   - positionDisplayUtils (most impactful)
   - gridNavigationService
   - dataConsistencyService

5. **Phase 5** - Clean up (30 min)
   - Simplify useConfigurationSync
   - Clean up storageStore (or delete)
   - Update exports
   - Final testing

---

## Risk Mitigation

### Potential Issues:

1. **Stale closures** - Getters might capture old data
   - Mitigation: Use `useCallback` with proper dependencies

2. **Race conditions during save** - Optimistic updates vs server response
   - Mitigation: React Query handles this with automatic refetch on invalidation

3. **Service file timing** - Services might read before React Query is populated
   - Mitigation: Add null checks, handle loading states

4. **Multi-tab sync** - Different tabs might see different versions
   - Mitigation: Use storage events to trigger React Query invalidation

### Rollback Strategy:

If issues arise:
1. The old Zustand code remains functional during migration
2. Can revert individual files without affecting others
3. Phase 1-4 are additive (don't break existing code)
4. Only Phase 5 is destructive (removes old code)

---

## Post-Migration Verification

Run through complete testing checklist:

- [ ] Storage Management modal opens with correct data
- [ ] Can edit tank/rack/box configuration
- [ ] Label changes save and display immediately
- [ ] Assignment changes save and display immediately
- [ ] Tube editor shows correct location dropdowns
- [ ] Grid navigation (tank/rack/box) works
- [ ] Search filters populate correctly
- [ ] Search results show correct locations
- [ ] Position display formatting works (numeric/alphanumeric)
- [ ] Fresh install flow works (creates default config)
- [ ] Multi-tab: changes in one tab appear in another
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
