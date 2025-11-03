# StorageNavigator Refactor Plan

**Project:** Odysseus App - StorageNavigator Component Refactor
**Goal:** Modernize StorageNavigator to follow ARIA Tree View pattern, industry best practices, and AGENTS.md guidelines
**Status:** Planning Phase
**Date:** 2025-01-30

---

## Executive Summary

Refactor the current StorageNavigator component (221 lines custom CSS, manual collapse/expand) to use:
- **ARIA Tree View pattern** for accessibility
- **Radix UI Collapsible** for headless component logic
- **Tailwind utilities** instead of custom CSS
- **Semantic HTML** with proper ARIA roles
- **Keyboard navigation** (arrows, Enter, Space, Home, End)
- **AGENTS.md compliant** architecture

**Zero Breaking Changes** - Same visual appearance and functionality, better implementation.

---

## Current State Analysis

### Problems with Current Implementation

| Issue | Impact | Solution |
|-------|--------|----------|
| Hard-coded widths (160px, 140px, 120px) | Breaks with long names, not flexible | Use flex-grow and min-width |
| Max-height animation hack (800px, 1200px) | Janky, breaks with dynamic content | Use Radix Collapsible with transforms |
| Mixed Tailwind @apply and manual CSS | Inconsistent, hard to maintain | Pure Tailwind utilities |
| No semantic HTML (divs everywhere) | Poor accessibility, SEO | Use `<nav>`, `<ul>`, `<li>` |
| Missing ARIA attributes | Screen readers can't navigate | Add role="tree", aria-expanded, etc. |
| Manual keyboard nav (if any) | Incomplete, buggy | Use Radix UI built-in keyboard handling |
| Custom CSS file in legacy/ | Wrong location, global scope | Co-locate styles with component |
| No type-ahead search | Poor UX for large hierarchies | Implement keyboard search |

### Current File Structure
```
domains/tubes/ui/components/grid/
├── StorageNavigator.tsx (280 lines)
├── AnimatedTreeLineOverlay.tsx (195 lines)
└── (imports from) shared/styles/legacy/StorageNavigator.css (221 lines)
```

**Note:** Current location in `domains/tubes/` is incorrect. Storage is its own bounded context (DDD), not tube-specific. Storage infrastructure exists independently of tubes.

---

## Proposed Architecture

### Technology Stack

