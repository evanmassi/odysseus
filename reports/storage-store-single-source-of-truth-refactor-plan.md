# Storage Store Single Source of Truth Refactor Plan

## Executive Summary

**Problem**: `currentLab` is duplicated in two locations (`systemConfig.availableLabs[]` and as separate state), causing synchronization bugs where data gets out of sync.

**Solution**: Remove `currentLab` as stored state and make it a computed getter that derives from `systemConfig.availableLabs[]`.

**Benefits**:
- Impossible to get out of sync (computed from single source)
- Less code (remove all sync logic)
- Easier to reason about
- Prevents future duplication bugs

**Risk Level**: Medium (significant refactoring, but straightforward)

**Estimated Time**: 2-3 hours

---

## Current Architecture Analysis

### Current State (Problematic)
```typescript
interface ConfigurationState {
  systemConfig: SystemConfiguration;  // Contains availableLabs[]
  currentLab: LabConfiguration;       // DUPLICATE - can get out of sync
}
```

**Problems**:
1. Data is duplicated in two places
2. Manual sync code scattered throughout (lines 300, 238, 257, 304)
3. `ConfigurationDto.toResponse()` must populate both locations identically
4. Recent bug: availableLabs had empty tanks while currentLab had tanks

### Target State (Single Source of Truth)
```typescript
interface ConfigurationState {
  systemConfig: SystemConfiguration;  // Single source of truth

  // Computed getter - always in sync
  get currentLab(): LabConfiguration;
}
```

**Improvements**:
1. Data stored once in `systemConfig.availableLabs[]`
2. `currentLab` computed on access
3. No sync logic needed
4. Impossible to get out of sync

---

## Implementation Phases

### Phase 1: Update Store Interface & Add Getter
**Files**:
- `client/src/domains/storage/stores/storageStore.ts`

**Changes**:
1. Remove `currentLab: LabConfiguration` from initial state
2. Add `get currentLab()` as computed getter
3. Keep all action methods temporarily (will update in Phase 2)

**Verification**:
- TypeScript compiles
- Store exports correctly
- Getter returns correct lab from availableLabs

---

### Phase 2: Update All Store Actions
**Files**:
- `client/src/domains/storage/stores/storageStore.ts`

**Actions to Update** (only mutate `systemConfig.availableLabs[]`):
1. `addTank` - Update availableLabs
2. `updateTank` - Update availableLabs
3. `deleteTank` - Update availableLabs
4. `addRack` - Update availableLabs
5. `updateRack` - Update availableLabs
6. `deleteRack` - Update availableLabs
7. `addBoxToRack` - Update availableLabs
8. `updateBox` - Update availableLabs
9. `deleteBox` - Update availableLabs
10. `updateLab` - Update availableLabs
11. `addLab` - Update availableLabs
12. `deleteLab` - Update availableLabs

**Remove Manual Sync Logic**:
- Line 300: `const newCurrentLab = labId === currentLab.id ? updatedLab : currentLab;`
- Line 238: `currentLab: newCurrentLab`
- Line 257: Similar sync patterns
- Line 304: Similar sync patterns

**Pattern**:
```typescript
// OLD (mutates both)
set({
  systemConfig: newSystemConfig,
  currentLab: newCurrentLab  // Manual sync
});

// NEW (mutates only source of truth)
set({
  systemConfig: newSystemConfig
});
// currentLab automatically updates via getter
```

**Verification**:
- TypeScript compiles
- All store actions update correct location
- No manual sync code remains

---

### Phase 3: Update useConfigurationSync Hook
**Files**:
- `client/src/domains/storage/hooks/useConfigurationSync.ts`

**Changes**:
```typescript
// OLD - Sets both
useStorageStore.setState({
  systemConfig: serverSystemConfig,
  currentLab: serverCurrentLab
});

// NEW - Sets only source of truth
useStorageStore.setState({
  systemConfig: {
    ...serverSystemConfig,
    availableLabs: [serverCurrentLab]  // currentLab becomes first availableLab
  }
});
```

**Verification**:
- Server data loads correctly
- `currentLab` getter returns correct lab
- No console errors

---

### Phase 4: Update ConfigurationDto (Server)
**Files**:
- `server/src/application/dto/ConfigurationDto.ts`

**Changes**:
Currently returns:
```typescript
{
  systemConfig: { availableLabs: [lab] },
  currentLab: lab  // Duplicate
}
```

Should return:
```typescript
{
  systemConfig: { availableLabs: [lab] },
  currentLab: lab  // Still needed for API compatibility
}
```

**Decision**: Keep DTO as-is for now. The server response format matches `ConfigurationResponseSchema` which expects both. The change is only in how the CLIENT handles the data.

**No changes needed** - client-side refactor only.

---

