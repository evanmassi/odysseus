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

