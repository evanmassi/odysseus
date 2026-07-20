/**
 * Public Route Module
 *
 * Unauthenticated routes — login, registration, password reset, health check.
 */

import {
  registerWithProfileSchema,
  resetPasswordWithTokenRequestSchema,
  forceChangePasswordRequestSchema,
} from '@odysseus/shared-schemas';

import type { EventBus } from '@application/contracts/EventBus';
import { UserLoginFailedEvent } from '@domain/events/UserEvents';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { PublicAuthController } from '@presentation/controllers/auth/PublicAuthController';
import type { InviteCodeController } from '@presentation/controllers/InviteCodeController';
import { createAuthRateLimiter } from '@presentation/middleware/apiRateLimiter';
import { createRateLimitMiddleware } from '@presentation/middleware/rateLimitMiddleware';
import { validateBody } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import {
  LoginBodySchema,
  RefreshTokenBodySchema,
  VerifyEmailBodySchema,
  ResendVerificationBodySchema,
  ValidateInviteCodeBodySchema,
  SetupSystemAdminBodySchema,
} from '@presentation/validation/httpValidationSchemas';

import type { Request, Router, RequestHandler } from 'express';

const LOGIN_PATH = '/auth/login';

export class PublicRouteModule implements RouteModule {
  private readonly rateLimitMiddleware: RequestHandler;
  private readonly authLimiter = createAuthRateLimiter();

  constructor(
    private readonly publicAuthController: PublicAuthController,
    private readonly inviteCodeController: InviteCodeController,
    storageRepository: StorageRepository,
    private readonly appVersion: string,
    private readonly environment: string,
    private readonly eventBus: EventBus
  ) {
    this.rateLimitMiddleware = createRateLimitMiddleware(storageRepository, req =>
      this.publishLoginLockout(req)
    );
  }

  private publishLoginLockout(req: Request): void {
    if (req.path !== LOGIN_PATH) return;
    const username = (req.body as { username?: string } | undefined)?.username ?? 'unknown';
    const ipAddress = req.ip ?? req.socket.remoteAddress;
    void this.eventBus.publish(new UserLoginFailedEvent(username, ipAddress, 'Rate limit lockout'));
  }

  getBasePath(): string {
    return '/api/public';
  }

  getMiddleware(): RequestHandler[] {
    return [this.rateLimitMiddleware];
  }

  configure(router: Router): void {
    // System status endpoints
    router.get(
      '/auth/first-time',
      this.publicAuthController.checkFirstTime.bind(this.publicAuthController)
    );

    router.get(
      '/auth/password-requirements',
      this.publicAuthController.getPasswordRequirements.bind(this.publicAuthController)
    );

    router.post(
      LOGIN_PATH,
      this.authLimiter,
      validateBody(LoginBodySchema),
      this.publicAuthController.login.bind(this.publicAuthController)
    );

    router.post(
      '/auth/register-with-profile',
      this.authLimiter,
      validateBody(registerWithProfileSchema),
      this.publicAuthController.registerWithProfile.bind(this.publicAuthController)
    );

    // Token refresh endpoint (OAuth 2.0 standard)
    router.post(
      '/auth/refresh',
      validateBody(RefreshTokenBodySchema),
      this.publicAuthController.refreshToken.bind(this.publicAuthController)
    );

    router.post(
      '/auth/verify-email',
      validateBody(VerifyEmailBodySchema),
      this.publicAuthController.verifyEmail.bind(this.publicAuthController)
    );

    router.post(
      '/auth/resend-verification',
      validateBody(ResendVerificationBodySchema),
      this.publicAuthController.resendVerificationPublic.bind(this.publicAuthController)
    );

    router.post(
      '/auth/reset-password',
      this.authLimiter,
      validateBody(resetPasswordWithTokenRequestSchema),
      this.publicAuthController.resetPasswordWithToken.bind(this.publicAuthController)
    );

    // Force change password (public - user has temp token from login response)
    // Used when user logs in with requirePasswordChange=true (admin reset flow)
    router.post(
      '/auth/force-change-password',
      this.authLimiter,
      validateBody(forceChangePasswordRequestSchema),
      this.publicAuthController.forceChangePassword.bind(this.publicAuthController)
    );

    // Session info for idle timeout warning
    // PUBLIC ENDPOINT - handles own auth with updateActivity: false
    // This prevents polling from extending the session (which would defeat idle timeout)
    router.get(
      '/auth/session-info',
      this.publicAuthController.getSessionInfo.bind(this.publicAuthController)
    );

    router.post(
      '/invite-codes/validate',
      validateBody(ValidateInviteCodeBodySchema),
      this.inviteCodeController.validate.bind(this.inviteCodeController)
    );

    router.post(
      '/auth/setup-system-admin',
      validateBody(SetupSystemAdminBodySchema),
      this.publicAuthController.setupSystemAdmin.bind(this.publicAuthController)
    );

    router.get('/health', (req, res) => {
      res.json(
        ResponseBuilder.success({
          status: 'OK',
          timestamp: new Date().toISOString(),
          service: 'odysseus-api',
          version: this.appVersion,
        })
      );
    });

    router.get('/version', (req, res) => {
      res.json(
        ResponseBuilder.success({
          version: this.appVersion,
          environment: this.environment,
          nodeVersion: process.version,
          platform: process.platform,
        })
      );
    });
  }
}
