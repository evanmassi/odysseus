# No-Console Investigation Report

**Date:** 2025-11-11
**Total Console Statements:** 318
**Investigator:** Automated analysis with manual categorization logic

## Executive Summary

- **Category A (DEBUG - DELETE):** 1 statements
- **Category B (ERROR LOGGING - KEEP):** 153 statements
- **Category C (WARNING LOGGING - KEEP):** 50 statements
- **Category D (INFO LOGGING - KEEP):** 91 statements
- **Category E (QUESTIONABLE - REVIEW):** 23 statements

### Action Items

1. **DELETE:** 1 debug statements
2. **KEEP (add ESLint comments):** 294 statements
3. **MANUAL REVIEW:** 23 statements

---

## Category A: DEBUG LOGS (DELETE) - 1 statements

Temporary debug statements with no production value. Safe to delete.

### shared/utils/lazy/lazyComponentUtils.tsx
**Lines:** 203

**Line 203:** `console.log(`🚀 Preloaded ${componentName} in ${loadTime.toFixed(2)}ms (priority: ${priority})`);`
- **Reasoning:** Development-only debug statement
- **Action:** DELETE

---

## Category B: ERROR LOGGING (KEEP) - 153 statements

Critical error logging for debugging production issues. All should be kept with ESLint disable comments.

### app/bootstrap/AppBootstrapService.ts
**Count:** 2 error logs

**Line 94:** `console.error('❌ [Bootstrap] Auth check failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 113:** `console.error('❌ [Bootstrap] Real-time systems initialization failed:', socketError);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### app/components/boundaries/AppErrorBoundary.tsx
**Count:** 1 error logs

**Line 59:** `console.error('🛑 [ERROR BOUNDARY] React error caught:', {`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### app/components/layout/Dashboard.tsx
**Count:** 2 error logs

