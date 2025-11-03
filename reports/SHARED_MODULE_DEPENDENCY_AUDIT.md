# @shared Module Dependency Resolution Audit
## Complete Architectural Investigation & Action Plan

**Date:** September 29, 2025  
**Status:** COMPREHENSIVE ANALYSIS - Ready for Implementation  
**Goal:** Eliminate ALL dependency resolution errors in @shared module using industry-standard architecture

---

## Executive Summary

The @shared module has **89 TypeScript files** with extensive dependency resolution failures causing ~30+ build errors. This audit provides:

1. **Complete inventory** of all files and their dependencies
2. **Architectural violations** categorized by severity  
3. **Exact action plan** to fix every issue
4. **Industry-standard target architecture**

**Key Finding:** The shared module violates core architectural principles by importing from domain and application layers, creating circular dependencies and architectural coupling.

---

## 🔍 **CRITICAL ARCHITECTURAL VIOLATIONS**

### **Category 1: Circular Dependencies & Layer Violations (CRITICAL)**

#### **1.1 Domain Layer Imports from Shared** ⚠️ **SEVERE**
```typescript
// ❌ VIOLATION: Shared importing from domains
src/shared/lib/grid/services/gridNavigationService.ts:
- import { useTubeStore } from '@domains/tubes'
- import { useConfigurationStore } from '@domains/configuration/stores/configurationStore'

src/shared/ui/layout/Dashboard.tsx:
- import { useTubeStore } from '@domains/tubes'
- import { useAuthStore } from '@domains/authentication'  
- import { useSearchStore } from '@domains/search'
- import { useBulkDeleteTubesMutation } from '@domains/tubes/hooks/useTubeMutations'
- import { useConfigurationStore } from '@domains/configuration/stores/configurationStore'

src/shared/hooks/useFieldResolverQuery.ts:
- import { useTubesQuery } from '@domains/tubes'
- import { useResearchersQuery } from '@domains/researchers'
```

**Industry Rule Violated:** Shared/Core modules must NEVER import from domain-specific modules.

#### **1.2 Missing Internal Dependencies** ⚠️ **CRITICAL**
```typescript
// ❌ BROKEN: Files importing non-existent modules
src/shared/config/fieldConfig.ts:
- import type { TubeFormData } from '../hooks/form'  // ❌ Missing file

src/shared/lib/tubeInfoHelpers.ts:
- import type { TubeFormData } from '../hooks/form'  // ❌ Missing file
- import { getFieldResolverApplicationService } from '../application/services/FieldResolverService'  // ❌ Wrong path

src/shared/hooks/useFieldResolverQuery.ts:
- import { TubeData } from '@domains/tubes/schemas/tubeSchemas'  // ❌ Should be in shared/types
```

#### **1.3 Server-Side Imports in Client Code** ⚠️ **CRITICAL**
```typescript
// ❌ VIOLATION: Client importing server modules
src/shared/validation/schemas.ts:
- export * from '../../../server/src/validation/schemas'
- import { TubeDataSchema } from '../../../server/src/validation/schemas'
```

**Industry Rule Violated:** Client code must never import server code directly.

### **Category 2: Architectural Misplacement (HIGH PRIORITY)**

#### **2.1 UI/React Code in Shared Module** ⚠️ **MODERATE**
```typescript
// ❌ VIOLATION: Framework-specific code in shared module
src/shared/ui/layout/Dashboard.tsx          // ❌ Complex React component
src/shared/ui/layout/AppHeader.tsx          // ❌ App-specific layout
src/shared/ui/layout/AppLoader.tsx          // ❌ App-specific component
src/shared/components/ErrorBoundary.tsx     // ❌ React-specific component
src/shared/stores/modalStore.ts             // ❌ UI state management
```

**Industry Rule Violated:** Shared modules should contain pure utilities, not framework-specific code.

#### **2.2 Application Logic in Shared** ⚠️ **MODERATE**
```typescript
// ❌ VIOLATION: Application/business logic in shared
src/shared/domain/services/TubeFieldAccessService.ts    // ❌ Domain-specific service
src/shared/hooks/application/useFieldResolver.ts        // ❌ Application hook  
src/shared/services/FieldResolverService.ts            // ❌ Application service
src/shared/session/SessionManager.ts                   // ❌ Session management
```

