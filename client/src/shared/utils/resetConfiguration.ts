/**
 * Configuration Reset Utility
 *
 * Clears cached configuration to force rebuild with correct tank IDs
 * Run this once to fix tank ID mismatches after data migration
 */

import { env } from '@shared/config';
import { logger } from '@shared/infrastructure/logger';

export function resetConfiguration(): void {
  logger.info('Clearing cached configuration');

  try {
    // Clear all possible Zustand persist keys
    const keysToRemove = [
      'odysseus-configuration-storage',
      'configuration-storage',
      'odysseus-configuration-store',
      'configuration-store',
    ];

    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        logger.info(`Cleared ${key}`);
      }
    });

    // Also clear any keys that might contain configuration data
    Object.keys(localStorage).forEach(key => {
      if (
        key.includes('configuration') ||
        key.includes('lab-config') ||
        key.includes('odysseus-config')
      ) {
        localStorage.removeItem(key);
        logger.info(`Cleared ${key}`);
      }
    });

    logger.info('Configuration cache cleared. Please refresh the page.');
  } catch (error) {
    logger.error('Failed to clear configuration', { error });
  }
}

// Auto-run on import during development
if (env.isDev()) {
  // Uncomment the next line to auto-reset on page load during development
  // resetConfiguration();
}
