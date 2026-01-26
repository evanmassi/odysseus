# Dead Code Audit Report

**Date:** 2026-01-26
**Status:** Initial Audit - Requires Verification Before Removal

---

## Executive Summary

This audit identified potentially dead code across the Odysseus codebase. Each item requires manual verification before removal to ensure it's truly unused and not called dynamically or through indirect references.

### Findings Summary

| Confidence | Count | Description |
|------------|-------|-------------|
| High | 13 | Likely safe to remove after basic verification |
| Medium | 5 | Unused exports in active files |
| Needs Investigation | 2 | Require deeper analysis |
| **Total** | **20** | Items identified |

**Estimated Dead Code:**
- ~10 files can be completely deleted
- ~30+ unused functions/exports in active files
- ~1 unused dependency
- ~1 entire token system directory (pending Tailwind verification)

**Highest Priority:** `storageLocalUpdates.ts` - entire file with 12 functions is dead code

**Categories Found:**
- Unused Files/Directories
- Unused Exports (functions, types, constants)
- Obsolete Migration Scripts
- Potentially Unused Dependencies

---

## HIGH CONFIDENCE - Likely Dead Code

### 1. Untracked Cache Directory
**Location:** `client/src/app/cache/`
**Files:**
- `index.ts`
- `cacheVersionValidation.ts`
- `cacheVersionValidation.test.ts`

**Evidence:**
- Directory is untracked in git (shows `??` status)
- `validateCacheVersion` export is never imported anywhere in the codebase
- Only self-referencing imports within the directory itself

**Recommendation:** Delete entire directory after confirming it was never integrated.

---

### 2. Obsolete Migration Codemod
**Location:** `tools/codemods/remove-session-token.js`

**Evidence:**
- Designed to remove `sessionToken` parameters during OAuth migration
- No `sessionToken` references exist in `client/src/` anymore
- Server uses `sessionToken` legitimately in JWT handling (3 files)
- Migration appears complete

**Recommendation:** Delete the codemod file and potentially the entire `tools/codemods/` directory if empty.

---

### 3. Unused Build Script
**Location:** `scripts/rebuild-native.js`

**Evidence:**
- Not referenced in any `package.json` scripts
- Not imported anywhere in the codebase
- Designed for electron-builder but not wired up

**Recommendation:** Verify with build team, then delete if unused.

---

### 4. Empty Performance Hooks Directory
**Location:** `client/src/shared/hooks/performance/index.ts`

**Evidence:**
- File explicitly states "No exports - file kept for future implementation"
- Never imported anywhere (`@shared/hooks/performance` has zero imports)
- Contains only TODO comments

**Recommendation:** Delete the entire `performance/` directory.

---

### 5. Redundant Domain Errors Re-export Layer
**Location:** `client/src/shared/domain/errors/`
**Files:**
- `DomainError.ts`
- `index.ts`

**Evidence:**
- `@shared/domain/errors` is never imported directly (0 usages)
- Files only re-export from `../../errors/` (the main error system)
- Main error system at `@shared/errors/` is properly used (6 files import it)

**Recommendation:** Delete entire `shared/domain/errors/` directory.

---

### 6. Unused Storage Migration Types
**Location:** `client/src/domains/storage/types/migrations.ts`

**Evidence:**
- Exports: `LegacyGridConfig`, `isGridConfiguration`, `isLegacyGridConfig`, `hasEquipment`, `hasRacks`, `hasTanks`
- None of these are imported anywhere in the codebase
- Migration may have been completed and types left behind

**Recommendation:** Delete the file after confirming migrations are complete.

---

### 7. Unused Design System Token Re-exports
**Location:** `client/src/shared/ui/designSystem/tokens/`

**Evidence:**
- `@shared/ui/designSystem/tokens` is never imported directly
- `@shared/ui/designSystem` is never imported
- Re-exports in `primitives/index.ts` include tokens but only `Tooltip` is ever imported from primitives
- The actual design tokens (colors, shadows, spacing, etc.) are never used in application code

**Potentially Dead Files:**
- `tokens/colors.ts` - exports not used
- `tokens/shadows.ts` - exports not used
- `tokens/spacing.ts` - exports not used
- `tokens/typography.ts` - exports not used
- `tokens/borders.ts` - (need to verify)
- `tokens/index.ts` - aggregator file

**Recommendation:** Audit each token file individually. Tailwind CSS may be handling styling instead.

---

### 8. Unused Storage Creator Functions
**Location:** `client/src/domains/storage/creators/TankCreator.ts`

