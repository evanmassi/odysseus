/**
 * User Repository Interface
 *
 * Data access contract for user accounts and authentication.
 */

import type { User } from '@domain/entities/User';

export interface UserRepository {

  /** Lab-scoped lookup — the default. Returns null for a user in another lab. */
  findById(id: string, labId: string): Promise<User | null>;

  /** Cross-lab lookup for identity/auth and system-admin paths only. Prefer findById. */
  findByIdAnyLab(id: string): Promise<User | null>;

  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(token: string): Promise<User | null>;
  findByPasswordResetToken(token: string): Promise<User | null>;
  findByResearcherId(researcherId: string): Promise<User | null>;
  findByPersonId(personId: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findAllWithLastActivity(): Promise<User[]>;

  /**
   * Returns only found users — no errors for missing IDs.
   * When `labId` is provided, results are scoped to that lab; omit for
   * cross-lab (system-admin) access.
   */
  findByIds(ids: string[], labId?: string): Promise<User[]>;

  /** Create vs update determined by existence. */
  save(user: User): Promise<void>;

  delete(id: string, labId: string): Promise<boolean>;

  usernameExists(username: string): Promise<boolean>;
  emailExists(email: string): Promise<boolean>;

  // ROLE-BASED OPERATIONS

  countByRole(role: 'system_admin' | 'lab_admin' | 'user'): Promise<number>;
  isEmpty(): Promise<boolean>;

  // LAB-SCOPED OPERATIONS

  findByLabId(labId: string): Promise<User[]>;
  findByStatusInLab(status: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended', labId: string): Promise<User[]>;
  countByRoleInLab(role: 'system_admin' | 'lab_admin' | 'user', labId: string): Promise<number>;

  isHealthy(): Promise<boolean>;
}
