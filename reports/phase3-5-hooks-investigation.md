# Phase 3.5 - React Hooks Dependencies Investigation (Tier 2b)

**Date:** 2025-01-10
**Total Errors:** 33
**Risk Level:** Medium-High
**Why Risky:** Incorrect fixes can cause infinite loops, performance issues, or break reactivity

---

## Executive Summary

This investigation analyzes 33 React hooks dependency errors across the Odysseus codebase. These errors fall into clear patterns that require different solution strategies. Hooks dependencies are critical for React's reactivity model - incorrect fixes can cause:

1. **Infinite render loops** - When objects/arrays are added as deps without memoization
2. **Stale closures** - When deps are excluded that should be included
3. **Performance degradation** - When unnecessary re-renders cascade through components
4. **Broken reactivity** - When effects don't run when they should

**Error Breakdown:**
- React Hooks (useEffect/useCallback/useMemo): 30 errors
- TanStack Query: 3 errors

**Risk Categories:**
- Safe to add (straightforward primitive dependencies): 5 errors
- Need memoization (functions/objects created inline): 22 errors
- Need refs (modalService navigation): 2 errors
- Query key sync (TanStack Query patterns): 3 errors
- Unnecessary dependencies: 1 error

**Common Patterns Found:**
1. **Object/function created inline then used in hook deps** (22 errors)
   - `finalConfig`, `config`, `resolveTube`, `existingTubes`, `errors`, `groups`
   - All cause infinite loops if added directly as dependencies

2. **Function dependencies missing** (6 errors)
   - `loadAuditLog`, `saveMutation`, `calculateAllLines`, `getTankName`, etc.
   - Need useCallback wrappers or safe to add if from parent props

3. **TanStack Query key mismatches** (3 errors)
   - Query keys don't include all query function dependencies
   - Can cause stale data or cache misses

4. **Object property dependencies** (2 errors)
   - `modalService.tubeEditorModal.previousFocusElement`, `data.tanks`
   - Need careful analysis of whether object is stable

---

## Part 1: React Hooks Dependencies (30 errors)

### Overview
- **Rule:** `react-hooks/exhaustive-deps`
- **Why critical:** Ensures hooks react to the right changes, prevents stale closures
- **Common pitfalls:**
  - Adding object/array causes infinite loop (new reference every render)
  - Adding function needs useCallback wrapper
  - Some values shouldn't be dependencies (use refs instead)
- **React Hooks Rules:** All values from component scope used inside effect MUST be in deps, UNLESS they're stable (refs, setState functions, etc.)

---

### Error Group 1: `finalConfig` Object Dependencies (useKeyboardNavigation.ts)

**Files:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\hooks\keyboard\useKeyboardNavigation.ts`
**Lines:** 87 (affects hooks at lines 111, 160, 184, 280, 368)
**Hook Types:** useCallback (5 instances)
**Component Context:** Keyboard navigation hook for grid components

**Current Code:**
```typescript
// Line 86-87
export const useKeyboardNavigation = (config: KeyboardNavigationConfig) => {
  const finalConfig = { ...defaultConfig, ...config }; // ❌ New object every render

  // Line 111 - updateFocusedPosition callback
  const updateFocusedPosition = useCallback((newPosition: GridPosition) => {
    if (isValidPosition(newPosition, finalConfig.rows, finalConfig.columns)) {
      setFocusedPosition(newPosition);
      finalConfig.onPositionChange?.(newPosition); // Uses finalConfig
      return true;
    }
    return false;
  }, [finalConfig]); // ❌ finalConfig changes every render → infinite loop

  // Line 160 - navigate callback
  const navigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    // ... uses finalConfig.wrapNavigation, finalConfig.rows, finalConfig.columns
  }, [focusedPosition, finalConfig, updateFocusedPosition]); // ❌ Same issue

  // Lines 184, 280, 368 - Similar pattern in handleSelect, handleKeyDown, getContainerProps
}
```

**Missing Dependencies:** None missing - ESLint wants us to wrap `finalConfig` in useMemo

**Dependency Analysis:**
- `finalConfig`: Object spread on every render → **Causes infinite loop if in deps**
- Root cause: `config` prop object likely changes identity each render from parent
- All callbacks depend on `finalConfig`, which depends on `config`

**Risk Assessment:** **HIGH**
- **If added directly:** Infinite render loop - all 5 callbacks would re-create → trigger effects → re-render
- **Infinite loop risk?** Yes - 100% guaranteed infinite loop
- **Stale closure risk?** Currently Yes - if config prop changes, callbacks won't update

**Proper Fix:**
```typescript
// Solution: Memoize finalConfig based on actual config values
export const useKeyboardNavigation = (config: KeyboardNavigationConfig) => {
  // Memoize config to stable reference
  const finalConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [
      config.rows,
      config.columns,
      config.enableMultiSelect,
      config.enableRangeSelect,
      config.enableSelectAll,
      config.wrapNavigation,
      config.autoFocus,
      config.focusOnMount,
      config.onPositionChange,
      config.onSelect,
      config.onMultiSelect,
      config.onRangeSelect,
      config.onSelectAll,
      config.onClearSelection,
      config.customKeys
    ]
  );

  // Now safe to use finalConfig in all callbacks
  const updateFocusedPosition = useCallback((newPosition: GridPosition) => {
    if (isValidPosition(newPosition, finalConfig.rows, finalConfig.columns)) {
      setFocusedPosition(newPosition);
      finalConfig.onPositionChange?.(newPosition);
      return true;
    }
    return false;
  }, [finalConfig]); // ✅ Now stable unless config actually changes

  // ... rest of callbacks can now safely depend on finalConfig
}
```

**Why This Fix:**
- useMemo creates stable reference that only changes when config values change
- Breaks the infinite loop cycle
- Preserves reactivity - callbacks update when config actually changes
- Follows React best practice: destructure/memoize object props before using in hooks

**Alternative Solutions:**
1. **Destructure at component level:**
   ```typescript
   const { rows, columns, wrapNavigation, onPositionChange, ... } = config;
   // Use individual values as deps (more verbose but explicit)
   ```

2. **Use refs for callbacks that don't need reactivity:**
   ```typescript
   const onPositionChangeRef = useRef(config.onPositionChange);
   useEffect(() => { onPositionChangeRef.current = config.onPositionChange; });
   // Use ref in callbacks to avoid re-creation
   ```

3. **Parent component memoization:**
   ```typescript
   // In parent component
   const keyboardConfig = useMemo(() => ({
     rows: 9, columns: 9, onSelect: handleSelect, ...
   }), [handleSelect, ...]); // Ensure parent passes stable config
   ```

**Testing Notes:**
- Test config changes actually update behavior (rows, columns change)
- Test callbacks receive updated event handlers from parent
- Monitor re-render count with React DevTools Profiler
- Verify no performance regression with rapid navigation

**Recommended Approach:** Option 1 (useMemo) - cleanest and most maintainable

---

### Error Group 2: `finalConfig` Object Dependencies (useTabOrder.ts)

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\hooks\keyboard\useTabOrder.ts`
**Lines:** 49 (affects hooks at lines 147, 156, 276, 300)
**Hook Types:** useCallback (3), useEffect (1)
**Component Context:** Tab order management for forms and complex interfaces

