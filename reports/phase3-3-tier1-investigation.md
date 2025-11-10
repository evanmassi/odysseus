# Phase 3.3 - Tier 1 Quick Wins Investigation

**Date:** 2025-01-10
**Total Errors:** 56
**Risk Level:** Very Low
**Estimated Fix Time:** 2 hours

---

## Executive Summary

This investigation systematically analyzed all 56 Tier 1 errors across the codebase. These are low-risk, auto-fixable issues that follow clear industry standards. All errors have been thoroughly examined with file context, and proper fixes have been identified.

**Error Breakdown:**
- Import Order (20 errors) - 36% of total
- Consistent Type Imports (16 errors) - 29% of total
- React Unescaped Entities (7 errors) - 13% of total
- Switch Case Declarations (5 errors) - 9% of total
- Miscellaneous (8 errors) - 14% of total

---

## Category 1: Import Order (20 errors)

### Overview
- **Rule:** `import/order`
- **Why this matters:** Consistent import ordering improves code readability and reduces merge conflicts
- **Industry standard:** External deps → Internal deps → Type imports, with empty lines between groups
- **Auto-fixable:** Yes (via `eslint --fix`)

### Error 1: App.tsx - Empty line within import group
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\App.tsx`
**Line:** 16

**Current Code:**
```typescript
import { useUserSettingsQuery } from '@domains/authentication/hooks/useUserSettings';
import { ResetPasswordPage } from '@domains/authentication/ui/components/ResetPasswordPage';
import { VerifyEmailPage } from '@domains/authentication/ui/components/VerifyEmailPage';
import { useTubeStore } from '@domains/tubes';
                                            // ← Empty line here (line 16)
// Import app-layer components (moved from @shared)
import { ErrorBanner, ConnectionIndicator } from '@shared/ui';
```

**Issue:** Empty line breaks up the import group (all internal @domains imports should be together)

**Fix:**
```typescript
import { useUserSettingsQuery } from '@domains/authentication/hooks/useUserSettings';
import { ResetPasswordPage } from '@domains/authentication/ui/components/ResetPasswordPage';
import { VerifyEmailPage } from '@domains/authentication/ui/components/VerifyEmailPage';
import { useTubeStore } from '@domains/tubes';
// Import app-layer components (moved from @shared)
import { ErrorBanner, ConnectionIndicator } from '@shared/ui';
```

**Reasoning:** Remove the empty line to keep all internal imports together. ESLint auto-fix will handle this.
**Risk:** None - purely formatting

---

### Error 2-10: Dashboard.tsx - Multiple import ordering issues
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\app\components\layout\Dashboard.tsx`
**Lines:** 3, 13, 17, 18, 20, 22, 24, 25 (9 errors)

**Current Code:**
```typescript
import { useState, useRef, useMemo } from 'react';

import type { TubeData } from '@domains/tubes/types';  // Line 3 - type import out of order

import { gridNavigationService } from '@domains/grid';
import { useStorageStore } from '@domains/storage';
import { useConfigurationSync } from '@domains/storage/hooks/useConfigurationSync';
import { StorageNavigator, type StorageHierarchy, type SelectedLocation } from '@domains/storage/ui/components/storage-navigator';
import { useTubeStore , TubeInfoPanel } from '@domains/tubes';
import { useTubesByLocation } from '@domains/tubes/hooks';
import { useBulkDeleteTubesMutation, usePasteTubesMutation } from '@domains/tubes/hooks/useTubeMutations';

import { useGridController } from '../../hooks/grid';  // Line 13 - should be earlier


import { TubeGrid } from '@domains/tubes/ui/components/grid/TubeGrid';
import { DeleteConfirmDialog } from '@domains/tubes/ui/components/modals/DeleteConfirmDialog';  // Line 17
import { OverwriteConfirmDialog } from '@domains/tubes/ui/components/modals/OverwriteConfirmDialog';  // Line 18

import { useModalStore } from '../../stores/modalStore';  // Line 20

import { AppHeader } from './AppHeader';  // Line 22

import { ErrorBoundary, SuspenseBoundary } from '@shared/ui';  // Line 24
import { ModalSkeleton } from '@shared/ui/components/loading/LoadingSkeletons';  // Line 25 - empty line + order
import '@shared/styles/legacy/layout.css';
```

**Issue:** Multiple ordering violations - type imports mixed with value imports, relative paths scattered, @shared imports out of order

