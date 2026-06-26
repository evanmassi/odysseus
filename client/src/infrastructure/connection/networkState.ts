/**
 * Shared Network State
 *
 * Zero-dependency state container that bridges NetworkMonitor and httpClient.
 */

// Falls back to navigator.onLine until NetworkMonitor verifies with a server ping
function browserOffline(): boolean {
  return typeof navigator !== 'undefined' ? !navigator.onLine : false;
}

let _isOffline = browserOffline();
let _initialized = false;

export function isOffline(): boolean {
  if (!_initialized) {
    return browserOffline();
  }
  return _isOffline;
}

export function setOffline(offline: boolean): void {
  _isOffline = offline;
  _initialized = true;
}

export function resetNetworkState(): void {
  _isOffline = browserOffline();
  _initialized = false;
}
