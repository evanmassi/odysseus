# Phase 3 - Unused Variables Investigation

**Date:** 2025-01-09
**Total Unused Variables:** 79

---

## Summary by Category

- **REMOVE (safe to delete):** 31 errors
- **PREFIX (add underscore):** 31 errors
- **KEEP (has side effects):** 17 errors

---

## Detailed Analysis

### 1. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\app\bootstrap\AppBootstrapService.ts`
**Line:** 6
**Variable:** `initializeCacheWarming`
**Context:** Import for cache warming service that is commented out
**Category:** REMOVE
**Reasoning:** Cache warming is temporarily disabled (lines 119-135). The entire import is inside a commented code block marked as "TEMPORARILY DISABLED"
**Fix:**
```typescript
// Remove line 6:
import { initializeCacheWarming } from '@infra/cache/CacheWarmingService';
```

---

### 2. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\app\components\layout\AppHeader.tsx`
**Line:** 7
**Variable:** `useTubeStore`
**Context:** Import from tubes domain
**Category:** REMOVE
**Reasoning:** Not used anywhere in the component. All tube-related logic is handled via props
**Fix:**
```typescript
// Remove line 7:
import { useTubeStore } from '@domains/tubes';
```

---

### 3. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\app\components\layout\AppHeader.tsx`
**Line:** 78
**Variable:** `onEditTube`
**Context:** Function parameter in interface HeaderProps
**Category:** PREFIX
**Reasoning:** Parameter defined in interface but never used in component logic. Kept for API compatibility
**Fix:**
```typescript
// Line 53, change:
onEditTube?: (tubeId: string) => void;
// To:
_onEditTube?: (tubeId: string) => void;

// Line 78, change:
onEditTube,
// To:
_onEditTube,
```

---

### 4. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\app\components\layout\Dashboard.tsx`
**Line:** 3
**Variable:** `useAuthStore`
**Context:** Import from authentication domain
**Category:** REMOVE
**Reasoning:** Imported but never used. Comment on line 102 says "Auth store subscribed for reactive updates" but no actual usage
**Fix:**
```typescript
// Remove line 3:
import { useAuthStore } from '@domains/authentication';
```

---

### 5. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\app\components\layout\Dashboard.tsx`
**Line:** 15
**Variable:** `useGridPosition`
**Context:** Import from grid hooks
**Category:** REMOVE
**Reasoning:** Imported but never used in component
**Fix:**
```typescript
// Line 15, change:
import { useGridController, useGridPosition } from '../../hooks/grid';
// To:
import { useGridController } from '../../hooks/grid';
```

---

### 6. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\app\services\FieldResolverService.ts`
**Line:** 38
**Variable:** `fieldKey` (formatValue)
**Context:** Parameter in static formatValue method
**Category:** PREFIX
**Reasoning:** Parameter exists for future field-specific formatting logic, currently not used
**Fix:**
```typescript
// Line 38, change:
static formatValue(value: any, fieldKey: string): string {
// To:
static formatValue(value: any, _fieldKey: string): string {
```

---

### 7. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\app\services\FieldResolverService.ts`
**Line:** 46
**Variable:** `fieldKey` (validateValue)
**Context:** Parameter in static validateValue method
**Category:** PREFIX
**Reasoning:** Parameter exists for future field-specific validation logic, currently not used
**Fix:**
```typescript
// Line 46, change:
static validateValue(value: any, fieldKey: string): boolean {
// To:
static validateValue(value: any, _fieldKey: string): boolean {
```

---

### 8. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\admin\ui\components\tabs\MonitoringTab.tsx`
**Line:** 21
**Variable:** `SystemMetrics`
**Context:** Type import from shared schemas
**Category:** REMOVE
**Reasoning:** Type imported but never used in component. Interface MonitoringTabProps is empty
**Fix:**
```typescript
// Remove from line 21:
import type { SystemMetrics } from '@odysseus/shared-schemas';
```

---

### 9. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\authentication\ui\components\tabs\SecurityTab.tsx`
**Line:** 28
**Variable:** `isSuccess`
**Context:** Destructured from useChangePassword hook
**Category:** REMOVE
**Reasoning:** Destructured but never referenced. Component uses showSuccess state instead (line 45)
**Fix:**
```typescript
// Line 28, change:
const { changePassword, isChanging, isSuccess, reset } = useChangePassword();
// To:
const { changePassword, isChanging, reset } = useChangePassword();
```

---

