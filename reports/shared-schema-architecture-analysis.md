# Shared Schema Architecture - Comprehensive Analysis

**Date:** October 2, 2025  
**Project:** Odysseus Liquid Nitrogen Tube Inventory System  
**Purpose:** Evaluate industry-standard shared schema package approach for long-term maintainability

---

## Executive Summary

**Current Problem:** Client and server have diverged schemas causing runtime validation failures, type mismatches, and maintenance overhead. Every schema change requires manual synchronization across two codebases.

**Proposed Solution:** Monorepo workspace with shared schema package as single source of truth for data contracts.

**Recommendation:** Implement shared schemas but with phased rollout and proper tooling to mitigate migration risks.

---

## Architecture Overview

### Current Architecture (Dual Schema Problem)
```
odysseus-app/
├── client/src/domains/tubes/schemas/
│   └── tubeSchemas.ts              # Client validation schemas
├── server/src/validation/
│   └── schemas.ts                   # Server validation schemas
└── [PROBLEM] Two independent sources of truth
```

**Issues:**
- Manual synchronization required
- No compile-time safety across network boundary
- Easy to introduce breaking changes
- Runtime failures only discovered in production

### Proposed Architecture (Shared Package)
```
odysseus-app/
├── packages/
│   └── shared-schemas/              # ← Single source of truth
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── tubes/
│       │   │   ├── tubeSchemas.ts
│       │   │   ├── tubeTypes.ts
│       │   │   └── index.ts
│       │   ├── researchers/
│       │   ├── common/
│       │   └── index.ts
│       └── dist/                    # Compiled output
├── client/
│   ├── package.json                 # "shared-schemas": "workspace:*"
│   └── src/
│       └── domains/tubes/
│           └── (imports from shared-schemas)
├── server/
│   ├── package.json                 # "shared-schemas": "workspace:*"
│   └── src/
│       └── validation/
│           └── (imports from shared-schemas)
└── package.json                      # Workspace root
```

---

## Implementation Approaches

### Option A: NPM Workspaces (Recommended)
**Setup:**
```json
// Root package.json
{
  "private": true,
  "workspaces": [
    "packages/*",
    "client",
    "server"
  ]
}

// packages/shared-schemas/package.json
{
  "name": "@odysseus/shared-schemas",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "peerDependencies": {
    "zod": "^3.22.0"
  }
}

// client/package.json & server/package.json
{
  "dependencies": {
    "@odysseus/shared-schemas": "workspace:*"
  }
}
```

**Pros:**
- Native npm support (no extra tools)
- Works with existing npm scripts
- Local development uses symlinks (instant updates)
- Production builds correctly

**Cons:**
- Requires npm 7+ or pnpm/yarn workspaces
- Need to rebuild shared package on changes
- Initial setup complexity

### Option B: Yarn/PNPM Workspaces
Similar to npm but with better tooling support and faster installs.

### Option C: Lerna/Nx Monorepo
More complex but adds advanced features (caching, affected detection, etc.). Overkill for this project.

---

## Detailed Implementation Plan

### Phase 1: Infrastructure Setup (2-3 hours)

#### 1.1 Create Workspace Structure
```bash
# Create shared package
mkdir -p packages/shared-schemas/src
cd packages/shared-schemas
npm init -y

# Setup TypeScript
npm install -D typescript @types/node
npx tsc --init
```

#### 1.2 Configure TypeScript
```json
// packages/shared-schemas/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 1.3 Setup Root Workspace
```json
// Root package.json
{
  "private": true,
  "workspaces": [
    "packages/*",
    "client",
    "server"
  ],
  "scripts": {
    "build:schemas": "npm run build -w @odysseus/shared-schemas",
    "dev:schemas": "npm run watch -w @odysseus/shared-schemas",
    "build": "npm run build:schemas && npm run build -w client && npm run build -w server"
  }
}
```

### Phase 2: Schema Migration (3-4 hours)

#### 2.1 Create Shared Schema Module
```typescript
// packages/shared-schemas/src/tubes/tubeSchemas.ts
import { z } from 'zod';

/**
 * SINGLE SOURCE OF TRUTH for tube data contracts
 * Used by both client and server
 */

// Location schema
export const tubeLocationSchema = z.object({
  tankId: z.string().min(1, "Tank ID is required"),
  rackId: z.string().min(1, "Rack ID is required"),
  boxId: z.string().min(1, "Box ID is required"),
  position: z.number().int().min(1).max(81)
});

