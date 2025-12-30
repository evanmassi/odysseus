# Session Management Upgrade Plan (REVISED)
## Industry-Standard Security Implementation

**Date:** 2025-12-30
**Revised:** 2025-12-30
**Status:** Ready for Implementation
**Scope:** Server-side idle enforcement, warning modal, absolute timeout, session revocation

---

## Executive Summary

This plan upgrades Odysseus's session management from client-only activity tracking to server-enforced session validation. The current system tracks activity in browser memory (resets on page refresh), making idle timeout ineffective.

### Key Design Decisions

1. **Server is single source of truth** - Client polls server for session status instead of tracking locally
2. **Session validation in JwtSessionService** - Keep middleware thin, business logic in service
3. **SecurityConfig caching** - 60-second TTL to avoid DB hits on every request
4. **No database migration** - Fresh database, just update defaults in SQLiteContext
5. **Simple modal management** - Electron app shares single Zustand store, no multi-tab sync needed

---

## Architecture Overview

```
CLIENT                                          SERVER
──────                                          ──────

Login
  │
  └──→ POST /auth/login ──────────────────────→ Returns TokenPair with:
                                                 - sessionTimeoutMinutes (480)
                                                 - idleWarningMinutes (5) ← NEW

Every API Request
  │
  └──→ Authorization: Bearer {token} ─────────→ ExpressAuthMiddleware
                                                   │
                                                   └──→ JwtSessionService.validateSessionWithActivity()
                                                          1. Validate JWT signature
                                                          2. Fetch session from DB
                                                          3. Check session.isActive
                                                          4. Check absolute timeout (createdAt)
                                                          5. Check idle timeout (lastUsedAt)
                                                          6. Update lastUsedAt
                                                          7. Return user + sessionId
                                                        (Uses cached securityConfig - 60s TTL)

Session Status Polling (every 30s when idle)
  │
  └──→ GET /auth/session-info ────────────────→ Returns:
                                                 - timeRemainingMs
                                                 - warningThresholdMs
                                                 - isWarningPhase
       │
       └── isWarningPhase = true?
           └── Show SessionTimeoutWarningModal
               ├── "Stay Logged In" → POST /auth/heartbeat → Resets lastUsedAt
               └── "Logout Now" → Clear session
```

---

## Current Problems

| Issue | Current Behavior | Industry Standard |
|-------|-----------------|-------------------|
| Activity Tracking | In-memory only, resets on page refresh | Server-side, persists in database |
| Idle Timeout | Only works if app stays open | Server rejects requests after idle period |
| Absolute Timeout | None (sessions last forever with activity) | Force re-login after X days |
| Session Revocation | TODO placeholder, not implemented | Immediate invalidation capability |
| Warning Before Logout | None | Modal with countdown timer |

---

## Phase 1: Server-Side Changes

### 1.1 Add New Error Codes

**File:** `packages/shared-schemas/src/api/apiSchemas.ts`

```typescript
export const API_ERROR_CODES = {
  // ... existing codes ...

  // Session Management (NEW)
  SESSION_IDLE_TIMEOUT: 'SESSION_IDLE_TIMEOUT',
  SESSION_ABSOLUTE_TIMEOUT: 'SESSION_ABSOLUTE_TIMEOUT',
  SESSION_REVOKED: 'SESSION_REVOKED',
} as const;
```

### 1.2 Extend SecurityConfig Type

**File:** `packages/shared-schemas/src/admin/adminSchemas.ts`

Add to securityConfigSchema:
```typescript
idleWarningMinutes: z.number().int().min(1).max(60).default(5),
absoluteSessionTimeoutHours: z.number().int().min(1).max(720).default(168),
```

### 1.3 Update TokenPair Type

**File:** `server/src/shared/types/TokenTypes.ts` (and client equivalent)

Add to TokenPair interface:
```typescript
idleWarningMinutes: number;  // NEW - sent to client for warning timing
```

### 1.4 Update SQLiteContext Defaults (No Migration)

**File:** `server/src/infrastructure/database/SQLiteContext.ts`

