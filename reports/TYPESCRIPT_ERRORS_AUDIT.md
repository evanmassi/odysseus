# TypeScript Errors Audit Report

**Date**: 2025-10-19
**Total Errors**: ~66 errors
**Status**: Pre-existing (unrelated to useGridNavigation removal)

---

## ⚠️ CRITICAL: FIX METHODOLOGY - READ THIS FIRST ⚠️

**DO NOT APPLY QUICK FIXES OR PATCHES TO THESE ERRORS.**

Each category of errors MUST be approached with the following architectural investigation process:

### Required Investigation Steps (FOR EACH CATEGORY):

1. **Understand the Architectural Intent**
   - Why was the code designed this way in the first place?
   - What was the original architectural decision?
   - What patterns were established in the codebase?

2. **Read the Source Code Architecture**
   - Examine schema definitions and type interfaces
   - Review how data flows through the system (DB → API → Client)
   - Check API contracts and data transformation layers
   - Look at existing usage patterns across the codebase

3. **Identify the Root Architectural Issue**
   - Is the schema wrong, or is the code using it incorrectly?
   - Is there a mismatch between layers (DB schema vs. API contract vs. Client types)?
   - Did a refactor leave orphaned code patterns?

4. **Design the Architecturally Correct Fix**
   - Align the solution with existing architectural patterns
   - Ensure consistency across all layers (backend, API, frontend)
   - Consider migration path if schema changes are needed
   - Verify the fix doesn't break other parts of the system

5. **Prohibited "Fixes"**
   - ❌ Type assertions (`as any`, `as SomeType`) to bypass errors
   - ❌ Quick string concatenations or workarounds
   - ❌ Optional chaining (`?.`) to silence undefined errors without understanding why
   - ❌ Disabling TypeScript rules
   - ❌ Adding properties to types without understanding the domain model

### Example of WRONG Approach:
```typescript
// ❌ BAD: Quick fix that patches the symptom
const name = (researcher as any).name || `${researcher.firstName} ${researcher.lastName}`;
```

### Example of CORRECT Approach:
```typescript
// ✅ GOOD: Understand the schema, check if `name` should exist
// 1. Check Researcher schema definition
// 2. Check database model
// 3. Check API contract
// 4. Determine if schema needs `name` field OR if code should use firstName/lastName
// 5. Fix consistently across all layers
```

---

## Executive Summary

This document catalogs all existing TypeScript compilation errors in the client codebase. These errors were identified during verification after removing the dead `useGridNavigation` code. None of these errors are related to that removal - they represent existing technical debt.

**All fixes must follow the architectural investigation process outlined above.**

---

## Category 1: Researcher Schema Mismatch (10 errors)

**Root Cause**: Code expects `researcher.name` but the type has `firstName` and `lastName` separately.

### Affected Files:

#### `src/app/hooks/useFieldResolverQuery.ts`
- **Line 148**: Property 'name' does not exist on researcher type
- **Line 153**: Property 'name' does not exist on researcher type (second occurrence)

#### `src/domains/search/ui/components/FilterPanel.tsx`
- **Line 88**: Property 'name' does not exist on researcher type

#### `src/domains/researchers/ui/components/ResearcherManagementModal.tsx`
- **Line 96**: Type mismatch - `Pick<Researcher, "firstName" | "lastName">[]` not assignable to full Researcher type
  - Missing properties: `id`, `active`, `createdAt`

**Fix Strategy**:
- Option 1: Add computed `name` property to Researcher type
- Option 2: Update all references to use `${firstName} ${lastName}`
- Option 3: Create a helper function `getResearcherName(researcher)`

---

## Category 2: Index Signature Strictness (40+ errors - TS4111)

**Root Cause**: TypeScript 5.x requires bracket notation for accessing properties from index signatures.

### Affected File:

#### `src/domains/tubes/ui/components/modals/BatchEditModal.tsx`

All errors follow the pattern: `Property 'X' comes from an index signature, so it must be accessed with ['X']`

