/**
 * Chunk Error Recovery
 *
 * Handles stale chunk errors that occur after deployments when the browser
 * has cached an old index.html referencing chunks that no longer exist.
 */

import { logger } from '@shared/infrastructure/logger';

const RELOAD_KEY = 'chunk-error-reload';

function handleChunkError(event: Event): void {
  // Prevent the error from propagating
  event.preventDefault();

  // Check if we already attempted a reload to avoid infinite loops
  if (sessionStorage.getItem(RELOAD_KEY)) {
    // Already tried reloading - let the error boundary handle it
    logger.error('Chunk reload already attempted, not retrying');
    return;
  }

  logger.warn('Chunk load failed, reloading to get fresh assets');
  sessionStorage.setItem(RELOAD_KEY, 'true');
  window.location.reload();
}

function clearReloadFlag(): void {
  // Clear the flag on successful page load
  sessionStorage.removeItem(RELOAD_KEY);
}

export function initChunkErrorRecovery(): void {
  // Listen for Vite's preload error event
  window.addEventListener('vite:preloadError', handleChunkError);

  // Clear the reload flag once the page loads successfully
  // This allows future chunk errors to trigger a reload
  clearReloadFlag();
}