// Sample schema
export const tubeSampleSchema = z.object({
  cellType: z.string().min(1, "Cell type is required"),
  donorInternalId: z.string().optional(),
  donorSourceId: z.string().optional(),
  concentration: z.number().optional(),
  concentrationUnit: z.enum(['c/v', 'c/mL']).optional(),
  date: z.string().optional(),
  media: z.union([
    z.string(),
    z.object({
      type: z.string().optional(),
      supplements: z.string().optional(),
      selection: z.string().optional()
    })
  ]).optional(),
  cultureCondition: z.string().optional(),
  lotNumber: z.string().optional(),
  notes: z.string().optional()
});

// Complete tube data
export const tubeDataSchema = z.object({
  id: z.string().min(1), // Accepts both UUID and custom formats
  location: tubeLocationSchema,
  sample: tubeSampleSchema,
  researcher: z.string().min(1),
  timestamps: z.object({
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date()
  })
});

// HTTP request schemas
export const createTubeRequestSchema = z.object({
  location: tubeLocationSchema,
  sample: tubeSampleSchema,
  researcher: z.string().optional()
});

export const updateTubeRequestSchema = createTubeRequestSchema.partial();

// TypeScript types (auto-generated from schemas)
export type TubeData = z.infer<typeof tubeDataSchema>;
export type TubeLocation = z.infer<typeof tubeLocationSchema>;
export type TubeSample = z.infer<typeof tubeSampleSchema>;
export type CreateTubeRequest = z.infer<typeof createTubeRequestSchema>;
export type UpdateTubeRequest = z.infer<typeof updateTubeRequestSchema>;
```

#### 2.2 Barrel Export
```typescript
// packages/shared-schemas/src/index.ts
export * from './tubes/tubeSchemas';
export * from './researchers/researcherSchemas';
export * from './common/timestampSchemas';
```

### Phase 3: Client Migration (2-3 hours)

#### 3.1 Install Shared Package
```bash
cd client
npm install @odysseus/shared-schemas@workspace:*
```

#### 3.2 Update Imports
```typescript
// Before: client/src/domains/tubes/schemas/tubeSchemas.ts
import { z } from 'zod';
export const tubeDataSchema = z.object({ ... });

// After: Use shared schemas
import { 
  tubeDataSchema,
  createTubeRequestSchema,
  type TubeData,
  type CreateTubeRequest 
} from '@odysseus/shared-schemas';
```

#### 3.3 Remove Duplicate Schemas
- Delete `client/src/domains/tubes/schemas/tubeSchemas.ts`
- Update all imports to use `@odysseus/shared-schemas`
- Fix any client-specific extensions

### Phase 4: Server Migration (2-3 hours)

#### 4.1 Update Server Validation
```typescript
// Before: server/src/validation/schemas.ts
export const CreateTubeHttpSchema = z.object({ ... });

// After: Use shared schemas
import { createTubeRequestSchema } from '@odysseus/shared-schemas';
export const CreateTubeHttpSchema = createTubeRequestSchema;
```

#### 4.2 Update DTOs
```typescript
// server/src/application/dto/TubeDto.ts
import { 
  type TubeData,
  type CreateTubeRequest,
  type UpdateTubeRequest 
} from '@odysseus/shared-schemas';