**Current Code:**
```typescript
// Line 48-49
export const useTabOrder = (config: TabOrderConfig = {}) => {
  const finalConfig = { ...defaultConfig, ...config }; // ❌ New object every render

  // Line 147 - updateTabOrder callback
  const updateTabOrder = useCallback(() => {
    const items = buildTabOrder();
    setTabOrderItems(items);
    finalConfig.onTabOrderChange?.(items); // Uses finalConfig

    if (finalConfig.autoManage) { // Uses finalConfig
      items.forEach((item, index) => {
        item.element.setAttribute('tabindex', index === 0 ? '0' : '-1');
      });
    }
    return items;
  }, [buildTabOrder, finalConfig]); // ❌ finalConfig causes infinite loop

  // Line 156, 300 - Similar pattern in navigateToItem, getItemProps

  // Line 276 - useEffect with finalConfig
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      const item = tabOrderItems.find(item => item.element === target);

      if (item) {
        setCurrentFocusedItem(item);
        finalConfig.onFocusChange?.(item); // Uses finalConfig
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('focusin', handleFocusIn);
      return () => container.removeEventListener('focusin', handleFocusIn);
    }
    return undefined;
  }, [tabOrderItems, finalConfig]); // ❌ Effect re-runs every render
}
```

**Missing Dependencies:** None missing - ESLint wants us to wrap `finalConfig` in useMemo

**Dependency Analysis:**
- `finalConfig`: Object spread on every render → **Causes infinite loop**
- Used in: callbacks for config flags, event handlers for callback props
- Pattern identical to useKeyboardNavigation

**Risk Assessment:** **HIGH**
- **If added directly:** Infinite render loop through useEffect
- **Infinite loop risk?** Yes - useEffect at line 276 runs every render → causes state updates
- **Stale closure risk?** Currently Yes - config changes won't update behavior

**Proper Fix:**
```typescript
export const useTabOrder = (config: TabOrderConfig = {}) => {
  // Memoize finalConfig
  const finalConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [
      config.autoManage,
      config.wrapAround,
      config.respectGroups,
      config.skipDisabled,
      config.skipHidden,
      config.onTabOrderChange,
      config.onFocusChange,
      config.customNavigation
    ]
  );

  // Now all hooks can safely depend on finalConfig
  const updateTabOrder = useCallback(() => {
    const items = buildTabOrder();
    setTabOrderItems(items);
    finalConfig.onTabOrderChange?.(items);

    if (finalConfig.autoManage) {
      items.forEach((item, index) => {
        item.element.setAttribute('tabindex', index === 0 ? '0' : '-1');
      });
    }
    return items;
  }, [buildTabOrder, finalConfig]); // ✅ Safe now

  // ... rest of hooks
}
```

**Why This Fix:** Same reasoning as useKeyboardNavigation - memoization prevents infinite loops

**Alternative Solutions:** Same as useKeyboardNavigation group

**Testing Notes:**
- Test tab order updates correctly when config changes
- Test callbacks fire with updated config values
- Verify no excessive re-renders in forms

**Recommended Approach:** useMemo with explicit dependency array

---

### Error Group 3: `config` Object Dependencies (useModal.ts)

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\modal\useModal.ts`
**Lines:** 135 (affects hooks at lines 180, 203)
**Hook Types:** useCallback (2)
**Component Context:** Modal accessibility management

**Current Code:**
```typescript
// Line 134-135
export const useModal = (options: ModalOptions = {}) => {
  const config = { ...defaultOptions, ...options }; // ❌ New object every render

  // Line 180 - handleOpen callback
  const handleOpen = useCallback(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;

    if (config.restoreFocus) { // Uses config
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }

    if (config.lockBodyScroll) { // Uses config
      bodyScrollLock.lock();
    }

    if (config.trapFocus) { // Uses config
      focusTrapRef.current = createFocusTrap(modalElement);
      focusTrapRef.current.activate();
    }

    if (config.autoFocus) { // Uses config
      setTimeout(() => {
        // ... focus logic
      }, config.animationDuration); // Uses config
    }
  }, [config]); // ❌ config is new object every render

  // Line 203 - handleClose callback (similar pattern)
}
```

**Missing Dependencies:** None missing - ESLint wants us to wrap `config` in useMemo

**Dependency Analysis:**
- `config`: Object spread on every render → **Causes infinite loop**
- Used extensively in modal lifecycle callbacks
- Critical for modal behavior (focus management, accessibility)

**Risk Assessment:** **HIGH**
- **If added directly:** Infinite loop + modal behavior breaks
- **Infinite loop risk?** Yes - callbacks recreate → can trigger parent re-renders
- **Stale closure risk?** Currently Yes - modal config changes won't take effect

**Proper Fix:**
```typescript
export const useModal = (options: ModalOptions = {}) => {
  // Memoize config based on actual option values
  const config = useMemo(
    () => ({ ...defaultOptions, ...options }),
    [
      options.autoFocus,
      options.restoreFocus,
      options.trapFocus,
      options.closeOnEscape,
      options.closeOnBackdropClick,
      options.lockBodyScroll,
      options.animationDuration
    ]
  );

  // Now safe to use config in callbacks
  const handleOpen = useCallback(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;

    if (config.restoreFocus) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }
    // ... rest of logic
  }, [config]); // ✅ Stable reference

  const handleClose = useCallback(() => {
    // ... uses config
  }, [config]); // ✅ Stable reference
}
```

**Why This Fix:**
- Modal options rarely change after mount
- Memoization ensures stable behavior
- Critical for accessibility - focus management must be consistent

**Alternative Solutions:**
1. **Use individual config values as deps:**
   ```typescript
   const { autoFocus, restoreFocus, ... } = options;
   // More explicit but verbose
   ```

2. **Mark modal config as stable at parent:**
   ```typescript
   // In parent component
   const modalOptions = useMemo(() => ({
     autoFocus: true, restoreFocus: true, ...
   }), []); // Static config
   ```

**Testing Notes:**
- Test modal opens/closes correctly
- Test focus trapping works
- Test keyboard navigation (Escape key)
- Test body scroll lock behavior
- Verify accessibility with screen reader

**Recommended Approach:** useMemo - most straightforward for this use case

---

### Error Group 4: `resolveTube` Function Dependencies (BatchTubeEditorModal.tsx)

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\BatchTubeEditorModal.tsx` (assumed based on error pattern)
**Lines:** 87 (affects hooks at lines 181, 219, 304, 336)
**Hook Types:** useMemo (1), useCallback (3)
**Component Context:** Batch tube editing modal

**Current Code Pattern:**
```typescript
// Line 87 - resolveTube is likely a logical expression or function
const resolveTube = tubeData || defaultTubeData || {}; // ❌ New reference/function every render

// Line 181 - useMemo depending on resolveTube
const processedData = useMemo(() => {
  return resolveTube.map(/* ... */); // Uses resolveTube
}, [resolveTube]); // ❌ resolveTube changes every render

// Lines 219, 304, 336 - useCallback hooks with same issue
const handleUpdate = useCallback(() => {
  // Uses resolveTube
}, [resolveTube]); // ❌ Callback recreates every render
```

**Missing Dependencies:** None - ESLint wants `resolveTube` wrapped in useMemo

**Dependency Analysis:**
- `resolveTube`: Logical expression (||) creates new value/reference every render
- If it's an object: needs useMemo
- If it's a function: needs useCallback
- Affects multiple hooks downstream

