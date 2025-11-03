# Admin Settings Implementation Assessment

**Date:** 2025-01-22
**Project:** Odysseus - Liquid Nitrogen Tube Inventory Management System
**Assessment Type:** Architecture & Feature Analysis
**Status:** Investigation Complete - Recommendations Ready

---

## Executive Summary

The admin settings system has a solid architectural foundation and professional UI, but **critical enforcement gaps** prevent the settings from actually affecting system behavior. Current completion: **~40%**.

**Key Findings:**
- ✅ Clean Architecture properly implemented (UI → Service → Controller → Repository)
- ✅ Security configuration persists to database correctly
- ✅ Professional tabbed interface with proper UX
- ❌ **Security settings are stored but not enforced** (password policies, session timeouts, rate limits ignored)
- ❌ Monitoring and audit features are placeholder stubs
- ❌ Type safety compromised with `any` types throughout
- ❌ Missing React Query integration (inconsistent with rest of application)

---

## Current Implementation Status

### ✅ What's Working Well

#### 1. **Clean Architecture Foundation**
- Proper separation of concerns across all layers:
  - **Presentation:** Frontend tabs → AdminService (client)
  - **API:** HTTP endpoints → AuthController
  - **Application:** Command/Query handlers (CQRS pattern)
  - **Domain:** SecurityConfig Value Object with validation
  - **Infrastructure:** SQLiteConfigurationRepository with persistence

#### 2. **Security Configuration Storage**
- Dedicated `security_config` table in SQLite
- All 12 security fields properly defined and typed
- Value Object pattern ensures immutability and business rule validation
- Configuration survives app restarts

**Fields Implemented:**
```typescript
interface SecurityConfig {
  // Authentication
  useEnhancedAuth: boolean;
  requireStrongPasswords: boolean;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;

  // Session Management
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;

  // Rate Limiting
  enableRateLimiting: boolean;
  loginAttemptsPerMinute: number;
  lockoutDurationMinutes: number;

  // Admin & Audit
  enableAdminControls: boolean;
  enableDetailedLogging: boolean;
  logFailedAttempts: boolean;
}
```

#### 3. **Professional UI/UX**
- Well-organized tabbed interface (Security, Users, System, Monitoring)
- Lazy-loaded tab components with Suspense for code splitting
- Consistent styling with TailwindCSS
- Proper loading states and error handling
- Change detection (only saves modified fields)

#### 4. **User Management Features**
- View all users in clean table layout
- Update user roles (admin/user) with optimistic UI
- Delete users with confirmation
- Invite code system for user registration
- Last activity tracking (partially implemented)

#### 5. **Backend CQRS Implementation**
- User operations use proper Command/Query handlers:
  - `GetAllUsersQuery` / `GetAllUsersQueryHandler`
  - `ChangeUserRoleCommand` / `ChangeUserRoleCommandHandler`
  - `DeleteUserCommand` / `DeleteUserCommandHandler`
- Separation of read and write operations
- Comprehensive error handling

---

## Critical Issues & Gaps

### 🔴 **Priority 1: Missing Backend Enforcement**

**Problem:** Security settings can be changed, but **nothing actually enforces them**. The admin panel is effectively a "fake dashboard" where toggling settings has zero impact on system behavior.

#### Examples of Non-Enforcement:

**Password Policies** (`CreateUserCommandHandler.ts`):
```typescript
// Current: Hardcoded validation, ignores security config
if (password.length < 8) {
  throw new ValidationError('Password must be at least 8 characters');
}
// Missing: Read requireStrongPasswords, passwordMinLength,
// passwordRequireSpecialChars from security config
```

**Session Timeouts** (`JwtSessionService.ts`):
```typescript
// Current: Hardcoded 15 minutes
const accessToken = jwt.sign(payload, secret, {
  expiresIn: '15m'  // ❌ Ignores sessionTimeoutMinutes setting
});
// Missing: Read sessionTimeoutMinutes from security config
```

**Rate Limiting** (`server/src/middleware/RateLimiting.ts`):
```typescript
// Current: Hardcoded limits
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100  // ❌ Ignores loginAttemptsPerMinute setting
});
// Missing: Read enableRateLimiting, loginAttemptsPerMinute,
// lockoutDurationMinutes from security config
```

**Concurrent Sessions:**
- `maxConcurrentSessions` is stored but never checked
- No tracking of active sessions per user
- No enforcement of session limits

**Impact:** Users can configure security policies that appear to work but provide no actual protection. This is a security vulnerability and UX disaster.

---

### 🔴 **Priority 2: Incomplete Monitoring Tab**

**Current State:** `MonitoringTab.tsx` is a placeholder with "Coming Soon" message.

**Missing Features:**
- Real-time security event tracking
- Login attempt history and visualization
- Failed authentication logs
- System performance metrics (database size, query performance)
- Active user session monitoring
- Security event timeline

**Current Code:**
```tsx
// MonitoringTab.tsx (lines 64-73)
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <div className="flex items-center space-x-2">
    <Activity size={16} className="text-blue-600" />
    <h4 className="font-medium text-blue-800">Coming Soon</h4>
  </div>
  <p className="text-blue-700 text-sm mt-2">
    Real-time monitoring dashboard will show login attempts, security events,
    and system performance metrics in the next update.
  </p>
</div>
```

---

### 🔴 **Priority 3: Audit Log System Not Implemented**

**Problem:** AdminService has `getAuditLog()` method (lines 224-283), but it's completely non-functional:

**Backend Missing:**
- No `/admin/audit` endpoint in `AdminRouteModule.ts`
- No `audit_log` table in database schema
- No audit logging middleware
- No audit event tracking

**Frontend Ready But Broken:**
```typescript
// AdminService.ts has this method:
async getAuditLog(options: {
  limit?: number;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  success: boolean;
  entries: AuditLogEntry[];
  pagination: PaginationInfo;
}> {
  // Sends request to /admin/audit which returns 404
  const response = await httpClient.get<...>(`/admin/audit${query}`);
  return response.data;
}
```

**What Should Be Logged:**
- User role changes (admin actions)
- User deletions
- Security config updates
- Failed login attempts
- Account lockouts
- Tube create/update/delete operations (for sensitive data)
- Configuration changes

---

### 🔴 **Priority 4: Security Configuration Not Applied**

**Detailed Breakdown of What's Ignored:**

#### Password Validation
**File:** `server/src/application/commands/handlers/CreateUserCommandHandler.ts`

**Current Implementation:**
```typescript
private validatePassword(password: string): void {
  if (password.length < 8) {  // ❌ Hardcoded
    throw new ValidationError('Password must be at least 8 characters');
  }
  // Missing: All other password requirements
}
```

**Should Read From Config:**
```typescript
private async validatePassword(password: string): Promise<void> {
  const config = await this.configRepo.getSecurityConfig();

  if (password.length < config.passwordMinLength) {
    throw new ValidationError(
      `Password must be at least ${config.passwordMinLength} characters`
    );
  }

  if (config.requireStrongPasswords) {
    if (!/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new ValidationError('Password must contain lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new ValidationError('Password must contain number');
    }
  }

  if (config.passwordRequireSpecialChars) {
    if (!/[!@#$%^&*]/.test(password)) {
      throw new ValidationError('Password must contain special character');
    }
  }
}
```

