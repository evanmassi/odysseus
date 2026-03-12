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