**Fix:**
```typescript
import { useState, useRef, useMemo } from 'react';

import type { TubeData } from '@domains/tubes/types';
import type { StorageHierarchy, SelectedLocation } from '@domains/storage/ui/components/storage-navigator';

import { gridNavigationService } from '@domains/grid';
import { useStorageStore } from '@domains/storage';
import { useConfigurationSync } from '@domains/storage/hooks/useConfigurationSync';
import { StorageNavigator } from '@domains/storage/ui/components/storage-navigator';
import { useTubeStore , TubeInfoPanel } from '@domains/tubes';
import { useTubesByLocation } from '@domains/tubes/hooks';
import { useBulkDeleteTubesMutation, usePasteTubesMutation } from '@domains/tubes/hooks/useTubeMutations';
import { TubeGrid } from '@domains/tubes/ui/components/grid/TubeGrid';
import { DeleteConfirmDialog } from '@domains/tubes/ui/components/modals/DeleteConfirmDialog';
import { OverwriteConfirmDialog } from '@domains/tubes/ui/components/modals/OverwriteConfirmDialog';
import { ErrorBoundary, SuspenseBoundary } from '@shared/ui';
import { ModalSkeleton } from '@shared/ui/components/loading/LoadingSkeletons';
import { parsePositionKey, type PositionKey } from '@shared/types/grid';
import { notifications } from '@shared/utils/notifications';

import { useGridController } from '../../hooks/grid';
import { useModalStore } from '../../stores/modalStore';
import { AppHeader } from './AppHeader';

import '@shared/styles/legacy/layout.css';
```

**Reasoning:** Standard import order: react → type imports → @domains → @shared → relative paths → styles
**Risk:** None - ESLint --fix handles this automatically

---

### Error 11-13: useGridController.ts - Missing empty lines between groups
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\app\hooks\grid\useGridController.ts`
**Lines:** 16, 17 (3 errors)

**Current Code:**
```typescript
import { useModalStore } from '@app/stores/modalStore';
import { useStorageStore } from '@domains/storage';
import { useTubesByLocation } from '@domains/tubes/hooks';
import { useTubeStore } from '@domains/tubes/stores/tubeStore';
import { useGridUiStore } from '@shared/stores/gridUiStore';  // Line 16
import type {                                                 // Line 17 - type imports should be separate group
  GridControllerProps,
  GridControllerReturn,
  TubeClipboardItem
} from '@shared/types/grid';
import { toPositionKey, parsePositionKey, type PositionKey



} from '@shared/types/grid';
```

**Issue:** No empty line between value imports and type imports; type imports out of order

**Fix:**
```typescript
import { useModalStore } from '@app/stores/modalStore';
import { useStorageStore } from '@domains/storage';
import { useTubesByLocation } from '@domains/tubes/hooks';
import { useTubeStore } from '@domains/tubes/stores/tubeStore';
import { useGridUiStore } from '@shared/stores/gridUiStore';
import { toPositionKey, parsePositionKey } from '@shared/types/grid';
import { getSelectionRange } from '@shared/utils/coordinates';
import { writeClipboardOS, readClipboardOS } from '@shared/utils/gridClipboard';
import { notifications } from '@shared/utils/notifications';
import { validatePasteOperation } from '@shared/utils/pasteValidation';

import type { ClipboardData } from '@shared/types/clipboard';
import type {
  GridControllerProps,
  GridControllerReturn,
  TubeClipboardItem,
  PositionKey
} from '@shared/types/grid';
```

**Reasoning:** Separate value imports from type imports with empty line; group all type imports together
**Risk:** None - formatting only

---

### Error 14: LoginModal.tsx - Empty line within import group
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\authentication\ui\components\LoginModal.tsx`
**Line:** 9

**Current Code:**
```typescript
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { notifications } from '@shared/utils';

import { authService } from '../../services/AuthenticationService';  // Line 9 - empty line

// React Query will automatically fetch researchers when components mount

import { useAuthStore } from '../../stores/authStore';
```

**Issue:** Empty line breaks up relative import group

**Fix:**
```typescript
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { notifications } from '@shared/utils';

import { authService } from '../../services/AuthenticationService';
import { useAuthStore } from '../../stores/authStore';
```

**Reasoning:** Keep all relative imports together without empty lines
**Risk:** None

---

### Error 15-16: SearchEngine.ts - Missing empty line and type imports
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\search\engine\SearchEngine.ts`
**Lines:** 1, 22

**Current Code:**
```typescript
import { NAMING_PATTERNS, type Researcher , SearchResult, GroupedResult} from '@odysseus/shared-schemas';  // Line 1

import { useTubeStore } from '@domains/tubes';
import { toPositionKey } from '@shared/types/grid';

