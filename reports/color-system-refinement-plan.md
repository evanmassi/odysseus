# Color System Refinement Plan

**Created:** 2025-12-12
**Last Updated:** 2025-12-12
**Status:** Planning Complete - Ready for Implementation
**Priority:** Medium

---

## Executive Summary

The Odysseus app's tube color coding system needs refinement to better serve a cell therapy laboratory workflow. The current system produces colors that are too similar (clustered blues/pinks) and doesn't properly handle cell lines as distinct entities.

---

## Current State Analysis

### Existing Color System Architecture

| Component | Location | Purpose |
|-----------|----------|---------|
| Main color logic | `client/src/domains/tubes/utils/colorSystem.ts` | Donor-based color assignment (485 lines) |
| LAB color utilities | `client/src/shared/utils/labColorSpace.ts` | Perceptually uniform color generation (283 lines) |
| Type definitions | `client/src/domains/tubes/types/colorSystemTypes.ts` | TypeScript interfaces (relocated) |
| CSS styling | `client/src/domains/tubes/ui/components/grid/colorIndicators.css` | Visual styling (relocated) |
| UI component | `client/src/domains/tubes/ui/components/grid/GridPosition.tsx` | Renders colored cells |

### Current Color Assignment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   CURRENT getTubeColor() FLOW                   │
│                   (colorSystem.ts lines 344-381)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. adaptTubeDataForColorSystem(tubeData)                       │
│     └─► Converts TubeData to ColorSystemTubeData format         │
│                                                                 │
│  2. createTubeSignature(adaptedData)                            │
│     └─► Creates cache key: "donorId|cellType|lotNumber|cond"    │
│                                                                 │
│  3. Check cache for existing color                              │
│     └─► If found, return cached color                           │
│                                                                 │
│  4. getDonorIdentifier(adaptedData)                             │
│     └─► Returns: donorInternalId || donorSourceId || 'unknown'  │
│         ⚠️ PROBLEM: Cell lines have no donor ID → 'unknown'     │
│                                                                 │
│  5. Get/assign base color for donor                             │
│     └─► hashStringToIndex(donorId, 96) → palette color          │
│         ⚠️ PROBLEM: All 'unknown' tubes get SAME color          │
│                                                                 │
│  6. getCellTypeBrightnessOffset(cellType)                       │
│     └─► Returns brightness adjustment (-25 to +40)              │
│                                                                 │
│  7. adjustColorBrightness(baseColor, offset)                    │
│     └─► Modifies L value in LAB space                           │
│                                                                 │
│  8. Return { backgroundColor, borderColor, textColor }          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Current Palette Parameters (Lines 45-51)

```typescript
const donorColorPalette = generateOptimalColorPalette({
  count: 96,
  minDistance: 12,        // ← PROBLEM: Only 12 ΔE (barely noticeable)
  lightRange: [55, 85],   // ← PROBLEM: Narrow range (all medium-light)
  chromaRange: [25, 50],  // ← PROBLEM: Low saturation (washed out)
  seed: 12345,
});
```

### Current Cell Type Brightness Map (Lines 245-301)

27 cell types currently defined:

| Category | Cell Types | Brightness Offset |
|----------|------------|-------------------|
| PBMC | pbmc, pbmcs, peripheral blood mononuclear cells | 0 |
| T Cells | t cells, t cell, cd3+, cd4+, cd8+, th1, th2, th17, treg, regulatory t | +15 to +30 |
| B Cells | b cells, b cell, cd19+, cd20+ | +18 |
| NK Cells | nk cells, nk cell, natural killer, cd56+ | +10 |
| Monocytes | monocytes, monocyte, cd14+, cd16+ | -10 to -15 |
| Macrophages | macrophages, macrophage, m1, m2 | -18 to -25 |
| Dendritic | dendritic cells, dc, dendritic | -12 |
| Stem Cells | msc, mesenchymal, stem cells, hsc | +35 to +40 |
| Cell Lines | hela, jurkat, k562, u937 | -8 to +22 |

**Missing:** CAR-T, TILs, UTD (untransduced), and lab-specific cell lines

---

## Problems Identified

### Problem 1: Colors Too Similar

**Symptom:** Two different donors next to each other have minimal difference in blue hue - hard to perceive.