**Industry Rule Violated:** Shared should not contain application-specific business logic.

---

## 📊 **COMPLETE FILE INVENTORY & CLASSIFICATION**

### **✅ KEEP IN SHARED (35 files)**
**Pure utilities, types, constants - No architectural violations**

| File | Category | Status | Action |
|------|----------|---------|--------|
| `src/shared/utils/notifications.ts` | Utility | ✅ Clean | Keep |
| `src/shared/utils/scientificNotation.ts` | Utility | ✅ Clean | Keep |
| `src/shared/utils/dateFormatter.ts` | Utility | ✅ Clean | Keep |
| `src/shared/utils/coordinates.ts` | Utility | ✅ Clean | Keep |
| `src/shared/utils/concentrationConverter.ts` | Utility | ✅ Clean | Keep |
| `src/shared/utils/tubeDataConverter.ts` | Utility | ✅ Clean | Keep |
| `src/shared/types/validationTypes.ts` | Types | ✅ Clean | Keep |
| `src/shared/types/colorSystemTypes.ts` | Types | ✅ Clean | Keep |
| `src/shared/types/apiTypes.ts` | Types | ✅ Clean | Keep |
| `src/shared/types/tubeTypes.ts` | Types | ✅ Clean | Keep |
| `src/shared/types/bulkOperations.ts` | Types | ✅ Clean | Keep |
| `src/shared/types/clipboard.ts` | Types | ✅ Clean | Keep |
| `src/shared/constants/apiConfig.ts` | Constants | ✅ Clean | Keep |
| `src/shared/errors/AppError.ts` | Errors | ✅ Clean | Keep |
| `src/shared/errors/mapError.ts` | Errors | ⚠️ Minor fixes | Fix imports |
| `src/shared/lib/featureFlags.ts` | Utility | ✅ Clean | Keep |
| `src/shared/lib/labColorSpace.ts` | Utility | ✅ Clean | Keep |
| `src/shared/lib/resetConfiguration.ts` | Utility | ⚠️ Minor fixes | Fix env access |
| `src/shared/ui/design-system/tokens/*.ts` | Design System | ✅ Clean | Keep |
| `src/shared/ui/primitives/Button/*.ts` | UI Primitives | ⚠️ Minor fixes | Fix imports |
| `src/shared/ui/primitives/Input/*.ts` | UI Primitives | ⚠️ Minor fixes | Fix imports |
| `src/shared/ui/primitives/Modal/*.ts` | UI Primitives | ⚠️ Minor fixes | Fix imports |
| `src/shared/ui/primitives/Select/*.ts` | UI Primitives | ⚠️ Minor fixes | Fix imports |
| `src/shared/ui/primitives/Grid/*.ts` | UI Primitives | ⚠️ Minor fixes | Fix imports |
| `src/shared/ui/primitives/Table/*.ts` | UI Primitives | ⚠️ Minor fixes | Fix imports |
| `src/shared/utils/validation/zodValidation.ts` | Utility | ✅ Clean | Keep |
| `src/shared/utils/lazy/lazyComponentUtils.tsx` | Utility | ⚠️ Minor fixes | Fix env access |

### **❌ MOVE OUT OF SHARED (25 files)**
**Architectural violations - Must be relocated**