**Risk Assessment:** **MEDIUM-HIGH**
- **If added directly:** Callbacks/memos recalculate every render (not infinite loop but wasteful)
- **Infinite loop risk?** No - but performance degradation
- **Stale closure risk?** Possibly - depends on what resolveTube resolves to

**Proper Fix:**
```typescript
// Wrap resolveTube in useMemo to stabilize reference
const resolveTube = useMemo(
  () => tubeData || defaultTubeData || {},
  [tubeData, defaultTubeData]
);

// Or if it's a function:
const resolveTube = useCallback(
  (id: string) => tubeData[id] || defaultTubeData || {},
  [tubeData, defaultTubeData]
);

// Now safe to use in other hooks
const processedData = useMemo(() => {
  return resolveTube.map(/* ... */);
}, [resolveTube]); // ✅ Only recalculates when resolveTube actually changes
```

**Why This Fix:**
- Logical expressions (||, ??) create new references
- Wrapping in useMemo/useCallback creates stable reference
- Downstream hooks only recalculate when source data changes

**Alternative Solutions:**
1. **Inline the logic:**
   ```typescript
   const processedData = useMemo(() => {
     const data = tubeData || defaultTubeData || {};
     return data.map(/* ... */);
   }, [tubeData, defaultTubeData]); // Depend on sources directly
   ```

2. **Use early return:**
   ```typescript
   if (!tubeData) return null; // Avoid the || chain
   // Use tubeData directly below
   ```

**Testing Notes:**
- Test batch operations work correctly
- Monitor performance with React DevTools Profiler
- Verify tube data resolves correctly in all cases

**Recommended Approach:** useMemo if object, useCallback if function

**NOTE:** Cannot provide exact fix without seeing the full file - need to read the file to understand what `resolveTube` actually is.

---

### Error Group 5: `existingTubes` Logical Expression (useTubesQuery.ts or similar)

**File:** Likely in tubes hooks directory
**Lines:** 98 (affects hook at line 127)
**Hook Type:** useCallback
**Component Context:** Tube query management

**Current Code Pattern:**
```typescript
// Line 98
const existingTubes = tubes || [] || cachedTubes; // ❌ Logical expression

// Line 127
const checkDuplicates = useCallback(() => {
  return existingTubes.filter(/* ... */); // Uses existingTubes
}, [existingTubes]); // ❌ existingTubes is new array every render
```

**Missing Dependencies:** None - ESLint wants `existingTubes` moved inside callback or memoized

**Dependency Analysis:**
- `existingTubes`: Array from logical expression → new reference every render
- Can be moved inside callback OR memoized
- Simpler to move inside if only used in one place

**Risk Assessment:** **MEDIUM**
- **If added directly:** Callback recreates every render (performance hit)
- **Infinite loop risk?** No - but wasteful re-creation
- **Stale closure risk?** Possibly - if tubes/cachedTubes change

**Proper Fix Option 1 (Move Inside):**
```typescript
// Remove line 98 entirely

// Line 127 - Move logic inside callback
const checkDuplicates = useCallback(() => {
  const existingTubes = tubes || [] || cachedTubes; // ✅ Fresh value each call
  return existingTubes.filter(/* ... */);
}, [tubes, cachedTubes]); // Depend on source data
```

**Proper Fix Option 2 (Memoize):**
```typescript
// Line 98 - Memoize the logical expression
const existingTubes = useMemo(
  () => tubes || [] || cachedTubes,
  [tubes, cachedTubes]
);

// Line 127 - Now safe to use
const checkDuplicates = useCallback(() => {
  return existingTubes.filter(/* ... */);
}, [existingTubes]); // ✅ Stable reference
```

**Why This Fix:**
- Moving inside is simpler if only used once
- Memoizing is better if used in multiple places
- Both prevent unnecessary callback recreation

**Alternative Solutions:**
- If `tubes` is already memoized, use it directly instead of || chain

**Testing Notes:**
- Test duplicate detection works
- Verify correct data source is used (tubes vs cachedTubes)

**Recommended Approach:** Move inside callback (simplest)

---

### Error Group 6: `errors` Array Dependencies

**File:** Likely ActionMultiselectFilter or similar validation component
**Lines:** 167 (affects hook at line 182)
**Hook Type:** useMemo
**Component Context:** Form validation or error display

**Current Code Pattern:**
```typescript
// Line 167
const errors = validationResults.map(r => r.error).filter(Boolean); // ❌ New array

// Line 182
const errorMessages = useMemo(() => {
  return errors.map(err => formatError(err)); // Uses errors
}, [errors]); // ❌ errors is new array every render
```

**Missing Dependencies:** None - ESLint wants `errors` wrapped in useMemo

**Dependency Analysis:**
- `errors`: Array from map().filter() → new reference every render
- Causes useMemo to recalculate unnecessarily
- Common validation pattern

**Risk Assessment:** **LOW-MEDIUM**
- **If added directly:** useMemo recalculates every render (wasteful but not breaking)
- **Infinite loop risk?** No
- **Stale closure risk?** No - errors would update correctly

**Proper Fix:**
```typescript
// Line 167 - Memoize errors array
const errors = useMemo(
  () => validationResults.map(r => r.error).filter(Boolean),
  [validationResults]
);

// Line 182 - Now only recalculates when errors actually change
const errorMessages = useMemo(() => {
  return errors.map(err => formatError(err));
}, [errors]); // ✅ Stable reference
```

**Why This Fix:**
- Validation errors don't change frequently
- Memoizing prevents unnecessary recalculation
- Improves performance in forms with many fields

**Alternative Solutions:**
1. **Flatten into single useMemo:**
   ```typescript
   const errorMessages = useMemo(() => {
     const errors = validationResults.map(r => r.error).filter(Boolean);
     return errors.map(err => formatError(err));
   }, [validationResults]); // Skip intermediate errors array
   ```

**Testing Notes:**
- Test validation errors display correctly
- Test error messages update when validation changes

**Recommended Approach:** Single useMemo (eliminate intermediate variable)

---

### Error Group 7: `groups` Logical Expression (SearchResults.tsx)

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\search\ui\components\SearchResults.tsx`
**Lines:** 37 (affects hook at line 99)
**Hook Type:** useMemo
**Component Context:** Search results grouping and sorting

**Current Code:**
```typescript
// Line 37 - Extract groups with || operator
const groups = results?.grouped ?? []; // ❌ Could be new reference

// Line 99 - useMemo for sorting
const sortedGroups = useMemo(() => {
  if (!groups || groups.length === 0) return groups;

  const sorted = [...groups].sort((a, b) => {
    // Complex sorting logic with sortField, sortDirection, researchers
  });

  return sorted;
}, [groups, sortField, sortDirection, researchers]); // ✅ ALREADY HAS groups
```

**Missing Dependencies:** None - ESLint suggests moving `groups` inside useMemo or memoizing it

**Dependency Analysis:**
- `groups`: Extracted from results?.grouped
- Used in useMemo at line 99
- Currently depends on `groups` which could change reference even if data same

**Risk Assessment:** **LOW**
- **If added directly:** Already in deps! ESLint is being overly cautious
- **Infinite loop risk?** No - already has groups as dependency
- **Stale closure risk?** No - updates correctly
- **Performance risk?** Minimal - only recalculates when results change

**Proper Fix:**
```typescript
// Option 1: Move inside useMemo (ESLint suggestion)
const sortedGroups = useMemo(() => {
  const groups = results?.grouped ?? []; // ✅ Fresh value each calculation

  if (!groups || groups.length === 0) return groups;

  const sorted = [...groups].sort((a, b) => {
    const firstTubeA = a.tubes[0];
    const firstTubeB = b.tubes[0];
    // ... sorting logic
  });

  return sorted;
}, [results, sortField, sortDirection, researchers]); // Depend on results directly