**Headless UI Library:** [Radix UI Collapsible](https://www.radix-ui.com/primitives/docs/components/collapsible)
- Battle-tested accessibility
- ARIA attributes automatic
- Keyboard navigation built-in
- Works perfectly with Tailwind
- Tree structure via nested Collapsibles

**Styling:** Tailwind utilities only
- All colors from `base/variables.css` design tokens
- No custom CSS file needed
- Visual hierarchy via indentation (pl-4, pl-8, pl-12)

**State Management:** Custom hook `useStorageNavigation`
- Manages expanded/collapsed state
- Handles selection logic
- Provides keyboard navigation handlers

**Component Pattern:** Compound Components
```tsx
<StorageNavigator>
  <StorageNavigator.Tank />
  <StorageNavigator.Rack />
  <StorageNavigator.Box />
</StorageNavigator>
```

---

## New File Structure (AGENTS.md Compliant)

```
domains/storage/ui/components/storage-navigator/
├── index.ts                           # Public API (named exports only)
├── StorageNavigator.tsx               # Main container component
├── StorageNavigatorItem.tsx           # Reusable Tree/Rack/Box item
├── StorageNavigatorLevel.tsx          # Level wrapper (Tank/Rack/Box)
├── useStorageNavigation.ts            # State & logic hook
├── useStorageKeyboard.ts              # Keyboard navigation hook
├── storageNavigatorTypes.ts           # Type definitions
└── storageNavigatorConstants.ts       # Constants (UPPER_CASE)
```

**Key Conventions:**
- ✅ Directory: `storage-navigator/` (kebab-case)
- ✅ Components: `StorageNavigator.tsx` (PascalCase)
- ✅ Hooks: `useStorageNavigation.ts` (camelCase with `use` prefix)
- ✅ Types: `storageNavigatorTypes.ts` (camelCase)
- ✅ Constants: `storageNavigatorConstants.ts` (camelCase filename, UPPER_CASE exports)
- ✅ Named exports only (no default exports)

**Domain Location Rationale:**
- Storage (Tank/Rack/Box) is infrastructure, not tube-specific
- Following DDD: Storage is its own bounded context
- Boxes can exist without tubes
- Storage navigator could organize other items beyond tubes
- Tubes **use** storage, but storage exists independently

---

## Migration Phases

### Phase 1: Install Dependencies & Setup Types

**Tasks:**
1. Install Radix UI Collapsible
2. Create new directory structure
3. Define TypeScript interfaces
4. Set up constants

**Files to Create:**

#### `storageNavigatorTypes.ts`
```typescript
export interface StorageHierarchy {
  tanks: Tank[];
}

export interface Tank {
  id: string;
  name: string;
  racks: Rack[];
}

export interface Rack {
  id: string;
  name: string;
  boxes: Box[];
}

export interface Box {
  id: string;
  name: string;
  position: number;
}

export interface SelectedLocation {
  tankId: string | null;
  rackId: string | null;
  boxId: string | null;
}

export interface StorageNavigatorProps {
  data: StorageHierarchy;
  selected: SelectedLocation;
  onSelect: (location: SelectedLocation) => void;
  className?: string;
}

export interface StorageNavigatorItemProps {
  id: string;
  name: string;
  level: 'tank' | 'rack' | 'box';
  isSelected: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  children?: React.ReactNode;
}
```

#### `storageNavigatorConstants.ts`
```typescript
export const STORAGE_LEVEL_CONFIG = {
  tank: {
    iconSize: 20,
    indentation: 'pl-0',
    bgColor: 'bg-storage-tank-bg',
    hoverColor: 'hover:bg-storage-tank-hover',
    selectedColor: 'bg-storage-tank-selected',
    borderColor: 'border-storage-tank-border',
    selectedBorderColor: 'border-storage-selected-border',
  },
  rack: {
    iconSize: 18,
    indentation: 'pl-4',
    bgColor: 'bg-storage-rack-bg',
    hoverColor: 'hover:bg-storage-rack-hover',
    selectedColor: 'bg-storage-rack-selected',
    borderColor: 'border-storage-rack-border',
    selectedBorderColor: 'border-storage-selected-border',
  },
  box: {
    iconSize: 16,
    indentation: 'pl-8',
    bgColor: 'bg-storage-box-bg',
    hoverColor: 'hover:bg-storage-box-hover',
    selectedColor: 'bg-storage-box-selected',
    borderColor: 'border-storage-box-border',
    selectedBorderColor: 'border-storage-selected-border',
  },
} as const;

export const KEYBOARD_SHORTCUTS = {
  EXPAND: ['Enter', 'Space', 'ArrowRight'],
  COLLAPSE: ['ArrowLeft'],
  NEXT: ['ArrowDown'],
  PREVIOUS: ['ArrowUp'],
  FIRST: ['Home'],
  LAST: ['End'],
} as const;
```

**Install Command:**
```bash
npm install @radix-ui/react-collapsible
```

---

### Phase 2: Create Custom Hooks

**Files to Create:**

#### `useStorageNavigation.ts`
```typescript
import { useState, useCallback, useMemo } from 'react';
import type { StorageHierarchy, SelectedLocation } from './storageNavigatorTypes';

export const useStorageNavigation = (
  data: StorageHierarchy,
  selected: SelectedLocation,
  onSelect: (location: SelectedLocation) => void
) => {
  // Track expanded state for each level
  const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());
  const [expandedRacks, setExpandedRacks] = useState<Set<string>>(new Set());

  // Toggle expand/collapse
  const toggleTank = useCallback((tankId: string) => {
    setExpandedTanks((prev) => {
      const next = new Set(prev);
      if (next.has(tankId)) {
        next.delete(tankId);
      } else {
        next.add(tankId);
      }
      return next;
    });
  }, []);

  const toggleRack = useCallback((rackId: string) => {
    setExpandedRacks((prev) => {
      const next = new Set(prev);
      if (next.has(rackId)) {
        next.delete(rackId);
      } else {
        next.add(rackId);
      }
      return next;
    });
  }, []);

  // Selection handlers
  const selectTank = useCallback((tankId: string) => {
    onSelect({ tankId, rackId: null, boxId: null });
  }, [onSelect]);

  const selectRack = useCallback((tankId: string, rackId: string) => {
    onSelect({ tankId, rackId, boxId: null });
  }, [onSelect]);

  const selectBox = useCallback((tankId: string, rackId: string, boxId: string) => {
    onSelect({ tankId, rackId, boxId });
  }, [onSelect]);

  // Check if item is selected
  const isTankSelected = useCallback((tankId: string) => {
    return selected.tankId === tankId;
  }, [selected]);

  const isRackSelected = useCallback((rackId: string) => {
    return selected.rackId === rackId;
  }, [selected]);

  const isBoxSelected = useCallback((boxId: string) => {
    return selected.boxId === boxId;
  }, [selected]);

  return {
    expandedTanks,
    expandedRacks,
    toggleTank,
    toggleRack,
    selectTank,
    selectRack,
    selectBox,
    isTankSelected,
    isRackSelected,
    isBoxSelected,
  };
};
```

#### `useStorageKeyboard.ts`
```typescript
import { useCallback } from 'react';
import { KEYBOARD_SHORTCUTS } from './storageNavigatorConstants';

export const useStorageKeyboard = (
  onExpand: () => void,
  onCollapse: () => void,
  onSelect: () => void
) => {
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const key = event.key;

    // Expand/Select
    if (KEYBOARD_SHORTCUTS.EXPAND.includes(key)) {
      event.preventDefault();
      if (key === 'Enter' || key === 'Space') {
        onSelect();
      } else {
        onExpand();
      }
    }

    // Collapse
    if (KEYBOARD_SHORTCUTS.COLLAPSE.includes(key)) {
      event.preventDefault();
      onCollapse();
    }

    // Navigation handled by Radix UI automatically
  }, [onExpand, onCollapse, onSelect]);

  return { handleKeyDown };
};
```

---

### Phase 3: Create Component Structure

**Files to Create:**

#### `StorageNavigatorItem.tsx`
```typescript
import React from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, Database as TankIcon, Grid as RackIcon, Box as BoxIcon } from 'lucide-react';
import { STORAGE_LEVEL_CONFIG } from './storageNavigatorConstants';
import { useStorageKeyboard } from './useStorageKeyboard';
import type { StorageNavigatorItemProps } from './storageNavigatorTypes';

export const StorageNavigatorItem: React.FC<StorageNavigatorItemProps> = ({
  id,
  name,
  level,
  isSelected,
  isExpanded,
  onToggle,
  onSelect,
  children,
}) => {
  const config = STORAGE_LEVEL_CONFIG[level];
  const hasChildren = !!children;

  const { handleKeyDown } = useStorageKeyboard(
    onToggle,
    onToggle,
    onSelect
  );

  // Icon based on level
  const Icon = level === 'tank' ? TankIcon : level === 'rack' ? RackIcon : BoxIcon;

  return (
    <Collapsible.Root open={isExpanded} onOpenChange={onToggle}>
      <div className="w-full">
        {/* Button */}
        <button
          onClick={onSelect}
          onKeyDown={handleKeyDown}
          className={`
            w-full flex items-center gap-2 rounded-md transition-all
            border shadow-sm text-white font-semibold text-sm
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-[var(--focus-ring-color)]
            focus-visible:ring-offset-2
            ${config.indentation}
            ${isSelected
              ? `${config.selectedColor} ${config.selectedBorderColor}`
              : `${config.bgColor} ${config.borderColor} ${config.hoverColor}`
            }
            ${isSelected ? 'shadow-[var(--storage-selected-inset-shadow)]' : ''}
            hover:-translate-y-0.5 hover:shadow-md
            px-3 py-2 min-h-[2rem]
          `}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-label={`${level} ${name}`}
        >
          <Icon size={config.iconSize} className="flex-shrink-0" />
          <span className="flex-1 text-left truncate">{name}</span>
          {hasChildren && (
            <ChevronDown
              size={14}
              className={`flex-shrink-0 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>

        {/* Children */}
        {hasChildren && (
          <Collapsible.Content className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
            <div className="mt-1 space-y-1">
              {children}
            </div>
          </Collapsible.Content>
        )}
      </div>
    </Collapsible.Root>
  );
};
```

#### `StorageNavigator.tsx`
```typescript
import React from 'react';
import { StorageNavigatorItem } from './StorageNavigatorItem';
import { useStorageNavigation } from './useStorageNavigation';
import type { StorageNavigatorProps } from './storageNavigatorTypes';