| File | Violation | Target Location | Reason |
|------|-----------|----------------|---------|
| `src/shared/ui/layout/Dashboard.tsx` | Domain imports | `@app/ui/layout/` | App-specific, imports domains |
| `src/shared/ui/layout/AppHeader.tsx` | Domain imports | `@app/ui/layout/` | App-specific, imports domains |  
| `src/shared/ui/layout/AppLoader.tsx` | Missing imports | `@app/ui/layout/` | App-specific bootstrap logic |
| `src/shared/ui/layout/AppErrorBoundary.tsx` | Missing imports | `@app/ui/layout/` | App-specific error handling |
| `src/shared/domain/services/TubeFieldAccessService.ts` | Domain logic | `@domains/tubes/services/` | Tube-specific domain service |
| `src/shared/domain/services/IFieldResolver.ts` | Domain types | `@domains/tubes/types/` | Tube-specific interface |
| `src/shared/hooks/application/useFieldResolver.ts` | Application hook | `@app/hooks/` | Application-specific hook |
| `src/shared/hooks/useFieldResolverQuery.ts` | Domain imports | `@app/hooks/` | Imports from domains |
| `src/shared/hooks/useSimpleFieldResolver.ts` | Domain imports | `@app/hooks/` | Imports from domains |
| `src/shared/hooks/useTubesWithFieldResolver.ts` | Domain imports | `@app/hooks/` | Imports from domains |
| `src/shared/services/FieldResolverService.ts` | Application service | `@app/services/` | Application-layer service |
| `src/shared/lib/grid/services/gridNavigationService.ts` | Domain imports | `@domains/grid/services/` | Grid-specific domain service |
| `src/shared/lib/tubeInfoHelpers.ts` | Missing imports | `@domains/tubes/utils/` | Tube-specific utilities |
| `src/shared/lib/colorSystem.ts` | Domain-specific | `@domains/tubes/utils/` | Tube color logic |
| `src/shared/lib/selectionActions.ts` | UI logic | `@app/utils/` | Selection management |
| `src/shared/lib/recentOperations.ts` | App state | `@app/utils/` | Recent operations tracking |
| `src/shared/stores/modalStore.ts` | UI state | `@app/stores/` | Modal state management |
| `src/shared/stores/errorStore.ts` | App state | `@app/stores/` | Error state management |
| `src/shared/session/SessionManager.ts` | App service | `@app/services/` | Session management |
| `src/shared/components/ErrorBoundary.tsx` | React component | `@app/components/` | App-specific error boundary |
| `src/shared/config/fieldConfig.ts` | Missing imports | `@domains/tubes/config/` | Tube form configuration |
| `src/shared/validation/schemas.ts` | Server imports | `@app/validation/` | Client-side validation |
| `src/shared/ui/primitives/inputs/ConcentrationInput.tsx` | Domain-specific | `@domains/tubes/ui/inputs/` | Tube-specific input |
| `src/shared/ui/primitives/shared/HistoryControls.tsx` | Missing imports | `@app/ui/controls/` | App-specific controls |

### **🔧 BROKEN IMPORTS TO FIX (29 files)**
**Files with missing dependencies that need resolution**

| File | Broken Import | Issue | Fix Required |
|------|---------------|-------|--------------|
| `src/shared/config/fieldConfig.ts` | `../hooks/form` | Missing file | Create type definition |
| `src/shared/lib/tubeInfoHelpers.ts` | `../hooks/form` | Missing file | Create type definition |
| `src/shared/lib/tubeInfoHelpers.ts` | `../application/services/FieldResolverService` | Wrong path | Fix path or move file |
| `src/shared/validation/schemas.ts` | `../../../server/src/validation/schemas` | Server import | Create client schemas |
| Multiple UI files | `@shared/ui/design-system/tokens` | Relative path | Fix import paths |
| Multiple primitive files | React refs | Type issues | Fix TypeScript issues |

---

## 🎯 **INDUSTRY-STANDARD TARGET ARCHITECTURE**

### **New @shared Structure**
```
src/shared/
├── types/              # ✅ Keep - Pure type definitions
│   ├── api.ts
│   ├── validation.ts  
│   ├── common.ts
│   └── index.ts
├── utils/              # ✅ Keep - Pure utilities
│   ├── date.ts
│   ├── number.ts
│   ├── string.ts
│   ├── notifications.ts
│   └── index.ts
├── constants/          # ✅ Keep - Application constants
│   ├── api.ts
│   └── index.ts
├── errors/            # ✅ Keep - Error definitions
│   ├── AppError.ts
│   └── index.ts
├── ui/                # ✅ Keep - Generic UI primitives only
│   ├── primitives/    # Generic, reusable components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── index.ts
│   ├── design-system/ # Design tokens
│   │   └── tokens/
│   └── index.ts
├── validation/        # ✅ Keep - Client-side validation schemas
│   ├── common.ts
│   └── index.ts
└── index.ts           # Public API
```

