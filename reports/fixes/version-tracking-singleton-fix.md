# Fix: Version Tracking with Proper Singleton Pattern

## Problem
Version tracking showed `lastKnownVersion: null` after socket reconnections, preventing proper version change detection.

## Root Cause Analysis

### The Architectural Flaw

The system violated the **Singleton pattern** by destroying and recreating instances:

```typescript
// WRONG: Destroying the singleton
export const cleanupSocketBridge = (): void => {
  if (globalSocketBridge) {
    globalSocketBridge.disconnect();
    globalSocketBridge = null;  // ❌ Destroys singleton instance
  }
};
```

**Why this was wrong:**
1. **Singleton pattern broken** - Singletons should live for app lifetime
2. **State loss** - Instance variables (like `lastKnownConfigVersion`) reset to `null`
3. **Confused responsibilities** - Mixed connection state (temporary) with session state (persistent)

### State Scoping Problem

**Two types of state were improperly mixed:**

| State Type | Lifetime | Example | Should Survive Reconnect? |
|------------|----------|---------|---------------------------|
| **Connection State** | Temporary | `socket`, `isConnected` | ❌ No |
| **Session State** | Persistent | `lastKnownConfigVersion` | ✅ Yes |

The old code treated ALL state as connection state, destroying everything on disconnect.

## The Correct Fix: Proper Singleton Pattern

### Core Principle
> **Disconnect the socket, not the singleton.**

### Changes Made

#### 1. Preserve Singleton Instance in Cleanup
```typescript
// File: client/src/infrastructure/socket/queryBridge.ts

/**
 * Cleanup socket connection
 *
 * Disconnects the socket but preserves the singleton instance.
 * This maintains session state (version tracking) across reconnections.
 */
export const cleanupSocketBridge = (): void => {
  if (globalSocketBridge) {
    globalSocketBridge.disconnect();
    // ✅ Singleton preserved - only connection state cleared
  }
};
```

#### 2. Separate Connection State from Session State
```typescript
/**
 * Disconnect socket and cleanup connection state
 *
 * Preserves session state (version tracking) across reconnections.
 * Only clears connection-specific state (socket, listeners).
 */
public disconnect(): void {
  if (this.socket) {
    // Clear connection state
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.isConnected = false;
    this.isInitialized = false;

    // ✅ Preserve session state
    // Note: lastKnownConfigVersion intentionally preserved (session state)
  }

  window.removeEventListener('online', this.handleOnline);
  window.removeEventListener('offline', this.handleOffline);
}
```

#### 3. Keep Version Tracking as Instance Property
```typescript
export class SocketQueryBridge {
  private socket: Socket | null = null;
  private queryClient: QueryClient;
  private isConnected = false;          // Connection state
  private isInitialized = false;        // Connection state

  // ✅ Session state: Persists across socket reconnections
  private lastKnownConfigVersion: number | null = null;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }
}
```

#### 4. Detect Preserved State on Reconnect
```typescript
// Initialize version tracking from current cache (if not already set)
if (this.lastKnownConfigVersion === null) {
  const currentConfig = this.queryClient.getQueryData(
    queryKeys.storage.storage()
  ) as any;
  const currentVersion = currentConfig?.configuration?.systemConfig?.version;

  if (currentVersion) {
    this.lastKnownConfigVersion = currentVersion;
    console.log('🔢 [SocketBridge] Initialized version tracking', {
      version: currentVersion
    });
  }
} else {
  console.log('🔢 [SocketBridge] Version tracking preserved from previous connection', {
    version: this.lastKnownConfigVersion
  });
}
```

## Expected Behavior After Fix

### Scenario: Socket Reconnection
```
✅ [SocketBridge] Connected { socketId: "ABC123" }
🔢 [SocketBridge] Initialized version tracking { version: 8 }

--- Socket disconnects (network issue, HMR, etc.) ---
⚠️ [SocketBridge] Disconnected from server

--- Socket reconnects ---
✅ [SocketBridge] Connected { socketId: "DEF456" }
🔢 [SocketBridge] Version tracking preserved from previous connection { version: 8 }

--- Configuration update ---
🔔 Configuration updated event
🔍 [SocketBridge] Starting version check { lastKnownVersion: 8 }
📦 [SocketBridge] Fresh data received { version: 9 }
📊 [SocketBridge] Version check { previous: 8, current: 9, changed: true }
✅ Configuration updated notification shown
```

## Why This is the Correct Architectural Fix