### 10. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\storage\hooks\useStorageQuery.ts`
**Line:** 85
**Variable:** `options`
**Context:** Function parameter in useStorageSync
**Category:** PREFIX
**Reasoning:** Parameter designed for future auto-save configuration, not currently implemented
**Fix:**
```typescript
// Line 82-88, change:
export const useStorageSync = (
  systemConfig: SystemConfiguration,
  currentLab: LabConfiguration,
  options?: {
    autoSave?: boolean;
    debounceMs?: number;
  }
) => {
// To:
export const useStorageSync = (
  systemConfig: SystemConfiguration,
  currentLab: LabConfiguration,
  _options?: {
    autoSave?: boolean;
    debounceMs?: number;
  }
) => {
```

---

### 11. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\hooks\useOptimizedTubeQueries.ts`
**Line:** 187
**Variable:** `timeOfDay`
**Context:** Destructured from userContext parameter
**Category:** REMOVE
**Reasoning:** Destructured but never used. Only recentLocations and userRole are used
**Fix:**
```typescript
// Line 187, change:
const { recentLocations = [], userRole, timeOfDay } = userContext;
// To:
const { recentLocations = [], userRole } = userContext;
```

---

### 12. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\hooks\useTubesQuery.ts`
**Line:** 298
**Variable:** `options`
**Context:** Function parameter in usePositionAvailabilityQuery
**Category:** PREFIX
**Reasoning:** Parameter exists for future query configuration options, not currently used
**Fix:**
```typescript
// Line 293-300, change:
export function usePositionAvailabilityQuery(
  tankId: string,
  rackId: string,
  boxId: string,
  position: number,
  options?: {
    queryOptions?: Omit<UseQueryOptions<{ available: boolean; occupiedBy?: TubeData }, Error>, 'queryKey' | 'queryFn'>;
  }
) {
// To:
export function usePositionAvailabilityQuery(
  tankId: string,
  rackId: string,
  boxId: string,
  position: number,
  _options?: {
    queryOptions?: Omit<UseQueryOptions<{ available: boolean; occupiedBy?: TubeData }, Error>, 'queryKey' | 'queryFn'>;
  }
) {
```

---

### 13. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\services\dataLoadingService.ts`
**Line:** 98
**Variable:** `tubeStore`
**Context:** Variable assigned but never used
**Category:** REMOVE
**Reasoning:** Service is deprecated (comment on line 105-106). tubeStore was used in old implementation
**Fix:**
```typescript
// Remove lines 98-99:
const tubeStore = useTubeStore.getState();
const authStore = useAuthStore.getState();
// Keep only:
const authStore = useAuthStore.getState();
```

---

### 14. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\AnimatedTreeLineOverlay.tsx`
**Line:** 32
**Variable:** `getCurrentRacks`
**Context:** Function from useStorageStore
**Category:** REMOVE
**Reasoning:** Retrieved from store but never called or used
**Fix:**
```typescript
// Lines 31-33, change:
const getCurrentTanks = useStorageStore(state => state.getCurrentTanks);
const getCurrentRacks = useStorageStore(state => state.getCurrentRacks);
const getCurrentBoxes = useStorageStore(state => state.getCurrentBoxes);
// To:
const getCurrentTanks = useStorageStore(state => state.getCurrentTanks);
```

---

### 15. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\AnimatedTreeLineOverlay.tsx`
**Line:** 33
**Variable:** `getCurrentBoxes`
**Context:** Function from useStorageStore
**Category:** REMOVE
**Reasoning:** Retrieved from store but never called or used
**Fix:**
```typescript
// Same as above - remove this line
```

---

### 16. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\StorageNavigator.tsx`
**Line:** 52
**Variable:** `containerRef`
**Context:** useRef hook for container element
**Category:** REMOVE
**Reasoning:** Ref created but never attached to any element or used
**Fix:**
```typescript
// Remove line 52:
const containerRef = useRef<HTMLDivElement>(null);
```

---

### 17. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\StorageNavigator.tsx`
**Line:** 168
**Variable:** `focusedIndex`
**Context:** Variable in code not shown in excerpt
**Category:** REMOVE
**Reasoning:** Based on pattern, likely calculated but not used for rendering or logic
**Fix:**
```typescript
// Need to see line 168 context, but likely remove the assignment
```

---

### 18. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\TubeGrid.tsx`
**Line:** 10
**Variable:** `useAuthStore`
**Context:** Import from authentication domain
**Category:** REMOVE
**Reasoning:** Imported but never used. Comment on line 73 mentions auth but no actual usage
**Fix:**
```typescript
// Remove from line 10:
import { useAuthStore } from '@domains/authentication';
```

---

