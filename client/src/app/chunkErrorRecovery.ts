/**
 * Chunk Error Recovery
 *
 * Handles stale chunk errors that occur after deployments when the browser
 * has cached an old index.html referencing chunks that no longer exist.
 *
 * Strategy:
 * - On chunk load failure, reload the page once to get fresh assets
 * - Use sessionStorage to prevent infinite reload loops
 * - Only clear the reload flag after app successfully initializes
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

/**
 * Clear the reload flag after successful app initialization.
 * Call this from the bootstrap service after the app is fully loaded.
 */
export function clearChunkReloadFlag(): void {
  sessionStorage.removeItem(RELOAD_KEY);
}

export function initChunkErrorRecovery(): void {
  // Listen for Vite's preload error event
  window.addEventListener('vite:preloadError', handleChunkError);

  // Note: The reload flag is cleared by clearChunkReloadFlag() after successful bootstrap,
  // not here. This prevents infinite reloads if the HTML is still stale after reload.
}
