/**
 * User Repository Interface
 *
 * Data access contract for user accounts and authentication.
 */

import type { User } from '@domain/entities/User';
import type { UserSearchCriteria } from '@domain/types/repository/searchCriteriaTypes';

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

  isAdmin(apiKey: string): Promise<boolean>;
  countByRole(role: 'system_admin' | 'lab_admin' | 'user'): Promise<number>;
  isEmpty(): Promise<boolean>;
  findByStatus(status: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended'): Promise<User[]>;

  // LAB-SCOPED OPERATIONS

  findByLabId(labId: string): Promise<User[]>;
  findByStatusInLab(status: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended', labId: string): Promise<User[]>;
  countByRoleInLab(role: 'system_admin' | 'lab_admin' | 'user', labId: string): Promise<number>;

  // USER MANAGEMENT OPERATIONS

  updateRole(userId: string, newRole: 'system_admin' | 'lab_admin' | 'user'): Promise<boolean>;

  // BUSINESS QUERIES

  count(): Promise<number>;
  search(criteria: UserSearchCriteria): Promise<User[]>;

  // MAINTENANCE OPERATIONS

  isHealthy(): Promise<boolean>;
}
