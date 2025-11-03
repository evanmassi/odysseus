# API Contract Standardization Plan

**Date:** October 1, 2025  
**Status:** 📋 **READY FOR IMPLEMENTATION**  
**Priority:** 🔴 **CRITICAL** - Fixes console errors and prevents future contract drift  
**Estimated Effort:** 6-8 hours (phased implementation)

---

## Executive Summary

The application currently has **inconsistent API contract handling** causing Zod validation failures. Some code validates server envelopes, other code expects unwrapped data. This creates:
- ❌ Console errors on every query
- ❌ Contract drift risk between client/server
- ❌ Inconsistent patterns across domain services
- ❌ Confusion about responsibility boundaries

**Solution:** Standardize on **httpClient unwrapping all envelopes**, returning clean typed data to domain services. This is the industry-standard pattern used by Stripe, GitHub, and Netflix.

---

## Problem Statement

### Current Errors

```
🔴 Zod validation failed: queryKey '["tubes","list"]'
   Error: Invalid input: expected true
   Received: [true] at path ["success"]

🔴 Zod validation failed: queryKey '["researchers","list"]'
   Error: Invalid input: expected array, received object
   Expected: ResearcherData[]
   Received: { success: true, data: [...] }
```

### Root Cause

**Server Contract (Consistent):**
```typescript
// All controllers use ErrorDto.success()
res.json(ErrorDto.success(researchers));
// Returns: { success: true, data: researchers }
```

**Client Contract (INCONSISTENT):**

**Pattern A - TubeService (domains/tubes/services/TubeService.ts):**
```typescript
const response = await httpClient.get(url);
const validatedResponse = apiResponseSchema(z.any()).parse(response);  // ✅ Validates envelope
return validatedResponse.data;  // ✅ Unwraps correctly
```

**Pattern B - ResearcherQueries (domains/researchers/hooks/useResearcherQueries.ts):**
```typescript
const response = await httpClient.get('/researchers');
return researchersArraySchema.parse(response.data);  // ❌ Expects array, gets envelope
```

**Why This Happens:**
- `httpClient.get()` returns `ApiResponse<T>` where `response.data` = server's JSON
- Server's JSON = `{ success: true, data: [...] }`
- Pattern A parses `response` (correct - accesses envelope)
- Pattern B parses `response.data` (wrong - the envelope, not the array)

---

## Architecture Decision

### Industry-Standard Pattern

**Transport layer (httpClient) owns envelopes. Domain layer works with clean types.**

```
┌─────────────────────────────────────────────────────────────┐
│ Server                                                       │
│ Returns: { success: true, data: T }                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ HttpClient (Transport Boundary)                             │
│ - Validates envelope: { success: true, data: T }            │
│ - Unwraps data: T                                           │
│ - Validates payload with Zod schema                         │
│ - Returns: T (typed, validated)                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Domain Services                                             │
│ - Receive: T (already unwrapped and validated)              │
│ - No envelope handling                                      │
│ - Pure business logic transformations                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ React Query Hooks                                           │
│ - Call domain services                                      │
│ - Receive clean types                                       │
│ - Handle caching, optimistic updates, UI state              │
└─────────────────────────────────────────────────────────────┘
```

### Why This is Industry Standard

**Stripe API Client:**
```typescript
const customer = await stripe.customers.retrieve('cus_123');
// Returns: Customer object (not { success, data: Customer })
```

**GitHub Octokit:**
```typescript
const { data } = await octokit.repos.get({ owner, repo });
// Returns: Repository object (envelope handled internally)
```

**Key Principle:** Callers work with domain types, not transport envelopes.

---

## Detailed Implementation Plan

### Phase 1: HttpClient Enhancement

**Goal:** Add typed helpers that validate envelopes and return unwrapped data.

#### 1.1 Create Transport Schemas

**File:** `client/src/infrastructure/api/transportSchemas.ts` (NEW)