Update security_config table creation:
```sql
CREATE TABLE IF NOT EXISTS security_config (
  -- existing columns...
  idleWarningMinutes INTEGER DEFAULT 5,
  absoluteSessionTimeoutHours INTEGER DEFAULT 168
)
```

**Note:** Delete existing database file to get fresh schema. No migration needed.

### 1.5 Add SecurityConfig Caching to JwtSessionService

**File:** `server/src/infrastructure/services/JwtSessionService.ts`

Add caching:
```typescript
private securityConfigCache: SecurityConfig | null = null;
private securityConfigCacheTime: number = 0;
private readonly CACHE_TTL_MS = 60000; // 60 seconds

private async getCachedSecurityConfig(): Promise<SecurityConfig> {
  const now = Date.now();
  if (this.securityConfigCache && (now - this.securityConfigCacheTime) < this.CACHE_TTL_MS) {
    return this.securityConfigCache;
  }

  this.securityConfigCache = await this.configurationRepository.getSecurityConfig();
  this.securityConfigCacheTime = now;
  return this.securityConfigCache;
}
```

### 1.6 Define Session Validation Result Type

**File:** `server/src/infrastructure/services/JwtSessionService.ts`

Add discriminated union for clear error handling:
```typescript
/**
 * Session validation result - discriminated union for explicit error handling
 */
export type SessionValidationOutcome =
  | { success: true; user: User; sessionId: string }
  | { success: false; code: 'INVALID_TOKEN' | 'SESSION_REVOKED' | 'SESSION_IDLE_TIMEOUT' | 'SESSION_ABSOLUTE_TIMEOUT' };
```

### 1.7 Add Session Validation Method to JwtSessionService

**File:** `server/src/infrastructure/services/JwtSessionService.ts`

New method with `updateActivity` option for differentiating real activity from status checks:

```typescript
/**
 * Validate session with full timeout checks
 *
 * @param token - JWT access token
 * @param options.updateActivity - Whether to update lastUsedAt (default: true)
 *   - true: Normal requests (user doing real work)
 *   - false: Status checks like /session-info (polling shouldn't extend session)
 */
async validateSessionWithActivity(
  token: string,
  options: { updateActivity?: boolean } = {}
): Promise<SessionValidationOutcome> {
  const { updateActivity = true } = options;

  // 1. Validate JWT (existing logic)
  const jwtResult = await this.validateSession(token);
  if (!jwtResult) {
    return { success: false, code: 'INVALID_TOKEN' };
  }

  // 2. Fetch session from database
  const session = await this.userSessionRepository.findById(jwtResult.sessionId);
  if (!session || !session.isActive) {
    return { success: false, code: 'SESSION_REVOKED' };
  }

  // 3. Get cached security config
  const config = await this.getCachedSecurityConfig();

  // 4. Check absolute timeout (session age from creation)
  const absoluteTimeoutMs = config.absoluteSessionTimeoutHours * 60 * 60 * 1000;
  if (Date.now() - session.createdAt.getTime() > absoluteTimeoutMs) {
    await this.userSessionRepository.revokeSession(session.id);
    return { success: false, code: 'SESSION_ABSOLUTE_TIMEOUT' };
  }

  // 5. Check idle timeout (time since last activity)
  const idleTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
  if (Date.now() - session.lastUsedAt.getTime() > idleTimeoutMs) {
    await this.userSessionRepository.revokeSession(session.id);
    return { success: false, code: 'SESSION_IDLE_TIMEOUT' };
  }

  // 6. Update lastUsedAt ONLY if this is real activity (not a status check)
  if (updateActivity) {
    await this.userSessionRepository.updateLastUsed(session.id, new Date());
  }

  return {
    success: true,
    user: jwtResult.user,
    sessionId: jwtResult.sessionId
  };
}
```

**Key Design Decision:** The `updateActivity` flag solves the polling problem:
- Normal API requests use `updateActivity: true` (default) → extends session
- `/session-info` polling uses `updateActivity: false` → checks status without extending

### 1.8 Simplify ExpressAuthMiddleware

**File:** `server/src/infrastructure/security/ExpressAuthMiddleware.ts`

