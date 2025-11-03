# Odysseus Tube Management - Complete Workflow Analysis & Issues Report

## Executive Summary

This report identifies **critical architectural issues** preventing the tube add/edit workflow from working properly. The problems span validation, data transformation, and required field handling across the entire stack.

**Primary Issues:**
1. **Researcher field incorrectly required** - Should default to "Unknown" but enforced as required in domain
2. **Concentration parsing inconsistent** - Multiple parsers with different behaviors cause data loss
3. **Validation conflicts** - Client and server schemas have misaligned rules
4. **Missing default values** - No proper defaulting mechanism for optional fields

---

## 🔴 CRITICAL ISSUE #1: Researcher Field Required (Should be Optional)

### **Problem Statement**
The researcher field is enforced as **required** in the domain layer, but user requirement is: _"only cell type should be required, researcher should default to 'Unknown'"_

### **Root Causes**

#### 1. Domain Schema Enforces Required Researcher
- **File:** `packages/shared-schemas/src/tubes/tubeSchemas.ts`
- **Line:** 170
- **Code:**
```typescript
researcher: z.string().min(1, 'Researcher is required'),
```
- **Impact:** Domain validation rejects any tube without a researcher, blocking creation

#### 2. Client Doesn't Apply Default
- **File:** `client/src/domains/tubes/hooks/useTubeForm.ts`
- **Line:** 82-83
- **Code:**
```typescript
researcher: formData.researcher?.trim() || undefined
```
- **Impact:** Sends `undefined` to server when field is empty, which fails domain validation
- **Note:** `UNKNOWN_RESEARCHER` constant is imported (line 23) but **never used**

#### 3. Server Doesn't Apply Default
- **File:** `server/src/application/services/TubeApplicationService.ts`
- **Lines:** 33-53 (createTube method)
- **Impact:** No defaulting logic - passes data directly to domain validation which fails

#### 4. Deprecated Schema Also Wrong
- **File:** `packages/shared-schemas/src/tubes/tubeSchemas.ts`
- **Lines:** 332-338 (`tubeFormValidationSchema`)
- **Code:**
```typescript
researcher: z.string().min(1, 'Researcher is required'),
```
- **Impact:** If any legacy code uses this, researcher is incorrectly required

### **Fix Strategy**

**Option A: Default at Client (Recommended)**
```typescript
// In useTubeForm.ts line 82
researcher: formData.researcher?.trim() || UNKNOWN_RESEARCHER
```

**Option B: Default at Server**
```typescript
// In TubeApplicationService.ts createTube before validation
const tubeData = TubeDto.fromCreateRequest({
  ...request,
  researcher: request.researcher || UNKNOWN_RESEARCHER
});
```

**Option C: Domain Schema Change**
```typescript
// In tubeSchemas.ts line 170
researcher: z.string().default(UNKNOWN_RESEARCHER)
```

**Recommended: Implement Option A + C** for defense in depth

---

## 🔴 CRITICAL ISSUE #2: Concentration Parsing Inconsistent & Lossy

### **Problem Statement**
User should input **any scientific notation** (5e6, 1.5E7, 3.2e8), stored as **number**, displayed as **X.XEX format**. Current implementation has **3 different parsers** with conflicting behaviors.

### **Root Causes**

#### 1. Schema Uses `parseFloat` (Too Permissive)
- **File:** `packages/shared-schemas/src/tubes/tubeSchemas.ts`
- **Lines:** 72-84 (`optionalConcentrationFromForm`)
- **Code:**
```typescript
const parsed = parseFloat(val);
return isNaN(parsed) ? undefined : parsed;
```
- **Problem:** `parseFloat("5e6xxx")` returns `5000000` (silently drops trailing junk)

#### 2. Client Uses `Number()` (More Strict)
- **File:** `client/src/domains/tubes/hooks/useTubeForm.ts`
- **Lines:** 59-61
- **Code:**
```typescript
const n = Number(trimmed);
return Number.isFinite(n) ? n : undefined;
```
- **Problem:** `Number("5e6xxx")` returns `NaN` → becomes `undefined` (data loss)

#### 3. Utility Uses Custom Regex Parser
- **File:** `client/src/shared/utils/concentrationConverter.ts`
- **Lines:** 39-54
- **Code:**
```typescript
const scientificPatterns = [
  /^(\d*\.?\d+)[eE]([+-]?\d+)$/, // Standard: 5e6, 5.0E+06
  /^(\d*\.?\d+)[eE]([+-]?0*\d+)$/, // With leading zeros: 5e06
];
```
- **Problem:** **Never used in submission flow!** Only available but not integrated

#### 4. Server Also Uses `parseFloat`
- **File:** `server/src/application/dto/TubeDto.ts`
- **Lines:** 102-106
- **Code:**
```typescript
const concentration = request.sample.concentration !== undefined && request.sample.concentration !== null
  ? (typeof request.sample.concentration === 'string' 
      ? parseFloat(request.sample.concentration) 
      : request.sample.concentration)
  : undefined;
```