```typescript
import { z } from 'zod';

/**
 * Server envelope schemas (match ErrorDto on backend)
 */

// Success envelope (matches ErrorDto.success)
export const successEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    requestId: z.string().optional()
  });

// Error envelope (matches ErrorDto.fromDomainError)
export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  timestamp: z.string().datetime()
});

// Paginated envelope (for future use)
export const paginatedEnvelopeSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      total: z.number().int().min(0),
      page: z.number().int().min(1),
      limit: z.number().int().min(1),
      totalPages: z.number().int().min(0),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    }).optional(),
    message: z.string().optional(),
    timestamp: z.string().datetime().optional()
  });

// Batch operation envelope (for bulk operations)
export const batchEnvelopeSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.object({
      successful: z.array(itemSchema),
      failed: z.array(z.object({
        input: z.unknown(),
        error: z.object({
          code: z.string(),
          message: z.string(),
          field: z.string().optional()
        })
      })),
      summary: z.object({
        total: z.number().int().min(0),
        successful: z.number().int().min(0),
        failed: z.number().int().min(0)
      })
    })
  });

/**
 * Normalized error class for API failures
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type PaginatedResult<T> = {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type BatchResult<T> = {
  successful: T[];
  failed: Array<{
    input: unknown;
    error: {
      code: string;
      message: string;
      field?: string;
    };
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
};
```

#### 1.2 Add Typed HttpClient Helpers

**File:** `client/src/infrastructure/api/httpClient.ts` (MODIFY)

Add these methods to the `HttpClient` class:

```typescript
/**
 * GET request that unwraps envelope and validates data
 */
async getData<T>(
  url: string, 
  dataSchema: z.ZodType<T>,
  headers?: Record<string, string>
): Promise<T> {
  const response = await this.get(url, headers);
  
  // Validate and unwrap envelope
  const envelope = successEnvelopeSchema(dataSchema).parse(response.data);
  
  return envelope.data;
}

/**
 * GET request for array responses (most common)
 */
async getArray<T>(
  url: string,
  itemSchema: z.ZodType<T>,
  headers?: Record<string, string>
): Promise<T[]> {
  return this.getData(url, z.array(itemSchema), headers);
}

/**
 * POST request that unwraps envelope and validates response
 */
async postData<TResponse, TRequest = any>(
  url: string,
  body: TRequest,
  responseSchema: z.ZodType<TResponse>,
  headers?: Record<string, string>
): Promise<TResponse> {
  const response = await this.post(url, body, headers);
  
  // Validate and unwrap envelope
  const envelope = successEnvelopeSchema(responseSchema).parse(response.data);
  
  return envelope.data;
}

/**
 * PUT request that unwraps envelope and validates response
 */
async putData<TResponse, TRequest = any>(
  url: string,
  body: TRequest,
  responseSchema: z.ZodType<TResponse>,
  headers?: Record<string, string>
): Promise<TResponse> {
  const response = await this.put(url, body, headers);
  
  // Validate and unwrap envelope
  const envelope = successEnvelopeSchema(responseSchema).parse(response.data);
  
  return envelope.data;
}

/**
 * DELETE request (returns void or boolean)
 */
async deleteData(
  url: string,
  headers?: Record<string, string>
): Promise<void> {
  await this.delete(url, headers);
  // For 204 No Content or { success: true, data: true/null }
  // Just return void - delete success is confirmed by no error thrown
}

/**
 * GET paginated data
 */
async getPaginated<T>(
  url: string,
  itemSchema: z.ZodType<T>,
  headers?: Record<string, string>
): Promise<PaginatedResult<T>> {
  const response = await this.get(url, headers);
  
  const envelope = paginatedEnvelopeSchema(itemSchema).parse(response.data);
  
  return {
    items: envelope.data,
    pagination: envelope.pagination || {
      total: envelope.data.length,
      page: 1,
      limit: envelope.data.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  };
}

/**
 * POST/PUT batch operations
 */
async postBatch<T>(
  url: string,
  body: any,
  itemSchema: z.ZodType<T>,
  headers?: Record<string, string>
): Promise<BatchResult<T>> {
  const response = await this.post(url, body, headers);
  
  const envelope = batchEnvelopeSchema(itemSchema).parse(response.data);
  
  return envelope.data;
}
```

#### 1.3 Update Error Handling

Modify the `request()` method to parse error envelopes:

```typescript
private async request<T = any>(
  method: string,
  url: string,
  data?: any,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
  const requestHeaders = { ...this.defaultHeaders, ...headers };

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.timeout)
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      // Try to parse as error envelope
      const errorParsed = errorEnvelopeSchema.safeParse(responseData);
      
      if (errorParsed.success) {
        throw new ApiError(
          errorParsed.data.error,
          response.status,
          errorParsed.data.code,
          errorParsed.data.details
        );
      }
      
      // Fallback for non-envelope errors
      throw new ApiError(
        responseData?.message || `HTTP ${response.status}`,
        response.status,
        responseData?.code
      );
    }

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error('Network request failed');
  }
}
```

