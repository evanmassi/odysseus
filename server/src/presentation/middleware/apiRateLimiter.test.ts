/**
 * API Rate Limiter Tests
 *
 * Verifies global and tiered rate limiting behavior using supertest against Express.
 */

import express from 'express';
import supertest from 'supertest';

import {
  createGlobalRateLimiter,
  createStrictRateLimiter,
  createModerateRateLimiter,
  createAuthRateLimiter,
} from './apiRateLimiter';

function createApp(...middlewares: express.RequestHandler[]): express.Application {
  const app = express();
  for (const mw of middlewares) {
    app.use(mw);
  }
  app.get('/test', (_req, res) => { res.json({ ok: true }); });
  return app;
}

async function fireRequests(agent: supertest.Agent, count: number): Promise<supertest.Response[]> {
  const responses: supertest.Response[] = [];
  for (let i = 0; i < count; i++) {
    responses.push(await agent.get('/test'));
  }
  return responses;
}

describe('apiRateLimiter', () => {
  describe('createGlobalRateLimiter', () => {
    it('should allow requests under the limit', async () => {
      const app = createApp(createGlobalRateLimiter());
      const agent = supertest(app);

      const res = await agent.get('/test');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('should include draft-7 RateLimit headers', async () => {
      const app = createApp(createGlobalRateLimiter());
      const agent = supertest(app);

      const res = await agent.get('/test');

      // Draft-7 uses a combined header: "limit=300, remaining=299, reset=60"
      expect(res.headers).toHaveProperty('ratelimit');
      expect(res.headers).toHaveProperty('ratelimit-policy');
      expect(res.headers['ratelimit']).toContain('limit=300');
    });

    it('should not include legacy X-RateLimit headers', async () => {
      const app = createApp(createGlobalRateLimiter());
      const agent = supertest(app);

      const res = await agent.get('/test');

      expect(res.headers).not.toHaveProperty('x-ratelimit-limit');
      expect(res.headers).not.toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('createStrictRateLimiter', () => {
    it('should block after 5 requests', async () => {
      const app = createApp(createStrictRateLimiter());
      const agent = supertest(app);

      const responses = await fireRequests(agent, 6);

      for (let i = 0; i < 5; i++) {
        expect(responses[i].status).toBe(200);
      }
      expect(responses[5].status).toBe(429);
    });

    it('should return error envelope on 429', async () => {
      const app = createApp(createStrictRateLimiter());
      const agent = supertest(app);

      await fireRequests(agent, 5);
      const blocked = await agent.get('/test');

      expect(blocked.status).toBe(429);
      expect(blocked.body).toMatchObject({
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
      });
      expect(blocked.body.timestamp).toBeDefined();
    });
  });

  describe('createModerateRateLimiter', () => {
    it('should allow 20 requests then block', async () => {
      const app = createApp(createModerateRateLimiter());
      const agent = supertest(app);

      const responses = await fireRequests(agent, 21);

      expect(responses[19].status).toBe(200);
      expect(responses[20].status).toBe(429);
    });
  });

  describe('createAuthRateLimiter', () => {
    it('should allow 10 requests then block', async () => {
      const app = createApp(createAuthRateLimiter());
      const agent = supertest(app);

      const responses = await fireRequests(agent, 11);

      expect(responses[9].status).toBe(200);
      expect(responses[10].status).toBe(429);
    });
  });

  describe('independent counters', () => {
    it('should track limits independently per limiter instance', async () => {
      const strict = createStrictRateLimiter();
      const moderate = createModerateRateLimiter();

      const app = express();
      app.get('/strict', strict, (_req, res) => { res.json({ ok: true }); });
      app.get('/moderate', moderate, (_req, res) => { res.json({ ok: true }); });

      const agent = supertest(app);

      // Exhaust strict limit
      await fireRequests(agent, 5);

      // Moderate endpoint should still work (different counter)
      const moderateRes = await agent.get('/moderate');
      expect(moderateRes.status).toBe(200);
    });
  });
});
