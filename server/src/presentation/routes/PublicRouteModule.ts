/**
 * Public Route Module
 *
 * Unauthenticated routes — login, registration, password reset, health check.
 */

import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { RouteModule } from '@presentation/routes/RouteModule';
import { PublicAuthController } from '@presentation/controllers/auth/PublicAuthController';
import { InviteCodeController } from '@presentation/controllers/InviteCodeController';
import { createRateLimitMiddleware } from '@presentation/middleware/rateLimitMiddleware';
import { StorageRepository } from '@domain/repositories/StorageRepository';
import { validateBody } from '@presentation/middleware/requestValidation';
import {
  registerWithResearcherSchema,
  resetPasswordWithTokenRequestSchema,
  forceChangePasswordRequestSchema
} from '@odysseus/shared-schemas';

export class PublicRouteModule implements RouteModule {
  private readonly rateLimitMiddleware: RequestHandler;

  constructor(
    private readonly publicAuthController: PublicAuthController,
    private readonly inviteCodeController: InviteCodeController,
    storageRepository: StorageRepository
  ) {
    this.rateLimitMiddleware = createRateLimitMiddleware(storageRepository);
  }

  getBasePath(): string {
    return '/api/public';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.rateLimitMiddleware,
    ];
  }

  configure(router: Router): void {
    // System status endpoints
    router.get('/auth/first-time',
      this.publicAuthController.checkFirstTime.bind(this.publicAuthController)
    );

    router.get('/auth/password-requirements',
      this.publicAuthController.getPasswordRequirements.bind(this.publicAuthController)
    );

    router.post('/auth/register',
      validateBody(z.object({
        username: z.string().min(1).max(50),
        password: z.string().min(8).max(128),
        role: z.enum(['admin', 'user']).optional()
      })),
      this.publicAuthController.register.bind(this.publicAuthController)
    );

    router.post('/auth/login',
      validateBody(z.object({
        username: z.string().min(1),
        password: z.string().min(1)
      })),
      this.publicAuthController.login.bind(this.publicAuthController)
    );

    router.post('/auth/register-with-researcher',
      validateBody(registerWithResearcherSchema),
      this.publicAuthController.registerWithResearcher.bind(this.publicAuthController)
    );

    // Token refresh endpoint (OAuth 2.0 standard)
    router.post('/auth/refresh',
      validateBody(z.object({
        refreshToken: z.string().min(1)
      })),
      this.publicAuthController.refreshToken.bind(this.publicAuthController)
    );

    router.post('/auth/verify-email',
      validateBody(z.object({
        token: z.string().min(32)
      })),
      this.publicAuthController.verifyEmail.bind(this.publicAuthController)
    );

    router.post('/auth/resend-verification',
      validateBody(z.object({
        usernameOrEmail: z.string().min(1)
      })),
      this.publicAuthController.resendVerificationPublic.bind(this.publicAuthController)
    );

    router.post('/auth/reset-password',
      validateBody(resetPasswordWithTokenRequestSchema),
      this.publicAuthController.resetPasswordWithToken.bind(this.publicAuthController)
    );

    // Force change password (public - user has temp token from login response)
    // Used when user logs in with requirePasswordChange=true (admin reset flow)
    router.post('/auth/force-change-password',
      validateBody(forceChangePasswordRequestSchema),
      this.publicAuthController.forceChangePassword.bind(this.publicAuthController)
    );

    // Session info for idle timeout warning
    // PUBLIC ENDPOINT - handles own auth with updateActivity: false
    // This prevents polling from extending the session (which would defeat idle timeout)
    router.get('/auth/session-info',
      this.publicAuthController.getSessionInfo.bind(this.publicAuthController)
    );

    router.post('/invite-codes/validate',
      validateBody(z.object({ code: z.string().min(1) })),
      this.inviteCodeController.validate.bind(this.inviteCodeController)
    );

    router.post('/auth/setup-system-admin',
      validateBody(z.object({
        username: z.string().min(1).max(50),
        password: z.string().min(8).max(128),
        email: z.string().email(),
        firstName: z.string().min(1).max(50),
        lastName: z.string().min(1).max(50),
        setupKey: z.string().optional(),
        department: z.string().max(100).optional(),
        position: z.string().max(100).optional(),
      })),
      this.publicAuthController.setupSystemAdmin.bind(this.publicAuthController)
    );

    router.get('/health', async (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'OK',
          timestamp: new Date().toISOString(),
          service: 'odysseus-api',
          version: process.env.npm_package_version ?? '1.0.0'
        }
      });
    });

    router.get('/version', async (req, res) => {
      res.json({
        success: true,
        data: {
          version: process.env.npm_package_version ?? '1.0.0',
          environment: process.env.NODE_ENV ?? 'development',
          nodeVersion: process.version,
          platform: process.platform
        }
      });
    });
  }
}