#### Session Management
**File:** `server/src/infrastructure/services/JwtSessionService.ts`

**Current:** JWT expiry is hardcoded to 15 minutes and 7 days:
```typescript
const accessToken = jwt.sign(payload, accessSecret, {
  expiresIn: '15m'  // ❌ Should use sessionTimeoutMinutes
});

const refreshToken = jwt.sign(payload, refreshSecret, {
  expiresIn: '7d'  // ❌ Should be configurable
});
```

**Missing:**
- No session tracking table (can't list active sessions)
- No enforcement of `maxConcurrentSessions`
- No inactivity timeout (need to track last activity)

#### Rate Limiting
**File:** `server/src/middleware/RateLimiting.ts`

**Current:** Uses hardcoded values:
```typescript
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,  // ❌ Should use loginAttemptsPerMinute
  skipSuccessfulRequests: true
});
```

**Should Implement:**
```typescript
export const createDynamicRateLimiter = async (
  configRepo: ConfigurationRepository
) => {
  const config = await configRepo.getSecurityConfig();

  if (!config.enableRateLimiting) {
    return (req, res, next) => next(); // Skip if disabled
  }

  return rateLimit({
    windowMs: 60 * 1000,
    max: config.loginAttemptsPerMinute,
    handler: (req, res) => {
      // Implement lockout using lockoutDurationMinutes
      res.status(429).json({
        success: false,
        error: `Too many attempts. Account locked for ${config.lockoutDurationMinutes} minutes.`
      });
    }
  });
};
```

---

### 🟡 **Priority 5: User Management Gaps**

**Missing Features:**

#### 1. User Activity Tracking
**Current:** `lastActivity` field exists but is always `undefined` or "Never"

**Issue:** No middleware updates this timestamp on each request

**Fix Needed:**
```typescript
// Middleware to track last activity
export const trackUserActivityMiddleware = async (req, res, next) => {
  if (req.user) {
    await userRepository.updateLastActivity(req.user.id, new Date());
  }
  next();
};
```

#### 2. Active Session Management
**Missing:**
- No "Force Logout" button for admins
- Cannot view active sessions per user
- No device/browser tracking
- Cannot invalidate all sessions for a user

**Requires:**
```sql
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  refreshToken TEXT NOT NULL,
  deviceInfo TEXT,
  ipAddress TEXT,
  createdAt TEXT NOT NULL,
  lastUsedAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  FOREIGN KEY(userId) REFERENCES users(id)
);
```

#### 3. User Status Management
**Current:** Users can only be deleted (destructive)

**Better Approach:**
- Add `active` boolean to users table
- Allow disable/enable instead of delete
- Show inactive users with visual indicator
- Bulk operations (activate/deactivate multiple users)

#### 4. Invite Code System
**Current Issues:**
- No expiration date on invite codes
- No tracking of which user registered with which code
- Cannot revoke unused codes
- No limit on invite code usage (single-use vs multi-use)

---

### 🟡 **Priority 6: System Statistics Are Incomplete**

**File:** `SQLiteConfigurationRepository.ts` (lines 1062-1110)

**Current Implementation:**
```typescript
async getSystemMetrics(): Promise<SystemMetrics> {
  const totalTubes = await this.sqlite.queryOne<{count: number}>(`
    SELECT COUNT(*) as count FROM tubes
  `);

  const totalUsers = await this.sqlite.queryOne<{count: number}>(`
    SELECT COUNT(*) as count FROM users
  `);

  // ❌ FAKE: Uses configuration version timestamp, not actual backup
  const lastBackup = backupRow?.updated_at || new Date().toISOString();

  return { totalTubes, totalUsers, totalResearchers, lastBackup };
}
```

**Issues:**
1. **"Last Backup" is fake** - Shows config version timestamp, not real backup
2. No actual backup system exists
3. No automated backup scheduling
4. Cannot restore from backups

**Missing Metrics:**
- Database file size
- Query performance statistics
- Error rate tracking
- Active user count (last 24 hours)
- Storage utilization (% of capacity used)

---

### 🟡 **Priority 7: Sync Status Is Stub Implementation**

**File:** `SQLiteConfigurationRepository.ts` (lines 1116-1137)

**Current Code:**
```typescript
async getSyncStatus(): Promise<SyncStatus> {
  const syncEnabled = await this.getSyncEnabled();

  // ❌ Firebase is ALWAYS false (not integrated)
  return {
    enabled: syncEnabled,
    firebase: false,  // Hardcoded
    workspaceId: undefined
  };
}
```

**Issue:** Firebase sync service exists in codebase (`server/src/services/sync/firebaseService.ts`) but isn't connected to admin settings.

**Missing Integration:**
- No actual Firebase connection check
- Cannot toggle sync on/off from admin panel
- No workspace ID display
- No sync status indicators (connected/disconnected/syncing)

---

## Architectural Issues

### 🏗️ **Issue 1: Type Safety Problems**

**Problem:** Using `any` types defeats TypeScript's purpose and introduces runtime errors.

**Locations:**

**AdminSettingsModal.tsx:**
```typescript
// Line 35-37
const [users, setUsers] = useState<any[]>([]);        // ❌ any
const [systemStats, setSystemStats] = useState<any>({}); // ❌ any
const [syncStatus, setSyncStatus] = useState<any>({});   // ❌ any
```

**Tab Component Props:**
```typescript
// UserManagementTab.tsx line 27
users: any[];  // TODO: Replace with proper User type

// SystemConfigTab.tsx lines 27-30
stats: any;         // TODO: Replace with proper SystemStats type
syncStatus: any;    // TODO: Replace with proper SyncStatus type

// MonitoringTab.tsx line 25
stats: any;  // TODO: Replace with proper SystemStats type
```

**Impact:**
- No compile-time type checking
- IDE autocomplete doesn't work
- Easy to introduce bugs by accessing wrong properties
- Harder to refactor (can't find all usages)
- No contract between frontend and backend

**Fix:** Create proper shared types in `@odysseus/shared-schemas`:
```typescript
// packages/shared-schemas/src/admin/adminSchemas.ts
export const adminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(['admin', 'user', 'viewer']),
  createdAt: z.string(),
  lastActivity: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

export const systemMetricsSchema = z.object({
  totalTubes: z.number(),
  totalUsers: z.number(),
  totalResearchers: z.number(),
  lastBackup: z.string(),
  databaseSize: z.number().optional(),
  activeUsers: z.number().optional(),
});

export type SystemMetrics = z.infer<typeof systemMetricsSchema>;
```

---

### 🏗️ **Issue 2: Inconsistent Data Flow**

**Problem:** Mixed approaches for fetching data violates single responsibility.

**AdminSettingsModal.tsx Analysis:**

```typescript
// ✅ Consistent: Uses adminService
const loadUsers = async () => {
  const response = await adminService.getUsers();
  setUsers(response.users);
};

const loadSystemStats = async () => {
  const response = await adminService.getMetrics();
  setSystemStats(response.data);
};

// ❌ Inconsistent: Uses raw httpClient directly
const loadSyncStatus = async () => {
  const { httpClient } = await import('@infra/api/httpClient');
  const response = await httpClient.get<{...}>('/admin/sync-status');
  setSyncStatus(response.data.sync);
};

const createInviteCode = async (role: 'admin' | 'user') => {
  const { httpClient } = await import('@infra/api/httpClient');
  const response = await httpClient.post<{...}>('/admin/create-invite', { role });
  setInviteCode(response.data.inviteCode);
};
```

**Why This Is Bad:**
1. Violates Service Layer pattern (mixing abstractions)
2. Makes testing harder (can't mock just adminService)
3. Inconsistent error handling
4. Duplicate HTTP logic

**Fix:** Add missing methods to AdminService:
```typescript
// AdminService.ts
async getSyncStatus(): Promise<{ success: boolean; sync: SyncStatus }> {
  const response = await httpClient.get<{...}>('/admin/sync-status');
  return response.data;
}

async createInviteCode(role: 'admin' | 'user'): Promise<{ success: boolean; inviteCode: string }> {
  const response = await httpClient.post<{...}>('/admin/create-invite', { role });
  return response.data;
}
```

---

### 🏗️ **Issue 3: No React Query Integration**

**Problem:** Admin modal uses manual state management instead of React Query.

**Current Approach:**
```typescript
// AdminSettingsModal.tsx (lines 41-48)
useEffect(() => {
  if (isOpen) {
    loadConfiguration();
    loadUsers();
    loadSystemStats();
    loadSyncStatus();
  }
}, [isOpen]);
```

**Issues:**
1. **No caching** - Refetches all data every time modal opens
2. **No automatic refetching** - Data can become stale
3. **Manual loading states** - `isSaving` state managed manually
4. **Inconsistent with app** - Rest of app uses React Query (tubes, researchers)
5. **No optimistic updates** - User sees loading spinner on every save
6. **Manual error handling** - Each function has try/catch

**Rest of App Uses React Query:**
- Tubes: `useTubesQuery()`, `useCreateTubeMutation()`
- Researchers: `useResearchersQuery()`, `useUpdateResearcherMutation()`
- Configuration: `useConfigurationQuery()`

**Recommended Fix:** Create admin-specific React Query hooks:

```typescript
// client/src/domains/admin/hooks/useAdminQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/AdminService';
import { queryKeys } from '@app/queryKeys';

export const useAdminUsersQuery = () => {
  return useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: () => adminService.getUsers(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSecurityConfigQuery = () => {
  return useQuery({
    queryKey: queryKeys.admin.securityConfig,
    queryFn: () => adminService.getSecurityConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateSecurityConfigMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<SecurityConfig>) =>
      adminService.updateSecurityConfig(updates),

    // Optimistic update
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.admin.securityConfig });

      const previous = queryClient.getQueryData(queryKeys.admin.securityConfig);

      queryClient.setQueryData(queryKeys.admin.securityConfig, (old: any) => ({
        ...old,
        config: { ...old.config, ...updates }
      }));

      return { previous };
    },

    // Rollback on error
    onError: (err, updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.admin.securityConfig, context.previous);
      }
      notifications.error('Failed to update security configuration');
    },

    // Refetch on success
    onSuccess: () => {
      notifications.success('Security configuration updated');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.securityConfig });
    },
  });
};

export const useUpdateUserRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'user' }) =>
      adminService.updateUserRole(userId, role),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      notifications.success('User role updated');
    },

    onError: () => {
      notifications.error('Failed to update user role');
    },
  });
};

export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      notifications.success('User deleted');
    },

    onError: () => {
      notifications.error('Failed to delete user');
    },
  });
};

export const useSystemMetricsQuery = () => {
  return useQuery({
    queryKey: queryKeys.admin.metrics,
    queryFn: () => adminService.getMetrics(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useSyncStatusQuery = () => {
  return useQuery({
    queryKey: queryKeys.admin.syncStatus,
    queryFn: () => adminService.getSyncStatus(),
    staleTime: 30 * 1000, // 30 seconds
  });
};
```

**Add Query Keys:**
```typescript
// client/src/app/queryKeys.ts
export const queryKeys = {
  // ... existing keys
  admin: {
    all: ['admin'] as const,
    users: ['admin', 'users'] as const,
    securityConfig: ['admin', 'securityConfig'] as const,
    metrics: ['admin', 'metrics'] as const,
    syncStatus: ['admin', 'syncStatus'] as const,
    auditLog: (filters?: AuditLogFilters) =>
      ['admin', 'auditLog', filters] as const,
  }
};
```

**Updated Modal Usage:**
```typescript
// AdminSettingsModal.tsx - simplified with React Query
export function AdminSettingsModal({ isOpen, onClose }: AdminSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('security');

  // Replace all manual useState + useEffect with queries
  const { data: usersData } = useAdminUsersQuery();
  const { data: configData } = useSecurityConfigQuery();
  const { data: metricsData } = useSystemMetricsQuery();
  const { data: syncData } = useSyncStatusQuery();

  const updateConfigMutation = useUpdateSecurityConfigMutation();

  const handleSaveConfig = (updates: Partial<SecurityConfig>) => {
    updateConfigMutation.mutate(updates);
  };

  // All loading/error states handled by React Query
  // Optimistic updates automatic
  // Cache invalidation automatic
  // Refetching on window focus automatic
}
```

**Benefits:**
- Automatic caching (modal opens instantly with cached data)
- Background refetching keeps data fresh
- Optimistic updates for instant UI feedback
- Consistent with rest of application
- Less code (no manual state management)
- Better error handling
- TypeScript inference from query functions

---

### 🏗️ **Issue 4: Missing Shared Schema Validation**

**Problem:** SecurityConfig types are duplicated between client and server, violating DRY and Single Source of Truth.

**Current State:**

**Client:** `client/src/domains/tubes/ui/components/modals/admin-settings/types/SecurityConfig.ts`
```typescript
export interface SecurityConfig {
  useEnhancedAuth: boolean;
  requireStrongPasswords: boolean;
  // ... 12 fields duplicated
}
```

**Server:** `server/src/domain/valueObjects/SecurityConfig.ts`
```typescript
export interface SecurityConfigData {
  useEnhancedAuth: boolean;
  requireStrongPasswords: boolean;
  // ... 12 fields duplicated again
}
```

**Issues:**
1. Types can drift apart (one side updated, other forgotten)
2. No runtime validation on API boundaries
3. Harder to maintain
4. No shared constants (defaults duplicated)

**Recommended Fix:**

**Create:** `packages/shared-schemas/src/admin/adminSchemas.ts`

```typescript
import { z } from 'zod';

/**
 * Security Configuration Schema
 * Single source of truth for admin security settings
 */
export const securityConfigSchema = z.object({
  // Authentication
  useEnhancedAuth: z.boolean(),
  requireStrongPasswords: z.boolean(),
  passwordMinLength: z.number().min(4).max(128),
  passwordRequireSpecialChars: z.boolean(),

  // Session Management
  sessionTimeoutMinutes: z.number().min(5).max(10080), // 5 min to 1 week
  maxConcurrentSessions: z.number().min(1).max(100),

  // Rate Limiting
  enableRateLimiting: z.boolean(),
  loginAttemptsPerMinute: z.number().min(1).max(1000),
  lockoutDurationMinutes: z.number().min(1).max(1440), // 1 min to 24 hours

  // Admin Features
  enableAdminControls: z.boolean(),

  // Audit & Monitoring
  enableDetailedLogging: z.boolean(),
  logFailedAttempts: z.boolean(),
});

export type SecurityConfig = z.infer<typeof securityConfigSchema>;

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  useEnhancedAuth: false,
  requireStrongPasswords: false,
  passwordMinLength: 8,
  passwordRequireSpecialChars: false,
  sessionTimeoutMinutes: 480, // 8 hours
  maxConcurrentSessions: 3,
  enableRateLimiting: false,
  loginAttemptsPerMinute: 10,
  lockoutDurationMinutes: 15,
  enableAdminControls: true,
  enableDetailedLogging: true,
  logFailedAttempts: true,
} as const;

/**
 * Admin User Schema
 */
export const adminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(['admin', 'user', 'viewer']),
  createdAt: z.string(),
  lastActivity: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

/**
 * System Metrics Schema
 */
export const systemMetricsSchema = z.object({
  totalTubes: z.number(),
  totalUsers: z.number(),
  totalResearchers: z.number(),
  lastBackup: z.string(),
  databaseSize: z.number().optional(),
  activeUsersLast24h: z.number().optional(),
});

export type SystemMetrics = z.infer<typeof systemMetricsSchema>;

/**
 * Sync Status Schema
 */
export const syncStatusSchema = z.object({
  enabled: z.boolean(),
  firebase: z.boolean(),
  workspaceId: z.string().optional(),
  lastSyncAt: z.string().optional(),
});

export type SyncStatus = z.infer<typeof syncStatusSchema>;

/**
 * Audit Log Entry Schema
 */
export const auditLogEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  action: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  details: z.string(),
  timestamp: z.string(),
  ipAddress: z.string().optional(),
});

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

/**
 * Audit Log Query Filters Schema
 */
export const auditLogFiltersSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;
```

**Export from shared-schemas:**
```typescript
// packages/shared-schemas/src/index.ts
export * from './admin/adminSchemas';
```

**Usage in Client:**
```typescript
import {
  SecurityConfig,
  DEFAULT_SECURITY_CONFIG,
  AdminUser,
  SystemMetrics
} from '@odysseus/shared-schemas';
```

**Usage in Server:**
```typescript
import {
  securityConfigSchema,
  adminUserSchema
} from '@odysseus/shared-schemas';

// Validate API requests
router.put('/admin/security-config',
  validateBody(securityConfigSchema.partial()), // Allow partial updates
  controller.updateSecurityConfig
);
```

---

### 🏗️ **Issue 5: No Optimistic Updates**

**Problem:** Current implementation makes users wait for server response before updating UI.

**Current Flow:**
```typescript
// UserManagementTab.tsx (lines 71-88)
const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
  setUpdating(userId);  // Show spinner
  try {
    const response = await adminService.updateUserRole(userId, newRole);
    if (response.success) {
      notifications.success(`User role updated to ${newRole}`);
      onUserUpdate(); // Refetch ALL users from server
    }
  } finally {
    setUpdating(null);
  }
};
```

**Issues:**
1. User sees loading spinner during network request
2. Full refetch of all users even though only one changed
3. Inconsistent with rest of app (tubes/researchers use optimistic updates)
4. Poor UX on slow connections

**With React Query + Optimistic Updates:**
```typescript
const updateUserRoleMutation = useMutation({
  mutationFn: ({ userId, role }) => adminService.updateUserRole(userId, role),

  // Instant UI update (before server responds)
  onMutate: async ({ userId, newRole }) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.admin.users });

    const previousUsers = queryClient.getQueryData(queryKeys.admin.users);

    queryClient.setQueryData(queryKeys.admin.users, (old: any) => ({
      ...old,
      users: old.users.map(user =>
        user.id === userId
          ? { ...user, role: newRole }
          : user
      )
    }));

    return { previousUsers }; // Save for rollback
  },

  // Rollback if server rejects
  onError: (err, variables, context) => {
    queryClient.setQueryData(queryKeys.admin.users, context.previousUsers);
    notifications.error('Failed to update user role');
  },

  onSuccess: () => {
    notifications.success('User role updated');
  },
});
```

**User Experience:**
- Click role dropdown → UI updates **instantly**
- Server request happens in background
- If server fails, UI reverts with error message
- Same pattern as tube/researcher updates

---

### 🏗️ **Issue 6: Admin Domain Location**

**Problem:** Admin functionality is split across multiple domains:
- `client/src/domains/authentication/services/AdminService.ts`
- `client/src/domains/tubes/ui/components/modals/AdminSettingsModal.tsx`
- Tab components buried in tubes domain

**Violates:** Domain-Driven Design principles (admin is its own bounded context)

**Recommended Structure:**
```
client/src/domains/admin/
├── hooks/
│   ├── useAdminUsersQuery.ts
│   ├── useSecurityConfigQuery.ts
│   ├── useSystemMetricsQuery.ts
│   ├── useSyncStatusQuery.ts
│   ├── useAuditLogQuery.ts
│   ├── useUpdateUserRoleMutation.ts
│   └── useDeleteUserMutation.ts
├── services/
│   └── AdminService.ts
├── ui/components/
│   ├── AdminSettingsModal.tsx
│   └── tabs/
│       ├── SecurityTab.tsx
│       ├── UserManagementTab.tsx
│       ├── SystemConfigTab.tsx
│       ├── MonitoringTab.tsx
│       └── AuditLogTab.tsx  // NEW
├── types/
│   └── index.ts  // Re-export from shared-schemas
└── index.ts
```

**Benefits:**
- Clear separation of concerns
- Admin code in one place
- Easier to test
- Follows existing pattern (tubes, researchers, search domains)

---

## Feature Recommendations

### 🎯 **Priority 1: Make Settings Actually Work** (1-2 weeks)

Critical functionality that makes the admin panel useful.

#### 1.1 Password Policy Enforcement

**File:** `server/src/application/commands/handlers/CreateUserCommandHandler.ts`

**Implementation:**
```typescript
export class CreateUserCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private configRepository: ConfigurationRepository,  // ADD THIS
    private passwordService: PasswordService
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    // Validate password against security config
    await this.validatePassword(command.password);

    // ... rest of handler
  }

  private async validatePassword(password: string): Promise<void> {
    const config = await this.configRepository.getSecurityConfig();

    // Minimum length
    if (password.length < config.passwordMinLength) {
      throw new ValidationError(
        `Password must be at least ${config.passwordMinLength} characters`
      );
    }

    // Strong password requirements
    if (config.requireStrongPasswords) {
      const errors: string[] = [];

      if (!/[A-Z]/.test(password)) {
        errors.push('uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('lowercase letter');
      }
      if (!/[0-9]/.test(password)) {
        errors.push('number');
      }

      if (errors.length > 0) {
        throw new ValidationError(
          `Password must contain: ${errors.join(', ')}`
        );
      }
    }

    // Special character requirement
    if (config.passwordRequireSpecialChars) {
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        throw new ValidationError(
          'Password must contain at least one special character (!@#$%^&*)'
        );
      }
    }
  }
}
```

**Also Update:**
- `ChangePasswordCommandHandler` - Apply same validation
- `RegisterUserCommandHandler` - Apply same validation

#### 1.2 Session Timeout Configuration

**File:** `server/src/infrastructure/services/JwtSessionService.ts`

**Current:**
```typescript
generateTokenPair(user: User): { accessToken: string; refreshToken: string } {
  const payload = { ... };

  const accessToken = jwt.sign(payload, this.accessSecret, {
    expiresIn: '15m'  // ❌ Hardcoded
  });

  const refreshToken = jwt.sign(payload, this.refreshSecret, {
    expiresIn: '7d'  // ❌ Hardcoded
  });

  return { accessToken, refreshToken };
}
```

**Updated:**
```typescript
export class JwtSessionService {
  constructor(
    private accessSecret: string,
    private refreshSecret: string,
    private configRepository: ConfigurationRepository  // ADD THIS
  ) {}

  async generateTokenPair(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const config = await this.configRepository.getSecurityConfig();

    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    // Use configurable session timeout
    const sessionTimeoutSeconds = config.sessionTimeoutMinutes * 60;

    const accessToken = jwt.sign(payload, this.accessSecret, {
      expiresIn: sessionTimeoutSeconds  // ✅ Dynamic
    });

    // Refresh token: 2x session timeout (or max 7 days)
    const refreshExpiry = Math.min(sessionTimeoutSeconds * 2, 7 * 24 * 60 * 60);

    const refreshToken = jwt.sign(payload, this.refreshSecret, {
      expiresIn: refreshExpiry
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: sessionTimeoutSeconds
    };
  }
}
```

#### 1.3 Rate Limiting Integration

**File:** `server/src/middleware/RateLimiting.ts`

**Current:**
```typescript
export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  max: 100,  // ❌ Hardcoded
  skipSuccessfulRequests: true
});
```

**Updated:**
```typescript
import { ConfigurationRepository } from '../domain/repositories/ConfigurationRepository';

export const createDynamicRateLimiter = (
  configRepository: ConfigurationRepository
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const config = await configRepository.getSecurityConfig();

    // Skip if rate limiting disabled
    if (!config.enableRateLimiting) {
      return next();
    }

    // Create rate limiter with config values
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: config.loginAttemptsPerMinute,
      skipSuccessfulRequests: true,

      handler: async (req, res) => {
        // Log failed attempt
        if (config.logFailedAttempts) {
          await logSecurityEvent({
            type: 'RATE_LIMIT_EXCEEDED',
            userId: req.body?.username,
            ipAddress: req.ip,
            timestamp: new Date()
          });
        }

        res.status(429).json({
          success: false,
          error: `Too many login attempts. Please try again in ${config.lockoutDurationMinutes} minutes.`
        });
      }
    });

    return limiter(req, res, next);
  };
};
```

**Update Server Initialization:**
```typescript
// server/src/index.ts
const rateLimiter = createDynamicRateLimiter(configRepository);
app.use('/api/public/auth/login', rateLimiter);
```

#### 1.4 Session Tracking Table

**Create Migration:**
```sql
-- server/src/infrastructure/database/migrations/007_user_sessions.sql
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  refreshToken TEXT NOT NULL UNIQUE,
  deviceInfo TEXT,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TEXT NOT NULL,
  lastUsedAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  isActive INTEGER DEFAULT 1,
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_sessions_userId ON user_sessions(userId);
CREATE INDEX idx_user_sessions_expiresAt ON user_sessions(expiresAt);
```

**Session Repository:**
```typescript
// server/src/infrastructure/repositories/SQLiteSessionRepository.ts
export class SQLiteSessionRepository {
  async createSession(session: {
    userId: string;
    refreshToken: string;
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<void> {
    const now = new Date().toISOString();

    await this.sqlite.execute(`
      INSERT INTO user_sessions (id, userId, refreshToken, deviceInfo, ipAddress, userAgent, createdAt, lastUsedAt, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      generateId(),
      session.userId,
      session.refreshToken,
      session.deviceInfo || null,
      session.ipAddress || null,
      session.userAgent || null,
      now,
      now,
      session.expiresAt.toISOString()
    ]);
  }

  async getActiveSessions(userId: string): Promise<Session[]> {
    const rows = await this.sqlite.queryMany<SessionRow>(`
      SELECT * FROM user_sessions
      WHERE userId = ?
        AND isActive = 1
        AND datetime(expiresAt) > datetime('now')
      ORDER BY lastUsedAt DESC
    `, [userId]);

    return rows.map(row => this.mapToSession(row));
  }

  async getSessionCount(userId: string): Promise<number> {
    const result = await this.sqlite.queryOne<{ count: number }>(`
      SELECT COUNT(*) as count FROM user_sessions
      WHERE userId = ?
        AND isActive = 1
        AND datetime(expiresAt) > datetime('now')
    `, [userId]);

    return result?.count || 0;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sqlite.execute(`
      UPDATE user_sessions SET isActive = 0 WHERE id = ?
    `, [sessionId]);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.sqlite.execute(`
      UPDATE user_sessions SET isActive = 0 WHERE userId = ?
    `, [userId]);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sqlite.execute(`
      DELETE FROM user_sessions
      WHERE datetime(expiresAt) < datetime('now')
    `);

    return result.changes || 0;
  }
}
```

**Enforce Concurrent Session Limit:**
```typescript
// In JwtSessionService
async generateTokenPair(user: User, req: Request): Promise<TokenPair> {
  const config = await this.configRepository.getSecurityConfig();
  const sessionCount = await this.sessionRepository.getSessionCount(user.id);

  // Enforce max concurrent sessions
  if (sessionCount >= config.maxConcurrentSessions) {
    // Revoke oldest session
    const sessions = await this.sessionRepository.getActiveSessions(user.id);
    const oldestSession = sessions[sessions.length - 1];
    await this.sessionRepository.revokeSession(oldestSession.id);
  }

  const { accessToken, refreshToken, expiresIn } = await this.createTokens(user, config);

  // Store session
  await this.sessionRepository.createSession({
    userId: user.id,
    refreshToken,
    deviceInfo: this.parseDeviceInfo(req),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    expiresAt: new Date(Date.now() + expiresIn * 1000)
  });

  return { accessToken, refreshToken, expiresIn };
}
```

---

### 🎯 **Priority 2: Build Audit Log System** (1 week)

Complete implementation of audit logging for security and compliance.

#### 2.1 Database Schema

**Migration:**
```sql
-- server/src/infrastructure/database/migrations/008_audit_log.sql
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  entityType TEXT,
  entityId TEXT,
  details TEXT,
  ipAddress TEXT,
  userAgent TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY(userId) REFERENCES users(id)
);

