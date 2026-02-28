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
   * Find user by linked person ID
   */
  findByPersonId(personId: string): Promise<User | null>;

  /**
   * Find all users in the system
   */
  findAll(): Promise<User[]>;

  findAllWithLastActivity(): Promise<User[]>;

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

  findAdmins(): Promise<User[]>;
  findRegularUsers(): Promise<User[]>;
  findByRole(role: 'system_admin' | 'lab_admin' | 'user'): Promise<User[]>;
  isAdmin(apiKey: string): Promise<boolean>;
  countByRole(role: 'system_admin' | 'lab_admin' | 'user'): Promise<number>;
  isEmpty(): Promise<boolean>;
  findByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<User[]>;

  // LAB-SCOPED OPERATIONS

  findByLabId(labId: string): Promise<User[]>;
  findByStatusInLab(status: 'pending' | 'approved' | 'rejected', labId: string): Promise<User[]>;
  countByRoleInLab(role: 'system_admin' | 'lab_admin' | 'user', labId: string): Promise<number>;
  isLabEmpty(labId: string): Promise<boolean>;

  // USER MANAGEMENT OPERATIONS

  /**
   * Update user role (admin operation)
   */
  updateRole(userId: string, newRole: 'system_admin' | 'lab_admin' | 'user'): Promise<boolean>;
  
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