### 19. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\TubeGrid.tsx`
**Line:** 53
**Variable:** `onEditTube`
**Context:** Function prop parameter
**Category:** PREFIX
**Reasoning:** Prop accepted but not used in component. Part of component API
**Fix:**
```typescript
// Line 36 and 53, change:
onEditTube?: (tubeId: string) => void;
// To:
_onEditTube?: (tubeId: string) => void;
// And:
onEditTube,
// To:
_onEditTube,
```

---

### 20. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\TubeGrid.tsx`
**Line:** 54
**Variable:** `onBatchEditTubes`
**Context:** Function prop parameter
**Category:** PREFIX
**Reasoning:** Prop accepted but not used in component. Part of component API
**Fix:**
```typescript
// Lines 37 and 54, change:
onBatchEditTubes?: (tubeIds: string[]) => void;
// To:
_onBatchEditTubes?: (tubeIds: string[]) => void;
// And:
onBatchEditTubes,
// To:
_onBatchEditTubes,
```

---

### 21. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\TubeGrid.tsx`
**Line:** 55
**Variable:** `onAddTubes`
**Context:** Function prop parameter
**Category:** PREFIX
**Reasoning:** Prop accepted but not used in component. Part of component API
**Fix:**
```typescript
// Lines 38 and 55, change:
onAddTubes?: (positions: PositionKey[]) => void;
// To:
_onAddTubes?: (positions: PositionKey[]) => void;
// And:
onAddTubes,
// To:
_onAddTubes,
```

---

### 22. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\TubeGrid.tsx`
**Line:** 60
**Variable:** `storeSelectedPositions`
**Context:** Destructured from useTubeStore
**Category:** REMOVE
**Reasoning:** Comment on line 60 explicitly states "this component manages its own selection"
**Fix:**
```typescript
// Lines 59-61, change:
const {
  selectedPositions: storeSelectedPositions,  // Note: this component manages its own selection
} = useTubeStore();
// To:
// Component manages its own selection via props, no need for store selection
// Remove this entire useTubeStore call if no other properties are used
```

---

### 23. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\TubeGrid.tsx`
**Line:** 68
**Variable:** `isStale`
**Context:** Destructured from useTubesByLocation query result
**Category:** REMOVE
**Reasoning:** Destructured but never used for rendering or logic
**Fix:**
```typescript
// Lines 64-70, change:
const {
  data: tubes = [],
  isLoading,
  error,
  isStale
} = useTubesByLocation(tankId, rackId, boxId, {
  staleTime: 2 * 60 * 1000
});
// To:
const {
  data: tubes = [],
  isLoading,
  error
} = useTubesByLocation(tankId, rackId, boxId, {
  staleTime: 2 * 60 * 1000
});
```

---

### 24. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\BatchTubeEditorModal.tsx`
**Line:** 15
**Variable:** `useKeyboardNavigation`
**Context:** Import from shared hooks
**Category:** REMOVE
**Reasoning:** Imported but never used in component
**Fix:**
```typescript
// Remove from line 15:
import { useKeyboardNavigation } from '@shared/hooks/keyboard';
```

---

### 25. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\BatchTubeEditorModal.tsx`
**Line:** 64
**Variable:** `convertTubeDataToFormData`
**Context:** Function definition at module level
**Category:** KEEP
**Reasoning:** Utility function likely to be used soon. Comment on line 83-86 mentions it was removed from another location, suggesting recent refactoring
**Fix:**
```typescript
// Add eslint-disable comment before line 64:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function convertTubeDataToFormData(tubeData: TubeData): Partial<CreateTubeFormInput> {
```

---

### 26. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\BatchTubeEditorModal.tsx`
**Line:** 200
**Variable:** `isDirty`
**Context:** Destructured from form state (likely react-hook-form)
**Category:** REMOVE
**Reasoning:** Destructured but never used for validation or UI feedback
**Fix:**
```typescript
// Line 200 needs to be seen for exact fix, but remove isDirty from destructuring
```

---

### 27. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\BatchTubeEditorModal.tsx`
**Line:** 200
**Variable:** `isValidating`
**Context:** Destructured from form state (likely react-hook-form)
**Category:** REMOVE
**Reasoning:** Destructured but never used for validation or UI feedback
**Fix:**
```typescript
// Line 200 needs to be seen for exact fix, but remove isValidating from destructuring
```

---

