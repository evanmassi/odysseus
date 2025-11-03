# Clean Architecture Refactor Plan - Odysseus Tube Management

## Executive Summary

This document outlines a **complete architectural refactor** to eliminate validation duplication, data transformation complexity, and type safety issues. The goal is **industry-standard clean architecture** with zero technical debt.

**Timeline:** 1-2 days (12-16 hours)  
**Risk Level:** MEDIUM (requires careful migration, but changes are isolated)  
**Rollback Strategy:** Manual backups before each phase (you handle backups separately)  
**Breaking Changes:** None (API contract stays the same)

---

## 🎯 PROGRESS TRACKER

| Phase | Status | Duration | Completion |
|-------|--------|----------|------------|
| **Phase 1: Foundation (Schemas)** | ✅ COMPLETE | ~1 hour | 100% |
| **Phase 2: Client Refactor** | ✅ COMPLETE | ~3 hours | 100% |
| **Phase 3: Server Refactor** | ✅ COMPLETE | ~1.5 hours | 100% |
| **Phase 4: Domain Defaults** | ✅ COMPLETE | ~30 min | 100% |
| **Phase 5: Display Formatting** | ✅ COMPLETE | ~45 min | 100% |

### **Phase 1 Results** ✅
- ✅ Created `tubeValidation.ts` (unified concentration parser)
- ✅ Updated `tubeSchemas.ts` (removed 76 lines, added refinements)
- ✅ Researcher defaults to "Unknown" automatically
- ✅ Concentration parsing: 4 parsers → 1 parser
- ✅ Build passing (CJS + ESM + Types)
- ✅ Backward compatible (deprecated types preserved for Phase 2)

### **Media Field Normalization** ✅ (Critical Fix During Phase 2)
**Problem:** Media was union type `string | TubeMedia` causing transformation complexity
**Solution:** Normalized to structured object only: `TubeMedia` with 3 optional fields

**Changes Made:**
- ✅ `tubeSchemas.ts`: Changed `z.union([z.string(), tubeMediaSchema])` → `tubeMediaSchema.optional()`
- ✅ `TubeForm.tsx`: Restored 3 separate fields (Media Type, Supplements, Selection)
- ✅ `CreateTubeModal.tsx`: Default values use object `{ type, supplements, selection }`
- ✅ `EditTubeModal.tsx`: Removed string checks, always uses object
- ✅ `useTubeForm.ts`: Removed string checks in transform functions
- ✅ `BatchEditModal.tsx`: Removed string→object conversion logic
- ✅ `tubeInfoHelpers.ts`: Removed string checks
- ✅ `searchUtils.ts`: Updated `getMediaString()` to expect object only
- ✅ `SearchService.ts`: Updated filter extraction to use `media.type`
- ✅ Mock data: Updated test fixtures to use object format
- ✅ Deleted: `tubeDataConverter.ts` (dead code removal)

**Impact:**
- Zero transformation logic needed
- Type-safe: Media is always object, never string
- User gets all 3 fields (type, supplements, selection) as optional inputs
- Industry-standard structured data pattern
- Ready for database - no migration needed (starting fresh)

### **Phase 2 Results** ✅
- ✅ **useTubeForm.ts**: Eliminated 171 lines (439→268) - removed all transformation logic
- ✅ **TubeForm.tsx**: Restored 3 media fields (type, supplements, selection)
- ✅ **CreateTubeModal.tsx**: Uses `CreateTubeRequest` directly, zero transformation
- ✅ **EditTubeModal.tsx**: Uses `CreateTubeRequest` directly, zero transformation
- ✅ **Deleted**: `client/src/domains/tubes/validation/` folder (150+ lines removed)
- ✅ **Deleted**: `tubeDataConverter.ts` (dead code removal)
- ✅ **Updated**: 13 files to remove string|object union checks for media
- ✅ **Code Reduction**: ~320 lines removed from client
- ✅ **Architecture**: Form data = API data (zero transformation)

### **Phase 3 Results** ✅
- ✅ **TubeDto.ts**: Removed parseFloat logic - thin mapper only (189→175 lines)
- ✅ **TubeApplicationService.ts**: Removed redundant ValidationService calls
- ✅ **TubeApplicationService.ts**: Added missing methods (getTubesByRackAndBox, searchTubes)
- ✅ **firebaseService.ts**: Updated SyncedTubeData to use number for concentration, object for media
- ✅ **syncEngine.ts**: Removed parseFloat calls (trust preprocessed data)
- ✅ **TubeController.ts**: Updated search method calls to use TubeSearchRequest object
- ✅ **SearchController.ts**: Updated all searchTubes calls to use request object pattern
- ✅ **Validation schemas**: Confirmed already using shared schemas as re-exports ✅
- ✅ **Server build**: Passing with zero errors
- ✅ **Code Reduction**: ~50 lines removed from server
- ✅ **Architecture**: DTOs are thin mappers, no parsing/validation logic