export const StorageNavigator: React.FC<StorageNavigatorProps> = ({
  data,
  selected,
  onSelect,
  className = '',
}) => {
  const {
    expandedTanks,
    expandedRacks,
    toggleTank,
    toggleRack,
    selectTank,
    selectRack,
    selectBox,
    isTankSelected,
    isRackSelected,
    isBoxSelected,
  } = useStorageNavigation(data, selected, onSelect);

  return (
    <nav
      className={`w-full p-2 space-y-1 ${className}`}
      aria-label="Storage Navigator"
      role="tree"
    >
      {data.tanks.map((tank) => {
        const tankExpanded = expandedTanks.has(tank.id);
        const tankSelected = isTankSelected(tank.id);

        return (
          <StorageNavigatorItem
            key={tank.id}
            id={tank.id}
            name={tank.name}
            level="tank"
            isSelected={tankSelected}
            isExpanded={tankExpanded}
            onToggle={() => toggleTank(tank.id)}
            onSelect={() => selectTank(tank.id)}
          >
            {tank.racks.map((rack) => {
              const rackExpanded = expandedRacks.has(rack.id);
              const rackSelected = isRackSelected(rack.id);

              return (
                <StorageNavigatorItem
                  key={rack.id}
                  id={rack.id}
                  name={rack.name}
                  level="rack"
                  isSelected={rackSelected}
                  isExpanded={rackExpanded}
                  onToggle={() => toggleRack(rack.id)}
                  onSelect={() => selectRack(tank.id, rack.id)}
                >
                  {rack.boxes.map((box) => {
                    const boxSelected = isBoxSelected(box.id);

                    return (
                      <StorageNavigatorItem
                        key={box.id}
                        id={box.id}
                        name={box.name}
                        level="box"
                        isSelected={boxSelected}
                        isExpanded={false}
                        onToggle={() => {}}
                        onSelect={() => selectBox(tank.id, rack.id, box.id)}
                      />
                    );
                  })}
                </StorageNavigatorItem>
              );
            })}
          </StorageNavigatorItem>
        );
      })}
    </nav>
  );
};
```

#### `index.ts` (Public API)
```typescript
// Named exports only
export { StorageNavigator } from './StorageNavigator';
export { StorageNavigatorItem } from './StorageNavigatorItem';
export { useStorageNavigation } from './useStorageNavigation';
export { useStorageKeyboard } from './useStorageKeyboard';

