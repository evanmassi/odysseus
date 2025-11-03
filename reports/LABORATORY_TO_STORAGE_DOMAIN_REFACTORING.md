# Domain Refactoring Plan: laboratory → storage

**Issue:** Issue 4.1 - Duplicate Store Names and Poor Domain Naming
**Goal:** Rename `laboratory` domain to `storage` and eliminate `configuration` bridge
**Approach:** Systematic rename with consolidated import paths

---

## Executive Summary

### Problem Statement

1. **Poor Domain Naming:** `laboratory` doesn't describe what it does (manages storage equipment)
2. **Duplicate Files:** Same `configurationStore.ts` name in two domains
3. **Confusing Bridge:** `configuration` domain is just an empty re-export of `laboratory`
4. **Import Ambiguity:** Developers don't know which import path to use

### Solution

**Rename `laboratory` → `storage` and delete the `configuration` bridge**

- ✅ **Better Name:** "storage" accurately describes the domain (tanks, racks, boxes)
- ✅ **Eliminate Duplication:** Single source of truth for storage configuration
- ✅ **Clear Ownership:** Storage equipment configuration lives in `@domains/storage`
- ✅ **Consolidated Imports:** One canonical import path

---

## Scope Analysis

### Files to Rename (Domain Structure)

**Current:** `client/src/domains/laboratory/`
**New:** `client/src/domains/storage/`

**6 files in domain:**
```
laboratory/
├── stores/
│   └── configurationStore.ts       (744 lines) → storage/stores/storageStore.ts
├── hooks/
│   └── useConfigurationQuery.ts    (140 lines) → storage/hooks/useStorageQuery.ts
├── services/
│   └── ConfigurationService.ts     (85 lines)  → storage/services/StorageService.ts
├── creators/
│   └── TankCreator.ts              (117 lines) → storage/creators/TankCreator.ts
├── utils/
│   └── gridHelpers.ts              (71 lines)  → storage/utils/gridHelpers.ts
└── index.ts                        (75 lines)  → storage/index.ts
```

### Files to Delete

**Bridge domain to delete:**
```
configuration/
├── stores/
│   └── configurationStore.ts       (9 lines - just re-export)
└── index.ts                        (8 lines - just re-export)
```

### Import Statements to Update

**Total Affected Files:** 15 unique files
**Total Import Lines:** 18 import statements

**Breakdown:**
- 10 imports from `@domains/laboratory` (9 files)
- 8 imports from `@domains/configuration` (8 files)

---

## Detailed Import Inventory

### Group A: Files Importing from `@domains/laboratory`

**9 files, 10 import statements:**

| File | Line | Current Import | New Import |
|------|------|----------------|------------|
| `useGridDragSelection.ts` | 12 | `from '@domains/laboratory'` | `from '@domains/storage'` |
| `useGridKeyboardNavigation.ts` | 14 | `from '@domains/laboratory'` | `from '@domains/storage'` |
| `SearchResults.tsx` | 3 | `from '@domains/laboratory'` | `from '@domains/storage'` |
| `GridPosition.tsx` | 4 | `from '@domains/laboratory'` | `from '@domains/storage'` |
| `StorageNavigator.tsx` | 21 | `from '@domains/laboratory'` | `from '@domains/storage'` |
| `TubeGrid.tsx` | 9 | `from '@domains/laboratory'` | `from '@domains/storage'` |
| `TubeInfoPanel.tsx` | 6 | `from '@domains/laboratory'` | `from '@domains/storage'` |
| `BatchTubeEditorModal.tsx` | 11 | `from '@domains/laboratory'` | `from '@domains/storage'` |
| `StorageManagementModal.tsx` | 14 | `from '@domains/laboratory'` | `from '@domains/storage'` |
| `StorageManagementModal.tsx` | 19 | `from '@domains/laboratory/creators/TankCreator'` | `from '@domains/storage/creators/TankCreator'` |

**Imported Symbols:**
- `getGridTotalPositions` (3 files)
- `useConfigurationStore` (3 files)
- `GridConfiguration` (1 file)
- `getGridDisplayName` (1 file)
- Various types and creators from `StorageManagementModal`

---

### Group B: Files Importing from `@domains/configuration`

**8 files, 8 import statements:**

| File | Line | Current Import | New Import |
|------|------|----------------|------------|
| `Dashboard.tsx` | 11 | `from '@domains/configuration/stores/configurationStore'` | `from '@domains/storage'` |
| `useGridController.ts` | 13 | `from '@domains/configuration/stores/configurationStore'` | `from '@domains/storage'` |
| `DataConsistencyService.ts` | 1 | `from '@domains/configuration/stores/configurationStore'` | `from '@domains/storage'` |
| `LocationDisplay.tsx` | 11 | `from '@domains/configuration/stores/configurationStore'` | `from '@domains/storage'` |
| `AnimatedTreeLineOverlay.tsx` | 3 | `from '@domains/configuration/stores/configurationStore'` | `from '@domains/storage'` |
| `StorageNavigator.tsx` | 17 | `from '@domains/configuration/stores/configurationStore'` | `from '@domains/storage'` |
| `TubeGrid.tsx` | 6 | `from '@domains/configuration/stores/configurationStore'` | `from '@domains/storage'` |
| `TubeEditorModal.tsx` | 26 | `from '@domains/configuration/stores/configurationStore'` | `from '@domains/storage'` |

