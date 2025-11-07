# Fix: Version Tracking Shows Null After Socket Reconnection

## Problem
Version tracking showed `lastKnownVersion: null` after socket reconnections, preventing proper version change detection. This happened despite the version being correctly initialized on first connect.

## Root Cause - Deep Analysis

### The Logs Revealed the Issue:
```
✅ [SocketBridge] Connected { socketId: "9sGHEW7eRI-aGXMuAAAT" }
🔢 [SocketBridge] Initialized version tracking { version: 8 }

⚠️ [SocketBridge] Already initialized, skipping duplicate initialization

✅ [SocketBridge] Connected { socketId: "3MO0pH9t5P1GhVnlAAAc" }  ← DIFFERENT SOCKET ID

🔍 [SocketBridge] Starting version check { lastKnownVersion: null }  ← LOST VERSION!
```

**Two different socket IDs means the `SocketQueryBridge` instance was destroyed and recreated.**

### The Architectural Problem:

1. **Instance-Level State**: `lastKnownConfigVersion` was stored as a **private instance property** of `SocketQueryBridge`

2. **Instance Destruction**: `cleanupSocketBridge()` destroys the entire instance:
   ```typescript
   export const cleanupSocketBridge = (): void => {
     if (globalSocketBridge) {
       globalSocketBridge.disconnect();
       globalSocketBridge = null;  // ← Destroys entire instance
     }
   };
   ```

3. **Triggers for Cleanup**:
   - **HMR (Hot Module Reload)** during development
   - **Component unmount/remount cycles** (React Strict Mode doubles this)
   - **Bootstrap retry logic** calls `cleanup()` → `cleanupSocket()` → `cleanupSocketBridge()`
   - **Network reconnections** may trigger cleanup/re-initialization

4. **Loss of State**: New `SocketQueryBridge` instance is created → `lastKnownConfigVersion` resets to `null` → version tracking broken

### Why Previous Fixes Didn't Work:

1. **Initialization on connect**: Worked for first connection, but lost on reconnection
2. **Reading from cache**: Cache might not be populated yet
3. **fetchQuery() instead of refetchQueries()**: Fixed timing, but didn't solve persistence

The fundamental issue was **storing ephemeral state in an object that gets destroyed**.

## The Correct Fix: Module-Level Persistent State

### Solution: Store version outside the class

```typescript
/**
 * Module-level version tracking that persists across SocketQueryBridge instance recreation.
 *
 * WHY THIS IS NECESSARY:
 * - `cleanupSocketBridge()` destroys the SocketQueryBridge instance
 * - HMR, component unmounts, and reconnections trigger cleanup
 * - Each new instance would lose version tracking → always shows "null"
 *
 * SOLUTION:
 * - Store version at module level (outside class)
 * - Survives socket reconnections and instance recreation
 * - Resets only on page reload (correct behavior - sync with server on fresh start)
 */
let persistentConfigVersion: number | null = null;
```

### Why This Works:

1. **Module Scope**: Variable lives at module level, not instance level
2. **Survives Instance Destruction**: When `globalSocketBridge = null`, `persistentConfigVersion` remains
3. **Survives Reconnections**: HMR, cleanup, and re-initialization don't reset it
4. **Correct Lifecycle**: Resets only on page reload (fresh browser context), which is correct - app should sync with server

### Implementation Details:

#### 1. Initialize on First Connect (if not already initialized)
```typescript
if (currentVersion && persistentConfigVersion === null) {
  persistentConfigVersion = currentVersion;
  console.log('🔢 [SocketBridge] Initialized persistent version tracking', {
    version: currentVersion,
    note: 'Persists across socket reconnections'
  });
} else if (persistentConfigVersion !== null) {
  console.log('🔢 [SocketBridge] Version tracking already initialized', {
    version: persistentConfigVersion,
    note: 'Survived instance recreation'
  });
}
```

#### 2. Use Persistent Version in Checks
```typescript
// OLD (instance-level):
const currentVersion = this.lastKnownConfigVersion;

// NEW (module-level):
const currentVersion = persistentConfigVersion;
```

#### 3. Initialize on First Event if Still Null
```typescript
if (currentVersion === null && newVersion !== undefined) {
  console.log('🔢 [SocketBridge] First version seen, initializing persistent tracking', {
    version: newVersion,
    note: 'Will survive reconnections'
  });
  persistentConfigVersion = newVersion;
  return true;  // First event always treated as changed
}
```