// DTOs now just re-export shared types
export type { TubeData, CreateTubeRequest, UpdateTubeRequest };
```

### Phase 5: Development Workflow Setup (1 hour)

#### 5.1 Hot Reload Configuration
```json
// package.json scripts
{
  "scripts": {
    "dev": "concurrently \"npm run dev:schemas\" \"npm run dev:client\" \"npm run dev:server\"",
    "dev:schemas": "npm run watch -w @odysseus/shared-schemas",
    "dev:client": "npm run dev -w client",
    "dev:server": "npm run dev -w server"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

#### 5.2 Build Pipeline
```json
{
  "scripts": {
    "prebuild": "npm run build -w @odysseus/shared-schemas",
    "build": "npm run build -w client && npm run build -w server",
    "clean": "rm -rf packages/shared-schemas/dist client/dist server/dist"
  }
}
```

---

## Potential Fail Points & Mitigation

### Critical Fail Points

#### 1. Build Order Dependencies
**Problem:** Server/client build before shared package is compiled
```
Error: Cannot find module '@odysseus/shared-schemas'
```

**Mitigation:**
- Use `prebuild` hooks to ensure shared package builds first
- Add explicit build order in CI/CD pipeline
- Use tools like `nx` or `turborepo` for dependency-aware builds

#### 2. Type Mismatches During Migration
**Problem:** Existing code expects old schema shape
```typescript
// Old code expects flat structure
const { tankId, rackId } = tubeData;

// New shared schema is nested
const { location: { tankId, rackId } } = tubeData;
```

**Mitigation:**
- Migrate in phases (one domain at a time)
- Use TypeScript strict mode to catch mismatches at compile time
- Create adapter functions for gradual migration

#### 3. Hot Module Replacement (HMR) Breaking
**Problem:** Changes to shared schemas don't trigger HMR in client/server
```
[vite] hmr update /client/src/components/TubeForm.tsx (no update)
```

**Mitigation:**
- Run shared package in watch mode: `tsc --watch`
- Configure Vite to watch node_modules/@odysseus/shared-schemas
- Use `nodemon` to restart server on shared package changes

#### 4. Circular Dependencies
**Problem:** Client imports shared schemas, shared schemas import client utils
```
Error: Circular dependency detected
```

**Mitigation:**
- Keep shared package dependency-free (only Zod)
- No imports from client/server in shared package
- Use pure functions only

#### 5. Version Conflicts
**Problem:** Client expects shared-schemas v2, server uses v1
```
Type 'CreateTubeRequestV2' is not assignable to type 'CreateTubeRequestV1'
```

**Mitigation:**
- Always use `workspace:*` protocol (auto-syncs versions)
- Run `npm install` in root after schema changes
- Use monorepo tools to lock versions

### Non-Critical Fail Points

#### 6. IDE Auto-Import Confusion
**Problem:** IDE imports from old location instead of shared package
```typescript
// Wrong
import { TubeData } from '../schemas/tubeSchemas';

// Correct
import { TubeData } from '@odysseus/shared-schemas';
```

**Mitigation:**
- Delete old schema files immediately after migration
- Configure IDE path mappings
- Use ESLint rule to ban relative imports for schemas

#### 7. Bundle Size Increase
**Problem:** Same schemas bundled in both client and server
```
Warning: Duplicate zod validators in bundle
```

**Mitigation:**
- Tree-shaking eliminates unused validators
- Use dynamic imports for large validation schemas
- Split schemas into multiple packages if needed

#### 8. Test Environment Issues
**Problem:** Jest/Vitest can't resolve workspace packages
```
Error: Cannot find module '@odysseus/shared-schemas'
```

**Mitigation:**
```javascript
// jest.config.js / vitest.config.ts
moduleNameMapper: {
  '^@odysseus/shared-schemas$': '<rootDir>/../packages/shared-schemas/src'
}
```

---

## Comprehensive Pros & Cons

### Pros

#### Development Benefits
✅ **Single Source of Truth**
- Schema changes automatically sync to client and server
- Impossible for schemas to drift
- One place to update validation rules

✅ **Type Safety Across Network Boundary**
- Client and server guaranteed to use same types
- Compile-time errors for breaking changes
- Refactoring safety (rename a field, TypeScript errors everywhere)

✅ **Reduced Code Duplication**
- ~50% less validation code
- Shared utilities (date parsing, ID generation)
- Consistent error messages

✅ **Better Developer Experience**
- Auto-complete works for API contracts
- Go-to-definition jumps to schema source
- Easier onboarding (one place to learn types)

✅ **Prevents Entire Classes of Bugs**
- No more "client sends X, server expects Y"
- No UUID vs custom ID mismatches
- No optional vs required field confusion

#### Operational Benefits
✅ **Easier API Versioning**
- Version schema package: `@odysseus/shared-schemas@2.0.0`
- Both client and server upgrade together
- Clear breaking change detection

✅ **Better Testing**
- Test schemas once, use everywhere
- Mock data generators share types
- Integration tests guaranteed to match

✅ **Documentation**
- Schemas ARE the documentation
- Generate OpenAPI specs from schemas
- Auto-generate TypeScript SDK for external consumers

### Cons

#### Implementation Costs
❌ **Initial Migration Effort**
- 8-12 hours total development time
- All imports must be updated
- Potential for runtime errors during transition

❌ **Build Complexity**
- Extra build step (compile shared package first)
- More complex CI/CD pipeline
- Debugging build order issues

❌ **Development Workflow Changes**
- Must rebuild shared package on schema changes
- Extra terminal window for watch mode
- Slower cold starts (compile schemas before app)

#### Technical Challenges
❌ **Tooling Overhead**
- Requires monorepo setup (npm 7+, pnpm, or yarn workspaces)
- More configuration files (tsconfig, package.json in shared package)
- Team must learn workspace commands

❌ **Hot Reload Complexity**
- Vite/nodemon don't auto-detect shared package changes
- Manual restarts sometimes needed
- Extra config for HMR to work

❌ **Dependency Management**
- Shared package needs own dependencies (zod)
- Potential for version conflicts
- More complex lockfile

#### Operational Risks
❌ **Breaking Change Amplification**
- One schema change breaks both client AND server
- Must coordinate releases carefully
- Harder to deploy client/server independently

❌ **Deployment Complexity**
- Must ensure shared package is built in CI
- Docker builds need workspace awareness
- Slightly larger deployment artifacts

---

## Migration Risk Assessment

### High Risk Areas
1. **Build pipeline breakage** (80% probability if not careful)
   - Mitigation: Test build in isolated branch first
   
2. **Type mismatches causing runtime errors** (60% probability)
   - Mitigation: Migrate one domain at a time, comprehensive testing

3. **Developer confusion during migration** (50% probability)
   - Mitigation: Clear documentation, pair programming

### Medium Risk Areas
4. **HMR not working** (40% probability)
   - Mitigation: Acceptable, manual restarts during schema dev

5. **CI/CD pipeline failures** (30% probability)
   - Mitigation: Update CI config before merging

### Low Risk Areas
6. **Bundle size increase** (10% probability)
   - Mitigation: Tree-shaking handles it

7. **Performance degradation** (5% probability)
   - Mitigation: Negligible impact, schemas are tiny

---

## Recommended Rollout Strategy

### Stage 1: Proof of Concept (Week 1)
- [ ] Setup workspace structure
- [ ] Migrate ONE simple domain (e.g., researchers)
- [ ] Test build pipeline
- [ ] Verify HMR works acceptably
- **Go/No-Go Decision Point**

### Stage 2: Core Domain Migration (Week 2)
- [ ] Migrate tube schemas (biggest domain)
- [ ] Update all imports
- [ ] Run full test suite
- [ ] Deploy to staging

### Stage 3: Remaining Domains (Week 3)
- [ ] Migrate configuration, authentication, search
- [ ] Remove all old schema files
- [ ] Update team documentation

### Stage 4: Optimization (Week 4)
- [ ] Setup automated schema versioning
- [ ] Generate API documentation from schemas
- [ ] Create schema changelog tooling

---

## Alternative: Hybrid Approach (Lower Risk)

**Concept:** Start with shared types only, keep validation separate

```typescript
// packages/shared-types (no Zod dependency)
export interface TubeData {
  id: string;
  location: TubeLocation;
  // ...
}

// Client validates with Zod
const tubeDataSchema = z.object({ ... }) satisfies z.ZodType<TubeData>;

// Server validates with Zod
const tubeDataSchema = z.object({ ... }) satisfies z.ZodType<TubeData>;
```

**Pros:**
- Simpler (just TypeScript types, no build step)
- Lower migration effort
- Still prevents type drift

**Cons:**
- Validation logic still duplicated
- Can still drift if not careful
- Less compile-time safety

---

## Decision Matrix

| Factor | Current State | Shared Schemas | Hybrid Types |
|--------|--------------|----------------|--------------|
| Type Safety | ❌ Low | ✅ High | ⚠️ Medium |
| Maintenance | ❌ High effort | ✅ Low effort | ⚠️ Medium |
| Build Complexity | ✅ Simple | ❌ Complex | ✅ Simple |
| Migration Risk | N/A | ❌ High | ✅ Low |
| Long-term Value | ❌ Technical debt | ✅ Excellent | ⚠️ Good |
| Time to Implement | N/A | 12-16 hours | 4-6 hours |

---

## Final Recommendation

### Immediate: Fix Current Issues (Done ✅)
Keep current approach but document the technical debt.

### Short-term (Next 2-4 weeks): Hybrid Approach
- Create `@odysseus/shared-types` package (TypeScript interfaces only)
- Migrate types but keep validation separate
- Low risk, immediate value

### Long-term (Next Quarter): Full Shared Schemas
- Convert to full shared schemas with Zod
- Setup proper monorepo tooling
- Invest in developer experience improvements

### Success Criteria
- ✅ Zero schema drift issues
- ✅ Breaking changes caught at compile time
- ✅ Developer can add new field in <5 minutes
- ✅ CI/CD builds reliably
- ✅ Hot reload works acceptably

---

## Appendix: Common Commands

```bash
# Development
npm run dev                    # Start all services with schema watch
npm run dev:schemas           # Watch shared schemas only

# Building
npm run build                 # Build everything (schemas first)
npm run build:schemas         # Build shared schemas only
npm run clean                 # Clean all build artifacts

# Adding new schema
cd packages/shared-schemas
# Add schema to src/
npm run build
# Client/server auto-pick up changes

# Troubleshooting
npm install                   # Re-link workspaces
npm run clean && npm run build # Full rebuild
```

---

## Conclusion

**Shared schemas are the industry-standard long-term solution**, but they require upfront investment and careful migration. The current patched approach will work but accumulates technical debt.

**Recommended path:** Start with hybrid (shared types), prove the workflow, then migrate to full shared schemas when team is comfortable with monorepo tooling.

**Estimated ROI:** 
- Initial cost: 12-16 hours
- Ongoing savings: ~2-4 hours per month (avoiding schema drift debugging)
- Break-even: 4-6 months
- Long-term value: Prevents entire classes of bugs, enables faster feature development
