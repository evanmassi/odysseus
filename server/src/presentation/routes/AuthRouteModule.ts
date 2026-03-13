/**
 * Authenticated Route Module
 *
 * Routes requiring a valid session — session management, password, and email verification.
 */


import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { AuthController } from '@presentation/controllers/auth/AuthController';
import { createRateLimitMiddleware } from '@presentation/middleware/rateLimitMiddleware';
import type { RouteModule } from '@presentation/routes/RouteModule';

import type { Router, RequestHandler } from 'express';

export class AuthRouteModule implements RouteModule {
  private readonly rateLimitMiddleware: RequestHandler;

  constructor(
    private readonly authController: AuthController,
    private readonly authMiddleware: AuthMiddleware,
    storageRepository: StorageRepository
  ) {
    this.rateLimitMiddleware = createRateLimitMiddleware(storageRepository);
  }

  getBasePath(): string {
    return '/api/auth';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate,
      this.rateLimitMiddleware
    ];
  }

  configure(router: Router): void {
    // Session management
    router.get('/verify',
      this.authController.verifySession.bind(this.authController)
    );

    router.get('/me',
      this.authController.getCurrentUser.bind(this.authController)
    );

    router.post('/logout',
      this.authController.logout.bind(this.authController)
    );

    // Session heartbeat - extends session by recording activity
    router.post('/heartbeat',
      this.authController.heartbeat.bind(this.authController)
    );

    // Password management
    router.post('/change-password',
      this.authController.changePassword.bind(this.authController)
    );

    // Email verification management
    router.post('/resend-verification',
      this.authController.resendVerification.bind(this.authController)
    );

    router.get('/verification-status',
      this.authController.getVerificationStatus.bind(this.authController)
    );
  }
}