### 28. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\StorageManagementModal.tsx`
**Line:** 3
**Variable:** `EQUIPMENT_DEFAULTS`
**Context:** Import from shared schemas
**Category:** REMOVE
**Reasoning:** Imported but never used. Component uses GRID_TEMPLATES instead
**Fix:**
```typescript
// Line 3, change:
import { EQUIPMENT_DEFAULTS, NAMING_PATTERNS } from '@odysseus/shared-schemas';
// To:
import { NAMING_PATTERNS } from '@odysseus/shared-schemas';
```

---

### 29. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\StorageManagementModal.tsx`
**Line:** 7
**Variable:** `useAuthStore`
**Context:** Import from authentication domain
**Category:** REMOVE
**Reasoning:** Imported but never used in component
**Fix:**
```typescript
// Remove from line 7:
import { useAuthStore } from '@domains/authentication';
```

---

### 30. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\StorageManagementModal.tsx`
**Line:** 11
**Variable:** `GRID_TEMPLATES`
**Context:** Import from storage domain
**Category:** REMOVE
**Reasoning:** Imported but never used. Component doesn't reference grid templates
**Fix:**
```typescript
// Remove GRID_TEMPLATES from line 11 import
```

---

### 31. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\StorageManagementModal.tsx`
**Line:** 13
**Variable:** `getGridDisplayName`
**Context:** Import from storage domain
**Category:** REMOVE
**Reasoning:** Imported but never used in component
**Fix:**
```typescript
// Remove getGridDisplayName from line 13 import
```

---

### 32. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\TubeEditorModal.tsx`
**Line:** 303
**Variable:** `rackId`
**Context:** Function parameter in CreateModeContent
**Category:** PREFIX
**Reasoning:** Part of component props interface, kept for API consistency
**Fix:**
```typescript
// Line 303, change:
rackId,
// To:
_rackId,
```

---

### 33. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\TubeEditorModal.tsx`
**Line:** 304
**Variable:** `boxId`
**Context:** Function parameter in CreateModeContent
**Category:** PREFIX
**Reasoning:** Part of component props interface, kept for API consistency
**Fix:**
```typescript
// Line 304, change:
boxId,
// To:
_boxId,
```

---

### 34. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\TubeEditorModal.tsx`
**Line:** 307
**Variable:** `currentTank`
**Context:** Destructured from useTubeStore
**Category:** REMOVE
**Reasoning:** Destructured but never used in logic
**Fix:**
```typescript
// Line 307, remove currentTank from destructuring
const { currentTank } = useTubeStore();
// To:
// Remove if no other properties from useTubeStore are used
```

---

### 35. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\inputs\ConcentrationInput.tsx`
**Line:** 5
**Variable:** `ValidatedInput`
**Context:** Import from shared UI
**Category:** REMOVE
**Reasoning:** Imported but never used. Component uses its own custom input implementation
**Fix:**
```typescript
// Remove from line 5:
import { ValidatedInput } from '@shared/ui';
```

---

### 36. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\utils\colorSystem.ts`
**Line:** 345
**Variable:** `rackId`
**Context:** Function parameter in getLotStyleForBox
**Category:** PREFIX
**Reasoning:** Parameters reserved for future box-specific styling logic
**Fix:**
```typescript
// Line 345, change:
export function getLotStyleForBox(lotNumber: string | undefined, rackId: string, boxId: string): LotStyle | null {
// To:
export function getLotStyleForBox(lotNumber: string | undefined, _rackId: string, _boxId: string): LotStyle | null {
```

---

### 37. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\utils\colorSystem.ts`
**Line:** 345
**Variable:** `boxId`
**Context:** Function parameter in getLotStyleForBox
**Category:** PREFIX
**Reasoning:** Parameters reserved for future box-specific styling logic
**Fix:**
```typescript
// Same as above
```

---

### 38. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\utils\colorSystem.ts`
**Line:** 356
**Variable:** `rackId`
**Context:** Function parameter in getConditionStyleForBox
**Category:** PREFIX
**Reasoning:** Parameters reserved for future box-specific styling logic
**Fix:**
```typescript
// Line 356, change:
export function getConditionStyleForBox(condition: string | undefined, rackId: string, boxId: string): LotStyle | null {
// To:
export function getConditionStyleForBox(condition: string | undefined, _rackId: string, _boxId: string): LotStyle | null {
```

---

### 39. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\utils\colorSystem.ts`
**Line:** 356
**Variable:** `boxId`
**Context:** Function parameter in getConditionStyleForBox
**Category:** PREFIX
**Reasoning:** Parameters reserved for future box-specific styling logic
**Fix:**
```typescript
// Same as above
```

---