**Unused Exports:**
| Export | Usages Outside Definition |
|--------|---------------------------|
| `createBoxFromDefaults` | 0 |
| `createRackFromDefaults` | 0 |
| `createTankFromDefaults` | 0 |
| `getNextTankNumber` | 0 |

**Evidence:**
- Exported in `storage/index.ts` but never imported anywhere
- Functions defined but application uses different creation patterns

**Recommendation:** Delete `TankCreator.ts` file and remove exports from index.ts.

---

### 9. Completely Unused Storage Local Updates Module (HIGH PRIORITY)
**Location:** `client/src/domains/storage/utils/storageLocalUpdates.ts`

**Status:** ENTIRE FILE UNUSED - Contains 12 exported functions, none are imported anywhere

**Unused Functions:**
| Function | Line |
|----------|------|
| `addTankToLab` | 15 |
| `updateTankInLab` | 25 |
| `deleteTankFromLab` | 41 |
| `addRackToLab` | 53 |
| `updateRackInLab` | 71 |
| `deleteRackFromLab` | 94 |
| `addBoxToLab` | 118 |
| `updateBoxInLab` | 143 |
| `deleteBoxFromLab` | 176 |
| `assignRackInLab` | 208 |
| `assignBoxInLab` | 237 |
| `updateCustomLabelInLab` | 251 |

**Evidence:**
- File header says "Used by StorageManagerModal" but this is outdated
- Grep for any function name returns 0 matches outside definition

**Recommendation:** Delete entire file - highest priority dead code.

---

### 10. Unused Default Configuration Utilities
**Location:** `client/src/domains/storage/utils/defaultConfiguration.ts`

**Unused Exports:**
| Export | Usages Outside Definition |
|--------|---------------------------|
| `createDefaultConfiguration` | 0 |
| `createDefaultSystemConfig` | 0 |

**Evidence:**
- Only appears in its own file and storage/index.ts
- Never actually imported or called

**Recommendation:** Delete `defaultConfiguration.ts` file and remove exports from index.ts.

---

### 11. Unused Tube Access Control Hook
**Location:** `client/src/domains/tubes/hooks/useTubeAccessControl.ts`

**Export:** `useTubeAccessControl` (lines 51-168)

**Evidence:**
- Exported in tubes/hooks/index.ts (line 37)
- Zero imports anywhere in codebase
- Purpose was client-side permission checks for tube locking

**Recommendation:** Delete the file and remove from hooks/index.ts.

---

### 12. Unused Search Utility Functions
**Location:** `client/src/domains/search/lib/searchUtils.ts`

**Unused Exports:**
| Export | Line | Purpose |
|--------|------|---------|
| `transformSearchResult` | 123-161 | Transform search result format |
| `getPrimaryLocation` | 108-116 | Get primary location for tube group |

**Evidence:**
- Exported in search/index.ts barrel
- Only appear in definition file and barrel export
- Never imported by any component

**Recommendation:** Remove these functions from searchUtils.ts and search/index.ts.

---

### 13. Unused Admin Researchers Query
**Location:** `client/src/domains/researchers/hooks/useResearchersQuery.ts`

**Export:** `useAdminResearchersQuery` (lines 50-65)

**Evidence:**
- Defined but NOT exported in hooks/index.ts
- Zero imports across entire codebase

**Recommendation:** Remove the function definition.

---

## MEDIUM CONFIDENCE - Unused Exports Within Active Files

### 14. Unused Bootstrap Constants and Types
**Location:** `client/src/app/bootstrap/`

**Unused Exports:**
| Export | File | Evidence |
|--------|------|----------|
| `BOOTSTRAP_TIMEOUT` | constants.ts:44 | Never imported anywhere |
| `BootstrapInitializationResult` | types.ts:49-54 | Only internal usage |
| `UseAppBootstrapReturn` | types.ts:32-38 | Legacy duplicate, unused |

**Recommendation:** Remove these unused exports.

---

### 15. Duplicate useAppReady Hook
**Locations:**
- `client/src/app/bootstrap/useAppBootstrap.ts` (line 114-117)
- `client/src/app/contexts/BootstrapContext.tsx` (line 48-51)

**Evidence:**
- Two implementations of the same hook exported
- BootstrapContext version marked "Legacy compatibility"

**Recommendation:** Remove the duplicate from BootstrapContext.tsx.

---

### 16. Unused Component Props
**Location:** `client/src/app/components/layout/AppHeader.tsx`

**Unused Prop:** `_onEditTube` (line 69)
- Defined in HeaderProps interface but never used in component body

