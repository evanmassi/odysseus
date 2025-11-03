// Feature flag system for gradual rollout of new features
export interface FeatureFlags {
  CLOUD_SYNC: boolean;
  REAL_TIME_UPDATES: boolean;
  CONFLICT_RESOLUTION: boolean;
  USER_PRESENCE: boolean;
  OFFLINE_QUEUE: boolean;

}

// Default flags - gradual rollout
export const FEATURES: FeatureFlags = {
  CLOUD_SYNC: false,         // Enable when Firebase is integrated
  REAL_TIME_UPDATES: false,  // Enable when real-time sync is ready
  CONFLICT_RESOLUTION: false,// Enable when conflict UI is built
  USER_PRESENCE: false,      // Enable when presence system is ready
  OFFLINE_QUEUE: false       // Enable when queue system is implemented
};

// Helper to check if features are enabled
export const isSyncEnabled = () => FEATURES.CLOUD_SYNC;
export const isRealTimeEnabled = () => FEATURES.REAL_TIME_UPDATES;
export const isConflictResolutionEnabled = () => FEATURES.CONFLICT_RESOLUTION;
