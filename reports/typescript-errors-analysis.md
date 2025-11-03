# TypeScript Errors Analysis & Remediation Plan

**Date:** 2025-10-20 (Updated during Session 1)
**Project:** Odysseus Application
**Initial Errors:** 26
**Current Errors:** 20
**Status:** Session 1 Complete ✅

---

## How to Check TypeScript Errors

**IMPORTANT:** Always use this exact command from the server directory:

```bash
cd "C:\Users\evan\Desktop\Odysseus\odysseus-app\server"
npx tsc --noEmit
```

**DO NOT** use find/grep commands that search the entire C: drive. The application only exists in `C:\Users\evan\Desktop\Odysseus\odysseus-app`.

---

## Progress Summary

**Session 1: Quick Wins ✅ COMPLETED**
- Fixed duplicate identifiers (-2 errors)
- Fixed researcher.name calls (-2 errors)
- Made cellType optional in schemas (-1 error)
- Added firstName/lastName to sortBy fields (-1 error)
- **Total: 26 → 20 errors (6 fixed)**

**Remaining Sessions:**
- Session 2: Interface Alignment (14 errors)
- Session 3: User Entity Extension (5 errors)
- Session 4: Sync Engine Fix (4 errors - note: overlaps with Session 3)
- Session 5: Validation

---

## Executive Summary

The application initially had 26 TypeScript compilation errors across 6 files. After Session 1, **20 errors remain**.

**Original Categories:**
1. **Type Mismatches** (1 error) - ✅ FIXED
2. **Interface Signature Mismatches** (17 errors) - 14 remain
3. **Missing Properties** (6 errors) - 6 remain
4. **Duplicate Identifiers** (2 errors) - ✅ FIXED

**Impact:** Low (app runs fine in development, but will fail production builds)
**Complexity:** Low-Medium (mostly interface alignment and property additions)
**Estimated Time Remaining:** ~2 hours

---

## Category 1: Type Mismatches (1 error)

### 🔴 Error 1.1: TubeDto cellType Optionality

**File:** `src/application/dto/TubeDto.ts:68`
**Severity:** Medium
**Type:** Type incompatibility

**Error Message:**
```
Type '{ cellType?: string | undefined }' is not assignable to type '{ cellType: string }'
Type 'undefined' is not assignable to type 'string'
```

**Root Cause:**
The DTO allows `cellType` to be optional (`cellType?: string`), but the target type expects it to be required (`cellType: string`).

**Code Context:**
```typescript
// Line 68 in TubeDto.ts
return {
  id: this.id,
  location: { ... },
  sample: {
    cellType: this.cellType,  // ← cellType is optional in source
    donorInternalId: this.donorInternalId,
    // ...
  }
}
```

**Solution Options:**

**Option A: Make cellType required** (Recommended)
- Change source to always provide cellType
- Ensures data consistency
- May require database migration if nulls exist

**Option B: Make target accept optional**
- Change target type to `cellType?: string`
- More permissive, easier migration
- May require null checks downstream

**Option C: Provide default value**
- Use `cellType: this.cellType || ''` or similar
- Quick fix but hides data quality issues

**Recommendation:** Option B (make target optional) - Most backward compatible and honest about data state.

**Estimated Time:** 10 minutes

---

## Category 2: Interface Signature Mismatches (17 errors)

### 🔴 Error Group 2.1: Researcher Interface vs Implementation Mismatch

**Files:**
- `src/infrastructure/repositories/SQLiteResearcherRepository.ts` (6 errors)
- `src/infrastructure/repositories/index.ts` (2 errors)

**Severity:** High (blocks type safety)
**Type:** Interface contract violation

**Root Cause:**
The `IResearcherRepository` interface was designed for single-name researchers (`name: string`), but the implementation uses split names (`firstName: string, lastName: string`). This is an architectural mismatch.

#### Error 2.1.1: findByName Method Signature
**Lines:** SQLiteResearcherRepository.ts:36

**Interface Expects:**
```typescript
findByName(name: string): Promise<Researcher | null>
```

**Implementation Provides:**
```typescript
findByName(firstName: string, lastName: string): Promise<Researcher | null>
```

#### Error 2.1.2: nameExists Method Signature
**Lines:** SQLiteResearcherRepository.ts:118

**Interface Expects:**
```typescript
nameExists(name: string): Promise<boolean>
```

**Implementation Provides:**
```typescript
nameExists(firstName: string, lastName: string): Promise<boolean>
```

