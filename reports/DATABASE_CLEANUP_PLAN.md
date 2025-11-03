# Database Data Quality Cleanup Plan

**Date:** October 1, 2025  
**Status:** 📋 **READY FOR IMPLEMENTATION**  
**Priority:** 🔴 **CRITICAL** - Blocking app functionality  
**Estimated Effort:** 2-3 hours

---

## Problem Statement

The API contract standardization (Phases 1-4) successfully implemented strict Zod validation. Now the app is catching **pre-existing bad data** in the SQLite database:

### Validation Errors Found

```
🔴 Invalid tube ID format
   Expected: UUID (e.g., "550e8400-e29b-41d4-a716-446655440000")
   Found: Non-UUID strings (e.g., "tube-1", "test-123", etc.)
   Path: data[0].id

🔴 Researcher is required
   Expected: Non-empty string (min length 1)
   Found: Empty strings ("") or null values
   Path: data[0].researcher
```

### Root Cause

The database was created with test data or data imported before strict validation was enforced. The old code didn't validate tube IDs as UUIDs or enforce required fields.

---

## Impact

- ❌ **App won't load tubes** - Zod validation throws on any endpoint returning bad tubes
- ❌ **Location-based queries fail** - Grid view can't load tube data
- ❌ **Cannot display existing inventory** - All tube operations blocked

---

## Solution Options

### Option A: Database Migration Script (RECOMMENDED)
**Approach:** Write a Node.js migration script that directly fixes the SQLite database

**Pros:**
- One-time fix for all bad data
- Preserves existing tubes (no data loss)
- Can run offline without server running
- Industry-standard approach (like Prisma/Knex migrations)

**Cons:**
- Requires direct SQLite access
- Must backup database first

**Estimated Time:** 1-2 hours

---

### Option B: Admin API Endpoint for Data Repair
**Approach:** Create `/api/admin/repair-data` endpoint that validates and fixes all tubes

**Pros:**
- Uses existing backend infrastructure
- Can be triggered from UI
- Includes transaction rollback on failure

**Cons:**
- Requires server to be running
- Must expose admin endpoint (security consideration)

**Estimated Time:** 2-3 hours

---

### Option C: Manual CSV Export/Fix/Import
**Approach:** Export all tubes to CSV, fix in Excel/spreadsheet, re-import

**Pros:**
- No code needed
- User has full control
- Visual verification

**Cons:**
- Manual, error-prone
- Loses timestamps/metadata
- Requires existing export to work (might also be blocked)

**Estimated Time:** 3-4 hours (mostly manual)

---

## Recommended Approach: Option A (Database Migration Script)

### Implementation Plan

#### Step 1: Backup Current Database
**Location:** `server/data/odysseus.sqlite`

```bash
# Create timestamped backup
cp server/data/odysseus.sqlite server/data/backups/odysseus-pre-cleanup-$(date +%Y%m%d-%H%M%S).sqlite
```

#### Step 2: Create Migration Script

**File:** `server/scripts/migrations/001-fix-tube-validation.ts`

```typescript
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface TubeRow {
  id: string;
  data: string; // JSON string
}

const migrateDatabase = () => {
  const dbPath = path.join(__dirname, '../../data/odysseus.sqlite');
  const db = new Database(dbPath);
  
  console.log('🔍 Starting database cleanup...');
  
  // Get all tubes
  const tubes = db.prepare('SELECT id, data FROM tubes').all() as TubeRow[];
  
  console.log(`📊 Found ${tubes.length} tubes to validate`);
  
  let fixed = 0;
  let skipped = 0;
  const errors: string[] = [];
  
  // Start transaction
  db.prepare('BEGIN').run();
  
  try {
    for (const row of tubes) {
      const tube = JSON.parse(row.data);
      let needsUpdate = false;
      
      // Fix 1: Invalid UUID
      if (!isValidUUID(tube.id)) {
        console.log(`⚠️  Fixing invalid ID: "${tube.id}" -> UUID`);
        tube.id = uuidv4();
        needsUpdate = true;
      }
      
      // Fix 2: Missing/empty researcher
      if (!tube.researcher || tube.researcher.trim() === '') {
        console.log(`⚠️  Fixing missing researcher for tube ${tube.id}`);
        tube.researcher = 'Unknown Researcher';
        needsUpdate = true;
      }
      
      // Fix 3: Ensure timestamps exist
      if (!tube.timestamps?.createdAt) {
        tube.timestamps = tube.timestamps || {};
        tube.timestamps.createdAt = new Date().toISOString();
        tube.timestamps.updatedAt = new Date().toISOString();
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        db.prepare('UPDATE tubes SET id = ?, data = ? WHERE id = ?')
          .run(tube.id, JSON.stringify(tube), row.id);
        fixed++;
      } else {
        skipped++;
      }
    }
    
    // Commit transaction
    db.prepare('COMMIT').run();
    
    console.log('✅ Migration complete!');
    console.log(`   Fixed: ${fixed} tubes`);
    console.log(`   Skipped: ${skipped} tubes (already valid)`);
    
  } catch (error) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    console.error('❌ Migration failed, rolled back:', error);
    throw error;
  } finally {
    db.close();
  }
};

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Run migration
migrateDatabase();
```