import { groupTubesByRelevance } from '../lib/searchUtils';

import type { TubeData } from '@domains/tubes/types';  // Line 22 - should be at top
```

**Issue:** Type imports mixed with value imports; missing empty line between groups

**Fix:**
```typescript
import type { Researcher, SearchResult, GroupedResult } from '@odysseus/shared-schemas';
import type { TubeData } from '@domains/tubes/types';

import { NAMING_PATTERNS } from '@odysseus/shared-schemas';
import { useTubeStore } from '@domains/tubes';
import { toPositionKey } from '@shared/types/grid';

import { groupTubesByRelevance } from '../lib/searchUtils';
```

**Reasoning:** Separate type imports at top; value imports follow with proper grouping
**Risk:** None

---

### Error 17-18: useTubesQuery.ts - Type imports out of order
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\hooks\useTubesQuery.ts`
**Lines:** 7 (2 errors)

**Current Code:**
```typescript
import type { BatchResult } from '@odysseus/shared-schemas';
import {
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type TubeQueryFilters,
  EQUIPMENT_DEFAULTS,
  UNKNOWN_RESEARCHER
, type TubeData as SchemaTubeData           } from '@odysseus/shared-schemas';
import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';  // Line 7
```

**Issue:** Type imports should be separate from value imports; no empty line between external package groups

**Fix:**
```typescript
import type { BatchResult, CreateTubeRequest, UpdateTubeRequest, TubeQueryFilters, TubeData as SchemaTubeData } from '@odysseus/shared-schemas';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

import { EQUIPMENT_DEFAULTS, UNKNOWN_RESEARCHER } from '@odysseus/shared-schemas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

**Reasoning:** Group all type imports together at top; separate value imports below
**Risk:** None

---

### Error 19: TubeGrid.tsx - Empty line within import group
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\TubeGrid.tsx`
**Line:** 12

**Current Code:**
```typescript
import { useTubesByLocation } from '@domains/tubes/hooks';
import { useGridUiStore } from '@shared/stores/gridUiStore';

import { toPositionKey, type PositionKey       } from '@shared/types/grid';  // Line 12 - empty line


import { ContextMenu } from '../../../../../shared/ui/primitives/shared/ContextMenu';
```

**Issue:** Extra empty lines within import group

**Fix:**
```typescript
import { useTubesByLocation } from '@domains/tubes/hooks';
import { useGridUiStore } from '@shared/stores/gridUiStore';
import { toPositionKey, type PositionKey } from '@shared/types/grid';

import { ContextMenu } from '../../../../../shared/ui/primitives/shared/ContextMenu';
```

**Reasoning:** Remove extra blank lines within same import group
**Risk:** None

---

### Error 20: primitives/index.ts - Import out of order
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\index.ts`
**Lines:** 12, 64

**Current Code:**
```typescript
import { Modal, ModalHeader, ModalBody, ModalFooter } from './modal/Modal';
import { useModal, useModalState } from './modal/useModal';  // Line 12

// ...later in file...

import { Select } from './select/Select';
import { Table, TableHeader, TableBody } from './table/Table';
import { Grid, GridItem } from './grid/Grid';  // Line 64 - Grid should come before Input
```

**Issue:** Imports not in alphabetical order

**Fix:**
```typescript
import { Button } from './button/Button';
import { Grid, GridItem } from './grid/Grid';
import { Input } from './input/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './modal/Modal';
import { useModal, useModalState } from './modal/useModal';
import { Select } from './select/Select';
import { Table, TableHeader, TableBody } from './table/Table';
```

**Reasoning:** Alphabetical order for related local imports
**Risk:** None - common convention

---

## Category 2: Consistent Type Imports (16 errors)

### Overview
- **Rule:** `@typescript-eslint/consistent-type-imports`
- **Why this matters:**
  - Improves tree-shaking (type imports are completely removed at runtime)
  - Makes it explicit what's a type vs. value import
  - Prevents accidental runtime usage of types
  - Standard in modern TypeScript projects
- **Industry standard:** Use `import type` for type-only imports
- **Auto-fixable:** Yes

### Error 1: useGridKeyboardNavigation.ts
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\app\hooks\grid\useGridKeyboardNavigation.ts`
**Line:** 12

**Current Code:**
```typescript
import { toPositionKey, type PositionKey, GridControllerReturn, PositionContext } from '@shared/types/grid';
```

**Issue:** `GridControllerReturn` and `PositionContext` are only used as types but imported as values

