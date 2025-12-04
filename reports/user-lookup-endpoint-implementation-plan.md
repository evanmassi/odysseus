# User Lookup Endpoint Implementation Plan

## Problem Statement

Non-admin users see "Unknown (user176...)" in the by-user tab and incorrect "Unassigned/Common" badges in the by-location tab of the Storage Management Modal. This occurs because:

1. `useUsersQuery()` calls `/api/admin/users` which requires admin role
2. Non-admin users get 403 Forbidden → React Query returns empty array
3. `getUserInfo(userId)` can't resolve any user IDs → returns null
4. UI falls back to "Unknown" text and unassigned badges

## Solution

Create a public user lookup endpoint that any authenticated user can access:
- `POST /api/users/lookup` - accepts list of user IDs, returns minimal display info
- Only fetches users that are actually needed (scalable)
- Returns limited data (no sensitive admin info like roles, status, etc.)

---

## Files to Create

### 1. Shared Schema: `packages/shared-schemas/src/users/userLookupSchemas.ts`

**Purpose:** Define the request/response types for the lookup endpoint

```typescript
import { z } from 'zod';

// Request schema - list of user IDs to look up
export const userLookupRequestSchema = z.object({
  userIds: z.array(z.string()).min(1).max(100), // Limit to prevent abuse
});

export type UserLookupRequest = z.infer<typeof userLookupRequestSchema>;

// Response item - minimal display info only
export const userDisplayInfoSchema = z.object({
  id: z.string(),
  username: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export type UserDisplayInfo = z.infer<typeof userDisplayInfoSchema>;

// Response schema
export const userLookupResponseSchema = z.object({
  success: z.boolean(),
  users: z.array(userDisplayInfoSchema),
});

export type UserLookupResponse = z.infer<typeof userLookupResponseSchema>;
```

### 2. Client Service: `client/src/domains/users/services/UserLookupService.ts`

**Purpose:** HTTP client for the lookup endpoint

```typescript
import { httpClient } from '@infra/api/httpClient';
import type { UserDisplayInfo, UserLookupRequest } from '@odysseus/shared-schemas';

export class UserLookupService {
  async lookupUsers(userIds: string[]): Promise<UserDisplayInfo[]> {
    const response = await httpClient.post<{
      success: boolean;
      users: UserDisplayInfo[];
    }>('/users/lookup', { userIds });

    return response.data.users;
  }
}

export const userLookupService = new UserLookupService();
```

### 3. Client Hook: `client/src/domains/users/hooks/useUserLookupQuery.ts`

**Purpose:** React Query hook for fetching user display info

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@app/queryKeys';
import { userLookupService } from '../services/UserLookupService';
import type { UserDisplayInfo } from '@odysseus/shared-schemas';