CREATE INDEX idx_audit_log_userId ON audit_log(userId);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_entityType ON audit_log(entityType);
```

#### 2.2 Audit Log Repository

**File:** `server/src/infrastructure/repositories/SQLiteAuditLogRepository.ts`

```typescript
export interface AuditLogEntry {
  id: string;
  userId: string;
  username: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export class SQLiteAuditLogRepository {
  constructor(private sqlite: SQLiteContext) {}

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const id = generateId();
    const timestamp = new Date().toISOString();

    await this.sqlite.execute(`
      INSERT INTO audit_log (id, userId, username, action, entityType, entityId, details, ipAddress, userAgent, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      entry.userId,
      entry.username,
      entry.action,
      entry.entityType || null,
      entry.entityId || null,
      entry.details,
      entry.ipAddress || null,
      entry.userAgent || null,
      timestamp
    ]);
  }

  async getEntries(filters: AuditLogFilters): Promise<{
    entries: AuditLogEntry[];
    total: number;
  }> {
    let sql = 'SELECT * FROM audit_log WHERE 1=1';
    const params: any[] = [];

    if (filters.userId) {
      sql += ' AND userId = ?';
      params.push(filters.userId);
    }

    if (filters.action) {
      sql += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters.entityType) {
      sql += ' AND entityType = ?';
      params.push(filters.entityType);
    }

    if (filters.dateFrom) {
      sql += ' AND datetime(timestamp) >= datetime(?)';
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      sql += ' AND datetime(timestamp) <= datetime(?)';
      params.push(filters.dateTo);
    }

    // Get total count
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await this.sqlite.queryOne<{ count: number }>(countSql, params);
    const total = countResult?.count || 0;

    // Get paginated results
    sql += ' ORDER BY timestamp DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = await this.sqlite.queryMany<any>(sql, params);
    const entries = rows.map(row => ({
      id: row.id,
      userId: row.userId,
      username: row.username,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      details: row.details,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      timestamp: new Date(row.timestamp)
    }));

    return { entries, total };
  }

  async getRecentActions(userId: string, limit: number = 10): Promise<AuditLogEntry[]> {
    const { entries } = await this.getEntries({ userId, limit });
    return entries;
  }

  async getActionsByType(action: string, limit: number = 100): Promise<AuditLogEntry[]> {
    const { entries } = await this.getEntries({ action, limit });
    return entries;
  }
}
```

#### 2.3 Audit Logging Middleware

**File:** `server/src/middleware/AuditMiddleware.ts`

```typescript
export const createAuditMiddleware = (
  auditRepo: SQLiteAuditLogRepository
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only audit state-changing operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Log after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = (req as any).user;

        if (user) {
          auditRepo.log({
            userId: user.id,
            username: user.username,
            action: `${req.method} ${req.path}`,
            entityType: extractEntityType(req.path),
            entityId: req.params.id,
            details: JSON.stringify({
              method: req.method,
              path: req.path,
              body: sanitizeBody(req.body)
            }),
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          }).catch(err => {
            console.error('Failed to write audit log:', err);
          });
        }
      }

      return originalJson(body);
    };

    next();
  };
};

function extractEntityType(path: string): string | undefined {
  if (path.includes('/tubes')) return 'tube';
  if (path.includes('/researchers')) return 'researcher';
  if (path.includes('/users')) return 'user';
  if (path.includes('/security-config')) return 'security_config';
  return undefined;
}

function sanitizeBody(body: any): any {
  // Remove sensitive data before logging
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.passwordHash;
  delete sanitized.refreshToken;
  return sanitized;
}
```

#### 2.4 Backend Endpoint

**Add to AdminRouteModule:**
```typescript
// server/src/presentation/routes/AdminRouteModule.ts
configure(router: Router): void {
  // ... existing routes

  router.get('/audit',
    validateQuery(auditLogFiltersSchema),
    this.authController.getAuditLog.bind(this.authController)
  );
}
```

**Add to AuthController:**
```typescript
// server/src/presentation/controllers/AuthController.ts
async getAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters: AuditLogFilters = {
      userId: req.query.userId as string,
      action: req.query.action as string,
      entityType: req.query.entityType as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const { entries, total } = await this.auditLogRepository.getEntries(filters);

    res.json({
      success: true,
      entries,
      pagination: {
        total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + entries.length < total
      }
    });
  } catch (error) {
    next(error);
  }
}
```

#### 2.5 Frontend Audit Log Tab

**File:** `client/src/domains/admin/ui/components/tabs/AuditLogTab.tsx`

```typescript
import { useState } from 'react';
import { useAuditLogQuery } from '../../../hooks/useAuditLogQuery';
import { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';

export function AuditLogTab() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 50,
    offset: 0
  });

  const { data, isLoading, refetch } = useAuditLogQuery(filters);

  const formatAction = (action: string): string => {
    return action.replace('_', ' ').toLowerCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
        <button onClick={() => refetch()} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Filter by user..."
          className="input"
          onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
        />
        <input
          type="text"
          placeholder="Filter by action..."
          className="input"
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
        />
        <input
          type="date"
          placeholder="From date..."
          className="input"
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
        />
        <input
          type="date"
          placeholder="To date..."
          className="input"
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Entity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : data?.entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No audit entries found
                </td>
              </tr>
            ) : (
              data?.entries.map((entry: AuditLogEntry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {entry.username}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatAction(entry.action)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {entry.entityType && entry.entityId ? (
                      <span>
                        {entry.entityType} <code className="text-xs">{entry.entityId.slice(0, 8)}</code>
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <details>
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        View
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(JSON.parse(entry.details), null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filters.offset! + 1} - {Math.min(filters.offset! + filters.limit!, data.pagination.total)} of {data.pagination.total}
          </div>
          <div className="flex space-x-2">
            <button
              disabled={filters.offset === 0}
              onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset! - filters.limit!) })}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <button
              disabled={!data.pagination.hasMore}
              onClick={() => setFilters({ ...filters, offset: filters.offset! + filters.limit! })}
              className="btn btn-secondary"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 🎯 **Priority 3: Complete Monitoring Tab** (1 week)

Real-time security and system health monitoring.

#### 3.1 Security Events Dashboard

**Add Metrics Endpoints:**

```typescript
// AuthController.ts
async getSecurityMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hours = parseInt(req.query.hours as string) || 24;

    const metrics = {
      loginAttempts: await this.getLoginAttempts(hours),
      failedLogins: await this.getFailedLogins(hours),
      accountLockouts: await this.getAccountLockouts(hours),
      activeSessions: await this.getActiveSessionsCount(),
      recentEvents: await this.getRecentSecurityEvents(10)
    };

    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}

private async getLoginAttempts(hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const result = await this.auditLogRepository.getEntries({
    action: 'LOGIN',
    dateFrom: since
  });
  return result.total;
}

private async getFailedLogins(hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const result = await this.auditLogRepository.getEntries({
    action: 'LOGIN_FAILED',
    dateFrom: since
  });
  return result.total;
}
```

**Frontend Monitoring Dashboard:**

```typescript
// MonitoringTab.tsx (replace placeholder)
export function MonitoringTab({ stats, onRefresh }: MonitoringTabProps) {
  const { data: securityMetrics } = useSecurityMetricsQuery();
  const { data: activeSessions } = useActiveSessionsQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">System Monitoring</h3>
        <button onClick={onRefresh} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Security Metrics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {securityMetrics?.loginAttempts || 0}
          </div>
          <div className="text-sm text-blue-800">Login Attempts (24h)</div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {securityMetrics?.failedLogins || 0}
          </div>
          <div className="text-sm text-red-800">Failed Logins (24h)</div>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-amber-600">
            {securityMetrics?.accountLockouts || 0}
          </div>
          <div className="text-sm text-amber-800">Account Lockouts (24h)</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {activeSessions?.count || 0}
          </div>
          <div className="text-sm text-green-800">Active Sessions</div>
        </div>
      </div>

      {/* Login Attempts Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Login Activity (Last 24 Hours)</h4>
        <LoginAttemptsChart data={securityMetrics?.loginChart} />
      </div>

      {/* Active Sessions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <h4 className="font-medium text-gray-900 p-4 border-b">Active User Sessions</h4>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Device
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Last Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activeSessions?.sessions.map((session) => (
              <tr key={session.id}>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {session.username}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {session.deviceInfo || 'Unknown'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {session.ipAddress}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDistanceToNow(new Date(session.lastUsedAt))} ago
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => revokeSession(session.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Force Logout
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Security Events */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Recent Security Events</h4>
        <div className="space-y-2">
          {securityMetrics?.recentEvents.map((event) => (
            <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div>
                <span className="text-sm font-medium text-gray-900">{event.action}</span>
                <span className="text-xs text-gray-600 ml-2">{event.username}</span>
              </div>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(event.timestamp))} ago
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 🎯 **Priority 4: Enhanced User Management** (3-5 days)

Improve user administration capabilities.

#### 4.1 User Activity Tracking

**Add Middleware:**
```typescript
// server/src/middleware/UserActivityMiddleware.ts
export const trackUserActivity = (userRepository: UserRepository) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (user) {
      // Update in background (don't wait)
      userRepository.updateLastActivity(user.id, new Date())
        .catch(err => console.error('Failed to update user activity:', err));
    }

    next();
  };
};
```

**Update User Repository:**
```typescript
// Add to SQLiteUserRepository
async updateLastActivity(userId: string, timestamp: Date): Promise<void> {
  await this.sqlite.execute(`
    UPDATE users SET lastActivity = ? WHERE id = ?
  `, [timestamp.toISOString(), userId]);
}
```

#### 4.2 User Status Management

**Migration:**
```sql
ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN deactivatedAt TEXT;
ALTER TABLE users ADD COLUMN deactivatedBy TEXT;
```

**Add Endpoints:**
```typescript
// AdminRouteModule
router.patch('/users/:id/status',
  validateParams(z.object({ id: z.string() })),
  validateBody(z.object({ isActive: z.boolean() })),
  this.authController.updateUserStatus.bind(this.authController)
);

router.post('/users/bulk-update',
  validateBody(z.object({
    userIds: z.array(z.string()),
    action: z.enum(['activate', 'deactivate'])
  })),
  this.authController.bulkUpdateUsers.bind(this.authController)
);
```

#### 4.3 Session Management UI

**Add to UserManagementTab:**
```typescript
// Add column to user table
<th>Active Sessions</th>

// In row:
<td className="px-6 py-4 text-sm">
  <button
    onClick={() => viewUserSessions(user.id)}
    className="text-blue-600 hover:text-blue-800"
  >
    {user.sessionCount || 0} sessions
  </button>
</td>

// Modal to show user sessions
<SessionsModal
  isOpen={sessionsModalOpen}
  userId={selectedUserId}
  onClose={() => setSessionsModalOpen(false)}
  onRevokeSession={handleRevokeSession}
  onRevokeAll={handleRevokeAllSessions}
/>
```

---

### 🎯 **Priority 5: Backup & Recovery** (1 week)

Implement real backup system to replace fake timestamps.

#### 5.1 Database Backup Service

**File:** `server/src/services/BackupService.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { SQLiteContext } from '../infrastructure/database/SQLiteContext';

export class BackupService {
  private backupDir: string;

  constructor(
    private sqlite: SQLiteContext,
    backupDirectory: string
  ) {
    this.backupDir = backupDirectory;
  }

  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `odysseus-backup-${timestamp}.sqlite`;
    const backupPath = path.join(this.backupDir, backupFileName);

    // Ensure backup directory exists
    await fs.mkdir(this.backupDir, { recursive: true });

    // SQLite backup command
    await this.sqlite.execute(`VACUUM INTO '${backupPath}'`);

    console.log(`📦 [BACKUP] Database backup created: ${backupFileName}`);

    // Log backup to database
    await this.logBackup(backupFileName, backupPath);

    return backupPath;
  }

  async listBackups(): Promise<Array<{
    filename: string;
    path: string;
    size: number;
    createdAt: Date;
  }>> {
    const files = await fs.readdir(this.backupDir);
    const backupFiles = files.filter(f => f.startsWith('odysseus-backup-'));

    const backups = await Promise.all(
      backupFiles.map(async (filename) => {
        const filePath = path.join(this.backupDir, filename);
        const stats = await fs.stat(filePath);

        return {
          filename,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime
        };
      })
    );

    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async restoreBackup(backupPath: string): Promise<void> {
    // Validate backup file exists
    await fs.access(backupPath);

    // Close current connection
    await this.sqlite.close();

    // Copy backup to current database location
    const currentDbPath = this.sqlite.getDatabasePath();
    await fs.copyFile(backupPath, currentDbPath);

    // Reconnect
    await this.sqlite.connect();

    console.log(`🔄 [BACKUP] Database restored from: ${backupPath}`);
  }

  async deleteOldBackups(keepCount: number): Promise<number> {
    const backups = await this.listBackups();

    if (backups.length <= keepCount) {
      return 0;
    }

    const toDelete = backups.slice(keepCount);

    await Promise.all(
      toDelete.map(backup => fs.unlink(backup.path))
    );

    console.log(`🗑️ [BACKUP] Deleted ${toDelete.length} old backups`);

    return toDelete.length;
  }

  private async logBackup(filename: string, path: string): Promise<void> {
    await this.sqlite.execute(`
      INSERT INTO backup_history (id, filename, path, createdAt)
      VALUES (?, ?, ?, datetime('now'))
    `, [generateId(), filename, path]);
  }

  async scheduleAutomaticBackups(intervalHours: number): Promise<void> {
    setInterval(async () => {
      try {
        await this.createBackup();
        await this.deleteOldBackups(10); // Keep last 10 backups
      } catch (error) {
        console.error('Automatic backup failed:', error);
      }
    }, intervalHours * 60 * 60 * 1000);
  }
}
```

#### 5.2 Backup Endpoints

```typescript
// AdminRouteModule
router.post('/backup/create',
  this.adminController.createBackup.bind(this.adminController)
);

router.get('/backup/list',
  this.adminController.listBackups.bind(this.adminController)
);

router.post('/backup/restore',
  validateBody(z.object({ backupPath: z.string() })),
  this.adminController.restoreBackup.bind(this.adminController)
);

router.delete('/backup/:filename',
  validateParams(z.object({ filename: z.string() })),
  this.adminController.deleteBackup.bind(this.adminController)
);
```

#### 5.3 Backup UI

**Add to SystemConfigTab:**
```typescript
<div>
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Backups</h3>

  <div className="space-y-4">
    <div className="flex space-x-3">
      <button onClick={createBackup} className="btn btn-primary">
        Create Backup Now
      </button>
      <button onClick={loadBackups} className="btn btn-secondary">
        Refresh List
      </button>
    </div>

    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Backup
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {backups.map((backup) => (
            <tr key={backup.filename}>
              <td className="px-6 py-4 text-sm font-mono text-gray-900">
                {backup.filename}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {new Date(backup.createdAt).toLocaleString()}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {formatBytes(backup.size)}
              </td>
              <td className="px-6 py-4 text-sm space-x-3">
                <button
                  onClick={() => downloadBackup(backup.path)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Download
                </button>
                <button
                  onClick={() => restoreBackup(backup.path)}
                  className="text-green-600 hover:text-green-800"
                >
                  Restore
                </button>
                <button
                  onClick={() => deleteBackup(backup.filename)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>
```

---

## Implementation Roadmap

### **Phase 1: Make It Work** (1-2 weeks)
**Goal:** Security settings actually affect system behavior

**Tasks:**
1. ✅ Enforce password policies in CreateUserCommand (2 days)
2. ✅ Make session timeout configurable (2 days)
3. ✅ Connect rate limiting to security config (2 days)
4. ✅ Implement session tracking table (1 day)
5. ✅ Enforce concurrent session limits (1 day)
6. ✅ Add proper TypeScript types (replace `any`) (1 day)

**Deliverables:**
- Password policy enforcement working
- Session timeout respects admin config
- Rate limiting uses configured values
- All `any` types replaced with proper interfaces

---

### **Phase 2: Observability** (1 week)
**Goal:** Complete visibility into system activity

**Tasks:**
1. ✅ Create audit_log table and migration (1 day)
2. ✅ Build AuditLogRepository (1 day)
3. ✅ Implement audit middleware (1 day)
4. ✅ Add /admin/audit endpoint (1 day)
5. ✅ Build AuditLogTab component (1 day)
6. ✅ Add user activity tracking middleware (1 day)
7. ✅ Complete MonitoringTab with real metrics (1 day)

**Deliverables:**
- Full audit log system operational
- User activity timestamps tracked
- Monitoring dashboard shows real data

---

### **Phase 3: Polish** (1 week)
**Goal:** Production-ready code quality

**Tasks:**
1. ✅ Create admin schemas in shared-schemas (1 day)
2. ✅ Build React Query hooks (2 days)
3. ✅ Implement optimistic updates (1 day)
4. ✅ Move admin to dedicated domain (1 day)
5. ✅ Add comprehensive error handling (1 day)
6. ✅ Write unit tests for core functionality (1 day)

**Deliverables:**
- Consistent type safety across client/server
- React Query integration complete
- Clean domain structure
- Test coverage for critical paths

---

### **Phase 4: Advanced Features** (2-3 weeks)
**Goal:** Enterprise-grade admin capabilities

**Tasks:**
1. ✅ Build backup/restore system (3 days)
2. ✅ Enhanced user management (user status, bulk ops) (3 days)
3. ✅ Active session management UI (2 days)
4. ✅ Invite code improvements (expiration, tracking) (2 days)
5. ✅ Security metrics dashboard (2 days)
6. ✅ Export audit log to CSV (1 day)
7. ⭐ Two-factor authentication (optional, 5 days)

**Deliverables:**
- Real backup system replacing fake timestamps
- Complete user lifecycle management
- Production-ready monitoring
- Optional: 2FA support

---

## Total Effort Estimate

**Conservative Estimate:** 5-7 weeks for full production-ready system

**Breakdown:**
- Phase 1 (Critical): 1-2 weeks
- Phase 2 (Observability): 1 week
- Phase 3 (Polish): 1 week
- Phase 4 (Advanced): 2-3 weeks

**Can be delivered incrementally** - Each phase provides value independently.

---

## Success Metrics

### **Phase 1 Complete:**
- [ ] Password policies actually enforced
- [ ] Session timeout configurable and working
- [ ] Rate limiting uses admin config values
- [ ] Concurrent sessions limited per user
- [ ] Zero `any` types in admin code

### **Phase 2 Complete:**
- [ ] Audit log captures all admin actions
- [ ] User activity timestamps accurate
- [ ] Monitoring tab shows real metrics
- [ ] Failed login attempts logged

### **Phase 3 Complete:**
- [ ] All admin types in shared-schemas
- [ ] React Query hooks replace manual state
- [ ] Optimistic updates working
- [ ] Admin domain properly structured
- [ ] Test coverage >70%

### **Phase 4 Complete:**
- [ ] Real backups can be created/restored
- [ ] User status management working
- [ ] Active sessions visible and manageable
- [ ] Invite codes expire and track usage
- [ ] Security dashboard shows trends

---

## Risk Assessment

### **Low Risk:**
- Type safety improvements (mechanical refactor)
- React Query migration (well-established pattern)
- Audit log implementation (standard CRUD)

### **Medium Risk:**
- Session management changes (requires careful testing)
- Rate limiting integration (need to handle edge cases)
- Backup/restore (database operations always risky)

### **High Risk:**
- None identified (all changes are additive, no breaking changes)

### **Mitigation Strategies:**
1. **Test in development first** - All security changes need thorough testing
2. **Feature flags** - Can disable new features if issues arise
3. **Rollback plan** - Keep old code paths until new ones proven
4. **Incremental rollout** - Deploy phase by phase, not all at once

---

## Conclusion

The admin settings system has a **solid architectural foundation** but lacks **critical enforcement** that makes it actually useful. The UI is professional and the data persistence works, but without backend enforcement, it's essentially a "fake dashboard."

**Recommended Approach:**
1. Start with **Phase 1** (enforcement) - This provides immediate value
2. Follow with **Phase 2** (observability) - Essential for security compliance
3. Complete **Phase 3** (polish) - Brings code quality to production standards
4. Add **Phase 4** (advanced) - Differentiates from basic admin panels

**Total investment:** 5-7 weeks for enterprise-grade admin system that actually works.

**Alternative:** If time is constrained, **Phases 1 + 2** (2-3 weeks) provide 80% of the value.