### **Phase 4 Results** ✅
- ✅ **Tube.ts**: Added UNKNOWN_RESEARCHER import from shared schemas
- ✅ **Tube.create()**: Applies business default - researcher defaults to 'Unknown' if empty/whitespace
- ✅ **tubeSchemas.ts**: Removed `.default()` from researcher field in createTubeRequestSchema
- ✅ **Clean Architecture**: Defaults now live in domain entity, not at schema boundary
- ✅ **Shared schemas build**: Passing (CJS + ESM + types)
- ✅ **Server build**: Passing with zero errors
- ✅ **Architecture**: Domain owns business logic, schemas only validate structure
- ✅ **Data Flow**: Boundary accepts optional → Domain applies default → Repository stores required

### **Phase 5 Results** ✅
- ✅ **tubeFormatters.ts**: Created centralized display formatting utilities in shared schemas
- ✅ **formatConcentrationDisplay()**: Converts raw numbers (5000000) → scientific notation ("5.0E+6 c/v")
- ✅ **formatTubeLocation()**: Formats location objects → "Tank 1 / Rack A / Box 1 / Pos 42"
- ✅ **formatTubeDate()**: Formats ISO dates → "Jan 15, 2024"
- ✅ **parseConcentrationDisplay()**: Reverse parsing for edit scenarios
- ✅ **FieldDisplay.tsx**: Updated to use formatConcentrationDisplay() from shared schemas
- ✅ **Legacy formatters**: Deprecated scientificNotation.ts and concentrationConverter.ts with migration notes
- ✅ **Shared schemas build**: Passing (CJS + ESM + types exported)
- ✅ **Architecture**: Presentation layer only - business logic uses raw data, UI uses formatters
- ✅ **Single Source of Truth**: One formatter for all concentration display across app

---

## 🎯 Vision: The Clean Architecture

### **Core Principles**

1. **Single Source of Truth** - One schema defines the contract (shared package)
2. **Parse, Don't Validate** - Transform at boundaries once, types guarantee correctness after
3. **Domain Owns Business Logic** - Defaults, invariants, rules live in domain entities
4. **Thin Boundaries** - DTOs/Controllers just map structures, no logic
5. **Type Safety** - If TypeScript compiles, it's correct (no runtime surprises)

### **Data Flow (Target State)**

```
┌─────────────────────────────────────────────────────────────────┐
│ USER INPUT                                                       │
│  - Types "5e6" in concentration field                           │
│  - Leaves researcher empty                                      │
│  - Fills only cell type                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT FORM (React Hook Form + Zod)                            │
│  - Uses: createTubeRequestSchema (from @odysseus/shared-schemas)│
│  - Zod preprocessor: "5e6" → 5000000 (number)                  │
│  - Validation happens in real-time                              │
│  - NO transformation needed (form data = API data)              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼ form.getValues() → CreateTubeRequest
┌─────────────────────────────────────────────────────────────────┐
│ HTTP CLIENT (apiClient.ts)                                      │
│  - POST /api/tubes                                              │
│  - Body: CreateTubeRequest (already validated by form)          │
│  - NO transformation                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼ JSON body
┌─────────────────────────────────────────────────────────────────┐
│ SERVER CONTROLLER (TubeController.ts)                           │
│  - Receives req.body                                            │
│  - Already validated by Zod middleware (same schema!)           │
│  - NO re-validation needed                                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼ CreateTubeRequest
┌─────────────────────────────────────────────────────────────────┐
│ APPLICATION SERVICE (TubeApplicationService.ts)                 │
│  - Maps HTTP → Domain (thin DTO)                                │
│  - NO validation (already done)                                 │
│  - NO defaults (domain handles)                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼ TubeCreateData
┌─────────────────────────────────────────────────────────────────┐
│ DOMAIN ENTITY (Tube.create)                                     │
│  - Applies defaults: researcher = researcher || UNKNOWN         │
│  - Validates business rules (position unique, data complete)    │
│  - Creates entity                                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼ Tube entity
┌─────────────────────────────────────────────────────────────────┐
│ REPOSITORY (SQLiteTubeRepository)                               │
│  - Maps Domain → Database row                                   │
│  - Stores concentration as TEXT (number.toString())             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼ Saved ✓
┌─────────────────────────────────────────────────────────────────┐
│ READ BACK                                                       │
│  - Repository: DB row → Tube entity (parseFloat)                │
│  - DTO: Tube → TubeResponse                                     │
│  - Client: Display with formatConcentrationDisplay()            │
└─────────────────────────────────────────────────────────────────┘
```

### **Key Difference from Current State**

| Concern | Current (Broken) | Clean Architecture |
|---------|------------------|-------------------|
| **Validation** | 3 places (client form, server schema, domain) | 1 place (shared schema at boundary) |
| **Transformation** | 5+ places | 2 places (HTTP→Domain, Domain→HTTP) |
| **Defaults** | Nowhere | Domain entity |
| **Parsing** | 4 different parsers | 1 parser (Zod preprocessor) |
| **Type Safety** | Fake (allows string \| number, coerces at runtime) | Real (parse once, types guarantee) |

