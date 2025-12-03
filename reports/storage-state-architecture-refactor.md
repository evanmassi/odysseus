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