**Root Cause (from deep dive):**
- `minDistance: 12` ΔE is "just noticeable difference" - not clearly distinct
- `chromaRange: [25, 50]` produces washed-out pastels that cluster visually
- `lightRange: [55, 85]` is too narrow - all colors medium brightness
- 96 colors crammed into narrow ranges = clustering in blues/pinks

### Problem 2: Cell Lines Treated as "Unknown Donors"

**Symptom:** Jurkat, Nalm6, SKOV3 all get the same ugly color.

**Root Cause (from deep dive - getDonorIdentifier lines 214-231):**
```typescript
function getDonorIdentifier(tubeData: ColorSystemTubeData): string {
  if (tubeData.donorInternalId || tubeData.donorSourceId) {
    return tubeData.donorInternalId || tubeData.donorSourceId || 'unknown';
  }
  if (!tubeData.donor) return 'unknown';  // ← Cell lines hit this!
  // ...
}
```
- Cell lines don't have donor IDs (the cell line name IS the identifier)
- System falls back to `'unknown'` for all cell lines
- All cell lines get identical color from `hash('unknown')`

### Problem 3: Ugly "Unknown" Fallback Color

**Symptom:** Tubes without donor IDs get a random, unappealing color.

**Root Cause:**
- Fallback uses `hash('unknown')` which lands on arbitrary palette color
- No intentional design for "missing data" visual state

### Problem 4: CSS in Wrong Location (RESOLVED)

**Status:** ✅ Fixed on 2025-12-12

Files relocated to proper architectural locations:
- `colorIndicators.css` → `domains/tubes/ui/components/grid/`
- `colorSystemTypes.ts` → `domains/tubes/types/`

---

## Lab Context & Requirements

### Lab Profile: Cell Therapy Focus

- **Primary tube types:** T cells (untransduced), CAR-T cells, PBMC, TILs
- **Cell lines used:** Jurkat, Nalm6, LnCap, 22RV1, SKBR3, PAN-1, MCF7, A549, H1299
- **Donor count:** Currently <100, expected to grow to 100+ over years
- **Box size:** Max 81 positions (9x9 grid)

### Primary Use Case

> "Scanning the bank to see what available untransduced T cell donors or PBMCs would be available"

**Key requirement:** Within any given box, different donors must be clearly visually distinct.

### Visual Hierarchy Priorities

1. **Donor distinction** (primary) - Different donors = clearly different colors
2. **Cell type distinction** (secondary) - Same donor, different cell types = brightness variation
3. **Cell line identification** (special case) - Pre-assigned recognizable colors
4. **Data quality indication** - Missing donor ID = theme-colored fallback

---

## Proposed Solution

### Change 1: Refined Donor Palette Parameters

**Location:** `colorSystem.ts` lines 45-51

**Current:**
```typescript
const donorColorPalette = generateOptimalColorPalette({
  count: 96,
  minDistance: 12,
  lightRange: [55, 85],
  chromaRange: [25, 50],
  seed: 12345,
});
```

**Proposed:**
```typescript
const donorColorPalette = generateOptimalColorPalette({
  count: 72,              // Fewer colors, more distinct
  minDistance: 18,        // Clearly different (not "barely noticeable")
  chromaRange: [30, 55],  // Still muted, but wider range
  lightRange: [40, 75],   // Wider range, better variety
  seed: 12345,            // Keep same seed for consistency
});
```

**Rationale:**
- 72 colors is sufficient (box max is 81, rarely all unique donors)
- 18 ΔE = clearly perceptible difference (vs 12 = barely noticeable)
- Chroma 30-55 = professional/muted, not neon (neon would be 70+)
- Lightness 40-75 = wider variety without extremes

### Change 2: Cell Line Palette & Detection Functions

**Location:** Add after line 51 (after donor palette definition)

```typescript
// Pre-assigned colors for known cell lines
const cellLinePalette: Record<string, string> = {
  // Lab's commonly used cell lines
  'jurkat':  '#C44536',  // Distinct red
  'nalm6':   '#2A9D8F',  // Teal
  'lncap':   '#7B68EE',  // Medium slate blue
  '22rv1':   '#E9C46A',  // Gold/mustard
  'skbr3':   '#9B59B6',  // Purple
  'pan-1':   '#F4A261',  // Sandy orange
  'mcf7':    '#1D3557',  // Dark navy
  'a549':    '#E76F51',  // Coral/salmon
  'h1299':   '#264653',  // Dark teal

  // Additional common cell lines
  'hela':    '#8B4513',  // Saddle brown
  'k562':    '#DC143C',  // Crimson
  'u937':    '#4682B4',  // Steel blue
};
```