**Recommendation:** Remove from interface.

---

### 17. Unused Error Mapping Utilities
**Location:** `client/src/shared/errors/mapError.ts` and `index.ts`

**Unused Exports:**
| Export | Definition Location | Usages Outside Definition |
|--------|---------------------|---------------------------|
| `mapFormError` | mapError.ts | 0 |
| `getErrorContext` | mapError.ts | 0 |
| `shouldReportError` | mapError.ts | 0 |
| `getErrorSeverity` | mapError.ts | 0 |

**Recommendation:** Remove these exports and their implementations from mapError.ts.

---

### 18. Primitives Index Barrel Export Overhead
**Location:** `client/src/shared/ui/primitives/index.ts`

**Evidence:**
- Only 1 file imports from `@shared/ui/primitives` (StorageNavigatorItem.tsx)
- That file only imports `Tooltip`
- The barrel exports 15+ components, 50+ types, and all design tokens
- Individual primitive imports (e.g., `@shared/ui/primitives/button/Button`) are used instead

**Recommendation:** Consider removing the barrel index.ts or significantly reducing its exports.

---

## NEEDS INVESTIGATION - Require Deeper Verification

### 19. Potentially Unused Dev Dependencies
**Package:** `client/package.json`

| Dependency | Evidence |
|------------|----------|
| `baseline-browser-mapping` | Only appears in package.json, not in any source files or config |

**Recommendation:** Check if this is used by a build tool or Vite plugin.

---

### 20. Design System Index File
**Location:** `client/src/shared/ui/designSystem/index.ts`

**Evidence:**
- Aggregates token exports
- Never imported directly
- Only referenced by primitives/index.ts

**Recommendation:** Delete if design system tokens are confirmed unused.

---

## AUDIT METHODOLOGY

### Patterns Checked
1. **Unused exports:** Searched for all `export` statements, then grepped for imports of each
2. **Unused files:** Checked if file paths appear in any import statements
3. **Commented-out code:** Manual inspection during file reads
4. **Unused dependencies:** Grepped source files for package names

### Tools Used
- `Grep` for import/export pattern matching
- `Glob` for file discovery
- `Read` for manual inspection of suspicious files

### Limitations
1. **Dynamic imports:** `import()` calls with variable paths won't be caught
2. **Indirect references:** Code called via reflection or string-based lookups
3. **External references:** Code used by electron main process or build scripts
4. **Type-only exports:** TypeScript types used only for IDE support

---

## RECOMMENDED REMOVAL ORDER

**Phase 1 - Safe Removals (High Confidence - Complete File Deletions)**
1. `client/src/domains/storage/utils/storageLocalUpdates.ts` **(HIGH PRIORITY - 12 dead functions)**
2. `client/src/app/cache/` directory
3. `client/src/shared/hooks/performance/` directory
4. `client/src/shared/domain/errors/` directory
5. `client/src/domains/storage/types/migrations.ts`
6. `client/src/domains/storage/creators/TankCreator.ts`
7. `client/src/domains/storage/utils/defaultConfiguration.ts`
8. `client/src/domains/tubes/hooks/useTubeAccessControl.ts`
9. `tools/codemods/remove-session-token.js`

**Phase 2 - Remove Unused Exports from Active Files**
1. `scripts/rebuild-native.js` (check with build team first)
2. Unused error utilities in `mapError.ts` (4 functions)
3. Design system token files (verify Tailwind covers these)
4. Clean up `storage/index.ts` to remove dead exports
5. Remove `BOOTSTRAP_TIMEOUT` from bootstrap/constants.ts
6. Remove duplicate `useAppReady` from BootstrapContext.tsx
7. Remove unused types from bootstrap/types.ts
8. Remove `_onEditTube` prop from AppHeader.tsx
9. Remove `transformSearchResult` and `getPrimaryLocation` from search/searchUtils.ts
10. Remove `useAdminResearchersQuery` from researchers/useResearchersQuery.ts

**Phase 3 - Refactoring**
1. Clean up `primitives/index.ts` barrel export
2. Remove `baseline-browser-mapping` if unused

---

## VERIFICATION CHECKLIST

Before removing any item, verify:
- [ ] No dynamic imports reference the code
- [ ] No build scripts use the code
- [ ] No electron main process uses the code
- [ ] Tests still pass after removal
- [ ] Application runs correctly after removal

---

## Next Steps

1. Review this report with team
2. Pick items from Phase 1 for removal
3. Create removal PR with tests verifying no regressions
4. Move to Phase 2 after Phase 1 is merged and validated