---

### Phase 2: Domain Service Standardization

#### 2.1 Update TubeService

**File:** `client/src/domains/tubes/services/TubeService.ts` (REFACTOR)

**Before:**
```typescript
static async fetchTubes(filters?: TubeQueryFilters): Promise<TubeData[]> {
  const response = await httpClient.get(url);
  const validatedResponse = apiResponseSchema(z.any()).parse(response);
  const tubes = validatedResponse.data.map(tube => tubeDataSchema.parse(tube));
  return tubes;
}
```

**After:**
```typescript
static async fetchTubes(filters?: TubeQueryFilters): Promise<TubeData[]> {
  const queryParams = filters ? new URLSearchParams({...}) : null;
  const url = queryParams ? `/tubes?${queryParams}` : '/tubes';
  
  // HttpClient unwraps envelope and validates
  return await httpClient.getArray(url, tubeDataSchema);
}

static async fetchTubeById(id: string): Promise<TubeData> {
  return await httpClient.getData(`/tubes/${id}`, tubeDataSchema);
}

static async createTube(data: CreateTubeRequest): Promise<TubeData> {
  const validated = createTubeRequestSchema.parse(data);
  return await httpClient.postData('/tubes', validated, tubeDataSchema);
}

static async updateTube(id: string, data: UpdateTubeRequest): Promise<TubeData> {
  const validated = updateTubeRequestSchema.parse(data);
  return await httpClient.putData(`/tubes/${id}`, validated, tubeDataSchema);
}

static async deleteTube(id: string): Promise<void> {
  await httpClient.deleteData(`/tubes/${id}`);
}

static async bulkUpdate(operation: BatchTubeOperation): Promise<BatchResult<TubeData>> {
  return await httpClient.postBatch('/tubes/bulk-update', operation, tubeDataSchema);
}
```

#### 2.2 Create ResearcherService

**File:** `client/src/domains/researchers/services/ResearcherService.ts` (NEW)

```typescript
import { httpClient } from '@infra/api/httpClient';
import {
  type Researcher,
  type ResearcherFormData,
  type ResearcherUpdateData,
  type ResearcherQueryFilters,
  researcherSchema,
  researcherFormDataSchema,
  researcherUpdateDataSchema
} from '../schemas/researcherSchemas';
import type { BatchResult } from '@infra/api/transportSchemas';

export class ResearcherService {
  /**
   * Fetch all researchers with optional filters
   */
  static async list(filters?: ResearcherQueryFilters): Promise<Researcher[]> {
    const queryParams = filters ? new URLSearchParams({
      ...filters.active !== undefined && { active: String(filters.active) },
      ...filters.role && { role: filters.role },
      ...filters.department && { department: filters.department },
      ...filters.search && { search: filters.search }
    }) : null;
    
    const url = queryParams ? `/researchers?${queryParams}` : '/researchers';
    
    return await httpClient.getArray(url, researcherSchema);
  }

  /**
   * Fetch single researcher by ID
   */
  static async get(id: string): Promise<Researcher> {
    return await httpClient.getData(`/researchers/${id}`, researcherSchema);
  }

  /**
   * Create new researcher
   */
  static async create(data: ResearcherFormData): Promise<Researcher> {
    const validated = researcherFormDataSchema.parse(data);
    return await httpClient.postData('/researchers', validated, researcherSchema);
  }

  /**
   * Update researcher
   */
  static async update(id: string, data: ResearcherUpdateData): Promise<Researcher> {
    const validated = researcherUpdateDataSchema.parse(data);
    return await httpClient.putData(`/researchers/${id}`, validated, researcherSchema);
  }

  /**
   * Delete researcher
   */
  static async delete(id: string): Promise<void> {
    await httpClient.deleteData(`/researchers/${id}`);
  }

  /**
   * Bulk create researchers
   */
  static async bulkCreate(researchers: ResearcherFormData[]): Promise<BatchResult<Researcher>> {
    return await httpClient.postBatch('/researchers/bulk', { researchers }, researcherSchema);
  }
}
```

#### 2.3 Remove Legacy Response Types

**Delete or deprecate:**
- `TubeAPIResponse` interface (in `domains/tubes/application/TubeService.ts`)
- `ResearcherAPIResponse` interface (in `domains/researchers/hooks/useResearcherQueries.ts`)
- Custom envelope parsing in individual services