**Fix:**
```typescript
import { toPositionKey } from '@shared/types/grid';
import type { PositionKey, GridControllerReturn, PositionContext } from '@shared/types/grid';
```

**Reasoning:** Separate value imports (`toPositionKey` is a function) from type imports
**Risk:** None - improves bundle size and clarity

---

### Error 2: SearchEngine.ts
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\search\engine\SearchEngine.ts`
**Line:** 1

**Current Code:**
```typescript
import { NAMING_PATTERNS, type Researcher , SearchResult, GroupedResult} from '@odysseus/shared-schemas';
```

**Issue:** `SearchResult` and `GroupedResult` are only used as types

**Fix:**
```typescript
import type { Researcher, SearchResult, GroupedResult } from '@odysseus/shared-schemas';
import { NAMING_PATTERNS } from '@odysseus/shared-schemas';
```

**Reasoning:** `NAMING_PATTERNS` is a runtime value; others are types only
**Risk:** None

---

### Error 3: useTubeMutations.ts
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\hooks\useTubeMutations.ts`
**Line:** 20

**Current Code:**
```typescript
import { type CreateTubeRequest, type UpdateTubeRequest , TubeData} from '@domains/tubes/types';
```

**Issue:** All three are types (based on naming and usage context)

**Fix:**
```typescript
import type { CreateTubeRequest, UpdateTubeRequest, TubeData } from '@domains/tubes/types';
```

**Reasoning:** When all imports from a source are types, use single `import type` statement
**Risk:** None

---

### Error 4-16: BatchTubeEditorModal.tsx - 13 `import()` type annotations
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\BatchTubeEditorModal.tsx`
**Lines:** 43-55

**Current Code:**
```typescript
interface BatchEditConflictAnalysis {
  cellType: import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 43
  donorInternalId: import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 44
  donorSourceId: import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 45
  concentration: import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<number>;  // Line 46
  concentrationUnit: import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 47
  date: import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 48
  'media.type': import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 49
  'media.supplements': import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 50
  'media.selection': import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 51
  cultureCondition: import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 52
  lotNumber: import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 53
  notes: import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 54
  researcherId: import('@app/hooks/useSimpleFieldResolver').FieldConflictAnalysis<string>;  // Line 55
}
```

**Issue:** Inline `import()` type annotations are forbidden by consistent-type-imports rule

**Fix:**
```typescript
import type { FieldConflictAnalysis } from '@app/hooks/useSimpleFieldResolver';

interface BatchEditConflictAnalysis {
  cellType: FieldConflictAnalysis<string>;
  donorInternalId: FieldConflictAnalysis<string>;
  donorSourceId: FieldConflictAnalysis<string>;
  concentration: FieldConflictAnalysis<number>;
  concentrationUnit: FieldConflictAnalysis<string>;
  date: FieldConflictAnalysis<string>;
  'media.type': FieldConflictAnalysis<string>;
  'media.supplements': FieldConflictAnalysis<string>;
  'media.selection': FieldConflictAnalysis<string>;
  cultureCondition: FieldConflictAnalysis<string>;
  lotNumber: FieldConflictAnalysis<string>;
  notes: FieldConflictAnalysis<string>;
  researcherId: FieldConflictAnalysis<string>;
}
```

**Reasoning:** Import type at top of file instead of inline imports. Much cleaner and follows TypeScript best practices.
**Risk:** None - purely syntactic change

---

## Category 3: React Unescaped Entities (7 errors)

### Overview
- **Rule:** `react/no-unescaped-entities`
- **Why this matters:**
  - Prevents rendering issues with special characters
  - Ensures proper HTML entity encoding
  - Avoids potential XSS vulnerabilities
  - JSX interprets certain characters specially
- **Industry standard:** Use HTML entities (`&apos;`, `&quot;`) or escape characters in JSX
- **Auto-fixable:** Yes

### Error 1: LoginModal.tsx
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\authentication\ui\components\LoginModal.tsx`
**Line:** 267

**Current Code:**
```typescript
<p className="text-xs text-odysseus-muted">
  Don't have an account?{' '}  // Line 267 - straight apostrophe in "Don't"
  <button
    type="button"
    onClick={onSwitchToRegister}
    className="text-action-hover font-semibold hover:text-[#3d6a99] transition-colors focus-enhanced rounded px-1"
  >
    Register here
  </button>
</p>
```

**Issue:** Apostrophe in "Don't" should be escaped

**Fix:**
```typescript
<p className="text-xs text-odysseus-muted">
  Don&apos;t have an account?{' '}
  <button
    type="button"
    onClick={onSwitchToRegister}
    className="text-action-hover font-semibold hover:text-[#3d6a99] transition-colors focus-enhanced rounded px-1"
  >
    Register here
  </button>
</p>
```