#### 4. Update After Each Check
```typescript
const previousTrackedVersion = persistentConfigVersion;
persistentConfigVersion = newVersion;

console.log('🔄 [SocketBridge] Updated persistent version tracking', {
  from: previousTrackedVersion,
  to: newVersion,
  note: 'Will survive reconnections'
});
```

## Expected Behavior After Fix

### Scenario: Socket Reconnection
```
✅ [SocketBridge] Connected { socketId: "ABC123" }
🔢 [SocketBridge] Initialized persistent version tracking { version: 8 }

--- HMR or cleanup happens, instance destroyed ---

✅ [SocketBridge] Connected { socketId: "DEF456" }  ← NEW instance
🔢 [SocketBridge] Version tracking already initialized { version: 8 }  ← PERSISTED!

🔔 Configuration updated event
🔍 [SocketBridge] Starting version check { persistentVersion: 8 }  ← NOT NULL!
📦 [SocketBridge] Fresh data received { version: 9 }
📊 [SocketBridge] Version check { previous: 8, current: 9, changed: true }  ← WORKS!
```

## Technical Comparison: State Storage Options

| Storage Location | Survives Reconnect | Survives Page Reload | Correct Behavior |
|------------------|-------------------|---------------------|------------------|
| Instance Property | ❌ No | ❌ No | ❌ Lost on reconnect |
| Module Variable | ✅ Yes | ❌ No | ✅ Perfect |
| localStorage | ✅ Yes | ✅ Yes | ⚠️  Stale after reload |
| React Query Metadata | ✅ Yes | ❌ No | ⚠️  Complex coupling |

**Module-level variable is the optimal choice:**
- Simple implementation
- Correct lifecycle (reset on page reload)
- No coupling to external systems
- Industry-standard pattern for session-scoped state

## Files Changed

### `client/src/infrastructure/socket/queryBridge.ts`

**Added module-level persistent state** (lines 95-108):
```typescript
let persistentConfigVersion: number | null = null;
```

**Updated initialization logic** (lines 196-213):
- Check if `persistentConfigVersion` already exists
- Initialize only if null
- Log whether it's first init or survived recreation

**Updated version check** (lines 530-536):
- Use `persistentConfigVersion` instead of `this.lastKnownConfigVersion`

**Updated first-event initialization** (lines 557-566):
- Set `persistentConfigVersion` on first event

**Updated version tracking update** (lines 602-610):
- Update `persistentConfigVersion` after check

## Why This is an Industry-Standard Fix

1. **Separation of Concerns**: Lifecycle state (version) separated from connection state (socket)
2. **State Scoping**: Module-level for session scope, not instance-level for object scope
3. **Resilience**: Survives expected failures (reconnections) but resets on hard failures (page reload)
4. **Simplicity**: No complex persistence layer, no coupling to external systems
5. **Explicit Lifecycle**: Clear when state resets (module reload = browser context change)

## Related Patterns

### React Context State
Similar problem: When Context provider unmounts/remounts, state is lost. Solution: Lift state to module level or use zustand/redux.

### Singleton Pattern
The `globalSocketBridge` is a singleton, but storing state IN the singleton causes issues when singleton is recreated. Solution: Store state OUTSIDE singleton.

### Event Sourcing
In event sourcing, version tracking must survive service restarts. This fix applies the same principle at the module level.

## Testing Recommendations

1. **Basic Reconnection**: Disconnect/reconnect socket → verify version persists
2. **HMR Simulation**: Trigger HMR → verify version persists
3. **Multiple Updates**: Make 3 changes without reconnect → verify all 3 detected
4. **Multiple Updates with Reconnection**: Make change → reconnect → make change → verify both detected
5. **Page Reload**: Reload page → verify version resets to null (correct behavior)
6. **First Event After Reload**: Reload → make change → verify notification appears

## Architectural Notes

This fix addresses a fundamental principle: **state lifecycle must match its usage scope**.

- ❌ **Wrong**: Instance property for state that must survive instance destruction
- ✅ **Right**: Module variable for state that must survive instance recreation

The instance is a **connection handler**, not a **state repository**. Version tracking is **session state**, not **connection state**.

By separating these concerns, the system becomes more resilient and follows industry-standard patterns for managing different types of state in a JavaScript module system.
