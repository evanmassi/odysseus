/**
 * Session Write Atomicity
 *
 * Login and refresh rotation each write across several repositories. A partial write leaves the
 * session and its refresh token disagreeing — which the next refresh reads as token replay, so it
 * revokes the whole family and logs the user out. These tests prove each flow commits all its
 * writes or none.
 */

import { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import { EnvironmentConfigurationService } from '@infrastructure/services/EnvironmentConfigurationService';
import { JwtSessionService } from '@infrastructure/services/JwtSessionService';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, testConnectionString, truncateAll } from './setup/testDb';

import type { Repositories, UnitOfWork } from '@application/contracts/UnitOfWork';
import type { User } from '@domain/entities/User';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('refresh rotation atomicity', () => {
  let bootstrap: PostgresContext;
  let factory: RepositoryFactory;
  let context: PostgresContext;
  let seed: TestSeed;

  const buildSessionService = (unitOfWork: UnitOfWork): JwtSessionService => {
    const repos = factory.getRepositories();
    return new JwtSessionService(
      new EnvironmentConfigurationService(),
      repos.users,
      repos.refreshTokens,
      repos.storage,
      repos.userSessions,
      unitOfWork,
      repos.labs
    );
  };

  /** A unit of work that runs the real transaction but sabotages the final write. */
  const failingUnitOfWork = (): UnitOfWork => ({
    withTransaction: <T>(work: (repos: Repositories) => Promise<T>): Promise<T> =>
      factory.withTransaction((repos) => {
        const userSessions = Object.create(repos.userSessions) as Repositories['userSessions'];
        userSessions.save = () => Promise.reject(new Error('SIMULATED_MID_FLOW_FAILURE'));
        return work({ ...repos, userSessions });
      }),
  });

  const countTokensFor = async (userId: string): Promise<number> => {
    const rows = await context.queryMany<{ count: string }>(
      'SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  };

  const establishSession = async (user: User): Promise<string> => {
    const result = await buildSessionService(factory).createTokenPair(user, 'test-agent', '127.0.0.1');
    return result.tokens.refreshToken;
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

  it('persists no refresh token when login fails to create the session', async () => {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });

    await expect(
      buildSessionService(failingUnitOfWork()).createTokenPair(user, 'test-agent', '127.0.0.1')
    ).rejects.toThrow();

    // The token is saved before the session; without a transaction it would survive as an
    // unreachable row that no session ever points at.
    expect(await countTokensFor(user.id)).toBe(0);

    const sessions = await factory.getRepositories().userSessions.findActiveSessionsByUserId(user.id);
    expect(sessions).toHaveLength(0);
  });

  it('rolls back every write when a later write in the rotation fails', async () => {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });
    const rawToken = await establishSession(user);

    await expect(
      buildSessionService(failingUnitOfWork()).refreshAccessToken(rawToken)
    ).rejects.toThrow();

    const repos = factory.getRepositories();

    // The presented token must not be left revoked — a revoked token with no replacement is
    // exactly the state that trips reuse detection on the next refresh.
    const presented = await repos.refreshTokens.findByToken(rawToken);
    expect(presented).not.toBeNull();
    expect(presented!.isRevoked).toBe(false);

    // The replacement token must not have been persisted.
    expect(await countTokensFor(user.id)).toBe(1);

    // The session must still point at the original token.
    const session = await repos.userSessions.findByRefreshToken(rawToken);
    expect(session).not.toBeNull();
  });

  it('leaves the user able to refresh normally after a failed rotation', async () => {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });
    const rawToken = await establishSession(user);

    await expect(
      buildSessionService(failingUnitOfWork()).refreshAccessToken(rawToken)
    ).rejects.toThrow();

    // The whole point: the failure must not have locked the user out.
    const result = await buildSessionService(factory).refreshAccessToken(rawToken);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(rawToken);
  });

  it('commits all three writes when the rotation succeeds', async () => {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });
    const rawToken = await establishSession(user);

    const result = await buildSessionService(factory).refreshAccessToken(rawToken);

    const repos = factory.getRepositories();

    const presented = await repos.refreshTokens.findByToken(rawToken);
    expect(presented!.isRevoked).toBe(true);

    expect(await countTokensFor(user.id)).toBe(2);

    const session = await repos.userSessions.findByRefreshToken(result.refreshToken);
    expect(session).not.toBeNull();
  });
});
