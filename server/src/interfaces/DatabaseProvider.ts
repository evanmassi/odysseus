// Database Provider Interface - ensures identical API across all database implementations
// Data interfaces replaced by domain entities:
// - TubeData -> Tube entity
// - UserData -> User entity
// - ResearcherData -> Researcher entity

// Import from shared schemas
import { type TubeData as SharedTubeData } from '@odysseus/shared-schemas';

// Re-export for backward compatibility
export type TubeData = SharedTubeData;

export type UserData = {
  id: string;
  username: string;
  apiKey: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastActivity: string;
  __metadata?: Record<string, unknown>;
};

export type ResearcherData = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  __metadata?: Record<string, unknown>;
};

export interface SyncMetadata {
  lastSyncedAt: string;
  checksum: string;
}

export interface DatabaseTransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Record<string, unknown>;
}

export interface DatabaseMetrics {
  totalTubes: number;
  totalResearchers: number;
  totalUsers: number;
  databaseSize: number;
  queryPerformance: {
    avgResponseTime: number;
    totalQueries: number;
    slowQueries: number;
  };
}

export interface AuditEntry {
  id: string;
  entityType: 'tube' | 'researcher' | 'user';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface BulkUpdateResult {
  success: boolean;
  updated: number;
  total: number;
  updatedTubes?: TubeData[];
  error?: string;
}

/**
 * Core database interface that all providers must implement
 * This ensures 100% API compatibility between JSON and SQLite implementations
 */
export interface DatabaseProvider {
  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;
  isConnected(): boolean;
  
  // Tube Operations (identical to existing API)
  getAllTubes(): TubeData[];
  getTubesByRackAndBox(rackId: string, boxName: string): TubeData[];
  getTubeById(id: string): TubeData | null;
  createTube(tube: Omit<TubeData, 'createdAt' | 'updatedAt'>): TubeData;
  updateTube(id: string, updates: Partial<TubeData>): TubeData | null;
  deleteTube(id: string): boolean;
  
  // Researcher Operations (identical to existing API)
  getAllResearchers(): ResearcherData[];
  addResearcher(name: string): ResearcherData;
  updateResearchers(researchers: ResearcherData[]): void;
  
  // User Operations (identical to existing API)
  getUserByApiKey(apiKey: string): UserData | null;
  createUser(username: string, apiKey: string): UserData;
  updateUserActivity(apiKey: string): void;
  
  // Admin User Management (new, additive only)
  getUserCount?(): number;
  getAllUsers?(): UserData[];
  isUserAdmin?(apiKey: string): boolean;
  updateUserRole?(userId: string, role: 'admin' | 'user'): boolean;
  recordFailedLogin?(apiKey: string): void;
  resetFailedLogins?(apiKey: string): void;
  lockUser?(apiKey: string, lockDurationMinutes: number): void;
  isUserLocked?(apiKey: string): boolean;
  deleteUser?(userId: string): boolean;
  
  // Additional Features
  beginTransaction?(): Promise<DatabaseTransaction>;
  getMetrics?(): Promise<DatabaseMetrics>;
  getAuditTrail?(entityType: string, entityId: string): Promise<AuditEntry[]>;
  searchTubes?(query: string, options?: QueryOptions): Promise<TubeData[]>;
  bulkUpdate?(updates: Array<{id: string, updates: Partial<TubeData>}>): Promise<BulkUpdateResult>;
  backup?(path: string): Promise<boolean>;
  restore?(path: string): Promise<boolean>;
  
  // Configuration methods removed - use security config or SQLite tables directly
}

export interface MigrationResult {
  success: boolean;
  message?: string;
  error?: string;
  errors?: string[];
  tubesMigrated?: number;
  researchersMigrated?: number;
  usersMigrated?: number;
  duration?: number;
}

export interface VerificationResult {
  success: boolean;
  tubesMatch: boolean;
  researchersMatch: boolean;
  usersMatch: boolean;
  details: Record<string, unknown>;
}