#### Step 3: Add NPM Script

**File:** `server/package.json`

```json
{
  "scripts": {
    "migrate:fix-validation": "tsx scripts/migrations/001-fix-tube-validation.ts"
  }
}
```

#### Step 4: Run Migration

```bash
cd server
npm run migrate:fix-validation
```

#### Step 5: Verify Data

**File:** `server/scripts/verify-data.ts`

```typescript
import Database from 'better-sqlite3';
import { tubeDataSchema } from '../../client/src/domains/tubes/schemas/tubeSchemas';

const db = new Database('./data/odysseus.sqlite');
const tubes = db.prepare('SELECT data FROM tubes').all();

let valid = 0;
let invalid = 0;

tubes.forEach((row: any) => {
  const tube = JSON.parse(row.data);
  const result = tubeDataSchema.safeParse(tube);
  
  if (result.success) {
    valid++;
  } else {
    invalid++;
    console.error('Invalid tube:', tube.id, result.error.errors);
  }
});

console.log(`Valid: ${valid}, Invalid: ${invalid}`);
db.close();
```

---

## Alternative: Lenient Schema (NOT RECOMMENDED)

If you want to preserve bad data temporarily, you could make schemas more lenient:

```typescript
// tubeSchemas.ts - TEMPORARY WORKAROUND
export const tubeDataSchema = z.object({
  id: z.string().min(1), // ❌ Remove UUID validation temporarily
  location: tubeLocationSchema,
  sample: tubeSampleSchema,
  researcher: z.string().min(1).or(z.literal('')).transform(val => val || 'Unknown'), // ❌ Allow empty
  timestamps: tubeTimestampsSchema
});
```

**Why NOT to do this:**
- Perpetuates bad data
- Defeats the purpose of validation
- Creates technical debt
- May cause issues with foreign key relationships later

---

## Validation Rules Reference

### Current Schema Requirements

**Tube ID:**
- Must be valid UUIDv4
- Example: `550e8400-e29b-41d4-a716-446655440000`

**Researcher:**
- Required field (non-empty string)
- Min length: 1 character
- Max length: 100 characters

**Location:**
- `tankId`: string, min length 1
- `rackId`: string, min length 1
- `boxId`: string, min length 1
- `position`: number, 1-81

**Sample:**
- `cellType`: required, min length 1
- All other fields optional

**Timestamps:**
- `createdAt`: ISO datetime string or Date object
- `updatedAt`: ISO datetime string or Date object

---

## Pre-Migration Checklist

- [ ] Backup database to `server/data/backups/`
- [ ] Verify backup file exists and is readable
- [ ] Install dependencies: `npm install uuid @types/uuid`
- [ ] Test migration script on backup copy first
- [ ] Review migration script for correctness
- [ ] Ensure no active connections to database

---

## Post-Migration Verification

1. **Run verification script** to ensure all tubes pass validation
2. **Start the app** and check console for Zod errors
3. **Load grid view** for tank-1/1/A to verify tubes display
4. **Create a new tube** to ensure write operations work
5. **Test export functionality** to verify data integrity

---

## Rollback Plan

If migration causes issues:

```bash
# Stop server
npm run dev:server  # Ctrl+C

# Restore backup
cp server/data/backups/odysseus-pre-cleanup-TIMESTAMP.sqlite server/data/odysseus.sqlite

# Restart server
npm run dev
```

---

## Success Criteria

- [ ] All tubes have valid UUIDs
- [ ] All tubes have non-empty researcher field
- [ ] All tubes have valid timestamps
- [ ] App loads without Zod validation errors
- [ ] Grid view displays tubes correctly
- [ ] No console errors during normal usage

---

## Next Steps After Cleanup

Once database is clean:

1. **Remove temporary logging** from `httpClient.getArray()` (added for debugging)
2. **Add database constraints** to prevent bad data in future:
   - Add CHECK constraint for UUID format
   - Add NOT NULL constraint for researcher field
3. **Add validation middleware** on backend to reject invalid data before it reaches database
4. **Consider adding data validation tests** to catch schema/data mismatches early

---

## Files to Create/Modify

### New Files
1. `server/scripts/migrations/001-fix-tube-validation.ts` - Migration script
2. `server/scripts/verify-data.ts` - Verification script
3. `server/data/backups/.gitkeep` - Ensure backup directory exists

### Modified Files
1. `server/package.json` - Add migration script
2. `client/src/infrastructure/api/httpClient.ts` - Remove temp logging after cleanup

---

**Recommendation:** Run Option A (Database Migration Script) in next session. This is the industry-standard approach and ensures long-term data quality.
