# HIGH RISK Errors - Quick Reference

**Total:** 46 errors across 16 files

---

## Errors by File

| File | Error Count | Error Numbers |
|------|------------|---------------|
| `domains\admin\ui\components\AuditLogViewer.tsx` | 11 | #49-59 |
| `domains\search\ui\components\FilterPanel.tsx` | 9 | #95-103 |
| `domains\search\ui\components\SearchResults.tsx` | 4 | #108, #109, #115, #122 |
| `domains\admin\ui\components\tabs\SystemConfigTab.tsx` | 3 | #61-63 |
| `domains\authentication\ui\components\tabs\AccountTab.tsx` | 3 | #68, #70, #72 |
| `domains\admin\ui\components\ActivityLogViewer.tsx` | 2 | #30, #31 |
| `domains\authentication\ui\components\tabs\PositionDisplayPreferenceTab.tsx` | 2 | #73, #74 |
| `domains\storage\ui\components\PositionDisplaySelector.tsx` | 2 | #126, #127 |
| `domains\tubes\ui\components\modals\MultiTubeEditorModal.tsx` | 2 | #177, #187 |
| `shared\ui\primitives\table\Table.tsx` | 2 | #274, #275 |
| `app\components\layout\Dashboard.tsx` | 1 | #7 |
| `domains\admin\ui\components\tabs\ResearcherManagementTab.tsx` | 1 | #60 |
| `domains\authentication\ui\components\tabs\SessionListSection.tsx` | 1 | #75 |
| `domains\tubes\hooks\useTubeForm.ts` | 1 | #139 |
| `domains\tubes\ui\components\modals\TubeEditorModal.tsx` | 1 | #201 |
| `domains\tubes\utils\colorSystem.ts` | 1 | #206 |

---

## Errors by Type

### Pagination Bugs (11 errors) - MOST CRITICAL
**File:** `domains\admin\ui\components\AuditLogViewer.tsx`
- `prev.offset || 0` - Lines 101, 107, 195, 346, 352
- `prev.limit || 50` - Lines 101, 107
- `filters.offset || 0` - Lines 106, 195, 346, 352
- `filters.limit || 50` - Lines 195, 346
- `pagination?.total || 0` - Lines 196, 346

**Impact:** Breaks pagination when on first page (offset=0)

---

### lotNumber Bugs (8 errors) - CRITICAL
**Variables:** `*.lotNumber`
- Error #108: `firstTubeA.sample?.lotNumber || ''` (SearchResults.tsx:85)
- Error #109: `firstTubeB.sample?.lotNumber || ''` (SearchResults.tsx:86)
- Error #115: `tube.sample.lotNumber || ''` (SearchResults.tsx:228)
- Error #122: `firstTube.sample?.lotNumber || ''` (SearchResults.tsx:377)
- Error #139: `tubeData.sample.lotNumber || ''` (useTubeForm.ts:331)
- Error #177: `tubeData.sample.lotNumber || ''` (MultiTubeEditorModal.tsx:76)
- Error #187: `analysis.lotNumber.commonValue || ''` (MultiTubeEditorModal.tsx:173)
- Error #206: `tubeData.lotNumber || ''` (colorSystem.ts:210)

**Impact:** lotNumber value of `0` displays as empty string

---

### Filter Count Bugs (11 errors) - CRITICAL
**File:** `domains\search\ui\components\FilterPanel.tsx`
**Pattern:** `filters.*.length || 0`
- Error #95: `filters.tankIds?.length || 0` (Line 167)
- Error #96: `filters.rackIds?.length || 0` (Line 167)
- Error #97: `filters.boxIds?.length || 0` (Line 167)
- Error #98: `filters.cellTypes?.length || 0` (Line 169)
- Error #99: `filters.lotNumbers?.length || 0` (Line 169)
- Error #100: `filters.donorInternalIds?.length || 0` (Line 170)
- Error #101: `filters.donorSourceIds?.length || 0` (Line 170)
- Error #102: `filters.cultureConditions?.length || 0` (Line 171)
- Error #103: `filters.researcherIds?.length || 0` (Line 173)

**Plus:**
- Error #30: `filters.actions?.length || 0` (ActivityLogViewer.tsx:289)
- Error #31: `filters.entityTypes?.length || 0` (ActivityLogViewer.tsx:291)

**Impact:** Empty arrays (length=0) not counted correctly

---

### Stats Display Bugs (3 errors) - HIGH
**File:** `domains\admin\ui\components\tabs\SystemConfigTab.tsx`
- Error #61: `stats?.totalTubes || 0` (Line 80)
- Error #62: `stats?.totalUsers || 0` (Line 86)
- Error #63: `stats?.totalResearchers || 0` (Line 92)

**Impact:** Zero counts may not display correctly

---

### Position Value Bugs (4 errors) - HIGH
**Variable:** `*.position`
- Error #60: `researcher.position || '—'` (ResearcherManagementTab.tsx:246)
- Error #68: `profile.position || ''` (AccountTab.tsx:45)
- Error #70: `profile.position || ''` (AccountTab.tsx:76)
- Error #72: `profile?.position || ''` (AccountTab.tsx:108)

**Impact:** Position value of `0` not handled correctly

---

### Format/Preset Bugs (4 errors) - MEDIUM
**Variables:** Format enums and presets
- Error #73: `defaultPositionDisplay?.format || null` (PositionDisplayPreferenceTab.tsx:26)
- Error #74: `savedPositionDisplay?.format || null` (PositionDisplayPreferenceTab.tsx:27)
- Error #126: `presets.NUMERIC || {...}` (PositionDisplaySelector.tsx:148)
- Error #127: `presets.ALPHANUMERIC_STANDARD || {...}` (PositionDisplaySelector.tsx:158)

**Impact:** Format enum value `0` may be valid

---

### Miscellaneous (5 errors)
- Error #7: `modalService.tubeEditorModal.positions || []` (Dashboard.tsx:410)
- Error #75: `result.browser.name || 'Unknown Browser'` (SessionListSection.tsx:36) - Review needed
- Error #201: `batchLocationDisplay?.positionRanges || ''` (TubeEditorModal.tsx:534)
- Error #274: `rowClassName || ''` (Table.tsx:398) - Review needed
- Error #275: `maxHeight || stickyHeader` (Table.tsx:530) - CSS height bug

---

## Fix Pattern

**Current (WRONG):**
```typescript
const value = something || fallback;  // Treats 0, false, "" as falsy
```

**Fixed (CORRECT):**
```typescript
const value = something ?? fallback;  // Only treats null/undefined as nullish
```

---

## Priority Order

1. **Phase 1:** Pagination bugs (#49-59) - 11 errors - BREAKS NAVIGATION
2. **Phase 2:** lotNumber bugs (#108, #109, #115, #122, #139, #177, #187, #206) - 8 errors - DATA LOSS
3. **Phase 3:** Filter counts (#30, #31, #95-103) - 11 errors - BREAKS FILTERING
4. **Phase 4:** Stats display (#61-63) - 3 errors - INCORRECT DISPLAY
5. **Phase 5:** Position/Format (#60, #68, #70, #72, #73, #74, #126, #127) - 8 errors - VALIDATION NEEDED
6. **Phase 6:** Remaining (#7, #75, #201, #274, #275) - 5 errors - CASE BY CASE

---

## Total: 46 HIGH Risk Errors

Every single one represents either a confirmed bug or a likely bug where `0` is being treated as falsy.
