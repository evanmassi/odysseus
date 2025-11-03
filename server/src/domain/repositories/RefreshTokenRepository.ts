import { RefreshToken } from '@domain/entities/RefreshToken';

/**
 * RefreshToken Repository Interface
 * Defines the contract for refresh token data access operations
 * Infrastructure layer will implement this interface
 */
export interface RefreshTokenRepository {
  
  // BASIC CRUD OPERATIONS

  /**
   * Find refresh token by unique identifier
   */
  findById(id: string): Promise<RefreshToken | null>;
  
  /**
   * Find refresh token by token value (primary lookup for validation)
   */
  findByToken(token: string): Promise<RefreshToken | null>;
  
  /**
   * Find all valid (non-revoked, non-expired) refresh tokens for a user
   */
  findValidTokensByUserId(userId: string): Promise<RefreshToken[]>;
  
  /**
   * Find all refresh tokens for a user (including revoked/expired)
   */
  findAllTokensByUserId(userId: string): Promise<RefreshToken[]>;
  
  /**
   * Save refresh token (create or update)
   */
  save(refreshToken: RefreshToken): Promise<void>;
  
  /**
   * Delete refresh token by ID
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Delete refresh token by token value
   */
  deleteByToken(token: string): Promise<boolean>;

  // OAUTH 2.0 SECURITY OPERATIONS

  /**
   * Revoke single refresh token (mark as revoked)
   */
  revoke(tokenId: string): Promise<boolean>;

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  revokeAllForUser(userId: string): Promise<number>;

  /**
   * Revoke all expired refresh tokens (cleanup operation)
   */
  revokeExpiredTokens(): Promise<number>;

  /**
   * Record token usage (update lastUsedAt)
   */
  recordTokenUsage(tokenId: string): Promise<boolean>;

  // SECURITY & MONITORING

  /**
   * Count active refresh tokens for a user
   * Used for device limit enforcement
   */
  countActiveTokensForUser(userId: string): Promise<number>;

  /**
   * Find recently used tokens for suspicious activity detection
   */
  findRecentlyUsedTokens(userId: string, minutesAgo: number): Promise<RefreshToken[]>;

  /**
   * Find tokens by IP address for security analysis
   */
  findTokensByIpAddress(ipAddress: string): Promise<RefreshToken[]>;

  /**
   * Find tokens created within time range
   */
  findTokensCreatedBetween(startDate: Date, endDate: Date): Promise<RefreshToken[]>;

  // MAINTENANCE OPERATIONS

  /**
   * Clean up expired tokens (permanent deletion)
   * Should be called periodically by maintenance job
   */
  cleanupExpiredTokens(olderThanDays?: number): Promise<number>;

  /**
   * Get refresh token statistics for monitoring
   */
  getTokenStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
    averageLifespanDays: number;
  }>;

  // BATCH OPERATIONS

  /**
   * Batch revoke tokens by IDs
   */
  batchRevoke(tokenIds: string[]): Promise<number>;

  /**
   * Batch delete tokens by IDs
   */
  batchDelete(tokenIds: string[]): Promise<number>;

  // TRANSACTION SUPPORT

  /**
   * Execute multiple operations in a transaction
   * Used for atomic token rotation
   */
  executeInTransaction<T>(operation: (repository: RefreshTokenRepository) => Promise<T>): Promise<T>;
}
