/**
 * Repository Statistics and Summary Types
 *
 * Centralized stats and summary interfaces for all repositories.
 */

export interface TubeRepositoryStats {
  totalTubes: number;
  tubesByTank: Record<string, number>;
  tubesByResearcher: Record<string, number>;
  averageTubesPerBox: number;
  oldestTube?: {
    id: string;
    createdAt: Date;
  };
  newestTube?: {
    id: string;
    createdAt: Date;
  };
  completionRate: number;
  expirationRate: number;
}

export interface ResearcherUsageStats {
  researcherId: string;
  researcherName: string;
  isActive: boolean;
  tubeCount: number;
  lastTubeCreated?: Date;
  activeTubes: number;
  expiredTubes: number;
}

export interface ResearcherRepositoryStats {
  totalResearchers: number;
  activeResearchers: number;
  inactiveResearchers: number;
  researchersWithTubes: number;
  researchersWithoutTubes: number;
  averageTubesPerResearcher: number;
  mostProductiveResearcher?: {
    id: string;
    name: string;
    tubeCount: number;
  };
  oldestResearcher?: {
    id: string;
    name: string;
    createdAt: Date;
  };
  newestResearcher?: {
    id: string;
    name: string;
    createdAt: Date;
  };
}

export interface UserActivitySummary {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastActivity: Date;
  totalSessions: number;
  failedLoginAttempts: number;
  isCurrentlyLocked: boolean;
  daysSinceCreation: number;
  daysSinceLastActivity: number;
}

export interface UserRepositoryStats {
  totalUsers: number;
  adminCount: number;
  regularUserCount: number;
  activeUsers: {
    last24Hours: number;
    lastWeek: number;
    lastMonth: number;
  };
  inactiveUsers: number;
  lockedUsers: number;
  averageSessionsPerUser: number;
  oldestUser?: {
    id: string;
    username: string;
    createdAt: Date;
  };
  mostRecentUser?: {
    id: string;
    username: string;
    createdAt: Date;
  };
  mostActiveUser?: {
    id: string;
    username: string;
    lastActivity: Date;
  };
}

export interface EquipmentSummary {
  totalTanks: number;
  totalRacks: number;
  totalBoxes: number;
  totalPositions: number;
  tankSummaries: Array<{
    tankId: string;
    tankName: string;
    rackCount: number;
    boxCount: number;
    positionCount: number;
    isActive: boolean;
  }>;
}

export interface CapacityInfo {
  totalCapacity: number;
  availableCapacity: number;
  utilizationRate: number;
  capacityByTank: Array<{
    tankId: string;
    tankName: string;
    capacity: number;
    used: number;
    available: number;
    utilizationRate: number;
  }>;
}

export interface ConfigurationRepositoryStats {
  currentVersion: number;
  totalHistoryEntries: number;
  totalSnapshots: number;
  configurationSize: number;
  lastUpdated: Date;
  averageUpdateFrequency: number;
  oldestSnapshot?: Date;
  newestSnapshot?: Date;
}