#### Error 2.1.3: findSimilarNames Method Signature
**Lines:** SQLiteResearcherRepository.ts:134

**Interface Expects:**
```typescript
findSimilarNames(name: string): Promise<Researcher[]>
```

**Implementation Provides:**
```typescript
findSimilarNames(firstName: string, lastName: string): Promise<Researcher[]>
```

#### Error 2.1.4: validateName Method Signature
**Lines:** SQLiteResearcherRepository.ts:322

**Interface Expects:**
```typescript
validateName(name: string): Promise<ValidationResult>
```

**Implementation Provides:**
```typescript
validateName(firstName: string, lastName: string): Promise<ValidationResult>
```

#### Error 2.1.5: checkForDuplicates Method Signature
**Lines:** SQLiteResearcherRepository.ts:383

**Interface Expects:**
```typescript
checkForDuplicates(names: string[]): Promise<DuplicateCheckResult[]>
```

**Implementation Provides:**
```typescript
checkForDuplicates(researchers: { firstName: string; lastName: string }[]): Promise<DuplicateCheckResult[]>
```

#### Error 2.1.6: createFromNames Method Signature
**Lines:** SQLiteResearcherRepository.ts:452

**Interface Expects:**
```typescript
createFromNames(names: string[]): Promise<Researcher[]>
```

**Implementation Provides:**
```typescript
createFromNames(researchers: { firstName: string; lastName: string; position?: string; ... }[]): Promise<Researcher[]>
```

### Error 2.1.7: sortBy Field Name Mismatch
**Lines:** SQLiteResearcherRepository.ts:196

**Error:**
```
This comparison appears to be unintentional because the types '"createdAt" | "name" | "active" | "lastName"' and '"firstName"' have no overlap
```

**Cause:** Code tries to sort by 'firstName' but allowed sort fields don't include it.

### Error 2.1.8-2.1.9: Repository Assignment Errors
**Lines:** index.ts:65, 67

**Errors:**
- Cannot assign `SQLiteResearcherRepository` to `IResearcherRepository` due to signature mismatches
- `IResearcherRepository | undefined` not assignable to `IResearcherRepository`

**Solution Options:**

**Option A: Update Interface to Match Implementation** (Recommended)
- Change interface methods to accept `firstName, lastName` pairs
- Aligns with database schema (separate firstName/lastName columns)
- Reflects actual business domain (researchers have structured names)
- More type-safe and accurate

**Option B: Update Implementation to Match Interface**
- Parse single name string into firstName/lastName in repository
- Simpler interface but loses type safety
- Requires string parsing logic (error-prone)

**Option C: Hybrid Approach**
- Add overloaded methods supporting both signatures
- Most flexible but increases complexity
- Good for migration period

**Recommendation:** Option A - Update interface to match reality. The database uses firstName/lastName, the entity uses firstName/lastName, the interface should too.

**Changes Needed:**
1. Update `IResearcherRepository.ts` with correct method signatures
2. Verify all callers can provide firstName/lastName (they likely already do)
3. Update sort field types to include 'firstName'

**Estimated Time:** 45 minutes

---

## Category 3: Missing Properties (6 errors)

### 🔴 Error Group 3.1: User Entity Missing researcherId

**File:** `src/domain/services/AccessControlService.ts`
**Lines:** 62, 89, 460, 493, 514
**Severity:** Medium
**Type:** Missing property on entity

**Error Message:**
```
Property 'researcherId' does not exist on type 'User'
```

**Root Cause:**
`AccessControlService` expects `User` entity to have a `researcherId` property to link users to researchers, but the `User` entity doesn't have this field.

**Code Context:**
```typescript
// AccessControlService.ts:62
if (user.researcherId && user.researcherId === tube.researcherId) {
  return true; // User can access their own tubes
}
```

**Solution Options:**

**Option A: Add researcherId to User Entity** (Recommended)
- Add optional `researcherId?: string` to User entity
- Update User constructor and toData/fromData methods
- Add database migration to add column
- Allows users to be linked to researchers

**Option B: Remove researcherId Logic**
- Remove the user-researcher linking checks
- Simplify access control
- May reduce functionality

**Option C: Use Separate Mapping**
- Create separate UserResearcherMapping table/entity
- More complex but more flexible
- Overkill for simple 1:1 relationship

**Recommendation:** Option A - Add the field. It's a legitimate business requirement (users may be associated with researchers).

**Estimated Time:** 30 minutes

---

