# Phase 3.6 - Nullish Coalescing Investigation (Tier 3)

**Date:** 2025-01-10  
**Total Errors:** 285  
**Risk Level:** HIGHEST - Can silently break business logic  
**Why Most Dangerous:** Changes behavior for 0, false, and '' values  

---

## ⚠️ CRITICAL WARNING ⚠️

Nullish coalescing (`??`) is NOT a simple find-replace for `||`. The behavior changes for:
- **Numbers:** `0` (zero counts, indexes, prices)
- **Strings:** `''` (empty but valid text)
- **Booleans:** `false` (disabled states, flags)

**Every single case must be analyzed individually.**

---

## Executive Summary

Investigated all **285 nullish coalescing errors** across the codebase.

### Error Breakdown by Risk Category:

- **Unknown:** 176 errors
- **Dangerous - Number (0 is valid):** 46 errors
- **Config Default (might be intentional):** 24 errors
- **Safe - Display Name Fallback:** 17 errors
- **Safe - String ID/Reference:** 10 errors
- **Safe - Error Message Fallback:** 6 errors
- **Dangerous - String (empty string might be valid):** 4 errors
- **Config Default - Number:** 1 errors
- **DANGEROUS - Boolean (false is valid):** 1 errors

### Error Breakdown by Risk Level:

- 🔴 **CRITICAL:** 1 errors - DO NOT CHANGE without careful review
- ⚠️ **HIGH:** 46 errors - Likely breaking changes, needs investigation
- ⚠️ **MEDIUM:** 205 errors - Requires case-by-case review
- ✅ **LOW:** 33 errors - Likely safe to change

### Common Patterns Found:

1. **Display Name Fallbacks** - `name || 'Tank 1'` - Usually safe
2. **Grid Size Defaults** - `rows || 9` - HIGH RISK if 0 is valid
3. **Error Message Fallbacks** - `error.message || 'Unknown'` - Usually safe
4. **Config Defaults** - `config.limit || 100` - May be intentional
5. **Boolean Flags** - `enabled || false` - CRITICAL - do not change

---

## Detailed Analysis

### File: `app\bootstrap\useAppBootstrap.ts`

**Errors in this file:** 1  

#### ✅ Error #1 - Line 59

**Risk Category:** Safe - Error Message Fallback  
**Risk Level:** LOW  
**Variable:** `bootstrapState.error`  
**Fallback:** `'Initialization failed'`  

**Current Code:**
```typescript
        return bootstrapState.error || 'Initialization failed';
```

**Business Impact:** Error messages should always be non-empty strings  

**Recommendation:** Safe to change to ??  

**Notes:**
- Error message fallback - safe to change

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `app\components\boundaries\AppErrorBoundary.tsx`

**Errors in this file:** 1  

#### ✅ Error #2 - Line 169

**Risk Category:** Safe - Error Message Fallback  
**Risk Level:** LOW  
**Variable:** `this.state.error?.message`  
**Fallback:** `'Unknown error occurred'`  

**Current Code:**
```typescript
                    {this.state.error?.message || 'Unknown error occurred'}
```

**Business Impact:** Error messages should always be non-empty strings  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = ''
- Test with value = null
- Test with value = undefined
- Test with non-empty string

**Notes:**
- User might intentionally provide empty string - check form validation
- Error message fallback - safe to change

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

⚠️ **CAUTION:** Empty string might be valid user input.

---

### File: `app\components\layout\Dashboard.tsx`

**Errors in this file:** 7  

