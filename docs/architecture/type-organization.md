# Type Organization Guide

**Last Updated:** 2025-01-12
**Status:** Active - Production Standard

## Overview

This guide documents the centralized type organization structure for the Odysseus server codebase. Following Clean Architecture principles, all types are organized by domain and layer responsibility to maintain a single source of truth and prevent duplication.

---

## Type Directory Structure

```
server/src/domain/types/
├── repository/              # Repository-layer types
│   ├── SearchCriteria.ts   # Query and filter interfaces
│   ├── Stats.ts            # Statistics and summary interfaces
│   ├── QueryOptions.ts     # Pagination and query options
│   └── index.ts            # Barrel export
├── services/               # Service-layer types
│   ├── AccessControl.ts    # Permission and access types
│   ├── TubePosition.ts     # Position validation types
│   ├── Validation.ts       # Tube validation types
│   └── index.ts            # Barrel export
├── validation.ts           # Domain validation result types
├── configuration.ts        # Configuration-specific types
└── position.ts            # Position-related types
```

---

## Repository Types (`domain/types/repository/`)

### SearchCriteria.ts

**Purpose:** Query and filter interfaces for all repositories.

**Exports:**

- `TubeSearchCriteria` - Multi-field search with filters, pagination, sorting
- `ResearcherSearchCriteria` - Researcher filtering options
- `UserSearchCriteria` - User filtering options

**Usage:**

```typescript
import type { TubeSearchCriteria } from '@domain/types/repository';

const criteria: TubeSearchCriteria = {
  query: 'HEK293',
  tankIds: ['tank1'],
  sortBy: 'createdAt',
  sortOrder: 'desc',
  limit: 50,
};
```

---

### Stats.ts

**Purpose:** Statistics and summary interfaces for repository analytics.

**Exports:**

- `TubeRepositoryStats` - Tube inventory statistics
- `ResearcherUsageStats` - Per-researcher usage metrics
- `ResearcherRepositoryStats` - Overall researcher statistics
- `UserActivitySummary` - User activity metrics
- `UserRepositoryStats` - User repository statistics
- `EquipmentSummary` - Equipment hierarchy summary
- `CapacityInfo` - Storage capacity information
- `ConfigurationRepositoryStats` - Configuration statistics

**Usage:**

```typescript
import type { TubeRepositoryStats } from '@domain/types/repository';

async getStats(): Promise<TubeRepositoryStats> {
  return {
    totalTubes: 1500,
    tubesByTank: { tank1: 500, tank2: 1000 },
    completionRate: 0.95,
    expirationRate: 0.02
  };
}
```

---

### QueryOptions.ts

**Purpose:** Common pagination and query configuration types.

**Exports:**

- `PaginatedResult<T>` - Standard paginated response wrapper
- `QueryOptions` - Common query parameters (limit, offset, date range)

**Usage:**

```typescript
import type { PaginatedResult, QueryOptions } from '@domain/types/repository';

async findAll(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>> {
  return {
    items: [...entries],
    pagination: {
      total: 1000,
      limit: 50,
      offset: 0,
      hasMore: true
    }
  };
}
```

---

## Service Types (`domain/types/services/`)

### AccessControl.ts

**Purpose:** Access control and permission checking types.

**Exports:**

- `AccessResult` - Single access check result
- `BulkAccessResult` - Bulk operation access check
- `BulkOperation` - Types of bulk operations ('edit' | 'delete' | 'move')

**Usage:**

```typescript
import type { AccessResult, BulkOperation } from '@domain/types/services';

async canEditTube(user: User, tube: Tube): Promise<AccessResult> {
  return {
    allowed: true,
    reason: 'User owns tube',
    metadata: { userId: user.id }
  };
}
```

---

### TubePosition.ts

**Purpose:** Position validation and box statistics types.

**Exports:**

- `PositionValidation` - Basic validation result (isValid, errors)
- `PositionValidationWithWarnings` - Validation with warnings
- `PositionValidationResult` - Full validation with conflict info
- `BoxStatistics` - Box occupancy and capacity statistics

**Usage:**

```typescript
import type { PositionValidationResult, BoxStatistics } from '@domain/types/services';

async canPlaceTubeAt(location: Location): Promise<PositionValidationResult> {
  return {
    isValid: true,
    errors: [],
    warnings: ['Box is 90% full'],
    conflictingTube: undefined
  };
}
```

---

### Validation.ts

**Purpose:** Tube creation and update data types for validation.

**Exports:**

- `TubeCreationData` - Tube creation request structure
- `TubeUpdateData` - Tube update request structure (partial fields)

**Usage:**

```typescript
import type { TubeCreationData, TubeUpdateData } from '@domain/types/services';

async validateTubeCreation(data: TubeCreationData): Promise<ValidationResult> {
  // Validate location, sample data, researcherId
}

async validateTubeUpdate(tube: Tube, updates: TubeUpdateData): Promise<ValidationResult> {
  // Validate partial updates
}
```

---

## Domain Types (`domain/types/`)

### validation.ts

**Purpose:** Domain-level validation result types.

**Exports:**

- `DomainValidationResult` - Standard validation result with errors/warnings
- `BulkValidationResult` - Validation for bulk operations

**Usage:**

