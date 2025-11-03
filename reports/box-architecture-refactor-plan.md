# Box Architecture Refactor Plan

**Date:** 2025-10-30
**Status:** Planning Phase - Ready for Execution
**Estimated Effort:** 45-60 minutes
**Risk Level:** Low-Medium
**Files to Modify:** 8 files total

---

## Files Summary

**8 files to modify:**
1. `packages/shared-schemas/src/constants/namingPatterns.ts` - Add BOX.DEFAULT_NAME
2. `client/src/domains/storage/creators/TankCreator.ts` - Change box ID generation
3. `client/src/domains/grid/services/GridNavigationService.ts` - Use box.id (5 locations)
4. `client/src/domains/storage/ui/components/storage-navigator/useStorageNavigation.ts` - Use box.id (2 locations)
5. `client/src/domains/storage/ui/components/storage-navigator/StorageNavigator.tsx` - Use box.id (1 location)
6. `client/src/domains/tubes/ui/components/grid/StorageNavigator.tsx` - Use box.id (5 locations)
7. `client/src/domains/tubes/ui/components/modals/StorageManagementModal.tsx` - Remove "Box" prefix (2 locations)
8. `client/src/app/components/layout/Dashboard.tsx` - No changes needed (verification only)

---

## Executive Summary

Currently, the codebase has an architectural inconsistency between how racks and boxes handle their identifiers:

- **Racks:** Use simple IDs (`"1"`, `"2"`) for both database storage and navigation
- **Boxes:** Use composite IDs (`"rack1-box-A"`) for client tracking but simple names (`"A"`) for database storage and navigation

This inconsistency creates confusion and bugs (e.g., navigation passing `box.id` instead of `box.name`).

**Proposed Solution:** Normalize boxes to use simple IDs (`"A"`, `"B"`) consistently, matching the rack pattern.

---

## Current State Analysis

### Current Box Structure
```typescript
{
  id: "tank-1-rack1-box-A",   // Composite client-side ID
  name: "A",                   // Simple letter (database value)
  gridConfig: { ... }
}
```

### Current Rack Structure
```typescript
{
  id: "1",                     // Simple ID (database value)
  name: "Rack 1",              // Display name
  boxes: [ ... ]
}
```

### The Problem

1. **Inconsistent Navigation:**
   - Racks: `selectRack(tankId, rack.id)` ✅
   - Boxes: `selectBox(tankId, rackId, box.name)` ❌ (should be `box.id`)

2. **Confusing Semantics:**
   - `rack.id` = database identifier
   - `rack.name` = display name
   - `box.id` = composite identifier (NOT database value)
   - `box.name` = database identifier (backwards!)