### **Current Behavior Examples**

| Input | Zod Schema (parseFloat) | Client Transform (Number) | Server DTO (parseFloat) | Result |
|-------|------------------------|---------------------------|-------------------------|--------|
| `"5e6"` | ✅ 5000000 | ✅ 5000000 | ✅ 5000000 | ✅ Works |
| `"1.5E7"` | ✅ 15000000 | ✅ 15000000 | ✅ 15000000 | ✅ Works |
| `"5e6xxx"` | ✅ 5000000 (junk dropped) | ❌ NaN → undefined | ✅ 5000000 | ❌ **Data loss in client** |
| `"5 e6"` | ❌ NaN | ❌ NaN | ❌ NaN | ❌ Fails |
| `"5,000,000"` | ✅ 5 (stops at comma) | ❌ NaN | ✅ 5 | ❌ **Wrong value** |

### **Display Formatting**

#### Current Implementation
- **File:** `client/src/shared/utils/scientificNotation.ts` (assumed from imports)
- **Function:** `formatToScientificNotation()`
- **File:** `client/src/domains/tubes/ui/inputs/ConcentrationInput.tsx`
- **Lines:** 76-79 - Auto-formats on blur for values ≥ 1000

**Problem:** Formatting function exists but inconsistent application. Some places format, others don't.

### **Fix Strategy**

**1. Standardize Parsing Everywhere**
Use the robust parser from `concentrationConverter.ts`:
```typescript
// Replace all parseFloat/Number with:
import { normalizeConcentration } from '@shared/utils/concentrationConverter';

// In schemas (tubeSchemas.ts):
const optionalConcentrationFromForm = () =>
  z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      return normalizeConcentration(val);
    },
    z.number().optional()
  );

// In client transform (useTubeForm.ts):
const parseConcentration = (raw: string | number | undefined): number | undefined => {
  return normalizeConcentration(raw);
};

// In server DTO (TubeDto.ts):
const concentration = normalizeConcentration(request.sample.concentration);
```

**2. Consistent Display Format**
```typescript
// Create display utility
export function formatConcentrationDisplay(value: number | undefined): string {
  if (value === undefined || value === null) return '';
  if (value === 0) return '0';
  
  // Always format as X.XEX (e.g., 5.0E6, 1.5E7)
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exponent);
  return `${mantissa.toFixed(1)}E${exponent}`;
}
```

---

## 🟡 ISSUE #3: Concentration Unit Defaults Incorrectly

### **Problem**
- **File:** `client/src/domains/tubes/ui/components/forms/TubeForm.tsx`
- **Line:** 138
- **Code:**
```typescript
unitValue={concentrationUnitController.field.value || 'c/v'}
```

**Impact:** Unit defaults to `'c/v'` even when concentration is empty, violating the "both or neither" rule.

**Fix:**
```typescript
unitValue={concentrationUnitController.field.value || ''} // No default
```

And update ConcentrationInput to show placeholder when empty:
```typescript
<select
  value={unitValue || ''}
  className={...}
>
  <option value="">--</option>
  <option value="c/v">c/v</option>
  <option value="c/mL">c/mL</option>
</select>
```

---

## 🟡 ISSUE #4: Validation Refinement Conflicts

### **Problem**
- **File:** `packages/shared-schemas/src/tubes/tubeSchemas.ts`
- **Lines:** 301-317
- **Code:**
```typescript
.refine(
  (sample) => {
    const hasConcentration = 
      sample.concentration !== undefined && 
      sample.concentration !== null;
    const hasUnit = 
      sample.concentrationUnit !== undefined && 
      sample.concentrationUnit !== null;
    
    // Both present or both empty
    return (hasConcentration && hasUnit) || (!hasConcentration && !hasUnit);
  },
  {
    message: 'Concentration and unit must be provided together',
    path: ['concentrationUnit']
  }
);
```

**Impact:** This is **only on `tubeFormSampleSchema`** (for forms), NOT on `createTubeRequestSampleSchema` (for API).

Result: Form validation requires "both or neither", but API schema allows concentration without unit (inconsistency).

**Fix:** Apply same refinement to `createTubeRequestSampleSchema`:
```typescript
export const createTubeRequestSampleSchema = z.object({
  // ... existing fields
}).refine(
  (sample) => {
    // Same logic as tubeFormSampleSchema
  },
  { message: 'Concentration and unit must be provided together', path: ['concentrationUnit'] }
);
```

---

## 🟡 ISSUE #5: Nested Structure Transformation Complexity

### **Data Flow Analysis**

