/**
 * Shared Network State
 *
 * NetworkMonitor writes to this state based on actual server pings.
 * HTTP client reads from this state to block writes when offline.
 *
 * This module has NO dependencies to prevent circular imports.
 * It's a simple state container that bridges NetworkMonitor and httpClient.
 */

/**
 * Internal state - tracks whether the app can reach the server.
 * Default: use navigator.onLine as initial guess until NetworkMonitor verifies.
 */
let _isOffline: boolean = typeof navigator !== 'undefined' ? !navigator.onLine : false;

/**
 * Flag to track if NetworkMonitor has initialized.
 * Before initialization, we fall back to navigator.onLine.
 */
let _initialized: boolean = false;

/**
 * Check if the app is currently offline (cannot reach server).
 *
 * This is the primary function for checking network status.
 * Used by httpClient to block write operations when offline.
 *
 * @returns true if offline, false if online
 */
export function isOffline(): boolean {
  // If NetworkMonitor hasn't initialized yet, use browser API as fallback
  if (!_initialized) {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  }
  return _isOffline;
}

/**
 * Check if the app is currently online (can reach server).
 * Convenience wrapper around isOffline().
 *
 * @returns true if online, false if offline
 */
export function isOnline(): boolean {
  return !isOffline();
}

/**
 * Update the offline state.
 * Called by NetworkMonitor when connectivity changes.
 *
 * @param offline - true if offline, false if online
 */
export function setOffline(offline: boolean): void {
  _isOffline = offline;
  _initialized = true;
}

/**
 * Mark the network state as initialized.
 * Called by NetworkMonitor after first connectivity check.
 */
export function markInitialized(): void {
  _initialized = true;
}

/**
 * Check if NetworkMonitor has initialized the state.
 * Useful for debugging and testing.
 */
export function isInitialized(): boolean {
  return _initialized;
}

/**
 * Reset state to defaults.
 * Only used for testing.
 */
export function resetNetworkState(): void {
  _isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  _initialized = false;
}