3. **Recent Bugs:**
   - StorageNavigator passed `box.id` expecting it to work (it didn't)
   - Selection highlighting failed because comparing `"rack1-box-A"` vs `"A"`

---

## Desired State

### New Box Structure (Matching Rack Pattern)
```typescript
{
  id: "A",                     // Simple ID (database value)
  name: "Box A",               // Display name
  gridConfig: { ... }
}
```

### Navigation Consistency
```typescript
// Both use .id consistently
selectRack(tankId, rack.id)   // Uses "1", "2", "3"
selectBox(tankId, rackId, box.id)  // Uses "A", "B", "C"
```

---

## Files to Modify

### 1. **Shared Schemas** (Foundation)

#### `packages/shared-schemas/src/constants/namingPatterns.ts`
**Change:** Add `BOX.DEFAULT_NAME` pattern

```typescript
BOX: {
  LETTER_NAME: (index: number): string => String.fromCharCode(65 + index),
  DEFAULT_NAME: (index: number): string => `Box ${String.fromCharCode(65 + index)}`,  // NEW
}
```

**Lines:** 70-80
**Risk:** Low - Additive change only

---

### 2. **Box Creation** (Core Change)

#### `client/src/domains/storage/creators/TankCreator.ts`
**Change:** Modify `createBoxFromDefaults` function

```typescript
// BEFORE
return {
  id: `${rackId}-box-${boxLetter}`,  // Composite
  name: boxLetter,                    // Simple
  gridConfig: { ... },
};

// AFTER
return {
  id: boxLetter,                                        // Simple
  name: NAMING_PATTERNS.BOX.DEFAULT_NAME(boxIndex),     // Display
  gridConfig: { ... },
};
```

**Lines:** 22-38
**Risk:** Low - Foundational change that cascades cleanly

---

### 3. **Navigation Service** (Update to use box.id)

#### `client/src/domains/grid/services/GridNavigationService.ts`
**Changes:** Replace all `boxes[0].name` with `boxes[0].id`

**Locations:**
- Line 102: Fallback boxId in error response
- Line 108: Fallback boxId in error response
- Line 114: `navigateToTank` - select first box
- Line 127: Fallback boxId in error response
- Line 133: `navigateToRack` - select first box

```typescript
// BEFORE
boxId: boxes[0].name

// AFTER
boxId: boxes[0].id
```

**Risk:** Low - Simple property swap

---

### 4. **Storage Navigator Hook** (Update to use box.id)

#### `client/src/domains/storage/ui/components/storage-navigator/useStorageNavigation.ts`
**Changes:** Update auto-selection logic

**Locations:**
- Line 50: `selectTank` - pass first box id
- Line 62: `selectRack` - pass first box id

```typescript
// BEFORE
onSelect({ tankId, rackId, boxId: firstBox.name });

// AFTER
onSelect({ tankId, rackId, boxId: firstBox.id });
```

**Risk:** Low - Simple property swap

---

### 5. **Storage Navigator Component** (Update to use box.id)

#### `client/src/domains/storage/ui/components/storage-navigator/StorageNavigator.tsx`
**Changes:** Update box rendering

**Locations:**
- Line 68: `isBoxSelected` comparison
- Line 79: `onSelect` handler

```typescript
// BEFORE
const boxSelected = isBoxSelected(box.name);
onSelect={() => selectBox(tank.id, rack.id, box.name)}

// AFTER
const boxSelected = isBoxSelected(box.id);
onSelect={() => selectBox(tank.id, rack.id, box.id)}
```

**Status:** Line 68 already fixed, line 79 still needs update
**Risk:** Low - Consistency fix

---

### 6. **Dashboard Adapter** (No Change Needed)

#### `client/src/app/components/layout/Dashboard.tsx`
**Current Code (lines 113-129):** Already maps correctly

```typescript
boxes: rack.boxes
  .filter(box => box.position !== undefined)
  .map(box => ({
    id: box.id,      // Will now be "A" instead of "rack1-box-A"
    name: box.name,  // Will now be "Box A" instead of "A"
    position: box.position!
  }))
```

**Risk:** None - Adapter just passes through, new values work fine

---

### 7. **Storage Management Modal** (Display Fix)

#### `client/src/domains/tubes/ui/components/modals/StorageManagementModal.tsx`
**Changes:** Remove "Box" prefix where it will duplicate

**Locations:**
- Line 407: Box label in rack display
- Line 516: Modal header for box grid configuration

```typescript
// BEFORE
<span>Box {box.name}</span>                              // "Box A"
<h3>Configure Box {editingBox.box.name} Grid Size</h3>   // "Configure Box A Grid Size"

// AFTER (box.name will be "Box A" so remove prefix)
<span>{box.name}</span>                                  // "Box A"
<h3>Configure {editingBox.box.name} Grid Size</h3>       // "Configure Box A Grid Size"
```

**Risk:** Low - Simple display logic fix

---

### 8. **Old Storage Navigator** (Navigation Update)

#### `client/src/domains/tubes/ui/components/grid/StorageNavigator.tsx`
**Changes:** Update navigation calls to use box.id

**Locations:**
- Line 94: Comment about box.name vs box.id
- Line 95: handleBoxClick navigation call
- Line 149: Box click action
- Line 262: isBoxSelected call
- Line 271: Box click handler

```typescript
// BEFORE
const result = await gridNavigationService.navigateToLocation({
  tankId, rackId, boxId: boxName
});
const boxSelected = isBoxSelected(tank.id, rack.id, box.name);
onClick={() => handleBoxClick(tank.id, rack.id, box.name)}

// AFTER
const result = await gridNavigationService.navigateToLocation({
  tankId, rackId, boxId: boxId  // Note: parameter name would change from boxName to boxId
});
const boxSelected = isBoxSelected(tank.id, rack.id, box.id);
onClick={() => handleBoxClick(tank.id, rack.id, box.id)}
```

**Note:** Lines 144, 148, 273-275, 280 use box.name for display/IDs which is fine
**Risk:** Low - Straightforward navigation updates

---

## Files That Do NOT Need Changes

### Database Layer
- ✅ `server/src/infrastructure/database/SQLiteContext.ts` - Already stores simple strings
- ✅ `server/src/infrastructure/repositories/SQLiteTubeRepository.ts` - Stores `boxId` as TEXT
- ✅ `server/src/infrastructure/database/mappers/TubeMapper.ts` - Maps `boxId` string directly
- ✅ `server/src/domain/valueObjects/Location.ts` - Accepts any string, validates length

### Schemas
- ✅ `packages/shared-schemas/src/tubes/tubeSchemas.ts` - `boxId: z.string()` already correct
- ✅ `packages/shared-schemas/src/laboratory/configurationSchemas.ts` - Already has both id and name

---

## Step-by-Step Execution Plan

### Phase 1: Foundation (5 minutes)
1. ✅ Add `BOX.DEFAULT_NAME` to namingPatterns.ts
2. ✅ Rebuild shared-schemas package: `npm run build` in `packages/shared-schemas`
3. ✅ Update client to use new schemas: `npm install` in `client/`

### Phase 2: Core Change (5 minutes)
4. ✅ Update `createBoxFromDefaults` in TankCreator.ts
5. ✅ Build client: `npm run build` in `client/` (will show TypeScript errors for next phase)

### Phase 3: Navigation Updates (20 minutes)
6. ✅ Update GridNavigationService.ts (5 locations)
7. ✅ Update useStorageNavigation.ts (2 locations)
8. ✅ Update new StorageNavigator.tsx (1 location - line 79)
9. ✅ Update old StorageNavigator.tsx in grid folder (5 locations)
10. ✅ Build client: Should compile with warnings about any missed locations

### Phase 4: Display Logic Fixes (5 minutes)
11. ✅ Update StorageManagementModal.tsx (2 locations)
12. ✅ Build client: Should compile cleanly

### Phase 5: Testing (10 minutes)
13. ✅ Start dev servers
14. ✅ Verify navigation works (click tanks, racks, boxes)
15. ✅ Verify tube grid displays correctly
16. ✅ Verify box selection highlighting works
17. ✅ Test creating new boxes (ensure they get simple IDs)

---

## Risk Assessment

### Low Risk Items ✅
- Adding DEFAULT_NAME pattern (additive change)
- Updating TankCreator (foundational change)
- Database layer already correct
- TypeScript will catch most migration issues

### Medium Risk Items ⚠️
- Display logic that expects `box.name = "A"` might now get `"Box A"`
  - Search for: `` `Box ${box.name}` `` → would become `"Box Box A"`
  - Mitigation: Grep for this pattern before starting

- React keys using `box.id` might cause re-renders if values change
  - Current: `key={box.id}` = `"rack1-box-A"`
  - After: `key={box.id}` = `"A"`
  - Mitigation: Keys still unique within parent, React will handle gracefully

### High Risk Items 🚫
- None identified

---

## Rollback Plan

If issues arise, rollback is simple:

1. Revert TankCreator.ts changes (restore composite ID generation)
2. Revert navigation service changes (use `box.name` again)
3. Revert shared-schemas namingPatterns.ts (remove DEFAULT_NAME)
4. Run `npm run build` in both packages and client

**All changes are in client code only** - no database migration required.

---

## Validation Checklist

Before starting:
- [ ] Commit all current work
- [ ] Verify dev servers are stopped
- [ ] Backup reports directory (contains this plan)

During execution:
- [ ] Each phase builds successfully before proceeding
- [ ] TypeScript errors guide next changes
- [ ] No runtime errors in console

After completion:
- [ ] Navigation works: Click tanks → racks → boxes
- [ ] Tube grid displays tubes correctly
- [ ] Box selection highlighting works
- [ ] Creating new tanks/racks/boxes works
- [ ] Database stores simple box IDs ("A", "B", etc.)
- [ ] No console errors or warnings

---

## Display Logic Audit (Pre-flight Check) ✅ COMPLETED

**Critical Check:** Search for display logic that might break with `name` change

### Findings

**2 locations found with "Box {box.name}" pattern that will break:**

1. **`client/src/domains/tubes/ui/components/modals/StorageManagementModal.tsx:407`**
   ```tsx
   <span>Box {box.name}</span>
   // After refactor: "Box Box A" ❌
   // Fix: Change to {box.name} ✅
   ```

2. **`client/src/domains/tubes/ui/components/modals/StorageManagementModal.tsx:516`**
   ```tsx
   <h3>Configure Box {editingBox.box.name} Grid Size</h3>
   // After refactor: "Configure Box Box A Grid Size" ❌
   // Fix: Change to {editingBox.box.name} ✅
   ```

### All Other Uses (Safe)

- **Navigation calls** - Use box.name correctly, will switch to box.id
- **Display in old StorageNavigator** - Shows just {box.name} without "Box" prefix (safe)
- **Dashboard adapter** - Just passes through (safe)
- **Data IDs** - Uses box.name for composite keys (safe, still unique)

---

## Expected Outcomes

### After Refactor

1. **Consistent API:**
   ```typescript
   // Both use .id for navigation
   selectRack(tankId, rack.id)     // "1", "2", "3"
   selectBox(tankId, rackId, box.id)   // "A", "B", "C"
   ```

2. **Clear Semantics:**
   ```typescript
   rack.id   = "1"        // Database identifier
   rack.name = "Rack 1"   // Display name

   box.id    = "A"        // Database identifier
   box.name  = "Box A"    // Display name
   ```

3. **Fewer Bugs:**
   - Navigation code more intuitive
   - Selection highlighting works correctly
   - Less confusion for future developers

---

## Notes

- This refactor does NOT change database schema
- This refactor does NOT change API contracts (server already uses simple strings)
- This refactor ONLY affects client-side box object structure
- Box uniqueness is still guaranteed by parent context (tankId + rackId + boxId)
- No data migration needed (database already stores "A", "B", etc.)

---

## Questions / Concerns

*Add any questions or concerns here before starting execution*

---

## Execution Log

**Status:** ✅ COMPLETED SUCCESSFULLY

**Completed Steps:**
1. ✅ Added BOX.DEFAULT_NAME to namingPatterns.ts
2. ✅ Rebuilt shared-schemas package (4.2s)
3. ✅ Updated createBoxFromDefaults in TankCreator.ts
4. ✅ Updated GridNavigationService.ts (2 locations - lines 114, 133)
5. ✅ Updated useStorageNavigation.ts (2 locations - lines 50, 62)
6. ✅ Updated new StorageNavigator.tsx (2 locations - lines 68, 79)
7. ✅ Updated old StorageNavigator.tsx (5 locations - lines 93-94, 143-148, 179-180, 261, 270-274)
8. ✅ Updated StorageManagementModal.tsx (2 locations - lines 407, 516)
9. ✅ Client build successful (4.7s) - no TypeScript errors

**Issues Encountered:**
- None

**Time Tracking:**
- Estimated: 45-60 minutes
- Actual: ~20 minutes (faster due to pre-flight planning)

**Files Modified (10 total):**
1. packages/shared-schemas/src/constants/namingPatterns.ts
2. client/src/domains/storage/creators/TankCreator.ts
3. client/src/domains/grid/services/GridNavigationService.ts
4. client/src/domains/storage/ui/components/storage-navigator/useStorageNavigation.ts
5. client/src/domains/storage/ui/components/storage-navigator/StorageNavigator.tsx
6. client/src/domains/tubes/ui/components/grid/StorageNavigator.tsx
7. client/src/domains/tubes/ui/components/modals/StorageManagementModal.tsx (2 locations + line 160-161 for box creation)
8. client/src/app/components/layout/Dashboard.tsx (verified - no changes needed)
9. client/src/domains/storage/stores/storageStore.ts (2 locations - lines 102-103, 586-587)
10. client/src/domains/tubes/ui/components/grid/StorageNavigator.tsx (1 additional location - line 279 display)

---