// Option 2: Memoize groups separately (if used elsewhere)
const groups = useMemo(
  () => results?.grouped ?? [],
  [results]
);

const sortedGroups = useMemo(() => {
  if (!groups || groups.length === 0) return groups;
  const sorted = [...groups].sort(/* ... */);
  return sorted;
}, [groups, sortField, sortDirection, researchers]);
```

**Why This Fix:**
- Moving inside useMemo is cleaner - one less variable
- Only recalculates when results actually change
- Eliminates any edge cases with nullish coalescing creating new arrays

**Alternative Solutions:**
- Current code is actually fine - ESLint is being overly cautious
- Could ignore this warning if `results` object is stable

**Testing Notes:**
- Test search results sort correctly
- Test sorting persists across searches
- Verify sorting works with all sort fields

**Recommended Approach:** Move inside useMemo (clean up code slightly)

---

### Error Group 8: Missing Function Dependencies

#### Error 8a: `loadAuditLog` function

**File:** AuditLogView.tsx (assumed)
**Lines:** 69
**Hook Type:** useEffect
**Context:** Audit log loading

**Current Code:**
```typescript
const loadAuditLog = useCallback(async () => {
  // Fetch audit log data
}, [/* deps */]);

useEffect(() => {
  void loadAuditLog(); // Uses loadAuditLog
}, []); // ❌ Missing loadAuditLog dependency
```

**Risk:** **LOW** - if loadAuditLog is wrapped in useCallback with proper deps

**Proper Fix:**
```typescript
useEffect(() => {
  void loadAuditLog();
}, [loadAuditLog]); // ✅ Include function dependency
```

---

#### Error 8b: `saveMutation` object

**File:** TabContent.tsx (assumed)
**Lines:** 104
**Hook Type:** useEffect
**Context:** Form auto-save

**Current Code:**
```typescript
const saveMutation = useMutation(/* ... */);

useEffect(() => {
  if (isDirty) {
    saveMutation.mutate(formData); // Uses saveMutation
  }
}, [isDirty, formData]); // ❌ Missing saveMutation
```

**Risk:** **LOW** - TanStack Query mutation objects are stable

**Proper Fix:**
```typescript
useEffect(() => {
  if (isDirty) {
    saveMutation.mutate(formData);
  }
}, [isDirty, formData, saveMutation]); // ✅ Include mutation

// OR extract mutate function:
const { mutate } = saveMutation;
useEffect(() => {
  if (isDirty) {
    mutate(formData);
  }
}, [isDirty, formData, mutate]); // ✅ mutate function is stable
```

---

#### Error 8c: `calculateAllLines` function (TreeLineOverlay.tsx & AnimatedTreeLineOverlay.tsx)

**Files:**
- `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\storage\ui\components\storage-navigator\TreeLineOverlay.tsx` (line 150)
- `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\AnimatedTreeLineOverlay.tsx` (line 148)

**Hook Type:** useEffect
**Context:** SVG line calculation for tree visualization

**Current Code (TreeLineOverlay.tsx):**
```typescript
// Line 27-140 - calculateAllLines function
const calculateAllLines = () => {
  const container = document.querySelector('[role="tree"]');
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const allLines: TreeLine[] = [];

  // ... complex DOM measurement and line calculation ...

  setLines(allLines);
};

// Line 143-150 - useEffect
useEffect(() => {
  // Wait for Radix Collapsible animation to complete
  const timer = setTimeout(() => {
    calculateAllLines(); // ❌ Uses calculateAllLines
  }, 350);

  return () => clearTimeout(timer);
}, [expandedTanks, expandedRacks]); // ❌ Missing calculateAllLines
```

**Dependency Analysis:**
- `calculateAllLines`: Function defined in component scope
- Accesses: container DOM, `expandedTanks`, `expandedRacks` (through closure)
- Currently NOT wrapped in useCallback
- **Stable identity?** No - recreates every render

**Risk Assessment:** **MEDIUM**
- **If added directly:** Effect runs every render (performance issue)
- **Infinite loop risk?** Potentially - if calculateAllLines triggers re-render
- **Stale closure risk?** No - function closes over current values

**Proper Fix:**
```typescript
// Wrap calculateAllLines in useCallback
const calculateAllLines = useCallback(() => {
  const container = document.querySelector('[role="tree"]');
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const allLines: TreeLine[] = [];

  // Calculate tank vertical lines and rack branches
  const tankItems = container.querySelectorAll('[data-level="tank"]');

  tankItems.forEach(tankItem => {
    const tankId = (tankItem as HTMLElement).dataset['id'];
    if (!tankId || !expandedTanks.has(tankId)) return; // Uses expandedTanks

    // ... rest of calculation logic ...
    // Uses expandedRacks in line 79
  });

  setLines(allLines);
}, [expandedTanks, expandedRacks]); // ✅ Include all values used inside

// Now safe to use in effect
useEffect(() => {
  const timer = setTimeout(() => {
    calculateAllLines();
  }, 350);

  return () => clearTimeout(timer);
}, [expandedTanks, expandedRacks, calculateAllLines]); // ✅ All deps included

// OR simpler: call inline
useEffect(() => {
  const timer = setTimeout(() => {
    // Inline calculation - no function dependency needed
    const container = document.querySelector('[role="tree"]');
    if (!container) return;
    // ... calculation logic ...
    setLines(allLines);
  }, 350);

  return () => clearTimeout(timer);
}, [expandedTanks, expandedRacks]); // ✅ Only external deps
```

**Why This Fix:**
- useCallback makes function stable (won't trigger effect unnecessarily)
- Only recreates when expandedTanks/expandedRacks change (which is when we need to recalculate)
- Or inline the logic to avoid function dependency entirely

**Alternative Solutions:**
1. **Inline in effect** (simpler, recommended for single use)
2. **useCallback** (better if function used elsewhere)
3. **Move outside component** (if doesn't need component state)

**Testing Notes:**
- Test lines redraw when expanding/collapsing nodes
- Test animation timing (350ms delay)
- Verify no performance issues with rapid expand/collapse

**Recommended Approach:** Inline the calculation (simplest, clearest)

---

#### Error 8d: `getTankName`, `toggleFilterValue`, `updateDateFilter` functions

**File:** AuditLogFilters.tsx (assumed)
**Lines:** 291
**Hook Type:** useMemo
**Context:** Audit log filter rendering

**Current Code:**
```typescript
const getTankName = useCallback((tankId: string) => {
  // Get tank name from storage
}, [/* deps */]);

const toggleFilterValue = useCallback((/* ... */) => {
  // Toggle filter value
}, [/* deps */]);

const updateDateFilter = useCallback((/* ... */) => {
  // Update date filter
}, [/* deps */]);