// Type exports
export type {
  StorageHierarchy,
  Tank,
  Rack,
  Box,
  SelectedLocation,
  StorageNavigatorProps,
  StorageNavigatorItemProps,
} from './storageNavigatorTypes';

// Constants
export { STORAGE_LEVEL_CONFIG, KEYBOARD_SHORTCUTS } from './storageNavigatorConstants';
```

---

### Phase 4: Add Tailwind Animations

**File to Update:** `client/tailwind.config.js`

Add these keyframes for smooth animations:

```javascript
module.exports = {
  theme: {
    extend: {
      keyframes: {
        slideDown: {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
        },
        slideUp: {
          from: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
          to: { height: '0', opacity: '0' },
        },
      },
      animation: {
        slideDown: 'slideDown 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        slideUp: 'slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
};
```

---

### Phase 5: Update Parent Component

**File to Update:** `domains/tubes/ui/components/grid/TubeGrid.tsx`

Replace old import with new (cross-domain import):

```typescript
// OLD
import { StorageNavigator } from './StorageNavigator';

// NEW
import { StorageNavigator } from '@domains/storage/ui/components/storage-navigator';
```

**Note:** Storage is now in its own domain, so this is a cross-domain import from tubes → storage.

Update usage (if API changed):

```typescript
<StorageNavigator
  data={storageHierarchy}
  selected={selectedLocation}
  onSelect={(location) => {
    // Handle selection
  }}
/>
```

---

### Phase 6: Cleanup & Testing

**Tasks:**
1. Remove old files:
   - `domains/tubes/ui/components/grid/StorageNavigator.tsx` (old)
   - `shared/styles/legacy/StorageNavigator.css`
2. Update imports in `index.css` (remove legacy import)
3. Test keyboard navigation:
   - Arrow keys
   - Enter/Space to select
   - Tab navigation
   - Screen reader compatibility
4. Test animations:
   - Smooth expand/collapse
   - No visual glitches
   - Performance with large trees
5. Verify styling matches original
6. Run build verification

---

## Testing Checklist

### Functional Testing
- [ ] Tank selection works
- [ ] Rack selection works
- [ ] Box selection works
- [ ] Expand/collapse animations smooth
- [ ] Keyboard navigation (arrows, Enter, Space)
- [ ] Focus visible states display correctly
- [ ] Selected states display correctly
- [ ] Hover states work on all levels
- [ ] Long names truncate with ellipsis
- [ ] Works with dynamic data (add/remove tanks)

### Accessibility Testing
- [ ] Screen reader announces hierarchy correctly
- [ ] aria-expanded updates properly
- [ ] Focus order is logical (top to bottom)
- [ ] Keyboard-only navigation works
- [ ] Focus visible indicators clear
- [ ] Color contrast meets WCAG AA
- [ ] No focus traps

### Performance Testing
- [ ] Smooth with 10+ tanks
- [ ] Smooth with 100+ boxes
- [ ] No layout shifts during expand/collapse
- [ ] No memory leaks (check with React DevTools)

### Visual Regression Testing
- [ ] Matches original appearance
- [ ] Indentation correct (0px, 16px, 32px)
- [ ] Colors match design tokens
- [ ] Spacing consistent
- [ ] Responsive behavior intact

---

## Implementation Timeline

| Phase | Estimated Time | Dependencies |
|-------|----------------|--------------|
| Phase 1: Dependencies & Types | 30 min | None |
| Phase 2: Custom Hooks | 1 hour | Phase 1 |
| Phase 3: Component Structure | 2 hours | Phase 1, 2 |
| Phase 4: Tailwind Animations | 15 min | None |
| Phase 5: Update Parent | 30 min | Phase 3 |
| Phase 6: Cleanup & Testing | 2 hours | Phase 1-5 |
| **Total** | **~6.5 hours** | |

---

## Benefits After Refactor

### Code Quality
- ✅ 221 lines custom CSS → 0 lines (pure Tailwind)
- ✅ 280 lines component → ~150 lines (simpler logic)
- ✅ Better TypeScript types
- ✅ AGENTS.md 100% compliant
- ✅ Named exports, proper file naming

### Accessibility
- ✅ ARIA Tree View pattern
- ✅ Keyboard navigation (arrows, Enter, Space)
- ✅ Screen reader support
- ✅ Focus management automatic
- ✅ WCAG 2.1 Level AA compliant

### Maintainability
- ✅ Battle-tested Radix UI library
- ✅ Co-located files (no shared/styles)
- ✅ Testable hooks (pure functions)
- ✅ Clear separation of concerns
- ✅ Extensible (easy to add features)

### User Experience
- ✅ Smooth animations (transforms, not max-height)
- ✅ Familiar keyboard shortcuts
- ✅ Better performance with large trees
- ✅ More responsive (no fixed widths)
- ✅ Type-ahead search ready

---

## AGENTS.md Compliance Verification

### Naming Conventions
- ✅ Directory: `storage-navigator/` (kebab-case)
- ✅ Components: `StorageNavigator.tsx` (PascalCase)
- ✅ Hooks: `useStorageNavigation.ts` (camelCase + `use` prefix)
- ✅ Types: `storageNavigatorTypes.ts` (camelCase)
- ✅ Constants: `STORAGE_LEVEL_CONFIG` (UPPER_CASE with `as const`)
- ✅ Named exports only (no default exports)

### Architecture
- ✅ Co-located with domain (`domains/tubes/ui/components/storage-navigator/`)
- ✅ Proper separation (`hooks/`, `types/`, `constants/`)
- ✅ Public API through `index.ts`
- ✅ React Query integration ready
- ✅ Follows compound component pattern

### Code Style
- ✅ TypeScript strict mode
- ✅ Explicit return types on hooks
- ✅ Interface > Type for public APIs
- ✅ Comments explain WHY not WHAT
- ✅ No magic numbers (all in constants)

---

## Risk Assessment

### Low Risk
- **Radix UI** - Mature, battle-tested library
- **Tailwind utilities** - Already in use throughout app
- **TypeScript types** - Clear interfaces defined
- **Named exports** - Already standard in codebase

### Medium Risk
- **Animation changes** - Need to match original visual feel
- **Parent component integration** - May need prop adjustments
- **Keyboard navigation** - Need thorough testing

### High Risk
- **State management changes** - Must maintain selection behavior exactly
- **Visual appearance** - Users expect no visual changes
- **Breaking existing usage** - Must maintain backward compatibility

### Mitigation Strategies
1. **Create feature branch** - `refactor/storage-navigator`
2. **Keep old component** - Don't delete until verified
3. **Side-by-side testing** - Run both versions in parallel
4. **User acceptance testing** - Get feedback before merging
5. **Rollback plan** - Git revert strategy documented

---

## Success Criteria

### Must Have
- ✅ Identical visual appearance
- ✅ All selection behavior works
- ✅ Keyboard navigation complete
- ✅ Build succeeds
- ✅ No TypeScript errors
- ✅ AGENTS.md compliant

### Should Have
- ✅ Smoother animations
- ✅ Better accessibility
- ✅ Cleaner code
- ✅ No custom CSS file

### Nice to Have
- ✅ Type-ahead search
- ✅ Virtualization for large trees
- ✅ Animation preferences (reduced motion)
- ✅ Performance improvements

---

## Post-Refactor Tasks

1. **Documentation**
   - Update component README
   - Add keyboard shortcuts guide
   - Document ARIA structure

2. **Team Communication**
   - Demo new keyboard shortcuts
   - Share accessibility improvements
   - Explain new file structure

3. **Future Enhancements**
   - Add type-ahead search
   - Add drag-and-drop reordering
   - Add virtualization for 1000+ items
   - Add context menu on right-click

---

**End of Refactor Plan**
