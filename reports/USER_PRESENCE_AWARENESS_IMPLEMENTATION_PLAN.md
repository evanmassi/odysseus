# User Presence Awareness - Implementation Plan

## Overview

Real-time user presence awareness feature that displays which users are currently online in the application. Uses the existing Socket.IO infrastructure and the OwnershipIndicatorBadge component pattern to show online users with their initials in badge form.

## Architecture Summary

### What This Feature Does
- Shows real-time online/offline status for all users
- Displays online users as initials badges (similar to OwnershipIndicatorBadge)
- Updates instantly when users connect or disconnect
- Works across all connected clients in real-time
- Excludes current user from display (you know you're online)

### Design Principles
- Leverages existing Socket.IO infrastructure (no new dependencies)
- Follows established patterns from queryBridge and SocketEventHandler
- Uses React Query for client-side state management
- Minimal server-side memory footprint
- Graceful handling of disconnections and reconnections
- Graceful degradation on errors (badges simply don't show)

### Known Limitations (v1)

**Multi-Tab Behavior**: If a user opens multiple browser tabs:
- Each tab creates a separate socket connection
- Last tab to close triggers "offline" status
- This is a common limitation in presence systems
- Future enhancement could use reference counting or BroadcastChannel API

---

## Implementation Phases

Implementation follows a dependency-ordered sequence. Each phase is independently testable before proceeding.

### Phase 1: Server Infrastructure ✅ COMPLETE
| Step | File | Action | Status |
|------|------|--------|--------|
| 1.1 | `server/src/application/services/PresenceService.ts` | Create | ✅ |
| 1.2 | `server/src/presentation/middleware/socketAuth.ts` | Create | ✅ |
| 1.3 | `server/src/infrastructure/di/ServiceContainer.ts` | Add `getPresenceService()` getter | ✅ |
| 1.4 | `server/src/application/eventHandlers/SocketEventHandler.ts` | Add presenceService param + handlers | ✅ |
| 1.5 | `server/src/infrastructure/di/ServiceContainer.ts` | Update `getSocketEventHandler()` | ✅ |
| 1.6 | `server/src/index.ts` | Register socket auth middleware in `setupServices()` | ✅ |

**Test**: Connect browser, check server logs for authenticated socket + presence events

### Phase 2: Server API ✅ COMPLETE
| Step | File | Action | Status |
|------|------|--------|--------|
| 2.1 | `server/src/presentation/routes/PresenceRouteModule.ts` | Create | ✅ |
| 2.2 | `server/src/presentation/routes/index.ts` | Export PresenceRouteModule | ✅ |
| 2.3 | `server/src/index.ts` | Register PresenceRouteModule in `setupRoutes()` | ✅ |

**Test**: `curl -H "Authorization: Bearer <token>" http://localhost:3001/api/presence/online`

### Phase 3: Client Infrastructure ✅ COMPLETE
| Step | File | Action | Status |
|------|------|--------|--------|
| 3.1 | `client/src/app/queryKeys.ts` | Add presence query keys | ✅ |
| 3.2 | `client/src/domains/users/services/PresenceService.ts` | Create | ✅ |
| 3.3 | `client/src/domains/users/hooks/usePresenceQuery.ts` | Create | ✅ |
| 3.4 | `client/src/domains/users/index.ts` | Export presence hooks | ✅ |
| 3.5 | `client/src/infrastructure/socket/SocketService.ts` | Add auth token + reconnect handler | ✅ |
| 3.6 | `client/src/infrastructure/socket/queryBridge.ts` | Add presence event handlers | ✅ |

**Test**: Check Network tab for `/presence/online`, browser console for socket events

### Phase 4: Client UI ✅ COMPLETE
| Step | File | Action | Status |
|------|------|--------|--------|
| 4.1 | `client/src/shared/ui/components/presence/OnlineUsersBadges.tsx` | Create | ✅ |
| 4.2 | `client/src/shared/ui/components/presence/UserPresenceBadge.tsx` | Create | ✅ |
| 4.3 | `client/src/shared/ui/components/presence/index.ts` | Create barrel export | ✅ |
| 4.4 | `client/src/shared/ui/components/index.ts` | Export presence components | ✅ |
| 4.5 | `client/src/app/components/layout/AppHeader.tsx` | Add OnlineUsersBadges | ✅ |

**Test**: Open two browsers with different users, verify badges appear/disappear in real-time

---

## Implementation Components

### Server-Side Changes

#### 1. Create PresenceService (`server/src/application/services/PresenceService.ts`)

**Purpose**: Tracks which users are currently connected via Socket.IO.

```typescript
// NEW FILE: server/src/application/services/PresenceService.ts

interface ConnectedUser {
  userId: string;
  socketId: string;
  connectedAt: Date;
}

export class PresenceService {
  // userId → ConnectedUser (supports one connection per user for simplicity)
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  // socketId → userId (for quick lookup on disconnect)
  private socketToUser: Map<string, string> = new Map();

  /**
   * Register user connection
   * If user already connected (multi-tab), overwrites with new socket
   */
  public registerConnection(userId: string, socketId: string): void {
    // Remove old socket mapping if user was already connected
    const existing = this.connectedUsers.get(userId);
    if (existing) {
      this.socketToUser.delete(existing.socketId);
    }

    this.connectedUsers.set(userId, {
      userId,
      socketId,
      connectedAt: new Date(),
    });
    this.socketToUser.set(socketId, userId);
  }

  /**
   * Remove user connection
   * Only removes from connectedUsers if this socket is the active one
   * (prevents multi-tab bug where closing old tab removes new connection)
   */
  public removeConnection(socketId: string): string | undefined {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return undefined;

    // Only remove from connectedUsers if THIS socket is the active one
    const connectedUser = this.connectedUsers.get(userId);
    if (connectedUser?.socketId === socketId) {
      this.connectedUsers.delete(userId);
    }

    // Always clean up socketToUser mapping
    this.socketToUser.delete(socketId);
    return userId;
  }

  public getOnlineUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getOnlineCount(): number {
    return this.connectedUsers.size;
  }
}
```

**Key Design Decisions**:
- One active connection per user (last connection wins if user opens multiple tabs)
- Multi-tab safe: closing an old tab doesn't remove a newer connection
- In-memory storage only (presence doesn't need persistence)
- O(1) lookups for both socket-to-user and user-to-socket mappings

#### 2. Add Socket Authentication Middleware (`server/src/presentation/middleware/socketAuth.ts`)

**Purpose**: Authenticates socket connections using existing JWT tokens.

```typescript
// NEW FILE: server/src/presentation/middleware/socketAuth.ts

import type { Socket } from 'socket.io';
import type { ExtendedError } from 'socket.io/dist/namespace';
import type { JwtSessionService } from '@infrastructure/services/JwtSessionService';
import { logger } from '@utils/logger';

// Extends Socket with authenticated user info
declare module 'socket.io' {
  interface Socket {
    userId?: string;
    username?: string;
  }
}

/**
 * Creates Socket.IO authentication middleware
 * Uses existing JwtSessionService from ServiceContainer
 */
export function createSocketAuthMiddleware(
  sessionService: JwtSessionService
): (socket: Socket, next: (err?: ExtendedError) => void) => void {
  return async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        // Allow unauthenticated connections (they just won't have presence)
        // This maintains backward compatibility
        logger.debug('Socket connected without auth token');
        return next();
      }

      // Validate token using existing service
      const validation = await sessionService.validateSession(token);

      if (validation.outcome === 'valid' && validation.user) {
        socket.userId = validation.user.id;
        socket.username = validation.user.username;
        logger.debug('Socket authenticated', { userId: socket.userId });
      }

      next();
    } catch (error) {
      logger.error('Socket auth error', { error });
      // Don't reject - allow connection but without auth
      next();
    }
  };
}
```

**How It Works**:
1. Client sends JWT token in socket handshake (`auth.token`)
2. Middleware validates token using existing `JwtSessionService.validateSession()`
3. Attaches `userId` and `username` to socket instance
4. Unauthenticated connections allowed (for backward compatibility) but won't trigger presence

**Service Access**: `JwtSessionService` is available from `ServiceContainer` - pass it when registering middleware in `server/src/index.ts`

#### 3. Update SocketEventHandler (`server/src/application/eventHandlers/SocketEventHandler.ts`)

**Changes Required**:
- Inject PresenceService dependency (BREAKING: constructor signature changes)
- Register user on socket `connection` event
- Remove user on socket `disconnect` event
- Emit `user_online` and `user_offline` events

```typescript
// MODIFY: server/src/application/eventHandlers/SocketEventHandler.ts

import { PresenceService } from '@application/services/PresenceService';

export class SocketEventHandler {
  constructor(
    private io: SocketIOServer,
    private eventBus: EventBus,
    private presenceService: PresenceService  // NEW REQUIRED PARAMETER
  ) {
    this.subscribeToEvents();
    this.setupPresenceHandlers();  // NEW METHOD
  }

  // BREAKING CHANGE: ServiceContainer.ts must be updated to pass PresenceService
  // Find: new SocketEventHandler(io, eventBus)
  // Replace: new SocketEventHandler(io, eventBus, presenceService)

  private setupPresenceHandlers(): void {
    this.io.on('connection', (socket) => {
      // Only register authenticated users
      if (socket.userId) {
        this.presenceService.registerConnection(socket.userId, socket.id);

        // Broadcast to all clients that user came online
        this.io.emit('user_online', {
          userId: socket.userId,
          onlineUserIds: this.presenceService.getOnlineUserIds(),
          timestamp: new Date().toISOString()
        });
      }

      socket.on('disconnect', () => {
        const userId = this.presenceService.removeConnection(socket.id);

        // Only emit user_offline if user is actually offline now
        // (removeConnection returns userId but user may still be connected on another tab)
        if (userId && !this.presenceService.isUserOnline(userId)) {
          this.io.emit('user_offline', {
            userId,
            onlineUserIds: this.presenceService.getOnlineUserIds(),
            timestamp: new Date().toISOString()
          });
        }
      });
    });
  }
}
```

#### 4. Add Presence REST Endpoint (`server/src/presentation/routes/PresenceRouteModule.ts`)

**Purpose**: Allows clients to fetch initial presence state on app load.

```typescript
// NEW FILE: server/src/presentation/routes/PresenceRouteModule.ts

import { Router, RequestHandler } from 'express';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { RouteModule } from '@presentation/routes/RouteModule';
import { PresenceService } from '@application/services/PresenceService';

/**
 * Presence Route Module
 * Handles presence-related HTTP routes (online users)
 * All routes require authentication.
 */
export class PresenceRouteModule implements RouteModule {
  constructor(
    private presenceService: PresenceService,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/presence';  // Matches pattern: /api/users, /api/tubes, etc.
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate.bind(this.authMiddleware)
    ];
  }

  configure(router: Router): void {
    /**
     * GET /api/presence/online
     * Get list of currently online users
     * Returns: { success: true, onlineUserIds: string[], count: number }
     */
    router.get('/online', (req, res) => {
      const onlineUserIds = this.presenceService.getOnlineUserIds();
      res.json({
        success: true,
        onlineUserIds,
        count: onlineUserIds.length,
      });
    });
  }
}
```

**Why REST + Socket**:
- REST for initial state on app load (React Query can cache it)
- Socket for real-time updates (instant push notifications)

**Route Registration**: Add to `RouteRegistry.ts` or `server/src/index.ts` where other routes are registered

#### 5. Update Server Index (`server/src/index.ts`)

**Changes Required**:
- Register socket auth middleware before connection handlers
- PresenceService instantiation handled by ServiceContainer

```typescript
// In setupSocket() method, BEFORE existing connection handlers:

private setupSocket(): void {
  this.io = new SocketIOServer(this.server, {
    // ... existing options ...
  });

  // NEW: Register socket authentication middleware
  // Must be called BEFORE io.on('connection', ...) handlers
  const sessionService = this.serviceContainer.getSessionService();
  this.io.use(createSocketAuthMiddleware(sessionService));

  // Existing connection handlers...
  this.io.on('connection', (socket) => {
    // socket.userId and socket.username now available if authenticated
    logger.info(`Client connected: ${socket.id}`, {
      userId: socket.userId,
      authenticated: !!socket.userId
    });
    // ...
  });
}
```

**Note**: Socket middleware must be registered before `io.on('connection')` handlers. The order matters.

#### 6. Update ServiceContainer (`server/src/infrastructure/di/ServiceContainer.ts`)

**Changes Required**:
- Add PresenceService instance field and getter
- Update SocketEventHandler construction to pass PresenceService

```typescript
// Add to class fields:
private presenceService?: PresenceService;

// Add getter method:
getPresenceService(): PresenceService {
  if (!this.presenceService) {
    this.presenceService = new PresenceService();
  }
  return this.presenceService;
}

// Update getSocketEventHandler():
getSocketEventHandler(): SocketEventHandler | null {
  if (!this.socketIO) {
    logger.warn('Socket.IO not initialized. Call setSocketIO() first.');
    return null;
  }

  if (!this.socketEventHandler) {
    this.socketEventHandler = new SocketEventHandler(
      this.socketIO,
      this.getEventBus(),
      this.getPresenceService()  // NEW PARAMETER
    );
  }
  return this.socketEventHandler;
}
```

---

### Client-Side Changes

#### 1. Update SocketService (`client/src/infrastructure/socket/SocketService.ts`)

**Changes Required**:
- Send JWT token in socket handshake for authentication
- Update token on reconnection (handles token refresh during long sessions)
- Handle case where socket initializes before authentication

```typescript
// MODIFY: client/src/infrastructure/socket/SocketService.ts

// IMPORTANT: Import sessionManager via getter to avoid circular dependency
// Option A: Pass sessionManager as parameter to initialize()
// Option B: Use lazy import or getter function

// In initialize() method:
public async initialize(getSessionManager?: () => SessionManager): Promise<void> {
  // ... existing checks ...

  // Get current access token (may be null if not yet authenticated)
  // This is OK - server allows unauthenticated sockets, they just won't have presence
  const sessionManager = getSessionManager?.();
  const tokens = sessionManager?.getTokens();
  const accessToken = tokens?.accessToken ?? undefined;

  // Create socket connection WITH authentication (if available)
  this.socket = io(SOCKET_CONFIG.url, {
    ...SOCKET_CONFIG.options,
    auth: {
      token: accessToken  // undefined is OK - server handles gracefully
    }
  });

  // Handle reconnection with fresh token (token may have refreshed)
  this.socket.on('reconnect_attempt', () => {
    const freshTokens = sessionManager?.getTokens();
    if (this.socket) {
      this.socket.auth = { token: freshTokens?.accessToken };
    }
  });

  // ... rest of initialization ...
}
```

**Why This Matters**:
- Tokens expire (15-minute access tokens)
- Socket connections are long-lived
- On reconnection, we need fresh token from SessionManager
- SessionManager already handles automatic token refresh

**Initialization Timing**:
- Socket may initialize before user logs in (token = undefined)
- Server allows this - socket works but no presence tracking
- After login, socket reconnects with valid token on next reconnect cycle
- Alternative: Delay socket initialization until after authentication (requires checking AppBootstrapService)

**Circular Dependency Prevention**:
- Don't import `sessionManager` directly from authStore (creates circular dep)
- Pass `getSessionManager` callback or access via AppBootstrapService

#### 2. Create Presence Query Hook (`client/src/domains/users/hooks/usePresenceQuery.ts`)

**Purpose**: React Query hook for fetching and caching online users.

```typescript
// NEW FILE: client/src/domains/users/hooks/usePresenceQuery.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@app/queryKeys';

interface PresenceData {
  onlineUserIds: string[];
  count: number;
}

export function usePresenceQuery() {
  return useQuery<PresenceData>({
    queryKey: queryKeys.presence.online(),
    queryFn: () => PresenceService.getOnlineUsers(),
    staleTime: 30_000,  // 30 seconds (socket events keep it fresh)
    refetchOnWindowFocus: true,
  });
}

// Derived hook for checking if specific user is online
export function useIsUserOnline(userId: string): boolean {
  const { data } = usePresenceQuery();
  return data?.onlineUserIds.includes(userId) ?? false;
}
```

#### 3. Add Presence Query Keys (`client/src/app/queryKeys.ts`)

**Changes Required**:
```typescript
// MODIFY: client/src/app/queryKeys.ts

export const queryKeys = {
  // ... existing keys ...

  presence: {
    all: ['presence'] as const,
    online: () => [...queryKeys.presence.all, 'online'] as const,
  },
};
```

#### 4. Create Presence Service (`client/src/domains/users/services/PresenceService.ts`)

**Purpose**: API client for presence endpoints.

```typescript
// NEW FILE: client/src/domains/users/services/PresenceService.ts

import { httpClient } from '@infra/api/httpClient';

interface PresenceResponse {
  onlineUserIds: string[];
  count: number;
}

export const PresenceService = {
  async getOnlineUsers(): Promise<PresenceResponse> {
    // Route follows existing pattern: /api/presence/online
    // httpClient already has baseURL configured, so just use relative path
    const response = await httpClient.get<PresenceResponse>('/presence/online');
    return response.data;
  },
};
```

**Note**: Verify httpClient baseURL configuration. If it includes `/api`, use `/presence/online`. If not, use `/api/presence/online`. Check existing services for the pattern used.

#### 5. Update Query Bridge (`client/src/infrastructure/socket/queryBridge.ts`)

**Changes Required**:
- Add presence event schemas
- Add presence event handlers

```typescript
// MODIFY: client/src/infrastructure/socket/queryBridge.ts

// Add to event schemas section:
const presenceEventSchemas = {
  user_online: z.object({
    userId: z.string(),
    onlineUserIds: z.array(z.string()),
    timestamp: z.string(),
  }),

  user_offline: z.object({
    userId: z.string(),
    onlineUserIds: z.array(z.string()),
    timestamp: z.string(),
  }),
} as const;

// Add new method in SocketQueryBridge class:
private setupPresenceEventHandlers(): void {
  if (!this.socket) return;

  this.socket.on('user_online', (data: unknown) => {
    try {
      const { onlineUserIds } = presenceEventSchemas.user_online.parse(data);

      // Update cache with new online users list
      this.queryClient.setQueryData(
        queryKeys.presence.online(),
        { onlineUserIds, count: onlineUserIds.length }
      );
    } catch (error) {
      logger.error('Invalid user_online event', { error });
    }
  });

  this.socket.on('user_offline', (data: unknown) => {
    try {
      const { onlineUserIds } = presenceEventSchemas.user_offline.parse(data);

      // Update cache with new online users list
      this.queryClient.setQueryData(
        queryKeys.presence.online(),
        { onlineUserIds, count: onlineUserIds.length }
      );
    } catch (error) {
      logger.error('Invalid user_offline event', { error });
    }
  });
}

// Call in initializeSocket():
this.setupPresenceEventHandlers();
```

#### 6. Create OnlineUsersBadges Component (`client/src/shared/ui/components/presence/OnlineUsersBadges.tsx`)

**Purpose**: Displays online users as initials badges. **Reuses OwnershipIndicatorBadge** - no style duplication.

```typescript
// NEW FILE: client/src/shared/ui/components/presence/OnlineUsersBadges.tsx

import { useMemo } from 'react';
import { useAuthStore } from '@domains/authentication';
import { useActiveUsersQuery } from '@domains/users/hooks/useActiveUsersQuery';
import { usePresenceQuery } from '@domains/users/hooks/usePresenceQuery';
import { OwnershipIndicatorBadge } from '@shared/ui/components';
import { Tooltip } from '@shared/ui';

interface OnlineUsersBadgesProps {
  maxDisplay?: number;  // Max badges to show before "+N more"
  size?: 'sm' | 'md';
  showCount?: boolean;  // Show "3 online" text
}

export function OnlineUsersBadges({
  maxDisplay = 5,
  size = 'sm',
  showCount = false,
}: OnlineUsersBadgesProps) {
  const { data: presence, isError: presenceError } = usePresenceQuery();
  const { data: users = [], isError: usersError } = useActiveUsersQuery();
  const currentUser = useAuthStore(state => state.user);

  // Build user lookup map
  const userMap = useMemo(
    () => new Map(users.map(u => [u.id, u])),
    [users]
  );

  // Get online users with their details, EXCLUDING current user
  const onlineUsers = useMemo(() => {
    if (!presence?.onlineUserIds) return [];
    return presence.onlineUserIds
      .filter(id => id !== currentUser?.id)  // Exclude self
      .map(id => userMap.get(id))
      .filter(Boolean);
  }, [presence?.onlineUserIds, userMap, currentUser?.id]);

  const displayUsers = onlineUsers.slice(0, maxDisplay);
  const remainingCount = Math.max(0, onlineUsers.length - maxDisplay);

  // Graceful degradation: don't show anything on error or if no other users online
  if (presenceError || usersError || onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Online indicator dot */}
      <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />

      {/* User badges - REUSES OwnershipIndicatorBadge (no duplication) */}
      <div className="flex -space-x-1">
        {displayUsers.map(user => (
          <div key={user.id} className="border-2 border-white rounded-full">
            <OwnershipIndicatorBadge
              type="otherUser"
              initials={getInitials(user.username)}
              username={user.username}
              size={size}
            />
          </div>
        ))}

        {/* Overflow indicator */}
        {remainingCount > 0 && (
          <Tooltip content={`${remainingCount} more online`} side="bottom">
            <div className="w-5 h-5 rounded-full bg-gray-400 text-white flex items-center justify-center text-[9px] font-bold border-2 border-white">
              +{remainingCount}
            </div>
          </Tooltip>
        )}
      </div>

      {/* Optional count text */}
      {showCount && (
        <span className="text-xs text-gray-500">
          {onlineUsers.length} online
        </span>
      )}
    </div>
  );
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}
```

**Key Design Choices**:
- Uses `useActiveUsersQuery` (existing hook) - returns `UserDisplayInfo[]` with `id`, `username`, optional `firstName`/`lastName`
- Filters out current user (you don't need to see yourself)
- Graceful degradation: returns `null` on any error (badges just don't appear)
- Reuses `OwnershipIndicatorBadge` for consistent styling

**Note on `getInitials`**: This is a local utility function. If similar logic exists elsewhere (check `@shared/utils`), import that instead of duplicating. Otherwise, consider adding to shared utils if used in multiple places.

#### 7. Create UserPresenceBadge Component (`client/src/shared/ui/components/presence/UserPresenceBadge.tsx`)

**Purpose**: Shows presence status for a single user (with online indicator dot).

```typescript
// NEW FILE: client/src/shared/ui/components/presence/UserPresenceBadge.tsx

import { useIsUserOnline } from '@domains/users/hooks/usePresenceQuery';
import { OwnershipIndicatorBadge, type OwnershipType } from '@shared/ui/components';

interface UserPresenceBadgeProps {
  userId: string;
  initials: string;
  username: string;
  type: OwnershipType;
  size?: 'sm' | 'md';
  showOnlineIndicator?: boolean;
}

export function UserPresenceBadge({
  userId,
  initials,
  username,
  type,
  size = 'sm',
  showOnlineIndicator = true,
}: UserPresenceBadgeProps) {
  const isOnline = useIsUserOnline(userId);

  return (
    <div className="relative inline-flex">
      <OwnershipIndicatorBadge
        type={type}
        initials={initials}
        username={username}
        size={size}
      />

      {/* Online indicator dot */}
      {showOnlineIndicator && isOnline && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white"
          aria-label="Online"
        />
      )}
    </div>
  );
}
```

---

## Files Summary

### New Files Created

| File | Layer | Purpose | Status |
|------|-------|---------|--------|
| `server/src/application/services/PresenceService.ts` | Server | Tracks connected users in memory | ✅ |
| `server/src/presentation/middleware/socketAuth.ts` | Server | JWT authentication for sockets | ✅ |
| `server/src/presentation/routes/PresenceRouteModule.ts` | Server | REST endpoint for initial state | ✅ |
| `client/src/domains/users/hooks/usePresenceQuery.ts` | Client | React Query hook for presence | ✅ |
| `client/src/domains/users/services/PresenceService.ts` | Client | API client for presence endpoints | ✅ |
| `client/src/shared/ui/components/presence/OnlineUsersBadges.tsx` | Client | Online users badges display | ✅ |
| `client/src/shared/ui/components/presence/UserPresenceBadge.tsx` | Client | Single user presence badge | ✅ |
| `client/src/shared/ui/components/presence/index.ts` | Client | Barrel export | ✅ |

### Files Modified

| File | Changes | Status |
|------|---------|--------|
| **Server** | | |
| `server/src/index.ts` | Add socket auth middleware in `setupServices()`, register PresenceRouteModule | ✅ |
| `server/src/application/eventHandlers/SocketEventHandler.ts` | Add presence handling on connect/disconnect (new constructor param) | ✅ |
| `server/src/infrastructure/di/ServiceContainer.ts` | Add `getPresenceService()` getter, update `getSocketEventHandler()` | ✅ |
| `server/src/presentation/routes/index.ts` | Export PresenceRouteModule | ✅ |
| **Client** | | |
| `client/src/app/queryKeys.ts` | Add presence query keys | ✅ |
| `client/src/infrastructure/socket/SocketService.ts` | Add JWT token to socket handshake + reconnect token refresh | ✅ |
| `client/src/infrastructure/socket/queryBridge.ts` | Add presence event handlers + call `setupPresenceEventHandlers()` in `initializeSocket()` | ✅ |
| `client/src/domains/users/index.ts` | Export `usePresenceQuery`, `useIsUserOnline`, `useOtherOnlineUsers` hooks | ✅ |
| `client/src/shared/ui/components/index.ts` | Export presence components from `./presence` | ✅ |
| `client/src/app/components/layout/AppHeader.tsx` | Import and add OnlineUsersBadges component | ✅ |

### Route Registration Detail

In `server/src/index.ts` around line 151, add:
```typescript
// In setupRoutes() where other modules are registered:
const presenceService = this.serviceContainer.getPresenceService();
registry.registerModule(new PresenceRouteModule(presenceService, authMiddleware));
```

In `server/src/presentation/routes/index.ts`, add:
```typescript
export * from './PresenceRouteModule';
```

### Existing Files Reused (No Changes Needed)

| File | Usage |
|------|-------|
| `client/src/domains/users/hooks/useActiveUsersQuery.ts` | Fetches user list for badge display |
| `client/src/domains/authentication/stores/authStore.ts` | Provides current user + sessionManager for tokens |
| `client/src/shared/ui/components/badges/OwnershipIndicatorBadge.tsx` | Badge component reused for styling |

---

## Socket Events

### New Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `user_online` | Server → Client | `{ userId, onlineUserIds[], timestamp }` |
| `user_offline` | Server → Client | `{ userId, onlineUserIds[], timestamp }` |

### Event Flow

```
[User A connects]
  → Server: PresenceService.registerConnection(userA, socketA)
  → Server: io.emit('user_online', { userId: userA, onlineUserIds: [userA] })
  → Client B: queryBridge receives event, updates React Query cache
  → UI: OnlineUsersBadges re-renders showing User A

[User A disconnects]
  → Server: PresenceService.removeConnection(socketA)
  → Server: io.emit('user_offline', { userId: userA, onlineUserIds: [] })
  → Client B: queryBridge receives event, updates React Query cache
  → UI: OnlineUsersBadges re-renders without User A
```

---

## UI Placement (Exact Locations)

### Current Layout Reference
- **Toasts**: Fixed `bottom-right` (via react-hot-toast)
- **ConnectionStatusIndicator**: Fixed `bottom-4 right-4` (small green dot, expands on issues)
- **AppHeader**: Top bar with Logo (left) → Action toolbar → Search → Hamburger menu (right)

### Online Users Badge Placement

**Primary Location: AppHeader (left of Search)**

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]                    [Action Toolbar] [●👤👤👤] [Search] [☰]  │
└─────────────────────────────────────────────────────────────────────┘
                                              ↑
                                    OnlineUsersBadges here
                                    (green dot + user initials)
```

**Why this location:**
- ✅ **Top-right area** - Far from bottom-right toasts and connection indicator
- ✅ **Always visible** - Doesn't require opening a menu
- ✅ **Contextual** - Near user-related controls (hamburger has user info)
- ✅ **Non-intrusive** - Small footprint, doesn't compete with action toolbar

**Secondary Location: Hamburger Menu (optional enhancement)**

```
┌──────────────────────┐
│ 🧪 Lab Name          │
│ 👤 Username          │
│ ● 3 users online     │  ← Optional: count in menu
├──────────────────────┤
│ ⚙️ Settings          │
│ ...                  │
└──────────────────────┘
```

### Toast Notification Conflict: NONE

The online badges appear in the **top header bar**, while:
- Toasts appear at **bottom-right**
- ConnectionStatusIndicator appears at **bottom-right**

These are on opposite corners of the screen - no overlap possible.

---

## Integration Points

### 1. AppHeader Integration (Primary)

**File**: `client/src/app/components/layout/AppHeader.tsx`

**Add import at top:**
```tsx
import { OnlineUsersBadges } from '@shared/ui/components/presence';
```

**Add component between Action Toolbar and Search Container (around line 405):**
```tsx
{/* Right Side: Controls + Search + Hamburger */}
<div className="flex items-center gap-3">
  {/* Action Toolbar - existing */}
  {selectionAnalysis.hasSelection && gridController && (
    // ... existing action toolbar code ...
  )}

  {/* Online Users - NEW */}
  <OnlineUsersBadges maxDisplay={3} />

  {/* Search Container - existing */}
  <div className="flex-shrink-0">
    <SearchContainer />
  </div>

  {/* Hamburger Menu - existing */}
  <div className="relative" ref={hamburgerMenuRef}>
    {/* ... */}
  </div>
</div>
```

**Exact insertion point**: After line 404 (`</div>` closing Action Toolbar), before line 406 (`{/* Search Container */}`)

### 2. Admin Settings - User List (Secondary)

Shows online indicator dot on each user row:

```tsx
// In user management list
import { UserPresenceBadge } from '@shared/ui/components/presence';

function UserRow({ user }) {
  return (
    <div className="flex items-center gap-2">
      <UserPresenceBadge
        userId={user.id}
        initials={getInitials(user.username)}
        username={user.username}
        type="otherUser"
        showOnlineIndicator
      />
      <span>{user.username}</span>
    </div>
  );
}
```

### 3. StorageManagerModal - Assignment Dropdown (Optional Future)

Could show online status next to user names in assignment dropdowns, but this is lower priority.

---

## Error Handling

### Client-Side Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| Presence API fails | `usePresenceQuery` returns error → badges don't render |
| Socket disconnected | `user_offline` not received → user appears online until REST refetch |
| Invalid socket event | Zod validation fails → logged, ignored, no crash |
| User lookup fails | `useActiveUsersQuery` error → badges don't render |

### Server-Side Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid JWT on connect | Socket auth middleware rejects → `connect_error` on client |
| PresenceService throws | Logged, presence event not emitted, other operations continue |
| Socket disconnect without cleanup | Socket.IO `disconnect` event always fires, even on crash |

---

## Testing Checklist

### Core Functionality
- [ ] User A connects → User A appears in User B's online list
- [ ] User A disconnects → User A disappears from User B's online list
- [ ] Current user does NOT appear in their own online badges
- [ ] Page refresh → Online users persist (REST endpoint provides initial state)

### Authentication & Tokens
- [ ] Unauthenticated socket connection rejected
- [ ] Token expired mid-session → Socket reconnects with refreshed token
- [ ] Invalid token → Socket connection rejected, app continues working

### Edge Cases
- [ ] Multiple tabs same user → Documented limitation (last close = offline)
- [ ] Server restart → All users show offline, reconnect automatically
- [ ] Network interruption → Graceful reconnection, presence restored
- [ ] Rapid connect/disconnect → No UI flickering (React Query batches updates)

### Error Scenarios
- [ ] Presence REST endpoint fails → Badges simply don't appear
- [ ] Socket events fail validation → Logged, no crash
- [ ] User lookup query fails → Badges don't appear, no crash

---

## Performance Considerations

- **Memory**: O(n) where n = connected users (typically <100)
- **Socket Events**: 2 events per user connect/disconnect (minimal)
- **React Query**: Cache updated directly via `setQueryData` (no refetch needed)
- **Re-renders**: Only components using `usePresenceQuery` re-render

---

## Security Considerations

- JWT validation required for socket connections
- Only authenticated users can trigger presence events
- User IDs exposed (not sensitive) - no PII in presence payloads
- Rate limiting on socket connections (existing Socket.IO config)

---

## AGENTS.md Compliance

This plan follows all AGENTS.md guidelines:

- ✅ Uses existing patterns (SocketQueryBridge, OwnershipIndicatorBadge)
- ✅ Clean Architecture layers respected
- ✅ File naming conventions followed (PascalCase components, camelCase hooks)
- ✅ React Query for server state, no Zustand for presence
- ✅ Type-safe with Zod validation for socket events
- ✅ Named exports only
- ✅ Centralized query keys
- ✅ No redundant systems - builds on existing infrastructure
