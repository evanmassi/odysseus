/**
 * Shared Network State
 *
 * Zero-dependency state container that bridges NetworkMonitor and httpClient.
 */

// Falls back to navigator.onLine until NetworkMonitor verifies with a server ping
let _isOffline: boolean = typeof navigator !== 'undefined' ? !navigator.onLine : false;
let _initialized: boolean = false;

export function isOffline(): boolean {
  if (!_initialized) {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  }
  return _isOffline;
}

export function setOffline(offline: boolean): void {
  _isOffline = offline;
  _initialized = true;
}

// Only used for testing
export function resetNetworkState(): void {
  _isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  _initialized = false;
}