#### ✅ Error #3 - Line 107

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `currentRackObj?.name`  
**Fallback:** ``Rack ${currentRack`  

**Current Code:**
```typescript
  const rackDisplayName = currentRackObj?.name || `Rack ${currentRack}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #4 - Line 110

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
  const storageHierarchy: StorageHierarchy = useMemo(() => ({
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #5 - Line 161

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript

```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #6 - Line 376

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
                  onBatchEditTubes={handleBatchEditTubes}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #7 - Line 410

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `modalService.tubeEditorModal.positions`  
**Fallback:** `[]`  

**Current Code:**
```typescript
            selectedPositions={new Set(modalService.tubeEditorModal.positions || [])}
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "modalService.tubeEditorModal.positions" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #8 - Line 411

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          />
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #9 - Line 413

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      )}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `app\hooks\grid\useGridController.ts`

**Errors in this file:** 9  

#### ⚠️ Error #10 - Line 96

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      clickTimerRef.current = null;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #11 - Line 96

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      clickTimerRef.current = null;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #12 - Line 392

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript

```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #13 - Line 393

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      // Perform validation if both grid configs are available
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #14 - Line 394

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      if (sourceGridConfig && targetGridConfig) {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #15 - Line 578

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
  // Action methods
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #16 - Line 678

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
        }
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #17 - Line 682

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
        if (clipboard?.operation === 'copy') {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #18 - Line 690

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
    // Grid context menu state
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `app\hooks\grid\useGridKeyboardNavigation.ts`

**Errors in this file:** 1  

#### ⚠️ Error #19 - Line 113

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
        if (shiftKey) {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

### File: `app\hooks\useFieldResolverQuery.ts`

**Errors in this file:** 3  

#### ⚠️ Error #20 - Line 106

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubesQuery.data`  
**Fallback:** `[]`  

**Current Code:**
```typescript
    const tubes = tubesQuery.data || [];
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #21 - Line 142

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `researchersQuery.data`  
**Fallback:** `[]`  

**Current Code:**
```typescript
    const researchers = researchersQuery.data || [];
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #22 - Line 193

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubesQuery.data`  
**Fallback:** `[]`  

**Current Code:**
```typescript
    const tubes = tubesQuery.data || [];
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `app\hooks\useSimpleFieldResolver.ts`

**Errors in this file:** 1  

#### ⚠️ Error #23 - Line 170

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `distribution.set(value, (distribution.get(value)`  
**Fallback:** `0`  

**Current Code:**
```typescript
      distribution.set(value, (distribution.get(value) || 0) + 1);
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `app\services\SessionManager.ts`

**Errors in this file:** 2  

#### ⚠️ Error #24 - Line 125

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `newTokens?.accessToken`  
**Fallback:** `null`  

**Current Code:**
```typescript
      return newTokens?.accessToken || null;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #25 - Line 431

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `this.state.lastRefreshTime?.toLocaleTimeString()`  
**Fallback:** `'Never'`  

**Current Code:**
```typescript
      lastRefresh: this.state.lastRefreshTime?.toLocaleTimeString() || 'Never'
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `app\stores\modalStore.ts`

**Errors in this file:** 2  

#### ⚠️ Error #26 - Line 122

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `config.onCancel`  
**Fallback:** `((`  

**Current Code:**
```typescript
        onCancel: config.onCancel || (() => get().hideDeleteConfirm()),
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #27 - Line 144

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `config.onCancel`  
**Fallback:** `((`  

**Current Code:**
```typescript
        onCancel: config.onCancel || (() => get().hideOverwriteConfirm()),
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\admin\ui\components\AuditLogFilterPanel.tsx`

**Errors in this file:** 21  

#### ⚠️ Error #28 - Line 230

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions`  
**Fallback:** `[]`  

**Current Code:**
```typescript
    const actions = filters.actions || [];
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #29 - Line 239

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.entityTypes`  
**Fallback:** `[]`  

**Current Code:**
```typescript
    const entityTypes = filters.entityTypes || [];
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #30 - Line 289

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.actions?.length`  
**Fallback:** `0`  

**Current Code:**
```typescript
        return filters.actions?.length || 0;
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.actions?.length" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #31 - Line 291

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.entityTypes?.length`  
**Fallback:** `0`  

**Current Code:**
```typescript
        return filters.entityTypes?.length || 0;
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.entityTypes?.length" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #32 - Line 389

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.username`  
**Fallback:** `''`  

**Current Code:**
```typescript
              value={filters.username || ''}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #33 - Line 408

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.entityTypes?.includes(entity.value)`  
**Fallback:** `false`  

**Current Code:**
```typescript
                  isSelected={filters.entityTypes?.includes(entity.value) || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #34 - Line 447

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes(action.value)`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes(action.value) || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #35 - Line 476

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes('tank_created')`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes('tank_created') || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #36 - Line 482

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes('tank_updated')`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes('tank_updated') || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #37 - Line 488

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes('tank_deleted')`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes('tank_deleted') || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #38 - Line 497

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes('rack_created')`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes('rack_created') || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #39 - Line 503

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes('rack_updated')`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes('rack_updated') || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #40 - Line 509

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes('rack_deleted')`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes('rack_deleted') || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #41 - Line 518

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes('box_created')`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes('box_created') || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #42 - Line 524

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes('box_updated')`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes('box_updated') || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #43 - Line 530

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes('box_deleted')`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes('box_deleted') || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #44 - Line 539

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `filters.actions?.includes('lab_name_changed')`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes('lab_name_changed') || false}
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #45 - Line 568

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes(action.value)`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes(action.value) || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #46 - Line 597

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `filters.actions?.includes(action.value)`  
**Fallback:** `false`  

**Current Code:**
```typescript
                      isSelected={filters.actions?.includes(action.value) || false}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #47 - Line 643

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
                  <input
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #48 - Line 650

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
                    aria-label="Filter start date and time"
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

### File: `domains\admin\ui\components\AuditLogViewer.tsx`

**Errors in this file:** 11  

#### ⚠️ Error #49 - Line 101

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `prev.offset`  
**Fallback:** `0`  

**Current Code:**
```typescript
      setFilters(prev => ({ ...prev, offset: (prev.offset || 0) + (prev.limit || 50) }));
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "prev.offset" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #50 - Line 101

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `prev.offset`  
**Fallback:** `0`  

**Current Code:**
```typescript
      setFilters(prev => ({ ...prev, offset: (prev.offset || 0) + (prev.limit || 50) }));
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "prev.offset" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #51 - Line 106

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.offset`  
**Fallback:** `0`  

**Current Code:**
```typescript
    if ((filters.offset || 0) > 0) {
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.offset" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #52 - Line 107

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `prev.offset`  
**Fallback:** `0`  

**Current Code:**
```typescript
      setFilters(prev => ({ ...prev, offset: Math.max(0, (prev.offset || 0) - (prev.limit || 50)) }));
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "prev.offset" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #53 - Line 107

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `prev.offset`  
**Fallback:** `0`  

**Current Code:**
```typescript
      setFilters(prev => ({ ...prev, offset: Math.max(0, (prev.offset || 0) - (prev.limit || 50)) }));
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "prev.offset" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #54 - Line 195

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.offset`  
**Fallback:** `0`  

**Current Code:**
```typescript
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1;
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.offset" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #55 - Line 195

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.offset`  
**Fallback:** `0`  

**Current Code:**
```typescript
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1;
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.offset" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #56 - Line 196

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `pagination?.total`  
**Fallback:** `0`  

**Current Code:**
```typescript
  const totalPages = Math.ceil((pagination?.total || 0) / (filters.limit || 50));
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "pagination?.total" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #57 - Line 346

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.offset`  
**Fallback:** `0`  

**Current Code:**
```typescript
            Showing {(filters.offset || 0) + 1} - {Math.min((filters.offset || 0) + (entries?.length || 0), pagination?.total || 0)} of {(pagination?.total || 0).toLocaleString()}
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.offset" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #58 - Line 346

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.offset`  
**Fallback:** `0`  

**Current Code:**
```typescript
            Showing {(filters.offset || 0) + 1} - {Math.min((filters.offset || 0) + (entries?.length || 0), pagination?.total || 0)} of {(pagination?.total || 0).toLocaleString()}
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.offset" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #59 - Line 352

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.offset`  
**Fallback:** `0`  

**Current Code:**
```typescript
              disabled={(filters.offset || 0) === 0}
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.offset" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\admin\ui\components\tabs\ResearcherManagementTab.tsx`

**Errors in this file:** 1  

#### ⚠️ Error #60 - Line 246

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `researcher.position`  
**Fallback:** `'—'`  

**Current Code:**
```typescript
                    <div className="text-sm text-gray-900">{researcher.position || '—'}</div>
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "researcher.position" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

### File: `domains\admin\ui\components\tabs\SystemConfigTab.tsx`

**Errors in this file:** 3  

#### ⚠️ Error #61 - Line 80

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `stats?.totalTubes`  
**Fallback:** `0`  

**Current Code:**
```typescript
            <div className="text-xl font-bold text-gray-900">{stats?.totalTubes || 0}</div>
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "stats?.totalTubes" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #62 - Line 86

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `stats?.totalUsers`  
**Fallback:** `0`  

**Current Code:**
```typescript
            <div className="text-xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "stats?.totalUsers" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #63 - Line 92

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `stats?.totalResearchers`  
**Fallback:** `0`  

**Current Code:**
```typescript
            <div className="text-xl font-bold text-gray-900">{stats?.totalResearchers || 0}</div>
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "stats?.totalResearchers" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\authentication\ui\components\LoginModal.tsx`

**Errors in this file:** 2  

#### ⚠️ Error #64 - Line 59

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      }
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #65 - Line 87

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
                                    loginError?.toLowerCase().includes('verify your email');
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\authentication\ui\components\RegisterModal.tsx`

**Errors in this file:** 1  

#### ✅ Error #66 - Line 183

**Risk Category:** Safe - Error Message Fallback  
**Risk Level:** LOW  
**Variable:** `result.message`  
**Fallback:** `'Registration failed. Please check your information and try again.'`  

**Current Code:**
```typescript
        const errorMessage = result.message || 'Registration failed. Please check your information and try again.';
```

**Business Impact:** Error messages should always be non-empty strings  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = ''
- Test with value = null
- Test with value = undefined
- Test with non-empty string

**Notes:**
- User might intentionally provide empty string - check form validation
- Error message fallback - safe to change

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

⚠️ **CAUTION:** Empty string might be valid user input.

---

### File: `domains\authentication\ui\components\tabs\AccountTab.tsx`

**Errors in this file:** 6  

#### ⚠️ Error #67 - Line 44

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `profile.department`  
**Fallback:** `''`  

**Current Code:**
```typescript
      setDepartment(profile.department || '');
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #68 - Line 45

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `profile.position`  
**Fallback:** `''`  

**Current Code:**
```typescript
      setPosition(profile.position || '');
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "profile.position" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #69 - Line 75

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `profile.department`  
**Fallback:** `''`  

**Current Code:**
```typescript
      department !== (profile.department || '') ||
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #70 - Line 76

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `profile.position`  
**Fallback:** `''`  

**Current Code:**
```typescript
      position !== (profile.position || '')
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "profile.position" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #71 - Line 107

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `profile?.department`  
**Fallback:** `''`  

**Current Code:**
```typescript
    if (department !== (profile?.department || '')) updateData.department = department.trim() || undefined;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #72 - Line 108

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `profile?.position`  
**Fallback:** `''`  

**Current Code:**
```typescript
    if (position !== (profile?.position || '')) updateData.position = position.trim() || undefined;
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "profile?.position" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\authentication\ui\components\tabs\PositionDisplayPreferenceTab.tsx`

**Errors in this file:** 2  

#### ⚠️ Error #73 - Line 26

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `defaultPositionDisplay?.format`  
**Fallback:** `null`  

**Current Code:**
```typescript
  const currentFormat = defaultPositionDisplay?.format || null;
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "defaultPositionDisplay?.format" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #74 - Line 27

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `savedPositionDisplay?.format`  
**Fallback:** `null`  

**Current Code:**
```typescript
  const savedFormat = savedPositionDisplay?.format || null;
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "savedPositionDisplay?.format" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\authentication\ui\components\tabs\SessionListSection.tsx`

**Errors in this file:** 7  

#### ⚠️ Error #75 - Line 36

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `result.browser.name`  
**Fallback:** `'Unknown Browser'`  

**Current Code:**
```typescript
    const browser = result.browser.name || 'Unknown Browser';
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "result.browser.name" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #76 - Line 37

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
    const browserVersion = result.browser.version?.split('.')[0] || '';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #77 - Line 38

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `result.os.name`  
**Fallback:** `'Unknown OS'`  

**Current Code:**
```typescript
    const os = result.os.name || 'Unknown OS';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #78 - Line 39

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `result.os.version`  
**Fallback:** `''`  

**Current Code:**
```typescript
    const osVersion = result.os.version || '';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #79 - Line 40

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `result.device.type`  
**Fallback:** `'desktop'`  

**Current Code:**
```typescript
    const deviceType = result.device.type || 'desktop';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #80 - Line 170

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `session.ipAddress`  
**Fallback:** `'Unknown'`  

**Current Code:**
```typescript
                    <p className="text-sm text-gray-700">{session.ipAddress || 'Unknown'}</p>
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #81 - Line 244

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `session.ipAddress`  
**Fallback:** `'Unknown'`  

**Current Code:**
```typescript
                <p><span className="font-medium">Location:</span> {session.ipAddress || 'Unknown'}</p>
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\researchers\hooks\useResearchersQuery.ts`

**Errors in this file:** 2  

#### ⚠️ Error #82 - Line 34

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `options`  
**Fallback:** `{`  

**Current Code:**
```typescript
  const { filters, queryOptions } = options || {};
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #83 - Line 55

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `options`  
**Fallback:** `{`  

**Current Code:**
```typescript
  const { filters, queryOptions } = options || {};
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\researchers\services\ResearcherService.ts`

**Errors in this file:** 1  

#### ⚠️ Error #84 - Line 35

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `options`  
**Fallback:** `{`  

**Current Code:**
```typescript
    const { admin = false, filters } = options || {};
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\search\lib\searchUtils.ts`

**Errors in this file:** 5  

#### ⚠️ Error #85 - Line 29

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tube.sample.cellType`  
**Fallback:** `'Unknown'`  

**Current Code:**
```typescript
      const key = tube.sample.cellType || 'Unknown';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #86 - Line 73

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tube.sample.donorInternalId`  
**Fallback:** `tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown'`  

**Current Code:**
```typescript
    const currentGroupKey = tube.sample.donorInternalId || tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #87 - Line 73

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tube.sample.donorInternalId`  
**Fallback:** `tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown'`  

**Current Code:**
```typescript
    const currentGroupKey = tube.sample.donorInternalId || tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #88 - Line 73

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tube.sample.donorInternalId`  
**Fallback:** `tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown'`  

**Current Code:**
```typescript
    const currentGroupKey = tube.sample.donorInternalId || tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #89 - Line 73

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tube.sample.donorInternalId`  
**Fallback:** `tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown'`  

**Current Code:**
```typescript
    const currentGroupKey = tube.sample.donorInternalId || tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\search\services\SearchService.ts`

**Errors in this file:** 3  

#### ⚠️ Error #90 - Line 39

**Risk Category:** Config Default - Number  
**Risk Level:** MEDIUM  
**Variable:** `validatedOptions.limit`  
**Fallback:** `50`  

**Current Code:**
```typescript
        limit: validatedOptions.limit || 50,
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "validatedOptions.limit" suggests numeric value where 0 might be valid
- Config/settings often intentionally use || for defaults
- Fallback is 50 - likely a default limit/size config value

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #91 - Line 40

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `validatedOptions.offset`  
**Fallback:** `0`  

**Current Code:**
```typescript
        offset: validatedOptions.offset || 0,
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "validatedOptions.offset" suggests numeric value where 0 might be valid
- Config/settings often intentionally use || for defaults

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #92 - Line 42

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `validatedOptions.sortOrder`  
**Fallback:** `'desc'`  

**Current Code:**
```typescript
        sortOrder: validatedOptions.sortOrder || 'desc'
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

---

### File: `domains\search\stores\searchStore.ts`

**Errors in this file:** 1  

#### ⚠️ Error #93 - Line 106

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
    const currentArray = (filters[filterKey] as string[] | undefined) || [];
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

### File: `domains\search\ui\components\FilterPanel.tsx`

**Errors in this file:** 12  

#### ✅ Error #94 - Line 145

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `tank?.name`  
**Fallback:** ``Tank ${tankId`  

**Current Code:**
```typescript
    return tank?.name || `Tank ${tankId}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #95 - Line 167

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.tankIds?.length`  
**Fallback:** `0`  

**Current Code:**
```typescript
        return (filters.tankIds?.length || 0) + (filters.rackIds?.length || 0) + (filters.boxIds?.length || 0);
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.tankIds?.length" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #96 - Line 167

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.tankIds?.length`  
**Fallback:** `0`  

**Current Code:**
```typescript
        return (filters.tankIds?.length || 0) + (filters.rackIds?.length || 0) + (filters.boxIds?.length || 0);
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.tankIds?.length" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #97 - Line 167

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.tankIds?.length`  
**Fallback:** `0`  

**Current Code:**
```typescript
        return (filters.tankIds?.length || 0) + (filters.rackIds?.length || 0) + (filters.boxIds?.length || 0);
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.tankIds?.length" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #98 - Line 169

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.cellTypes?.length`  
**Fallback:** `0`  

**Current Code:**
```typescript
        return (filters.cellTypes?.length || 0) + (filters.lotNumbers?.length || 0) +
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.cellTypes?.length" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #99 - Line 169

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.cellTypes?.length`  
**Fallback:** `0`  

**Current Code:**
```typescript
        return (filters.cellTypes?.length || 0) + (filters.lotNumbers?.length || 0) +
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.cellTypes?.length" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #100 - Line 170

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.donorInternalIds?.length`  
**Fallback:** `0`  

**Current Code:**
```typescript
               (filters.donorInternalIds?.length || 0) + (filters.donorSourceIds?.length || 0) +
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.donorInternalIds?.length" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #101 - Line 170

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.donorInternalIds?.length`  
**Fallback:** `0`  

**Current Code:**
```typescript
               (filters.donorInternalIds?.length || 0) + (filters.donorSourceIds?.length || 0) +
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.donorInternalIds?.length" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #102 - Line 171

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.cultureConditions?.length`  
**Fallback:** `0`  

**Current Code:**
```typescript
               (filters.cultureConditions?.length || 0);
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.cultureConditions?.length" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #103 - Line 173

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `filters.researcherIds?.length`  
**Fallback:** `0`  

**Current Code:**
```typescript
        return filters.researcherIds?.length || 0;
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "filters.researcherIds?.length" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #104 - Line 545

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
            <input
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #105 - Line 554

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          <div>
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\search\ui\components\SearchResults.tsx`

**Errors in this file:** 17  

#### ⚠️ Error #106 - Line 69

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `firstTubeA.sample?.cellType`  
**Fallback:** `''`  

**Current Code:**
```typescript
          const cellTypeA = firstTubeA.sample?.cellType || '';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #107 - Line 70

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `firstTubeB.sample?.cellType`  
**Fallback:** `''`  

**Current Code:**
```typescript
          const cellTypeB = firstTubeB.sample?.cellType || '';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #108 - Line 85

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `firstTubeA.sample?.lotNumber`  
**Fallback:** `''`  

**Current Code:**
```typescript
          const lotA = firstTubeA.sample?.lotNumber || '';
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "firstTubeA.sample?.lotNumber" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #109 - Line 86

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `firstTubeB.sample?.lotNumber`  
**Fallback:** `''`  

**Current Code:**
```typescript
          const lotB = firstTubeB.sample?.lotNumber || '';
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "firstTubeB.sample?.lotNumber" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ✅ Error #110 - Line 165

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `tank?.name`  
**Fallback:** ``Tank ${tankId`  

**Current Code:**
```typescript
    const tankName = tank?.name || `Tank ${tankId}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #111 - Line 168

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `rack?.name`  
**Fallback:** ``Rack ${rackId`  

**Current Code:**
```typescript
    const rackName = rack?.name || `Rack ${rackId}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #112 - Line 225

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tube.sample.cellType`  
**Fallback:** `''`  

**Current Code:**
```typescript
          tube.sample.cellType || '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ✅ Error #113 - Line 226

**Risk Category:** Safe - String ID/Reference  
**Risk Level:** LOW  
**Variable:** `tube.sample.donorInternalId`  
**Fallback:** `''`  

**Current Code:**
```typescript
          tube.sample.donorInternalId || '',
```

**Business Impact:** Low - Empty string not valid for IDs/references  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = null
- Test with value = undefined
- Test with valid string

**Notes:**
- Empty string not a valid ID - safe to change

---

#### ✅ Error #114 - Line 227

**Risk Category:** Safe - String ID/Reference  
**Risk Level:** LOW  
**Variable:** `tube.sample.donorSourceId`  
**Fallback:** `''`  

**Current Code:**
```typescript
          tube.sample.donorSourceId || '',
```

**Business Impact:** Low - Empty string not valid for IDs/references  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = null
- Test with value = undefined
- Test with valid string

**Notes:**
- Empty string not a valid ID - safe to change

---

#### ⚠️ Error #115 - Line 228

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `tube.sample.lotNumber`  
**Fallback:** `''`  

**Current Code:**
```typescript
          tube.sample.lotNumber || '',
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "tube.sample.lotNumber" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ✅ Error #116 - Line 229

**Risk Category:** Safe - String ID/Reference  
**Risk Level:** LOW  
**Variable:** `tube.researcherId`  
**Fallback:** `''`  

**Current Code:**
```typescript
          tube.researcherId || '',
```

**Business Impact:** Low - Empty string not valid for IDs/references  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = null
- Test with value = undefined
- Test with valid string

**Notes:**
- Empty string not a valid ID - safe to change

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #117 - Line 230

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tube.sample.date`  
**Fallback:** `''`  

**Current Code:**
```typescript
          tube.sample.date || ''
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #118 - Line 373

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `firstTube.sample?.cellType`  
**Fallback:** `'Unknown'`  

**Current Code:**
```typescript
            const cellType = firstTube.sample?.cellType || 'Unknown';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ✅ Error #119 - Line 374

**Risk Category:** Safe - String ID/Reference  
**Risk Level:** LOW  
**Variable:** `firstTube.sample?.donorInternalId`  
**Fallback:** `''`  

**Current Code:**
```typescript
            const donorInternal = firstTube.sample?.donorInternalId || '';
```

**Business Impact:** Low - Empty string not valid for IDs/references  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = null
- Test with value = undefined
- Test with valid string

**Notes:**
- Empty string not a valid ID - safe to change

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ✅ Error #120 - Line 375

**Risk Category:** Safe - String ID/Reference  
**Risk Level:** LOW  
**Variable:** `firstTube.sample?.donorSourceId`  
**Fallback:** `''`  

**Current Code:**
```typescript
            const donorSource = firstTube.sample?.donorSourceId || '';
```

**Business Impact:** Low - Empty string not valid for IDs/references  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = null
- Test with value = undefined
- Test with valid string

**Notes:**
- Empty string not a valid ID - safe to change

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #121 - Line 376

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `firstTube.sample?.cultureCondition`  
**Fallback:** `''`  

**Current Code:**
```typescript
            const cultureCondition = firstTube.sample?.cultureCondition || '';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #122 - Line 377

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `firstTube.sample?.lotNumber`  
**Fallback:** `''`  

**Current Code:**
```typescript
            const lotNumber = firstTube.sample?.lotNumber || '';
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "firstTube.sample?.lotNumber" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

### File: `domains\storage\stores\storageStore.ts`

**Errors in this file:** 3  

#### ⚠️ Error #123 - Line 198

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `lab`  
**Fallback:** `DEFAULT_LAB_CONFIG`  

**Current Code:**
```typescript
        return lab || DEFAULT_LAB_CONFIG;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #124 - Line 538

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tank?.racks`  
**Fallback:** `[]`  

**Current Code:**
```typescript
        const racks = tank?.racks || [];
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #125 - Line 550

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `rack?.boxes`  
**Fallback:** `[]`  

**Current Code:**
```typescript
        return rack?.boxes || [];
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

### File: `domains\storage\ui\components\PositionDisplaySelector.tsx`

**Errors in this file:** 2  

#### ⚠️ Error #126 - Line 148

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `presets.NUMERIC`  
**Fallback:** `{ format: 'numeric' as const`  

**Current Code:**
```typescript
      positionDisplay = presetsData?.presets.NUMERIC || { format: 'numeric' as const };
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "presets.NUMERIC" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #127 - Line 158

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `presets.ALPHANUMERIC_STANDARD`  
**Fallback:** `{`  

**Current Code:**
```typescript
        positionDisplay = presetsData?.presets.ALPHANUMERIC_STANDARD || {
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "presets.ALPHANUMERIC_STANDARD" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\tubes\hooks\useOptimisticTubeMutations.ts`

**Errors in this file:** 1  

#### ⚠️ Error #128 - Line 50

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `variables.researcherId`  
**Fallback:** `UNKNOWN_RESEARCHER`  

**Current Code:**
```typescript
          researcherId: variables.researcherId || UNKNOWN_RESEARCHER,
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\tubes\hooks\useOptimizedTubeQueries.ts`

**Errors in this file:** 1  

#### ⚠️ Error #129 - Line 106

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          t.sample.cellType?.toLowerCase().includes(search) ||
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

### File: `domains\tubes\hooks\useTubeForm.ts`

**Errors in this file:** 11  

#### ⚠️ Error #130 - Line 98

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
   * Validate complete payload with business rules (duplicate position, warnings)
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #131 - Line 225

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `createTubeMutation.error`  
**Fallback:** `updateTubeMutation.error`  

**Current Code:**
```typescript
  const submitError = createTubeMutation.error || updateTubeMutation.error;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #132 - Line 320

**Risk Category:** Safe - String ID/Reference  
**Risk Level:** LOW  
**Variable:** `tubeData.sample.donorInternalId`  
**Fallback:** `''`  

**Current Code:**
```typescript
        donorInternalId: tubeData.sample.donorInternalId || '',
```

**Business Impact:** Low - Empty string not valid for IDs/references  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = null
- Test with value = undefined
- Test with valid string

**Notes:**
- Empty string not a valid ID - safe to change

---

#### ✅ Error #133 - Line 321

**Risk Category:** Safe - String ID/Reference  
**Risk Level:** LOW  
**Variable:** `tubeData.sample.donorSourceId`  
**Fallback:** `''`  

**Current Code:**
```typescript
        donorSourceId: tubeData.sample.donorSourceId || '',
```

**Business Impact:** Low - Empty string not valid for IDs/references  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = null
- Test with value = undefined
- Test with valid string

**Notes:**
- Empty string not a valid ID - safe to change

---

#### ⚠️ Error #134 - Line 324

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.sample.date`  
**Fallback:** `''`  

**Current Code:**
```typescript
        date: tubeData.sample.date || '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #135 - Line 326

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.sample.media?.type`  
**Fallback:** `''`  

**Current Code:**
```typescript
          type: tubeData.sample.media?.type || '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #136 - Line 327

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.sample.media?.supplements`  
**Fallback:** `''`  

**Current Code:**
```typescript
          supplements: tubeData.sample.media?.supplements || '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #137 - Line 328

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.sample.media?.selection`  
**Fallback:** `''`  

**Current Code:**
```typescript
          selection: tubeData.sample.media?.selection || ''
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #138 - Line 330

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.sample.cultureCondition`  
**Fallback:** `''`  

**Current Code:**
```typescript
        cultureCondition: tubeData.sample.cultureCondition || '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #139 - Line 331

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `tubeData.sample.lotNumber`  
**Fallback:** `''`  

**Current Code:**
```typescript
        lotNumber: tubeData.sample.lotNumber || '',
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "tubeData.sample.lotNumber" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #140 - Line 332

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.sample.notes`  
**Fallback:** `''`  

**Current Code:**
```typescript
        notes: tubeData.sample.notes || ''
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

### File: `domains\tubes\hooks\useTubeMutations.ts`

**Errors in this file:** 1  

#### ✅ Error #141 - Line 414

**Risk Category:** Safe - Error Message Fallback  
**Risk Level:** LOW  
**Variable:** `r.error`  
**Fallback:** `'Unknown error'`  

**Current Code:**
```typescript
          error: r.error || 'Unknown error'
```

**Business Impact:** Error messages should always be non-empty strings  

**Recommendation:** Safe to change to ??  

**Notes:**
- Error message fallback - safe to change

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

### File: `domains\tubes\hooks\useTubeQueries.ts`

**Errors in this file:** 8  

#### ⚠️ Error #142 - Line 65

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          tube.sample.cellType?.toLowerCase().includes(searchLower) ||
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #143 - Line 66

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          tube.sample.donorInternalId?.toLowerCase().includes(searchLower) ||
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #144 - Line 67

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          tube.sample.donorSourceId?.toLowerCase().includes(searchLower) ||
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #145 - Line 155

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          tube.sample.cellType?.toLowerCase().includes(searchLower) ||
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #146 - Line 156

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          tube.sample.donorInternalId?.toLowerCase().includes(searchLower) ||
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #147 - Line 157

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          tube.sample.donorSourceId?.toLowerCase().includes(searchLower) ||
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #148 - Line 262

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tankId`  
**Fallback:** `'all'`  

**Current Code:**
```typescript
    queryKey: [...queryKeys.tubes.locationStats(tankId || 'all', rackId || 'all'), boxId || 'all'],
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #149 - Line 262

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tankId`  
**Fallback:** `'all'`  

**Current Code:**
```typescript
    queryKey: [...queryKeys.tubes.locationStats(tankId || 'all', rackId || 'all'), boxId || 'all'],
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\tubes\hooks\useTubesQuery.ts`

**Errors in this file:** 1  

#### ⚠️ Error #150 - Line 52

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
  queryOptions?: Omit<UseQueryOptions<TubeData[], Error, TubeData[]>, 'queryKey' | 'queryFn' | 'select'>;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

### File: `domains\tubes\ui\components\displays\LocationDisplay.tsx`

**Errors in this file:** 4  

#### ✅ Error #151 - Line 41

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `tank?.name`  
**Fallback:** ``Tank ${tankId`  

**Current Code:**
```typescript
    const tankName = tank?.name || `Tank ${tankId}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #152 - Line 44

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `rack?.name`  
**Fallback:** ``Rack ${rackId`  

**Current Code:**
```typescript
    const rackName = rack?.name || `Rack ${rackId}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #153 - Line 47

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `box?.name`  
**Fallback:** ``Box ${boxId`  

**Current Code:**
```typescript
    const boxName = box?.name || `Box ${boxId}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #154 - Line 50

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `box?.gridConfig`  
**Fallback:** `{`  

**Current Code:**
```typescript
    const gridConfig = box?.gridConfig || {
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\tubes\ui\components\fieldRenderers\FieldDisplay.tsx`

**Errors in this file:** 1  

#### ⚠️ Error #155 - Line 112

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
  }[columns] || 'grid-cols-1';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

### File: `domains\tubes\ui\components\forms\TubeForm.tsx`

**Errors in this file:** 2  

#### ⚠️ Error #156 - Line 142

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `value`  
**Fallback:** `''`  

**Current Code:**
```typescript
                      value={String(value || '')}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #157 - Line 143

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unitValue`  
**Fallback:** `''`  

**Current Code:**
```typescript
                      unitValue={unitValue || ''}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

### File: `domains\tubes\ui\components\forms\fields\ConcentrationFieldGroup.tsx`

**Errors in this file:** 1  

#### ⚠️ Error #158 - Line 155

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `concentration`  
**Fallback:** `concentrationUnit ? (`  

**Current Code:**
```typescript
      {concentration || concentrationUnit ? (
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

### File: `domains\tubes\ui\components\grid\GridPosition.tsx`

**Errors in this file:** 6  

#### ⚠️ Error #159 - Line 109

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      }
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #160 - Line 110

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      aria-selected={selected}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #161 - Line 115

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
        ${selected ? 'selected' : ''}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #162 - Line 166

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
            width: `${fontSize.positionFont + 2}px`,
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #163 - Line 168

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          }}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #164 - Line 183

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          {donorInfo.internal && (
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

### File: `domains\tubes\ui\components\grid\TubeGrid.tsx`

**Errors in this file:** 1  

#### ⚠️ Error #165 - Line 74

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `boxConfig?.gridConfig`  
**Fallback:** `{`  

**Current Code:**
```typescript
  const gridConfig = boxConfig?.gridConfig || {
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\tubes\ui\components\grid\TubeInfoPanel.tsx`

**Errors in this file:** 4  

#### ✅ Error #166 - Line 57

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `currentTankObj?.name`  
**Fallback:** `'Unknown Tank'`  

**Current Code:**
```typescript
  const tankName = currentTankObj?.name || 'Unknown Tank';
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

---

#### ✅ Error #167 - Line 58

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `currentRackObj?.name`  
**Fallback:** `'Unknown Rack'`  

**Current Code:**
```typescript
  const rackName = currentRackObj?.name || 'Unknown Rack';
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

---

#### ⚠️ Error #168 - Line 70

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `currentBoxObj?.gridConfig`  
**Fallback:** `{`  

**Current Code:**
```typescript
    const gridConfig = currentBoxObj?.gridConfig || {
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #169 - Line 100

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `currentBoxObj?.gridConfig`  
**Fallback:** `{`  

**Current Code:**
```typescript
    const gridConfig = currentBoxObj?.gridConfig || {
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

### File: `domains\tubes\ui\components\modals\BatchTubeEditorModal.tsx`

**Errors in this file:** 22  

#### ⚠️ Error #170 - Line 67

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
    sample: {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #171 - Line 68

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.sample.cellType`  
**Fallback:** `''`  

**Current Code:**
```typescript
      cellType: tubeData.sample.cellType || '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #172 - Line 69

**Risk Category:** Safe - String ID/Reference  
**Risk Level:** LOW  
**Variable:** `tubeData.sample.donorInternalId`  
**Fallback:** `''`  

**Current Code:**
```typescript
      donorInternalId: tubeData.sample.donorInternalId || '',
```

**Business Impact:** Low - Empty string not valid for IDs/references  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = null
- Test with value = undefined
- Test with valid string

**Notes:**
- Empty string not a valid ID - safe to change

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #173 - Line 72

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      concentrationUnit: tubeData.sample.concentrationUnit,
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #174 - Line 73

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.sample.date`  
**Fallback:** `''`  

**Current Code:**
```typescript
      date: tubeData.sample.date || '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #175 - Line 74

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.sample.media`  
**Fallback:** `{ type: ''`  

**Current Code:**
```typescript
      media: tubeData.sample.media || { type: '', supplements: '', selection: '' },
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #176 - Line 75

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.sample.cultureCondition`  
**Fallback:** `''`  

**Current Code:**
```typescript
      cultureCondition: tubeData.sample.cultureCondition || '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #177 - Line 76

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `tubeData.sample.lotNumber`  
**Fallback:** `''`  

**Current Code:**
```typescript
      lotNumber: tubeData.sample.lotNumber || '',
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "tubeData.sample.lotNumber" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #178 - Line 95

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
  const { data: allTubes = [] } = useTubes();
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #179 - Line 156

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      sample: {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #180 - Line 157

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `analysis.cellType.commonValue`  
**Fallback:** `'' : ''`  

**Current Code:**
```typescript
        cellType: analysis.cellType.state !== 'conflict' ? analysis.cellType.commonValue || '' : '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #181 - Line 158

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `analysis.donorInternalId.commonValue`  
**Fallback:** `'' : ''`  

**Current Code:**
```typescript
        donorInternalId: analysis.donorInternalId.state !== 'conflict' ? analysis.donorInternalId.commonValue || '' : '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #182 - Line 167

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
        media: {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #183 - Line 168

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `commonValue`  
**Fallback:** `'' : ''`  

**Current Code:**
```typescript
          type: analysis['media.type'].state !== 'conflict' ? analysis['media.type'].commonValue || '' : '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #184 - Line 169

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `commonValue`  
**Fallback:** `'' : ''`  

**Current Code:**
```typescript
          supplements: analysis['media.supplements'].state !== 'conflict' ? analysis['media.supplements'].commonValue || '' : '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #185 - Line 171

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
        },
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #186 - Line 172

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `analysis.cultureCondition.commonValue`  
**Fallback:** `'' : ''`  

**Current Code:**
```typescript
        cultureCondition: analysis.cultureCondition.state !== 'conflict' ? analysis.cultureCondition.commonValue || '' : '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #187 - Line 173

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `analysis.lotNumber.commonValue`  
**Fallback:** `'' : ''`  

**Current Code:**
```typescript
        lotNumber: analysis.lotNumber.state !== 'conflict' ? analysis.lotNumber.commonValue || '' : '',
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "analysis.lotNumber.commonValue" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #188 - Line 175

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      },
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #189 - Line 408

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
  const currentRackObj = currentTankObj?.racks?.find(rack => rack.id === rackId);
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #190 - Line 409

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `currentTankObj?.name`  
**Fallback:** `'Unknown Tank'`  

**Current Code:**
```typescript
  const tankName = currentTankObj?.name || 'Unknown Tank';
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #191 - Line 416

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
  const boxObj = getBox(tankId, rackId, boxId);
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\tubes\ui\components\modals\StorageManagementModal.tsx`

**Errors in this file:** 3  

#### ⚠️ Error #192 - Line 523

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          <div
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #193 - Line 574

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
                      >
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #194 - Line 646

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
                <button onClick={() => setEditingRack(null)} className="p-1 hover:bg-gray-100 rounded">
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

### File: `domains\tubes\ui\components\modals\TubeEditorModal.tsx`

**Errors in this file:** 7  

#### ✅ Error #195 - Line 203

**Risk Category:** Safe - Error Message Fallback  
**Risk Level:** LOW  
**Variable:** `result.error`  
**Fallback:** `'Failed to update tube'`  

**Current Code:**
```typescript
        notifications.error(result.error || 'Failed to update tube');
```

**Business Impact:** Error messages should always be non-empty strings  

**Recommendation:** Safe to change to ??  

**Notes:**
- Error message fallback - safe to change

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #196 - Line 399

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `tank?.name`  
**Fallback:** ``Tank ${firstLocation.tankId`  

**Current Code:**
```typescript
    const tankName = tank?.name || `Tank ${firstLocation.tankId}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #197 - Line 402

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `rack?.name`  
**Fallback:** ``Rack ${firstLocation.rackId`  

**Current Code:**
```typescript
    const rackName = rack?.name || `Rack ${firstLocation.rackId}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #198 - Line 405

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `box?.name`  
**Fallback:** ``Box ${firstLocation.boxId`  

**Current Code:**
```typescript
    const boxName = box?.name || `Box ${firstLocation.boxId}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #199 - Line 409

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `boxObj?.gridConfig`  
**Fallback:** `{`  

**Current Code:**
```typescript
    const gridConfig = boxObj?.gridConfig || {
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #200 - Line 501

**Risk Category:** Safe - Error Message Fallback  
**Risk Level:** LOW  
**Variable:** `result.error`  
**Fallback:** `'Unknown error'`  

**Current Code:**
```typescript
            errors.push(`Position ${location.position}: ${result.error || 'Unknown error'}`);
```

**Business Impact:** Error messages should always be non-empty strings  

**Recommendation:** Safe to change to ??  

**Notes:**
- Error message fallback - safe to change

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #201 - Line 534

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `batchLocationDisplay?.positionRanges`  
**Fallback:** `''`  

**Current Code:**
```typescript
        const positionRange = batchLocationDisplay?.positionRanges || '';
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "batchLocationDisplay?.positionRanges" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `domains\tubes\utils\colorSystem.ts`

**Errors in this file:** 9  

#### ⚠️ Error #202 - Line 191

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.donorInternalId`  
**Fallback:** `tubeData.donorSourceId`  

**Current Code:**
```typescript
  if (tubeData.donorInternalId || tubeData.donorSourceId) {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #203 - Line 192

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.donorInternalId`  
**Fallback:** `tubeData.donorSourceId || 'unknown'`  

**Current Code:**
```typescript
    return tubeData.donorInternalId || tubeData.donorSourceId || 'unknown';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #204 - Line 192

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.donorInternalId`  
**Fallback:** `tubeData.donorSourceId || 'unknown'`  

**Current Code:**
```typescript
    return tubeData.donorInternalId || tubeData.donorSourceId || 'unknown';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #205 - Line 209

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.cellType`  
**Fallback:** `tubeData.cellLine || ''`  

**Current Code:**
```typescript
  const cellType = tubeData.cellType || tubeData.cellLine || '';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #206 - Line 210

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `tubeData.lotNumber`  
**Fallback:** `''`  

**Current Code:**
```typescript
  const lotNumber = tubeData.lotNumber || '';
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "tubeData.lotNumber" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #207 - Line 211

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.cultureCondition`  
**Fallback:** `''`  

**Current Code:**
```typescript
  const condition = tubeData.cultureCondition || '';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #208 - Line 385

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `adaptedData.donorInternalId`  
**Fallback:** `adaptedData.donorSourceId`  

**Current Code:**
```typescript
  if (adaptedData.donorInternalId || adaptedData.donorSourceId) {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #209 - Line 387

**Risk Category:** Safe - String ID/Reference  
**Risk Level:** LOW  
**Variable:** `adaptedData.donorInternalId`  
**Fallback:** `''`  

**Current Code:**
```typescript
      internal: formatIdForGrid(adaptedData.donorInternalId || ''),
```

**Business Impact:** Low - Empty string not valid for IDs/references  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = null
- Test with value = undefined
- Test with valid string

**Notes:**
- Empty string not a valid ID - safe to change

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ✅ Error #210 - Line 388

**Risk Category:** Safe - String ID/Reference  
**Risk Level:** LOW  
**Variable:** `adaptedData.donorSourceId`  
**Fallback:** `''`  

**Current Code:**
```typescript
      source: formatIdForGrid(adaptedData.donorSourceId || '')
```

**Business Impact:** Low - Empty string not valid for IDs/references  

**Recommendation:** Safe to change to ??  

**Test Scenarios:**
- Test with value = null
- Test with value = undefined
- Test with valid string

**Notes:**
- Empty string not a valid ID - safe to change

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

### File: `domains\tubes\utils\tubeInfoHelpers.ts`

**Errors in this file:** 3  

#### ⚠️ Error #211 - Line 55

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `tubeData.sample.cellType`  
**Fallback:** `''`  

**Current Code:**
```typescript
      cellType: tubeData.sample.cellType || '',
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #212 - Line 180

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `rackName`  
**Fallback:** ``Rack ${firstTube.location.rackId`  

**Current Code:**
```typescript
const rackDisplay = rackName || `Rack ${firstTube.location.rackId}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ✅ Error #213 - Line 194

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `customTankName`  
**Fallback:** ``Tank ${tubes[0].location.tankId`  

**Current Code:**
```typescript
  return customTankName || `Tank ${tubes[0].location.tankId}`;
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `infrastructure\api\AuthHttpClient.ts`

**Errors in this file:** 1  

#### ⚠️ Error #214 - Line 51

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `config.timeout`  
**Fallback:** `30000`  

**Current Code:**
```typescript
    this.timeout = config.timeout || 30000;
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `infrastructure\api\client.ts`

**Errors in this file:** 2  

#### ⚠️ Error #215 - Line 63

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `config.timeout`  
**Fallback:** `30000`  

**Current Code:**
```typescript
    this.timeout = config.timeout || 30000;
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #216 - Line 133

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `options?.timeout`  
**Fallback:** `this.timeout`  

**Current Code:**
```typescript
    const timeout = options?.timeout || this.timeout;
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `infrastructure\api\httpClient.ts`

**Errors in this file:** 3  

#### ⚠️ Error #217 - Line 38

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `config.baseURL`  
**Fallback:** `'/api'`  

**Current Code:**
```typescript
    this.baseURL = config.baseURL || '/api';
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #218 - Line 39

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `config.timeout`  
**Fallback:** `10000`  

**Current Code:**
```typescript
    this.timeout = config.timeout || 10000;
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #219 - Line 272

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `envelope.pagination`  
**Fallback:** `{`  

**Current Code:**
```typescript
      pagination: envelope.pagination || {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `infrastructure\api\responseTransformers.ts`

**Errors in this file:** 2  

#### ⚠️ Error #220 - Line 76

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `typeName`  
**Fallback:** `'unknown'`  

**Current Code:**
```typescript
    console.warn(`⚠️ [API TRANSFORMER] Using regex fallback for field "${key}" in type "${typeName || 'unknown'}". Consider adding explicit mapping to EXPLICIT_DATE_FIELDS.`);
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #221 - Line 197

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `typeName`  
**Fallback:** `'Unknown'`  

**Current Code:**
```typescript
    console.log(`📅 [DATE FIELDS] ${typeName || 'Unknown'} detected fields:`, dateFields);
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `infrastructure\cache\performanceMonitoring.ts`

**Errors in this file:** 1  

#### ⚠️ Error #222 - Line 104

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `this.queryPerformance.get(queryKey)`  
**Fallback:** `{`  

**Current Code:**
```typescript
    const current = this.queryPerformance.get(queryKey) || {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `infrastructure\connection\networkMonitor.ts`

**Errors in this file:** 1  

#### ⚠️ Error #223 - Line 334

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `this.listeners.get(event)`  
**Fallback:** `[]`  

**Current Code:**
```typescript
    const callbacks = this.listeners.get(event) || [];
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `infrastructure\optimistic\optimisticUpdates.ts`

**Errors in this file:** 1  

#### ⚠️ Error #224 - Line 167

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
          // Show error feedback
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `shared\hooks\keyboard\useTabOrder.ts`

**Errors in this file:** 1  

#### ⚠️ Error #225 - Line 115

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      items.push({
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

### File: `shared\hooks\useFocusManagement.tsx`

**Errors in this file:** 1  

#### ⚠️ Error #226 - Line 68

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `prev.previousZone`  
**Fallback:** `FocusZone.GRID`  

**Current Code:**
```typescript
      activeZone: isOpen ? FocusZone.MODAL : (prev.previousZone || FocusZone.GRID)
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `shared\hooks\useFocusTrap.ts`

**Errors in this file:** 2  

#### ⚠️ Error #227 - Line 36

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `options`  
**Fallback:** `{`  

**Current Code:**
```typescript
  } = options || {};
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #228 - Line 73

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `formElement`  
**Fallback:** `modal`  

**Current Code:**
```typescript
        const searchContext = formElement || modal;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `shared\ui\components\boundaries\ErrorBoundary.tsx`

**Errors in this file:** 7  

#### ⚠️ Error #229 - Line 67

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `name`  
**Fallback:** `level`  

**Current Code:**
```typescript
      aria-label={`Error in ${name || level}`}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #230 - Line 98

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `name`  
**Fallback:** `'Unknown'`  

**Current Code:**
```typescript
              <strong>Component:</strong> {name || 'Unknown'}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #231 - Line 124

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `name`  
**Fallback:** `'Unknown'`  

**Current Code:**
```typescript
              console.group(`🚨 Error Boundary: ${name || 'Unknown'}`);
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #232 - Line 179

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `this.state.errorId`  
**Fallback:** `generateErrorId(`  

**Current Code:**
```typescript
    const errorId = this.state.errorId || generateErrorId();
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #233 - Line 188

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `this.props.name`  
**Fallback:** `'Unknown'`  

**Current Code:**
```typescript
      console.group(`🚨 Error Boundary Caught Error: ${this.props.name || 'Unknown'}`);
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #234 - Line 224

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `this.props.fallback`  
**Fallback:** `DefaultErrorFallback`  

**Current Code:**
```typescript
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #235 - Line 285

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `Component.displayName`  
**Fallback:** `Component.name`  

**Current Code:**
```typescript
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `shared\ui\components\boundaries\SuspenseBoundary.tsx`

**Errors in this file:** 8  

#### ⚠️ Error #236 - Line 50

**Risk Category:** Dangerous - String (empty string might be valid)  
**Risk Level:** MEDIUM  
**Variable:** `ariaLabel`  
**Fallback:** ``Loading ${name || 'component'`  

**Current Code:**
```typescript
    aria-label={ariaLabel || `Loading ${name || 'component'}...`}
```

**Business Impact:** User might intentionally set empty string. Using || treats "" as falsy.  

**Recommendation:** Review if empty string is valid user input  

**Test Scenarios:**
- Test with value = ''
- Test with value = null
- Test with value = undefined
- Test with non-empty string

**Notes:**
- User might intentionally provide empty string - check form validation

⚠️ **CAUTION:** Empty string might be valid user input.

---

#### ⚠️ Error #237 - Line 50

**Risk Category:** Dangerous - String (empty string might be valid)  
**Risk Level:** MEDIUM  
**Variable:** `ariaLabel`  
**Fallback:** ``Loading ${name || 'component'`  

**Current Code:**
```typescript
    aria-label={ariaLabel || `Loading ${name || 'component'}...`}
```

**Business Impact:** User might intentionally set empty string. Using || treats "" as falsy.  

**Recommendation:** Review if empty string is valid user input  

**Test Scenarios:**
- Test with value = ''
- Test with value = null
- Test with value = undefined
- Test with non-empty string

**Notes:**
- User might intentionally provide empty string - check form validation

⚠️ **CAUTION:** Empty string might be valid user input.

---

#### ⚠️ Error #238 - Line 78

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `name`  
**Fallback:** `'component'`  

**Current Code:**
```typescript
        aria-label={`Error loading ${name || 'component'}`}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ✅ Error #239 - Line 89

**Risk Category:** Safe - Display Name Fallback  
**Risk Level:** LOW  
**Variable:** `name`  
**Fallback:** `'component'`  

**Current Code:**
```typescript
          Failed to load {name || 'component'}
```

**Business Impact:** Display names should be non-empty - empty string not valid  

**Recommendation:** Safe to change to ??  

**Notes:**
- Display name with template literal fallback - safe

---

#### ⚠️ Error #240 - Line 108

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `fallback`  
**Fallback:** `(`  

**Current Code:**
```typescript
  const loadingFallback = fallback || (
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #241 - Line 118

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `errorFallback`  
**Fallback:** `defaultErrorFallback`  

**Current Code:**
```typescript
    fallback: errorFallback || defaultErrorFallback,
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #242 - Line 122

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `name`  
**Fallback:** `'Unknown Component'`  

**Current Code:**
```typescript
        console.group(`🚨 Lazy Loading Error: ${name || 'Unknown Component'}`);
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #243 - Line 154

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `LazyComponent.displayName`  
**Fallback:** `LazyComponent.name`  

**Current Code:**
```typescript
  WrappedComponent.displayName = `withSuspenseBoundary(${LazyComponent.displayName || LazyComponent.name})`;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `shared\ui\primitives\button\Button.tsx`

**Errors in this file:** 3  

#### 🔴 Error #244 - Line 248

**Risk Category:** DANGEROUS - Boolean (false is valid)  
**Risk Level:** CRITICAL  
**Variable:** `disabled`  
**Fallback:** `isLoading`  

**Current Code:**
```typescript
    const isDisabled = disabled || isLoading;
```

**Business Impact:** BREAKING - false is a valid boolean value. Using || will ALWAYS treat false as falsy and use fallback!  

**Recommendation:** KEEP || or use explicit !== null && !== undefined check  

**Test Scenarios:**
- Test with value = false
- Test with value = true
- Test with value = null
- Test with value = undefined

**Notes:**
- Variable "disabled" is likely a boolean - DO NOT change to ??

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #245 - Line 289

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `leftIcon`  
**Fallback:** `rightIcon || children`  

**Current Code:**
```typescript
        return leftIcon || rightIcon || children;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #246 - Line 289

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `leftIcon`  
**Fallback:** `rightIcon || children`  

**Current Code:**
```typescript
        return leftIcon || rightIcon || children;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `shared\ui\primitives\grid\Grid.tsx`

**Errors in this file:** 3  

#### ⚠️ Error #247 - Line 335

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `as`  
**Fallback:** `'div'`  

**Current Code:**
```typescript
    const Element = as || 'div';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #248 - Line 382

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `config.column`  
**Fallback:** `config.row`  

**Current Code:**
```typescript
        if (config.column || config.row) {
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "config.column" suggests numeric value where 0 might be valid
- Config/settings often intentionally use || for defaults

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

#### ⚠️ Error #249 - Line 420

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `as`  
**Fallback:** `'div'`  

**Current Code:**
```typescript
    const Element = as || 'div';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `shared\ui\primitives\input\Input.tsx`

**Errors in this file:** 14  

#### ⚠️ Error #250 - Line 409

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `error`  
**Fallback:** `validationResult?.type === 'error'`  

**Current Code:**
```typescript
      if (error || validationResult?.type === 'error') return 'error';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #251 - Line 410

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `warning`  
**Fallback:** `validationResult?.type === 'warning'`  

**Current Code:**
```typescript
      if (warning || validationResult?.type === 'warning') return 'warning';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #252 - Line 411

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `success`  
**Fallback:** `validationResult?.type === 'success'`  

**Current Code:**
```typescript
      if (success || validationResult?.type === 'success') return 'success';
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #253 - Line 429

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `failedResult`  
**Fallback:** `{ isValid: true`  

**Current Code:**
```typescript
        const finalResult = failedResult || { isValid: true, type: 'success' as const };
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #254 - Line 471

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `error`  
**Fallback:** `warning || success || validationResult?.message`  

**Current Code:**
```typescript
      if (error || warning || success || validationResult?.message) {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #255 - Line 471

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `error`  
**Fallback:** `warning || success || validationResult?.message`  

**Current Code:**
```typescript
      if (error || warning || success || validationResult?.message) {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #256 - Line 471

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `error`  
**Fallback:** `warning || success || validationResult?.message`  

**Current Code:**
```typescript
      if (error || warning || success || validationResult?.message) {
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #257 - Line 485

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `leftIcon`  
**Fallback:** `prefix`  

**Current Code:**
```typescript
      hasLeftIcon: Boolean(leftIcon || prefix),
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #258 - Line 486

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `rightIcon`  
**Fallback:** `suffix || isLoading`  

**Current Code:**
```typescript
      hasRightIcon: Boolean(rightIcon || suffix || isLoading),
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #259 - Line 486

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `rightIcon`  
**Fallback:** `suffix || isLoading`  

**Current Code:**
```typescript
      hasRightIcon: Boolean(rightIcon || suffix || isLoading),
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #260 - Line 525

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `leftIcon`  
**Fallback:** `prefix`  

**Current Code:**
```typescript
          {(leftIcon || prefix) && (
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #261 - Line 527

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `leftIcon`  
**Fallback:** `prefix`  

**Current Code:**
```typescript
              {leftIcon || prefix}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #262 - Line 556

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `rightIcon`  
**Fallback:** `suffix`  

**Current Code:**
```typescript
          ) : (rightIcon || suffix) ? (
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #263 - Line 558

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `rightIcon`  
**Fallback:** `suffix`  

**Current Code:**
```typescript
              {rightIcon || suffix}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `shared\ui\primitives\inputs\InlineEditInput.tsx`

**Errors in this file:** 1  

#### ⚠️ Error #264 - Line 63

**Risk Category:** Dangerous - String (empty string might be valid)  
**Risk Level:** MEDIUM  
**Variable:** `placeholder`  
**Fallback:** ``Edit ${fieldName`  

**Current Code:**
```typescript
        placeholder={placeholder || `Edit ${fieldName}`}
```

**Business Impact:** User might intentionally set empty string. Using || treats "" as falsy.  

**Recommendation:** Review if empty string is valid user input  

**Test Scenarios:**
- Test with value = ''
- Test with value = null
- Test with value = undefined
- Test with non-empty string

**Notes:**
- User might intentionally provide empty string - check form validation

⚠️ **CAUTION:** Empty string might be valid user input.

---

### File: `shared\ui\primitives\modal\Modal.tsx`

**Errors in this file:** 8  

#### ⚠️ Error #265 - Line 371

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `backdropClassName`  
**Fallback:** `''`  

**Current Code:**
```typescript
      className: `${backdropClassName || ''} ${className || ''}`
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #266 - Line 371

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `backdropClassName`  
**Fallback:** `''`  

**Current Code:**
```typescript
      className: `${backdropClassName || ''} ${className || ''}`
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #267 - Line 397

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `portalTarget`  
**Fallback:** `(typeof window !== 'undefined' ? document.body : null`  

**Current Code:**
```typescript
    const target = portalTarget || (typeof window !== 'undefined' ? document.body : null);
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #268 - Line 422

**Risk Category:** Dangerous - String (empty string might be valid)  
**Risk Level:** MEDIUM  
**Variable:** `ariaLabelledBy`  
**Fallback:** `headerId`  

**Current Code:**
```typescript
          aria-labelledby={ariaLabelledBy || headerId}
```

**Business Impact:** User might intentionally set empty string. Using || treats "" as falsy.  

**Recommendation:** Review if empty string is valid user input  

**Test Scenarios:**
- Test with value = ''
- Test with value = null
- Test with value = undefined
- Test with non-empty string

**Notes:**
- User might intentionally provide empty string - check form validation

⚠️ **CAUTION:** Empty string might be valid user input.

---

#### ⚠️ Error #269 - Line 423

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `ariaDescribedBy`  
**Fallback:** `bodyId`  

**Current Code:**
```typescript
          aria-describedby={ariaDescribedBy || bodyId}
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #270 - Line 448

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `onClose`  
**Fallback:** `contextOnClose`  

**Current Code:**
```typescript
  const finalOnClose = onClose || contextOnClose;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #271 - Line 449

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `id`  
**Fallback:** `headerId`  

**Current Code:**
```typescript
  const finalId = id || headerId;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

#### ⚠️ Error #272 - Line 480

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `id`  
**Fallback:** `bodyId`  

**Current Code:**
```typescript
  const finalId = id || bodyId;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

### File: `shared\ui\primitives\select\Select.tsx`

**Errors in this file:** 1  

#### ⚠️ Error #273 - Line 214

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `unknown`  
**Fallback:** `unknown`  

**Current Code:**
```typescript
      const currentValue = value !== undefined ? value : selectedValue;
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `shared\ui\primitives\table\Table.tsx`

**Errors in this file:** 2  

#### ⚠️ Error #274 - Line 398

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `rowClassName`  
**Fallback:** `''`  

**Current Code:**
```typescript
          : rowClassName || '';
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "rowClassName" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #275 - Line 530

**Risk Category:** Dangerous - Number (0 is valid)  
**Risk Level:** HIGH  
**Variable:** `maxHeight`  
**Fallback:** `stickyHeader`  

**Current Code:**
```typescript
    if (maxHeight || stickyHeader) {
```

**Business Impact:** CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.  

**Recommendation:** Change to ?? if 0 is a valid value  

**Test Scenarios:**
- Test with value = 0
- Test with value = null
- Test with value = undefined
- Test with positive numbers

**Notes:**
- Variable "maxHeight" suggests numeric value where 0 might be valid

⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!

---

### File: `shared\utils\dateUtils.ts`

**Errors in this file:** 4  

#### ⚠️ Error #276 - Line 71

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `a`  
**Fallback:** `''`  

**Current Code:**
```typescript
  const dateA = normalizeDateString(a || '');
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #277 - Line 72

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `b`  
**Fallback:** `''`  

**Current Code:**
```typescript
  const dateB = normalizeDateString(b || '');
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #278 - Line 93

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `dateString`  
**Fallback:** `''`  

**Current Code:**
```typescript
  const normalized = normalizeDateString(dateString || '');
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #279 - Line 164

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `dateString`  
**Fallback:** `''`  

**Current Code:**
```typescript
  return normalizeDateString(dateString || '');
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

### File: `shared\utils\lazy\lazyComponentUtils.tsx`

**Errors in this file:** 4  

#### ⚠️ Error #280 - Line 77

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `finalConfig.retryAttempts`  
**Fallback:** `3`  

**Current Code:**
```typescript
    for (let attempt = 1; attempt <= (finalConfig.retryAttempts || 3); attempt++) {
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #281 - Line 121

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `finalConfig.retryAttempts`  
**Fallback:** `3`  

**Current Code:**
```typescript
        if (attempt < (finalConfig.retryAttempts || 3)) {
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

---

#### ⚠️ Error #282 - Line 135

**Risk Category:** Config Default (might be intentional)  
**Risk Level:** MEDIUM  
**Variable:** `finalConfig.retryAttempts`  
**Fallback:** `3`  

**Current Code:**
```typescript
        attempts: finalConfig.retryAttempts || 3,
```

**Business Impact:** Config defaults often intentionally treat 0/false/"" as triggers for fallback  

**Recommendation:** Review if current behavior is intentional - might need to keep ||  

**Notes:**
- Config/settings often intentionally use || for defaults

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #283 - Line 144

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `lastError`  
**Fallback:** `new Error(`Failed to load ${componentName`  

**Current Code:**
```typescript
    throw lastError || new Error(`Failed to load ${componentName} after ${finalConfig.retryAttempts} attempts`);
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

---

### File: `shared\utils\validation\zodValidation.ts`

**Errors in this file:** 2  

#### ⚠️ Error #284 - Line 99

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `fieldName`  
**Fallback:** `'field'] || result.error`  

**Current Code:**
```typescript
    error: result.success ? undefined : (result.errors?.[fieldName || 'field'] || result.error)
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

#### ⚠️ Error #285 - Line 99

**Risk Category:** Unknown  
**Risk Level:** MEDIUM  
**Variable:** `fieldName`  
**Fallback:** `'field'] || result.error`  

**Current Code:**
```typescript
    error: result.success ? undefined : (result.errors?.[fieldName || 'field'] || result.error)
```

**Business Impact:** Unknown - requires manual review  

**Recommendation:** Review manually  

🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!

---

## Risk Matrix - All 285 Errors

| # | File | Line | Variable | Fallback | Risk Category | Risk Level |
|---|------|------|----------|----------|---------------|------------|
| 1 | useAppBootstrap.ts | 59 | `bootstrapState.error` | `'Initialization failed'` | Safe - Error Message Fallback | ✅ LOW |
| 2 | AppErrorBoundary.tsx | 169 | `this.state.error?.message` | `'Unknown error occurred'` | Safe - Error Message Fallback | ✅ LOW |
| 3 | Dashboard.tsx | 107 | `currentRackObj?.name` | ``Rack ${currentRack` | Safe - Display Name Fallback | ✅ LOW |
| 4 | Dashboard.tsx | 110 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 5 | Dashboard.tsx | 161 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 6 | Dashboard.tsx | 376 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 7 | Dashboard.tsx | 410 | `modalService.tubeEditorModal.positions` | `[]` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 8 | Dashboard.tsx | 411 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 9 | Dashboard.tsx | 413 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 10 | useGridController.ts | 96 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 11 | useGridController.ts | 96 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 12 | useGridController.ts | 392 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 13 | useGridController.ts | 393 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 14 | useGridController.ts | 394 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 15 | useGridController.ts | 578 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 16 | useGridController.ts | 678 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 17 | useGridController.ts | 682 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 18 | useGridController.ts | 690 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 19 | useGridKeyboardNavigation.ts | 113 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 20 | useFieldResolverQuery.ts | 106 | `tubesQuery.data` | `[]` | Unknown | ⚠️ MEDIUM |
| 21 | useFieldResolverQuery.ts | 142 | `researchersQuery.data` | `[]` | Unknown | ⚠️ MEDIUM |
| 22 | useFieldResolverQuery.ts | 193 | `tubesQuery.data` | `[]` | Unknown | ⚠️ MEDIUM |
| 23 | useSimpleFieldResolver.ts | 170 | `distribution.set(value, (distribution.get(value)` | `0` | Unknown | ⚠️ MEDIUM |
| 24 | SessionManager.ts | 125 | `newTokens?.accessToken` | `null` | Unknown | ⚠️ MEDIUM |
| 25 | SessionManager.ts | 431 | `this.state.lastRefreshTime?.toLocaleTimeString()` | `'Never'` | Unknown | ⚠️ MEDIUM |
| 26 | modalStore.ts | 122 | `config.onCancel` | `((` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 27 | modalStore.ts | 144 | `config.onCancel` | `((` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 28 | AuditLogFilterPanel.tsx | 230 | `filters.actions` | `[]` | Unknown | ⚠️ MEDIUM |
| 29 | AuditLogFilterPanel.tsx | 239 | `filters.entityTypes` | `[]` | Unknown | ⚠️ MEDIUM |
| 30 | AuditLogFilterPanel.tsx | 289 | `filters.actions?.length` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 31 | AuditLogFilterPanel.tsx | 291 | `filters.entityTypes?.length` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 32 | AuditLogFilterPanel.tsx | 389 | `filters.username` | `''` | Unknown | ⚠️ MEDIUM |
| 33 | AuditLogFilterPanel.tsx | 408 | `filters.entityTypes?.includes(entity.value)` | `false` | Unknown | ⚠️ MEDIUM |
| 34 | AuditLogFilterPanel.tsx | 447 | `filters.actions?.includes(action.value)` | `false` | Unknown | ⚠️ MEDIUM |
| 35 | AuditLogFilterPanel.tsx | 476 | `filters.actions?.includes('tank_created')` | `false` | Unknown | ⚠️ MEDIUM |
| 36 | AuditLogFilterPanel.tsx | 482 | `filters.actions?.includes('tank_updated')` | `false` | Unknown | ⚠️ MEDIUM |
| 37 | AuditLogFilterPanel.tsx | 488 | `filters.actions?.includes('tank_deleted')` | `false` | Unknown | ⚠️ MEDIUM |
| 38 | AuditLogFilterPanel.tsx | 497 | `filters.actions?.includes('rack_created')` | `false` | Unknown | ⚠️ MEDIUM |
| 39 | AuditLogFilterPanel.tsx | 503 | `filters.actions?.includes('rack_updated')` | `false` | Unknown | ⚠️ MEDIUM |
| 40 | AuditLogFilterPanel.tsx | 509 | `filters.actions?.includes('rack_deleted')` | `false` | Unknown | ⚠️ MEDIUM |
| 41 | AuditLogFilterPanel.tsx | 518 | `filters.actions?.includes('box_created')` | `false` | Unknown | ⚠️ MEDIUM |
| 42 | AuditLogFilterPanel.tsx | 524 | `filters.actions?.includes('box_updated')` | `false` | Unknown | ⚠️ MEDIUM |
| 43 | AuditLogFilterPanel.tsx | 530 | `filters.actions?.includes('box_deleted')` | `false` | Unknown | ⚠️ MEDIUM |
| 44 | AuditLogFilterPanel.tsx | 539 | `filters.actions?.includes('lab_name_changed')` | `false` | Safe - Display Name Fallback | ✅ LOW |
| 45 | AuditLogFilterPanel.tsx | 568 | `filters.actions?.includes(action.value)` | `false` | Unknown | ⚠️ MEDIUM |
| 46 | AuditLogFilterPanel.tsx | 597 | `filters.actions?.includes(action.value)` | `false` | Unknown | ⚠️ MEDIUM |
| 47 | AuditLogFilterPanel.tsx | 643 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 48 | AuditLogFilterPanel.tsx | 650 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 49 | AuditLogViewer.tsx | 101 | `prev.offset` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 50 | AuditLogViewer.tsx | 101 | `prev.offset` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 51 | AuditLogViewer.tsx | 106 | `filters.offset` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 52 | AuditLogViewer.tsx | 107 | `prev.offset` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 53 | AuditLogViewer.tsx | 107 | `prev.offset` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 54 | AuditLogViewer.tsx | 195 | `filters.offset` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 55 | AuditLogViewer.tsx | 195 | `filters.offset` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 56 | AuditLogViewer.tsx | 196 | `pagination?.total` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 57 | AuditLogViewer.tsx | 346 | `filters.offset` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 58 | AuditLogViewer.tsx | 346 | `filters.offset` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 59 | AuditLogViewer.tsx | 352 | `filters.offset` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 60 | ResearcherManagementTab.tsx | 246 | `researcher.position` | `'—'` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 61 | SystemConfigTab.tsx | 80 | `stats?.totalTubes` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 62 | SystemConfigTab.tsx | 86 | `stats?.totalUsers` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 63 | SystemConfigTab.tsx | 92 | `stats?.totalResearchers` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 64 | LoginModal.tsx | 59 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 65 | LoginModal.tsx | 87 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 66 | RegisterModal.tsx | 183 | `result.message` | `'Registration failed. Please check your information and try again.'` | Safe - Error Message Fallback | ✅ LOW |
| 67 | AccountTab.tsx | 44 | `profile.department` | `''` | Unknown | ⚠️ MEDIUM |
| 68 | AccountTab.tsx | 45 | `profile.position` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 69 | AccountTab.tsx | 75 | `profile.department` | `''` | Unknown | ⚠️ MEDIUM |
| 70 | AccountTab.tsx | 76 | `profile.position` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 71 | AccountTab.tsx | 107 | `profile?.department` | `''` | Unknown | ⚠️ MEDIUM |
| 72 | AccountTab.tsx | 108 | `profile?.position` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 73 | PositionDisplayPreferenceTab.tsx | 26 | `defaultPositionDisplay?.format` | `null` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 74 | PositionDisplayPreferenceTab.tsx | 27 | `savedPositionDisplay?.format` | `null` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 75 | SessionListSection.tsx | 36 | `result.browser.name` | `'Unknown Browser'` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 76 | SessionListSection.tsx | 37 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 77 | SessionListSection.tsx | 38 | `result.os.name` | `'Unknown OS'` | Unknown | ⚠️ MEDIUM |
| 78 | SessionListSection.tsx | 39 | `result.os.version` | `''` | Unknown | ⚠️ MEDIUM |
| 79 | SessionListSection.tsx | 40 | `result.device.type` | `'desktop'` | Unknown | ⚠️ MEDIUM |
| 80 | SessionListSection.tsx | 170 | `session.ipAddress` | `'Unknown'` | Unknown | ⚠️ MEDIUM |
| 81 | SessionListSection.tsx | 244 | `session.ipAddress` | `'Unknown'` | Unknown | ⚠️ MEDIUM |
| 82 | useResearchersQuery.ts | 34 | `options` | `{` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 83 | useResearchersQuery.ts | 55 | `options` | `{` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 84 | ResearcherService.ts | 35 | `options` | `{` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 85 | searchUtils.ts | 29 | `tube.sample.cellType` | `'Unknown'` | Unknown | ⚠️ MEDIUM |
| 86 | searchUtils.ts | 73 | `tube.sample.donorInternalId` | `tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown'` | Unknown | ⚠️ MEDIUM |
| 87 | searchUtils.ts | 73 | `tube.sample.donorInternalId` | `tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown'` | Unknown | ⚠️ MEDIUM |
| 88 | searchUtils.ts | 73 | `tube.sample.donorInternalId` | `tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown'` | Unknown | ⚠️ MEDIUM |
| 89 | searchUtils.ts | 73 | `tube.sample.donorInternalId` | `tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown'` | Unknown | ⚠️ MEDIUM |
| 90 | SearchService.ts | 39 | `validatedOptions.limit` | `50` | Config Default - Number | ⚠️ MEDIUM |
| 91 | SearchService.ts | 40 | `validatedOptions.offset` | `0` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 92 | SearchService.ts | 42 | `validatedOptions.sortOrder` | `'desc'` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 93 | searchStore.ts | 106 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 94 | FilterPanel.tsx | 145 | `tank?.name` | ``Tank ${tankId` | Safe - Display Name Fallback | ✅ LOW |
| 95 | FilterPanel.tsx | 167 | `filters.tankIds?.length` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 96 | FilterPanel.tsx | 167 | `filters.tankIds?.length` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 97 | FilterPanel.tsx | 167 | `filters.tankIds?.length` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 98 | FilterPanel.tsx | 169 | `filters.cellTypes?.length` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 99 | FilterPanel.tsx | 169 | `filters.cellTypes?.length` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 100 | FilterPanel.tsx | 170 | `filters.donorInternalIds?.length` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 101 | FilterPanel.tsx | 170 | `filters.donorInternalIds?.length` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 102 | FilterPanel.tsx | 171 | `filters.cultureConditions?.length` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 103 | FilterPanel.tsx | 173 | `filters.researcherIds?.length` | `0` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 104 | FilterPanel.tsx | 545 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 105 | FilterPanel.tsx | 554 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 106 | SearchResults.tsx | 69 | `firstTubeA.sample?.cellType` | `''` | Unknown | ⚠️ MEDIUM |
| 107 | SearchResults.tsx | 70 | `firstTubeB.sample?.cellType` | `''` | Unknown | ⚠️ MEDIUM |
| 108 | SearchResults.tsx | 85 | `firstTubeA.sample?.lotNumber` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 109 | SearchResults.tsx | 86 | `firstTubeB.sample?.lotNumber` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 110 | SearchResults.tsx | 165 | `tank?.name` | ``Tank ${tankId` | Safe - Display Name Fallback | ✅ LOW |
| 111 | SearchResults.tsx | 168 | `rack?.name` | ``Rack ${rackId` | Safe - Display Name Fallback | ✅ LOW |
| 112 | SearchResults.tsx | 225 | `tube.sample.cellType` | `''` | Unknown | ⚠️ MEDIUM |
| 113 | SearchResults.tsx | 226 | `tube.sample.donorInternalId` | `''` | Safe - String ID/Reference | ✅ LOW |
| 114 | SearchResults.tsx | 227 | `tube.sample.donorSourceId` | `''` | Safe - String ID/Reference | ✅ LOW |
| 115 | SearchResults.tsx | 228 | `tube.sample.lotNumber` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 116 | SearchResults.tsx | 229 | `tube.researcherId` | `''` | Safe - String ID/Reference | ✅ LOW |
| 117 | SearchResults.tsx | 230 | `tube.sample.date` | `''` | Unknown | ⚠️ MEDIUM |
| 118 | SearchResults.tsx | 373 | `firstTube.sample?.cellType` | `'Unknown'` | Unknown | ⚠️ MEDIUM |
| 119 | SearchResults.tsx | 374 | `firstTube.sample?.donorInternalId` | `''` | Safe - String ID/Reference | ✅ LOW |
| 120 | SearchResults.tsx | 375 | `firstTube.sample?.donorSourceId` | `''` | Safe - String ID/Reference | ✅ LOW |
| 121 | SearchResults.tsx | 376 | `firstTube.sample?.cultureCondition` | `''` | Unknown | ⚠️ MEDIUM |
| 122 | SearchResults.tsx | 377 | `firstTube.sample?.lotNumber` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 123 | storageStore.ts | 198 | `lab` | `DEFAULT_LAB_CONFIG` | Unknown | ⚠️ MEDIUM |
| 124 | storageStore.ts | 538 | `tank?.racks` | `[]` | Unknown | ⚠️ MEDIUM |
| 125 | storageStore.ts | 550 | `rack?.boxes` | `[]` | Unknown | ⚠️ MEDIUM |
| 126 | PositionDisplaySelector.tsx | 148 | `presets.NUMERIC` | `{ format: 'numeric' as const` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 127 | PositionDisplaySelector.tsx | 158 | `presets.ALPHANUMERIC_STANDARD` | `{` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 128 | useOptimisticTubeMutations.ts | 50 | `variables.researcherId` | `UNKNOWN_RESEARCHER` | Unknown | ⚠️ MEDIUM |
| 129 | useOptimizedTubeQueries.ts | 106 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 130 | useTubeForm.ts | 98 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 131 | useTubeForm.ts | 225 | `createTubeMutation.error` | `updateTubeMutation.error` | Unknown | ⚠️ MEDIUM |
| 132 | useTubeForm.ts | 320 | `tubeData.sample.donorInternalId` | `''` | Safe - String ID/Reference | ✅ LOW |
| 133 | useTubeForm.ts | 321 | `tubeData.sample.donorSourceId` | `''` | Safe - String ID/Reference | ✅ LOW |
| 134 | useTubeForm.ts | 324 | `tubeData.sample.date` | `''` | Unknown | ⚠️ MEDIUM |
| 135 | useTubeForm.ts | 326 | `tubeData.sample.media?.type` | `''` | Unknown | ⚠️ MEDIUM |
| 136 | useTubeForm.ts | 327 | `tubeData.sample.media?.supplements` | `''` | Unknown | ⚠️ MEDIUM |
| 137 | useTubeForm.ts | 328 | `tubeData.sample.media?.selection` | `''` | Unknown | ⚠️ MEDIUM |
| 138 | useTubeForm.ts | 330 | `tubeData.sample.cultureCondition` | `''` | Unknown | ⚠️ MEDIUM |
| 139 | useTubeForm.ts | 331 | `tubeData.sample.lotNumber` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 140 | useTubeForm.ts | 332 | `tubeData.sample.notes` | `''` | Unknown | ⚠️ MEDIUM |
| 141 | useTubeMutations.ts | 414 | `r.error` | `'Unknown error'` | Safe - Error Message Fallback | ✅ LOW |
| 142 | useTubeQueries.ts | 65 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 143 | useTubeQueries.ts | 66 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 144 | useTubeQueries.ts | 67 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 145 | useTubeQueries.ts | 155 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 146 | useTubeQueries.ts | 156 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 147 | useTubeQueries.ts | 157 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 148 | useTubeQueries.ts | 262 | `tankId` | `'all'` | Unknown | ⚠️ MEDIUM |
| 149 | useTubeQueries.ts | 262 | `tankId` | `'all'` | Unknown | ⚠️ MEDIUM |
| 150 | useTubesQuery.ts | 52 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 151 | LocationDisplay.tsx | 41 | `tank?.name` | ``Tank ${tankId` | Safe - Display Name Fallback | ✅ LOW |
| 152 | LocationDisplay.tsx | 44 | `rack?.name` | ``Rack ${rackId` | Safe - Display Name Fallback | ✅ LOW |
| 153 | LocationDisplay.tsx | 47 | `box?.name` | ``Box ${boxId` | Safe - Display Name Fallback | ✅ LOW |
| 154 | LocationDisplay.tsx | 50 | `box?.gridConfig` | `{` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 155 | FieldDisplay.tsx | 112 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 156 | TubeForm.tsx | 142 | `value` | `''` | Unknown | ⚠️ MEDIUM |
| 157 | TubeForm.tsx | 143 | `unitValue` | `''` | Unknown | ⚠️ MEDIUM |
| 158 | ConcentrationFieldGroup.tsx | 155 | `concentration` | `concentrationUnit ? (` | Unknown | ⚠️ MEDIUM |
| 159 | GridPosition.tsx | 109 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 160 | GridPosition.tsx | 110 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 161 | GridPosition.tsx | 115 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 162 | GridPosition.tsx | 166 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 163 | GridPosition.tsx | 168 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 164 | GridPosition.tsx | 183 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 165 | TubeGrid.tsx | 74 | `boxConfig?.gridConfig` | `{` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 166 | TubeInfoPanel.tsx | 57 | `currentTankObj?.name` | `'Unknown Tank'` | Safe - Display Name Fallback | ✅ LOW |
| 167 | TubeInfoPanel.tsx | 58 | `currentRackObj?.name` | `'Unknown Rack'` | Safe - Display Name Fallback | ✅ LOW |
| 168 | TubeInfoPanel.tsx | 70 | `currentBoxObj?.gridConfig` | `{` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 169 | TubeInfoPanel.tsx | 100 | `currentBoxObj?.gridConfig` | `{` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 170 | BatchTubeEditorModal.tsx | 67 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 171 | BatchTubeEditorModal.tsx | 68 | `tubeData.sample.cellType` | `''` | Unknown | ⚠️ MEDIUM |
| 172 | BatchTubeEditorModal.tsx | 69 | `tubeData.sample.donorInternalId` | `''` | Safe - String ID/Reference | ✅ LOW |
| 173 | BatchTubeEditorModal.tsx | 72 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 174 | BatchTubeEditorModal.tsx | 73 | `tubeData.sample.date` | `''` | Unknown | ⚠️ MEDIUM |
| 175 | BatchTubeEditorModal.tsx | 74 | `tubeData.sample.media` | `{ type: ''` | Unknown | ⚠️ MEDIUM |
| 176 | BatchTubeEditorModal.tsx | 75 | `tubeData.sample.cultureCondition` | `''` | Unknown | ⚠️ MEDIUM |
| 177 | BatchTubeEditorModal.tsx | 76 | `tubeData.sample.lotNumber` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 178 | BatchTubeEditorModal.tsx | 95 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 179 | BatchTubeEditorModal.tsx | 156 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 180 | BatchTubeEditorModal.tsx | 157 | `analysis.cellType.commonValue` | `'' : ''` | Unknown | ⚠️ MEDIUM |
| 181 | BatchTubeEditorModal.tsx | 158 | `analysis.donorInternalId.commonValue` | `'' : ''` | Unknown | ⚠️ MEDIUM |
| 182 | BatchTubeEditorModal.tsx | 167 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 183 | BatchTubeEditorModal.tsx | 168 | `commonValue` | `'' : ''` | Unknown | ⚠️ MEDIUM |
| 184 | BatchTubeEditorModal.tsx | 169 | `commonValue` | `'' : ''` | Unknown | ⚠️ MEDIUM |
| 185 | BatchTubeEditorModal.tsx | 171 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 186 | BatchTubeEditorModal.tsx | 172 | `analysis.cultureCondition.commonValue` | `'' : ''` | Unknown | ⚠️ MEDIUM |
| 187 | BatchTubeEditorModal.tsx | 173 | `analysis.lotNumber.commonValue` | `'' : ''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 188 | BatchTubeEditorModal.tsx | 175 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 189 | BatchTubeEditorModal.tsx | 408 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 190 | BatchTubeEditorModal.tsx | 409 | `currentTankObj?.name` | `'Unknown Tank'` | Safe - Display Name Fallback | ✅ LOW |
| 191 | BatchTubeEditorModal.tsx | 416 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 192 | StorageManagementModal.tsx | 523 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 193 | StorageManagementModal.tsx | 574 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 194 | StorageManagementModal.tsx | 646 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 195 | TubeEditorModal.tsx | 203 | `result.error` | `'Failed to update tube'` | Safe - Error Message Fallback | ✅ LOW |
| 196 | TubeEditorModal.tsx | 399 | `tank?.name` | ``Tank ${firstLocation.tankId` | Safe - Display Name Fallback | ✅ LOW |
| 197 | TubeEditorModal.tsx | 402 | `rack?.name` | ``Rack ${firstLocation.rackId` | Safe - Display Name Fallback | ✅ LOW |
| 198 | TubeEditorModal.tsx | 405 | `box?.name` | ``Box ${firstLocation.boxId` | Safe - Display Name Fallback | ✅ LOW |
| 199 | TubeEditorModal.tsx | 409 | `boxObj?.gridConfig` | `{` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 200 | TubeEditorModal.tsx | 501 | `result.error` | `'Unknown error'` | Safe - Error Message Fallback | ✅ LOW |
| 201 | TubeEditorModal.tsx | 534 | `batchLocationDisplay?.positionRanges` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 202 | colorSystem.ts | 191 | `tubeData.donorInternalId` | `tubeData.donorSourceId` | Unknown | ⚠️ MEDIUM |
| 203 | colorSystem.ts | 192 | `tubeData.donorInternalId` | `tubeData.donorSourceId || 'unknown'` | Unknown | ⚠️ MEDIUM |
| 204 | colorSystem.ts | 192 | `tubeData.donorInternalId` | `tubeData.donorSourceId || 'unknown'` | Unknown | ⚠️ MEDIUM |
| 205 | colorSystem.ts | 209 | `tubeData.cellType` | `tubeData.cellLine || ''` | Unknown | ⚠️ MEDIUM |
| 206 | colorSystem.ts | 210 | `tubeData.lotNumber` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 207 | colorSystem.ts | 211 | `tubeData.cultureCondition` | `''` | Unknown | ⚠️ MEDIUM |
| 208 | colorSystem.ts | 385 | `adaptedData.donorInternalId` | `adaptedData.donorSourceId` | Unknown | ⚠️ MEDIUM |
| 209 | colorSystem.ts | 387 | `adaptedData.donorInternalId` | `''` | Safe - String ID/Reference | ✅ LOW |
| 210 | colorSystem.ts | 388 | `adaptedData.donorSourceId` | `''` | Safe - String ID/Reference | ✅ LOW |
| 211 | tubeInfoHelpers.ts | 55 | `tubeData.sample.cellType` | `''` | Unknown | ⚠️ MEDIUM |
| 212 | tubeInfoHelpers.ts | 180 | `rackName` | ``Rack ${firstTube.location.rackId` | Safe - Display Name Fallback | ✅ LOW |
| 213 | tubeInfoHelpers.ts | 194 | `customTankName` | ``Tank ${tubes[0].location.tankId` | Safe - Display Name Fallback | ✅ LOW |
| 214 | AuthHttpClient.ts | 51 | `config.timeout` | `30000` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 215 | client.ts | 63 | `config.timeout` | `30000` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 216 | client.ts | 133 | `options?.timeout` | `this.timeout` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 217 | httpClient.ts | 38 | `config.baseURL` | `'/api'` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 218 | httpClient.ts | 39 | `config.timeout` | `10000` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 219 | httpClient.ts | 272 | `envelope.pagination` | `{` | Unknown | ⚠️ MEDIUM |
| 220 | responseTransformers.ts | 76 | `typeName` | `'unknown'` | Unknown | ⚠️ MEDIUM |
| 221 | responseTransformers.ts | 197 | `typeName` | `'Unknown'` | Unknown | ⚠️ MEDIUM |
| 222 | performanceMonitoring.ts | 104 | `this.queryPerformance.get(queryKey)` | `{` | Unknown | ⚠️ MEDIUM |
| 223 | networkMonitor.ts | 334 | `this.listeners.get(event)` | `[]` | Unknown | ⚠️ MEDIUM |
| 224 | optimisticUpdates.ts | 167 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 225 | useTabOrder.ts | 115 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 226 | useFocusManagement.tsx | 68 | `prev.previousZone` | `FocusZone.GRID` | Unknown | ⚠️ MEDIUM |
| 227 | useFocusTrap.ts | 36 | `options` | `{` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 228 | useFocusTrap.ts | 73 | `formElement` | `modal` | Unknown | ⚠️ MEDIUM |
| 229 | ErrorBoundary.tsx | 67 | `name` | `level` | Unknown | ⚠️ MEDIUM |
| 230 | ErrorBoundary.tsx | 98 | `name` | `'Unknown'` | Unknown | ⚠️ MEDIUM |
| 231 | ErrorBoundary.tsx | 124 | `name` | `'Unknown'` | Unknown | ⚠️ MEDIUM |
| 232 | ErrorBoundary.tsx | 179 | `this.state.errorId` | `generateErrorId(` | Unknown | ⚠️ MEDIUM |
| 233 | ErrorBoundary.tsx | 188 | `this.props.name` | `'Unknown'` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 234 | ErrorBoundary.tsx | 224 | `this.props.fallback` | `DefaultErrorFallback` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 235 | ErrorBoundary.tsx | 285 | `Component.displayName` | `Component.name` | Unknown | ⚠️ MEDIUM |
| 236 | SuspenseBoundary.tsx | 50 | `ariaLabel` | ``Loading ${name || 'component'` | Dangerous - String (empty string might be valid) | ⚠️ MEDIUM |
| 237 | SuspenseBoundary.tsx | 50 | `ariaLabel` | ``Loading ${name || 'component'` | Dangerous - String (empty string might be valid) | ⚠️ MEDIUM |
| 238 | SuspenseBoundary.tsx | 78 | `name` | `'component'` | Unknown | ⚠️ MEDIUM |
| 239 | SuspenseBoundary.tsx | 89 | `name` | `'component'` | Safe - Display Name Fallback | ✅ LOW |
| 240 | SuspenseBoundary.tsx | 108 | `fallback` | `(` | Unknown | ⚠️ MEDIUM |
| 241 | SuspenseBoundary.tsx | 118 | `errorFallback` | `defaultErrorFallback` | Unknown | ⚠️ MEDIUM |
| 242 | SuspenseBoundary.tsx | 122 | `name` | `'Unknown Component'` | Unknown | ⚠️ MEDIUM |
| 243 | SuspenseBoundary.tsx | 154 | `LazyComponent.displayName` | `LazyComponent.name` | Unknown | ⚠️ MEDIUM |
| 244 | Button.tsx | 248 | `disabled` | `isLoading` | DANGEROUS - Boolean (false is valid) | 🔴 CRITICAL |
| 245 | Button.tsx | 289 | `leftIcon` | `rightIcon || children` | Unknown | ⚠️ MEDIUM |
| 246 | Button.tsx | 289 | `leftIcon` | `rightIcon || children` | Unknown | ⚠️ MEDIUM |
| 247 | Grid.tsx | 335 | `as` | `'div'` | Unknown | ⚠️ MEDIUM |
| 248 | Grid.tsx | 382 | `config.column` | `config.row` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 249 | Grid.tsx | 420 | `as` | `'div'` | Unknown | ⚠️ MEDIUM |
| 250 | Input.tsx | 409 | `error` | `validationResult?.type === 'error'` | Unknown | ⚠️ MEDIUM |
| 251 | Input.tsx | 410 | `warning` | `validationResult?.type === 'warning'` | Unknown | ⚠️ MEDIUM |
| 252 | Input.tsx | 411 | `success` | `validationResult?.type === 'success'` | Unknown | ⚠️ MEDIUM |
| 253 | Input.tsx | 429 | `failedResult` | `{ isValid: true` | Unknown | ⚠️ MEDIUM |
| 254 | Input.tsx | 471 | `error` | `warning || success || validationResult?.message` | Unknown | ⚠️ MEDIUM |
| 255 | Input.tsx | 471 | `error` | `warning || success || validationResult?.message` | Unknown | ⚠️ MEDIUM |
| 256 | Input.tsx | 471 | `error` | `warning || success || validationResult?.message` | Unknown | ⚠️ MEDIUM |
| 257 | Input.tsx | 485 | `leftIcon` | `prefix` | Unknown | ⚠️ MEDIUM |
| 258 | Input.tsx | 486 | `rightIcon` | `suffix || isLoading` | Unknown | ⚠️ MEDIUM |
| 259 | Input.tsx | 486 | `rightIcon` | `suffix || isLoading` | Unknown | ⚠️ MEDIUM |
| 260 | Input.tsx | 525 | `leftIcon` | `prefix` | Unknown | ⚠️ MEDIUM |
| 261 | Input.tsx | 527 | `leftIcon` | `prefix` | Unknown | ⚠️ MEDIUM |
| 262 | Input.tsx | 556 | `rightIcon` | `suffix` | Unknown | ⚠️ MEDIUM |
| 263 | Input.tsx | 558 | `rightIcon` | `suffix` | Unknown | ⚠️ MEDIUM |
| 264 | InlineEditInput.tsx | 63 | `placeholder` | ``Edit ${fieldName` | Dangerous - String (empty string might be valid) | ⚠️ MEDIUM |
| 265 | Modal.tsx | 371 | `backdropClassName` | `''` | Unknown | ⚠️ MEDIUM |
| 266 | Modal.tsx | 371 | `backdropClassName` | `''` | Unknown | ⚠️ MEDIUM |
| 267 | Modal.tsx | 397 | `portalTarget` | `(typeof window !== 'undefined' ? document.body : null` | Unknown | ⚠️ MEDIUM |
| 268 | Modal.tsx | 422 | `ariaLabelledBy` | `headerId` | Dangerous - String (empty string might be valid) | ⚠️ MEDIUM |
| 269 | Modal.tsx | 423 | `ariaDescribedBy` | `bodyId` | Unknown | ⚠️ MEDIUM |
| 270 | Modal.tsx | 448 | `onClose` | `contextOnClose` | Unknown | ⚠️ MEDIUM |
| 271 | Modal.tsx | 449 | `id` | `headerId` | Unknown | ⚠️ MEDIUM |
| 272 | Modal.tsx | 480 | `id` | `bodyId` | Unknown | ⚠️ MEDIUM |
| 273 | Select.tsx | 214 | `unknown` | `unknown` | Unknown | ⚠️ MEDIUM |
| 274 | Table.tsx | 398 | `rowClassName` | `''` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 275 | Table.tsx | 530 | `maxHeight` | `stickyHeader` | Dangerous - Number (0 is valid) | ⚠️ HIGH |
| 276 | dateUtils.ts | 71 | `a` | `''` | Unknown | ⚠️ MEDIUM |
| 277 | dateUtils.ts | 72 | `b` | `''` | Unknown | ⚠️ MEDIUM |
| 278 | dateUtils.ts | 93 | `dateString` | `''` | Unknown | ⚠️ MEDIUM |
| 279 | dateUtils.ts | 164 | `dateString` | `''` | Unknown | ⚠️ MEDIUM |
| 280 | lazyComponentUtils.tsx | 77 | `finalConfig.retryAttempts` | `3` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 281 | lazyComponentUtils.tsx | 121 | `finalConfig.retryAttempts` | `3` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 282 | lazyComponentUtils.tsx | 135 | `finalConfig.retryAttempts` | `3` | Config Default (might be intentional) | ⚠️ MEDIUM |
| 283 | lazyComponentUtils.tsx | 144 | `lastError` | `new Error(`Failed to load ${componentName` | Unknown | ⚠️ MEDIUM |
| 284 | zodValidation.ts | 99 | `fieldName` | `'field'] || result.error` | Unknown | ⚠️ MEDIUM |
| 285 | zodValidation.ts | 99 | `fieldName` | `'field'] || result.error` | Unknown | ⚠️ MEDIUM |

---

## Testing Strategy

**For EACH change from `||` to `??`:**

1. **Unit tests:**
   - Test with `value = 0` (for numbers)
   - Test with `value = ''` (for strings)
   - Test with `value = false` (for booleans)
   - Test with `value = null`
   - Test with `value = undefined`
   - Test with valid values

2. **Integration tests:**
   - Test with real user data
   - Test edge cases (pagination limit=0, empty search queries, etc.)

3. **Manual testing:**
   - Test forms with empty inputs
   - Test grids with different sizes
   - Test search with empty queries
   - Test config with all possible values

---

## Recommended Fix Strategy

**Phase 1: LOW Risk (✅ 33 errors, ~2 hours)**
- Error messages, display names, ID fallbacks
- Safe to change to `??`
- Can be semi-automated with careful review

**Phase 2: MEDIUM Risk (⚠️ 205 errors, ~8-12 hours)**
- Config defaults, text fields, search queries
- Requires individual analysis
- Must determine if 0/''/ false are valid

**Phase 3: HIGH Risk (⚠️ 46 errors, ~6-8 hours)**
- Number fields where 0 might be valid
- Requires checking business logic
- May need to change to `??` if 0 is valid

**Phase 4: CRITICAL Risk (🔴 1 errors, ~4-6 hours)**
- Boolean flags and enabled/disabled states
- **DO NOT change to `??`** - will break logic!
- Add eslint-disable comments with explanation

**Total Estimated Time:** 20-28 hours (including testing)

---

## Long-term Recommendations

1. **Type System Improvements:**
   - Use strict types that exclude falsy values when not valid
   - Example: `type PositiveNumber = number & { __brand: 'positive' }`

2. **Explicit Fallbacks:**
   - Use ternary when 0/false/'' have different meanings
   - Example: `value !== null && value !== undefined ? value : fallback`

3. **Code Review Checklist:**
   - Always check if 0, false, or '' are valid values
   - Document when `||` is intentional
   - Add eslint-disable comments with reasoning

4. **Documentation:**
   - Document valid value ranges in JSDoc
   - Example: `@param limit - Number of items (0 = unlimited)`