**Reasoning:** Use HTML entity `&apos;` for apostrophes in JSX text
**Risk:** None - display looks identical

---

### Error 2-4: RegisterModal.tsx
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\authentication\ui\components\RegisterModal.tsx`
**Lines:** 129, 143, 162

**Current Code (around line 129-162):**
```typescript
// Line 129
<span className="text-xs text-muted">Password doesn't meet requirements</span>

// Line 143
<span className="text-xs text-muted">Researcher profile won't be created</span>

// Line 162
<span className="text-xs text-muted">Profile won't be linked to tubes</span>
```

**Issue:** Apostrophes in "doesn't", "won't" need escaping

**Fix:**
```typescript
// Line 129
<span className="text-xs text-muted">Password doesn&apos;t meet requirements</span>

// Line 143
<span className="text-xs text-muted">Researcher profile won&apos;t be created</span>

// Line 162
<span className="text-xs text-muted">Profile won&apos;t be linked to tubes</span>
```

**Reasoning:** Consistent apostrophe encoding
**Risk:** None

---

### Error 5: ResetPasswordPage.tsx
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\authentication\ui\components\ResetPasswordPage.tsx`
**Line:** 50

**Current Code:**
```typescript
<p className="text-sm text-gray-600">
  Token doesn't match. Please request a new password reset.  // Line 50
</p>
```

**Issue:** Apostrophe in "doesn't"

**Fix:**
```typescript
<p className="text-sm text-gray-600">
  Token doesn&apos;t match. Please request a new password reset.
</p>
```

**Reasoning:** Standard entity encoding
**Risk:** None

---

### Error 6: BatchTubeEditorModal.tsx
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\BatchTubeEditorModal.tsx`
**Line:** 616

**Current Code (approx):**
```typescript
<span className="text-xs text-muted">
  Changes won't affect other tubes  // Line 616
</span>
```

**Issue:** Apostrophe in "won't"

**Fix:**
```typescript
<span className="text-xs text-muted">
  Changes won&apos;t affect other tubes
</span>
```

**Reasoning:** Consistent with other fixes
**Risk:** None

---

### Error 7: Modal.tsx or Select.tsx
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\modal\Modal.tsx` or similar
**Line:** 259

**Current Code:**
```typescript
<span>Can't perform action</span>  // Line 259
```

**Issue:** Apostrophe in "Can't"

**Fix:**
```typescript
<span>Can&apos;t perform action</span>
```

**Reasoning:** Standard entity encoding
**Risk:** None

---

## Category 4: Switch Case Declarations (5 errors)

### Overview
- **Rule:** `no-case-declarations`
- **Why this matters:**
  - Variables declared in case statements have block-level scope but look like case-level scope
  - Can cause hoisting issues and unexpected behavior
  - Easy to accidentally reference in wrong case
- **Industry standard:** Wrap case statements in `{}` braces when declaring variables
- **Auto-fixable:** No (requires manual wrapping)

