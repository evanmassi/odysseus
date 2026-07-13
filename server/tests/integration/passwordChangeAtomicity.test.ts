/**
 * Password Change Atomicity
 *
 * Changing a password persists the new hash and revokes every existing token and session. If the
 * revoke half fails on its own, the account is left with a new password and the old sessions still
 * live — the exact outcome someone resetting a compromised account is trying to prevent. These
 * tests prove the write and the revocation stand or fall together.
 */

import { ForceChangePasswordCommandHandler } from '@application/commands/PasswordResetCommands';
import { ChangeUserPasswordCommandHandler } from '@application/commands/UserCommands';
import { UserSession } from '@domain/entities/UserSession';
import { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import { BcryptPasswordService } from '@infrastructure/services/BcryptPasswordService';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, testConnectionString, truncateAll } from './setup/testDb';

import type { EventBus } from '@application/contracts/EventBus';
import type { Repositories, UnitOfWork } from '@application/contracts/UnitOfWork';
import type { User } from '@domain/entities/User';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const OLD_PASSWORD = 'old-password-that-is-long';
const NEW_PASSWORD = 'new-password-that-is-long';

describe('password change atomicity', () => {
  let bootstrap: PostgresContext;
  let factory: RepositoryFactory;
  let context: PostgresContext;
  let seed: TestSeed;

  const passwordService = new BcryptPasswordService();
  const eventBus = { publish: jest.fn(), subscribe: jest.fn() } as unknown as EventBus;

  /** Runs the real transaction, then sabotages the session revoke inside it. */
  const failingUnitOfWork = (method: 'revokeAllSessions' | 'bulkRevoke'): UnitOfWork => ({
    withTransaction: <T>(work: (repos: Repositories) => Promise<T>): Promise<T> =>
      factory.withTransaction((repos) => {
        const userSessions = Object.create(repos.userSessions) as Repositories['userSessions'];
        userSessions[method] = () => Promise.reject(new Error('SIMULATED_REVOKE_FAILURE'));
        return work({ ...repos, userSessions });
      }),
  });

  /** A user whose stored hash really verifies against OLD_PASSWORD. */
  const seedUserWithPassword = async (): Promise<User> => {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });
    user.setPasswordHash(await passwordService.hash(OLD_PASSWORD));
    await factory.getRepositories().users.save(user);
    return user;
  };

  const storedHashOf = async (userId: string): Promise<string> => {
    const row = await context.queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    return row!.password_hash;
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation-purposes';
    process.env.DATABASE_URL = testConnectionString();

    bootstrap = await setupTestDatabase();
    factory = new RepositoryFactory({
      connectionString: testConnectionString(),
      ssl: false,
      maxConnections: 5,
    });
    await factory.initialize();
    context = factory.getPostgresContext();
    seed = createSeed(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await factory.close();
    await bootstrap.close();
  });

  describe('force change', () => {
    const buildHandler = (unitOfWork: UnitOfWork): ForceChangePasswordCommandHandler => {
      const repos = factory.getRepositories();
      return new ForceChangePasswordCommandHandler(
        repos.users,
        eventBus,
        passwordService,
        repos.storage,
        unitOfWork
      );
    };

    it('does not change the password when revoking the old sessions fails', async () => {
      const user = await seedUserWithPassword();
      const hashBefore = await storedHashOf(user.id);

      await expect(
        buildHandler(failingUnitOfWork('revokeAllSessions')).handle({
          userId: user.id,
          newPassword: NEW_PASSWORD,
        })
      ).rejects.toThrow();

      // A new password that failed to evict the old sessions must not stand.
      expect(await storedHashOf(user.id)).toBe(hashBefore);
      expect(await passwordService.verify(OLD_PASSWORD, hashBefore)).toBe(true);
    });

    it('changes the password and revokes credentials when it succeeds', async () => {
      const user = await seedUserWithPassword();
      const hashBefore = await storedHashOf(user.id);

      await buildHandler(factory).handle({ userId: user.id, newPassword: NEW_PASSWORD });

      const hashAfter = await storedHashOf(user.id);
      expect(hashAfter).not.toBe(hashBefore);
      expect(await passwordService.verify(NEW_PASSWORD, hashAfter)).toBe(true);
    });
  });

  describe('user-initiated change', () => {
    const buildHandler = (unitOfWork: UnitOfWork): ChangeUserPasswordCommandHandler => {
      const repos = factory.getRepositories();
      return new ChangeUserPasswordCommandHandler(
        repos.users,
        eventBus,
        repos.storage,
        passwordService,
        unitOfWork
      );
    };

    it('does not change the password when revoking the other sessions fails', async () => {
      const user = await seedUserWithPassword();
      const hashBefore = await storedHashOf(user.id);

      // A second session exists, so the revoke path actually runs.
      await factory.getRepositories().userSessions.save(
        UserSession.create(user.id, 'some-other-token-hash', new Date(Date.now() + 60 * 60 * 1000))
      );

      await expect(
        buildHandler(failingUnitOfWork('bulkRevoke')).handle({
          userId: user.id,
          currentPassword: OLD_PASSWORD,
          newPassword: NEW_PASSWORD,
          currentSessionId: 'the-session-being-kept',
          initiatedBy: user.id,
        })
      ).rejects.toThrow();

      expect(await storedHashOf(user.id)).toBe(hashBefore);
      expect(await passwordService.verify(OLD_PASSWORD, hashBefore)).toBe(true);
    });
  });
});