**Lines with errors**:
- 133: `cellType` (2 occurrences)
- 138: `passage` (3 occurrences)
- 139: `donorInternalId` (2 occurrences)
- 140: `donorInternalId` (2 occurrences)
- 141: `donorSourceId` (2 occurrences)
- 142: `concentration` (1 occurrence)
- 143: `concentration` (2 occurrences)
- 145: `concentrationUnit` (2 occurrences)
- 146: `date` (1 occurrence)
- 147: `date` (2 occurrences)
- 154: `cultureCondition` (2 occurrences)
- 155: `lotNumber` (2 occurrences)
- 156: `notes` (2 occurrences)
- 158: `researcherId` (2 occurrences)

**Fix Strategy**:
- Change all dot notation to bracket notation: `obj.property` → `obj['property']`
- Or refactor to use proper typed interfaces instead of index signatures

---

## Category 3: Position Key Type Safety (2 errors - TS2345)

**Root Cause**: String values not matching strict template literal type for position keys.

### Affected File:

#### `src/app/components/layout/AppHeader.tsx`
- **Line 74**: `Argument of type 'string' is not assignable to parameter of type '${string}:${string}:${string}:${number}'`
- **Line 86**: Same error (second occurrence)

**Fix Strategy**:
- Add type assertion or type guard to validate position key format
- Use helper function that returns properly typed position key

---

## Category 4: Clipboard Source Location (3 errors - TS18048)

**Root Cause**: `clipData.sourceLocation` is possibly undefined but accessed without null check.

### Affected File:

#### `src/app/hooks/grid/useGridController.ts`
- **Line 382**: `clipData.sourceLocation` is possibly 'undefined'
- **Line 383**: `clipData.sourceLocation` is possibly 'undefined'
- **Line 384**: `clipData.sourceLocation` is possibly 'undefined'

**Fix Strategy**:
- Add null check: `if (!clipData.sourceLocation) return;`
- Or provide default value: `clipData.sourceLocation ?? defaultLocation`

---

## Category 5: Form Field Path Issues (3+ errors - TS2345)

**Root Cause**: Using `'researcher'` field path instead of `'researcherId'`.

### Affected File:

#### `src/domains/tubes/ui/components/forms/fields/FormField.tsx`
- **Line 91**: Type `"researcher"` not assignable (should be `"researcherId"`)
- **Line 153**: Same error (second occurrence)
- **Line 219**: Same error (truncated in output)

**Fix Strategy**:
- Replace all instances of `'researcher'` field path with `'researcherId'`

---

## Category 6: Date Type Mismatch (1 error - TS2322)

**Root Cause**: `Date` object not assignable to `string` type.

### Affected File:

#### `src/domains/tubes/utils/tubeInfoHelpers.ts`
- **Line 56**: Type `'string | Date | undefined'` is not assignable to type `'string | undefined'`
  - Type `Date` is not assignable to type `string`

**Fix Strategy**:
- Convert Date to string: `.toISOString()` or format as needed
- Or update type to accept `Date` objects

---

## Category 7: Tubes Query Computed Property (2 errors)

**Root Cause**: Computed property name type issues.

### Affected File:

#### `src/domains/tubes/hooks/useTubesQuery.ts`
- **Line 248**:
  - Error TS2464: A computed property name must be of type 'string', 'number', 'symbol', or 'any'
  - Error TS2538: Type 'undefined' cannot be used as an index type

**Fix Strategy**:
- Add type assertion or default value for computed property
- Ensure property name is never undefined

---

## Category 8: Authentication Token Issues (2 errors - TS2339)

**Root Cause**: Missing `refreshTokens` method on TokenProvider.

### Affected File:

#### `src/infrastructure/api/httpClient.ts`
- **Line 306**: Property 'refreshTokens' does not exist on type 'TokenProvider'
- **Line 340**: Property 'refreshTokens' does not exist on type 'TokenProvider'

**Fix Strategy**:
- Add `refreshTokens` method to TokenProvider interface
- Or use correct method name from TokenProvider