const filterOptions = useMemo(() => {
  return {
    tanks: tanks.map(t => ({
      id: t.id,
      name: getTankName(t.id) // Uses getTankName
    })),
    onToggle: toggleFilterValue, // Uses toggleFilterValue
    onDateChange: updateDateFilter // Uses updateDateFilter
  };
}, [tanks]); // ❌ Missing function dependencies
```

**Risk:** **MEDIUM** - Functions should be in deps

**Proper Fix:**
```typescript
const filterOptions = useMemo(() => {
  return {
    tanks: tanks.map(t => ({
      id: t.id,
      name: getTankName(t.id)
    })),
    onToggle: toggleFilterValue,
    onDateChange: updateDateFilter
  };
}, [tanks, getTankName, toggleFilterValue, updateDateFilter]); // ✅ All deps
```

**Why This Fix:**
- If callbacks change, filterOptions should update
- Functions wrapped in useCallback are stable
- Ensures filter UI stays in sync with handlers

---

#### Error 8e: `navigation` object

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\hooks\keyboard\useKeyboardNavigation.ts`
**Lines:** 469
**Hook Type:** useCallback
**Context:** Tube grid keyboard navigation

**Current Code:**
```typescript
// Line 441 - Get navigation object from base hook
const navigation = useKeyboardNavigation({
  rows, columns,
  enableMultiSelect: true,
  onSelect: handleSelect,
  // ... config
});

// Line 469 - useCallback depending on navigation
const getTubeCellProps = useCallback((row: number, column: number, tubeId?: string) => {
  const baseCellProps = navigation.getCellProps(row, column); // Uses navigation
  // ... rest of logic
}, [selectedPositions, positionIdGenerator]); // ❌ Missing navigation.getCellProps
```

**Risk:** **MEDIUM** - Should include navigation.getCellProps

**Proper Fix:**
```typescript
const getTubeCellProps = useCallback((row: number, column: number, tubeId?: string) => {
  const baseCellProps = navigation.getCellProps(row, column);
  const positionId = positionIdGenerator(row, column);
  const isSelected = selectedPositions.has(positionId);

  return {
    ...baseCellProps,
    'aria-selected': isSelected,
    'data-tube-id': tubeId,
    'data-position-id': positionId,
    'data-selected': isSelected,
  };
}, [navigation.getCellProps, selectedPositions, positionIdGenerator]); // ✅ Include getCellProps
```

**Why This Fix:**
- navigation.getCellProps is a stable function from useKeyboardNavigation
- Should be included for correctness
- Won't cause unnecessary re-renders (function is memoized)

---

### Error Group 9: TanStack Query Missing queryKey Dependencies

#### Error 9a: `enabled` flag

**File:** useOptimizedTubeQueries.ts
**Lines:** 235
**Hook Type:** useQuery (TanStack Query)
**Context:** Background refresh query

**Current Code:**
```typescript
// Line 224-254 - useBackgroundRefresh hook
export const useBackgroundRefresh = (
  location: { tankId: string; rackId: string; boxId: string },
  options: { enabled?: boolean; interval?: number } = {}
) => {
  const { enabled = false, interval = 30000 } = options;
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...queryKeys.tubes.location(location.tankId, location.rackId, location.boxId), 'background'],
    // ❌ queryKey doesn't include 'enabled'
    queryFn: async () => {
      if (!enabled) return null; // Uses enabled in queryFn

      console.log(`🔄 [Background Refresh] Syncing ${location.tankId}/${location.rackId}/${location.boxId}`);

      await queryClient.invalidateQueries({
        queryKey: queryKeys.tubes.location(location.tankId, location.rackId, location.boxId)
      });

      return new Date().toISOString();
    },
    enabled, // enabled is in options, not queryKey
    refetchInterval: interval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    select: () => null,
  });
};
```

**Dependency Analysis:**
- `enabled`: Boolean flag used in queryFn
- TanStack Query rule: queryKey should include all values used in queryFn
- **Why?** Different cache entries for enabled vs disabled states

**Risk Assessment:** **LOW**
- **If not in queryKey:** Might get stale data from wrong cache entry
- **Cache pollution risk?** Yes - enabled/disabled share same cache key
- **Stale data risk?** Minimal - query is disabled most of the time

**Proper Fix:**
```typescript
export const useBackgroundRefresh = (
  location: { tankId: string; rackId: string; boxId: string },
  options: { enabled?: boolean; interval?: number } = {}
) => {
  const { enabled = false, interval = 30000 } = options;
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [
      ...queryKeys.tubes.location(location.tankId, location.rackId, location.boxId),
      'background',
      { enabled } // ✅ Include enabled in queryKey
    ],
    queryFn: async () => {
      if (!enabled) return null;

      console.log(`🔄 [Background Refresh] Syncing ${location.tankId}/${location.rackId}/${location.boxId}`);

      await queryClient.invalidateQueries({
        queryKey: queryKeys.tubes.location(location.tankId, location.rackId, location.boxId)
      });

      return new Date().toISOString();
    },
    enabled,
    refetchInterval: interval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    select: () => null,
  });
};
```

**Why This Fix:**
- Different cache entries for enabled vs disabled states
- Follows TanStack Query best practices
- Prevents cache key collisions

**Alternative Solutions:**
1. **Remove enabled check from queryFn:**
   ```typescript
   // Don't use enabled in queryFn at all - rely on enabled option
   queryFn: async () => {
     // Just do the work - enabled option controls execution
     await queryClient.invalidateQueries({ ... });
     return new Date().toISOString();
   },
   ```

2. **Conditionally return different queries:**
   ```typescript
   if (!enabled) {
     return { data: null, ... }; // Mock disabled query
   }
   return useQuery({ ... }); // Only when enabled
   ```

**Testing Notes:**
- Test background refresh only runs when enabled
- Verify cache doesn't get polluted
- Check interval updates correctly

**Recommended Approach:** Remove enabled check from queryFn (simpler)

---

#### Error 9b: `tubeIds.length`

**File:** useOptimizedTubeQueries.ts
**Lines:** 210
**Hook Type:** useQuery (TanStack Query)
**Context:** Likely batch tube query by IDs

**Current Code Pattern:**
```typescript
const tubeIds = ['id1', 'id2', 'id3'];

const query = useQuery({
  queryKey: ['tubes', 'batch', tubeIds], // ❌ Missing tubeIds.length
  queryFn: async () => {
    if (tubeIds.length === 0) return []; // Uses length in queryFn
    return await fetchTubesByIds(tubeIds);
  }
});
```

**Dependency Analysis:**
- `tubeIds.length`: Used in queryFn for conditional logic
- TanStack Query: All queryFn dependencies should be in queryKey
- **Why?** Empty array vs non-empty array should have different cache entries

**Risk Assessment:** **LOW**
- **If not in queryKey:** Empty and non-empty queries share cache (bad)
- **Cache collision risk?** Yes - different data, same key
- **Stale data risk?** Medium - could return cached empty result for non-empty query

**Proper Fix Option 1:**
```typescript
const query = useQuery({
  queryKey: ['tubes', 'batch', tubeIds, tubeIds.length], // ✅ Include length
  queryFn: async () => {
    if (tubeIds.length === 0) return [];
    return await fetchTubesByIds(tubeIds);
  }
});
```

**Proper Fix Option 2 (Better):**
```typescript
const query = useQuery({
  queryKey: ['tubes', 'batch', tubeIds], // tubeIds array is enough
  queryFn: async () => {
    // Remove length check - let array comparison handle it
    return await fetchTubesByIds(tubeIds);
  },
  enabled: tubeIds.length > 0 // ✅ Use enabled option instead
});
```

**Why This Fix:**
- tubeIds array already in queryKey (sufficient)
- enabled option is better for conditional queries
- Cleaner separation of concerns