Keep middleware thin - delegate to service and handle discriminated union result:
```typescript
get authenticate(): RequestHandler {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authorization header required' }
      });
    }

    const token = authHeader.substring(7);

    try {
      const result = await this.sessionService.validateSessionWithActivity(token);

      // Handle discriminated union result
      if (!result.success) {
        // Map error codes to appropriate messages
        const messages: Record<string, string> = {
          'INVALID_TOKEN': 'Invalid or expired token',
          'SESSION_REVOKED': 'Session has been revoked',
          'SESSION_IDLE_TIMEOUT': 'Session timed out due to inactivity',
          'SESSION_ABSOLUTE_TIMEOUT': 'Session expired. Please log in again.'
        };

        return res.status(401).json({
          success: false,
          error: {
            code: result.code,
            message: messages[result.code] || 'Authentication failed'
          }
        });
      }

      // Success - attach user and sessionId to request
      req.user = result.user;
      req.sessionId = result.sessionId;
      next();

    } catch (error) {
      logger.error('Authentication middleware error', { error });
      return res.status(500).json({
        success: false,
        error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication service error' }
      });
    }
  };
}
```

**Note:** The middleware no longer needs try/catch for specific error codes because the service returns a discriminated union instead of throwing. This is cleaner and more type-safe.

### 1.9 Add Heartbeat & Session-Info Endpoints

**File:** `server/src/presentation/routes/AuthRouteModule.ts`

```typescript
// Public route - handles its own auth validation with updateActivity: false
// MUST be public to avoid middleware updating lastUsedAt on every poll
router.get('/session-info', this.authController.getSessionInfo.bind(this.authController));

// Protected routes (require auth)
router.post('/heartbeat', this.authController.heartbeat.bind(this.authController));
```

**CRITICAL:** `/session-info` is registered as a PUBLIC route because:
1. Auth middleware uses `validateSessionWithActivity()` with default `updateActivity: true`
2. If `/session-info` went through middleware, polling would extend the session (defeating idle timeout)
3. The endpoint handles its own validation with `updateActivity: false`

**File:** `server/src/presentation/controllers/AuthController.ts`

```typescript
/**
 * Heartbeat - Extend session by updating lastUsedAt
 *
 * Called when user clicks "Stay Logged In" in warning modal.
 * Goes through normal auth middleware which updates activity.
 */
async heartbeat(req: Request, res: Response): Promise<void> {
  // Middleware already updated lastUsedAt via validateSessionWithActivity()
  res.json({
    success: true,
    data: {
      sessionExtended: true,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Get Session Info - Check session status WITHOUT extending it
 *
 * CRITICAL: This endpoint must NOT update lastUsedAt, otherwise polling
 * would keep sessions alive forever, defeating idle timeout.
 *
 * Uses custom validation with updateActivity: false
 */
async getSessionInfo(req: Request, res: Response): Promise<void> {
  // Extract token manually (don't rely on middleware for this endpoint)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
  }

  const token = authHeader.substring(7);

  // Validate WITHOUT updating activity
  const result = await this.sessionService.validateSessionWithActivity(token, {
    updateActivity: false  // CRITICAL: Don't extend session on status checks
  });

  if (!result.success) {
    return res.status(401).json({ success: false, error: { code: result.code } });
  }

  // Fetch session for timing info
  const session = await this.userSessionRepository.findById(result.sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  }

  const config = await this.configurationRepository.getSecurityConfig();

  const idleTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
  const timeRemaining = idleTimeoutMs - (Date.now() - session.lastUsedAt.getTime());
  const warningThreshold = config.idleWarningMinutes * 60 * 1000;

  res.json({
    success: true,
    data: {
      timeRemainingMs: Math.max(0, timeRemaining),
      warningThresholdMs: warningThreshold,
      isWarningPhase: timeRemaining <= warningThreshold && timeRemaining > 0,
      sessionCreatedAt: session.createdAt.toISOString(),
      lastActivity: session.lastUsedAt.toISOString()
    }
  });
}
```

**IMPORTANT:** The `/session-info` endpoint handles its own authentication with `updateActivity: false` instead of going through the standard middleware. This ensures polling doesn't extend the session.