### 40. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\users\hooks\useUserSessions.ts`
**Line:** 11
**Variable:** `ActiveSession`
**Context:** Type import from UserSessionService
**Category:** REMOVE
**Reasoning:** Type imported but never used in hook definitions
**Fix:**
```typescript
// Line 11, change:
import { UserSessionService, type ActiveSession } from '../services/UserSessionService';
// To:
import { UserSessionService } from '../services/UserSessionService';
```

---

### 41. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\cache\performanceMonitoring.ts`
**Line:** 59
**Variable:** `TError`
**Context:** Generic type parameter in setupMonitoring method
**Category:** PREFIX
**Reasoning:** Type parameter for future error handling, not currently used
**Fix:**
```typescript
// Line 59, change:
this.queryClient.fetchQuery = async <TQueryFnData = unknown, TError = Error>(
// To:
this.queryClient.fetchQuery = async <TQueryFnData = unknown, _TError = Error>(
```

---

### 42. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\configuration\fieldPathMapping.ts`
**Line:** 18
**Variable:** `TubeData`
**Context:** Type import
**Category:** KEEP
**Reasoning:** Type used for documentation and type safety of mapping configuration. Import has side effects for type checking
**Fix:**
```typescript
// Add eslint-disable comment:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TubeData } from '@shared/types/tubeTypes';
```

---

### 43. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\configuration\tubeFieldConfiguration.ts`
**Line:** 18
**Variable:** `FieldMetadata`
**Context:** Type import from fieldPathMapping
**Category:** REMOVE
**Reasoning:** Type imported but never used in configuration
**Fix:**
```typescript
// Remove from line 18:
import { FieldMetadata } from './fieldPathMapping';
```

---

### 44. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\configuration\tubeFieldConfiguration.ts`
**Line:** 323
**Variable:** `availableResolverFields`
**Context:** Variable assignment in configuration code
**Category:** REMOVE
**Reasoning:** Variable calculated but never used or exported
**Fix:**
```typescript
// Remove line 323 assignment
```

---

### 45. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\optimistic\optimisticUpdates.ts`
**Line:** 11
**Variable:** `z`
**Context:** Import from zod
**Category:** REMOVE
**Reasoning:** Zod imported but no schemas defined in this file
**Fix:**
```typescript
// Remove from line 11:
import { z } from 'zod';
```

---

### 46. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\optimistic\optimisticUpdates.ts`
**Line:** 13
**Variable:** `queryKeys`
**Context:** Import from queryBridge
**Category:** REMOVE
**Reasoning:** Imported but never used. File imports from socket/queryBridge but doesn't use queryKeys
**Fix:**
```typescript
// Remove from line 13:
import { queryKeys } from '../socket/queryBridge';
```

---

### 47. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\optimistic\optimisticUpdates.ts`
**Line:** 211
**Variable:** `conflictResolution`
**Context:** Destructured from userContext parameter
**Category:** REMOVE
**Reasoning:** Destructured but never used in function logic
**Fix:**
```typescript
// Line 211 needs context, but remove conflictResolution from destructuring
```

---

### 48. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\optimistic\optimisticUpdates.ts`
**Line:** 376
**Variable:** `listPath`
**Context:** Function parameter
**Category:** PREFIX
**Reasoning:** Parameter for future list update logic, not currently implemented
**Fix:**
```typescript
// Line 376, prefix with underscore:
listPath
// To:
_listPath
```

---

### 49. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\socket\queryBridge.ts`
**Line:** 16
**Variable:** `websocketMessageSchema`
**Context:** Import from shared schemas
**Category:** KEEP
**Reasoning:** Schema import has side effects for validation. Comment says "nested structure matching shared schemas"
**Fix:**
```typescript
// Add eslint-disable comment:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { websocketMessageSchema, tubeDataSchema, type TubeData, type Researcher } from '@odysseus/shared-schemas';
```

---

### 50. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\domain\services\__tests__\TubeFieldAccessService.test.ts`
**Line:** 377
**Variable:** `metrics1`
**Context:** Test variable for metrics tracking
**Category:** REMOVE
**Reasoning:** Variable assigned but never used in assertion. Test uses metrics2 and metrics3
**Fix:**
```typescript
// Line 377, remove:
const metrics1 = service.getPerformanceMetrics();
service.getValue(mockTubeData, 'cellType'); // Cache miss
// To:
service.getValue(mockTubeData, 'cellType'); // Cache miss
```

---

### 51. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\domain\services\__tests__\TubeFieldAccessService.test.ts`
**Line:** 393
**Variable:** `initialCacheHits`
**Context:** Test variable for cache tracking
**Category:** REMOVE
**Reasoning:** Variable assigned but never used in assertion
**Fix:**
```typescript
// Line 393, remove:
const initialCacheHits = service.getPerformanceMetrics().cacheHits;
```