export function useUserLookupQuery(userIds: string[]) {
  return useQuery({
    queryKey: queryKeys.users.lookup(userIds),
    queryFn: async (): Promise<UserDisplayInfo[]> => {
      if (userIds.length === 0) return [];
      return userLookupService.lookupUsers(userIds);
    },
    enabled: userIds.length > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes - display info rarely changes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}
```

---

## Files to Modify

### 1. Server: `server/src/domain/repositories/UserRepository.ts`

**Add method to interface:**

```typescript
/**
 * Find multiple users by their IDs
 * Returns only found users (no errors for missing IDs)
 */
findByIds(ids: string[]): Promise<User[]>;
```

**Location:** After `findAll()` method (~line 53)

---

### 2. Server: `server/src/infrastructure/repositories/SQLiteUserRepository.ts`

**Add implementation:**

```typescript
async findByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  const rows = await this.context.queryMany<UserRow>(
    `SELECT * FROM users WHERE id IN (${placeholders})`,
    ids
  );

  return rows.map(row => UserMapper.fromRow(row));
}
```

**Location:** After `findAll()` method

---

### 3. Server: `server/src/presentation/controllers/UserController.ts`

**Add method and dependencies:**

```typescript
// Add to constructor
constructor(
  private updateUserSettingsHandler: UpdateUserSettingsCommandHandler,
  private getUserSettingsHandler: GetUserSettingsQueryHandler,
  private userRepository: UserRepository,        // NEW
  private personRepository: PersonRepository     // NEW
) {}

/**
 * POST /api/users/lookup
 * Look up display info for a list of user IDs
 * Access: Any authenticated user
 */
async lookupUsers(req: Request, res: Response): Promise<void> {
  try {
    const { userIds } = userLookupRequestSchema.parse(req.body);

    const users = await this.userRepository.findByIds(userIds);

    // Enrich with Person names
    const displayUsers = await Promise.all(
      users.map(async (user) => {
        const publicData = user.toPublicData();
        let firstName: string | undefined;
        let lastName: string | undefined;

        // Try to get name from Person entity
        if (publicData.personId) {
          const person = await this.personRepository.findById(publicData.personId);
          if (person) {
            firstName = person.firstName;
            lastName = person.lastName;
          }
        }

        return {
          id: publicData.id,
          username: publicData.username,
          firstName,
          lastName,
        };
      })
    );

    res.json({ success: true, users: displayUsers });
  } catch (error) {
    this.handleError(error, res, 'Failed to lookup users');
  }
}
```

---

### 4. Server: `server/src/presentation/routes/UserRouteModule.ts`

**Add route:**

```typescript
/**
 * POST /api/users/lookup
 * Look up display info for multiple users by ID
 *
 * Access: Any authenticated user
 * Used by: Storage Management Modal for ownership display
 */
router.post('/lookup',
  validateBody(userLookupRequestSchema),
  this.userController.lookupUsers.bind(this.userController)
);
```

**Location:** Add after existing routes in `configure()` method
**Also add:** Import for `validateBody` and `userLookupRequestSchema`

---

### 5. Server: `server/src/infrastructure/di/ServiceContainer.ts`

**Update UserController instantiation:**

```typescript
getUserController(): UserController {
  if (!this.userController) {
    this.userController = new UserController(
      this.getUpdateUserSettingsHandler(),
      this.getGetUserSettingsHandler(),
      this.repositoryFactory.getUserRepository(),    // NEW
      this.repositoryFactory.getPersonRepository()   // NEW
    );
  }
  return this.userController;
}
```

**Location:** `getUserController()` method (~line 607-615)

---

### 6. Shared: `packages/shared-schemas/src/index.ts`

**Add exports:**

```typescript
// User lookup (public endpoint)
export {
  userLookupRequestSchema,
  userDisplayInfoSchema,
  userLookupResponseSchema,
  type UserLookupRequest,
  type UserDisplayInfo,
  type UserLookupResponse,
} from './users/userLookupSchemas';
```

---

### 7. Client: `client/src/app/queryKeys.ts`

**Add lookup query key:**

```typescript
users: {
  all: ['users'] as const,
  settings: () => [...queryKeys.users.all, 'settings'] as const,
  profile: () => [...queryKeys.users.all, 'profile'] as const,
  sessions: () => [...queryKeys.users.all, 'sessions'] as const,
  lookup: (userIds: string[]) => [...queryKeys.users.all, 'lookup', userIds.sort().join(',')] as const,  // NEW
},
```

**Note:** Sort userIds to ensure consistent cache keys regardless of order

---

### 8. Client: `client/src/domains/users/index.ts`

**Add exports:**

```typescript
export { UserLookupService, userLookupService } from './services/UserLookupService';
export { useUserLookupQuery } from './hooks/useUserLookupQuery';
```

---

### 9. Client: `client/src/domains/storage/ui/components/modals/StorageManagementModal.tsx`

**Replace useUsersQuery with useUserLookupQuery:**

```typescript
// BEFORE
import { useUsersQuery } from '@domains/admin';
// ...
const { data: users = [] } = useUsersQuery();

// AFTER
import { useUserLookupQuery } from '@domains/users';
// ...

// Extract unique user IDs from storage configuration
const assignedUserIds = useMemo(() => {
  if (!localLab) return [];
  const ids = new Set<string>();

  for (const tank of localLab.equipment.tanks) {
    for (const rack of tank.racks) {
      if (rack.assignedUserId) ids.add(rack.assignedUserId);
      for (const box of rack.boxes) {
        if (box.assignedUserId) ids.add(box.assignedUserId);
      }
    }
  }

  return Array.from(ids);
}, [localLab]);

const { data: users = [] } = useUserLookupQuery(assignedUserIds);
```

**Location:** Near top of component (~lines 64-65)

---

### 10. Client: `client/src/domains/storage/hooks/useResourceOwnership.ts`

**Update type import:**

```typescript
// BEFORE
import type { AdminUser } from '@odysseus/shared-schemas';

// AFTER
import type { UserDisplayInfo } from '@odysseus/shared-schemas';
```

**Update function signature:**

```typescript
// BEFORE
export function useResourceOwnership(
  users: AdminUser[],
  currentUserId: string | undefined
): UseResourceOwnershipResult {

// AFTER
export function useResourceOwnership(
  users: UserDisplayInfo[],
  currentUserId: string | undefined
): UseResourceOwnershipResult {
```

---

## Implementation Order

1. **Shared schemas** - Create types first (shared-schemas)
2. **Server repository** - Add `findByIds` to interface and implementation
3. **Server controller** - Add `lookupUsers` method
4. **Server routes** - Wire up POST /api/users/lookup
5. **Server DI** - Update ServiceContainer
6. **Build shared-schemas** - `npm run build` in packages/shared-schemas
7. **Client service** - Create UserLookupService
8. **Client hook** - Create useUserLookupQuery
9. **Client queryKeys** - Add lookup key
10. **Client exports** - Update users domain index
11. **Update consumers** - StorageManagementModal, useResourceOwnership

---

## Testing Checklist

- [ ] Non-admin user can open Storage Management Modal
- [ ] By-user tab shows correct usernames (not "Unknown")
- [ ] By-location tab shows correct ownership badges
- [ ] Admin user still sees full functionality
- [ ] Empty storage (no assignments) doesn't cause errors
- [ ] Large number of assignments doesn't cause performance issues
- [ ] User lookup caches properly (no repeated requests)

---

## Security Considerations

1. **Rate limiting:** Already applied via UserRouteModule middleware
2. **Request size limit:** Schema limits to 100 user IDs per request
3. **Data exposure:** Only returns id, username, firstName, lastName (no roles, status, etc.)
4. **Authentication required:** Route uses `authenticate` middleware

---

## Rollback Plan

If issues arise, revert to admin-only behavior:
1. Revert StorageManagementModal to use `useUsersQuery`
2. Non-admin users won't see user names (existing behavior)
3. No data loss or breaking changes