### 1.10 Complete Session Revocation

**File:** `server/src/infrastructure/services/JwtSessionService.ts`

Replace TODO at lines 192-207:
```typescript
async revokeSession(token: string): Promise<void> {
  try {
    const decoded = jwt.verify(token, this.config.secret) as SessionPayload;

    // Revoke session in database
    await this.userSessionRepository.revokeSession(decoded.sessionId);

    // Revoke associated refresh token
    const session = await this.userSessionRepository.findById(decoded.sessionId);
    if (session) {
      const refreshToken = await this.refreshTokenRepository.findByToken(session.refreshToken);
      if (refreshToken) {
        refreshToken.revoke();
        await this.refreshTokenRepository.save(refreshToken);
      }
    }

    logger.info(`Session ${decoded.sessionId} revoked`);
  } catch (error) {
    logger.warn('Could not revoke session:', error);
  }
}
```

### 1.11 Update TokenPair Creation

**File:** `server/src/infrastructure/services/JwtSessionService.ts`

In `createTokenPair()`, add idleWarningMinutes to returned TokenPair:
```typescript
const tokenPair: TokenPair = {
  // ... existing fields ...
  sessionTimeoutMinutes: securityConfig.sessionTimeoutMinutes,
  idleWarningMinutes: securityConfig.idleWarningMinutes, // NEW
};
```

### 1.12 Update SQLiteConfigurationRepository

**File:** `server/src/infrastructure/repositories/SQLiteConfigurationRepository.ts`

Update `getSecurityConfig()` to include new fields:
```typescript
return {
  // ... existing fields ...
  idleWarningMinutes: row.idleWarningMinutes ?? 5,
  absoluteSessionTimeoutHours: row.absoluteSessionTimeoutHours ?? 168,
};
```

Update `updateSecurityConfig()` to handle new fields.

### 1.13 Update Admin SecurityTab UI

**File:** `client/src/domains/admin/ui/components/tabs/SecurityTab.tsx`

Add form fields for:
- `idleWarningMinutes` - "Warning before timeout (minutes)"
- `absoluteSessionTimeoutHours` - "Maximum session duration (hours)"

---

## Phase 2: Client-Side Changes

### 2.1 Update TokenPair Type

**File:** `client/src/shared/session/types.ts`

```typescript
export interface TokenPair {
  // ... existing fields ...
  idleWarningMinutes: number;  // NEW
}
```

### 2.2 Add SessionInfoService

**File:** `client/src/domains/authentication/services/SessionInfoService.ts` (NEW)

```typescript
import { httpClient } from '@infra/api/httpClient';

export interface SessionInfo {
  timeRemainingMs: number;
  warningThresholdMs: number;
  isWarningPhase: boolean;
  sessionCreatedAt: string;
  lastActivity: string;
}

export const SessionInfoService = {
  async getSessionInfo(): Promise<SessionInfo> {
    const response = await httpClient.get<SessionInfo>('/auth/session-info');
    return response.data;
  },

  async sendHeartbeat(): Promise<void> {
    await httpClient.post('/auth/heartbeat', {});
  }
};
```

### 2.3 Add Modal State to Store

**File:** `client/src/app/stores/modalStore.ts`

Add interface:
```typescript
interface SessionTimeoutWarningState {
  isOpen: boolean;
  timeRemainingMs: number;
  previousFocusElement?: HTMLElement | null;
}
```

Add to LocalModalState and initial state.

Add actions:
```typescript
showSessionTimeoutWarning: (timeRemainingMs: number) => void;
hideSessionTimeoutWarning: () => void;
updateSessionTimeoutRemaining: (timeRemainingMs: number) => void;
```

### 2.4 Modify SessionManager for Server Polling

**File:** `client/src/app/services/SessionManager.ts`

Replace client-side activity tracking with server polling:

