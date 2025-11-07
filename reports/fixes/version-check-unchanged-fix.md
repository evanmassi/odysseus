# Fix: Version Check Showing "Unchanged" Despite Version Incrementing

## Problem
Version was incrementing correctly on server (v1→v4→v5→v6), but client-side version check showed "previous: 6, current: 6, unchanged", preventing cache invalidation notifications.

## Root Cause Analysis

### Issue 1: `refetchQueries()` vs `fetchQuery()`
**Problem**: `queryClient.refetchQueries()` returns a Promise that resolves when refetch is **initiated**, not when it **completes**.

**Impact**:
```typescript
// OLD CODE (BROKEN):
await this.queryClient.refetchQueries({ queryKey: ... });  // ← Returns immediately
const newConfig = this.queryClient.getQueryData(...);       // ← Still has OLD data!
```

The code was reading from cache before the network request completed, so `newVersion` was still the old version.

**Fix**: Use `fetchQuery()` instead, which waits for the HTTP request to complete:
```typescript
// NEW CODE (FIXED):
const freshData = await this.queryClient.fetchQuery({ queryKey: ... });  // ← Waits for network
const newVersion = freshData?.configuration?.systemConfig?.version;      // ← Fresh data!
```

### Issue 2: `lastKnownConfigVersion` Not Initialized
**Problem**: `lastKnownConfigVersion` started as `null` and was never initialized on app load.

**Impact**: On first Socket event after page load, version tracking had no baseline to compare against.

**Fix**: Initialize `lastKnownConfigVersion` when Socket connects:
```typescript
this.socket.on('connect', () => {
  const currentConfig = this.queryClient.getQueryData(...);
  const currentVersion = currentConfig?.configuration?.systemConfig?.version;

  if (currentVersion) {
    this.lastKnownConfigVersion = currentVersion;
    console.log('🔢 [SocketBridge] Initialized version tracking', { version: currentVersion });
  }
});
```

## Changes Made

### File: `client/src/infrastructure/socket/queryBridge.ts`

#### 1. Initialize Version Tracking on Connect (Lines 184-195)
```typescript
// Initialize lastKnownConfigVersion from current cache
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
```

#### 2. Use `fetchQuery()` Instead of `refetchQueries()` (Lines 502-524)
```typescript
// OLD: refetchQueries() - returns when initiated (not completed)
await this.queryClient.refetchQueries({ queryKey: queryKeys.storage.storage() });
const newConfig = this.queryClient.getQueryData(...);  // Stale data!

// NEW: fetchQuery() - returns when network request completes
const freshData = await this.queryClient.fetchQuery({
  queryKey: queryKeys.storage.storage()
}) as any;
const newVersion = freshData?.configuration?.systemConfig?.version;  // Fresh data!
```

#### 3. Enhanced Logging (Lines 502-522, 566-581)
Added detailed logging to trace version check flow:
- `🔍 Starting version check` - Entry point with lastKnownVersion
- `♻️ Cache invalidated` - After invalidation
- `📦 Fresh data received` - After network fetch completes
- `📊 Version check` - Comparison result
- `🔄 Updated version tracking` - Tracking variable updated

## Expected Behavior After Fix

### Scenario: User Updates Configuration

1. **Server Side**:
   - v6 → v7 (version increments)
   - Save to database
   - Emit Socket event `configuration_updated`

2. **Client Side**:
   ```
   🔍 Starting version check { lastKnownVersion: 6 }
   ♻️ Cache invalidated, fetching fresh data...
   📦 Fresh data received { version: 7 }
   📊 Version check { previous: 6, current: 7, changed: true, willNotify: true }
   🔄 Updated version tracking { from: 6, to: 7 }
   ✅ Configuration updated notification shown
   ```

3. **Result**: Notification displayed, cache properly invalidated

## Technical Details

### React Query Behavior
- `invalidateQueries()`: Marks queries as stale
- `refetchQueries()`: Triggers refetch, returns Promise that resolves when refetch **starts**
- `fetchQuery()`: Fetches data, returns Promise that resolves when data **arrives**

### Version Tracking Lifecycle
1. **App Load**: Socket connects → initialize `lastKnownConfigVersion` from cache
2. **Socket Event**: Compare `lastKnownConfigVersion` (old) vs `fetchQuery()` result (new)
3. **After Check**: Update `lastKnownConfigVersion = newVersion` for next comparison

### Edge Cases Handled
- **First event after page load**: `lastKnownConfigVersion` now initialized on connect
- **Database reset**: Still detected via `newVersion < currentVersion` check
- **Network delay**: `fetchQuery()` waits for actual data
- **Multiple rapid events**: Each event waits for previous fetch to complete (sequential)

## Testing Recommendations

1. **Basic Update**: Change rack name → verify notification appears
2. **Multiple Updates**: Make 3 rapid changes → verify 3 notifications
3. **Page Reload**: Reload → make change → verify notification works
4. **Database Reset**: Reset DB → verify warning notification + localStorage cleared
5. **Network Delay**: Throttle network to 3G → verify still works correctly

## Related Files
- `client/src/infrastructure/socket/queryBridge.ts` - Version checking logic
- `client/src/domains/storage/hooks/useConfigurationSync.ts` - Syncs server data to store
- `server/src/application/commands/ConfigurationCommands.ts` - Server-side version increment

## Architecture Notes

This fix maintains the existing architecture:
- **Server is source of truth** (version incremented in domain entity)
- **Socket.IO for real-time updates** (events fired after database save)
- **React Query for server state** (cache invalidation on version change)
- **Zustand for client state** (synced from React Query via hook)

The fix ensures the client **actually waits** for fresh data before comparing versions, solving the race condition.
