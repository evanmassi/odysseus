/**
 * Auth Route Module
 *
 * Handles authentication-related routes that require valid authentication.
 * These are for session management and user profile operations.
 */

import { Router, RequestHandler } from 'express';
import { RouteModule } from '@presentation/routes/RouteModule';
import { AuthController } from '@presentation/controllers/AuthController';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { createRateLimitMiddleware } from '@middleware/RateLimiting';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';

export class AuthRouteModule implements RouteModule {
  private readonly rateLimitMiddleware: RequestHandler;

  constructor(
    private readonly authController: AuthController,
    private readonly authMiddleware: AuthMiddleware,
    configurationRepository: ConfigurationRepository
  ) {
    // Create rate limit middleware with injected repository
    this.rateLimitMiddleware = createRateLimitMiddleware(configurationRepository);
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

    // Note: User management routes moved to UserRouteModule
  }
}
