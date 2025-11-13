/**
 * Global Type Augmentations
 *
 * Extends global types for development debugging tools.
 * These are tree-shaken in production builds.
 */

import type { AuthDebugInfo } from '@domains/authentication/types/debug';

declare global {
  /**
   * Window interface augmentation for browser debugging
   */
  interface Window {
    /**
     * Development-only session debugging tool
     * Access in browser console: window.__ODYSSEUS_SESSION_DEBUG__()
     */
    __ODYSSEUS_SESSION_DEBUG__?: () => AuthDebugInfo | null;
  }

  /**
   * GlobalThis augmentation for Node-style debugging
   */
  // eslint-disable-next-line no-var
  var __ODYSSEUS_SESSION_DEBUG__: (() => AuthDebugInfo | null) | undefined;
}

export {};