**Imported Symbols:**
- `useConfigurationStore` (8 files)
- `useCurrentTanks` (1 file - TubeGrid.tsx line 6)

**Note:** Two files have duplicate imports (importing from both domains):
- `StorageNavigator.tsx` (lines 17 and 21)
- `TubeGrid.tsx` (lines 6 and 9)

---

## File Renaming Strategy

### Store File Renaming

**Problem:** `configurationStore.ts` is too generic and doesn't reflect domain

**Solution:** Rename to `storageStore.ts`

```typescript
// Current
laboratory/stores/configurationStore.ts

// New
storage/stores/storageStore.ts
```

**Why:**
- ✅ Matches domain name (`storage`)
- ✅ Clear what it manages (storage equipment state)
- ✅ Follows pattern: `{domain}Store.ts`

**Export Name:** Keep `useConfigurationStore` or rename to `useStorageStore`?

**Recommendation:** Rename to `useStorageStore` for consistency
- Store manages storage equipment configuration
- Name matches domain and file name
- More discoverable

---

### Service/Hook File Renaming

**1. ConfigurationService.ts → StorageService.ts**

```typescript
// Current
laboratory/services/ConfigurationService.ts
export class ConfigurationService { ... }

// New
storage/services/StorageService.ts
export class StorageService { ... }
```

**2. useConfigurationQuery.ts → useStorageQuery.ts**

```typescript
// Current
laboratory/hooks/useConfigurationQuery.ts
export { useLoadConfigurationQuery, useSaveConfigurationMutation, ... }

// New
storage/hooks/useStorageQuery.ts
export { useLoadStorageQuery, useSaveStorageMutation, ... }
```

**Note:** Hook names should also be updated for consistency

---

## Execution Plan

### Phase 1: Rename Domain Directory

```bash
cd client/src/domains/
mv laboratory storage
```

**Result:** Domain folder renamed, all internal paths preserved

---

### Phase 2: Rename Files Within Domain

```bash
cd storage/

# Rename store file
mv stores/configurationStore.ts stores/storageStore.ts

# Rename service file
mv services/ConfigurationService.ts services/StorageService.ts

# Rename hooks file
mv hooks/useConfigurationQuery.ts hooks/useStorageQuery.ts
```

**Files Renamed:**
- ✅ `configurationStore.ts` → `storageStore.ts`
- ✅ `ConfigurationService.ts` → `StorageService.ts`
- ✅ `useConfigurationQuery.ts` → `useStorageQuery.ts`
- ✅ `TankCreator.ts` (no change)
- ✅ `gridHelpers.ts` (no change)
- ✅ `index.ts` (needs internal updates)

---

### Phase 3: Update Internal Exports (storage/index.ts)

**File:** `storage/index.ts`

**Changes Needed:**

```typescript
// OLD
export {
  useLoadConfigurationQuery,
  useConfigurationExistsQuery,
  useSaveConfigurationMutation,
  useDeleteTankMutation,
  useConfigurationSync,
  configurationQueryKeys,
} from './hooks/useConfigurationQuery';

export { ConfigurationService } from './services/ConfigurationService';
export * from './stores/configurationStore';

// NEW
export {
  useLoadStorageQuery,
  useStorageExistsQuery,
  useSaveStorageMutation,
  useDeleteTankMutation,
  useStorageSync,
  storageQueryKeys,
} from './hooks/useStorageQuery';

export { StorageService } from './services/StorageService';
export * from './stores/storageStore';
```

---

### Phase 4: Update Import Statements (15 files)

**Method:** Use TypeScript compilation to find all broken imports, then fix systematically

#### Group A: Laboratory Imports (9 files)

**Pattern:** Replace `@domains/laboratory` → `@domains/storage`

1. `src/app/hooks/grid/useGridDragSelection.ts:12`
2. `src/app/hooks/grid/useGridKeyboardNavigation.ts:14`
3. `src/domains/search/ui/components/SearchResults.tsx:3`
4. `src/domains/tubes/ui/components/grid/GridPosition.tsx:4`
5. `src/domains/tubes/ui/components/grid/StorageNavigator.tsx:21`
6. `src/domains/tubes/ui/components/grid/TubeGrid.tsx:9`
7. `src/domains/tubes/ui/components/grid/TubeInfoPanel.tsx:6`
8. `src/domains/tubes/ui/components/modals/BatchTubeEditorModal.tsx:11`
9. `src/domains/tubes/ui/components/modals/StorageManagementModal.tsx:14,19`

#### Group B: Configuration Imports (8 files)

**Pattern:** Replace `@domains/configuration/stores/configurationStore` → `@domains/storage`

