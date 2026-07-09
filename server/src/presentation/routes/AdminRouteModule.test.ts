/**
 * Admin Route Wiring — System-Admin Enforcement
 *
 * The audit retention/archival endpoints are guarded solely by route middleware; the controller no
 * longer checks the role inline. This pins requireSystemAdmin onto those routes so dropping it —
 * which would let any lab admin reach retention data and trigger manual archival — fails the build.
 */

import { AdminRouteModule } from './AdminRouteModule';

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { Router } from 'express';

describe('AdminRouteModule system-admin wiring', () => {
  it('guards the retention/archival routes with requireSystemAdmin', () => {
    const middleware: Record<string, jest.Mock> = {};
    const authMiddleware = new Proxy(
      {},
      {
        get: (_target, key) => {
          const name = key as string;
          if (!middleware[name]) middleware[name] = jest.fn();
          return middleware[name];
        },
      }
    ) as unknown as AuthMiddleware;

    // Any controller method resolves to a bindable stub — we only assert on middleware wiring.
    const anyController = () => new Proxy({}, { get: () => jest.fn() });

    const module = new AdminRouteModule(
      anyController() as never,
      anyController() as never,
      anyController() as never,
      anyController() as never,
      anyController() as never,
      anyController() as never,
      anyController() as never,
      anyController() as never,
      authMiddleware
    );

    const routes: { method: string; path: string; handlers: unknown[] }[] = [];
    const record = (method: string) => (path: string, ...handlers: unknown[]) => {
      routes.push({ method, path, handlers });
    };
    const router = {
      get: record('get'),
      post: record('post'),
      put: record('put'),
      patch: record('patch'),
      delete: record('delete'),
    } as unknown as Router;

    module.configure(router);

    const requireSystemAdmin = authMiddleware.requireSystemAdmin;
    const guarded = [
      { method: 'get', path: '/audit/retention/metrics' },
      { method: 'get', path: '/audit/retention/policy' },
      { method: 'get', path: '/audit/retention/export' },
      { method: 'post', path: '/audit/retention/archive' },
    ];

    for (const { method, path } of guarded) {
      const route = routes.find(r => r.method === method && r.path === path);
      expect(route).toBeDefined();
      expect(route!.handlers).toContain(requireSystemAdmin);
    }
  });
});