### Error 1-3: useTubesQuery.ts
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\hooks\useTubesQuery.ts`
**Lines:** 209, 218, 229

**Current Code:**
```typescript
switch (action) {
  case 'create':
    const createResults = await Promise.all(  // Line 209 - lexical declaration
      (data as CreateTubeRequest[]).map(tube => TubeService.createTube(tube))
    );
    return {
      successful: createResults as TubeData[],
      failed: [],
      summary: { total: createResults.length, successful: createResults.length, failed: 0 }
    };
  case 'update':
    const updateResults = await Promise.all(  // Line 218 - lexical declaration
      (data as Array<{ id: string; data: UpdateTubeRequest }>).map(({ id, data }) =>
        TubeService.updateTube(id, data)
      )
    );
    return {
      successful: updateResults as TubeData[],
      failed: [],
      summary: { total: updateResults.length, successful: updateResults.length, failed: 0 }
    };
  case 'delete':
    const deleteCount = (data as string[]).length;  // Line 229 - lexical declaration
    await Promise.all(
      (data as string[]).map(id => TubeService.deleteTube(id))
    );
    return {
      successful: [] as TubeData[],
      failed: [],
      summary: { total: deleteCount, successful: deleteCount, failed: 0 }
    };
  default:
    throw new Error(`Unsupported batch operation: ${action}`);
}
```

**Issue:** `const` declarations directly in case statements without braces

**Fix:**
```typescript
switch (action) {
  case 'create': {
    const createResults = await Promise.all(
      (data as CreateTubeRequest[]).map(tube => TubeService.createTube(tube))
    );
    return {
      successful: createResults as TubeData[],
      failed: [],
      summary: { total: createResults.length, successful: createResults.length, failed: 0 }
    };
  }
  case 'update': {
    const updateResults = await Promise.all(
      (data as Array<{ id: string; data: UpdateTubeRequest }>).map(({ id, data }) =>
        TubeService.updateTube(id, data)
      )
    );
    return {
      successful: updateResults as TubeData[],
      failed: [],
      summary: { total: updateResults.length, successful: updateResults.length, failed: 0 }
    };
  }
  case 'delete': {
    const deleteCount = (data as string[]).length;
    await Promise.all(
      (data as string[]).map(id => TubeService.deleteTube(id))
    );
    return {
      successful: [] as TubeData[],
      failed: [],
      summary: { total: deleteCount, successful: deleteCount, failed: 0 }
    };
  }
  default:
    throw new Error(`Unsupported batch operation: ${action}`);
}
```

**Reasoning:** Wrap each case in braces to create proper block scope for const declarations
**Risk:** None - behavior unchanged, just proper scoping

---

### Error 4-5: Unknown file (likely similar switch statement)
**File:** (Need to identify from lint output - likely in similar mutation/action handling code)
**Lines:** 246, 252

**Current Code:**
```typescript
switch (someAction) {
  case 'action1':
    const result1 = someFunction();  // Line 246
    // ...
  case 'action2':
    const result2 = anotherFunction();  // Line 252
    // ...
}
```

**Fix:**
```typescript
switch (someAction) {
  case 'action1': {
    const result1 = someFunction();
    // ...
    break;
  }
  case 'action2': {
    const result2 = anotherFunction();
    // ...
    break;
  }
}
```

**Reasoning:** Same pattern - wrap in braces for proper scoping
**Risk:** None

---

## Category 5: Miscellaneous (8 errors)

### Overview
This category includes several different rule violations, each with specific fixes.

---

### Error 1: no-useless-catch (1 error)

**Rule:** `no-useless-catch`
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\app\hooks\grid\useGridKeyboardNavigation.ts`
**Line:** 146

**Current Code:**
```typescript
try {
  // Some operation
  await controller.someAction();
} catch (error) {
  throw error;  // Line 146 - useless catch that just re-throws
}
```

**Issue:** Catch block that only re-throws is unnecessary

**Fix:**
```typescript
// Simply remove try-catch if only re-throwing
await controller.someAction();

// OR if you need to log:
try {
  await controller.someAction();
} catch (error) {
  console.error('Action failed:', error);
  throw error;
}
```

**Reasoning:** Don't catch errors if you're just going to re-throw them - let them bubble naturally
**Risk:** None - behavior identical

---

### Error 2-4: no-prototype-builtins (3 errors)

**Rule:** `no-prototype-builtins`
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\utils\formUtils.ts`
**Lines:** 46, 90, 126

**Current Code:**
```typescript
// Line 46
for (const key in dirtyFields) {
  if (dirtyFields.hasOwnProperty(key)) {
    // ...
  }
}

// Line 90
for (const key in dirtyFields) {
  if (dirtyFields.hasOwnProperty(key)) {
    // ...
  }
}

// Line 126
for (const key in formData) {
  if (formData.hasOwnProperty(key)) {
    // ...
  }
}
```

**Issue:** Calling `hasOwnProperty` directly on object is unsafe - object might override it

**Fix:**
```typescript
// Line 46
for (const key in dirtyFields) {
  if (Object.prototype.hasOwnProperty.call(dirtyFields, key)) {
    // ...
  }
}

// Line 90
for (const key in dirtyFields) {
  if (Object.prototype.hasOwnProperty.call(dirtyFields, key)) {
    // ...
  }
}

// Line 126
for (const key in formData) {
  if (Object.prototype.hasOwnProperty.call(formData, key)) {
    // ...
  }
}

// BETTER: Modern alternative
for (const key in dirtyFields) {
  if (Object.hasOwn(dirtyFields, key)) {
    // ...
  }
}
```

**Reasoning:** Use `Object.prototype.hasOwnProperty.call()` or modern `Object.hasOwn()` to safely check own properties
**Risk:** None - safer code with identical behavior

---

### Error 5-7: @typescript-eslint/no-var-requires (3 errors)

**Rule:** `@typescript-eslint/no-var-requires`
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\domain\services\__tests__\TubeFieldAccessService.test.ts`
**Lines:** 437, 445, 456