1. `src/app/components/layout/Dashboard.tsx:11`
2. `src/app/hooks/grid/useGridController.ts:13`
3. `src/domains/tubes/services/DataConsistencyService.ts:1`
4. `src/domains/tubes/ui/components/displays/LocationDisplay.tsx:11`
5. `src/domains/tubes/ui/components/grid/AnimatedTreeLineOverlay.tsx:3`
6. `src/domains/tubes/ui/components/grid/StorageNavigator.tsx:17`
7. `src/domains/tubes/ui/components/grid/TubeGrid.tsx:6`
8. `src/domains/tubes/ui/components/modals/TubeEditorModal.tsx:26`

---

### Phase 5: Update Internal File Imports (3 files)

**Files that need internal import updates:**

**1. storage/stores/storageStore.ts**

Update imports from relative paths:
```typescript
// Line 23 (approximately)
FROM: import { DEFAULT_GRID_CONFIG, GRID_TEMPLATES } from '../utils/gridHelpers';
TO: (no change - relative path still valid)
```

**2. storage/hooks/useStorageQuery.ts**

Update service import:
```typescript
FROM: import { ConfigurationService } from '../services/ConfigurationService';
TO: import { StorageService } from '../services/StorageService';
```

**3. storage/index.ts**

Already covered in Phase 3

---

### Phase 6: Delete Configuration Bridge Domain

```bash
cd client/src/domains/
rm -rf configuration/
```

**Files Deleted:**
- ❌ `configuration/stores/configurationStore.ts`
- ❌ `configuration/index.ts`

---

### Phase 7: TypeScript Verification

```bash
cd client/
npx tsc --noEmit
```

**Expected Result:** 0 errors

**If Errors Found:**
- TypeScript will report exact file paths and line numbers
- Fix each error systematically
- Re-run TypeScript after each fix
- Repeat until 0 errors

---

## Symbol Renaming Decision

### Option A: Keep `useConfigurationStore` (Conservative)

**Pros:**
- Fewer changes
- Configuration is still accurate (it's storage configuration)

**Cons:**
- Doesn't match domain name
- Less discoverable

### Option B: Rename to `useStorageStore` (Recommended)

**Pros:**
- Matches domain name (`storage`)
- Clear and consistent
- Better discoverability

**Cons:**
- More refactoring work (update all usages)

**Recommendation:** **Option B** - Rename to `useStorageStore`

This requires updating all 11 files that use `useConfigurationStore`:
- 3 from laboratory imports
- 8 from configuration imports

---

## Risk Assessment

### Low Risk Areas

✅ **Domain Folder Rename:** Simple directory move
✅ **File Renames:** TypeScript will catch broken imports
✅ **Bridge Deletion:** Only 2 files, fully re-exported
✅ **Import Updates:** TypeScript safety net

### Medium Risk Areas

⚠️ **Symbol Renaming:** If we rename `useConfigurationStore` → `useStorageStore`
- 11 files need updates
- Must update store creation and export
- TypeScript will catch misses

### Mitigation

- Systematic, phased approach
- TypeScript verification after each phase
- Can rollback any phase if issues arise

---

## Success Criteria

✅ Domain renamed: `laboratory/` → `storage/`
✅ Files renamed for consistency
✅ All imports updated to `@domains/storage`
✅ Configuration bridge deleted
✅ TypeScript compilation passes (0 errors)
✅ No duplicate file names
✅ Clear domain ownership

---

## Rollback Plan

If anything goes wrong:

```bash
# Restore from git
git checkout HEAD -- client/src/domains/laboratory
git checkout HEAD -- client/src/domains/configuration

# Remove new storage domain if created
rm -rf client/src/domains/storage

# Revert all import changes
git checkout HEAD -- client/src
```

---

## Post-Refactoring Tasks

1. ✅ Update any documentation referring to `laboratory` domain
2. ✅ Update coding standards to specify `storage` domain for equipment config
3. ✅ Mark Issue 4.1 as complete in naming patterns report
4. ✅ Consider adding README.md to storage domain explaining its purpose

---

## Estimated Time

- **Phase 1-2 (Rename):** 3 minutes
- **Phase 3 (Update exports):** 5 minutes
- **Phase 4-5 (Update imports):** 15 minutes
- **Phase 6 (Delete bridge):** 1 minute
- **Phase 7 (Verify):** 3 minutes
- **Total:** ~27 minutes (if renaming symbols), ~15 minutes (if keeping names)

---

## Decision Points

Before proceeding, confirm:

1. **Domain Name:** ✅ `storage` (approved)
2. **Store File Name:** `storageStore.ts` or `configurationStore.ts`?
3. **Store Hook Name:** `useStorageStore` or `useConfigurationStore`?
4. **Service Class Name:** `StorageService` or `ConfigurationService`?
5. **Hook File Name:** `useStorageQuery.ts` or `useConfigurationQuery.ts`?

**My Recommendation:**
- ✅ `storageStore.ts` + `useStorageStore` (full consistency)
- ✅ `StorageService`
- ✅ `useStorageQuery.ts`

---

**Document Created:** 2025-01-21
**Status:** Ready for execution pending user approval of symbol renaming strategy