```
USER INPUT (TubeForm)
  ↓
TubeFormData (from React Hook Form)
  {
    sample: {
      cellType: string,
      concentration: string | number,  ← Mixed types!
      ...
    },
    researcher: string
  }
  ↓
transformToCreateRequest (useTubeForm.ts)
  ↓
CreateTubeRequest (API payload)
  {
    location: {...},
    sample: {
      cellType: string,
      concentration: number | undefined,  ← Converted
      ...
    },
    researcher: string | undefined
  }
  ↓
Zod Validation (createTubeRequestSchema)
  ↓
Server Receives (TubeController)
  ↓
TubeDto.fromCreateRequest (server DTO)
  ↓
Domain Validation (ValidationService)
  ↓
Tube.create (domain entity)
  ↓
Database (SQLite - stored as TEXT for concentration)
  ↓
READ BACK
  ↓
parseFloat(row.concentration) (TubeMapper.ts)
  ↓
TubeData returned to client
  ↓
Display (needs formatting back to X.XEX)
```

### **Problems in Flow**

1. **Type mixing:** Form uses `string | number`, API expects `number`
2. **Multiple conversions:** String→Number→String (DB)→Number (read)→String (display)
3. **Loss points:** Any conversion can lose data if inconsistent parsers
4. **No single source of truth:** 4 different parsing locations

---

## 📋 Complete Fix Checklist

### **Priority 1: Required Fields**
- [ ] Change `tubeDataSchema.researcher` to `.default(UNKNOWN_RESEARCHER)` or `.optional()`
- [ ] Update `useTubeForm.ts` line 82: Use `|| UNKNOWN_RESEARCHER`
- [ ] Remove/deprecate `tubeFormValidationSchema` or fix researcher requirement

### **Priority 2: Concentration Parsing**
- [ ] Create single `parseConcentration()` utility using regex validation
- [ ] Replace `parseFloat` in `tubeSchemas.ts` lines 72-84, 89-102
- [ ] Replace `Number()` in `useTubeForm.ts` lines 59-61, 107-109  
- [ ] Replace `parseFloat` in `TubeDto.ts` lines 102-106
- [ ] Use `normalizeConcentration` from existing utility

### **Priority 3: Display Formatting**
- [ ] Create `formatConcentrationDisplay()` function
- [ ] Apply on tube info display components
- [ ] Apply on grid cell display
- [ ] Apply on edit modal load (format for editing)

### **Priority 4: Validation Consistency**
- [ ] Apply concentration+unit refinement to `createTubeRequestSampleSchema`
- [ ] Remove unit default from TubeForm.tsx line 138
- [ ] Update ConcentrationInput to handle empty unit state

### **Priority 5: Testing**
- [ ] Test: Create tube with only cell type (should work, researcher='Unknown')
- [ ] Test: Create tube with `5e6` concentration
- [ ] Test: Create tube with `1.5E+07` concentration  
- [ ] Test: Display shows `5.0E6` format
- [ ] Test: Edit preserves concentration format
- [ ] Test: Concentration without unit shows validation error

---

## 🎯 Recommended Implementation Order

### **Phase 1: Critical Fixes (2-3 hours)**
1. Fix researcher defaulting (30 min)
2. Standardize concentration parsing (1 hour)
3. Fix unit defaulting issue (30 min)
4. Test create/edit flow (1 hour)

### **Phase 2: Display & UX (1-2 hours)**
1. Implement display formatting (45 min)
2. Update all display components (45 min)
3. Test display consistency (30 min)

### **Phase 3: Validation Hardening (1 hour)**
1. Add refinements to all schemas (30 min)
2. Integration testing (30 min)

---

## 📝 Architecture Recommendations

### **Long-term Improvements**

1. **Single Source of Parsing:**
   ```typescript
   // @odysseus/shared-schemas/src/utils/concentration.ts
   export const concentrationParser = {
     parse: (input: unknown) => normalizeConcentration(input),
     format: (value: number) => formatConcentrationDisplay(value),
     validate: (input: unknown) => validateConcentrationInput(input)
   };
   ```

2. **Type Safety:**
   ```typescript
   // Use branded types to prevent mixing
   type ConcentrationValue = number & { __brand: 'concentration' };
   type ConcentrationInput = string & { __brand: 'concentrationInput' };
   ```

3. **Domain Defaults:**
   ```typescript
   // Move to domain constants
   export const TUBE_DEFAULTS = {
     RESEARCHER: 'Unknown',
     CONCENTRATION_UNIT: undefined, // No default
   } as const;
   ```

---

## 🚀 Summary

**Current State:** Broken workflow with data loss, validation conflicts, and incorrect requirements

**Root Causes:**
- Multiple parsers with different behaviors
- No defaulting for "optional" fields
- Validation enforced in wrong layer
- Inconsistent type handling

**Solution:** Centralize parsing, apply proper defaults, align validation rules across stack

**Effort Estimate:** 4-6 hours total to fix all issues properly

**Risk Level:** LOW - Changes are isolated to specific parsing/validation functions

**Testing Required:** Create, edit, single, batch operations with various concentration formats