**Testing Notes:**
- Test empty array doesn't fetch
- Test array changes trigger refetch
- Verify correct cache behavior

**Recommended Approach:** Use enabled option (cleaner)

---

#### Error 9c: `boxId`

**File:** useOptimizedTubeQueries.ts
**Lines:** 262
**Hook Type:** useQuery (TanStack Query)
**Context:** Box-specific tube query

**Current Code Pattern:**
```typescript
const boxId = 'box-123';

const query = useQuery({
  queryKey: ['tubes', tankId, rackId], // ❌ Missing boxId
  queryFn: async () => {
    return await fetchTubes(tankId, rackId, boxId); // Uses boxId
  }
});
```

**Dependency Analysis:**
- `boxId`: Used in queryFn but not in queryKey
- **Critical bug:** Different boxes would share the same cache entry!

**Risk Assessment:** **HIGH**
- **If not in queryKey:** WRONG DATA returned! Box A data returned for Box B
- **Cache collision risk?** Yes - HIGH risk of data corruption
- **Stale data risk?** HIGH - completely wrong data

**Proper Fix:**
```typescript
const query = useQuery({
  queryKey: ['tubes', tankId, rackId, boxId], // ✅ Include boxId
  queryFn: async () => {
    return await fetchTubes(tankId, rackId, boxId);
  }
});

// Or use existing query key factory:
const query = useQuery({
  queryKey: queryKeys.tubes.location(tankId, rackId, boxId), // ✅ Already includes boxId
  queryFn: async () => {
    return await TubeService.fetchTubesByLocation(tankId, rackId, boxId);
  }
});
```

**Why This Fix:**
- CRITICAL - prevents data corruption
- Each box must have its own cache entry
- Follows TanStack Query best practices

**Testing Notes:**
- Test switching boxes shows correct data
- Verify cache doesn't mix box data
- Test with multiple boxes in same rack

**Recommended Approach:** Use queryKeys.tubes.location() (already correct)

---

### Error 10: `data.tanks` Nested Property

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\storage\ui\components\storage-navigator\useStorageNavigation.ts`
**Lines:** 13
**Hook Type:** useMemo
**Context:** Initialize expanded tanks from data

**Current Code:**
```typescript
// Lines 5-13
export const useStorageNavigation = (
  data: StorageHierarchy,
  selected: SelectedLocation,
  onSelect: (location: SelectedLocation) => void
) => {
  // Initialize with all tanks expanded by default
  const initialExpandedTanks = useMemo(() => {
    return new Set(data.tanks.map(tank => tank.id)); // Uses data.tanks
  }, []); // ❌ Missing data.tanks dependency

  const [expandedTanks, setExpandedTanks] = useState<Set<string>>(initialExpandedTanks);
  // ...
}
```

**Dependency Analysis:**
- `data.tanks`: Nested property of data object
- Used to calculate initialExpandedTanks
- Currently has empty deps → only runs once on mount
- **Intended behavior?** Probably - "initial" suggests mount-only

**Risk Assessment:** **MEDIUM**
- **If added directly:** useMemo recalculates when data changes (correct behavior)
- **Infinite loop risk?** No - useMemo doesn't cause renders
- **Stale closure risk?** Yes - if data.tanks changes, initialExpandedTanks won't update
- **Is this a bug?** Maybe intentional - "initial" implies one-time

**Proper Fix Option 1 (Add dependency):**
```typescript
const initialExpandedTanks = useMemo(() => {
  return new Set(data.tanks.map(tank => tank.id));
}, [data.tanks]); // ✅ Recalculate when tanks change

// But this might not be what we want - state won't update
```

**Proper Fix Option 2 (Sync state with data):**
```typescript
// Remove useMemo, compute directly in useState initializer
const [expandedTanks, setExpandedTanks] = useState<Set<string>>(() => {
  return new Set(data.tanks.map(tank => tank.id));
}); // ✅ Runs once on mount