---

### Phase 3: Hook Simplification

#### 3.1 Update Researcher Hooks

**File:** `client/src/domains/researchers/hooks/useResearcherQueries.ts` (REFACTOR)

**Before:**
```typescript
queryFn: async (): Promise<Researcher[]> => {
  const response = await httpClient.get<ResearcherAPIResponse>('/researchers');
  if (!response.data.success) {
    throw new Error('Failed to load researchers');
  }
  const researchers = response.data.researchers || [];
  return researchers.sort((a, b) => a.name.localeCompare(b.name));
}
```

**After:**
```typescript
import { ResearcherService } from '../services/ResearcherService';

queryFn: async (): Promise<Researcher[]> => {
  const researchers = await ResearcherService.list();
  return researchers.sort((a, b) => a.name.localeCompare(b.name));
}
```

#### 3.2 Update Tube Hooks

**File:** `client/src/domains/tubes/hooks/useTubesQuery.ts` (MINOR UPDATE)

Already uses `TubeService.fetchTubes()` - just verify it returns clean array after Phase 2.1.

#### 3.3 Update All Domain Hooks Pattern

**Consistent pattern across all hooks:**

```typescript
export const useResourceList = (filters?, options?) =>
  useQuery({
    queryKey: queryKeys.resource.list(filters),
    queryFn: () => ResourceService.list(filters),  // Service returns T[], not envelope
    ...options
  });

export const useResource = (id: string, options?) =>
  useQuery({
    queryKey: queryKeys.resource.detail(id),
    queryFn: () => ResourceService.get(id),  // Service returns T, not envelope
    enabled: !!id,
    ...options
  });
```

---

### Phase 4: Remove Obsolete Code

#### 4.1 Clean Up Legacy TubeService

**File:** `client/src/domains/tubes/application/TubeService.ts`

This file has legacy `TubeAPIResponse` and manual envelope unwrapping. After Phase 2.1:
- Remove `TubeAPIResponse`, `BackendTubeResponse` interfaces
- Remove manual `{ success, tubes }` mapping
- Update methods to use new httpClient helpers

#### 4.2 Remove Duplicate Validation

Remove envelope validation from:
- `shared/domain/schemas/apiSchemas.ts` - Keep type definitions but remove if unused
- Domain services - Only validate domain payloads, not envelopes

---

## Files Requiring Changes

### New Files (2)
1. ✨ `client/src/infrastructure/api/transportSchemas.ts` - Transport envelope schemas
2. ✨ `client/src/domains/researchers/services/ResearcherService.ts` - Centralized researcher operations

### Modified Files (8-12)
1. 🔧 `client/src/infrastructure/api/httpClient.ts` - Add typed helpers (getData, getArray, postData, etc.)
2. 🔧 `client/src/domains/tubes/services/TubeService.ts` - Use new helpers, remove envelope parsing
3. 🔧 `client/src/domains/researchers/hooks/useResearcherQueries.ts` - Use ResearcherService
4. 🔧 `client/src/domains/researchers/hooks/useResearchersQuery.ts` - Use ResearcherService (if exists)
5. 🔧 `client/src/domains/tubes/application/TubeService.ts` - Remove TubeAPIResponse, update methods
6. 🔧 `client/src/domains/tubes/hooks/useTubeQueries.ts` - Verify clean after TubeService update
7. 🔧 `client/src/domains/tubes/hooks/useTubeMutations.ts` - Update to use refactored TubeService
8. 🔧 `client/src/domains/researchers/hooks/useResearcherMutations.ts` - Use ResearcherService

### Optional Cleanup (4-6)
- 🗑️ Remove `shared/domain/schemas/apiSchemas.ts` if no longer needed (or keep type exports only)
- 🗑️ Remove custom response interfaces from various hooks
- 📝 Update barrel exports in domain `index.ts` files to include new services

---

## Testing Strategy

### Unit Tests

**File:** `client/src/infrastructure/api/__tests__/httpClient.test.ts` (NEW)

