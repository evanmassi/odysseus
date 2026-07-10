/**
 * Express Auth Middleware — Error Envelope
 *
 * Pins the auth middleware to the canonical flat error envelope (errorEnvelopeSchema) with canonical
 * codes. The prior nested `{ error: { code, message }, meta }` shape failed the client's envelope parse,
 * dropping the code — so session-terminal detection silently broke on auth failures.
 */

import { errorEnvelopeSchema, API_ERROR_CODES } from '@odysseus/shared-schemas';

import { ExpressAuthMiddleware } from './ExpressAuthMiddleware';

import type { SessionService } from '@application/contracts/SessionService';
import type { Request, Response } from 'express';

function makeRes() {
  const res = {} as Response & { body?: unknown };
  res.status = jest.fn(() => res) as unknown as Response['status'];
  res.json = jest.fn((b: unknown) => {
    res.body = b;
    return res;
  }) as unknown as Response['json'];
  return res;
}

describe('ExpressAuthMiddleware error envelope', () => {
  it('emits a canonical UNAUTHORIZED envelope when the auth header is missing', async () => {
    const mw = new ExpressAuthMiddleware({} as SessionService);
    const req = { headers: {}, path: '/x', method: 'GET' } as unknown as Request;
    const res = makeRes();
    const next = jest.fn();

    await mw.authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(errorEnvelopeSchema.safeParse(res.body).success).toBe(true);
    expect((res.body as { code: string }).code).toBe(API_ERROR_CODES.UNAUTHORIZED);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards a session-terminal code in a parseable envelope on a revoked session', async () => {
    const sessionService = {
      validateSessionWithActivity: jest
        .fn()
        .mockResolvedValue({ success: false, code: API_ERROR_CODES.SESSION_REVOKED }),
    } as unknown as SessionService;
    const mw = new ExpressAuthMiddleware(sessionService);
    const req = {
      headers: { authorization: 'Bearer token' },
      path: '/x',
      method: 'GET',
    } as unknown as Request;
    const res = makeRes();

    await mw.authenticate(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(errorEnvelopeSchema.safeParse(res.body).success).toBe(true);
    expect((res.body as { code: string }).code).toBe(API_ERROR_CODES.SESSION_REVOKED);
  });

  it('denies a non-system-admin with a canonical FORBIDDEN envelope', () => {
    const mw = new ExpressAuthMiddleware({} as SessionService);
    const req = {
      user: { id: 'u1', username: 'u', role: { value: 'admin' }, isSystemAdmin: () => false },
      path: '/x',
      method: 'GET',
    } as unknown as Request;
    const res = makeRes();

    mw.requireSystemAdmin(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(errorEnvelopeSchema.safeParse(res.body).success).toBe(true);
    expect((res.body as { code: string }).code).toBe(API_ERROR_CODES.FORBIDDEN);
  });
});