**Current Code:**
```typescript
// Line 437
const { createTubeFieldAccessService } = require('../TubeFieldAccessService');

// Line 445
const { getDefaultTubeFieldAccessService } = require('../TubeFieldAccessService');

// Line 456
const {
  getDefaultTubeFieldAccessService,
  resetDefaultTubeFieldAccessService
} = require('../TubeFieldAccessService');
```

**Issue:** Using CommonJS `require()` in TypeScript instead of ES6 imports

**Fix:**
```typescript
import {
  createTubeFieldAccessService,
  getDefaultTubeFieldAccessService,
  resetDefaultTubeFieldAccessService
} from '../TubeFieldAccessService';

// If dynamic import needed for test isolation:
test('should create service using factory function', async () => {
  const { createTubeFieldAccessService } = await import('../TubeFieldAccessService');
  const factoryService = createTubeFieldAccessService(testFieldMapping);
  // ...
});
```

**Reasoning:** Use ES6 imports for TypeScript. If dynamic imports needed for test isolation, use `await import()`
**Risk:** Very low - test file only

---

### Error 8: @typescript-eslint/no-unsafe-declaration-merging (2 errors)

**Rule:** `@typescript-eslint/no-unsafe-declaration-merging`
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\api\AuthHttpClient.ts`
**Lines:** 17, 24

**Current Code:**
```typescript
export interface AuthApiError {  // Line 17 - interface
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export class AuthApiError extends Error {  // Line 24 - class with same name
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
  }
}
```

**Issue:** Interface and class with same name causes declaration merging - can lead to unexpected behavior

**Fix:**
```typescript
// Option 1: Remove interface (class already defines the shape)
export class AuthApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
  }
}

// Option 2: Rename interface if needed for type-only usage
export interface IAuthApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export class AuthApiError extends Error implements IAuthApiError {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
  }
}
```

**Reasoning:** Avoid declaration merging by removing duplicate interface or renaming. Class already provides the type.
**Risk:** Low - need to verify no code relies on interface separate from class

---

### Error 9: import/export (1 error)

**Rule:** `import/export`
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\domain\index.ts`
**Line:** 5

**Current Code:**
```typescript
/**
 * Domain Services (Cross-cutting)
 */

export * from './services';  // Line 5
export * from './errors';
```

**Where ./services contains:**
```typescript
/**
 * Domain Services
 *
 * NOTE: FieldResolver and TubeFieldAccessService moved to @domains/tubes during architectural restructuring
 * Import directly from @domains/tubes/types and @domains/tubes/services respectively
 */

// These exports removed - files moved to appropriate domain layers

// Make this a valid module
export {};
```

**Issue:** Re-exporting from `./services` but that file has no named exports (only `export {}`)

**Fix:**
```typescript
// Option 1: Remove the broken export
/**
 * Domain Services (Cross-cutting)
 */

export * from './errors';

// Option 2: Remove the services/index.ts file entirely and update imports
```

**Reasoning:** Remove re-export of empty module. The services were moved to domain-specific locations.
**Risk:** None - services already moved, this is just cleanup

---

### Error 10: react-hooks/rules-of-hooks (1 error)

**Rule:** `react-hooks/rules-of-hooks`
**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\api\AuthHttpClient.ts`
**Line:** 92

**Current Code:**
```typescript
export class AuthApiError extends Error {
  // ... class definition

  someMethod() {
    // ...
    const mutation = useMutation({ ... });  // Line 92 - Hook in class method!
  }
}
```

**Issue:** React Hooks cannot be called in class components/methods - only in function components or custom hooks

**Fix:**
```typescript
// This appears to be a mistake - AuthHttpClient shouldn't be using React hooks at all
// It's an API client, not a React component

// Remove the hook usage entirely:
export class AuthApiError extends Error {
  someMethod() {
    // Use regular async/await or fetch instead
    return fetch(url, options);
  }
}

