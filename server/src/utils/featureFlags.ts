import { logger } from './logger';

interface FeatureFlag {
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  enabledAt?: string;
  disabledAt?: string;
}

interface FeatureFlags {
  // Database features
  ENABLE_AUDIT_TRAIL: FeatureFlag;
  
  // Performance features
  ENABLE_QUERY_CACHING: FeatureFlag;
  ENABLE_PERFORMANCE_MONITORING: FeatureFlag;
  
  // Advanced features
  ENABLE_ADVANCED_SEARCH: FeatureFlag;
  ENABLE_ANALYTICS_DASHBOARD: FeatureFlag;
  ENABLE_BULK_OPERATIONS: FeatureFlag;
  
  // Existing features
  CLOUD_SYNC: FeatureFlag;
}

class FeatureFlagManager {
  // Loose coupling: accepts any database that implements getFeatureFlag/setFeatureFlag
  private db: any;

  constructor() {
    // Database reference will be set by the application
  }

  // Dependency injection - intentionally untyped for loose coupling with database layer
  public setDatabase(database: any): void {
    this.db = database;
  }

  public isEnabled(flagName: keyof FeatureFlags): boolean {
    if (!this.db) {
      logger.warn('Database not initialized for feature flags, using defaults');
      return this.getDefaultValue(flagName);
    }

    try {
      const flag = this.db.getFeatureFlag(flagName);
      if (!flag) {
        return this.getDefaultValue(flagName);
      }

      // Check rollout percentage if specified
      if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
        const hash = this.hashString(flagName);
        const percentage = (hash % 100) + 1;
        return flag.enabled && percentage <= flag.rolloutPercentage;
      }

      return flag.enabled;
    } catch (error) {
      logger.error(`Error checking feature flag ${flagName}:`, error);
      return this.getDefaultValue(flagName);
    }
  }

  public enable(flagName: keyof FeatureFlags, rolloutPercentage = 100, updatedBy?: string): void {
    if (!this.db) {
      logger.error('Database not initialized for feature flags');
      return;
    }

    try {
      const description = this.getDefaultDescription(flagName);
      const success = this.db.setFeatureFlag(flagName, true, description, rolloutPercentage, updatedBy);
      
      if (success) {
        logger.info(`Feature flag enabled: ${flagName} (rollout: ${rolloutPercentage}%)`);
      }
    } catch (error) {
      logger.error(`Error enabling feature flag ${flagName}:`, error);
    }
  }

  public disable(flagName: keyof FeatureFlags, updatedBy?: string): void {
    if (!this.db) {
      logger.error('Database not initialized for feature flags');
      return;
    }

    try {
      const description = this.getDefaultDescription(flagName);
      const success = this.db.setFeatureFlag(flagName, false, description, 0, updatedBy);
      
      if (success) {
        logger.info(`Feature flag disabled: ${flagName}`);
      }
    } catch (error) {
      logger.error(`Error disabling feature flag ${flagName}:`, error);
    }
  }

  public getFlag(flagName: keyof FeatureFlags): FeatureFlag | null {
    if (!this.db) {
      logger.warn('Database not initialized for feature flags');
      return null;
    }

    try {
      const flag = this.db.getFeatureFlag(flagName);
      return flag ? {
        enabled: flag.enabled,
        description: flag.description,
        rolloutPercentage: flag.rolloutPercentage
      } : null;
    } catch (error) {
      logger.error(`Error getting feature flag ${flagName}:`, error);
      return null;
    }
  }

  // Returns raw flag data from database - shape depends on database implementation
  public getAllFlags(): any[] {
    if (!this.db) {
      logger.warn('Database not initialized for feature flags');
      return [];
    }

    try {
      return this.db.getAllFeatureFlags();
    } catch (error) {
      logger.error('Error getting all feature flags:', error);
      return [];
    }
  }

  // Emergency rollback - disable all experimental features
  public emergencyRollback(updatedBy?: string): void {
    logger.warn('EMERGENCY ROLLBACK - Disabling all experimental features');

    this.disable('ENABLE_AUDIT_TRAIL', updatedBy);
    this.disable('ENABLE_QUERY_CACHING', updatedBy);
    this.disable('ENABLE_ADVANCED_SEARCH', updatedBy);
    this.disable('ENABLE_ANALYTICS_DASHBOARD', updatedBy);
    this.disable('ENABLE_BULK_OPERATIONS', updatedBy);
    
    logger.warn('Emergency rollback executed - all experimental features disabled');
  }

  // Helper methods
  private getDefaultValue(flagName: keyof FeatureFlags): boolean {
    const defaults = {
      ENABLE_AUDIT_TRAIL: false,
      ENABLE_QUERY_CACHING: true,
      ENABLE_PERFORMANCE_MONITORING: true,
      ENABLE_ADVANCED_SEARCH: true,
      ENABLE_ANALYTICS_DASHBOARD: false,
      ENABLE_BULK_OPERATIONS: true,
      CLOUD_SYNC: false
    };
    return defaults[flagName] || false;
  }

  private getDefaultDescription(flagName: keyof FeatureFlags): string {
    const descriptions = {
      ENABLE_AUDIT_TRAIL: 'Track all database operations for compliance',
      ENABLE_QUERY_CACHING: 'Cache frequently used queries',
      ENABLE_PERFORMANCE_MONITORING: 'Monitor and log query performance',
      ENABLE_ADVANCED_SEARCH: 'Full-text search capabilities',
      ENABLE_ANALYTICS_DASHBOARD: 'Real-time analytics and reporting',
      ENABLE_BULK_OPERATIONS: 'Bulk edit and import/export operations',
      CLOUD_SYNC: 'Cloud synchronization capabilities'
    };
    return descriptions[flagName] || 'Feature flag';
  }

  // Simple hash function for rollout percentage
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

// Export individual flags for easy access
export const FEATURES = {
  get ENABLE_AUDIT_TRAIL() { return featureFlags.isEnabled('ENABLE_AUDIT_TRAIL'); },
  get ENABLE_QUERY_CACHING() { return featureFlags.isEnabled('ENABLE_QUERY_CACHING'); },
  get ENABLE_PERFORMANCE_MONITORING() { return featureFlags.isEnabled('ENABLE_PERFORMANCE_MONITORING'); },
  get ENABLE_ADVANCED_SEARCH() { return featureFlags.isEnabled('ENABLE_ADVANCED_SEARCH'); },
  get ENABLE_ANALYTICS_DASHBOARD() { return featureFlags.isEnabled('ENABLE_ANALYTICS_DASHBOARD'); },
  get ENABLE_BULK_OPERATIONS() { return featureFlags.isEnabled('ENABLE_BULK_OPERATIONS'); },
  get CLOUD_SYNC() { return featureFlags.isEnabled('CLOUD_SYNC'); }
};
