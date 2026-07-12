/**
 * Refresh Token Hashing At Rest
 *
 * Proves refresh tokens are persisted as hashes (never plaintext) yet still resolve via the raw
 * token, so a database read never yields a usable credential.
 */

import { RefreshToken } from '@domain/entities/RefreshToken';
import { hashToken } from '@domain/utils/tokenHash';

import { RefreshTokenRepository } from '@infrastructure/repositories/RefreshTokenRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('refresh token hashing at rest', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let repo: RefreshTokenRepository;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    repo = new RefreshTokenRepository(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('stores the hash, not the raw token, and still resolves by the raw token', async () => {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });

    const token = RefreshToken.create(user.id);
    const rawToken = token.rawToken;
    expect(rawToken).toBeDefined();
    await repo.save(token);

    // The persisted column holds the hash, never the raw token.
    const row = await context.queryOne<{ token: string }>(
      'SELECT token FROM refresh_tokens WHERE id = $1',
      [token.id]
    );
    expect(row?.token).toBe(hashToken(rawToken!));
    expect(row?.token).not.toBe(rawToken);

    // Lookup by the raw token still resolves — the repository hashes its input.
    const found = await repo.findByToken(rawToken!);
    expect(found?.id).toBe(token.id);
  });

  it('returns null for an unknown token', async () => {
    expect(await repo.findByToken('not-a-real-token')).toBeNull();
  });
});