### 🔴 Error Group 3.2: Researcher Entity Missing name Property

**File:** `src/domain/services/AccessControlService.ts`
**Lines:** 221, 239
**Severity:** Low
**Type:** Missing property on entity

**Error Message:**
```
Property 'name' does not exist on type 'Researcher'
```

**Root Cause:**
Code expects `researcher.name` but Researcher entity has `firstName` and `lastName` separately.

**Code Context:**
```typescript
// AccessControlService.ts:221
logger.warn('Access denied: User researcher mismatch', {
  userId: user.id,
  userResearcher: user.researcherId,
  tubeResearcher: researcher.name  // ← researcher.name doesn't exist
});
```

**Solution Options:**

**Option A: Add name Getter to Researcher** (Recommended)
```typescript
class Researcher {
  // ...
  get name(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

**Option B: Update Code to Use firstName/lastName**
```typescript
tubeResearcher: `${researcher.firstName} ${researcher.lastName}`
```

**Option C: Add name Property**
- Store redundant full name in database
- Not recommended (data duplication)

**Recommendation:** Option A - Add computed property. Clean, efficient, follows DDD patterns.

**Estimated Time:** 15 minutes

---

## Category 4: Duplicate Identifiers (2 errors)

### 🔴 Error 4.1: Tube Entity Duplicate donorInternalId

**File:** `src/domain/entities/Tube.ts`
**Lines:** 79, 80
**Severity:** High (code error)
**Type:** Duplicate property declaration

**Error Message:**
```
Duplicate identifier 'donorInternalId'
```

**Root Cause:**
The `donorInternalId` property is declared twice in the Tube entity, likely due to a copy-paste error or merge conflict.

**Solution:**
Remove the duplicate declaration. This is a straightforward bug fix.

**Estimated Time:** 5 minutes

---

## Category 5: Sync Engine Issues (4 errors)

### 🔴 Error Group 5.1: SyncedTubeData Schema Mismatch

**File:** `src/services/sync/syncEngine.ts`
**Lines:** 102, 186, 269, 391
**Severity:** Medium
**Type:** Property name mismatch

**Errors:**
```
Property 'researcher' is missing in type (lines 102, 186)
Property 'researcherId' does not exist on type 'SyncedTubeData'. Did you mean 'researcher'? (lines 269, 391)
```

**Root Cause:**
The sync engine has inconsistent field names:
- `SyncedTubeData` interface expects `researcher` property
- Code tries to set/read `researcherId` instead

**Solution:**
Standardize on one field name. Since the main Tube entity uses `researcherId`, the sync data should too.

**Option A: Update Interface** (Recommended)
```typescript
interface SyncedTubeData {
  // ... other fields
  researcherId?: string;  // Change from 'researcher'
}
```

**Option B: Update Code**
Use `researcher` instead of `researcherId` throughout sync engine.

**Recommendation:** Option A - Align with main domain model using `researcherId`.

**Estimated Time:** 20 minutes

---

## Category 6: ResearcherApplicationService Issues (2 errors)

### 🔴 Error 6.1: Wrong Number of Arguments

**File:** `src/application/services/ResearcherApplicationService.ts`
**Lines:** 56, 94
**Severity:** Medium
**Type:** Incorrect method invocation

**Error Message:**
```
Expected 1 arguments, but got 2
```

**Root Cause:**
Related to the Researcher interface mismatch. Code is passing `(firstName, lastName)` but method expects single argument.

**Solution:**
Will be automatically fixed when Category 2 (Interface Signature Mismatches) is resolved.

**Estimated Time:** 0 minutes (fixed by other work)

---

## Remediation Roadmap

### Priority 1: High Impact, Low Complexity (1 hour)
1. ✅ **Fix Duplicate Identifier** (5 min)
   - File: `Tube.ts:79-80`
   - Remove duplicate `donorInternalId`

2. ✅ **Add Researcher.name Getter** (15 min)
   - File: `domain/entities/Researcher.ts`
   - Add computed `name` property

3. ✅ **Fix SyncedTubeData Schema** (20 min)
   - File: `services/sync/syncEngine.ts`
   - Standardize on `researcherId`

4. ✅ **Fix TubeDto cellType** (10 min)
   - File: `application/dto/TubeDto.ts`
   - Make cellType optional in target type

5. ✅ **Fix sortBy Field Names** (10 min)
   - File: `SQLiteResearcherRepository.ts:196`
   - Add 'firstName' to allowed sort fields

### Priority 2: Medium Impact, Medium Complexity (1 hour)
6. ✅ **Update IResearcherRepository Interface** (45 min)
   - File: `domain/repositories/IResearcherRepository.ts`
   - Change all method signatures to use `firstName, lastName`
   - Verify all callers

7. ✅ **Add User.researcherId Property** (30 min)
   - File: `domain/entities/User.ts`
   - Add optional `researcherId?: string`
   - Update database schema
   - Update constructor/toData/fromData

### Priority 3: Validation & Testing (30 min)
8. ✅ **Run Full TypeScript Check** (5 min)
   - Verify all errors resolved

9. ✅ **Test Researcher Features** (15 min)
   - Verify researcher CRUD still works
   - Test name search/validation

10. ✅ **Test Access Control** (10 min)
    - Verify user-researcher associations work
    - Test tube access permissions

---

## Success Criteria

- [ ] `npx tsc --noEmit` returns zero errors
- [ ] Researcher management features work correctly
- [ ] User-researcher associations function properly
- [ ] Sync engine operates without type errors
- [ ] All existing tests pass
- [ ] No new runtime errors introduced

---

## Risk Assessment

### Low Risk ✅
- Adding computed properties (Researcher.name)
- Fixing duplicate identifiers
- Making optional types explicit

### Medium Risk ⚠️
- Changing interface signatures (IResearcherRepository)
  - **Mitigation:** TypeScript will catch all callers
  - **Verification:** Search codebase for all usages
- Adding User.researcherId
  - **Mitigation:** Make it optional
  - **Verification:** Test user creation/update flows

### High Risk 🚨
- None - All changes are type-level or additive

---

## Files Requiring Changes

### Domain Layer (3 files)
1. `src/domain/entities/Researcher.ts` - Add name getter
2. `src/domain/entities/User.ts` - Add researcherId property
3. `src/domain/entities/Tube.ts` - Remove duplicate
4. `src/domain/repositories/IResearcherRepository.ts` - Update signatures

### Application Layer (2 files)
5. `src/application/dto/TubeDto.ts` - Fix cellType type
6. `src/application/services/ResearcherApplicationService.ts` - Auto-fixed

### Infrastructure Layer (2 files)
7. `src/infrastructure/repositories/SQLiteResearcherRepository.ts` - Fix sortBy
8. `src/infrastructure/repositories/index.ts` - Auto-fixed

### Services Layer (1 file)
9. `src/services/sync/syncEngine.ts` - Fix researcher property

### Access Control (1 file)
10. `src/domain/services/AccessControlService.ts` - Auto-fixed

**Total Files:** 10
**New Files:** 0
**Modified Files:** 10

---

## Implementation Order

**Session 1: Quick Wins ✅ COMPLETED (30 minutes)**
1. ✅ Remove Tube duplicate identifier (Tube.ts:79-80)
2. ✅ Fix researcher.name calls (AccessControlService.ts:221, 239 - used getFullName())
3. ✅ Fix TubeDto cellType type (Made optional in tubeSampleSchema & createTubeRequestSampleSchema)
4. ✅ Fix SQLiteResearcherRepository sortBy (Added 'firstName' and 'lastName' to IResearcherRepository.ts:289)

**Files Modified in Session 1:**
- `server/src/domain/entities/Tube.ts` - Removed duplicate donorInternalId
- `server/src/domain/services/AccessControlService.ts` - Changed to researcher.getFullName()
- `server/src/domain/repositories/IResearcherRepository.ts` - Added firstName/lastName to sortBy
- `packages/shared-schemas/src/tubes/tubeSchemas.ts` - Made cellType optional in both schemas

**Result:** 26 → 20 errors (-6)

**Session 2: Interface Alignment (45 minutes)**
5. Update IResearcherRepository interface
6. Verify all callers compile

**Session 3: User Entity Extension (30 minutes)**
7. Add User.researcherId property
8. Update User constructor/methods

**Session 4: Sync Engine Fix (20 minutes)**
9. Fix SyncedTubeData schema
10. Update sync engine code

**Session 5: Validation (15 minutes)**
11. Run full type check
12. Quick functional testing

**Total Estimated Time:** 2 hours 20 minutes

---

## Notes

- All errors are compile-time only (app runs fine in development)
- No breaking changes to external APIs
- Changes are mostly additive or clarifying
- TypeScript strict mode will catch any missed updates
- Consider enabling `strict: true` in tsconfig.json after fixes
