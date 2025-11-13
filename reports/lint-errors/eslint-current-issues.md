# ESLint Current Issues Report

**Generated:** 2025-11-13T00:44:28.422Z

## Summary

- **Total Files Analyzed:** 285
- **Files With Issues:** 39
- **Total Errors:** 31
- **Total Warnings:** 117

## Issues by Category

### @typescript-eslint/no-explicit-any

- **Type:** WARN
- **Count:** 117

**Locations:**

- `src/app/bootstrap/types.ts:44:28`
  - Unexpected any. Specify a different type.
- `src/domains/admin/ui/components/AdminSettingsModal.tsx:136:21`
  - Unexpected any. Specify a different type.
- `src/domains/search/engine/SearchEngine.ts:163:60`
  - Unexpected any. Specify a different type.
- `src/domains/tubes/hooks/useTubeQueries.ts:135:41`
  - Unexpected any. Specify a different type.
- `src/domains/tubes/hooks/useTubeQueries.ts:135:53`
  - Unexpected any. Specify a different type.
- `src/domains/tubes/hooks/useTubeQueries.ts:135:58`
  - Unexpected any. Specify a different type.
- `src/domains/tubes/hooks/useTubeQueries.ts:191:27`
  - Unexpected any. Specify a different type.
- `src/domains/tubes/hooks/useTubeQueries.ts:265:68`
  - Unexpected any. Specify a different type.
- `src/domains/tubes/services/TubeFieldAccessService.ts:67:16`
  - Unexpected any. Specify a different type.
- `src/domains/tubes/services/TubeFieldAccessService.ts:122:17`
  - Unexpected any. Specify a different type.

... and 107 more instances

---

### import/order

- **Type:** ERROR
- **Count:** 18

**Locations:**

- `src/app/hooks/useFieldResolver.ts:36:1`
  - `@app/types/fieldTypeMapping` type import should occur before type import of `@domains/tubes/types/FieldResolver`
- `src/app/hooks/useSimpleFieldResolver.ts:13:1`
  - There should be at least one empty line between import groups
- `src/app/hooks/useSimpleFieldResolver.ts:13:1`
  - `@app/types/fieldTypeMapping` type import should occur before type import of `@shared/types/tubeTypes`
- `src/app/hooks/useSimpleFieldResolver.ts:14:1`
  - `@app/types/fieldTypeMapping` import should occur before import of `@shared/utils/dateUtils`
- `src/app/services/FieldResolverService.ts:5:1`
  - There should be no empty line within import group
- `src/app/services/FieldResolverService.ts:7:1`
  - `../hooks/useFieldResolver` type import should occur before type import of `@odysseus/shared-schemas`
- `src/app/services/FieldResolverService.ts:8:1`
  - `@domains/tubes/types/FieldResolver` type import should occur before type import of `@odysseus/shared-schemas`
- `src/app/services/FieldResolverService.ts:9:1`
  - There should be at least one empty line between import groups
- `src/app/services/FieldResolverService.ts:9:1`
  - `@app/types/fieldTypeMapping` type import should occur before type import of `@odysseus/shared-schemas`
- `src/app/services/FieldResolverService.ts:10:1`
  - `@app/types/fieldTypeMapping` import should occur before type import of `@odysseus/shared-schemas`

... and 8 more instances

---

### @typescript-eslint/prefer-nullish-coalescing

- **Type:** ERROR
- **Count:** 8

**Locations:**

- `src/domains/admin/utils/auditLogFormatters.ts:244:29`
  - Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- `src/infrastructure/connection/networkMonitor.ts:266:39`
  - Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- `src/infrastructure/connection/networkMonitor.ts:266:60`
  - Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- `src/infrastructure/connection/networkMonitor.ts:290:39`
  - Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- `src/infrastructure/connection/networkMonitor.ts:290:60`
  - Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- `src/shared/types/colorSystemTypes.ts:92:41`
  - Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- `src/shared/types/colorSystemTypes.ts:93:41`
  - Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- `src/shared/types/colorSystemTypes.ts:101:45`
  - Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.

---

### @typescript-eslint/no-unused-vars

- **Type:** ERROR
- **Count:** 4

**Locations:**

- `src/domains/authentication/services/AuthenticationService.ts:15:15`
  - 'TokenPair' is defined but never used. Allowed unused vars must match /^_/u.
- `src/domains/authentication/services/AuthenticationService.ts:19:3`
  - 'AuthApiResponse' is defined but never used. Allowed unused vars must match /^_/u.
- `src/domains/authentication/services/AuthenticationService.ts:20:3`
  - 'RegisterWithResearcherApiResponse' is defined but never used. Allowed unused vars must match /^_/u.
- `src/infrastructure/connection/networkMonitor.ts:14:15`
  - 'NetworkInformation' is defined but never used. Allowed unused vars must match /^_/u.

---

### no-var

- **Type:** ERROR
- **Count:** 1

**Locations:**

- `src/types/global.d.ts:25:3`
  - Unexpected var, use let or const instead.

---

## Recommendations

### Priority 1: Import Organization (18 errors)
- Fix import order violations
- Follow configured import grouping and alphabetization

### Priority 2: Type Safety (117 warnings)
- Replace `any` types with proper type definitions
- Reference centralized types from domain layer

### Priority 3: Nullish Coalescing (8 errors)
- Use `??` instead of `||` for null/undefined checks
- Prevents falsy value bugs (0, '', false)

### Priority 4: Unused Variables (4 errors)
- Remove unused imports and variables
- Prefix with `_` if intentionally unused

### Priority 5: No var (1 error)
- Replace `var` with `const` or `let`