```typescript
private sessionInfoPollingInterval: NodeJS.Timeout | null = null;
private isWarningShown: boolean = false;
private onSessionWarning?: (timeRemainingMs: number) => void;

constructor(
  private authHttpClient: AuthHttpClient,
  private storage: SessionStorage,
  onSessionExpired?: (reason: 'idle_timeout' | 'token_expired' | 'manual_logout') => void,
  config?: Partial<SessionConfig>,
  onSessionWarning?: (timeRemainingMs: number) => void  // NEW - 5th parameter
) {
  this.onSessionExpired = onSessionExpired;
  this.onSessionWarning = onSessionWarning;
  this.config = { ...defaultConfig, ...config };
  // ... existing setup ...
}

/**
 * Start polling server for session status
 * Polls every 30 seconds when user appears idle
 */
startSessionInfoPolling(): void {
  if (this.sessionInfoPollingInterval) return;

  this.sessionInfoPollingInterval = setInterval(async () => {
    if (!this.isAuthenticated()) return;

    try {
      const info = await SessionInfoService.getSessionInfo();

      if (info.isWarningPhase && !this.isWarningShown) {
        this.isWarningShown = true;
        this.onSessionWarning?.(info.timeRemainingMs);
      } else if (!info.isWarningPhase) {
        this.isWarningShown = false;
      }
    } catch (error) {
      // If we get a session error, the httpClient will handle logout
      console.error('Session info polling failed:', error);
    }
  }, 30000); // 30 seconds
}

stopSessionInfoPolling(): void {
  if (this.sessionInfoPollingInterval) {
    clearInterval(this.sessionInfoPollingInterval);
    this.sessionInfoPollingInterval = null;
  }
}

/**
 * Send heartbeat to extend session
 */
async sendHeartbeat(): Promise<boolean> {
  try {
    await SessionInfoService.sendHeartbeat();
    this.isWarningShown = false;
    return true;
  } catch (error) {
    console.error('Heartbeat failed:', error);
    return false;
  }
}

// Update setTokens to start polling
setTokens(tokens: TokenPair): void {
  this.storage.setTokens(tokens);
  this.scheduleTokenRefresh(tokens.accessTokenExpiry);
  this.startSessionInfoPolling(); // NEW
}

// Update clearSession to stop polling
clearSession(reason: LogoutReason = 'manual_logout'): void {
  this.stopSessionInfoPolling(); // NEW
  // ... existing cleanup ...
}

// Update destroy to clean up
destroy(): void {
  this.stopSessionInfoPolling(); // NEW
  // ... existing cleanup ...
}
```

**CLEANUP - Remove old client-side inactivity tracking:**

The existing `SessionManager` has redundant client-side inactivity tracking that must be removed:

```typescript
// REMOVE these properties:
private inactivityCheckInterval: NodeJS.Timeout | null = null;
private lastActivityTime: Date = new Date();

// REMOVE this method:
private startInactivityChecker(): void { ... }

// REMOVE from constructor:
this.startInactivityChecker();

// REMOVE from clearSession():
this.lastActivityTime = new Date();

// REMOVE from destroy():
if (this.inactivityCheckInterval) {
  clearInterval(this.inactivityCheckInterval);
  this.inactivityCheckInterval = null;
}
```

**Why:** Server polling is now the single source of truth for session status. The old client-side checker used in-memory `lastActivityTime` which reset on page load (the original bug). Keeping both systems would be redundant and confusing.

### 2.5 Create Warning Modal Component

**File:** `client/src/domains/authentication/ui/components/SessionTimeoutWarningModal.tsx` (NEW)

