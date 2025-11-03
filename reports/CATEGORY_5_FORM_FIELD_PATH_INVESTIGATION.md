# Category 5: Form Field Path Investigation

**Date**: 2025-10-19
**Investigator**: AI Assistant
**Status**: Investigation Complete

---

## Error Summary

**File**: `src/domains/tubes/ui/components/forms/fields/FormField.tsx`
**Error Count**: 4 errors (TS2345)
**Error Type**: `Argument of type 'TubeFormFieldPath' is not assignable to parameter`

**Affected Lines**:
- Line 91: `form.register(name)` in TextField component
- Line 153: `form.register(name)` in SelectField component
- Line 219: `form.register(name)` in DateField component
- Line 275: `form.register(name)` in TextAreaField component

**Error Message**:
```
Argument of type 'TubeFormFieldPath' is not assignable to parameter of type
'"location" | "sample" | "researcherId" | "sample.cellType" | ... '
Type '"researcher"' is not assignable to type '"researcherId" | ...'
```

---

## Step 1: Understanding the Error

### What is TS2345?

TypeScript error TS2345 occurs when trying to pass an argument of one type to a function that expects a different type.

In this case:
- `form.register()` expects field paths that exist in `CreateTubeRequest`
- `TubeFormFieldPath` includes `'researcher'`
- But `CreateTubeRequest` schema uses `'researcherId'`
- Result: Type mismatch

---

## Step 2: Schema Investigation

### CreateTubeRequest Schema

**File**: `packages/shared-schemas/src/tubes/tubeSchemas.ts` (lines 142-146)

```typescript
export const createTubeRequestSchema = z.object({
  location: tubeLocationSchema,
  sample: createTubeRequestSampleSchema,
  researcherId: optionalFromEmpty(z.string())  // ✅ Uses 'researcherId'
});

export type CreateTubeRequest = z.output<typeof createTubeRequestSchema>;
```

**Actual field name**: `researcherId`

### TubeFormFieldPath Type Definition

**File**: `client/src/domains/tubes/ui/components/forms/fields/FormField.tsx` (lines 18-29)

```typescript
type TubeFormFieldPath =
  | 'researcher'  // ❌ INCORRECT: Should be 'researcherId'
  | 'sample.cellType'
  | 'sample.donorInternalId'
  | 'sample.donorSourceId'
  | 'sample.concentration'
  | 'sample.concentrationUnit'
  | 'sample.date'
  | 'sample.media'
  | 'sample.cultureCondition'
  | 'sample.lotNumber'
  | 'sample.notes';
```

**Problem**: Line 19 defines `'researcher'` but the schema uses `'researcherId'`

---

## Step 3: Root Cause Analysis

### Why the Mismatch Exists

**Historical Context**:
1. **Original Schema**: The `CreateTubeRequest` schema always used `researcherId` (foreign key to Researcher table)
2. **Type Definition**: Someone manually created `TubeFormFieldPath` type
3. **Typo/Misunderstanding**: They wrote `'researcher'` instead of `'researcherId'`
4. **TypeScript Caught It**: Type system correctly identifies the mismatch

### How React Hook Form Works

React Hook Form's `register()` method:
```typescript
form.register(name: Path<CreateTubeRequest>)
```

It expects `name` to be a valid path in the `CreateTubeRequest` type:
- ✅ `'researcherId'` - Valid (exists in schema)
- ❌ `'researcher'` - Invalid (doesn't exist in schema)

The `TubeFormFieldPath` type should **exactly match** the valid paths in `CreateTubeRequest`.

---

## Step 4: Verification

### Check All Form Usage

Looking at the component structure:
- `TextField` - Line 91 uses `form.register(name)`
- `SelectField` - Line 153 uses `form.register(name)`
- `DateField` - Line 219 uses `form.register(name)`
- `TextAreaField` - Line 275 uses `form.register(name)`

All four components call `form.register(name)` where `name` is of type `TubeFormFieldPath`.

When `name` is `'researcher'`:
- TypeScript error: `'researcher'` is not a valid field in `CreateTubeRequest`
- The schema expects `'researcherId'`

---

## Step 5: Architectural Decision

### ❌ WRONG Approach: Add 'researcher' to Schema

```typescript
// ❌ BAD: Changes API contract
export const createTubeRequestSchema = z.object({
  researcher: optionalFromEmpty(z.string())  // Wrong field name
});
```

**Why this is wrong**:
- Breaks API contract (backend uses `researcherId`)
- Breaks database schema (column is `researcher_id`)
- Would require massive changes across backend, database, and other clients
- The schema is correct - it's the frontend type that's wrong

### ❌ WRONG Approach: Type Assertion

```typescript
// ❌ BAD: Hides the type error without fixing root cause
<TextField
  name={'researcher' as any}
  // ...
/>
```

**Why this is wrong**:
- Runtime error: Form won't work (field doesn't exist in schema)
- Loses type safety
- Doesn't fix the actual problem
- Will confuse future developers

### ✅ CORRECT Approach: Fix the Type Definition

```typescript
// ✅ GOOD: Match the actual schema
type TubeFormFieldPath =
  | 'researcherId'  // ✅ Correct field name
  | 'sample.cellType'
  // ... rest unchanged
```

**Why this is correct**:
- ✅ Matches the actual schema (`CreateTubeRequest`)
- ✅ Maintains type safety
- ✅ No runtime changes (schema is already correct)
- ✅ No API changes (backend already uses `researcherId`)
- ✅ Self-documenting code (type matches reality)
- ✅ Follows single source of truth principle (schema is source of truth)

---

## Step 6: Impact Analysis

### Files Using TubeFormFieldPath

The type is used only in `FormField.tsx` for component props. Changing it from `'researcher'` to `'researcherId'` will:

1. **FormField.tsx**: Type definition changes (line 19)
2. **Components using these fields**: None affected (they should already be using `'researcherId'` if they work correctly)

### Runtime Behavior

**Before Fix** (if someone tried to use `'researcher'`):
- Would compile with type error
- Would fail at runtime (field doesn't exist in form)
- Form validation would fail

**After Fix**:
- Compiles without error
- Type system enforces correct field name
- Prevents mistakes at compile time

---

## Step 7: Implementation Plan

### Files to Change

1. **`client/src/domains/tubes/ui/components/forms/fields/FormField.tsx`** - Fix type definition (line 19)

### Specific Changes

#### Change 1: FormField.tsx (line 19)

**Before**:
```typescript
type TubeFormFieldPath =
  | 'researcher'  // ❌ Wrong field name
  | 'sample.cellType'
```

**After**:
```typescript
type TubeFormFieldPath =
  | 'researcherId'  // ✅ Matches schema
  | 'sample.cellType'
```

---

## Step 8: Validation Criteria

After implementing the fix:
- ✅ All 4 TS2345 errors should disappear
- ✅ Type system enforces correct field name
- ✅ No runtime behavior changes (schema already correct)
- ✅ No API changes
- ✅ No functional changes
- ✅ Type safety improved (prevents using wrong field name)

---

## Conclusion

**Root Cause**: Manual type definition used incorrect field name `'researcher'` instead of `'researcherId'`.

**Correct Fix**: Update `TubeFormFieldPath` type to use `'researcherId'` to match the actual schema.

**Impact**:
- 1 file to modify
- 1 line changed (single word: `researcher` → `researcherId`)
- 4 errors resolved
- Improved type safety
- No schema changes
- No API changes
- No runtime changes
- Type definition now matches single source of truth (schema)

**Ready for Implementation**: ✅ Yes
