# Dead Code Audit Report

**Date:** 2026-01-26
**Status:** Initial Audit - Requires Verification Before Removal

---

## Executive Summary

This audit identified potentially dead code across the Odysseus codebase. Each item requires manual verification before removal to ensure it's truly unused and not called dynamically or through indirect references.

### Findings Summary

| Confidence | Count | Description |
|------------|-------|-------------|
| High | 2 | Likely safe to remove after basic verification |
| Medium | 0 | Unused exports in active files |
| Needs Investigation | 2 | Require deeper analysis |
| **Total** | **0** | All items resolved (2 false positives, 18 removed/cleaned)

**Estimated Dead Code:**
- ~1 file can be completely deleted
- ~25+ unused functions/exports in active files
- ~1 unused dependency

**Highest Priority:** `storageLocalUpdates.ts` - entire file with 12 functions is dead code

**Note:** Each item MUST be verified before removal - see item #1 for example of false positive

**Categories Found:**
- Unused Files/Directories
- Unused Exports (functions, types, constants)
- Obsolete Migration Scripts
- Potentially Unused Dependencies

---

## HIGH CONFIDENCE - Likely Dead Code

### ~~1. Untracked Cache Directory~~ - VERIFIED AS ACTIVE
**Location:** `client/src/app/cache/`
**Status:** NOT DEAD CODE - Used by AppBootstrapService.ts
**Evidence:** `validateCacheVersion` is imported and called in bootstrap service

---

### ~~2. Obsolete Migration Codemod~~ - REMOVED
**Location:** `tools/codemods/remove-session-token.js`
**Status:** DELETED - Entire `tools/` directory removed (was only file)

---

### ~~3. Unused Build Script~~ - REMOVED
**Location:** `scripts/rebuild-native.js`
**Status:** DELETED - Entire `scripts/` directory removed (duplicate of postinstall functionality)

---

### ~~4. Empty Performance Hooks Directory~~ - REMOVED
**Location:** `client/src/shared/hooks/performance/`
**Status:** DELETED - Empty placeholder with no exports

---

### ~~5. Redundant Domain Errors Re-export Layer~~ - REMOVED
**Location:** `client/src/shared/domain/`
**Status:** DELETED - Entire `shared/domain/` directory removed (redundant re-export layer)

---

### ~~6. Unused Storage Migration Types~~ - REMOVED
**Location:** `client/src/domains/storage/types/`
**Status:** DELETED - Entire directory removed (unused migration utilities)

---

### ~~7. Unused Design System Token Re-exports~~ - REMOVED
**Location:** `client/src/shared/ui/designSystem/`
**Status:** DELETED - Entire directory removed (7 files). Re-exports removed from primitives/index.ts.
**Reason:** Tailwind CSS with CSS variables handles all styling - these JS tokens were never used.

---

### ~~8. Unused Storage Creator Functions~~ - REMOVED
**Location:** `client/src/domains/storage/creators/TankCreator.ts`
**Status:** DELETED - Entire `creators/` directory removed.
**Note:** Original audit was partially incorrect - `getNextTankNumber` WAS used by StorageManagerModal.tsx.
Function was inlined into the modal component before deletion. 3 unused creator functions removed.

---

### ~~9. Completely Unused Storage Local Updates Module~~ - REMOVED
**Location:** `client/src/domains/storage/utils/storageLocalUpdates.ts`
**Status:** DELETED - 270 lines, 12 functions removed. StorageManagerModal now uses server mutations via React Query.

---

### ~~10. Unused Default Configuration Utilities~~ - REMOVED
**Location:** `client/src/domains/storage/utils/defaultConfiguration.ts`
**Status:** DELETED - 110 lines removed. Server handles all default configuration creation.

---

### ~~11. Unused Tube Access Control Hook~~ - VERIFIED AS ACTIVE
**Location:** `client/src/domains/tubes/hooks/useTubeAccessControl.ts`
**Status:** NOT DEAD CODE - Used by Dashboard.tsx for tube locking permission checks.
**Evidence:** `Dashboard.tsx:65: const accessControl = useTubeAccessControl(user);`

---

### ~~12. Unused Search Utility Functions~~ - PARTIALLY REMOVED
**Location:** `client/src/domains/search/lib/searchUtils.ts`
**Status:**
- `transformSearchResult` - DELETED (39 lines removed, never imported)
- `getPrimaryLocation` - KEPT but made internal (used by `groupTubesByRelevance`, removed public export)

---

### ~~13. Unused Admin Researchers Query~~ - REMOVED
**Location:** `client/src/domains/researchers/hooks/useResearchersQuery.ts`
**Status:** DELETED - 19 lines removed. Hook was never exported or used.

---

## MEDIUM CONFIDENCE - Unused Exports Within Active Files

