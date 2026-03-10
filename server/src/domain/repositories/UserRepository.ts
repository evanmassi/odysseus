/**
 * User Repository Interface
 *
 * Data access contract for user accounts, authentication, and security operations.
 */

import { User } from '@domain/entities/User';
import type { UserSearchCriteria } from '@domain/types/repository/searchCriteria';
import type { UserRepositoryStats } from '@domain/types/repository/stats';

export interface UserRepository {

  // BASIC CRUD OPERATIONS

  findById(id: string): Promise<User | null>;

  /** Primary authentication lookup. */
  findByApiKey(apiKey: string): Promise<User | null>;

  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(token: string): Promise<User | null>;
  findByPasswordResetToken(token: string): Promise<User | null>;
  findByResearcherId(researcherId: string): Promise<User | null>;
  findByPersonId(personId: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findAllWithLastActivity(): Promise<User[]>;

  /** Returns only found users — no errors for missing IDs. */
  findByIds(ids: string[]): Promise<User[]>;

  /** Create vs update determined by existence. */
  save(user: User): Promise<void>;

  delete(id: string): Promise<boolean>;

  // AUTHENTICATION OPERATIONS

  apiKeyExists(apiKey: string): Promise<boolean>;
  usernameExists(username: string): Promise<boolean>;
  emailExists(email: string): Promise<boolean>;

  // ROLE-BASED OPERATIONS

  findAdmins(): Promise<User[]>;
  findRegularUsers(): Promise<User[]>;
  findByRole(role: 'system_admin' | 'lab_admin' | 'user'): Promise<User[]>;
  isAdmin(apiKey: string): Promise<boolean>;
  countByRole(role: 'system_admin' | 'lab_admin' | 'user'): Promise<number>;
  isEmpty(): Promise<boolean>;
  findByStatus(status: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended'): Promise<User[]>;

  // LAB-SCOPED OPERATIONS

  findByLabId(labId: string): Promise<User[]>;
  findByStatusInLab(status: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended', labId: string): Promise<User[]>;
  countByRoleInLab(role: 'system_admin' | 'lab_admin' | 'user', labId: string): Promise<number>;
  isLabEmpty(labId: string): Promise<boolean>;

  // USER MANAGEMENT OPERATIONS

  updateRole(userId: string, newRole: 'system_admin' | 'lab_admin' | 'user'): Promise<boolean>;
  findByCreationDateRange(startDate: Date, endDate: Date): Promise<User[]>;

  // SECURITY OPERATIONS

  recordFailedLogin(apiKey: string): Promise<void>;
  resetFailedLogins(apiKey: string): Promise<void>;
  lockUser(apiKey: string, lockDurationMinutes: number): Promise<void>;
  isLocked(apiKey: string): Promise<boolean>;
  unlockUser(apiKey: string): Promise<void>;
  findLocked(): Promise<User[]>;

  // BUSINESS QUERIES

  count(): Promise<number>;
  search(criteria: UserSearchCriteria): Promise<User[]>;

  // REPORTING

  getStats(): Promise<UserRepositoryStats>;

  // MAINTENANCE OPERATIONS

  isHealthy(): Promise<boolean>;
}
