/**
 * Demo Reset Endpoint Tests
 *
 * This endpoint is destructive, unauthenticated, and public, so every refusal path is covered —
 * a gap here wipes a lab rather than merely leaking a read.
 */

import type { ConfigurationService } from '@application/contracts/ConfigurationService';
import type { User } from '@domain/entities/User';

import { DemoController } from './DemoController';

import type { Request, Response } from 'express';

const VALID_KEY = 'k'.repeat(32);

function makeResponse() {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
}

function makeRequest(key?: string): Request {
  return { header: jest.fn().mockReturnValue(key) } as unknown as Request;
}

function makeController(opts: {
  username?: string;
  resetKey?: string;
  user?: Partial<User> | null;
}) {
  const handleUnattended = jest.fn().mockResolvedValue({ restored: { tubes: 234 } });
  const purgeExpiredSessions = jest.fn().mockResolvedValue({ purgedSessions: 3, purgedTokens: 4 });

  const controller = new DemoController({
    resetDemoDataHandler: { handleUnattended } as never,
    userApplicationService: {
      getUserByUsername: jest.fn().mockResolvedValue(opts.user ?? null),
    } as never,
    securityMonitoring: { purgeExpiredSessions } as never,
    configurationService: {
      get: () => ({ username: opts.username, resetKey: opts.resetKey }),
    } as unknown as ConfigurationService,
  });

  return { controller, handleUnattended, purgeExpiredSessions };
}

const demoUser = { id: 'user_1', labId: 'lab_demo', isDemo: true } as Partial<User>;

describe('demo reset endpoint', () => {
  it('resets and reclaims sessions when the key matches', async () => {
    const { controller, handleUnattended, purgeExpiredSessions } = makeController({
      username: 'ath.ena',
      resetKey: VALID_KEY,
      user: demoUser,
    });
    const res = makeResponse();

    await controller.reset(makeRequest(VALID_KEY), res);

    expect(handleUnattended).toHaveBeenCalledWith('lab_demo', 'user_1');
    expect(purgeExpiredSessions).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(404);
  });

  it('404s when no key is configured', async () => {
    const { controller, handleUnattended } = makeController({ username: 'ath.ena' });
    const res = makeResponse();

    await controller.reset(makeRequest(VALID_KEY), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(handleUnattended).not.toHaveBeenCalled();
  });

  // Identical to the unconfigured response on purpose: a probe learns nothing either way.
  it('404s on a wrong key', async () => {
    const { controller, handleUnattended } = makeController({
      username: 'ath.ena',
      resetKey: VALID_KEY,
      user: demoUser,
    });
    const res = makeResponse();

    await controller.reset(makeRequest('x'.repeat(32)), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(handleUnattended).not.toHaveBeenCalled();
  });

  it('404s when no key is presented at all', async () => {
    const { controller, handleUnattended } = makeController({
      username: 'ath.ena',
      resetKey: VALID_KEY,
      user: demoUser,
    });
    const res = makeResponse();

    await controller.reset(makeRequest(undefined), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(handleUnattended).not.toHaveBeenCalled();
  });

  // Failing closed on a weak secret beats serving a destructive operation behind a guessable one.
  it('stays disabled when the configured key is too short', async () => {
    const { controller, handleUnattended } = makeController({
      username: 'ath.ena',
      resetKey: 'short',
      user: demoUser,
    });
    const res = makeResponse();

    await controller.reset(makeRequest('short'), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(handleUnattended).not.toHaveBeenCalled();
  });

  // The check that stops a mistyped environment variable from wiping a real lab.
  it('refuses when the configured account is not in a demo lab', async () => {
    const { controller, handleUnattended } = makeController({
      username: 'real.user',
      resetKey: VALID_KEY,
      user: { id: 'user_2', labId: 'lab_real', isDemo: false },
    });
    const res = makeResponse();

    await controller.reset(makeRequest(VALID_KEY), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(handleUnattended).not.toHaveBeenCalled();
  });

  it('refuses when the configured account does not exist', async () => {
    const { controller, handleUnattended } = makeController({
      username: 'ghost',
      resetKey: VALID_KEY,
      user: null,
    });
    const res = makeResponse();

    await controller.reset(makeRequest(VALID_KEY), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(handleUnattended).not.toHaveBeenCalled();
  });
});