**Add detection functions (before getDonorIdentifier, ~line 200):**

```typescript
function isKnownCellLine(cellType: string): boolean {
  if (!cellType) return false;
  const normalized = cellType.toLowerCase().trim();
  return Object.keys(cellLinePalette).some(line =>
    normalized.includes(line) || normalized === line
  );
}

function getCellLineColor(cellType: string): string | null {
  if (!cellType) return null;
  const normalized = cellType.toLowerCase().trim();
  for (const [line, color] of Object.entries(cellLinePalette)) {
    if (normalized.includes(line) || normalized === line) {
      return color;
    }
  }
  return null;
}
```

### Change 3: Unknown Fallback Color Constant

**Location:** Add after cell line palette (~line 70)

```typescript
// Muted theme blue for tubes with missing donor/cell line info
const UNKNOWN_FALLBACK_COLOR = '#7a9dbd';
```

**Rationale:**
- Based on app theme blue `#5987b6`, slightly muted
- Intentional design, not random hash result
- Clearly indicates "needs attention/data"

### Change 4: Updated getTubeColor Logic

**Location:** `colorSystem.ts` lines 344-381

**New flow:**
```
1. Is cellType a known cell line?
   YES → Use pre-assigned cell line color (skip donor logic entirely)

2. Does tube have donor ID?
   YES → Use donor palette + cell type brightness (existing logic)

3. Fallback (no cell line, no donor ID)
   → Use UNKNOWN_FALLBACK_COLOR
```

**Proposed implementation:**
```typescript
export function getTubeColor(tubeData: any): ColorResult {
  const adaptedData = adaptTubeDataForColorSystem(tubeData);
  const signature = createTubeSignature(adaptedData);

  // Check cache first
  const cachedColor = globalCache.getTubeColor(signature);
  if (cachedColor) {
    return {
      backgroundColor: cachedColor,
      borderColor: adjustColorBrightness(cachedColor, -20),
      textColor: getOptimalTextColor(cachedColor),
    };
  }

  let finalColor: string;
  const cellType = adaptedData.cellType || '';

  // Step 1: Check if this is a known cell line
  const cellLineColor = getCellLineColor(cellType);
  if (cellLineColor) {
    finalColor = cellLineColor;
  } else {
    // Step 2: Check for donor IDs
    const donorId = getDonorIdentifier(adaptedData);

    if (donorId !== 'unknown') {
      // Has donor ID - use donor palette
      let baseColor = globalCache.getDonorColor(donorId);
      if (!baseColor) {
        const colorIndex = hashStringToIndex(donorId, donorColorPalette.length);
        baseColor = donorColorPalette[colorIndex];
        globalCache.setDonorColor(donorId, baseColor);
      }

      // Apply cell type brightness offset
      const brightnessOffset = getCellTypeBrightnessOffset(cellType);
      finalColor = adjustColorBrightness(baseColor, brightnessOffset);
    } else {
      // Step 3: No donor ID and not a cell line - use fallback
      finalColor = UNKNOWN_FALLBACK_COLOR;
    }
  }

  globalCache.setTubeColor(signature, finalColor);

  return {
    backgroundColor: finalColor,
    borderColor: adjustColorBrightness(finalColor, -20),
    textColor: getOptimalTextColor(finalColor),
  };
}
```

### Change 5: Updated Cell Type Brightness Map

**Location:** `colorSystem.ts` lines 245-301 (add to existing Map)

**Add these entries:**
```typescript
// Cell therapy specific
['car-t', 25],
['car-t cells', 25],
['cart', 25],
['cart cells', 25],
['untransduced', 12],
['untransduced t cells', 12],
['utd', 12],
['utd t cells', 12],
['tils', 8],
['til', 8],
['tumor-infiltrating lymphocytes', 8],
['tumor infiltrating lymphocytes', 8],
```

**Brightness hierarchy for same donor:**
```
CAR-T:        +25 (lightest - the final product)
Untransduced: +12 (medium-light)
TILs:         +8  (medium)
PBMC:         0   (baseline)
```