---

## 📦 Phase 1: Consolidate Schemas (The Foundation)

### **Current State (What We Have)**

```
packages/shared-schemas/src/tubes/tubeSchemas.ts
├── tubeDataSchema              ✅ Keep (domain entity type)
├── tubeSampleSchema            ✅ Keep (domain entity type)
├── tubeLocationSchema          ✅ Keep (domain entity type)
├── createTubeRequestSchema     ✅ Keep & Enhance
├── updateTubeRequestSchema     ✅ Keep & Enhance
├── tubeFormDataSchema          ❌ DELETE (redundant)
├── tubeFormSampleSchema        ❌ DELETE (redundant)
└── tubeFormValidationSchema    ❌ DELETE (deprecated)
```

### **Why These Deletions?**

**`tubeFormDataSchema` / `tubeFormSampleSchema`** - Created for form state management but:
- Has different structure than API (media split into type/supplements/selection)
- Requires transformation to API schema (source of bugs)
- Validation rules slightly different (drift potential)

**Solution:** Client forms should use `createTubeRequestSchema` directly

**`tubeFormValidationSchema`** - Already marked deprecated, still has bugs

### **Target State (Consolidated)**

```
packages/shared-schemas/src/tubes/
├── tubeSchemas.ts
│   ├── Domain Types (for database/entities)
│   │   ├── tubeDataSchema          - Complete tube with ID, timestamps
│   │   ├── tubeSampleSchema        - Sample data structure  
│   │   ├── tubeLocationSchema      - Location structure
│   │   └── tubeTimestampsSchema    - Audit fields
│   │
│   └── API Contracts (for HTTP)
│       ├── createTubeRequestSchema  - POST /api/tubes body
│       └── updateTubeRequestSchema  - PUT /api/tubes/:id body
│
├── tubeValidation.ts (NEW)
│   └── Zod preprocessors & refinements
│       ├── parseConcentration      - Single robust parser
│       ├── applyTubeDefaults       - Default logic
│       └── validateConcentrationUnit - Business rule
│
└── tubeFormatters.ts (NEW)
    └── Display utilities
        ├── formatConcentrationDisplay - X.XEX format
        └── formatTubeLocation         - "Tank 1 / Rack A / Box 1"
```

### **Action Items**

**1.1 Create Unified Concentration Parser**
```typescript
// packages/shared-schemas/src/tubes/tubeValidation.ts
import { z } from 'zod';

/**
 * Single source of truth for concentration parsing
 * Accepts: 5e6, 1.5E7, 3.2e+8, 5000000, "5e6", etc.
 * Returns: number | undefined
 */
export const parseConcentration = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  
  const str = String(value).trim().replace(/[,\s]/g, '');
  
  // Regex for scientific notation: 1.5e+6, 5E-3, etc.
  const scientificRegex = /^([+-]?\d*\.?\d+)[eE]([+-]?\d+)$/;
  const match = str.match(scientificRegex);
  
  if (match) {
    const mantissa = parseFloat(match[1]);
    const exponent = parseInt(match[2]);
    return mantissa * Math.pow(10, exponent);
  }
  
  // Regular number
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
};

/**
 * Zod preprocessor for concentration fields
 */
export const concentrationPreprocessor = z.preprocess(
  (val) => parseConcentration(val),
  z.number().positive().optional()
);
```

**1.2 Enhance API Schemas with Defaults**
```typescript
// packages/shared-schemas/src/tubes/tubeSchemas.ts

import { concentrationPreprocessor } from './tubeValidation';

export const UNKNOWN_RESEARCHER = 'Unknown' as const;

// ✅ Enhanced: Single preprocessing schema used by BOTH client and server
export const createTubeRequestSchema = z.object({
  location: tubeLocationSchema,
  sample: z.object({
    cellType: z.string().min(1, 'Cell type is required'),
    donorInternalId: z.string().optional(),
    donorSourceId: z.string().optional(),
    concentration: concentrationPreprocessor, // ← Unified parser
    concentrationUnit: z.enum(['c/v', 'c/mL']).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    media: z.string().optional(), // Simplified: just string
    cultureCondition: z.string().optional(),
    lotNumber: z.string().optional(),
    notes: z.string().optional(),
  }).refine(
    (sample) => {
      // Business rule: concentration + unit together or both absent
      const hasBoth = sample.concentration !== undefined && sample.concentrationUnit !== undefined;
      const hasNeither = sample.concentration === undefined && sample.concentrationUnit === undefined;
      return hasBoth || hasNeither;
    },
    { message: 'Concentration and unit must be provided together', path: ['concentrationUnit'] }
  ),
  researcher: z.string().optional(), // ← Optional, domain will default
});

export type CreateTubeRequest = z.output<typeof createTubeRequestSchema>;
```