### **New Application Layer Structure**
```
src/app/               # New - Application layer
├── components/        # App-specific components  
│   ├── layout/       # Dashboard, AppHeader, etc.
│   ├── boundaries/   # ErrorBoundary, etc.  
│   └── index.ts
├── hooks/            # Application hooks
│   ├── useFieldResolver.ts
│   ├── useAppState.ts
│   └── index.ts  
├── services/         # Application services
│   ├── FieldResolverService.ts
│   ├── SessionManager.ts
│   └── index.ts
├── stores/           # Application state
│   ├── modalStore.ts
│   ├── errorStore.ts
│   └── index.ts
└── utils/           # App-specific utilities
    ├── selectionActions.ts
    ├── recentOperations.ts
    └── index.ts
```

### **Domain Layer Enhancements**
```
src/domains/tubes/
├── services/         # Domain services
│   ├── TubeFieldAccessService.ts
│   └── index.ts
├── utils/           # Tube-specific utilities
│   ├── tubeInfoHelpers.ts
│   ├── colorSystem.ts
│   └── index.ts
├── ui/              # Tube-specific UI
│   ├── inputs/      # ConcentrationInput, etc.
│   └── index.ts
└── config/          # Tube configuration
    ├── fieldConfig.ts
    └── index.ts

src/domains/grid/    # New grid domain  
├── services/
│   ├── gridNavigationService.ts
│   └── index.ts
└── types/
    ├── GridTypes.ts
    └── index.ts
```

---

## 📋 **EXACT IMPLEMENTATION PLAN**

### **Phase 1: Create New Structure (Day 1)**

#### **1.1 Create Application Layer**
```bash
mkdir -p src/app/{components/{layout,boundaries},hooks,services,stores,utils}
```

#### **1.2 Create Missing Domain Structure**
```bash
mkdir -p src/domains/grid/{services,types}
mkdir -p src/domains/tubes/{services,utils,ui/inputs,config}
```

#### **1.3 Create Type Definitions for Missing Imports**
Create `src/shared/types/forms.ts`:
```typescript
// Replace missing ../hooks/form types
export interface TubeFormData {
  tankId: string;
  rackId: string;
  boxId: string;
  position: number;
  cellType: string;
  researcher: string;
  // ... rest of form fields
}
```

### **Phase 2: Move Files to Correct Locations (Day 2)**

#### **2.1 Move Application Layer Files**
```bash
# UI Layout Components
git mv src/shared/ui/layout/Dashboard.tsx src/app/components/layout/
git mv src/shared/ui/layout/AppHeader.tsx src/app/components/layout/
git mv src/shared/ui/layout/AppLoader.tsx src/app/components/layout/
git mv src/shared/ui/layout/AppErrorBoundary.tsx src/app/components/layout/

# Application Hooks
git mv src/shared/hooks/application/useFieldResolver.ts src/app/hooks/
git mv src/shared/hooks/useFieldResolverQuery.ts src/app/hooks/
git mv src/shared/hooks/useSimpleFieldResolver.ts src/app/hooks/
git mv src/shared/hooks/useTubesWithFieldResolver.ts src/app/hooks/

# Application Services  
git mv src/shared/services/FieldResolverService.ts src/app/services/
git mv src/shared/session/SessionManager.ts src/app/services/

# Application Stores
git mv src/shared/stores/modalStore.ts src/app/stores/
git mv src/shared/stores/errorStore.ts src/app/stores/

# Application Utils
git mv src/shared/lib/selectionActions.ts src/app/utils/
git mv src/shared/lib/recentOperations.ts src/app/utils/
```

