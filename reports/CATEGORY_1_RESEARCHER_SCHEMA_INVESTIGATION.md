# Category 1: Researcher Schema Investigation

**Date**: 2025-10-19
**Investigator**: AI Assistant
**Status**: Investigation Complete - Ready for Architectural Decision

---

## Investigation Summary

The errors are caused by client code attempting to access a `researcher.name` property that **does not exist** and **never should exist** in the Researcher schema. The schema is **architecturally correct** - it intentionally uses `firstName` and `lastName` as separate fields.

---

## Step 1: Schema & Type Investigation

### ✅ Shared Schema Definition

**File**: `packages/shared-schemas/src/researchers/researcherSchemas.ts`

```typescript
export const researcherSchema = z.object({
  id: z.string(),
  firstName: z.string(),      // ← Separate field
  lastName: z.string(),       // ← Separate field
  position: z.string().optional(),
  department: z.string().optional(),
  email: z.string().optional(),
  active: z.boolean(),
  createdAt: z.union([z.string().datetime(), z.date()])
});

export type Researcher = z.infer<typeof researcherSchema>;
```

**Key Finding**: No `name` field exists. Schema uses `firstName` and `lastName` separately.

### ✅ Backend Entity

**File**: `server/src/domain/entities/Researcher.ts`

**Private fields**:
```typescript
private _firstName: string;
private _lastName: string;
```

**Business methods** (lines 195-214):
- `getFullName()`: Returns `"${firstName} ${lastName}"`
- `getDisplayName()`: Returns `"${lastName}, ${firstName}"` (for lists)
- `getDropdownDisplayName()`: Returns `"${firstName} ${lastName}"` (for dropdowns)

**Entity has TWO different serialization methods**:

1. `toData()` (line 219): For persistence
   - Returns: `{ id, firstName, lastName, position, department, email, active, createdAt }`
   - **No computed name field**

2. `toApiData()` (line 244): For API responses
   - Returns: `{ id, firstName, lastName, position, department, email, active, displayName, createdAt }`
   - **Includes `displayName` - a computed field from `getDisplayName()`**

### ✅ Backend DTO

**File**: `server/src/application/dto/ResearcherDto.ts`

```typescript
export interface ResearcherResponse {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  department?: string;
  email?: string;
  active: boolean;
  createdAt: string;
}
```

**Critical Finding**: The DTO does **NOT** include `displayName`. The `ResearcherDto.toResponse()` method (line 48) only returns the properties shown above.

### ✅ Shared Schema Utility Functions

The schema package provides **official formatting utilities** (lines 94-109):

```typescript
// Format for lists: "Last, First"
export const formatResearcherListDisplay = (
  researcher: Pick<Researcher, 'firstName' | 'lastName'>
): string => {
  return `${researcher.lastName}, ${researcher.firstName}`;
};

// Format for dropdowns: "First Last"
export const formatResearcherDropdownDisplay = (
  researcher: Pick<Researcher, 'firstName' | 'lastName'>
): string => {
  return `${researcher.firstName} ${researcher.lastName}`;
};

// Format full display with position: "First Last (Position)"
export const formatResearcherFullDisplay = (
  researcher: Pick<Researcher, 'firstName' | 'lastName' | 'position'>
): string => {
  const baseName = formatResearcherDropdownDisplay(researcher);
  return researcher.position ? `${baseName} (${researcher.position})` : baseName;
};
```

**Architectural Intent**: The schema package explicitly provides utilities for formatting names in different contexts, confirming that `firstName`/`lastName` separation is intentional.

---

## Step 2: Data Flow Analysis

### Database → API → Client Flow

1. **Database (SQLite)**:
   - Stores: `firstName`, `lastName` (separate columns)

2. **Backend Entity**:
   - Encapsulates: `_firstName`, `_lastName` (private fields)
   - Methods: `getFullName()`, `getDisplayName()`, `getDropdownDisplayName()`

3. **DTO Layer** (`ResearcherDto.toResponse()`):
   - Serializes to: `{ id, firstName, lastName, position, department, email, active, createdAt }`
   - **Does NOT include computed name field**

4. **API Response**:
   - Returns ResearcherResponse shape (no `name` field)

5. **Client**:
   - Imports `Researcher` type from `@odysseus/shared-schemas`
   - **Incorrectly attempts to access `.name` property**

### Mismatch Location

The disconnect occurs at **Step 5** - the client code. The schema and backend are correct and consistent. The client code has incorrect assumptions.

---

## Step 3: Usage Pattern Review

### Error Location 1: `useFieldResolverQuery.ts`

**Lines 148, 153**:
```typescript
findByName: (name: string) => {
  return researchers.find(r =>
    r.name.toLowerCase().includes(name.toLowerCase())  // ❌ r.name doesn't exist
  );
},

getNames: () => {
  return researchers.map(r => r.name).sort();  // ❌ r.name doesn't exist
}
```

**Issue**: Code assumes `researcher.name` exists.

### Error Location 2: `FilterPanel.tsx`

**Line 88**:
```typescript
<span>{researcher.name}</span>  // ❌ researcher.name doesn't exist
```

**Issue**: UI tries to display `researcher.name`.