**1.3 Delete Redundant Schemas**
```bash
# Remove from tubeSchemas.ts:
- tubeFormDataSchema
- tubeFormSampleSchema  
- tubeFormValidationSchema
- All associated types
```

---

## 🔄 Phase 2: Refactor Client (Use Shared Schema Directly)

### **Current Client Architecture**

```
client/src/domains/tubes/
├── hooks/
│   └── useTubeForm.ts
│       ├── Uses: tubeFormDataSchema ❌
│       ├── transformToCreateRequest() ❌ (custom logic)
│       └── transformToUpdateRequest() ❌ (custom logic)
│
├── ui/components/forms/
│   └── TubeForm.tsx
│       ├── Uses: TubeFormData type ❌
│       └── Complex field mapping ❌
│
└── validation/
    └── tubeValidation.ts ❌ (client-side validation, redundant)
```

### **Target Client Architecture**

```
client/src/domains/tubes/
├── hooks/
│   └── useTubeForm.ts
│       ├── Uses: createTubeRequestSchema ✅ (from shared)
│       ├── NO transformation ✅ (form data = API data)
│       └── Simple submission ✅
│
├── ui/components/forms/
│   └── TubeForm.tsx
│       ├── Uses: CreateTubeRequest type ✅ (from shared)
│       └── Direct field mapping ✅
│
└── validation/ ❌ DELETE (use shared schemas)
```

### **Action Items**

**2.1 Simplify useTubeForm Hook**
```typescript
// client/src/domains/tubes/hooks/useTubeForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTubeRequestSchema, type CreateTubeRequest } from '@odysseus/shared-schemas';

export function useCreateTubeForm(location: TubeLocation) {
  // Form uses API schema directly
  const form = useForm<CreateTubeRequest>({
    resolver: zodResolver(createTubeRequestSchema),
    defaultValues: {
      location, // Provided by grid context
      sample: {
        cellType: '',
        // All fields optional, Zod handles defaults
      },
      researcher: '', // Optional, domain will default to UNKNOWN_RESEARCHER
    }
  });

  const { mutateAsync: createTube } = useCreateTubeMutation();

  const handleSubmit = async (data: CreateTubeRequest) => {
    // NO transformation - data is already in API format!
    return await createTube(data);
  };

  return {
    form,
    handleSubmit: form.handleSubmit(handleSubmit),
    isLoading: createTubeMutation.isPending,
  };
}
```

**2.2 Simplify TubeForm Component**
```typescript
// client/src/domains/tubes/ui/components/forms/TubeForm.tsx
import { UseFormReturn } from 'react-hook-form';
import { CreateTubeRequest } from '@odysseus/shared-schemas';

interface TubeFormProps {
  form: UseFormReturn<CreateTubeRequest>; // ← API type directly
  researchers: Researcher[];
}

export const TubeForm = ({ form }: TubeFormProps) => {
  const { register, formState: { errors } } = form;

  return (
    <div>
      {/* Direct mapping - no controllers needed */}
      <input
        {...register('sample.cellType')}
        placeholder="Cell Type"
      />
      {errors.sample?.cellType && <span>{errors.sample.cellType.message}</span>}

      <input
        {...register('sample.concentration')}
        placeholder="e.g., 5e6"
      />
      
      {/* Concentration is already parsed by Zod! No custom logic */}
      
      <select {...register('researcher')}>
        <option value="">Select researcher...</option>
        {researchers.map(r => (
          <option key={r.id} value={r.name}>{r.name}</option>
        ))}
      </select>
    </div>
  );
};
```

**2.3 Remove Files**
```bash
# DELETE (no longer needed):
client/src/domains/tubes/validation/tubeValidation.ts
client/src/shared/utils/tubeDataConverter.ts (if exists)

# KEEP (but simplify):
client/src/shared/utils/scientificNotation.ts (for display formatting only)
```

---

## ⚙️ Phase 3: Refactor Server (Thin DTOs)

### **Current Server Architecture**

```
server/src/
├── validation/
│   └── schemas.ts
│       ├── CreateTubeHttpSchema (re-exports shared) ✅
│       └── HTTP-specific validation ❌ (redundant)
│
├── application/dto/
│   └── TubeDto.ts
│       ├── fromCreateRequest() - parseFloat logic ❌
│       ├── fromUpdateRequest() - parseFloat logic ❌
│       └── Complex transformation ❌
│
└── application/services/
    └── TubeApplicationService.ts
        ├── Validation calls ❌ (redundant)
        └── NO defaulting ❌ (missing)
```

### **Target Server Architecture**

