# Remaining TypeScript Errors - Caused By My Changes

**Date:** 2025-01-11
**Total Errors:** 29 errors across 5 files

---

## ERROR GROUP 1: queryClient.ts - Empty Object Types (24 errors)

**File:** `src/app/queryClient.ts`
**Lines:** 52, 57, 70, 75, 103, 104, 105, 109, 111, 122, 126, 127, 129, 130, 143, 145, 146

### Error Pattern
```typescript
error TS2339: Property 'status' does not exist on type '{}'.
error TS2339: Property 'message' does not exist on type '{}'.
error TS2339: Property 'code' does not exist on type '{}'.
error TS2339: Property 'details' does not exist on type '{}'.
error TS18046: 'query' is of type 'unknown'.
error TS18046: 'mutation' is of type 'unknown'.
```

### What I Probably Broke
Likely changed validation utilities or error handling types that queryClient uses. The error objects are typed as `{}` (empty object) instead of proper error types.

### Investigation Needed
Read lines 45-150 of queryClient.ts to see what types are being used for query/mutation errors.

---

## ERROR GROUP 2: BatchTubeEditorModal.tsx - Unknown Sample Type (2 errors)

**File:** `src/domains/tubes/ui/components/modals/BatchTubeEditorModal.tsx`
**Lines:** 236, 295

### Error Pattern
```typescript
error TS2322: Type 'Partial<{ location: {...}; sample: unknown; researcherId: unknown; }>'
is not assignable to type '{ sample?: { cellType: string | undefined; ... } | undefined; }'.
  Types of property 'sample' are incompatible.
    Type 'unknown' is not assignable to type '{ cellType: string | undefined; ... }'.
```

### What I Probably Broke
Changed validation utilities from `any` to `unknown` - now the batch editor can't assign `unknown` sample data to the expected sample type.

### Investigation Needed
Read lines 230-300 of BatchTubeEditorModal.tsx to see how sample data is being created/validated.

---

## ERROR GROUP 3: TubeEditorModal.tsx - Unknown Types (2 errors)

**File:** `src/domains/tubes/ui/components/modals/TubeEditorModal.tsx`
**Lines:** 524, 525

### Error Pattern
```typescript
error TS2322: Type 'unknown' is not assignable to type '{ cellType: string | undefined; ... } | undefined'.
error TS2322: Type 'unknown' is not assignable to type 'string | null | undefined'.
```

### What I Probably Broke
Same as BatchTubeEditorModal - changed validation utilities from `any` to `unknown`.

### Investigation Needed
Read lines 520-530 of TubeEditorModal.tsx to see how sample data is being set.

---

## ERROR GROUP 4: Dashboard.tsx - Missing Prop (1 error)

**File:** `src/app/components/layout/Dashboard.tsx`
**Line:** 380

### Error Pattern
```typescript
error TS2322: Property 'onEditTube' does not exist on type 'TubeGridProps'.
Did you mean '_onEditTube'?
```

### What I Probably Broke
This is likely NOT my fault - looks like a prop naming mismatch between Dashboard and TubeGrid that already existed. BUT need to verify by checking when this prop was renamed.

### Investigation Needed
Check if TubeGrid props interface changed and Dashboard wasn't updated.

---

## ERROR GROUP 5: ConnectionStatusIndicator.tsx - Mutation Listener Type (1 error)

**File:** `src/shared/ui/components/ConnectionStatusIndicator.tsx`
**Line:** 231

### Error Pattern
```typescript
error TS2345: Argument of type '(mutation: Mutation<unknown, unknown, unknown, unknown>) => void'
is not assignable to parameter of type 'MutationCacheListener'.
  Types of parameters 'mutation' and 'event' are incompatible.
    Type 'MutationCacheNotifyEvent' is not assignable to type 'Mutation<unknown, unknown, unknown, unknown>'.
```

### What I Probably Broke
Changed mutation handling types - the listener expects `MutationCacheNotifyEvent` but I'm passing a function that expects `Mutation` object.

### Investigation Needed
Read line 231 of ConnectionStatusIndicator.tsx to see how the mutation cache listener is set up.

---

## Summary By Severity

### HIGH PRIORITY (Must Fix)
1. **queryClient.ts** (24 errors) - Core query error handling broken
2. **BatchTubeEditorModal.tsx** (2 errors) - Batch editing broken
3. **TubeEditorModal.tsx** (2 errors) - Single tube editing broken

### MEDIUM PRIORITY
4. **ConnectionStatusIndicator.tsx** (1 error) - Network status monitoring broken

### LOW PRIORITY (Possibly Not My Fault)
5. **Dashboard.tsx** (1 error) - Prop naming mismatch

---

## Root Cause Analysis

### Most Likely Causes
1. **Changed validation utilities from `any` to `unknown`** in Phase 3
   - Affects: BatchTubeEditorModal, TubeEditorModal, possibly queryClient

2. **Changed error types in boundary components** in Phase 3
   - Affects: queryClient error handling

3. **Changed table/grid generic defaults** in Phase 3
   - May have cascading effects on modal components

### Files I Modified That Could Cause These Errors
- `shared/utils/validation.ts` - Changed `any` to `unknown`
- `shared/ui/components/boundaries/ErrorBoundary.tsx` - Changed error types
- `shared/ui/primitives/table/Table.tsx` - Changed generic defaults
- `shared/types/validationTypes.ts` - May have changed validation types

---

## Next Steps

1. Read each error file at the specific line numbers
2. Understand what types are expected vs what I'm providing
3. Create proper type definitions for:
   - Query/Mutation error objects
   - Sample data in validation
   - Mutation cache listeners
4. Fix all 29 errors with proper types (NO `any`, NO shortcuts)