```typescript
import type { DomainValidationResult } from '@domain/types/validation';

async validateConfigurationUpdate(
  currentConfig: Configuration,
  updatedConfig: Configuration
): Promise<DomainValidationResult> {
  return {
    isValid: true,
    errors: [],
    warnings: ['Tank utilization high']
  };
}
```

---

### configuration.ts

**Purpose:** Configuration-specific update data types.

**Exports:**

- `ConfigurationUpdateData` - Partial configuration updates

**Usage:**

```typescript
import type { ConfigurationUpdateData } from '@domain/types/configuration';

const updates: ConfigurationUpdateData = {
  tanks: [...updatedTanks],
};
```

---

## Import Patterns

### Using Centralized Types

Always import from the centralized type locations:

```typescript
// ✅ CORRECT - Import from centralized location
import type { TubeSearchCriteria, TubeRepositoryStats } from '@domain/types/repository';
import type { AccessResult, BulkOperation } from '@domain/types/services';
import type { DomainValidationResult } from '@domain/types/validation';

// ❌ WRONG - Never define types inline or in service files
interface TubeSearchCriteria {
  // This creates duplication!
  query?: string;
  // ...
}
```

### Repository Pattern

Repositories import types but never define them:

```typescript
// ✅ CORRECT - Repository imports types
import type { TubeSearchCriteria, TubeRepositoryStats } from '@domain/types/repository';

export interface TubeRepository {
  search(criteria: TubeSearchCriteria): Promise<Tube[]>;
  getStats(): Promise<TubeRepositoryStats>;
}
```

### Service Pattern

Services import types from the centralized locations:

```typescript
// ✅ CORRECT - Service imports types
import type { AccessResult, BulkAccessResult } from '@domain/types/services';

export class AccessControlService {
  async canEditTube(user: User, tube: Tube): Promise<AccessResult> {
    // Implementation
  }
}
```

---

## Guidelines for Adding New Types

### 1. Determine Type Category

**Ask yourself:**

- Is this a repository query/filter? → `domain/types/repository/SearchCriteria.ts`
- Is this a repository statistic? → `domain/types/repository/Stats.ts`
- Is this a pagination/query option? → `domain/types/repository/QueryOptions.ts`
- Is this a service operation type? → `domain/types/services/{ServiceName}.ts`
- Is this a validation result? → `domain/types/validation.ts`
- Is this domain-specific? → `domain/types/{domain}.ts`

### 2. Add to Appropriate File

Add the type to the correct centralized file:

```typescript
// File: domain/types/repository/Stats.ts

export interface NewRepositoryStats {
  totalCount: number;
  // ... statistics fields
}
```

### 3. Export from Index

Ensure the type is exported from the barrel export:

```typescript
// File: domain/types/repository/index.ts

export * from './SearchCriteria';
export * from './Stats';
export * from './QueryOptions';
```

### 4. Remove Local Definitions

If migrating an existing type, remove the old local definition:

```typescript
// ❌ DELETE - Old local definition
export interface MyStats {
  count: number;
}

// ✅ ADD - Import from centralized location
import type { MyStats } from '@domain/types/repository';
```

---

## Domain-Specific Types (Keep in Repositories)

**Not all types should be centralized.** Domain-specific types that are tightly coupled to a single repository contract should remain with that repository:

### Examples of Types That Stay in Repositories:

- `ConfigurationHistory` - Configuration-specific (stays in ConfigurationRepository.ts)
- `ConfigurationExport` - Configuration-specific
- `ConfigurationSnapshot` - Configuration-specific
- `ConfigurationValidationResult` - Configuration-specific
- `MaintenanceResult` - Configuration-specific
- `ResearcherValidationResult` - Researcher-specific
- `DuplicateCheckResult` - Researcher-specific

**Rationale:** These types are part of the repository's contract and aren't reused across the domain. Moving them would reduce cohesion without adding value.

---

## Benefits of Centralized Types

### 1. Single Source of Truth

- Each type exists in exactly one location
- No duplicate definitions across files
- Changes propagate automatically through imports

### 2. Discoverability

- Developers know exactly where to find types
- Clear organization by domain and layer
- Easy to browse type catalog

### 3. Maintainability

- Type changes only need to happen once
- Refactoring is safer and simpler
- Reduces merge conflicts

### 4. Type Safety

- TypeScript compilation catches all type mismatches
- No accidental type drift between duplicates
- Strong contracts between layers

---

## Migration Checklist

When adding a new type to the centralized system:

1. ✅ Determine correct type category and location
2. ✅ Add type to appropriate centralized file
3. ✅ Export from barrel export (index.ts)
4. ✅ Update all imports to use centralized location
5. ✅ Remove old local type definitions
6. ✅ Run `npx tsc --noEmit` to verify no errors
7. ✅ Update this documentation if adding new categories

---

## Related Documentation

- [AGENTS.md](../../AGENTS.md) - Overall development guidelines
- [Clean Architecture](../../AGENTS.md#clean-architecture-principles) - Layer organization
- [Type Safety Best Practices](../../AGENTS.md#code-quality--type-safety-best-practices) - Coding standards

---

## Maintenance

This document should be updated when:

- New type categories are added
- Type organization structure changes
- New centralized type files are created
- Import patterns are modified

**Document Owner:** Development Team
**Review Frequency:** Quarterly or after major refactors
