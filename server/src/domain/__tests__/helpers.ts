/**
 * Domain Test Factories
 *
 * Shared helpers for creating domain entities in tests with sensible defaults.
 */

import { Tube } from '@domain/entities/Tube';
import { User } from '@domain/entities/User';
import { UserRole } from '@domain/value-objects/UserRole';

export const TEST_PASSWORD_HASH = '$2b$12$fakehashfortestingonly000000000000000000000000000000000';

export function createTestUser(overrides: {
  username?: string;
  passwordHash?: string;
  role?: UserRole;
  status?: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended';
  labId?: string;
  researcherId?: string;
} = {}): User {
  return User.createWithPassword(
    overrides.username ?? 'testuser',
    overrides.passwordHash ?? TEST_PASSWORD_HASH,
    overrides.role ?? UserRole.user(),
    overrides.researcherId,
    undefined,
    overrides.status ?? 'approved',
    overrides.labId
  );
}

export function createTestAdmin(overrides: {
  username?: string;
  labId?: string;
} = {}): User {
  return createTestUser({
    username: overrides.username ?? 'admin',
    role: UserRole.labAdmin(),
    labId: overrides.labId,
  });
}

export function createTestSystemAdmin(overrides: {
  username?: string;
} = {}): User {
  return User.createSystemAdmin(
    overrides.username ?? 'sysadmin',
    'api_' + 'x'.repeat(32)
  );
}

export function createTestTube(overrides: {
  location?: { tankId: string; rackId: string; boxId: string; position: number };
  sample?: Record<string, unknown>;
  researcherId?: string;
  labId?: string;
} = {}): Tube {
  return Tube.create({
    location: overrides.location ?? { tankId: 'T1', rackId: 'R1', boxId: 'A', position: 1 },
    sample: { cellType: 'HeLa', ...overrides.sample },
    researcherId: overrides.researcherId,
    labId: overrides.labId,
  });
}
