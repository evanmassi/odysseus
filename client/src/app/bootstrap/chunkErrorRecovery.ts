/**
 * Chunk Error Recovery
 *
 * Handles stale chunk errors after deployments by reloading once to get fresh assets.
 */

import { logger } from '@infra/logger';

const RELOAD_KEY = 'chunk-error-reload';

function handleChunkError(event: Event): void {
  event.preventDefault();

  if (sessionStorage.getItem(RELOAD_KEY)) {
    logger.error('Chunk reload already attempted, not retrying');
    return;
  }

  logger.warn('Chunk load failed, reloading to get fresh assets');
  sessionStorage.setItem(RELOAD_KEY, 'true');
  window.location.reload();
}

/** Call from bootstrap service after the app is fully loaded. */
export function clearChunkReloadFlag(): void {
  sessionStorage.removeItem(RELOAD_KEY);
}

export function initChunkErrorRecovery(): void {
  window.addEventListener('vite:preloadError', handleChunkError);

  // Note: The reload flag is cleared by clearChunkReloadFlag() after successful bootstrap,
  // not here. This prevents infinite reloads if the HTML is still stale after reload.
}
