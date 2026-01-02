import { User } from '@domain/entities/User';
import type { UserSearchCriteria } from '@domain/types/repository/SearchCriteria';
import type { UserRepositoryStats } from '@domain/types/repository/Stats';

/**
 * User Repository Interface
 * Defines the contract for user data access operations
 * Infrastructure layer will implement this interface
 */
export interface UserRepository {
  
  // BASIC CRUD OPERATIONS

  /**
   * Find user by unique identifier
   */
  findById(id: string): Promise<User | null>;
  
  /**
   * Find user by API key (primary authentication method)
   */
  findByApiKey(apiKey: string): Promise<User | null>;
  
  /**
   * Find user by username
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by email verification token
   */
  findByVerificationToken(token: string): Promise<User | null>;

  /**
   * Find user by password reset token
   */
  findByPasswordResetToken(token: string): Promise<User | null>;

  /**
   * Find user by linked researcher ID
   */
  findByResearcherId(researcherId: string): Promise<User | null>;

  /**
   * Find all users in the system
   */
  findAll(): Promise<User[]>;

  /**
   * Find multiple users by their IDs
   * Returns only found users (no errors for missing IDs)
   */
  findByIds(ids: string[]): Promise<User[]>;

  /**
   * Save a user (create or update)
   * Repository determines if it's create vs update based on existence
   */
  save(user: User): Promise<void>;
  
  /**
   * Delete a user by ID
   * Returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;
  
  // AUTHENTICATION OPERATIONS

  /**
   * Check if API key exists (for uniqueness validation)
   */
  apiKeyExists(apiKey: string): Promise<boolean>;
  
  /**
   * Check if username exists (for uniqueness validation)
   */
  usernameExists(username: string): Promise<boolean>;

  /**
   * Check if email exists (for uniqueness validation)
   */
  emailExists(email: string): Promise<boolean>;

  // OAuth 2.0 Note: Activity tracking methods removed
  // User activity now tracked implicitly through token refresh patterns
  
  // ROLE-BASED OPERATIONS

  /**
   * Find all admin users
   */
  findAdmins(): Promise<User[]>;
  
  /**
   * Find all regular users (non-admin)
   */
  findRegularUsers(): Promise<User[]>;
  
  /**
   * Find users by role
   */
  findByRole(role: 'admin' | 'user'): Promise<User[]>;
  
  /**
   * Check if user has admin role (by API key)
   */
  isAdmin(apiKey: string): Promise<boolean>;
  
  /**
   * Count users by role
   */
  countByRole(role: 'admin' | 'user'): Promise<number>;
  
  /**
   * Check if this would be the first user (for auto-admin assignment)
   */
  isEmpty(): Promise<boolean>;

  /**
   * Find users by approval status
   */
  findByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<User[]>;

  // USER MANAGEMENT OPERATIONS

  /**
   * Update user role (admin operation)
   */
  updateRole(userId: string, newRole: 'admin' | 'user'): Promise<boolean>;
  
  /**
   * Find users created within date range
   */
  findByCreationDateRange(startDate: Date, endDate: Date): Promise<User[]>;
  
  // SECURITY OPERATIONS

  /**
   * Record failed login attempt (for security)
   */
  recordFailedLogin(apiKey: string): Promise<void>;
  
  /**
   * Reset failed login count
   */
  resetFailedLogins(apiKey: string): Promise<void>;
  
  /**
   * Lock user account for specified duration
   */
  lockUser(apiKey: string, lockDurationMinutes: number): Promise<void>;
  
  /**
   * Check if user is currently locked
   */
  isLocked(apiKey: string): Promise<boolean>;
  
  /**
   * Unlock user account
   */
  unlockUser(apiKey: string): Promise<void>;
  
  /**
   * Find locked users
   */
  findLocked(): Promise<User[]>;
  
  // BUSINESS QUERIES

  /**
   * Count total number of users
   */
  count(): Promise<number>;
  
  /**
   * Search users by criteria
   */
  search(criteria: UserSearchCriteria): Promise<User[]>;
  
  // REPORTING

  /**
   * Get system user statistics
   */
  getStats(): Promise<UserRepositoryStats>;
  
  // MAINTENANCE OPERATIONS

  /**
   * Check repository health/connectivity
   */
  isHealthy(): Promise<boolean>;
  
  /**
   * Clean up old/expired session data
   */
  cleanupExpiredSessions(): Promise<number>; // Returns count of cleaned up sessions
}