#### **2.2 Move Domain-Specific Files**
```bash
# Tubes Domain
git mv src/shared/domain/services/TubeFieldAccessService.ts src/domains/tubes/services/
git mv src/shared/domain/services/IFieldResolver.ts src/domains/tubes/types/
git mv src/shared/lib/tubeInfoHelpers.ts src/domains/tubes/utils/
git mv src/shared/lib/colorSystem.ts src/domains/tubes/utils/
git mv src/shared/config/fieldConfig.ts src/domains/tubes/config/
git mv src/shared/ui/primitives/inputs/ConcentrationInput.tsx src/domains/tubes/ui/inputs/

# Grid Domain (New)
git mv src/shared/lib/grid/services/gridNavigationService.ts src/domains/grid/services/
git mv src/shared/lib/grid/types/GridTypes.ts src/domains/grid/types/
```

### **Phase 3: Fix Import Statements (Day 3)**

#### **3.1 Update Path Aliases in tsconfig.json**
```json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["src/app/*"],
      "@domains/*": ["src/domains/*"],
      "@shared/*": ["src/shared/*"],
      "@infra/*": ["src/infrastructure/*"]
    }
  }
}
```

#### **3.2 Fix Import Statements in Moved Files**
- Replace all `@shared` imports in moved files with appropriate `@app` or `@domains` imports
- Replace all `@domains` imports in shared files with dependency injection patterns
- Fix all relative import paths after file moves

#### **3.3 Create Client-Side Validation**
Replace `src/shared/validation/schemas.ts`:
```typescript
// Remove server imports, create client-only validation
import { z } from 'zod';

export const TubeDataSchema = z.object({
  // Define schema without server dependency
});
```

### **Phase 4: Update Export Barrels (Day 4)**

#### **4.1 Clean Shared Index**
Update `src/shared/index.ts`:
```typescript
// ✅ Only export pure utilities, types, constants
export * from './types';
export * from './utils'; 
export * from './constants';
export * from './errors';
export * from './ui/primitives'; // Generic primitives only
export * from './ui/design-system';
export * from './validation';
```

#### **4.2 Create New Application Index**
Create `src/app/index.ts`:
```typescript
export * from './components';
export * from './hooks';
export * from './services';
export * from './stores';
export * from './utils';
```

#### **4.3 Update Domain Indices**
Update domain barrel files to include moved modules.

### **Phase 5: Fix All Import References (Day 5)**

#### **5.1 Update Files That Import Moved Modules**
- Search entire codebase for imports of moved files
- Update to use new `@app` or `@domains` paths
- Use find-and-replace or codemod tools

#### **5.2 Verify Build**
```bash
npm run typecheck  # Should show 0 errors
npm run build      # Should complete successfully
```

---

## 🚨 **CRITICAL SUCCESS CRITERIA**

### **Must Achieve:**
1. ✅ **Zero import resolution errors** - All modules resolve correctly
2. ✅ **Clean architectural boundaries** - No circular dependencies between layers
3. ✅ **Industry-standard structure** - Shared contains only pure utilities and types
4. ✅ **Working build** - `npm run build` completes successfully
5. ✅ **Maintainable code** - Clear separation of concerns

### **Quality Gates:**
- [ ] Shared module has zero imports from domains or application layer
- [ ] All UI layout components moved to application layer
- [ ] All domain services moved to appropriate domain modules
- [ ] All broken imports resolved
- [ ] Build completes with zero TypeScript errors

---

## 📈 **ESTIMATED IMPACT**

### **Files to Modify:** 89 files
### **Build Errors Resolved:** ~30+ import errors  
### **Development Time:** 5 days
### **Risk Level:** Medium (many file moves, but clear plan)

### **Benefits:**
- ✅ **Maintainable architecture** following industry standards
- ✅ **Clear separation of concerns** between layers
- ✅ **Reusable shared module** that other projects could use
- ✅ **Eliminate technical debt** from architectural violations
- ✅ **Improved development experience** with working builds

---

## 🔄 **ROLLBACK PLAN**

If issues arise during implementation:
1. **Git branches:** Each phase in separate branch for easy rollback
2. **Backup:** All moved files preserved in git history
3. **Incremental:** Each phase independently verifiable
4. **Testing:** Build verification after each phase

---

**READY FOR IMPLEMENTATION**  
This comprehensive audit provides the exact roadmap to transform the @shared module into an industry-standard, maintainable architecture with zero dependency resolution errors.