### Error Location 3: `ResearcherManagementModal.tsx`

**Line 96**:
```typescript
const similar = findSimilarResearchers(
  { firstName: newFirstName.trim(), lastName: newLastName.trim() },
  researchers
);

if (similar.length > 0) {
  setSimilarResearchers(similar);  // ❌ Type mismatch
}
```

**Issue**:
- Line 50: State typed as `useState<Researcher[]>([])` (full type)
- Line 96: `findSimilarResearchers` returns `Pick<Researcher, 'firstName' | 'lastName'>[]` (partial type)
- Assignment fails because Pick type is missing `id`, `active`, `createdAt` fields

---

## Step 4: Root Cause Analysis

### Why No `name` Field?

The architectural decision to use `firstName` and `lastName` separately is **intentional and correct** because:

1. **Data Normalization**: First and last names are atomic pieces of data
2. **Sorting Flexibility**: Can sort by last name (standard for researcher lists)
3. **Format Flexibility**: Different contexts need different formats:
   - Lists: "Last, First"
   - Dropdowns: "First Last"
   - Full display: "First Last (Position)"
4. **International Support**: Some cultures have complex name structures
5. **Form Input**: Create/edit forms need separate first/last name fields

### Why Is Client Code Wrong?

The client code was likely written before the schema was properly defined, or by someone who didn't understand the established pattern. The errors are:

1. **Assumption of `name` field**: Code incorrectly assumes a computed field exists on the data
2. **Not using provided utilities**: Shared schema provides formatting functions but code doesn't use them
3. **Type mismatch**: State expecting full `Researcher` type but getting partial type from utility function

---

## Step 5: Architectural Decision

### ❌ WRONG Approach: Add `name` to schema

This would be architecturally incorrect because:
- Violates data normalization
- Redundant data storage
- Requires database migration
- Loses formatting flexibility
- Goes against established patterns

### ✅ CORRECT Approach: Fix client code

Update client code to:
1. Use `firstName` and `lastName` fields directly
2. Use the provided formatting utilities from `@odysseus/shared-schemas`
3. Fix type mismatches in state declarations

---

## Step 6: Implementation Plan

### Files to Change

1. **`client/src/app/hooks/useFieldResolverQuery.ts`** (lines 148, 153)
   - Replace `r.name` with formatting utility

2. **`client/src/domains/search/ui/components/FilterPanel.tsx`** (line 88)
   - Replace `researcher.name` with formatting utility

3. **`client/src/domains/researchers/ui/components/ResearcherManagementModal.tsx`** (line 50)
   - Fix state type to match return type of `findSimilarResearchers`

### Proposed Fixes

#### Fix 1: `useFieldResolverQuery.ts`

**Before**:
```typescript
findByName: (name: string) => {
  return researchers.find(r =>
    r.name.toLowerCase().includes(name.toLowerCase())
  );
},

getNames: () => {
  return researchers.map(r => r.name).sort();
}
```

**After**:
```typescript
import { formatResearcherDropdownDisplay } from '@odysseus/shared-schemas';

findByName: (name: string) => {
  return researchers.find(r => {
    const fullName = formatResearcherDropdownDisplay(r);
    return fullName.toLowerCase().includes(name.toLowerCase());
  });
},

getNames: () => {
  return researchers
    .map(r => formatResearcherDropdownDisplay(r))
    .sort();
}
```

#### Fix 2: `FilterPanel.tsx`

**Before**:
```typescript
<span>{researcher.name}</span>
```

**After**:
```typescript
import { formatResearcherDropdownDisplay } from '@odysseus/shared-schemas';

<span>{formatResearcherDropdownDisplay(researcher)}</span>
```

#### Fix 3: `ResearcherManagementModal.tsx`

**Before**:
```typescript
const [similarResearchers, setSimilarResearchers] = useState<Researcher[]>([]);
```

**After**:
```typescript
const [similarResearchers, setSimilarResearchers] = useState<Pick<Researcher, 'firstName' | 'lastName'>[]>([]);
```

---

## Step 7: Additional Considerations

### Should We Add `displayName` to API Response?

The backend entity has a `toApiData()` method that includes `displayName`, but the DTO doesn't use it. We have two options:

**Option A: Keep current approach** (recommended)
- Pro: Client has access to firstName/lastName for flexibility
- Pro: Client can choose formatting for different contexts
- Pro: No API changes needed
- Con: Client must format names

**Option B: Add displayName to API response**
- Pro: Simpler client code in some cases
- Pro: Consistent with entity's `toApiData()` method
- Con: Requires API change
- Con: Still need firstName/lastName for forms
- Con: Less flexible for different display formats

**Recommendation**: Keep Option A. The client should use the provided formatting utilities.

---

## Conclusion

**Root Cause**: Client code incorrectly assumes a `name` field exists on Researcher objects.

**Correct Fix**: Update client code to use `firstName`/`lastName` fields with the provided formatting utilities from `@odysseus/shared-schemas`.

**Impact**:
- 3 files to modify
- No schema changes
- No API changes
- No database migration
- Aligns with established architectural patterns

**Ready for Implementation**: ✅ Yes