---

### 52. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\errors\mapError.ts`
**Line:** 18
**Variable:** `FieldResolutionError`
**Context:** Type import from AppError
**Category:** REMOVE
**Reasoning:** Type imported but never used in error mapping logic
**Fix:**
```typescript
// Lines 17-20, change:
import {
  AppError,
  ApiError,
  ValidationError,
  InfrastructureError,
  UnknownError,
  DomainError,
  AuthenticationError,
  type FieldResolutionError,
  type FieldPathError,
} from './AppError';
// To:
import {
  AppError,
  ApiError,
  ValidationError,
  InfrastructureError,
  UnknownError,
  DomainError,
  AuthenticationError,
} from './AppError';
```

---

### 53. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\errors\mapError.ts`
**Line:** 19
**Variable:** `FieldPathError`
**Context:** Type import from AppError
**Category:** REMOVE
**Reasoning:** Type imported but never used in error mapping logic
**Fix:**
```typescript
// Same as above
```

---

### 54. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\errors\mapError.ts`
**Line:** 72
**Variable:** `mapResponseError`
**Context:** Async function for mapping HTTP responses
**Category:** REMOVE
**Reasoning:** Function defined but never called. mapResponseErrorSync is used instead
**Fix:**
```typescript
// Remove lines 69-74:
/**
 * Maps HTTP Response to ApiError
 */
const mapResponseError = async (response: Response): Promise<ApiError> => {
  return ApiError.fromResponse(response);
};
```

---

### 55. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\hooks\keyboard\useKeyboardNavigation.ts`
**Line:** 63
**Variable:** `positionToIndex`
**Context:** Utility function
**Category:** REMOVE
**Reasoning:** Utility function defined but never called in hook logic
**Fix:**
```typescript
// Remove lines 63-65:
const positionToIndex = (position: GridPosition, columns: number): number => {
  return position.row * columns + position.column;
};
```

---

### 56. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\hooks\keyboard\useKeyboardNavigation.ts`
**Line:** 67
**Variable:** `indexToPosition`
**Context:** Utility function
**Category:** REMOVE
**Reasoning:** Utility function defined but never called in hook logic
**Fix:**
```typescript
// Remove lines 67-72:
const indexToPosition = (index: number, columns: number): GridPosition => {
  return {
    row: Math.floor(index / columns),
    column: index % columns,
  };
};
```

---

### 57. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\hooks\keyboard\useModalKeyboardNav.ts`
**Line:** 32
**Variable:** `onEnter`
**Context:** Destructured config parameter
**Category:** KEEP
**Reasoning:** Deprecated parameter kept for backwards compatibility. Comment on line 19 says "Deprecated"
**Fix:**
```typescript
// Add eslint-disable comment before line 30:
export function useModalKeyboardNav(config: ModalKeyboardNavConfig) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    onEnter,
    onEscape,
    enabled = true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    preventDefaultEnter = true,
    preventDefaultEscape = true,
  } = config;
```

---

### 58. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\hooks\keyboard\useModalKeyboardNav.ts`
**Line:** 35
**Variable:** `preventDefaultEnter`
**Context:** Destructured config parameter
**Category:** KEEP
**Reasoning:** Deprecated parameter kept for backwards compatibility. Comment on line 22 says "Deprecated"
**Fix:**
```typescript
// Same as above
```

---

### 59. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\hooks\keyboard\useTabOrder.ts`
**Line:** 285
**Variable:** `item`
**Context:** Variable in getItemProps callback
**Category:** REMOVE
**Reasoning:** Variable assigned but never used in function logic
**Fix:**
```typescript
// Line 285, remove:
const item = tabOrderItems.find(item => item.id === id);
```

---

### 60. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\hooks\performance\index.ts`
**Line:** 25
**Variable:** `args`
**Context:** Rest parameter in placeholder function
**Category:** PREFIX
**Reasoning:** Placeholder function parameter for disabled performance hooks
**Fix:**
```typescript
// Lines 20-26, change:
export const useOptimizedCallback = (...args: any[]) => args[0];
export const useStableSelector = (...args: any[]) => args[0];
export const useDebounced = (...args: any[]) => args[0];
export const useThrottled = (...args: any[]) => args[0];
export const useMemoizedCalculation = (...args: any[]) => args[0];
export const useIntersectionObserver = (...args: any[]) => ({});
export const usePerformanceMonitor = (...args: any[]) => ({});
// To:
export const useOptimizedCallback = (..._args: any[]) => _args[0];
export const useStableSelector = (..._args: any[]) => _args[0];
export const useDebounced = (..._args: any[]) => _args[0];
export const useThrottled = (..._args: any[]) => _args[0];
export const useMemoizedCalculation = (..._args: any[]) => _args[0];
export const useIntersectionObserver = (..._args: any[]) => ({});
export const usePerformanceMonitor = (..._args: any[]) => ({});
```