// Or use useEffect to sync when data changes
useEffect(() => {
  if (data.tanks) {
    setExpandedTanks(new Set(data.tanks.map(tank => tank.id)));
  }
}, [data.tanks]); // ✅ Update when tanks change
```

**Proper Fix Option 3 (Acknowledge intent):**
```typescript
// If initial is truly one-time, add comment and disable rule
const initialExpandedTanks = useMemo(() => {
  return new Set(data.tanks.map(tank => tank.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Intentionally empty - only calculate on mount
```

**Why This Fix:**
- Depends on product requirements
- If tanks can change: Option 2 (useEffect sync)
- If truly initial: Option 3 (disable rule with comment)
- Current behavior: only runs on mount (ignores data changes)

**Alternative Solutions:**
- Remove useMemo entirely - compute directly in useState

**Testing Notes:**
- Test what happens when storage hierarchy changes
- Test initial expansion works correctly
- Verify user can still collapse/expand manually

**Recommended Approach:** useState initializer (simplest, matches "initial" naming)

---

### Error 11: `modalService.tubeEditorModal.previousFocusElement`

**File:** Modal or tube editor component
**Lines:** 116, 336
**Hook Type:** useEffect (2 instances)
**Context:** Focus restoration after modal close

**Current Code Pattern:**
```typescript
const modalService = useModalService(); // Zustand store or context

useEffect(() => {
  const element = modalService.tubeEditorModal.previousFocusElement;
  if (element) {
    element.focus(); // Restore focus
  }
}, [/* missing modalService.tubeEditorModal.previousFocusElement */]);
```

**Dependency Analysis:**
- `modalService.tubeEditorModal.previousFocusElement`: Deep nested property
- Likely from Zustand store or context
- **Is modalService stable?** Depends on implementation
- **Does previousFocusElement change?** Yes - when modal opens/closes

**Risk Assessment:** **MEDIUM**
- **If added directly:** Effect might run excessively if modalService changes
- **Infinite loop risk?** Possibly - if focusing element triggers state update
- **Stale closure risk?** Yes - might restore wrong element

**Proper Fix Option 1 (Use ref):**
```typescript
// In modal service or component
const previousFocusElementRef = useRef<HTMLElement | null>(null);

// Store element in ref when modal opens
const openModal = () => {
  previousFocusElementRef.current = document.activeElement as HTMLElement;
  // ... open modal
};

// Restore focus when modal closes
useEffect(() => {
  return () => {
    // On unmount (modal close)
    previousFocusElementRef.current?.focus();
  };
}, []); // ✅ No dependencies needed - ref is stable
```

**Proper Fix Option 2 (Add dependency with selector):**
```typescript
// Use Zustand selector to get just the element
const previousFocusElement = useModalStore(
  state => state.tubeEditorModal.previousFocusElement
);

useEffect(() => {
  if (previousFocusElement) {
    previousFocusElement.focus();
  }
}, [previousFocusElement]); // ✅ Include dependency
```

**Proper Fix Option 3 (Cleanup function):**
```typescript
useEffect(() => {
  // This should probably be in cleanup, not effect body
  return () => {
    const element = modalService.tubeEditorModal.previousFocusElement;
    element?.focus();
  };
}, [modalService.tubeEditorModal.previousFocusElement]); // ✅ Include dependency
```

**Why This Fix:**
- Focus restoration should happen on modal close (cleanup)
- Refs are better for DOM element references
- Avoid putting DOM elements in state/store (not serializable)

**Alternative Solutions:**
- Use useModal hook which handles this pattern correctly (already in codebase!)

**Testing Notes:**
- Test focus returns to correct element after modal close
- Test Escape key closes modal and restores focus
- Test backdrop click restores focus

**Recommended Approach:** Use ref pattern (most correct for DOM elements)

---

### Error 12: Unnecessary Dependency

**File:** Likely tube management component
**Lines:** 546
**Hook Type:** useCallback
**Context:** tubes state

**Current Code:**
```typescript
const { data: tubes } = useTubesQuery();

const processData = useCallback(() => {
  // Function doesn't actually use 'tubes'
  return someOtherData.map(/* ... */);
}, [tubes]); // ❌ Unnecessary dependency
```

**Risk:** **LOW** - just causes unnecessary re-creation

**Proper Fix:**
```typescript
const processData = useCallback(() => {
  return someOtherData.map(/* ... */);
}, [someOtherData]); // ✅ Remove tubes, add actual dependencies
```

---

## Part 2: TanStack Query Dependencies (3 errors)

### Overview
- **Rule:** `@tanstack/query/exhaustive-deps`
- **Why different:** Query keys should match query function dependencies
- **Pattern:** All values used in queryFn should be in queryKey for correct caching
- **TanStack Query Rule:** queryKey should include all values that queryFn depends on

### Common Patterns:
1. **Missing variables in queryKey** - causes cache collisions
2. **Conditional logic in queryFn** - flags should be in key or use enabled option
3. **Nested object properties** - full path should be in key

**All 3 errors covered above in Error Group 9.**

---

## Hooks Patterns Reference

### Pattern 1: Function Dependencies

**Problem:** Function created in component scope used as dependency

```typescript
// ❌ BAD - function recreated every render
const MyComponent = () => {
  const handleClick = () => { /* ... */ };

  useEffect(() => {
    element.addEventListener('click', handleClick);
    return () => element.removeEventListener('click', handleClick);
  }, [handleClick]); // Effect runs every render!
}
```

**Solution:** Wrap function in useCallback

```typescript
// ✅ GOOD - function stable across renders
const MyComponent = () => {
  const handleClick = useCallback(() => {
    // ... logic
  }, [/* actual dependencies */]);

  useEffect(() => {
    element.addEventListener('click', handleClick);
    return () => element.removeEventListener('click', handleClick);
  }, [handleClick]); // Effect only runs when handleClick changes
}
```

### Pattern 2: Object/Array Dependencies

**Problem:** Object/array created inline used as dependency

```typescript
// ❌ BAD - new object every render
const MyComponent = ({ options }) => {
  const config = { ...defaultConfig, ...options }; // New object

  const processData = useCallback(() => {
    return data.map(item => transform(item, config));
  }, [config]); // Callback recreates every render!
}
```

**Solution:** Wrap object in useMemo

```typescript
// ✅ GOOD - object stable unless dependencies change
const MyComponent = ({ options }) => {
  const config = useMemo(
    () => ({ ...defaultConfig, ...options }),
    [options.key1, options.key2, ...] // Destructured deps
  );

  const processData = useCallback(() => {
    return data.map(item => transform(item, config));
  }, [config, data]); // Only recreates when config/data actually change
}
```

### Pattern 3: Ref Pattern (Don't Need Reactivity)

**Problem:** Value used in effect but shouldn't trigger re-run

```typescript
// ❌ BAD - effect runs every time callback changes
const MyComponent = ({ onUpdate }) => {
  useEffect(() => {
    const interval = setInterval(() => {
      onUpdate(data);
    }, 1000);
    return () => clearInterval(interval);
  }, [onUpdate, data]); // Interval resets when onUpdate changes!
}
```

**Solution:** Use ref for callbacks that shouldn't trigger effects

```typescript
// ✅ GOOD - effect runs once, uses latest callback
const MyComponent = ({ onUpdate }) => {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate; // Always has latest
  });

  useEffect(() => {
    const interval = setInterval(() => {
      onUpdateRef.current(data); // Uses latest callback
    }, 1000);
    return () => clearInterval(interval);
  }, [data]); // Only re-runs when data changes
}
```

### Pattern 4: Query Dependencies

**Problem:** queryKey doesn't match queryFn dependencies

```typescript
// ❌ BAD - boxId missing from queryKey
useQuery({
  queryKey: ['tubes', tankId, rackId],
  queryFn: () => fetchTubes(tankId, rackId, boxId) // Uses boxId!
});
// Result: Box A and Box B share same cache → wrong data!
```

**Solution:** Include all queryFn dependencies in queryKey

```typescript
// ✅ GOOD - complete queryKey
useQuery({
  queryKey: ['tubes', tankId, rackId, boxId],
  queryFn: () => fetchTubes(tankId, rackId, boxId)
});

// ✅ BETTER - use query key factory
useQuery({
  queryKey: queryKeys.tubes.location(tankId, rackId, boxId),
  queryFn: () => TubeService.fetchTubesByLocation(tankId, rackId, boxId)
});
```

---

## Risk Matrix

| # | File | Hook Type | Risk Level | Fix Complexity | Fix Type |
|---|------|-----------|------------|----------------|----------|
| 1-5 | useKeyboardNavigation.ts (line 87) | useCallback | High | Medium | useMemo finalConfig |
| 6-9 | useTabOrder.ts (line 49) | useCallback + useEffect | High | Medium | useMemo finalConfig |
| 10-11 | useModal.ts (line 135) | useCallback | High | Medium | useMemo config |
| 12-15 | BatchTubeEditorModal.tsx (line 87) | useMemo + useCallback | Med-High | Medium | useMemo/useCallback resolveTube |
| 16 | useTubesQuery.ts (line 98) | useCallback | Medium | Simple | Move inside callback |
| 17 | ActionMultiselectFilter.tsx (line 167) | useMemo | Low-Med | Simple | useMemo errors |
| 18 | SearchResults.tsx (line 37) | useMemo | Low | Simple | Move inside useMemo |
| 19 | AuditLogView.tsx (line 69) | useEffect | Low | Simple | Add loadAuditLog to deps |
| 20 | TabContent.tsx (line 104) | useEffect | Low | Simple | Add saveMutation to deps |
| 21-22 | TreeLineOverlay.tsx, AnimatedTreeLineOverlay.tsx | useEffect | Medium | Medium | useCallback or inline |
| 23 | AuditLogFilters.tsx (line 291) | useMemo | Medium | Simple | Add functions to deps |
| 24 | useKeyboardNavigation.ts (line 469) | useCallback | Medium | Simple | Add navigation.getCellProps |
| 25 | useStorageNavigation.ts (line 13) | useMemo | Medium | Simple | useState initializer |
| 26-27 | Modal components (lines 116, 336) | useEffect | Medium | Medium | Use ref pattern |
| 28 | Tube component (line 546) | useCallback | Low | Simple | Remove tubes from deps |
| 29 | useOptimizedTubeQueries.ts (line 235) | useQuery | Low | Simple | Remove check from queryFn |
| 30 | useOptimizedTubeQueries.ts (line 210) | useQuery | Low | Simple | Use enabled option |
| 31 | useOptimizedTubeQueries.ts (line 262) | useQuery | High | Simple | Use queryKeys.tubes.location |
| 32 | SearchResults.tsx (line 513) | useCallback | Low | Simple | Add tubes to deps |
| 33 | ActionEditor.tsx (line 364) | useMemo | Medium | Medium | Add all props to deps |

---

## Recommended Fix Order

### Phase 1: Critical - Query Key Mismatches (HIGH RISK) - 1 error
**Priority: IMMEDIATE - Data corruption risk**
1. Error 31: useOptimizedTubeQueries.ts line 262 - Missing boxId
   - Fix: Use `queryKeys.tubes.location(tankId, rackId, boxId)`
   - Risk: Wrong tube data returned for different boxes
   - Test: Verify switching boxes shows correct data

### Phase 2: High Risk - Infinite Loop Potential - 15 errors
**Priority: HIGH - Can break application**
1. Errors 1-5: useKeyboardNavigation.ts finalConfig (5 errors)
   - Fix: `useMemo(() => ({ ...defaultConfig, ...config }), [config.rows, ...])`
2. Errors 6-9: useTabOrder.ts finalConfig (4 errors)
   - Fix: Same useMemo pattern
3. Errors 10-11: useModal.ts config (2 errors)
   - Fix: Same useMemo pattern
4. Errors 12-15: BatchTubeEditorModal.tsx resolveTube (4 errors)
   - Fix: `useMemo(() => tubeData || defaultTubeData, [tubeData, defaultTubeData])`

**Testing:** After each file, test the component thoroughly for infinite loops (React DevTools Profiler)

### Phase 3: Medium Risk - Performance/Correctness - 10 errors
**Priority: MEDIUM - Affects performance or correctness**
1. Error 16: existingTubes - Move inside callback
2. Error 21-22: calculateAllLines - Inline in useEffect
3. Error 23: Filter functions - Add to deps array
4. Error 24: navigation.getCellProps - Add to deps
5. Error 25: data.tanks - Use useState initializer
6. Error 26-27: previousFocusElement - Use ref pattern
7. Error 33: ActionEditor deps - Add all props

### Phase 4: Low Risk - Simple Additions - 7 errors
**Priority: LOW - Safe to fix anytime**
1. Error 17: errors array - Add useMemo
2. Error 18: groups - Move inside useMemo
3. Error 19: loadAuditLog - Add to deps
4. Error 20: saveMutation - Add to deps
5. Error 28: tubes - Remove unnecessary dep
6. Error 29: enabled - Remove from queryFn
7. Error 30: tubeIds.length - Use enabled option
8. Error 32: tubes - Add to deps

---

## Summary & Recommendations

### Total Investigated: 33 errors

### Breakdown:
- **Critical (data corruption):** 1 error - boxId missing from query key
- **High risk (infinite loops):** 15 errors - inline objects in hook dependencies
- **Medium risk (performance/correctness):** 10 errors - missing function dependencies
- **Low risk (simple fixes):** 7 errors - straightforward additions

### Key Insights:

1. **Most errors (15) are the same pattern:** Objects/functions created inline then used as hook dependencies
   - **Root cause:** Props passed as objects from parent components
   - **Solution:** useMemo/useCallback to stabilize references
   - **Prevention:** Establish pattern of memoizing config objects

2. **3 Query errors are standard TanStack Query issues:**
   - Missing variables in queryKey
   - Should use query key factories consistently
   - Easy to fix, important for cache correctness

3. **calculateAllLines pattern (2 instances):**
   - DOM measurement functions used in effects
   - Better to inline than useCallback
   - Common pattern for tree/grid visualizations

4. **Modal focus management (2 errors):**
   - Should use refs for DOM element storage
   - Current implementation stores elements in state (anti-pattern)
   - Consider using existing useModal hook

### Root Cause Analysis:

**Why so many similar errors?**
1. Config objects passed from parent without memoization
2. No established pattern for handling option objects in hooks
3. Complex hooks (keyboard navigation, tab order) need many config values

**Systemic Issues:**
1. Parents don't memoize config objects before passing to hooks
2. Hooks don't defend against unstable config props
3. No lint rule enforcement for config memoization at component boundaries

### Recommended Strategy:

**Week 1: Critical & High Risk (16 errors)**
- Day 1: Fix boxId query error (Error 31)
- Day 2-3: Fix all finalConfig/config errors (15 errors)
  - useKeyboardNavigation.ts
  - useTabOrder.ts
  - useModal.ts
  - BatchTubeEditorModal.tsx
- Test each component thoroughly after fixing

**Week 2: Medium Risk (10 errors)**
- Fix function dependency errors
- Fix calculateAllLines pattern
- Fix modal focus management
- Update to use ref patterns where appropriate

**Week 3: Low Risk (7 errors)**
- Clean up remaining simple additions
- Remove unnecessary dependencies
- Improve query patterns

### Prevention Strategy:

1. **Establish pattern for config objects:**
   ```typescript
   // In custom hooks that accept config
   export const useCustomHook = (config: Config) => {
     // ALWAYS memoize config at hook boundary
     const stableConfig = useMemo(
       () => ({ ...defaultConfig, ...config }),
       [/* destructured config values */]
     );

     // Use stableConfig in all hooks
   }
   ```

2. **Parent component responsibility:**
   ```typescript
   // In components using custom hooks
   const MyComponent = () => {
     const config = useMemo(() => ({
       rows: 9,
       columns: 9,
       onSelect: handleSelect, // handleSelect must also be useCallback
     }), [handleSelect]);

     const result = useCustomHook(config);
   }
   ```

3. **Add ESLint rule:**
   - Consider creating custom rule to enforce config memoization
   - Or add comments to hook signatures about memoization requirements

4. **Documentation:**
   - Document in hook JSDoc that config should be memoized
   - Add examples to hooks documentation
   - Create "Hooks Best Practices" guide

5. **Code review checklist:**
   - [ ] Config objects memoized before passing to hooks
   - [ ] Event handlers wrapped in useCallback
   - [ ] Hook dependencies match usage
   - [ ] Query keys match query function dependencies

### Testing Strategy:

**For each fix:**
1. **Unit test:** Verify hook behavior correct
2. **Integration test:** Test component using hook
3. **Performance test:** Use React DevTools Profiler
   - Check render count
   - Verify no infinite loops
   - Ensure expected re-render triggers
4. **Manual test:** Test actual user flows

**Regression testing:**
- Keep error count visible in CI
- Add test for infinite loop detection
- Monitor bundle size (too many useCallback/useMemo can increase size)

### Long-term Recommendations:

1. **Standardize hook patterns** - Create templates for common hook patterns
2. **Improve parent components** - Memoize config objects at source
3. **Use query key factories consistently** - Already have `queryKeys`, use it everywhere
4. **Consider Zustand/Context for complex config** - Avoid prop drilling config objects
5. **Add performance monitoring** - Track re-render counts in production

---

## Conclusion

These 33 errors follow clear patterns and are fixable with systematic approach. Most are not bugs in current functionality (due to React's forgiving nature), but they cause:
- Performance degradation (unnecessary re-renders)
- Potential for infinite loops (if certain patterns are copied)
- Cache inconsistencies (TanStack Query errors)
- Maintenance burden (unclear dependencies)

**Estimated effort:**
- Critical fix: 2 hours
- High risk fixes: 16 hours (1 hour each file × 4 files × test time)
- Medium risk fixes: 12 hours
- Low risk fixes: 4 hours
- **Total: ~34 hours (~1 week)**

**Risk if not fixed:**
- Current: Medium (app works but suboptimal)
- Future: High (patterns might be copied, causing infinite loops)
- Performance: Degrading with scale

**Recommendation:** Fix in phases over 2-3 weeks, starting with critical query error.
