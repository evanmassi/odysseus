import type { User } from '@domain/entities/User';

import type { UserStatus } from '@odysseus/shared-schemas';

export interface UserRepository {
  findById(id: string, labId: string): Promise<User | null>;
  findByIdAnyLab(id: string): Promise<User | null>;
  findByUsernameInActiveLabs(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(token: string): Promise<User | null>;
  findByPasswordResetToken(token: string): Promise<User | null>;
  findByResearcherId(researcherId: string): Promise<User | null>;
  findByPersonId(personId: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findAllWithLastActivity(): Promise<User[]>;
  findByIds(ids: string[], labId?: string): Promise<User[]>;
  save(user: User): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;
  usernameExistsInActiveLabs(username: string): Promise<boolean>;
  emailExists(email: string): Promise<boolean>;
  countByRole(role: 'system_admin' | 'lab_admin' | 'user'): Promise<number>;
  isEmpty(): Promise<boolean>;
  findByLabId(labId: string): Promise<User[]>;
  findByStatusInLab(status: UserStatus, labId: string): Promise<User[]>;
  countByRoleInLab(role: 'system_admin' | 'lab_admin' | 'user', labId: string): Promise<number>;
  isHealthy(): Promise<boolean>;
}
