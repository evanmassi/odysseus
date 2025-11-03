# Database Reset Plan - Fresh Start

**Date:** October 1, 2025  
**Status:** 📋 **READY TO EXECUTE**  
**Priority:** 🔴 **IMMEDIATE**  
**Estimated Effort:** 5 minutes

---

## Problem

Database contains test data with validation issues (invalid UUIDs, empty researchers). No real data needs preservation.

---

## Solution: Delete and Recreate

### Step 1: Stop the App
```bash
# Stop all processes (Ctrl+C in terminals)
```

### Step 2: Delete Database File
```bash
# Navigate to database location
cd C:\Users\evan\Desktop\Odysseus\odysseus-app\server\data

# Delete existing database
del odysseus.sqlite
```

### Step 3: Restart App
```bash
# From root directory
cd C:\Users\evan\Desktop\Odysseus\odysseus-app
npm run dev
```

The app will automatically create a fresh, empty database on first run.

---

## What Happens

1. **Backend detects missing database** and creates new `odysseus.sqlite`
2. **Tables are created** with proper schema
3. **App starts with empty inventory** (zero tubes, zero researchers)
4. **All validation passes** - no bad data to fail Zod schemas

---

## Next Steps After Reset

1. **Verify app loads** without Zod errors
2. **Add first researcher** through UI
3. **Add first tube** through UI
4. **Verify data persists** across app restarts

---

## Files Affected

- **Deleted:** `server/data/odysseus.sqlite`
- **Auto-created:** `server/data/odysseus.sqlite` (fresh, empty)

---

**Total Time:** ~5 minutes to reset and verify.