### ~~14. Unused Bootstrap Constants and Types~~ - PARTIALLY REMOVED
**Location:** `client/src/app/bootstrap/`
**Status:**
- `BOOTSTRAP_TIMEOUT` - DELETED (never imported)
- `UseAppBootstrapReturn` - DELETED (legacy interface superseded by `UseAppBootstrapResult`)
- `BootstrapInitializationResult` - KEPT (used internally by useAppBootstrap.ts)

---

### ~~15. Duplicate useAppReady Hook~~ - REMOVED
**Locations:** Both removed
**Status:** DELETED - Both versions were dead code. Components destructure `isReady` directly from `useBootstrapContext()` instead.

---

### ~~16. Unused Component Props~~ - REMOVED
**Locations:** AppHeader.tsx, TubeGrid.tsx, Dashboard.tsx
**Status:** DELETED - Removed legacy callback props superseded by gridController pattern:
- `_onEditTube` from AppHeader (interface + destructure)
- `_onEditTube`, `_onBatchEditTubes`, `_onAddTubes` from TubeGrid (interface + destructure)
- Removed prop passes from Dashboard.tsx

---

### ~~17. Unused Error Mapping Utilities~~ - REMOVED
**Location:** `client/src/shared/errors/mapError.ts`
**Status:** DELETED - Entire file (250 lines) removed. Original audit only flagged 4 functions, but investigation revealed the entire file was unused.
**Note:** Only `isConflictError`, `InfrastructureError`, and `AppInitializationError` from AppError.ts are actually used.

---

### ~~18. Primitives Index Barrel Export Overhead~~ - FIXED
**Location:** `client/src/shared/ui/primitives/index.ts`
**Status:** CLEANED UP - Original audit was incorrect about barrel being unused (it's re-exported via `@shared/ui`).
**Issues Fixed:**
1. Removed ~100 lines of dead "common types" (interfaces/types never imported anywhere)
2. Refactored 15 inconsistent direct imports (`@shared/ui/primitives/*`) to use public API (`@shared/ui`)
**Files updated:** ConcentrationInput.tsx, ConnectionStatusIndicator.tsx, InlineEditInput.tsx, AuditLogViewer.tsx, PositionDisplaySelector.tsx, StorageNavigatorItem.tsx, BoxRow.tsx, AssignmentsByUserView.tsx, AssignmentDropdown.tsx, RackRow.tsx, TankRow.tsx

---

## NEEDS INVESTIGATION - Require Deeper Verification

### ~~19. Potentially Unused Dev Dependencies~~ - REMOVED
**Package:** `client/package.json`
**Status:** DELETED - `baseline-browser-mapping` was redundant. Already provided as transitive dependency via `browserslist` (used by autoprefixer/tailwindcss).

---

### ~~20. Design System Index File~~ - ALREADY REMOVED
**Location:** `client/src/shared/ui/designSystem/index.ts`
**Status:** Already deleted as part of #7 (entire designSystem directory removed).

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
1. ~~`client/src/domains/storage/utils/storageLocalUpdates.ts`~~ - REMOVED (12 dead functions)
2. ~~`client/src/app/cache/` directory~~ - REMOVED (verified as active)
3. ~~`client/src/shared/hooks/performance/` directory~~ - REMOVED
4. ~~`client/src/shared/domain/` directory~~ - REMOVED
5. ~~`client/src/domains/storage/types/`~~ - REMOVED
6. ~~`client/src/domains/storage/creators/TankCreator.ts`~~ - REMOVED (getNextTankNumber inlined)
7. ~~`client/src/domains/storage/utils/defaultConfiguration.ts`~~ - REMOVED
8. ~~`client/src/domains/tubes/hooks/useTubeAccessControl.ts`~~ - FALSE POSITIVE (used by Dashboard.tsx)
9. ~~`tools/codemods/remove-session-token.js`~~ - REMOVED

**Phase 2 - Remove Unused Exports from Active Files**
1. ~~`scripts/rebuild-native.js`~~ - REMOVED
2. ~~Unused error utilities in `mapError.ts`~~ - REMOVED (entire file was dead, 250 lines)
3. ~~Design system token files~~ - REMOVED (entire designSystem/ directory deleted)
4. Clean up `storage/index.ts` to remove dead exports
5. Remove `BOOTSTRAP_TIMEOUT` from bootstrap/constants.ts
6. Remove duplicate `useAppReady` from BootstrapContext.tsx
7. Remove unused types from bootstrap/types.ts
8. Remove `_onEditTube` prop from AppHeader.tsx
9. Remove `transformSearchResult` and `getPrimaryLocation` from search/searchUtils.ts
10. Remove `useAdminResearchersQuery` from researchers/useResearchersQuery.ts

**Phase 3 - Refactoring**
1. ~~Clean up `primitives/index.ts` barrel export~~ - DONE (dead common types removed, inconsistent imports refactored)
2. ~~Remove `baseline-browser-mapping` if unused~~ - DONE (redundant transitive dependency)

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