```typescript
import type { FC } from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ModalPortal } from '@shared/ui/components/ModalPortal';
import { sessionManager } from '@domains/authentication/stores/authStore';
import { useAuthStore } from '@domains/authentication/stores/authStore';

export const SessionTimeoutWarningModal: FC = () => {
  const {
    sessionTimeoutWarning,
    hideSessionTimeoutWarning,
    updateSessionTimeoutRemaining,
  } = useModalStore();

  const { logout } = useAuthStore();
  const { isOpen, timeRemainingMs } = sessionTimeoutWarning;
  const [isExtending, setIsExtending] = useState(false);
  const stayLoggedInRef = useRef<HTMLButtonElement>(null);

  const trapRef = useFocusTrap({
    isOpen,
    restoreFocus: true,
    initialFocusRef: stayLoggedInRef,
  });

  // Memoize callbacks to prevent stale closures
  const handleTimeout = useCallback(() => {
    hideSessionTimeoutWarning();
    logout();
  }, [hideSessionTimeoutWarning, logout]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeRemainingMs <= 0) return;

    const interval = setInterval(() => {
      const newTime = timeRemainingMs - 1000;
      if (newTime <= 0) {
        handleTimeout();
      } else {
        updateSessionTimeoutRemaining(newTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timeRemainingMs, handleTimeout, updateSessionTimeoutRemaining]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStayLoggedIn = async () => {
    setIsExtending(true);
    try {
      const success = await sessionManager.sendHeartbeat();
      if (success) {
        hideSessionTimeoutWarning();
      }
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = () => {
    hideSessionTimeoutWarning();
    logout();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div
          ref={trapRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-warning-title"
          className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-amber-100 rounded-full">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <h2 id="session-warning-title" className="text-xl font-bold text-gray-900">
              Session Expiring Soon
            </h2>
          </div>

          {/* Countdown */}
          <div className="mb-6 text-center">
            <div className="text-5xl font-mono font-bold text-amber-600 mb-3">
              {formatTime(timeRemainingMs)}
            </div>
            <p className="text-gray-600">
              Your session will expire due to inactivity.
              <br />
              Click "Stay Logged In" to continue working.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              ref={stayLoggedInRef}
              onClick={handleStayLoggedIn}
              disabled={isExtending}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium
                         hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExtending ? (
                <span>Extending...</span>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Stay Logged In</span>
                </>
              )}
            </button>
            <button
              onClick={handleLogout}
              disabled={isExtending}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium
                         hover:bg-gray-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout Now</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
```

### 2.6 Wire Up AuthStore

**File:** `client/src/domains/authentication/stores/authStore.ts`

Update SessionManager instantiation:
```typescript
const sessionManager = new SessionManager(
  authHttpClient,
  sessionStorage,
  reason => {
    useAuthStore.getState().clearAuth(reason);
  },
  timeRemainingMs => {
    // Show warning modal via modal store
    const { showSessionTimeoutWarning } = useModalStore.getState();
    showSessionTimeoutWarning(timeRemainingMs);
  }
);
```

### 2.7 Add Modal to App

**File:** `client/src/app/App.tsx`

```typescript
import { SessionTimeoutWarningModal } from '@domains/authentication/ui/components/SessionTimeoutWarningModal';

// In render, add alongside other global components:
<SessionTimeoutWarningModal />
```

### 2.8 Handle New Error Codes in HttpClient

**File:** `client/src/infrastructure/api/httpClient.ts`

Add specific handling for session error codes:
```typescript
// In error handling section
if (error.code === 'SESSION_IDLE_TIMEOUT') {
  sessionManager.clearSession('idle_timeout');
} else if (error.code === 'SESSION_ABSOLUTE_TIMEOUT' || error.code === 'SESSION_REVOKED') {
  sessionManager.clearSession('token_expired');
}
```

---

## Files Summary

### Server-Side Files to Modify

| File | Changes |
|------|---------|
| `packages/shared-schemas/src/api/apiSchemas.ts` | Add 3 new error codes |
| `packages/shared-schemas/src/admin/adminSchemas.ts` | Add idleWarningMinutes, absoluteSessionTimeoutHours to schema |
| `server/src/infrastructure/database/SQLiteContext.ts` | Add default columns (no migration) |
| `server/src/infrastructure/services/JwtSessionService.ts` | Add caching, validateSessionWithActivity(), complete revokeSession() |
| `server/src/infrastructure/security/ExpressAuthMiddleware.ts` | Simplify to call service method |
| `server/src/presentation/routes/AuthRouteModule.ts` | Add /heartbeat, /session-info routes |
| `server/src/presentation/controllers/AuthController.ts` | Add heartbeat(), getSessionInfo() methods |
| `server/src/infrastructure/repositories/SQLiteConfigurationRepository.ts` | Support new config fields |
| `server/src/shared/types/TokenTypes.ts` | Add idleWarningMinutes to TokenPair |