```typescript
describe('HttpClient typed helpers', () => {
  test('getData unwraps success envelope', async () => {
    const schema = z.object({ id: z.string(), name: z.string() });
    // Mock: { success: true, data: { id: '1', name: 'Test' } }
    const result = await httpClient.getData('/test', schema);
    expect(result).toEqual({ id: '1', name: 'Test' });
  });

  test('getData throws on schema mismatch', async () => {
    const schema = z.array(z.string());
    // Mock: { success: true, data: { wrong: 'shape' } }
    await expect(httpClient.getData('/test', schema)).rejects.toThrow();
  });

  test('getArray returns typed array', async () => {
    const schema = z.object({ id: z.string() });
    // Mock: { success: true, data: [{ id: '1' }, { id: '2' }] }
    const result = await httpClient.getArray('/test', schema);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: '1' });
  });

  test('postData validates request and response', async () => {
    const reqSchema = z.object({ name: z.string() });
    const resSchema = z.object({ id: z.string(), name: z.string() });
    const result = await httpClient.postData('/test', { name: 'Test' }, resSchema);
    expect(result.name).toBe('Test');
  });
});
```

### Integration Tests

**File:** `client/src/domains/tubes/services/__tests__/TubeService.test.ts` (NEW)

```typescript
describe('TubeService', () => {
  test('fetchTubes returns array of tubes', async () => {
    const tubes = await TubeService.fetchTubes();
    expect(Array.isArray(tubes)).toBe(true);
    tubes.forEach(tube => {
      expect(tube).toHaveProperty('id');
      expect(tube).toHaveProperty('location');
      expect(tube).toHaveProperty('sample');
    });
  });

  test('fetchTubeById returns single tube', async () => {
    const tube = await TubeService.fetchTubeById('test-id');
    expect(tube.id).toBe('test-id');
  });

  test('createTube validates input and returns tube', async () => {
    const input: CreateTubeRequest = { /* valid data */ };
    const tube = await TubeService.createTube(input);
    expect(tube).toHaveProperty('id');
  });
});
```

### Manual Testing Checklist

- [ ] Login works without Zod errors
- [ ] Tubes list loads correctly
- [ ] Researchers list loads correctly
- [ ] Create tube works
- [ ] Edit tube works
- [ ] Delete tube works
- [ ] Batch operations work
- [ ] No console errors during normal usage
- [ ] Socket.IO updates work correctly

---

## Migration Strategy

### Step-by-Step Rollout

**Step 1: Foundation (2 hours)**
- Create `transportSchemas.ts` with envelope schemas
- Add typed helpers to `HttpClient` class
- Run build to verify no breaks

**Step 2: Tubes Domain (1-2 hours)**
- Refactor `TubeService` to use new helpers
- Remove envelope parsing from service
- Test tubes queries work
- Verify no console errors

**Step 3: Researchers Domain (1-2 hours)**
- Create `ResearcherService`
- Update researcher hooks to use service
- Remove `ResearcherAPIResponse` type
- Test researchers queries work

**Step 4: Other Domains (1-2 hours)**
- Apply same pattern to:
  - Search domain
  - Laboratory/Configuration domain
  - Authentication domain (if needed)

**Step 5: Cleanup (1 hour)**
- Remove obsolete code
- Remove temporary debug logging
- Update documentation
- Run full test suite

---

## Validation Checklist

Before marking as complete, verify:

### Architecture
- [ ] HttpClient is the ONLY place that handles `{ success, data }` envelopes
- [ ] All domain services use typed helpers (getData, getArray, postData, etc.)
- [ ] All hooks call domain services, never httpClient directly
- [ ] No manual envelope unwrapping in hooks or components

### Type Safety
- [ ] All API calls have explicit Zod schemas
- [ ] No `z.any()` in transport validation
- [ ] ApiError class used consistently for failures
- [ ] TypeScript compilation passes with no suppressions

### Consistency
- [ ] TubeService, ResearcherService, SearchService follow identical patterns
- [ ] All services return clean types (arrays, objects, void)
- [ ] All mutations use postData/putData with response validation

### Testing
- [ ] Unit tests for httpClient helpers pass
- [ ] Integration tests for each domain service pass
- [ ] Manual testing shows no console errors
- [ ] Socket.IO updates still work correctly

---

## Risks & Mitigation

### Risk 1: Breaking Changes
**Risk:** Refactoring multiple layers could break existing functionality  
**Mitigation:** 
- Implement in phases with testing after each
- Keep legacy methods temporarily and deprecate gradually
- Use feature flags to toggle new vs old client