---

## Category 9: Socket Query Bridge Type Mismatch (1 error - TS2739)

**Root Cause**: Object missing required properties for tube type.

### Affected File:

#### `src/infrastructure/socket/queryBridge.ts`
- **Line 322**: Type `{ [x: string]: unknown; id: string; }` is missing the following properties from tube type:
  - Missing: `location`, `sample`, `timestamps`

**Fix Strategy**:
- Properly type the object before assignment
- Add type assertion with validation

---

## Category 10: Focus Trap Return Value (1 error - TS7030)

**Root Cause**: Function doesn't return value in all code paths.

### Affected File:

#### `src/shared/hooks/keyboard/useFocusTrap.ts`
- **Line 164**: Not all code paths return a value

**Fix Strategy**:
- Add return statement to missing code paths
- Or explicitly return `undefined`

---

## Category 11: Modal Component Issues (2 errors)

### Affected File:

#### `src/shared/ui/primitives/Modal/Modal.tsx`
- **Line 317**: Expected 0-1 arguments, but got 3 (TS2554)
- **Line 410**: Property 'containerRef' does not exist on type 'RefObject<HTMLDivElement>' (TS2339)

**Fix Strategy**:
- Fix function call signature on line 317
- Add `containerRef` property or use correct ref property

---

## Category 12: Form Utils instanceof Issue (1 error - TS2358)

### Affected File:

#### `src/shared/utils/formUtils.ts`
- **Line 135**: The left-hand side of an 'instanceof' expression must be of type 'any', an object type or a type parameter

**Fix Strategy**:
- Fix the instanceof check to use proper type
- Add type guard if needed

---

## Recommended Fix Priority

### High Priority (Breaking Functionality)
1. **Category 1** - Researcher schema mismatch (affects search/filtering)
2. **Category 4** - Clipboard source location (potential runtime errors)
3. **Category 8** - Token refresh (authentication issues)

### Medium Priority (Type Safety)
4. **Category 3** - Position key type safety
5. **Category 5** - Form field paths
6. **Category 9** - Socket query bridge

### Low Priority (Strictness)
7. **Category 2** - Index signature warnings (40+ errors but likely working)
8. **Category 6** - Date type mismatch
9. **Category 7** - Computed property types
10. **Category 10** - Focus trap return value
11. **Category 11** - Modal component issues
12. **Category 12** - Form utils instanceof

---

## Investigation Process Template

For each category, follow this process and document findings:

### Step 1: Schema & Type Investigation
- [ ] Locate schema definition (shared-schemas, backend models)
- [ ] Locate TypeScript interfaces (client types)
- [ ] Document the current structure
- [ ] Identify any mismatches

### Step 2: Data Flow Analysis
- [ ] Trace from database model → API response → Client state
- [ ] Check for transformations at each layer
- [ ] Identify where the disconnect occurs

### Step 3: Usage Pattern Review
- [ ] Find all locations using this data
- [ ] Identify the common pattern
- [ ] Determine if pattern is correct or needs update

### Step 4: Architectural Decision
- [ ] Should the schema change? (requires migration)
- [ ] Should the code change? (update usage patterns)
- [ ] Document the decision rationale

### Step 5: Implementation Plan
- [ ] List all files that need changes
- [ ] Define order of changes (backend → API → frontend)
- [ ] Plan for testing and validation

### Step 6: Validation
- [ ] TypeScript compilation passes
- [ ] Runtime behavior unchanged (or intentionally improved)
- [ ] Tests pass
- [ ] No new errors introduced

---

## Next Steps

1. Start with **Category 1** (Researcher Schema) using the investigation process
2. Document findings before making ANY code changes
3. Get architectural decision confirmed
4. Implement fix across all layers consistently
5. Run full test suite after each category
6. Move to next category only after current is complete

---

## Notes

- All errors documented as of TypeScript compilation on 2025-10-19
- No errors related to recent `useGridNavigation` removal
- Errors represent technical debt from schema changes and TypeScript version upgrades