**Line 136:** `console.error('Invalid location: missing required fields', location);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 147:** `console.error('Navigation failed:', result.error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### app/hooks/grid/useGridKeyboardNavigation.ts
**Count:** 1 error logs

**Line 203:** `console.error('Paste operation failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### app/providers.tsx
**Count:** 1 error logs

**Line 87:** `console.error('App Error Boundary:', error, errorInfo);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### app/queryClient.ts
**Count:** 4 error logs

**Line 101:** `console.error('Query failed:', {`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 123:** `console.error('Mutation failed:', {`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 133:** `console.error('Full error object:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 135:** `console.error('Original unwrapped error:', originalError);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### app/services/SessionManager.ts
**Count:** 7 error logs

**Line 210:** `console.error('❌ No tokens available for refresh');`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 216:** `console.error('❌ Refresh token expired');`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 253:** `console.error(`❌ Token refresh attempt ${attempt} failed:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 264:** `console.error('❌ Token refresh failed after all retry attempts');`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 306:** `console.error('❌ Automatic token refresh failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 459:** `console.error('Failed to parse stored tokens:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 477:** `console.error('Failed to parse stored user:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### app/stores/errorStore.ts
**Count:** 1 error logs

**Line 26:** `console.error('Odysseus Error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/admin/services/AdminService.ts
**Count:** 27 error logs

**Line 38:** `console.error('Failed to get users:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 53:** `console.error(`Failed to update user role for ${userId}:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 66:** `console.error(`Failed to delete user ${userId}:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 87:** `console.error('Failed to get pending users:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 100:** `console.error(`Failed to approve user ${userId}:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 113:** `console.error(`Failed to reject user ${userId}:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 129:** `console.error(`Failed to link researcher to user ${userId}:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 142:** `console.error(`Failed to unlink researcher from user ${userId}:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 165:** `console.error(`Failed to reset password for user ${userId}:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 189:** `console.error(`Failed to generate password reset token for user ${userId}:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 211:** `console.error('Failed to get researchers:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 225:** `console.error(`Failed to delete researcher ${researcherId}:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 245:** `console.error('Failed to get unlinked researchers:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 264:** `console.error('Failed to create and link researcher:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 284:** `console.error('Failed to create researcher:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 308:** `console.error('Failed to get admin metrics:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 334:** `console.error('Failed to get security config:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 354:** `console.error('Failed to update security config:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 380:** `console.error('Failed to get sync status:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 430:** `console.error('Failed to get audit log:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 464:** `console.error('Failed to get audit statistics:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 484:** `console.error(`Failed to get entity history for ${entityType}:${entityId}:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 536:** `console.error('Failed to search audit logs:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 576:** `console.error('Failed to get retention metrics:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 608:** `console.error('Failed to get retention policy:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 640:** `console.error('Failed to run manual archival:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 663:** `console.error('Failed to export archived logs:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/admin/ui/components/AdminSettingsModal.tsx
**Count:** 6 error logs

**Line 77:** `console.error('Failed to load configuration:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 96:** `console.error('Failed to load users:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 114:** `console.error('Failed to load system stats:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 150:** `console.error('Failed to save configuration:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 166:** `console.error('Failed to load sync status:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 183:** `console.error('Failed to create invite code:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/admin/ui/components/AuditLogViewer.tsx
**Count:** 1 error logs

**Line 61:** `console.error('Failed to load audit log:', err);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/admin/ui/components/AuditRetentionSettings.tsx
**Count:** 3 error logs

**Line 68:** `console.error('Failed to load retention data:', err);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 95:** `console.error('Failed to run archival:', err);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 115:** `console.error('Failed to export archive:', err);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/admin/ui/components/PasswordResetModal.tsx
**Count:** 1 error logs

**Line 97:** `console.error('Failed to copy to clipboard:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/admin/ui/components/tabs/ResearcherManagementTab.tsx
**Count:** 2 error logs

**Line 86:** `console.error('Failed to load researchers:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 131:** `console.error('Failed to delete researcher:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/admin/ui/components/tabs/UserManagementTab.tsx
**Count:** 7 error logs

**Line 99:** `console.error('Failed to load pending users:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 121:** `console.error('Failed to update user role:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 147:** `console.error('Failed to delete user:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 169:** `console.error('Failed to approve user:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 197:** `console.error('Failed to reject user:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 224:** `console.error('Failed to unlink researcher:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 243:** `console.error('Failed to load unlinked researchers:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/authentication/services/AuthenticationService.ts
**Count:** 2 error logs

**Line 172:** `console.error('Failed to check first-time setup:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 195:** `console.error('Failed to get password requirements:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/authentication/stores/authStore.ts
**Count:** 5 error logs

**Line 149:** `console.error('❌ [AUTH STORE] Login exception:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 187:** `console.error('❌ [AUTH STORE] Registration exception:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 255:** `console.error('❌ [AUTH STORE] registerWithResearcher exception:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 303:** `console.error('❌ [AUTH STORE] Session verification error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 317:** `console.error('❌ [AUTH STORE] First time check failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/authentication/ui/components/RegisterModal.tsx
**Count:** 1 error logs

**Line 97:** `console.error('Failed to load password requirements:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/authentication/ui/components/UserSettingsModal.tsx
**Count:** 2 error logs

**Line 76:** `console.error('❌ [UserSettingsModal] Save failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 81:** `console.error('❌ [UserSettingsModal] Failed to save settings:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/authentication/ui/components/tabs/AccountTab.tsx
**Count:** 1 error logs

**Line 120:** `console.error('❌ [AccountTab] Update failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/authentication/ui/components/tabs/SecurityTab.tsx
**Count:** 2 error logs

**Line 53:** `console.error('Failed to fetch password requirements:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 144:** `console.error('❌ [SecurityTab] Password change failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/grid/services/GridNavigationService.ts
**Count:** 4 error logs

**Line 67:** `console.error(`❌ ATOMIC NAVIGATION: User not authenticated`);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 76:** `console.error('❌ ATOMIC NAVIGATION: Navigation failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 97:** `console.error(`🐛 DEBUG: No racks found for tank "${tankId}"`);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 103:** `console.error(`🐛 DEBUG: No boxes found for tank "${tankId}", rack ${racks[0].id}`);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/search/ui/components/SearchContainer.tsx
**Count:** 1 error logs

**Line 69:** `console.error('Search failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/storage/hooks/useBoxPositionDisplay.ts
**Count:** 2 error logs

**Line 88:** `console.error('❌ [useUpdateBoxPositionDisplayMutation] Failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 139:** `console.error('❌ [useUpdateLabDefaultPositionDisplayMutation] Failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/storage/hooks/useConfigurationSync.ts
**Count:** 2 error logs

**Line 99:** `console.error('❌ [ConfigSync] Failed to save initial configuration:', saveError);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 147:** `console.error('❌ [ConfigSync] Error parsing storage event:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/storage/services/StorageService.ts
**Count:** 5 error logs

**Line 31:** `console.error('❌ [StorageService] Load configuration failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 54:** `console.error('❌ [StorageService] Save configuration failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 126:** `console.error('❌ [StorageService] Get position display presets failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 160:** `console.error('❌ [StorageService] Update box position display failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 186:** `console.error('❌ [StorageService] Update lab default position display failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/tubes/hooks/useOptimisticTubeMutations.ts
**Count:** 1 error logs

**Line 82:** `console.error('❌ [OptimisticTube] Failed to create tube:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/tubes/hooks/useTubeMutations.ts
**Count:** 7 error logs

**Line 78:** `console.error('❌ [React Query] Create tube failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 175:** `console.error(`❌ [React Query] Update tube ${variables.id} failed:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 265:** `console.error(`❌ [React Query] Delete tube ${id} failed:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 351:** `console.error('❌ [React Query] Bulk update failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 396:** `console.error(`Failed to delete tube ${id}:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 449:** `console.error('❌ [React Query] Bulk delete failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 509:** `console.error('❌ [React Query] Paste tubes failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/tubes/hooks/useTubeSocket.ts
**Count:** 2 error logs

**Line 53:** `console.error('❌ [Socket] Connection error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 257:** `console.error('❌ [Socket] Failed to reconnect to server');`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/tubes/services/BulkOperationsService.ts
**Count:** 2 error logs

**Line 70:** `console.error('Bulk update failed:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 210:** `console.error(`Bulk update attempt ${retryCount + 1} failed:`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/tubes/services/dataConsistencyService.ts
**Count:** 2 error logs

**Line 128:** `console.error('Failed to force update tank ID:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 154:** `console.error('Failed to clear persisted configuration:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/tubes/ui/components/grid/StorageNavigator.tsx
**Count:** 3 error logs

**Line 68:** `console.error('Failed to navigate to tank:', result.error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 89:** `console.error('Failed to navigate to rack:', result.error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 96:** `console.error('Failed to navigate to box:', result.error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/tubes/ui/components/modals/BatchTubeEditorModal.tsx
**Count:** 3 error logs

**Line 260:** `console.error('Batch update error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 317:** `console.error('Retry error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 346:** `console.error('Batch delete error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/tubes/ui/components/modals/StorageManagementModal.tsx
**Count:** 6 error logs

**Line 276:** `console.error('Failed to delete tank:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 534:** `console.error('Failed to update box grid:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 595:** `console.error('Failed to update box grid:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 628:** `console.error('Failed to update rack:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 735:** `console.error('Failed to update tank:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 845:** `console.error('Failed to update tank:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### domains/tubes/ui/components/modals/TubeEditorModal.tsx
**Count:** 1 error logs

**Line 565:** `console.error('Tube creation error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### infrastructure/cache/CacheWarmingService.ts
**Count:** 1 error logs

**Line 77:** `console.error('❌ [CacheWarming] Failed to start warming:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### infrastructure/connection/networkMonitor.ts
**Count:** 2 error logs

**Line 168:** `console.error('❌ [NetworkMonitor] Maximum reconnection attempts reached');`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 339:** `console.error('❌ [NetworkMonitor] Listener error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### infrastructure/optimistic/optimisticUpdates.ts
**Count:** 1 error logs

**Line 157:** `console.error('❌ [OptimisticUpdates] Mutation failed, rolling back:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### infrastructure/socket/SocketService.ts
**Count:** 1 error logs

**Line 69:** `console.error('❌ [SocketService] Failed to initialize:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### infrastructure/socket/queryBridge.ts
**Count:** 14 error logs

**Line 228:** `console.error('❌ [SocketBridge] Connection error:', {`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 283:** `console.error('❌ [SocketBridge] Invalid tube_created event:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 319:** `console.error('❌ [SocketBridge] Invalid tube_updated event:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 353:** `console.error('❌ [SocketBridge] Invalid tube_deleted event:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 395:** `console.error('❌ [SocketBridge] Invalid tubes_bulk_updated event:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 423:** `console.error('❌ [SocketBridge] Invalid researcher_created event:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 444:** `console.error('❌ [SocketBridge] Invalid researcher_updated event:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 465:** `console.error('❌ [SocketBridge] Invalid researcher_deleted event:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 497:** `console.error('❌ [SocketBridge] Error handling configuration_updated event:', {`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 511:** `console.error('❌ [SocketBridge] Critical: Failed to invalidate cache in error handler:', fallbackError);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 584:** `console.error('❌ [SocketBridge] Failed to clear localStorage:', clearError);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 605:** `console.error('❌ [SocketBridge] Error checking configuration version:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 686:** `console.error('❌ [SocketBridge] Failed to reconnect to server after all attempts');`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 691:** `console.error('❌ [SocketBridge] Reconnection error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### shared/ui/components/boundaries/ErrorBoundary.tsx
**Count:** 6 error logs

**Line 128:** `console.error('Error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 129:** `console.error('Error ID:', errorId);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 194:** `console.error('Error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 195:** `console.error('Error Info:', errorInfo);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 196:** `console.error('Error ID:', errorId);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 261:** `console.error('Handled error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### shared/ui/components/boundaries/SuspenseBoundary.tsx
**Count:** 3 error logs

**Line 124:** `console.error('Error:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 125:** `console.error('Error Info:', errorInfo);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 176:** `console.error(`Failed to load lazy component: ${componentName}`, error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### shared/ui/primitives/shared/ErrorBanner.tsx
**Count:** 1 error logs

**Line 23:** `console.error('Failed to copy errors to clipboard:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### shared/utils/dateUtils.ts
**Count:** 2 error logs

**Line 56:** `console.error('Error normalizing date:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

**Line 105:** `console.error('Error formatting date for display:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### shared/utils/lazy/lazyComponentUtils.tsx
**Count:** 1 error logs

**Line 144:** `console.error(`❌ Failed to load ${componentName} after ${finalConfig.retryAttempts} attempts in ${totalTime.toFixed(2)}ms`);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

### shared/utils/resetConfiguration.ts
**Count:** 1 error logs

**Line 40:** `console.error('❌ RESET: Failed to clear configuration:', error);`
```
// eslint-disable-next-line no-console -- Error logging needed for debugging production issues
```

---

## Category C: WARNING LOGGING (KEEP) - 50 statements

Intentional warnings for monitoring performance, invalid states, or deprecations. Keep with ESLint comments.

### app/bootstrap/AppBootstrapService.ts
**Count:** 1 warnings

**Line 67:** `console.warn('[Bootstrap] Already initialized, skipping duplicate bootstrap');`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### app/components/layout/Dashboard.tsx
**Count:** 2 warnings

**Line 180:** `console.warn('[Dashboard] handleEditTube called with invalid input:', input);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 202:** `console.warn('[Dashboard] Batch edit requested but no valid tube IDs found:', inputs);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### app/hooks/useFieldResolver.ts
**Count:** 5 warnings

**Line 165:** `console.warn(`Field resolution failed for key '${fieldKey}':`, error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 185:** `console.warn(`Bulk field resolution failed for key '${fieldKey}':`, error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 202:** `console.warn(`hasValue check failed for key '${fieldKey}':`, error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 217:** `console.warn(`Field resolution details failed for key '${fieldKey}':`, error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 237:** `console.warn(`getFieldPath failed for key '${fieldKey}':`, error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### app/hooks/useSimpleFieldResolver.ts
**Count:** 1 warnings

**Line 93:** `console.warn(`Failed to get tube value for field '${fieldPath}':`, error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### domains/admin/ui/components/AdminSettingsModal.tsx
**Count:** 1 warnings

**Line 93:** `console.warn('Failed to load users: API returned unsuccessful response or invalid data format');`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### domains/authentication/stores/authStore.ts
**Count:** 1 warnings

**Line 332:** `console.warn('⚠️ [AUTH STORE] Backend logout failed (clearing local session anyway):', error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### domains/storage/hooks/useConfigurationSync.ts
**Count:** 1 warnings

**Line 78:** `console.warn('⚠️ [ConfigSync] No configuration on server (fresh install).');`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### domains/storage/stores/storageStore.ts
**Count:** 2 warnings

**Line 580:** `console.warn('⚠️ ConfigurationStore.loadFromServer() is deprecated. Use useLoadConfigurationQuery() hook instead.');`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 690:** `console.warn('⚠️ ConfigurationStore.saveToServer() is deprecated. Use useSaveConfigurationMutation() hook instead.');`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### domains/storage/ui/components/storage-navigator/useStorageNavigation.ts
**Count:** 3 warnings

**Line 44:** `console.warn('No racks available in tank:', tankId);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 50:** `console.warn('No boxes available in rack:', firstRack.id);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 62:** `console.warn('No boxes available in rack:', rackId);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### domains/tubes/config/fieldConfig.ts
**Count:** 2 warnings

**Line 248:** `console.warn('Missing field configurations for:', missingKeys);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 251:** `console.warn('Extra field configurations found:', extraKeys);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### domains/tubes/hooks/useTubeForm.ts
**Count:** 2 warnings

**Line 160:** `console.warn('Tube creation warnings:', warnings);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 183:** `console.warn('Tube update warnings:', warnings);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### domains/tubes/services/BulkOperationsService.ts
**Count:** 1 warnings

**Line 33:** `console.warn('Server health check failed, falling back to individual updates');`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### domains/tubes/services/dataConsistencyService.ts
**Count:** 1 warnings

**Line 43:** `console.warn('📋 DATA CONSISTENCY: Could not access React Query cache:', error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### domains/tubes/ui/components/modals/TubeEditorModal.tsx
**Count:** 1 warnings

**Line 555:** `console.warn('Tube operation errors:', errors);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### domains/tubes/utils/colorSystem.ts
**Count:** 1 warnings

**Line 282:** `console.warn('Color adjustment failed, using original color:', color);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### infrastructure/api/responseTransformers.ts
**Count:** 3 warnings

**Line 77:** `console.warn(`⚠️ [API TRANSFORMER] Using regex fallback for field "${key}" in type "${typeName || 'unknown'}". Consider adding explicit mapping to EXPLICIT_DATE_FIELDS.`);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 106:** `console.warn(`[API TRANSFORMER] Invalid date value: ${value}`);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 113:** `console.warn(`[API TRANSFORMER] Unparseable date type: ${typeof value}, value:`, value);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### infrastructure/cache/CacheWarmingService.ts
**Count:** 5 warnings

**Line 124:** `console.warn(`Failed to load critical data for ${query.queryKey}:`, error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 158:** `console.warn('Failed to prefetch location tubes:', error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 171:** `console.warn('Failed to prefetch statistics:', error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 224:** `console.warn('Failed to prefetch system config:', error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 249:** `console.warn('Failed to prefetch navigation target:', error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### infrastructure/configuration/tubeFieldConfiguration.ts
**Count:** 1 warnings

**Line 535:** `console.warn('Some fields cannot be resolved:', resolutionValidation.invalidFields);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### infrastructure/connection/networkMonitor.ts
**Count:** 1 warnings

**Line 118:** `console.warn('⚠️ [NetworkMonitor] False online event - still no server connectivity');`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### infrastructure/optimistic/optimisticUpdates.ts
**Count:** 2 warnings

**Line 329:** `console.warn('⚠️ [OptimisticUpdates] User conflict resolution UI not implemented, defaulting to server');`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 351:** `console.warn('🚨 [OptimisticUpdates] Emergency rollback - cancelling all optimistic updates');`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### infrastructure/socket/SocketService.ts
**Count:** 1 warnings

**Line 51:** `console.warn('⚠️ [SocketService] Already initialized, skipping');`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### infrastructure/socket/queryBridge.ts
**Count:** 3 warnings

**Line 123:** `console.warn('⚠️ [SocketBridge] Already initialized, skipping duplicate initialization');`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 216:** `console.warn('⚠️ [SocketBridge] Disconnected from server', {`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 568:** `console.warn('⚠️ [SocketBridge] Database reset detected!', {`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### shared/ui/components/boundaries/SuspenseBoundary.tsx
**Count:** 2 warnings

**Line 203:** `console.warn('Failed to preload lazy component:', error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 216:** `console.warn('Failed to preload some lazy components:', error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### shared/utils/dateUtils.ts
**Count:** 1 warnings

**Line 45:** `console.warn('Invalid date input:', input);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### shared/utils/gridPositionManager.ts
**Count:** 1 warnings

**Line 51:** `console.warn(`Invalid grid position: ${position}. Keeping current: ${state.currentPosition}`);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### shared/utils/lazy/PreloadHelpers.ts
**Count:** 2 warnings

**Line 106:** `console.warn('[PreloadHelpers] Preload failed, will lazy load on render:', error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 338:** `console.warn(`[PreloadHelpers] Batch preload failed for import #${index}:`, result.reason);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

### shared/utils/lazy/lazyComponentUtils.tsx
**Count:** 3 warnings

**Line 118:** `console.warn(`⚠️ Failed to load ${componentName} (attempt ${attempt}/${finalConfig.retryAttempts}):`, error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 209:** `console.warn(`Failed to preload ${componentName}:`, error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

**Line 230:** `console.warn('Some components failed to preload during batch operation:', error);`
```
// eslint-disable-next-line no-console -- Warning logging for monitoring invalid states/performance issues
```

---

## Category D: INFO/OPERATIONAL LOGGING (KEEP) - 91 statements

Informational logging for system operations, debugging, and monitoring. Keep with ESLint comments.

### Bootstrap/Initialization (5 statements)

**domains/storage/hooks/useConfigurationSync.ts** (2 statements)

- Line 79: `console.log('📤 [ConfigSync] Saving initial configuration to server...');...`
  - System initialization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 95: `console.log('✅ [ConfigSync] Initial configuration saved to server');...`
  - System initialization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

**infrastructure/cache/CacheWarmingService.ts** (2 statements)

- Line 56: `console.log('🔥 [CacheWarming] Already in progress, skipping');...`
  - System initialization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 61: `console.log('🔥 [CacheWarming] Starting intelligent cache warming');...`
  - System initialization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

**infrastructure/configuration/tubeFieldConfiguration.ts** (1 statements)

- Line 539: `console.log('Tube field configuration initialized successfully');...`
  - System initialization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- System initialization logging`

### Cache Operations (31 statements)

**domains/storage/hooks/useConfigurationSync.ts** (7 statements)

- Line 44: `console.log('🔄 [ConfigSync] Version mismatch detected - invalidating cache');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 45: `console.log(`   Cached: v${cachedVersion} → Server: v${serverVersion}`);...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 50: `console.log('🗑️  [ConfigSync] Cleared stale localStorage cache');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 52: `console.log(`✅ [ConfigSync] Cache valid (v${serverVersion})`);...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 55: `console.log('📥 [ConfigSync] Syncing configuration from server');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 130: `console.log('✅ [ConfigSync] Syncing newer configuration from other tab');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 137: `console.log('⚠️ [ConfigSync] Ignoring older/same version from other tab');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

**domains/tubes/hooks/useOptimisticTubeMutations.ts** (3 statements)

- Line 135: `console.log('[OptimisticTube] Tube updated successfully:', variables.id);...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 182: `console.log('[OptimisticTube] Tube deleted successfully:', tubeId);...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 344: `console.log('[OptimisticTube] Tube moved successfully:', variables.tubeId);...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

**domains/tubes/hooks/useOptimizedTubeQueries.ts** (5 statements)

- Line 58: `console.log(`⚡ [Optimized Query] Transformed ${tubes.length} tubes into position...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 165: `console.log(`🔮 [Prefetch] Queued prefetch for ${adjacentRacks.length} racks, ${a...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 211: `console.log(`🧠 [Smart Prefetch] Prefetched ${recentLocations.length} recent loca...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 238: `console.log(`🔄 [Background Refresh] Syncing ${location.tankId}/${location.rackId...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 285: `console.log('📊 [Performance Metrics] React Query Stats:', metrics);...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

**domains/tubes/services/dataConsistencyService.ts** (3 statements)

- Line 38: `console.log(`📋 DATA CONSISTENCY: Authoritative tank ID from React Query data: "$...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 47: `console.log(`📋 DATA CONSISTENCY: No tube data found, using default: "${NAMING_PA...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 145: `console.log(`📋 DATA CONSISTENCY: Clearing cached config: ${key}`);...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

**infrastructure/cache/CacheWarmingService.ts** (7 statements)

- Line 87: `console.log('🔥 [CacheWarming] Loading critical data');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 130: `console.log('[CacheWarming] Critical data loaded and cached');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 137: `console.log('🔥 [CacheWarming] Loading high priority data');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 179: `console.log('🔥 [CacheWarming] Loading medium priority data');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 210: `console.log('🔥 [CacheWarming] Loading low priority data');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 232: `console.log('🎯 [CacheWarming] Prefetching for navigation to:', targetLocation);...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 310: `console.log('🔄 [CacheWarming] Refreshing critical data');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

**infrastructure/cache/performanceMonitoring.ts** (3 statements)

- Line 272: `console.log('Total Queries:', queries.length);...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 273: `console.log('Active Queries:', queries.filter(q => q.getObserversCount() > 0).le...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 274: `console.log('Stale Queries:', queries.filter(q => q.isStale()).length);...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

**shared/utils/resetConfiguration.ts** (3 statements)

- Line 11: `console.log('🔧 RESET: Clearing cached configuration...');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

- Line 33: `console.log(`🔧 RESET: Cleared ${key}`);...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 37: `console.log('RESET: Configuration cache cleared. Please refresh the page.');...`
  - Cache operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Cache operation logging for performance monitoring`

### Data Consistency/Sync (21 statements)

**domains/admin/ui/components/tabs/UserManagementTab.tsx** (2 statements)

- Line 254: `console.log('[DEBUG] Linking researcher to user:', {...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 270: `console.log('[DEBUG] Creating and linking researcher to user:', {...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

**domains/storage/hooks/useConfigurationSync.ts** (6 statements)

- Line 84: `console.log('📋 [ConfigSync] Client config to save:', {...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 115: `console.log('🔄 [ConfigSync] Storage change detected from another tab');...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 123: `console.log('📊 [ConfigSync] Multi-tab version check:', {...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 141: `console.log('🗑️  [ConfigSync] Storage cleared in another tab, refetching from se...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 158: `console.log('👂 [ConfigSync] Listening for multi-tab storage events');...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 162: `console.log('🔇 [ConfigSync] Stopped listening for storage events');...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

**domains/tubes/hooks/useOptimisticTubeMutations.ts** (6 statements)

- Line 38: `console.log('🔄 [OptimisticTube] Creating tube:', tubeData);...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 75: `console.log('[OptimisticTube] Tube created successfully:', data.id);...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 100: `console.log('🔄 [OptimisticTube] Updating tube:', id, data);...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 159: `console.log('🔄 [OptimisticTube] Deleting tube:', tubeId);...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 213: `console.log(`🔄 [OptimisticTube] Batch ${operation}:`, tubeIds.length, 'tubes');...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 305: `console.log('🔄 [OptimisticTube] Moving tube:', tubeId, 'to', toLocation);...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

**domains/tubes/hooks/useOptimizedTubeQueries.ts** (2 statements)

- Line 40: `console.log(`🚀 [Optimized Query] Loading virtualized tubes for ${location.tankId...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

- Line 87: `console.log(`🚀 [Optimized Query] Loading tubes`);...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

**domains/tubes/services/dataConsistencyService.ts** (5 statements)

- Line 60: `console.log(`📋 DATA CONSISTENCY: Current config tanks:`, currentTanks.map(t => (...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 69: `console.log(`📋 DATA CONSISTENCY: Found tank ID mismatch, correcting directly in ...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 74: `console.log(`📋 DATA CONSISTENCY: Updating tank ID from "${mismatchedTank.id}" to...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 80: `console.log(`📋 DATA CONSISTENCY: Tank IDs are consistent`);...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

- Line 125: `console.log(`📋 DATA CONSISTENCY: Tank ID forcibly updated to "${newTankId}"`);...`
  - Data consistency/synchronization logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Data consistency logging for troubleshooting`

### Other Operations (2 statements)

**domains/tubes/hooks/useOptimisticTubeMutations.ts** (1 statements)

- Line 273: `console.log('[OptimisticTube] Batch operation completed:', data.count, 'tubes');...`
  - Optimistic update logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

**shared/utils/resetConfiguration.ts** (1 statements)

- Line 25: `console.log(`🔧 RESET: Cleared ${key}`);...`
  - Navigation/storage operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

### React Query (1 statements)

**domains/tubes/services/dataLoadingService.ts** (1 statements)

- Line 103: `console.log(`🔄 DATA SERVICE: Location load requested for ${request.tankId}/${req...`
  - React Query operation logging
  - ESLint comment: `// eslint-disable-next-line no-console -- Intentional logging for system monitoring`

### Real-Time/Socket Systems (31 statements)

**domains/tubes/hooks/useTubeSocket.ts** (15 statements)

- Line 35: `console.log('🔌 [Socket] Initializing socket connection');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 43: `console.log('[Socket] Connected to server');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 48: `console.log('❌ [Socket] Disconnected from server:', reason);...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 65: `console.log('🔄 [Socket] Tube created event received:', tube.id);...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 79: `console.log('⚠️ [Socket] Tube already exists in cache, skipping add');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 83: `console.log('[Socket] Adding new tube to cache');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 114: `console.log('🔄 [Socket] Tube updated event received:', tube.id);...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 148: `console.log('[Socket] Tube update applied to cache');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 157: `console.log('🔄 [Socket] Tube deleted event received:', tubeId);...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 184: `console.log('[Socket] Tube deletion applied to cache');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 193: `console.log(`🔄 [Socket] Bulk update event received: ${tubes.length} tubes`);...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 230: `console.log('[Socket] Bulk update applied to cache');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 236: `console.log('🔄 [Socket] Researcher data updated, invalidating related queries');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 248: `console.log(`🔄 [Socket] Reconnected after ${attemptNumber} attempts`);...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 269: `console.log('🔌 [Socket] Disconnecting socket');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

**infrastructure/socket/queryBridge.ts** (16 statements)

- Line 161: `console.log('🌐 [SocketBridge] Browser back online');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 169: `console.log('📴 [SocketBridge] Browser went offline');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 187: `console.log('✅ [SocketBridge] Connected to server', {...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 201: `console.log('🔢 [SocketBridge] Initialized version tracking', {...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 206: `console.log('🔢 [SocketBridge] Version tracking preserved from previous connectio...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 479: `console.log(...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 492: `console.log('⚠️ [SocketBridge] Configuration version unchanged, skipping notific...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 509: `console.log('✅ [SocketBridge] Fallback: Successfully invalidated configuration c...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 528: `console.log('🔍 [SocketBridge] Starting version check', {...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 538: `console.log('♻️  [SocketBridge] Cache invalidated, fetching fresh data...');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 545: `console.log('📦 [SocketBridge] Fresh data received from server', {...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 554: `console.log('🔢 [SocketBridge] First version seen, initializing tracking', {...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 582: `console.log('🗑️  [SocketBridge] Cleared localStorage after database reset');...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 588: `console.log('📊 [SocketBridge] Version check:', {...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 673: `console.log(`🔄 [SocketBridge] Reconnected after ${attemptNumber} attempts`);...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

- Line 682: `console.log(`🔄 [SocketBridge] Reconnection attempt ${attemptNumber}...`);...`
  - Real-time system logging (WebSocket/Socket.IO events)
  - ESLint comment: `// eslint-disable-next-line no-console -- Real-time event logging for socket debugging`

---

## Category E: QUESTIONABLE (MANUAL REVIEW) - 23 statements

Statements requiring deeper investigation or context to determine if they should be kept or deleted.

### app/components/boundaries/AppErrorBoundary.tsx
**Lines:** 83

**Line 83:**
```typescript
console.log('📊 [ERROR REPORTING] Error would be reported to monitoring service:', {
```
- **Reasoning:** Purpose unclear - needs manual review
- **Action:** INVESTIGATE - Review code context to determine purpose

### app/hooks/useFieldResolver.ts
**Lines:** 313, 314, 315

**Line 313:**
```typescript
console.group(`${prefix} - Tube ID: ${tube.id}`);
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 314:**
```typescript
console.table(results);
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 315:**
```typescript
console.groupEnd();
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

### app/services/SessionManager.ts
**Lines:** 104, 381

**Line 104:**
```typescript
console.log('⏱️ Session timed out due to inactivity');
```
- **Reasoning:** Purpose unclear - needs manual review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 381:**
```typescript
console.log('⏱️ [Inactivity Checker] Session timed out due to inactivity');
```
- **Reasoning:** Purpose unclear - needs manual review
- **Action:** INVESTIGATE - Review code context to determine purpose

### infrastructure/api/responseTransformers.ts
**Lines:** 199

**Line 199:**
```typescript
console.log(`📅 [DATE FIELDS] ${typeName || 'Unknown'} detected fields:`, dateFields);
```
- **Reasoning:** Purpose unclear - needs manual review
- **Action:** INVESTIGATE - Review code context to determine purpose

### infrastructure/cache/CacheWarmingService.ts
**Lines:** 276, 301

**Line 276:**
```typescript
console.debug('Adjacent location prefetch failed:', error);
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 301:**
```typescript
console.debug('Recent search prefetch failed:', error);
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

### infrastructure/cache/performanceMonitoring.ts
**Lines:** 269, 276

**Line 269:**
```typescript
console.group('🏃‍♂️ Cache Performance Metrics');
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 276:**
```typescript
console.groupEnd();
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

### infrastructure/configuration/tubeFieldConfiguration.ts
**Lines:** 468, 469, 470, 475

**Line 468:**
```typescript
console.group('Tube Field Configuration Analysis');
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 469:**
```typescript
console.table(analysis);
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 470:**
```typescript
console.log('Sections:', TUBE_FIELD_SECTIONS.map(s => ({
```
- **Reasoning:** Purpose unclear - needs manual review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 475:**
```typescript
console.groupEnd();
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

### infrastructure/connection/networkMonitor.ts
**Lines:** 202

**Line 202:**
```typescript
console.debug('🔍 [NetworkMonitor] Server ping failed:', error);
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

### shared/ui/components/boundaries/ErrorBoundary.tsx
**Lines:** 127, 130, 193, 197

**Line 127:**
```typescript
console.group(`🚨 Error Boundary: ${name || 'Unknown'}`);
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 130:**
```typescript
console.groupEnd();
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 193:**
```typescript
console.group(`🚨 Error Boundary Caught Error: ${this.props.name || 'Unknown'}`);
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 197:**
```typescript
console.groupEnd();
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

### shared/ui/components/boundaries/SuspenseBoundary.tsx
**Lines:** 123, 126

**Line 123:**
```typescript
console.group(`🚨 Lazy Loading Error: ${name || 'Unknown Component'}`);
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

**Line 126:**
```typescript
console.groupEnd();
```
- **Reasoning:** Non-standard console usage - needs review
- **Action:** INVESTIGATE - Review code context to determine purpose

### shared/utils/lazy/lazyComponentUtils.tsx
**Lines:** 110

**Line 110:**
```typescript
console.log(`Lazy loaded ${componentName} in ${loadTime.toFixed(2)}ms (attempt ${attempt})`);
```
- **Reasoning:** Purpose unclear - needs manual review
- **Action:** INVESTIGATE - Review code context to determine purpose

---

## Recommendations

### Immediate Actions

1. **Delete 1 debug statements** (Category A)
2. **Add ESLint disable comments to 153 error logs** (Category B)
3. **Add ESLint disable comments to 50 warnings** (Category C)
4. **Add ESLint disable comments to 91 info logs** (Category D)
5. **Manually review 23 questionable statements** (Category E)

### ESLint Comment Format

Use specific, descriptive comments explaining WHY the console statement is needed:

```typescript
// Good - Specific reason
// eslint-disable-next-line no-console -- Real-time event logging for socket debugging
console.log('[Socket] Connected:', socketId);

// Bad - Generic excuse
// eslint-disable-next-line no-console
console.log('[Socket] Connected:', socketId);
```

### Long-term Strategy

1. **Implement proper logging service** - Replace console.* with structured logging
2. **Use environment-aware logging** - Only log in development/staging
3. **Integrate error monitoring** - Send production errors to Sentry/LogRocket
4. **Create logging guidelines** - Document when to use each log level

---

## Summary Statistics

- **Total Analyzed:** 318
- **console.error:** 153
- **console.warn:** 50
- **console.log:** 115

**Analysis completed:** 2025-11-11 13:57:34