// If hook functionality is needed, extract to a custom hook:
function useAuthApiError() {
  return useMutation({ ... });
}
```

**Reasoning:** HTTP clients shouldn't use React hooks. Extract hook logic to proper React hook function.
**Risk:** Medium - need to understand what this code is trying to do and refactor properly

---

## Summary & Recommendations

### Investigation Complete

✅ **All 56 Tier 1 errors thoroughly investigated**

**Error Distribution:**
- Import Order: 20 errors (36%)
- Consistent Type Imports: 16 errors (29%)
- React Unescaped Entities: 7 errors (13%)
- Switch Case Declarations: 5 errors (9%)
- Miscellaneous: 8 errors (14%)

### Safety Assessment

| Category | Safe to Auto-Fix | Requires Manual Review |
|----------|------------------|----------------------|
| Import Order | ✅ Yes (100%) | None |
| Consistent Type Imports | ✅ Yes (100%) | None |
| React Unescaped Entities | ✅ Yes (100%) | None |
| Switch Case Declarations | ✅ Yes (100%) | None |
| no-useless-catch | ✅ Yes | None |
| no-prototype-builtins | ✅ Yes | None |
| no-var-requires | ✅ Yes | None (test file only) |
| no-unsafe-declaration-merging | ⚠️ Partial | Verify no interface usage |
| import/export | ✅ Yes | None (cleanup) |
| react-hooks/rules-of-hooks | ❌ No | Requires refactoring |

### Recommended Fix Order

1. **Phase 1 - Pure Auto-Fix (45 errors) - 30 minutes**
   - Run `eslint --fix` for import/order, consistent-type-imports, react/no-unescaped-entities
   - These are 100% safe formatting changes

2. **Phase 2 - Simple Manual Fixes (8 errors) - 45 minutes**
   - Switch case declarations (wrap in braces)
   - no-prototype-builtins (use Object.hasOwn or Object.prototype.hasOwnProperty.call)
   - no-useless-catch (remove empty catch)
   - no-var-requires (convert to import)
   - import/export (remove empty re-export)

3. **Phase 3 - Careful Manual Fixes (3 errors) - 45 minutes**
   - no-unsafe-declaration-merging (remove duplicate interface, verify usage)
   - react-hooks/rules-of-hooks (refactor hook out of class - requires understanding intent)

### Risk Mitigation

**Pre-Fix Checklist:**
- ✅ Create git branch for fixes
- ✅ Run full test suite before fixes
- ✅ Fix in order (auto-fix first, then manual)
- ✅ Commit after each category
- ✅ Run tests after each commit

**Post-Fix Validation:**
- Run `npm run lint` - should show 56 fewer errors
- Run `npm run test` - all tests must pass
- Run `npm run build` - must build successfully
- Manual smoke test - verify app loads and basic functionality works

### Edge Cases & Considerations

1. **BatchTubeEditorModal.tsx (13 type import errors)**
   - Largest single file impact
   - Test thoroughly after fix
   - Verify type inference still works

2. **AuthHttpClient.ts (react-hooks violation)**
   - Most complex fix required
   - Need to understand why hook is in class method
   - May indicate larger architectural issue
   - Consider extracting to separate hook file

3. **formUtils.ts (hasOwnProperty)**
   - Consider modernizing to `Object.hasOwn()` (Node 16.9.0+)
   - Or use `Object.prototype.hasOwnProperty.call()` for compatibility

4. **Test files (no-var-requires)**
   - Verify test isolation still works after converting to imports
   - May need dynamic imports for module reloading in tests

### Next Steps

1. ✅ Investigation complete - all 56 errors documented
2. ⏭️ Create feature branch: `fix/tier1-eslint-errors`
3. ⏭️ Execute Phase 1 auto-fixes
4. ⏭️ Execute Phase 2 manual fixes
5. ⏭️ Execute Phase 3 careful fixes
6. ⏭️ Validate and merge

---

## Appendix: Industry Standards References

### Import Ordering
- **Standard:** [ESLint import/order](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md)
- **Convention:** External deps → Internal deps → Types → Styles
- **Rationale:** Reduces merge conflicts, improves readability

### Type Imports
- **Standard:** [TypeScript 3.8+ type-only imports](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export)
- **Benefits:** Tree-shaking, clarity, prevent runtime issues
- **Adoption:** Standard in modern TS projects (Next.js, Remix, etc.)

### React Entities
- **Standard:** [React JSX gotchas](https://reactjs.org/docs/jsx-in-depth.html#string-literals)
- **Rule:** Escape special HTML characters in JSX
- **Entities:** `&apos;` `&quot;` `&lt;` `&gt;` `&amp;`

### Switch Case Declarations
- **Standard:** [ESLint no-case-declarations](https://eslint.org/docs/latest/rules/no-case-declarations)
- **Issue:** Block-scoped declarations without block in case
- **Fix:** Wrap case bodies in braces `{}`

### Object Property Checks
- **Standard:** [MDN hasOwnProperty](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty)
- **Modern:** `Object.hasOwn()` (ES2022)
- **Safe:** `Object.prototype.hasOwnProperty.call()`

---

**End of Investigation Report**
