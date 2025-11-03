# File Structure Standardization Plan

**Date:** September 26, 2025  
**Status:** 🚨 **CRITICAL** - Must fix before Phase 1 migration

## Issues Identified

### **Critical Problems:**
1. **Duplicate/Overlapping Directories:**
   - `components/` and `ui/` both contain React components
   - `domain/` and `domains/` both contain domain logic
   - `app/` and `application/` unclear boundaries

2. **Inconsistent Naming:**
   - Mixed singular/plural: `domain` vs `domains`, `hook` vs `hooks`
   - Mixed casing patterns across files and folders

3. **Architectural Confusion:**
   - Layer-first vs feature-first patterns mixed
   - Shared components scattered across multiple locations

## Target Structure (Industry Standard)

```
client/src/
├── app/                      # App shell only
│   ├── providers/
│   ├── routes/
│   ├── App.tsx
│   └── bootstrap.tsx
├── domains/                  # Feature-first (DDD)
│   ├── tubes/
│   │   ├── api/             # React Query hooks
│   │   ├── ui/
│   │   │   ├── components/
│   │   │   └── pages/
│   │   ├── hooks/           # Feature hooks
│   │   ├── store/           # UI-only Zustand
│   │   ├── schemas/         # Zod validation
│   │   ├── types.ts
│   │   └── index.ts         # Public API
│   └── researchers/
├── shared/                   # Cross-cutting only
│   ├── ui/
│   │   └── primitives/      # Button, Modal, Input
│   ├── hooks/               # Generic hooks
│   ├── lib/                 # Pure utilities
│   ├── styles/
│   └── test/
└── infrastructure/           # External concerns
    ├── http/                # API client
    ├── socket/              # WebSocket
    └── electron/            # IPC wrappers
```

## Migration Steps

### **Step 1: Consolidate Duplicate Directories**
```bash
# Merge domain/ into domains/
git mv client/src/domain/* client/src/domains/
rmdir client/src/domain

# Merge application/ into app/ 
git mv client/src/application/* client/src/app/
rmdir client/src/application
```

### **Step 2: Reorganize Components**
- Move shared components: `components/` → `shared/ui/primitives/`
- Move feature components: Into respective `domains/*/ui/components/`
- Remove duplicate `ui/` directory

### **Step 3: Standardize Naming**
- All directories: plural (`hooks/`, `schemas/`, `components/`)
- React components: `PascalCase.tsx`
- Hooks: `use-*.ts`
- Stores: `*.store.ts`

### **Step 4: Add Path Aliases**
```json
// tsconfig.json
{
  "paths": {
    "@app/*": ["src/app/*"],
    "@domains/*": ["src/domains/*"], 
    "@shared/*": ["src/shared/*"],
    "@infra/*": ["src/infrastructure/*"]
  }
}
```

## File Naming Standards

| Type | Pattern | Example |
|------|---------|---------|
| React Components | PascalCase.tsx | `TubeInfoPanel.tsx` |
| Hooks | use-*.ts | `use-tube-info.ts` |
| Zustand Stores | *.store.ts | `selection.store.ts` |
| Zod Schemas | kebab-case.ts | `tube-schema.ts` |
| Utilities | kebab-case.ts | `string-format.ts` |
| Tests | *.test.ts(x) | `TubeInfoPanel.test.tsx` |

## Import Rules

### **Allowed:**
```typescript
// Inter-domain via public API
import { TubeInfoPanel } from '@domains/tubes';

// Shared utilities
import { Button } from '@shared/ui/primitives';

// Infrastructure
import { apiClient } from '@infra/http';
```

### **Not Allowed:**
```typescript
// Deep imports into domain internals
import { TubeCell } from '@domains/tubes/ui/components/TubeCell';

// Cross-domain direct imports
import { ResearcherSelect } from '@domains/researchers/ui/components/ResearcherSelect';
```

## Immediate Actions Required

**This structure standardization MUST be completed before Phase 1 migration begins.**

1. ✅ Audit current structure (completed)
2. 🟡 Execute consolidation plan
3. 🟡 Update import paths
4. 🟡 Add path aliases
5. 🟡 Verify build/tests pass
6. 🟡 Update AGENTS.md with new structure

**Status:** 🚨 **BLOCKING** - Phase 1 cannot proceed until this is resolved.