### Phase 5: Update Components Using Store Selectors
**Files**:
- `client/src/domains/tubes/ui/components/modals/StorageManagementModal.tsx`
- Any other components using `currentLab`

**Changes**:
```typescript
// OLD - Direct state access
const currentLab = useStorageStore(state => state.currentLab);

// NEW - Same selector, but now calls getter
const currentLab = useStorageStore(state => state.currentLab);
```

**No changes needed** - selectors work the same way with getters!

**Verification**:
- Components still render correctly
- Tank/rack/box data displays
- No re-render issues

---

### Phase 6: Test End-to-End
**Test Cases**:
1. **Load Configuration**:
   - Refresh page
   - Verify tank/rack/box data loads
   - Check console for errors

2. **Update Tank Name**:
   - Change tank name
   - Save
   - Verify success (no 400 error)
   - Refresh page
   - Verify tank name persists

3. **Add/Remove Rack**:
   - Add rack to tank
   - Save
   - Verify rack appears
   - Remove rack
   - Save
   - Verify rack removed

4. **Add/Remove Box**:
   - Add box to rack
   - Save
   - Verify box appears
   - Remove box
   - Save
   - Verify box removed

5. **Navigate Storage**:
   - Click through tanks/racks/boxes in navigator
   - Verify correct data displays
   - No empty box issues

6. **Add Tube**:
   - Add tube to box
   - Verify tube saves
   - Refresh page
   - Verify tube persists

**Verification**:
- All test cases pass
- No console errors
- Data persists across refreshes
- UI updates correctly

---

### Phase 7: Clean Up Debug Logging
**Files**:
- Remove any temporary console.log statements added during debugging

---

## Rollback Plan

If issues arise:
1. Revert changes to `storageStore.ts`
2. Restore manual sync logic
3. Test that original behavior works
4. Investigate root cause
5. Re-attempt with fixes

---

## Files Affected Summary

### Client Files (Primary Changes):
1. `client/src/domains/storage/stores/storageStore.ts` - Major refactor
2. `client/src/domains/storage/hooks/useConfigurationSync.ts` - Minor update

### Client Files (No Changes Needed):
3. `client/src/domains/tubes/ui/components/modals/StorageManagementModal.tsx` - Works with getters
4. `client/src/domains/storage/services/StorageService.ts` - No changes

### Server Files (No Changes):
5. `server/src/application/dto/ConfigurationDto.ts` - Keep as-is

---

## Testing Checklist

### Pre-Implementation:
- [ ] TypeScript compiles successfully
- [ ] Server starts without errors
- [ ] Client starts without errors
- [ ] Can load storage page

### Phase 1:
- [ ] TypeScript compiles with getter
- [ ] Store exports correctly
- [ ] Getter returns correct lab

### Phase 2:
- [ ] TypeScript compiles
- [ ] All store actions updated
- [ ] No manual sync code remains

### Phase 3:
- [ ] Server data loads
- [ ] currentLab getter works
- [ ] No console errors

### Phase 6 (End-to-End):
- [ ] Load configuration works
- [ ] Update tank name works
- [ ] Add/remove rack works
- [ ] Add/remove box works
- [ ] Navigate storage works
- [ ] Add tube works

### Post-Implementation:
- [ ] TypeScript compiles
- [ ] No console errors
- [ ] All features work
- [ ] Data persists across refreshes

---

## Success Criteria

✅ **Architecture**: Single source of truth for lab configuration
✅ **Code Quality**: No duplication, clean getters, no sync logic
✅ **Functionality**: All existing features work
✅ **Stability**: No new bugs introduced
✅ **Performance**: No performance degradation
✅ **Maintainability**: Easier to understand and modify

---

## Post-Implementation Documentation

After successful implementation, document:
1. Update AGENTS.md if needed (store pattern reference)
2. Add comment in storageStore.ts explaining getter pattern
3. Mark this refactor as complete in reports folder

---

## Risk Mitigation

**Risk**: Breaking existing functionality
**Mitigation**: Test after each phase, have rollback plan

**Risk**: Performance issues with computed getter
**Mitigation**: Getters are fast O(1) array lookups, no performance concern

**Risk**: Zustand doesn't support getters
**Mitigation**: Zustand DOES support getters - verified pattern

**Risk**: Components break with getter
**Mitigation**: Selectors work identically with getters vs stored state

---

## Timeline

- Phase 1: 15 minutes
- Phase 2: 45 minutes
- Phase 3: 15 minutes
- Phase 4: 0 minutes (no changes)
- Phase 5: 0 minutes (no changes)
- Phase 6: 30 minutes (testing)
- Phase 7: 5 minutes (cleanup)

**Total**: ~2 hours

---

## Notes

- This refactoring follows Clean Architecture principles
- Adheres to Single Source of Truth principle
- No breaking changes to API contracts
- Client-side refactor only (server unchanged)
- Maintains existing functionality while improving architecture
