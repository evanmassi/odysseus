# Schema Migration Inventory - Pre-Migration Audit

**Date:** October 2, 2025  
**Status:** Pre-migration assessment  
**Purpose:** Complete inventory before shared schema implementation

---

## Step 1.1: Identify All Schema Files

### Client Schemas
- [ ] `client/src/domains/tubes/schemas/tubeSchemas.ts`
- [ ] `client/src/domains/researchers/schemas/` (if exists)
- [ ] `client/src/domains/authentication/schemas/` (if exists)
- [ ] `client/src/domains/configuration/schemas/` (if exists)
- [ ] `client/src/shared/types/` (any validation schemas)

### Server Schemas
- [ ] `server/src/validation/schemas.ts`
- [ ] `server/src/application/dto/TubeDto.ts`
- [ ] `server/src/domain/valueObjects/` (any schemas)

### Action Items:
1. Run `find client -name "*schema*.ts"` to find all client schemas
2. Run `find server -name "*schema*.ts"` to find all server schemas
3. List each file with line count and dependencies

---

## Step 1.2: Dependency Analysis

### Zod Version Check
- [ ] Client Zod version: ____________
- [ ] Server Zod version: ____________
- [ ] Versions match? YES / NO

### TypeScript Version Check
- [ ] Client TS version: ____________
- [ ] Server TS version: ____________
- [ ] Root TS version (if exists): ____________

### Node Version
- [ ] Current Node version: ____________
- [ ] NPM version: ____________
- [ ] Supports workspaces (npm 7+)? YES / NO

---

## Step 1.3: Import Graph Mapping

For each schema file, map:
1. What imports it (dependents)
2. What it imports (dependencies)
3. Circular dependencies (if any)

### Tube Schemas Example:
```
client/src/domains/tubes/schemas/tubeSchemas.ts
├── Imported by:
│   ├── client/src/domains/tubes/services/TubeService.ts
│   ├── client/src/domains/tubes/hooks/useTubeForm.ts
│   ├── client/src/domains/tubes/hooks/useTubeMutations.ts
│   └── ... (find all with grep)
└── Imports:
    └── zod
```

**Action:** Run this for each schema file before migration.

---

## Step 1.4: Test Coverage Assessment

- [ ] Client tests using tube schemas: ____________ files
- [ ] Server tests using tube schemas: ____________ files
- [ ] Integration tests: ____________ files
- [ ] Total test files affected: ____________

**Risk Level:** (Low / Medium / High based on test count)

---

## Step 1.5: Git Safety Checklist

- [ ] Current branch: ____________
- [ ] All changes committed? YES / NO
- [ ] Create backup branch: `git branch backup-pre-schema-migration`
- [ ] Create working branch: `git checkout -b feat/shared-schemas`
- [ ] Tag current state: `git tag pre-shared-schemas`

---

## Step 1.6: Build Baseline

Before making ANY changes, establish baseline:

- [ ] Client builds successfully? YES / NO
  - Errors: ____________
- [ ] Server builds successfully? YES / NO
  - Errors: ____________
- [ ] Tests pass? YES / NO
  - Failures: ____________
- [ ] Package successfully? YES / NO

**Baseline established:** ____________ (timestamp)

---

## Completion Checklist

Before proceeding to Step 2:
- [ ] All schema files identified and documented
- [ ] Dependency versions verified and compatible
- [ ] Import graph mapped for major schemas
- [ ] Test coverage assessed
- [ ] Git safety measures in place
- [ ] Build baseline established
- [ ] Team notified of migration start (if applicable)

**Sign-off:** Ready to proceed? YES / NO

---

## Next Steps After Completion

1. Review this inventory with team (if applicable)
2. Proceed to Step 2: Workspace Infrastructure Setup
3. Reference this document during migration for validation
