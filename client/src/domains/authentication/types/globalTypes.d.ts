/**
 * Global Type Augmentations
 *
 * Window interface augmentation for the auth session debug tool.
 */

import type { AuthDebugInfo } from './debugTypes';

declare global {
  interface Window {
    /** Access in browser console: `window.__ODYSSEUS_SESSION_DEBUG__()` */
    __ODYSSEUS_SESSION_DEBUG__?: () => AuthDebugInfo | null;
  }

  // eslint-disable-next-line no-var
  var __ODYSSEUS_SESSION_DEBUG__: (() => AuthDebugInfo | null) | undefined;
}

export {};