### 1. Follows Clean Architecture
- **Separation of Concerns**: Connection state vs session state clearly separated
- **Single Responsibility**: `disconnect()` only disconnects, doesn't destroy
- **Dependency Inversion**: Singleton manages its own lifecycle

### 2. Proper Singleton Pattern
```typescript
// Singleton instance lives for app lifetime
let globalSocketBridge: SocketQueryBridge | null = null;

export const getSocketBridge = (queryClient: QueryClient): SocketQueryBridge => {
  if (!globalSocketBridge) {
    globalSocketBridge = new SocketQueryBridge(queryClient);
  }
  return globalSocketBridge;  // Always returns same instance
};
```

**Key insight**: In a true singleton, `getInstance()` should ALWAYS return the same instance, not create new ones.

### 3. Domain-Driven Design
- **Session state** (version tracking) belongs to the **domain layer** (business logic)
- **Connection state** (socket) belongs to the **infrastructure layer** (technical concern)
- These are now properly separated

### 4. Industry-Standard Patterns

**Similar patterns in popular libraries:**

- **React Query**: `QueryClient` instance persists, queries disconnect/reconnect
- **Redux**: Store persists, middleware can disconnect/reconnect
- **Socket.IO Manager**: Connection manager persists, individual sockets disconnect
- **HTTP Clients**: Axios instance persists, requests timeout/retry

All follow the same principle: **The manager lives, the connections die.**

## Technical Benefits

### 1. State Consistency
- Version tracking survives reconnections ✅
- No state loss during HMR ✅
- Predictable behavior across app lifecycle ✅

### 2. Testability
```typescript
// Easy to test - clear instance state, not instance itself
beforeEach(() => {
  const bridge = getSocketBridge(queryClient);
  bridge.disconnect(); // Clears connection, preserves structure
});
```

### 3. Debuggability
- Version tracking always visible in instance
- Clear logs show when state preserved vs initialized
- No hidden module-level state

### 4. Maintainability
- Clear ownership: Instance owns session state
- Easy to add new session state (just add instance properties)
- No coupling to module-level globals

## Comparison: Wrong vs Right Approach

### ❌ Wrong Approach (Module-Level State)
```typescript
// Hidden global state outside class
let persistentConfigVersion: number | null = null;

export class SocketQueryBridge {
  // Class doesn't own its state
  private async checkVersion() {
    const version = persistentConfigVersion; // Reading external state
    persistentConfigVersion = newVersion;     // Writing external state
  }
}
```

**Problems:**
- State ownership unclear
- Hard to discover (not in class definition)
- Tight coupling to module scope
- Violates encapsulation
- Can't have multiple instances (even for testing)

### ✅ Right Approach (Instance Property + Singleton Preservation)
```typescript
export class SocketQueryBridge {
  // Session state: Persists across socket reconnections
  private lastKnownConfigVersion: number | null = null;

  private async checkVersion() {
    const version = this.lastKnownConfigVersion;
    this.lastKnownConfigVersion = newVersion;
  }
}

// Cleanup only disconnects, doesn't destroy instance
export const cleanupSocketBridge = (): void => {
  if (globalSocketBridge) {
    globalSocketBridge.disconnect(); // Connection cleared
    // Singleton preserved with session state intact
  }
};
```

**Benefits:**
- Clear ownership (instance owns state)
- Encapsulated (private property)
- Discoverable (visible in class definition)
- Testable (can create instances for tests)
- Follows singleton pattern correctly

## Files Modified

### `client/src/infrastructure/socket/queryBridge.ts`

**Removed:**
- Module-level `persistentConfigVersion` variable

**Changed:**
1. **Class definition** (line 107-108): Added comment explaining session state
2. **disconnect() method** (lines 141-149): Added comment about preserving session state
3. **Version initialization** (lines 190-206): Check if already set, log preservation
4. **cleanupSocketBridge()** (lines 731-736): Removed instance destruction

## Architectural Alignment

This fix aligns with AGENTS.md guidelines:

✅ **"Always use top quality, industry-standard approaches"** - Proper singleton pattern
✅ **"NO bandaid solutions - all fixes must be architecturally sound"** - Separates concerns correctly
✅ **"NO zombie or spaghetti code"** - Clear, maintainable structure
✅ **"Follow Clean Architecture and DDD patterns"** - Proper state scoping

## Summary

**The fix**: Don't destroy the singleton, only disconnect its socket.

**Why it works**: Separates connection state (temporary) from session state (persistent).

**Industry pattern**: Manager persists, connections disconnect/reconnect.

**Result**: Version tracking survives reconnections, proper Clean Architecture maintained.