### Client-Side Files to Modify

| File | Changes |
|------|---------|
| `client/src/shared/session/types.ts` | Add idleWarningMinutes to TokenPair |
| `client/src/app/stores/modalStore.ts` | Add sessionTimeoutWarning state |
| `client/src/app/services/SessionManager.ts` | Add server polling, heartbeat method |
| `client/src/domains/authentication/stores/authStore.ts` | Wire up warning callback |
| `client/src/infrastructure/api/httpClient.ts` | Handle new session error codes |
| `client/src/app/App.tsx` | Include SessionTimeoutWarningModal |
| `client/src/domains/admin/ui/components/tabs/SecurityTab.tsx` | Add UI for new settings |

### Client-Side Files to Create

| File | Purpose |
|------|---------|
| `client/src/domains/authentication/ui/components/SessionTimeoutWarningModal.tsx` | Warning modal |
| `client/src/domains/authentication/services/SessionInfoService.ts` | Session info API client |

---

## Configuration Defaults

| Setting | Default | Description |
|---------|---------|-------------|
| `sessionTimeoutMinutes` | 480 (8 hrs) | Idle timeout duration (existing) |
| `idleWarningMinutes` | 5 | Show warning N minutes before timeout (NEW) |
| `absoluteSessionTimeoutHours` | 168 (7 days) | Force re-login after this duration (NEW) |
| `maxConcurrentSessions` | 3 | Max simultaneous sessions (existing) |

---

## Implementation Order

```
PHASE 1: Server
1. shared-schemas - Add error codes and config schema fields
2. SQLiteContext - Add new columns to table creation
3. SQLiteConfigurationRepository - Support new fields in get/update
4. JwtSessionService - Add caching + validateSessionWithActivity() + complete revokeSession()
5. ExpressAuthMiddleware - Simplify to use new service method
6. AuthController - Add heartbeat() and getSessionInfo()
7. AuthRouteModule - Register new routes
8. TokenTypes - Add idleWarningMinutes to TokenPair

PHASE 2: Client
9. session/types.ts - Add idleWarningMinutes to TokenPair
10. SessionInfoService - Create new service
11. modalStore - Add sessionTimeoutWarning state
12. SessionManager - Add server polling + heartbeat
13. authStore - Wire up warning callback
14. SessionTimeoutWarningModal - Create component
15. httpClient - Handle new error codes
16. App.tsx - Include modal
17. SecurityTab - Add admin UI for new settings

PHASE 3: Test
18. Delete database, restart app
19. Test idle timeout enforcement
20. Test warning modal flow
21. Test absolute timeout
```

---

## Testing Checklist

### Server-Side
- [ ] Request after idle timeout returns SESSION_IDLE_TIMEOUT
- [ ] Request after absolute timeout returns SESSION_ABSOLUTE_TIMEOUT
- [ ] Revoked session returns SESSION_REVOKED
- [ ] Heartbeat updates lastUsedAt
- [ ] Session-info returns correct timeRemaining and isWarningPhase
- [ ] SecurityConfig caching works (check logs for DB queries)

### Client-Side
- [ ] Warning modal appears when isWarningPhase becomes true
- [ ] Countdown timer decrements correctly
- [ ] "Stay Logged In" sends heartbeat and closes modal
- [ ] "Logout Now" triggers logout
- [ ] Auto-logout when timer reaches zero
- [ ] Modal is accessible (focus trap, keyboard navigation)
- [ ] Page refresh doesn't defeat timeout (server enforces)

### Admin UI
- [ ] New settings visible in Security tab
- [ ] Can update idleWarningMinutes
- [ ] Can update absoluteSessionTimeoutHours
- [ ] Changes persist after save

---

## Success Criteria

- [ ] Idle timeout enforced server-side (page refresh doesn't reset)
- [ ] Warning modal shows 5 minutes before timeout
- [ ] "Stay Logged In" extends session by full timeout duration
- [ ] Absolute timeout forces re-login after 7 days
- [ ] All new admin settings visible in Security tab
- [ ] SecurityConfig is cached (not fetched on every request)
- [ ] Zero regressions in existing auth flow