```
server/src/
├── validation/
│   └── schemas.ts
│       └── Re-export shared schemas only ✅
│
├── application/dto/
│   └── TubeDto.ts
│       ├── toHttpRequest() - Thin mapper ✅
│       ├── fromHttpRequest() - Thin mapper ✅
│       └── NO validation, NO parsing ✅
│
└── application/services/
    └── TubeApplicationService.ts
        ├── Assumes validated input ✅
        └── Delegates defaults to domain ✅
```

### **Action Items**

**3.1 Simplify TubeDto (Thin Mapper)**
```typescript
// server/src/application/dto/TubeDto.ts
import { CreateTubeRequest, TubeData } from '@odysseus/shared-schemas';

export class TubeDto {
  /**
   * Map HTTP request to domain data
   * NO validation, NO parsing (already done by Zod)
   */
  static fromCreateRequest(request: CreateTubeRequest): TubeCreateData {
    return {
      location: request.location,
      sample: request.sample, // Already validated & parsed
      researcher: request.researcher, // Domain will apply default
    };
  }

  /**
   * Map domain entity to HTTP response
   */
  static toResponse(tube: Tube): TubeResponse {
    return {
      id: tube.id,
      location: tube.location,
      sample: tube.sample,
      researcher: tube.researcher,
      timestamps: tube.timestamps,
    };
  }
}
```

**3.2 Simplify Application Service**
```typescript
// server/src/application/services/TubeApplicationService.ts
async createTube(request: CreateTubeRequest, user: User): Promise<TubeResponse> {
  // 1. Check permissions
  this.accessControlService.requireCanCreateTube(user);

  // 2. Map to domain (thin, no logic)
  const tubeData = TubeDto.fromCreateRequest(request);

  // 3. Create entity (domain applies defaults & validation)
  const tube = Tube.create(tubeData);

  // 4. Check position availability
  await this.tubePositionService.validatePosition(/* ... */);

  // 5. Save
  await this.tubeRepository.save(tube);

  return TubeDto.toResponse(tube);
}
```

**3.3 Remove Redundant Validation**
```bash
# DELETE from server/src/validation/schemas.ts:
- All custom Zod schemas (use shared ones)
- HTTP-specific preprocessing (use shared ones)

# KEEP:
- Re-exports from @odysseus/shared-schemas
```

---

## 🏛️ Phase 4: Domain Owns Defaults & Business Rules

### **Current Domain**

```typescript
// server/src/domain/entities/Tube.ts
class Tube {
  static create(data: TubeCreateData): Tube {
    // NO defaults applied
    // Assumes data is complete
    return new Tube(/* ... */);
  }
}
```

### **Target Domain**

```typescript
// server/src/domain/entities/Tube.ts
import { UNKNOWN_RESEARCHER } from '@odysseus/shared-schemas';

class Tube {
  static create(data: TubeCreateData): Tube {
    // Domain applies business defaults
    const researcher = data.researcher?.trim() || UNKNOWN_RESEARCHER;
    
    // Validate business rules
    if (!data.sample.cellType) {
      throw new ValidationError('Cell type is required (business rule)');
    }
    
    // Concentration + unit invariant
    const hasConcentration = data.sample.concentration !== undefined;
    const hasUnit = data.sample.concentrationUnit !== undefined;
    if (hasConcentration !== hasUnit) {
      throw new ValidationError('Concentration and unit must both be present or both absent');
    }
    
    return new Tube({
      ...data,
      researcher,
      // Domain guarantees: researcher is never empty
    });
  }
}
```

### **Action Items**

**4.1 Add Defaults to Domain Entity**
```typescript
// Move UNKNOWN_RESEARCHER constant to shared schemas
// Apply default in Tube.create()
```

**4.2 Move Business Validation to Domain**
```typescript
// Domain validates:
- Cell type required (business rule)
- Concentration + unit together (business rule)
- Researcher defaulted (business rule)

// Remove from:
- Client validation (handled by schema)
- Server validation (handled by domain)
```

---

## 🎨 Phase 5: Display Formatting (Presentation Layer)

