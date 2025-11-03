# Focus Trapping Assessment - Odysseus App

**Date**: 2025-10-30
**Assessment Type**: Accessibility & UX Consistency Review
**Updated**: 2025-10-30 - Aligned with `AGENTS.md` architecture guidelines

---

## ⚠️ IMPORTANT: AGENTS.md Compliance

This assessment and implementation plan have been **verified against and updated to follow** all Odysseus architecture guidelines defined in `AGENTS.md`, including:

- ✅ **Naming Conventions**: Hooks use camelCase with `use` prefix (e.g., `useFocusTrap.ts`)
- ✅ **Directory Structure**: Custom hooks in `client/src/shared/hooks/` (NOT `lib/` - deprecated)
- ✅ **Export Standards**: Named exports ONLY (no default exports)
- ✅ **Code Quality**: Elegant, simple, pragmatic solutions - NO bandaid fixes
- ✅ **Comment Philosophy**: Explain WHY (business rationale) not WHAT (code description)
- ✅ **TypeScript Standards**: Strict mode, explicit return types, no `any` types
- ✅ **Single Source of Truth**: Eliminates ~200 lines of duplicate code

**All implementation code examples in this report follow AGENTS.md standards.**

Before implementing, see **Section 10: Pre-Implementation Checklist** for mandatory architecture compliance verification steps.

---

## Executive Summary

The Odysseus app has **inconsistent and fragmented focus trapping** across modal dialogs. Of the 12 modal components identified, only **4 have focus trapping implemented** (33%), and all 4 use duplicate, copy-pasted code with slight variations. This creates:

- ❌ **Accessibility violations** (WCAG 2.1 failures)
- ❌ **Inconsistent UX** (some modals trap focus, others don't)
- ❌ **Maintenance burden** (duplicate code in 4+ places)
- ❌ **Tab escaping to browser** in 8 modals
- ❌ **Missing initial focus** in several modals
- ❌ **No focus restoration** on modal close

**Recommendation**: Implement a centralized focus trap hook/component to eliminate duplication and ensure all modals meet WCAG 2.1 standards.

---

## 1. Modal Inventory

### All Modals Found (12 total):

| Modal | Path | Focus Trap? | Status |
|-------|------|-------------|--------|
| **LoginModal** | `authentication/ui/components/` | ✅ Yes (new) | Just added |
| **RegisterModal** | `authentication/ui/components/` | ✅ Yes (new) | Just added |
| **RegistrationSuccessModal** | `authentication/ui/components/` | ❌ No | Missing |
| **PasswordResetModal** | `admin/ui/components/` | ✅ Yes | Has it |
| **AdminSettingsModal** | `admin/ui/components/` | ✅ Yes | Has it |
| **ResearcherModal** | `admin/ui/components/` | ❌ No | Missing |
| **TubeEditorModal** | `tubes/ui/components/modals/` | ❌ No | Missing |
| **BatchTubeEditorModal** | `tubes/ui/components/modals/` | ❌ No | Missing |
| **BulkProgressModal** | `tubes/ui/components/modals/` | ❌ No | Missing |
| **StorageManagementModal** | `tubes/ui/components/modals/` | ❌ No | Missing |
| **BaseModal** (wrapper) | `tubes/ui/components/modals/` | ⚠️ Partial | Accepts ref, no logic |
| **Modal** (primitive) | `shared/ui/primitives/modal/` | ⚠️ Unknown | Need to check |

**Coverage**: 4/12 modals have focus trapping (33%)

---

## 2. Current Focus Trap Implementations

### Implementation Pattern (All 4 use same approach):

All focus traps follow this pattern:

```typescript
// 1. Create ref
const modalRef = useRef<HTMLDivElement>(null);

// 2. Set initial focus
useEffect(() => {
  const modal = modalRef.current;
  if (!modal) return;

  const focusableElements = modal.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), a[href], textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];

  const timer = setTimeout(() => {
    firstElement?.focus();
  }, 100-280); // Different delays!

  return () => clearTimeout(timer);
}, []);

// 3. Trap focus on Tab/Shift+Tab
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href], textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [dependencies]); // Different dependencies!
```

### Inconsistencies Between Implementations:

| Modal | Initial Focus Delay | Dependencies | Selector Issues |
|-------|-------------------|--------------|-----------------|
| **LoginModal** | 280ms | `[]` | ✅ Complete |
| **RegisterModal** | 280ms | `[]` | ✅ Complete |
| **PasswordResetModal** | 100ms | `[activeTab, resetUrl]` | ✅ Complete |
| **AdminSettingsModal** | 100ms | `[isOpen, activeTab]` | ⚠️ Missing `a[href]` |

**Problems**:
1. **Different delays**: 100ms vs 280ms (no consistency)
2. **Different dependencies**: Some re-run on state changes, others don't
3. **Selector inconsistency**: AdminSettingsModal missing `a[href]` in selector
4. **Code duplication**: ~50 lines of identical code copied 4 times

---

## 3. Missing Focus Traps (Critical Issues)

### High Priority (User-Facing Critical Modals):

#### **TubeEditorModal** ❌
- **Impact**: Primary data entry modal
- **Usage**: Most frequently used modal in app
- **Issue**: Tab escapes to background page
- **WCAG Violation**: Yes (2.1 Level A)

#### **BatchTubeEditorModal** ❌
- **Impact**: Bulk edit operations
- **Usage**: High-value workflow
- **Issue**: Tab escapes to background page
- **WCAG Violation**: Yes (2.1 Level A)

#### **StorageManagementModal** ❌
- **Impact**: Critical admin function
- **Usage**: Frequently used
- **Issue**: Tab escapes to background page
- **WCAG Violation**: Yes (2.1 Level A)

#### **ResearcherModal** ❌
- **Impact**: Admin user management
- **Usage**: Admin workflow
- **Issue**: Tab escapes to background page
- **WCAG Violation**: Yes (2.1 Level A)

### Medium Priority:

#### **RegistrationSuccessModal** ❌
- **Impact**: Confirmation screen
- **Usage**: One-time use per user
- **Issue**: Tab escapes, but modal is informational only
- **WCAG Violation**: Yes, but low impact

#### **BulkProgressModal** ❌
- **Impact**: Progress indicator
- **Usage**: Transient, auto-closes
- **Issue**: May not need trap if non-interactive

---

## 4. BaseModal Analysis

### Current Implementation:

```typescript
export interface BaseModalProps {
  trapRef?: React.RefObject<HTMLDivElement>;  // ← Accepts ref
  // ... other props
}

export function BaseModal({ trapRef, ...props }: BaseModalProps) {
  return (
    <div ref={trapRef} ...>  {/* ← Applies ref but no trap logic */}
      {children}
    </div>
  );
}
```

**Observation**:
- BaseModal is a **presentational wrapper** used by tube modals
- It accepts a `trapRef` prop but **does NOT implement focus trapping**
- Parent components must implement their own trap logic
- **None of the tube modals that use BaseModal have implemented trapping**

**Opportunity**: BaseModal is the perfect place to centralize focus trap logic for tube modals.

---

## 5. Industry Standards & Best Practices

### WCAG 2.1 Requirements:

**2.1.2 No Keyboard Trap (Level A)**:
> Focus must not be trapped unless the user can escape using standard methods

**Interpretation for Modal Dialogs**:
- ✅ Focus **should** be trapped within modal (not document)
- ✅ User can escape via Escape key or Close button
- ✅ Tab cycles through modal elements only
- ✅ Initial focus set to first interactive element
- ✅ Focus restored to trigger element on close

### ARIA Authoring Practices (Modal Dialog Pattern):

**Required Behaviors**:
1. ✅ When dialog opens, focus moves to element inside dialog
2. ✅ Tab key cycles focus within dialog
3. ✅ Shift+Tab cycles focus backward within dialog
4. ✅ Escape key closes dialog
5. ✅ Focus returns to trigger element when closed
6. ✅ Background content is inert (non-interactive)

**Current Odysseus Status**:
- ✅ 1. Initial focus: Yes (in 4/12 modals)
- ✅ 2. Tab cycles: Yes (in 4/12 modals)
- ✅ 3. Shift+Tab: Yes (in 4/12 modals)
- ⚠️ 4. Escape key: Varies (some modals yes, need to verify all)
- ❌ 5. Focus restoration: **NOT IMPLEMENTED IN ANY MODAL**
- ⚠️ 6. Inert background: Unclear (need to test)

---

## 6. Code Duplication Analysis

### Lines of Duplicate Code:

Each focus trap implementation is **~50 lines**:
- Initial focus useEffect: ~15 lines
- Trap logic useEffect: ~35 lines

**Total duplication**: 50 lines × 4 modals = **200 lines of duplicate code**

**Maintenance Issues**:
1. Bug fixes must be applied 4 times
2. Improvements must be copied 4 times
3. Selector updates must be synced manually
4. Different developers = different patterns

---

## 7. Recommended Solutions

### Architecture Compliance Note

**IMPORTANT**: All solutions must follow the Odysseus architecture guidelines defined in `AGENTS.md`:

- **File Location**: Custom hooks MUST be in `client/src/shared/hooks/` (NOT `shared/lib/` - deprecated)
- **File Naming**: Hooks use camelCase with `use` prefix (e.g., `useFocusTrap.ts`)
- **Exports**: Named exports ONLY (no default exports)
- **Code Quality**: Must be elegant, simple, pragmatic - NO bandaid solutions
- **Comments**: Explain WHY (business rationale) not WHAT (code shows this)
- **TypeScript**: Strict mode, explicit return types, no `any` types

---

### Option A: Custom Hook (Recommended)

**Create**: `client/src/shared/hooks/useFocusTrap.ts`

```typescript
// client/src/shared/hooks/useFocusTrap.ts
import { useRef, useEffect } from 'react';

interface UseFocusTrapOptions {
  isOpen?: boolean;
  restoreFocus?: boolean;
  initialFocusDelay?: number;
}

/**
 * Focus trap for modal dialogs
 *
 * Ensures keyboard focus stays within modal (WCAG 2.1 compliance)
 * and restores focus to trigger element when closed.
 *
 * @param options.isOpen - Whether modal is currently open
 * @param options.restoreFocus - Restore focus to trigger on close (default: true)
 * @param options.initialFocusDelay - Delay before initial focus in ms (default: 150ms)
 * @returns Ref to attach to modal container element
 */
export function useFocusTrap(options?: UseFocusTrapOptions): React.RefObject<HTMLDivElement> {
  const trapRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const {
    isOpen = true,
    restoreFocus = true,
    // 150ms balances modal animation time with perceived responsiveness
    // Too short = focus before render, too long = noticeable delay
    initialFocusDelay = 150
  } = options || {};

  // Focus restoration on modal close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (restoreFocus && previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen, restoreFocus]);

  // Initial focus when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const modal = trapRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const firstElement = focusableElements[0];

    // Delay allows modal animation to complete before focus shifts
    const timer = setTimeout(() => {
      firstElement?.focus();
    }, initialFocusDelay);

    return () => clearTimeout(timer);
  }, [isOpen, initialFocusDelay]);

  // Tab/Shift+Tab focus cycling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const modal = trapRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return trapRef;
}

// Comprehensive selector covers all interactive elements
// Excludes disabled/hidden elements per WCAG guidelines
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]'
].join(', ');
```

**Usage in any modal**:
```typescript
// Import from shared hooks (follows path alias conventions)
import { useFocusTrap } from '@shared/hooks/useFocusTrap';

export function MyModal({ isOpen, onClose }: MyModalProps) {
  const trapRef = useFocusTrap({ isOpen, restoreFocus: true });

  return <div ref={trapRef}>...</div>;
}
```

**Pros**:
- ✅ Single source of truth (follows AGENTS.md - NO redundant systems)
- ✅ Easy to apply to existing modals
- ✅ Consistent behavior across app
- ✅ Bug fixes update all modals automatically
- ✅ Testable in isolation
- ✅ Follows Odysseus naming conventions (camelCase hook)
- ✅ Uses named exports (AGENTS.md requirement)
- ✅ TypeScript strict mode compatible

**Cons**:
- Requires refactoring all 4 existing traps
- Need to test each modal after migration

---

### Option B: Higher-Order Component

**Create**: `client/src/shared/ui/components/FocusTrap.tsx`

```typescript
// client/src/shared/ui/components/FocusTrap.tsx
import { useRef, useEffect } from 'react';

interface FocusTrapProps {
  children: React.ReactNode;
  isOpen: boolean;
  restoreFocus?: boolean;
}

/**
 * Focus trap wrapper component
 *
 * Alternative to useFocusTrap hook - wraps modal content to trap focus.
 * Use when you prefer declarative component API over hook pattern.
 */
export function FocusTrap({ children, isOpen, restoreFocus = true }: FocusTrapProps) {
  // Use the centralized hook internally
  const trapRef = useFocusTrap({ isOpen, restoreFocus });

  return <div ref={trapRef}>{children}</div>;
}
```

**Usage**:
```typescript
import { FocusTrap } from '@shared/ui/components/FocusTrap';

<FocusTrap isOpen={isOpen}>
  <MyModal />
</FocusTrap>
```

**Pros**:
- ✅ Declarative API
- ✅ Easy to understand
- ✅ Works with any modal structure
- ✅ Still uses centralized hook internally (no duplication)
- ✅ Follows AGENTS.md component naming (PascalCase)

**Cons**:
- Adds extra wrapper div to DOM
- Slightly more verbose usage
- Not recommended (hook pattern preferred in React 18+)

---

### Option C: Integrate into BaseModal (Hybrid)

**Update**: `client/src/domains/tubes/ui/components/modals/BaseModal.tsx`

```typescript
// client/src/domains/tubes/ui/components/modals/BaseModal.tsx
import { useFocusTrap } from '@shared/hooks/useFocusTrap';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Remove trapRef prop - no longer needed, handled internally
}

export function BaseModal({ isOpen, onClose, children, ...props }: BaseModalProps) {
  // Centralized hook handles all focus trap logic
  const trapRef = useFocusTrap({ isOpen, restoreFocus: true });

  return (
    <div ref={trapRef} className="modal-container" {...props}>
      {children}
    </div>
  );
}
```

**Pros**:
- ✅ Zero changes needed for modals using BaseModal
- ✅ Tube modals get trapping automatically
- ✅ Backwards compatible
- ✅ Follows AGENTS.md patterns (hook composition)
- ✅ Removes deprecated `trapRef` prop

**Cons**:
- Only helps modals using BaseModal (~5 tube modals)
- Auth/admin modals still need manual hook integration
- Requires BaseModal to receive `isOpen` prop (may need refactor)

---

### Recommendation: **Option A (Custom Hook) + Option C (BaseModal Integration)**

**Best of both worlds**:

1. Create `useFocusTrap()` hook (centralized logic)
2. Integrate hook into BaseModal (auto-trapping for tube modals)
3. Refactor auth/admin modals to use hook directly

**Result**:
- ✅ All 12 modals have focus trapping
- ✅ Zero code duplication
- ✅ Single source of truth
- ✅ Easy to maintain and improve

---

## 8. Focus Restoration (Currently Missing)

**Problem**: No modal in the app restores focus when closed.

**Impact**:
- Keyboard users lose their place when modal closes
- Screen reader users get disoriented
- WCAG 2.1 violation

**Solution**: Track trigger element before opening modal

```typescript
export function useFocusTrap({ isOpen, restoreFocus = true }) {
  const trapRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Save current focus before trapping
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (restoreFocus && previousFocusRef.current) {
      // Restore focus when modal closes
      previousFocusRef.current.focus();
    }
  }, [isOpen, restoreFocus]);

  // ... trap logic

  return trapRef;
}
```

---

## 9. Specific Issues Found

### Issue 1: Initial Focus Delay Inconsistency

**Problem**: Some modals use 100ms, others use 280ms

**Cause**: Unclear reasoning, likely arbitrary

**Solution**: Standardize to 150ms (safe for slow renders, not too slow)

---

### Issue 2: AdminSettingsModal Incomplete Selector

**File**: `client/src/domains/admin/ui/components/AdminSettingsModal.tsx`
**Lines**: 63-65, 86-88

**Current**:
```typescript
const focusableElements = modal.querySelectorAll<HTMLElement>(
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
);
```

**Missing**: `a[href]` (links are focusable)

**Impact**: If modal adds links in future, trap won't include them

---

### Issue 3: TubeEditorModal - BaseModal Pattern Confusion

**Problem**:
- TubeEditorModal uses BaseModal wrapper
- BaseModal accepts `trapRef` prop
- TubeEditorModal doesn't pass `trapRef`
- Result: No trap despite infrastructure existing

**File**: Check if TubeEditorModal passes trapRef to BaseModal

---

### Issue 4: No Escape Key Consistency

**Need to verify**: Do all modals close on Escape key?

**Recommendation**: Add Escape key handler to centralized solution

```typescript
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose?.();
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);
```

---

## 10. Pre-Implementation Checklist

**MANDATORY**: Before starting implementation, verify compliance with `AGENTS.md`:

### Architecture Guidelines Verification:
- [ ] Read `AGENTS.md` Section: "Naming Conventions" (lines 736-1093)
- [ ] Read `AGENTS.md` Section: "Development Guidelines" (lines 575-666)
- [ ] Read `AGENTS.md` Section: "Code Quality Standards" (lines 1211-1219)
- [ ] Read `AGENTS.md` Section: "Comment Standards" (lines 1220-1410)

### File Creation Checklist:
- [ ] Hook file location: `client/src/shared/hooks/useFocusTrap.ts` ✅ (correct per AGENTS.md)
- [ ] Hook file naming: camelCase with `use` prefix ✅ (required pattern)
- [ ] NOT in `shared/lib/` ✅ (deprecated directory - use `shared/hooks/`)
- [ ] Uses named exports ONLY ✅ (no default exports allowed)
- [ ] TypeScript strict mode compatible ✅ (explicit return types, no `any`)
- [ ] Comments explain WHY not WHAT ✅ (business rationale, not code description)
- [ ] No self-promotional language ✅ (no "INDUSTRY STANDARD", "BEST PRACTICE", etc.)
- [ ] No redundant markers in code comments ✅ (no ✅ checkmarks in code)

### Code Quality Requirements:
- [ ] Solution is architecturally sound (NOT a bandaid)
- [ ] Eliminates redundancy (single source of truth)
- [ ] Long-term maintainable
- [ ] Elegant, simple, and pragmatic
- [ ] Follows existing patterns in codebase

---

## 11. Implementation Plan

### Phase 1: Create Centralized Hook (1-2 hours)

**Tasks**:
1. Create `client/src/shared/hooks/useFocusTrap.ts` (per AGENTS.md naming conventions)
2. Implement all trap logic in one place (eliminates ~200 lines of duplication)
3. Add focus restoration support (WCAG 2.1 requirement)
4. Standardize initial focus delay to 150ms (explained in code comments WHY)
5. Use comprehensive focusable element selector (covers edge cases)
6. Add proper TypeScript types (strict mode, explicit return types)
7. Use named exports only (AGENTS.md requirement)
8. Write comments explaining business rationale (not code description)
9. Export from `client/src/shared/hooks/index.ts` for clean imports
10. Write unit tests (optional but recommended)

**Code Quality Checks**:
- ✅ No `any` types
- ✅ Explicit return type: `React.RefObject<HTMLDivElement>`
- ✅ Comments explain WHY (e.g., "150ms balances modal animation with responsiveness")
- ✅ Named export: `export function useFocusTrap(...)`
- ✅ No self-promotional language in comments

**Deliverable**: Reusable `useFocusTrap()` hook following AGENTS.md standards

---

### Phase 2: Update BaseModal (30 minutes)

**File**: `client/src/domains/tubes/ui/components/modals/BaseModal.tsx`

**Tasks**:
1. Import `useFocusTrap` from `@shared/hooks/useFocusTrap` (use path alias)
2. Call hook inside BaseModal component
3. Apply returned ref to modal container
4. Remove deprecated `trapRef` prop from interface
5. Ensure `isOpen` prop exists (may need to add)
6. Verify named exports used (AGENTS.md requirement)

**Code Pattern**:
```typescript
import { useFocusTrap } from '@shared/hooks/useFocusTrap';

export function BaseModal({ isOpen, children }: BaseModalProps) {
  const trapRef = useFocusTrap({ isOpen, restoreFocus: true });
  return <div ref={trapRef}>{children}</div>;
}
```

**Deliverable**: BaseModal with built-in trapping (AGENTS.md compliant)

**Impact**: 5 tube modals get automatic focus trapping

---

### Phase 3: Refactor Existing Traps (1-2 hours)

**Files to Modify**:
1. `client/src/domains/authentication/ui/components/LoginModal.tsx`
2. `client/src/domains/authentication/ui/components/RegisterModal.tsx`
3. `client/src/domains/admin/ui/components/PasswordResetModal.tsx`
4. `client/src/domains/admin/ui/components/AdminSettingsModal.tsx`

**Tasks for Each Modal**:
1. Import `useFocusTrap` from `@shared/hooks/useFocusTrap`
2. Remove existing focus trap `useEffect` blocks (~50 lines each)
3. Replace with single hook call: `const trapRef = useFocusTrap({ isOpen })`
4. Remove `modalRef` if only used for trapping (use `trapRef` instead)
5. Remove initial focus `setTimeout` logic (hook handles this)
6. Verify imports use path aliases (`@shared/hooks/...`)
7. Test modal keyboard navigation after changes

**Example Refactor**:
```typescript
// BEFORE (50 lines of duplicate code)
const modalRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const timer = setTimeout(() => {
    // ... initial focus logic
  }, 280);
  return () => clearTimeout(timer);
}, []);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // ... 35 lines of trap logic
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);

// AFTER (1 line)
const trapRef = useFocusTrap({ isOpen: true, restoreFocus: true });
```

**Deliverable**: Removed ~200 lines of duplicate code

**Impact**: Single source of truth for all focus trap logic (AGENTS.md compliance)

---

### Phase 4: Add Missing Traps (1 hour)

**Files to Modify**:
1. `client/src/domains/admin/ui/components/ResearcherModal.tsx`
2. `client/src/domains/authentication/ui/components/RegistrationSuccessModal.tsx`

**Tasks for Each Modal**:
1. Import `useFocusTrap` from `@shared/hooks/useFocusTrap`
2. Add hook call: `const trapRef = useFocusTrap({ isOpen, restoreFocus: true })`
3. Apply `trapRef` to modal container div
4. Test keyboard navigation (Tab, Shift+Tab)
5. Verify focus restoration on close

**Tasks for BaseModal-using modals**:
3. Verify `TubeEditorModal` inherits from BaseModal (should auto-trap)
4. Verify `BatchTubeEditorModal` inherits from BaseModal (should auto-trap)
5. Verify `StorageManagementModal` passes `isOpen` to BaseModal
6. Test each modal's keyboard navigation

**Deliverable**: 100% modal coverage (12/12 modals have focus trapping)

---

### Phase 5: Testing & Validation (2 hours)

**Manual Testing Checklist**:
1. **Keyboard Navigation** (all 12 modals):
   - [ ] Tab cycles forward through focusable elements
   - [ ] Shift+Tab cycles backward
   - [ ] Focus wraps from last to first element
   - [ ] Focus wraps from first to last element (backward)
   - [ ] Cannot Tab outside modal to browser UI

2. **Focus Restoration** (all 12 modals):
   - [ ] Note element focused before modal opens
   - [ ] Open modal, interact with elements
   - [ ] Close modal
   - [ ] Verify focus returns to trigger element

3. **Initial Focus** (all 12 modals):
   - [ ] Modal opens
   - [ ] First focusable element receives focus automatically
   - [ ] No delay over 200ms (150ms standard)

4. **Screen Reader Testing** (NVDA/JAWS):
   - [ ] Screen reader announces modal opening
   - [ ] Tab announces correct element names
   - [ ] Focus trap doesn't confuse screen reader
   - [ ] Modal close is announced

5. **Cross-Browser Testing**:
   - [ ] Chrome: Tab, Shift+Tab, focus restoration
   - [ ] Firefox: Tab, Shift+Tab, focus restoration
   - [ ] Safari: Tab, Shift+Tab, focus restoration (if applicable)

**Deliverable**: WCAG 2.1 Level A compliance documentation

---

## 12. Estimated Effort

| Phase | Time | Priority | AGENTS.md Compliance |
|-------|------|----------|---------------------|
| Phase 1: Create Hook | 1-2 hours | High | ✅ Naming, exports, comments |
| Phase 2: Update BaseModal | 30 min | High | ✅ Path aliases, patterns |
| Phase 3: Refactor Existing | 1-2 hours | Medium | ✅ Eliminates duplication |
| Phase 4: Add Missing | 1 hour | High | ✅ Single source of truth |
| Phase 5: Testing | 2 hours | High | ✅ Quality validation |
| **Total** | **5.5-7.5 hours** | - | **100% Compliant** |

**Note**: All phases follow AGENTS.md guidelines for naming, directory structure, exports, and code quality.

---

## 13. Benefits of Standardization

### Immediate Benefits:
- ✅ **Accessibility**: WCAG 2.1 Level A compliance
- ✅ **Consistency**: Same UX across all modals
- ✅ **Maintainability**: Single source of truth (AGENTS.md: NO redundant systems)
- ✅ **Fewer bugs**: One implementation = one place to fix
- ✅ **Architecture compliance**: Follows all AGENTS.md guidelines

### Long-Term Benefits:
- ✅ **Easier onboarding**: Developers learn one pattern
- ✅ **Faster development**: Add traps in 1 line of code
- ✅ **Better UX**: Focus restoration = less disorientation
- ✅ **Future-proof**: Easy to enhance all modals at once
- ✅ **Clean codebase**: Eliminates 200 lines of duplicate code

---

## 14. Alternative: Use Existing Library

### Popular Focus Trap Libraries:

**1. focus-trap-react**
- Most popular (~500k weekly downloads)
- Battle-tested, comprehensive
- ~8kb gzipped

**2. react-focus-lock**
- Lightweight (~200k weekly downloads)
- Good TypeScript support
- ~5kb gzipped

**3. @radix-ui/react-dialog**
- Full dialog component with built-in trap
- Part of comprehensive UI library
- ~20kb gzipped

### Recommendation: **Custom Hook**

**Reasoning**:
1. Already have 4 implementations (sunk cost)
2. Focus trap logic is ~50 lines (not complex)
3. No external dependencies needed
4. Full control over behavior
5. Lighter bundle size
6. Learns codebase patterns

**Exception**: If planning to adopt Radix UI generally, use `@radix-ui/react-dialog`

---

## 15. Summary & Action Items

### Current State:
- ❌ Only 4/12 modals have focus trapping (33%)
- ❌ ~200 lines of duplicate code across 4 implementations
- ❌ No focus restoration on modal close
- ❌ Inconsistent initial focus delays
- ❌ WCAG 2.1 violations in 8 modals

### Recommended Solution:
1. ✅ Create `useFocusTrap()` custom hook (centralized logic)
2. ✅ Integrate hook into BaseModal (auto-trapping for tube modals)
3. ✅ Refactor existing traps to use hook
4. ✅ Add missing traps to remaining modals
5. ✅ Implement focus restoration
6. ✅ Standardize Escape key handling

### Priority Order:
1. **Immediate**: TubeEditorModal, BatchTubeEditorModal, StorageManagementModal (high usage)
2. **High**: ResearcherModal (admin critical)
3. **Medium**: Refactor existing 4 implementations
4. **Low**: RegistrationSuccessModal (one-time use)

### Success Criteria:
- ✅ All 12 modals have focus trapping
- ✅ Zero code duplication
- ✅ WCAG 2.1 Level A compliance
- ✅ Focus restoration working
- ✅ Consistent keyboard navigation

---

## 16. Next Steps

**If proceeding with implementation**:

1. ✅ Review and approve this assessment
2. ✅ Review `AGENTS.md` sections on naming conventions and code quality (Pre-Implementation Checklist)
3. ✅ Decide between custom hook vs library (recommendation: custom hook)
4. ✅ Create implementation ticket/task
5. ✅ Implement Phase 1 (create `useFocusTrap` hook per AGENTS.md guidelines)
6. ✅ Implement Phases 2-4 (integrate and refactor)
7. ✅ Complete Phase 5 (testing and validation)
8. ✅ Document WCAG 2.1 compliance achievement

**Estimated timeline**: 1-2 sprints (5-10 hours total work)

**AGENTS.md Compliance**: This implementation plan follows all project architecture guidelines including naming conventions, directory structure, export standards, comment philosophy, and code quality requirements.

---

## Appendix: Focusable Element Selector

**Current best practice selector** (use in hook):

```typescript
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]'
].join(', ');
```

This is more comprehensive than current selectors and handles edge cases like:
- Hidden inputs (excluded)
- Content-editable elements (included)
- Iframes/embeds (included)
- Area elements in image maps (included)