### Risk 2: Server Response Shape Changes
**Risk:** Server might return unexpected shapes we haven't seen  
**Mitigation:**
- Zod validation will catch mismatches immediately
- Add comprehensive error logging during rollout
- Keep detailed console logs for debugging

### Risk 3: Batch/Paginated Edge Cases
**Risk:** Complex response shapes might not fit new helpers  
**Mitigation:**
- Design helpers to be flexible with optional pagination
- Add escape hatch for truly custom shapes
- Test batch operations thoroughly

---

## Success Criteria

### Immediate (After Implementation)
1. ✅ No Zod validation errors in console
2. ✅ All queries return expected data types
3. ✅ TypeScript compilation passes
4. ✅ All manual tests pass

### Long-term (Architectural Quality)
1. ✅ Single consistent pattern across all domain services
2. ✅ Clear separation of concerns (transport vs domain vs UI)
3. ✅ New developers can add domains following established pattern
4. ✅ Easy to migrate to status-code-only APIs in future

---

## Future Improvements (Post-Implementation)

### Phase 5: Server Modernization (Optional)
Once client is stable, consider modernizing server responses:

**Current:** `{ success: true, data: T }`  
**Target:** Plain `T` with HTTP status codes

**Migration Path:**
1. Add API version header support
2. Support both envelope and plain responses
3. Gradually migrate endpoints
4. Remove envelope support once all clients updated

**Benefits:**
- Smaller payload sizes
- Standard HTTP semantics
- RFC 7807 problem+json for errors
- Easier API documentation

---

## Appendix: Code References

### Current Error Locations

**Tubes Query Error:**
- **Hook:** `client/src/domains/tubes/hooks/useTubesQuery.ts:51-71`
- **Service:** `client/src/domains/tubes/services/TubeService.ts:41-67`
- **QueryKey:** `["tubes","list"]`

**Researchers Query Error:**
- **Hook:** `client/src/domains/researchers/hooks/useResearcherQueries.ts:49-69`
- **QueryKey:** `["researchers","list"]`
- **Issue:** Line 44: `researchersArraySchema.parse(response.data)` expects array, gets envelope

### Server Response Format

**Source:** `server/src/application/dto/ErrorDto.ts:120-125`
```typescript
static success<T>(data: T): { success: true; data: T } {
  return {
    success: true,
    data
  };
}
```

**All controllers use this:**
- `TubeController`: `res.json(ErrorDto.success(tubes))`
- `ResearcherController`: `res.json(ErrorDto.success(researchers))`

---

## Implementation Notes

### Import Changes Required

**New imports in services:**
```typescript
import { httpClient } from '@infra/api/httpClient';
import type { BatchResult, PaginatedResult } from '@infra/api/transportSchemas';
```

**New imports in httpClient.ts:**
```typescript
import { 
  successEnvelopeSchema,
  errorEnvelopeSchema,
  paginatedEnvelopeSchema,
  batchEnvelopeSchema,
  ApiError,
  type PaginatedResult,
  type BatchResult
} from './transportSchemas';
```

### Barrel Export Updates

**File:** `client/src/infrastructure/api/index.ts`
```typescript
export { httpClient, HttpClient } from './httpClient';
export { authHttpClient, AuthHttpClient } from './AuthHttpClient';
export { 
  ApiError, 
  type PaginatedResult, 
  type BatchResult 
} from './transportSchemas';
```

**File:** `client/src/domains/researchers/index.ts`
```typescript
export { ResearcherService } from './services/ResearcherService';
// ... other exports
```

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1** | Create transportSchemas.ts, add httpClient helpers | 2 hours |
| **Phase 2** | Update TubeService, create ResearcherService | 2-3 hours |
| **Phase 3** | Update all hooks to use services | 1-2 hours |
| **Phase 4** | Cleanup and documentation | 1 hour |
| **Total** | End-to-end implementation | **6-8 hours** |

---

## Questions for Stakeholder

1. **Approve phased rollout?** Start with Tubes, then Researchers, then other domains?
2. **Keep debug logging temporarily?** Enhanced logging added in this session - remove after stabilization?
3. **Strict vs lenient Zod?** Use `z.literal(true)` or `z.boolean()` for success field?
4. **Add API versioning now or later?** Version header support for future envelope removal?

---

**Status:** 📋 **AWAITING APPROVAL TO IMPLEMENT**

**Recommendation:** Start with Phase 1-2 (foundation + tubes domain) in one focused session, then expand to other domains once pattern is proven.
