# Schema Mismatch Investigation Report
**Date:** Oct 1, 2025  
**Issue:** Console errors during login due to client-server schema mismatches

## Executive Summary
The console errors stem from two critical architectural mismatches between client and server:

### 1. **Media Field Structure Mismatch** ❌ CRITICAL
- **Client Schema** (client/src/domains/tubes/schemas/tubeSchemas.ts):
  - Expects `media` as **nested object**: `{ type?: string, supplements?: string, selection?: string }`
  - Defined in `tubeMediaSchema`
  
- **Server Schema** (ALL backend files):
  - Treats `media` as **simple string**: `media?: string`
  - Database column: `media TEXT` (string storage)
  - Value object (SampleData.ts line 16): `private readonly _media?: string`
  - DTOs (TubeDto.ts line 22, 40, 61, 122): `media?: string`
  - HTTP validation (schemas.ts line 24): `media: z.string().optional()`
  - Mapper (TubeMapper.ts line 66, 102): `media: sampleData.media` (string)
  - Entity (Tube.ts line 38, 57, 91, 122): `media?: string`

### 2. **Legacy `boxName` References** ⚠️ MODERATE
While the database schema correctly uses `boxId`, several backend files still reference `boxName`:

#### Files Using Legacy `boxName`:
1. **TubeSearchRequest** (application/dto/TubeDto.ts:84): `boxName?: string;`
2. **TubeApplicationService** (line 109): Maps `searchRequest.boxName` → `criteria.boxId`
3. **TubeController** (line 169): `const { rackId, boxName } = req.params;`
4. **ResourceRouteModule** (line 56, 59): Route `/tubes/rack/:rackId/box/:boxName`
5. **SearchRouteModule** (line 45): `boxName: z.string().optional()`
6. **configurationService.ts**: Multiple functions use `boxName` parameter
7. **IDatabaseProvider.ts** (line 111): Interface expects `boxName`

## Detailed Findings

### A. Media Field Architecture Gap

**What the client sends:**
```typescript
// From client form submission
{
  media: {
    type: "DMEM",
    supplements: "10% FBS",
    selection: "Puromycin"
  }
}
```

**What the server expects & stores:**
```typescript
// Server value object, DTO, mapper, entity - ALL expect string
{
  media: "DMEM" // Simple string, NO nested object support
}
```

**Impact:**
- When client sends nested media object → Server HTTP validation **FAILS** (expects string, gets object)
- Server has NO logic to serialize object → JSON string for database
- Server has NO logic to deserialize JSON string → object for client
- This causes **"expected array, received object"** type errors (schema validation failures)

### B. Database Schema Status ✅ CORRECT

The database **correctly** uses `boxId`:
```sql
CREATE TABLE tubes (
  boxId TEXT NOT NULL,  -- ✅ Correct
  UNIQUE(tankId, rackId, boxId, position)  -- ✅ Correct
)
CREATE INDEX idx_tubes_location ON tubes(tankId, rackId, boxId)  -- ✅ Correct
CREATE INDEX idx_tubes_position ON tubes(rackId, boxId, position)  -- ✅ Correct
```

**No migration needed** - database schema is already correct.

### C. Code-Level boxName/boxId Inconsistencies

The **route parameter names** and **search DTOs** still use `boxName`, creating confusion:

```typescript
// Route definition uses boxName parameter
router.get('/tubes/rack/:rackId/box/:boxName', ...)

// Controller extracts boxName from params
const { rackId, boxName } = req.params;

// But passes to service that expects boxId
tubeApplicationService.getTubesByRackAndBox(rackId, boxName, ...)

// Service converts boxName → boxId
boxId: searchRequest.boxName  // Line 109
```

This works functionally but creates semantic confusion and violates naming consistency.

### D. Validation Logic Issues

**SampleData.ts validation errors on existing data:**
- Line 130: `this._donorInternalId.trim()` - **Fails if field is NULL** (should check for null first)
- Line 79: Concentration unit validation throws when reading old data with orphaned units

## Root Causes of Console Errors

### Error 1: "JSON.parse: unexpected character at line 1 column 1"
- **Source:** OPTIONS preflight requests or 404 responses returning HTML
- Server logs show 404s for `/favicon.ico` and malformed tube routes
- Client tries to parse HTML error pages as JSON

### Error 2: "expected array, received object"
- **Source:** Media field object from client fails server string validation
- OR: Server returns error envelope `{ error: {...} }` when client expects array

### Error 3: "expected true" for success field
- **Source:** Auth response structure mismatch
- Client expects `success: true` (z.literal(true))
- Server may return different auth response shape

### Error 4: "no such column: boxId" (from server logs)
- **FALSE ALARM** - This appears in OLD server logs (Sept 23-25)
- Database was recreated since then - current schema has `boxId`
- Console log errors are from **client-side** validation, not database

## Required Fixes (In Priority Order)

### 🔴 CRITICAL: Media Field Backend Support
**Must implement in 6 files:**

1. **SampleData.ts** (value object):
   ```typescript
   // Change from:
   private readonly _media?: string
   
   // To:
   private readonly _media?: { type?: string; supplements?: string; selection?: string } | string
   ```

2. **TubeMapper.ts** (database mapper):
   - Add serialization: `media: typeof sampleData.media === 'object' ? JSON.stringify(sampleData.media) : sampleData.media`
   - Add deserialization: Try parse JSON, fallback to string for backwards compatibility

3. **Tube.ts** (entity):
   - Update `media` type in all factory methods

4. **TubeDto.ts** (DTOs):
   - Update CreateTubeRequest, UpdateTubeRequest, TubeResponse media type

5. **schemas.ts** (HTTP validation):
   ```typescript
   // Change from:
   media: z.string().optional()
   
   // To:
   media: z.union([
     z.string(),
     z.object({
       type: z.string().optional(),
       supplements: z.string().optional(),
       selection: z.string().optional()
     })
   ]).optional()
   ```

6. **Database** (no schema change needed):
   - Keep `media TEXT` - stores JSON string or plain string

### 🟡 HIGH: Consistent boxId Naming
**Rename boxName → boxId in:**

1. Route parameters: `/tubes/rack/:rackId/box/:boxId` (ResourceRouteModule.ts line 56)
2. Controller variables: `const { rackId, boxId } = req.params` (TubeController.ts line 169)
3. Search DTO: `boxId?: string` (TubeDto.ts line 84, SearchRouteModule.ts line 45)
4. Legacy service functions: configurationService.ts parameter names

### 🟢 MEDIUM: Validation Robustness
**Fix SampleData.ts null handling:**
- Line 130: `if (this._donorInternalId?.trim().length === 0)`
- Line 139: `if (this._donorSourceId?.trim().length === 0)`
- Line 158: `if (field.value?.trim().length === 0)` (already correct)

## Architectural Recommendation

**For media field, implement dual-format support:**
```typescript
// SampleData.ts - Accept both formats during transition
media?: string | { type?: string; supplements?: string; selection?: string }

// TubeMapper.ts - Serialize for database
toRow(): {
  media: typeof sampleData.media === 'object' 
    ? JSON.stringify(sampleData.media)
    : sampleData.media
}

// TubeMapper.ts - Deserialize from database
fromRow(): {
  media: tryParseJson(row.media) // Returns object if valid JSON, else string
}
```

This ensures:
- ✅ Client can send nested media object
- ✅ Database stores as JSON string
- ✅ Client receives nested media object
- ✅ Backwards compatible with old string-only data