---

## Implementation Checklist

### Phase 0: File Reorganization ✅ COMPLETED 2025-12-12
- [x] Move `colorIndicators.css` to `domains/tubes/ui/components/grid/`
- [x] Move `colorSystemTypes.ts` to `domains/tubes/types/`
- [x] Update all imports
- [x] Verify build passes

### Phase 1: Color System Logic Updates
| Task | Location | Lines |
|------|----------|-------|
| [ ] Update palette parameters | `colorSystem.ts` | 45-51 |
| [ ] Add `cellLinePalette` constant | `colorSystem.ts` | after 51 |
| [ ] Add `UNKNOWN_FALLBACK_COLOR` constant | `colorSystem.ts` | after palette |
| [ ] Add `isKnownCellLine()` function | `colorSystem.ts` | ~200 |
| [ ] Add `getCellLineColor()` function | `colorSystem.ts` | ~210 |
| [ ] Update `getTubeColor()` logic | `colorSystem.ts` | 344-381 |
| [ ] Add cell therapy entries to brightness map | `colorSystem.ts` | 245-301 |

### Phase 2: Testing & Validation
- [ ] Verify donor colors are visually distinct
- [ ] Verify cell lines get correct pre-assigned colors
- [ ] Verify unknown fallback displays theme gray-blue
- [ ] Verify text contrast (black/white) works correctly
- [ ] Test in various box scenarios

---

## Files to Modify

| File | Changes | Lines Affected |
|------|---------|----------------|
| `client/src/domains/tubes/utils/colorSystem.ts` | Palette params, cell line logic, fallback, brightness map | 45-51, 200-220, 245-301, 344-381 |

**No changes needed:**
- `labColorSpace.ts` - Utility functions work correctly
- `colorSystemTypes.ts` - Types are sufficient
- `colorIndicators.css` - Styling is correct

---

## Visual Examples

### Before (Current Issues)

```
Box view - hard to distinguish donors:
┌─────┬─────┬─────┬─────┬─────┐
│pale │pale │pale │pale │pale │
│blue │blue │pink │blue │pink │
│D001 │D002 │D003 │D004 │Jurkat│  ← All look similar!
└─────┴─────┴─────┴─────┴─────┘
```

### After (Proposed)

```
Box view - clear donor distinction:
┌─────┬─────┬─────┬─────┬─────┐
│muted│muted│muted│muted│ RED │
│rust │sage │plum │teal │     │
│D001 │D002 │D003 │D004 │Jurkat│  ← Each clearly different!
└─────┴─────┴─────┴─────┴─────┘
```

### Same Donor, Different Cell Types

```
Donor D001 progression:
┌─────────┬─────────┬─────────┐
│  PBMC   │   UTD   │  CAR-T  │
│  D001   │  D001   │  D001   │
│ (base)  │(lighter)│(lightest)│
│ rust    │lt. rust │palest   │
└─────────┴─────────┴─────────┘
Same hue family, different brightness = same donor, different processing stage
```

### Cell Lines (Pre-assigned)

```
Cell lines always get their assigned color:
┌─────────┬─────────┬─────────┬─────────┐
│ Jurkat  │  Nalm6  │  SKOV3  │   A549  │
│  RED    │  TEAL   │ PURPLE  │  CORAL  │
│#C44536  │#2A9D8F  │#9B59B6  │#E76F51  │
└─────────┴─────────┴─────────┴─────────┘
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing donors get different colors | Medium | Low | Same seed (12345) preserves hash distribution. Some shift expected due to palette size (96→72). |
| Cell line detection false positives | Low | Low | Use exact match first, then contains. Cell line names are distinctive. |
| Performance regression | Very Low | Low | One additional check before existing logic. Cache still works. |
| Text readability issues | Very Low | Medium | `getOptimalTextColor()` handles this automatically. |

---

## References

- Color system: `client/src/domains/tubes/utils/colorSystem.ts`
- LAB utilities: `client/src/shared/utils/labColorSpace.ts`
- Type definitions: `client/src/domains/tubes/types/colorSystemTypes.ts`
- Grid CSS: `client/src/domains/tubes/ui/components/grid/colorIndicators.css`
- Grid component: `client/src/domains/tubes/ui/components/grid/GridPosition.tsx`
