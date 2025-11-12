/**
 * Configuration Reset Utility
 * 
 * Clears cached configuration to force rebuild with correct tank IDs
 * Run this once to fix tank ID mismatches after data migration
 */

import { env } from '@shared/config';

export function resetConfiguration(): void {
  // eslint-disable-next-line no-console -- Info logging for operational visibility
  console.log('🔧 RESET: Clearing cached configuration...');
  
  try {
    // Clear all possible Zustand persist keys
    const keysToRemove = [
      'odysseus-configuration-storage',
      'configuration-storage',
      'odysseus-configuration-store',
      'configuration-store'
    ];
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        // eslint-disable-next-line no-console -- Info logging for operational visibility
        console.log(`🔧 RESET: Cleared ${key}`);
      }
    });
    
    // Also clear any keys that might contain configuration data
    Object.keys(localStorage).forEach(key => {
      if (key.includes('configuration') || key.includes('lab-config') || key.includes('odysseus-config')) {
        localStorage.removeItem(key);
        // eslint-disable-next-line no-console -- Info logging for operational visibility
        console.log(`🔧 RESET: Cleared ${key}`);
      }
    });
    
    // eslint-disable-next-line no-console -- Info logging for operational visibility
    console.log('RESET: Configuration cache cleared. Please refresh the page.');
    
  } catch (error) {
    // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
    console.error('❌ RESET: Failed to clear configuration:', error);
  }
}

// Auto-run on import during development
if (env.isDev()) {
  // Uncomment the next line to auto-reset on page load during development
  // resetConfiguration();
}