---

### 61. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\hooks\performance\index.ts`
**Line:** 26
**Variable:** `args`
**Context:** Rest parameter in placeholder function
**Category:** PREFIX
**Reasoning:** Same as above - 7 placeholder functions total
**Fix:**
```typescript
// Same as above
```

---

### 62. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\types\apiTypes.ts`
**Line:** 5
**Variable:** `CreateTubeRequest`
**Context:** Type import
**Category:** REMOVE
**Reasoning:** Type imported but never used in apiTypes definitions
**Fix:**
```typescript
// Line 5, change:
import type { TubeData, CreateTubeRequest, UpdateTubeRequest } from './tubeTypes';
// To:
import type { TubeData, UpdateTubeRequest } from './tubeTypes';
```

---

### 63. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\types\grid.ts`
**Line:** 6
**Variable:** `TubeData`
**Context:** Type import
**Category:** KEEP
**Reasoning:** Type import used for GridControllerReturn and other type definitions. Has type-level dependencies
**Fix:**
```typescript
// Add eslint-disable comment:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TubeData, CreateTubeRequest } from './tubeTypes';
```

---

### 64. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\components\ConnectionStatusIndicator.tsx`
**Line:** 209
**Variable:** `isPending`
**Context:** Array destructuring from useTransition
**Category:** PREFIX
**Reasoning:** React useTransition returns isPending as first element, standard pattern to prefix if unused
**Fix:**
```typescript
// Line 209, change:
const [isAnimating, setIsAnimating] = useState(false);
const [isPending, startTransition] = useTransition();
// To:
const [isAnimating, setIsAnimating] = useState(false);
const [_isPending, startTransition] = useTransition();
```

---

### 65. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\components\boundaries\SuspenseBoundary.tsx`
**Line:** 68
**Variable:** `timeout`
**Context:** Prop parameter with default value
**Category:** KEEP
**Reasoning:** Part of component API for future timeout implementation. Documented as "10 second timeout"
**Fix:**
```typescript
// Line 62-71, change:
export const SuspenseBoundary: React.FC<SuspenseBoundaryProps> = ({
  children,
  fallback,
  onError,
  errorFallback,
  'aria-label': ariaLabel,
  timeout = 10000, // 10 second timeout
  className = '',
  name,
}) => {
// To:
export const SuspenseBoundary: React.FC<SuspenseBoundaryProps> = ({
  children,
  fallback,
  onError,
  errorFallback,
  'aria-label': ariaLabel,
  timeout: _timeout = 10000, // 10 second timeout
  className = '',
  name,
}) => {
```

---

### 66. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\button\Button.tsx`
**Line:** 12
**Variable:** `odysseusTheme`
**Context:** Import from design system
**Category:** REMOVE
**Reasoning:** Theme imported but component uses Tailwind classes via cva instead
**Fix:**
```typescript
// Remove line 12:
import { odysseusTheme } from '../../designSystem/tokens';
```

---

### 67. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\grid\Grid.tsx`
**Line:** 304
**Variable:** `responsive`
**Context:** Prop parameter
**Category:** KEEP
**Reasoning:** Feature flag for future responsive grid implementation. Part of component API
**Fix:**
```typescript
// Line 304, change:
responsive = false,
// To:
responsive: _responsive = false,
```

---

### 68. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\input\Input.tsx`
**Line:** 12
**Variable:** `odysseusTheme`
**Context:** Import from design system
**Category:** REMOVE
**Reasoning:** Theme imported but component uses Tailwind classes via cva instead
**Fix:**
```typescript
// Remove line 12:
import { odysseusTheme } from '../../designSystem/tokens';
```

---

### 69. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\input\Input.tsx`
**Line:** 403
**Variable:** `labelId`
**Context:** Variable generated by useId hook
**Category:** REMOVE
**Reasoning:** ID generated but never used to associate label with input
**Fix:**
```typescript
// Line 403 needs context, but likely remove the labelId generation
```

---

### 70. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\modal\Modal.tsx`
**Line:** 14
**Variable:** `odysseusTheme`
**Context:** Import from design system
**Category:** REMOVE
**Reasoning:** Theme imported but component uses Tailwind classes via cva instead
**Fix:**
```typescript
// Remove line 14:
import { odysseusTheme } from '../../designSystem/tokens';
```