### **Current State**
- Multiple formatting functions scattered across codebase
- Inconsistent application (some places format, others don't)
- ConcentrationInput has formatting logic (wrong layer)

### **Target State**
- Single formatting utility in shared package
- Applied ONLY in presentation components
- No formatting in business logic

### **Action Items**

**5.1 Create Display Formatters**
```typescript
// packages/shared-schemas/src/tubes/tubeFormatters.ts

/**
 * Format concentration for display (X.XEX format)
 */
export function formatConcentrationDisplay(
  value: number | undefined,
  unit?: 'c/v' | 'c/mL'
): string {
  if (value === undefined || value === null) return '';
  if (value === 0) return '0';
  
  // Always show as scientific notation: 5.0E6
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exponent);
  const formatted = `${mantissa.toFixed(1)}E${exponent >= 0 ? '+' : ''}${exponent}`;
  
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Format tube location for display
 */
export function formatTubeLocation(location: TubeLocation): string {
  return `Tank ${location.tankId} / Rack ${location.rackId} / Box ${location.boxId} / Pos ${location.position}`;
}
```

**5.2 Apply in Display Components**
```typescript
// client/src/domains/tubes/ui/components/TubeInfoPanel.tsx
import { formatConcentrationDisplay } from '@odysseus/shared-schemas';

export const TubeInfoPanel = ({ tube }: { tube: TubeData }) => {
  return (
    <div>
      <span>Concentration: {formatConcentrationDisplay(tube.sample.concentration, tube.sample.concentrationUnit)}</span>
    </div>
  );
};
```

**5.3 Remove Formatting from Business Logic**
```bash
# DELETE formatting from:
- ConcentrationInput (just show value, no auto-format)
- useTubeForm (no display logic)
- Server DTOs (no formatting)

# KEEP formatting in:
- Display components only (TubeInfoPanel, Grid cells, etc.)
```

---

## 📊 Consolidation Summary

### **Files to DELETE** ❌

```
packages/shared-schemas/src/tubes/tubeSchemas.ts
  - tubeFormDataSchema
  - tubeFormSampleSchema
  - tubeFormValidationSchema
  - Related types

client/src/domains/tubes/
  - validation/tubeValidation.ts (redundant)
  - schemas/tubeSchemas.ts (if exists, use shared)

client/src/shared/utils/
  - tubeDataConverter.ts (transformation logic)

server/src/validation/
  - Custom schemas (use shared re-exports only)
```

### **Files to CREATE** ✅

```
packages/shared-schemas/src/tubes/
  - tubeValidation.ts (preprocessing utilities)
  - tubeFormatters.ts (display utilities)

(No new client files - use shared directly)
(No new server files - simplify existing)
```

### **Files to MODIFY** 🔧

```
packages/shared-schemas/src/tubes/tubeSchemas.ts
  ✓ Add unified concentration preprocessor
  ✓ Remove redundant form schemas
  ✓ Add business rule refinements

client/src/domains/tubes/hooks/useTubeForm.ts
  ✓ Use createTubeRequestSchema directly
  ✓ Remove transformation logic
  ✓ Simplify to ~50 lines (from ~350)

client/src/domains/tubes/ui/components/forms/TubeForm.tsx
  ✓ Use CreateTubeRequest type
  ✓ Remove controllers (use register)
  ✓ Simplify to ~100 lines (from ~257)

server/src/application/dto/TubeDto.ts
  ✓ Remove parsing logic (parseFloat)
  ✓ Thin mappers only
  ✓ ~50 lines (from ~200)

server/src/application/services/TubeApplicationService.ts
  ✓ Remove validation calls
  ✓ Trust Zod-validated input
  ✓ ~30 lines saved

server/src/domain/entities/Tube.ts
  ✓ Add default application (researcher)
  ✓ Business rule validation
  ✓ +20 lines
```

### **Code Reduction Estimate**

| Area | Current LOC | Target LOC | Reduction |
|------|-------------|------------|-----------|
| Schemas | ~460 | ~250 | -210 (-45%) |
| Client Hooks | ~350 | ~80 | -270 (-77%) |
| Client Forms | ~257 | ~120 | -137 (-53%) |
| Server DTOs | ~200 | ~60 | -140 (-70%) |
| Validation | ~150 | ~0 | -150 (-100%) |
| **TOTAL** | **~1417** | **~510** | **-907 (-64%)** |

**Result:** 64% code reduction, 100% less complexity

---

## 🚀 Migration Strategy (Manual Backups)

### **Approach: Phase-by-Phase with Timestamped Backups**

**You'll be creating manual backups before each phase.** Each phase is independent and can be rolled back individually.

**Backup Naming Convention:**
```
odysseus-app-backup-phase0-YYYY-MM-DD-HHMM   (baseline before starting)
odysseus-app-backup-phase1-YYYY-MM-DD-HHMM   (before schema changes)
odysseus-app-backup-phase2-YYYY-MM-DD-HHMM   (before client refactor)
odysseus-app-backup-phase3-YYYY-MM-DD-HHMM   (before server refactor)
odysseus-app-backup-phase4-YYYY-MM-DD-HHMM   (before domain changes)
odysseus-app-backup-phase5-YYYY-MM-DD-HHMM   (before display changes)
```

**Phase Progression:**

**Phase 1: Foundation (schemas)**
- Create backup: `odysseus-app-backup-phase1-[timestamp]`
- Changes: Add tubeValidation.ts, consolidate schemas, remove form schemas
- Test: Shared package compiles, no breaking changes

**Phase 2: Client (depends on Phase 1)**
- Create backup: `odysseus-app-backup-phase2-[timestamp]`
- Changes: Simplify useTubeForm, update TubeForm, remove transformations
- Test: Forms render and validate correctly

**Phase 3: Server (depends on Phase 1)**
- Create backup: `odysseus-app-backup-phase3-[timestamp]`
- Changes: Thin DTOs, remove redundant validation
- Test: API accepts requests, no runtime errors

**Phase 4: Domain (depends on Phase 2 & 3)**
- Create backup: `odysseus-app-backup-phase4-[timestamp]`
- Changes: Add defaults to Tube.create(), business rules
- Test: Tubes created with defaults, rules enforced

**Phase 5: Display (independent)**
- Create backup: `odysseus-app-backup-phase5-[timestamp]`
- Changes: Add formatters, apply in presentation
- Test: Display formatted correctly

### **Testing Checkpoints**

**After Phase 1:**
- [ ] Shared schemas compile
- [ ] Concentration preprocessor tests pass
- [ ] No breaking changes to exports

**After Phase 2:**
- [ ] Client builds successfully
- [ ] Forms render without errors
- [ ] Validation works in real-time
- [ ] Submission sends correct payload

**After Phase 3:**
- [ ] Server builds successfully
- [ ] API accepts requests
- [ ] No runtime errors

**After Phase 4:**
- [ ] Tubes created with defaults
- [ ] Business rules enforced
- [ ] Database stores correctly

**After Phase 5:**
- [ ] Display shows formatted values
- [ ] Edit modal pre-fills correctly
- [ ] Grid cells show formatted concentrations

### **Rollback Plan**

Each phase has a backup - if issues occur, restore from the previous working state:

**Rollback Entire Refactor:**
1. Stop application
2. Delete current `odysseus-app` folder
3. Restore from `odysseus-app-backup-phase0-[timestamp]` (pre-refactor baseline)
4. Restart application
5. Time required: ~5 minutes

**Rollback Specific Phase:**
1. Stop application
2. Delete current `odysseus-app` folder  
3. Restore from backup of previous working phase
   - Example: If Phase 3 failed, restore from `phase2` backup
4. Restart and continue from working phase
5. Time required: ~5 minutes

**Partial Rollback (Keep Some Changes):**
1. Manually copy specific files from backup to current folder
2. Example: Keep Phase 1 schema changes, revert client changes from Phase 2
3. Test thoroughly after selective restoration

---

## ⚠️ Risk Assessment

### **HIGH RISK (Requires Careful Testing)**

1. **Changing form schema from `tubeFormDataSchema` → `createTubeRequestSchema`**
   - **Risk:** Field names might differ, breaking form bindings
   - **Mitigation:** Run full form UI test suite, manual QA
   - **Rollback:** Restore from phase2 backup

2. **Removing transformation logic in client**
   - **Risk:** Edge cases in data transformation might be lost
   - **Mitigation:** Document current transform logic, write edge case tests
   - **Rollback:** Restore transformation functions temporarily

### **MEDIUM RISK (Standard Refactoring)**

3. **Simplifying server DTOs**
   - **Risk:** Subtle type coercion logic might be needed
   - **Mitigation:** Integration tests for create/update flows
   - **Rollback:** Restore from phase3 backup, keep parseFloat if needed

4. **Domain defaults application**
   - **Risk:** Existing data might violate new rules
   - **Mitigation:** Database migration to ensure no null researchers
   - **Rollback:** Make defaults optional in Tube.create()

### **LOW RISK (Safe Changes)**

5. **Display formatting**
   - **Risk:** Format might not match user expectations
   - **Mitigation:** User testing, configurable format
   - **Rollback:** Restore from phase5 backup (presentation only)

6. **Code deletion**
   - **Risk:** Deleting potentially useful code
   - **Mitigation:** Keep backup of deleted files in backup folder
   - **Rollback:** Copy files back from backup if needed

---

## 📈 Success Metrics

### **Code Quality Metrics**

- [ ] **-64% lines of code** (1417 → 510)
- [ ] **-100% validation duplication** (3 places → 1 place)
- [ ] **-80% transformation logic** (5 transforms → 1 thin mapper)
- [ ] **Zero TypeScript errors** (strict mode)
- [ ] **100% test coverage** on critical paths

### **Functional Metrics**

- [ ] User can create tube with **only cell type** (researcher defaults to "Unknown")
- [ ] Concentration accepts **all scientific formats** (5e6, 1.5E+07, 3.2e8)
- [ ] Concentration displays **consistently** in X.XEX format
- [ ] **Single/batch** add/edit works without errors
- [ ] **No data loss** in round-trip (create → store → read → display)

### **Architectural Metrics**

- [ ] **Single source of truth** for schemas (shared package only)
- [ ] **Parse once** (Zod preprocessor, no runtime coercion)
- [ ] **Domain owns defaults** (business logic in entity)
- [ ] **Thin boundaries** (DTOs/Controllers have no logic)
- [ ] **Type safety** (if it compiles, it works)

---

## 🎯 Final Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED SCHEMAS PACKAGE                    │
│              (Single Source of Truth)                        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ createTubeRequestSchema (API Contract)         │        │
│  │  - Used by client forms (validation)           │        │
│  │  - Used by server (middleware)                 │        │
│  │  - Zod preprocessors (parse concentration)     │        │
│  │  - Business rules (concentration+unit)         │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ tubeDataSchema (Domain Type)                   │        │
│  │  - Used by domain entities                     │        │
│  │  - Used by repositories                        │        │
│  │  - Used by DTOs                                │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ Formatters & Utilities                         │        │
│  │  - formatConcentrationDisplay()                │        │
│  │  - parseConcentration()                        │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│        CLIENT            │  │        SERVER            │
│                          │  │                          │
│  ┌────────────────────┐  │  │  ┌────────────────────┐  │
│  │ Form (RHF + Zod)   │  │  │  │ Controller         │  │
│  │  - Uses API schema │  │  │  │  - Trusts input    │  │
│  │  - No transform    │  │  │  │  - No validation   │  │
│  └────────────────────┘  │  │  └────────────────────┘  │
│           │              │  │           │              │
│           ▼              │  │           ▼              │
│  ┌────────────────────┐  │  │  ┌────────────────────┐  │
│  │ HTTP Client        │  │  │  │ App Service        │  │
│  │  - POST API        │──┼──┼─▶│  - Thin DTO        │  │
│  └────────────────────┘  │  │  └────────────────────┘  │
│                          │  │           │              │
│  ┌────────────────────┐  │  │           ▼              │
│  │ Display Components │  │  │  ┌────────────────────┐  │
│  │  - Format only     │  │  │  │ Domain Entity      │  │
│  └────────────────────┘  │  │  │  - Apply defaults  │  │
│                          │  │  │  - Business rules  │  │
└──────────────────────────┘  │  └────────────────────┘  │
                              │           │              │
                              │           ▼              │
                              │  ┌────────────────────┐  │
                              │  │ Repository         │  │
                              │  │  - Persist         │  │
                              │  └────────────────────┘  │
                              └──────────────────────────┘
```

---

## ⏱️ Implementation Timeline

### **Day 1 (8 hours)**

**Morning (4h):**
- [ ] Phase 1: Consolidate schemas (2h)
  - Create tubeValidation.ts
  - Enhance createTubeRequestSchema
  - Remove form schemas
- [ ] Write tests for new schemas (1h)
- [ ] Verify Phase 1 working (1h)

**Afternoon (4h):**
- [ ] Phase 2: Refactor client (3h)
  - Update useTubeForm
  - Update TubeForm
  - Update CreateTubeModal/EditTubeModal
- [ ] Test forms manually (1h)

### **Day 2 (8 hours)**

**Morning (4h):**
- [ ] Phase 3: Refactor server (2h)
  - Simplify TubeDto
  - Update TubeApplicationService
  - Remove redundant validation
- [ ] Phase 4: Domain defaults (1h)
  - Add defaults to Tube.create()
- [ ] Integration tests (1h)
- [ ] Verify Phases 3 & 4 working

**Afternoon (4h):**
- [ ] Phase 5: Display formatting (1h)
  - Create formatters
  - Apply in components
- [ ] End-to-end testing (2h)
  - Create tube with only cell type
  - Test concentration formats
  - Test batch operations
- [ ] Final verification (1h)
  - All features working
  - No regressions

### **Flexible Timeline (if needed)**

If 2 days is too aggressive:
- **Week 1:** Phases 1-2 (foundation + client)
- **Week 2:** Phases 3-4 (server + domain)
- **Week 3:** Phase 5 + testing (display + QA)

---

## ✅ Pre-Implementation Checklist

Before starting, ensure:

- [ ] All current features are working (baseline)
- [ ] Full database backup created (`server/data/odysseus.sqlite`)
- [ ] **Baseline backup created** (`odysseus-app-backup-phase0-[timestamp]`)
- [ ] Backup location has sufficient storage (~1GB for all phase backups)
- [ ] Rollback plan understood (restore from phase backup)
- [ ] Testing checklist ready and accessible

---

## 📝 Conclusion

This refactor transforms a **fragile, duplicated system** into a **clean, maintainable architecture** following industry standards:

**What we eliminate:**
- ❌ Validation duplication (3 places → 1)
- ❌ Transformation complexity (5+ transforms → 2 thin mappers)
- ❌ Type safety theater (runtime coercion → compile-time guarantees)
- ❌ Missing defaults (undefined behavior → domain defaults)
- ❌ 64% of code (1417 → 510 lines)

**What we gain:**
- ✅ Single source of truth (shared schemas)
- ✅ Parse once, types guarantee (Zod preprocessors)
- ✅ Domain owns business logic (defaults, rules in entity)
- ✅ Thin boundaries (DTOs just map structure)
- ✅ Maintainable codebase (changes touch one place)

**Risk:** Medium (careful testing required)  
**Effort:** 1-2 days (12-16 hours)  
**Value:** Eliminates technical debt permanently

---

**Next Step:** Review this plan, raise concerns, then proceed with implementation when ready.