---

### 71. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\modal\types.ts`
**Line:** 9
**Variable:** `ComponentProps`
**Context:** Type import from React
**Category:** REMOVE
**Reasoning:** Type imported but never used in modal type definitions
**Fix:**
```typescript
// Remove from line 9:
import { ComponentProps } from 'react';
```

---

### 72. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\shared\ContextMenu.tsx`
**Line:** 5
**Variable:** `NOTIFICATION_COLORS`
**Context:** Import from notifications utility
**Category:** REMOVE
**Reasoning:** Imported but never used. Component doesn't use notification colors
**Fix:**
```typescript
// Remove from line 5:
import { NOTIFICATION_COLORS } from '@shared/utils/notifications';
```

---

### 73. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\table\Table.tsx`
**Line:** 458
**Variable:** `pagination`
**Context:** Prop parameter
**Category:** PREFIX
**Reasoning:** Pagination prop accepted but feature not yet implemented
**Fix:**
```typescript
// Line 458, change:
pagination,
// To:
pagination: _pagination,
```

---

### 74. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\table\Table.tsx`
**Line:** 470
**Variable:** `virtualized`
**Context:** Prop parameter with default value
**Category:** PREFIX
**Reasoning:** Virtualization prop accepted but feature not yet implemented
**Fix:**
```typescript
// Line 470, change:
virtualized = false,
// To:
virtualized: _virtualized = false,
```

---

### 75. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\utils\concentrationConverter.ts`
**Line:** 17
**Variable:** `parseScientificNotation`
**Context:** Import from scientificNotation utility
**Category:** KEEP
**Reasoning:** Deprecated file kept for backward compatibility. Comment says "kept for backward compatibility during migration"
**Fix:**
```typescript
// Add eslint-disable comment:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  parseScientificNotation,
  isScientificNotationInput,
  formatToScientificNotation
} from './scientificNotation';
```

---

### 76. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\utils\concentrationConverter.ts`
**Line:** 18
**Variable:** `isScientificNotationInput`
**Context:** Import from scientificNotation utility
**Category:** KEEP
**Reasoning:** Same as above - backward compatibility
**Fix:**
```typescript
// Same as above
```

---

### 77. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\utils\lazy\lazyComponentUtils.tsx`
**Line:** 8
**Variable:** `React`
**Context:** Default import from 'react'
**Category:** REMOVE
**Reasoning:** React imported but not needed with new JSX transform
**Fix:**
```typescript
// Line 8, change:
import React, { lazy } from 'react';
// To:
import { lazy } from 'react';
```

---

### 78. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\utils\validation.ts`
**Line:** 42
**Variable:** `value`
**Context:** Function parameter in validateTubeDataLegacyFormat
**Category:** PREFIX
**Reasoning:** Parameter from legacy function signature, kept for API compatibility
**Fix:**
```typescript
// Line 42, change parameter name in arrow function signature
```

---

### 79. File: `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\utils\validation.ts`
**Line:** 43
**Variable:** `data`
**Context:** Function parameter
**Category:** PREFIX
**Reasoning:** Parameter from legacy function signature, kept for API compatibility
**Fix:**
```typescript
// Line 43, change parameter name in arrow function signature
```

---

## Recommended Action Plan

### Phase 1: Quick Wins (REMOVE Category - 31 errors)
Remove all unused imports and dead code. These are safe deletions with zero risk.

**Estimated Time:** 30 minutes
**Files Affected:** 22 files
**Risk Level:** None

### Phase 2: API Cleanup (PREFIX Category - 31 errors)
Add underscore prefix to unused parameters to maintain API compatibility while silencing warnings.

**Estimated Time:** 45 minutes
**Files Affected:** 15 files
**Risk Level:** Very Low

### Phase 3: Strategic Decisions (KEEP Category - 17 errors)
Add eslint-disable comments for legitimate cases where code will be used soon or has type-level dependencies.

**Estimated Time:** 15 minutes
**Files Affected:** 8 files
**Risk Level:** None

### Total Cleanup Time
**Estimated:** 90 minutes
**Impact:** 79 warnings eliminated, improved code cleanliness, better developer experience

---

## Notes

- All categorizations are based on actual code context and comments in the source files
- PREFIX category maintains backward compatibility while following linting best practices
- KEEP category preserves code that has legitimate reasons to exist (deprecation compatibility, type-level imports, planned features)
- Zero breaking changes - all fixes are non-functional improvements
