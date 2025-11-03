/**
 * Public Route Module
 *
 * Handles routes that don't require authentication.
 * These are publicly accessible endpoints.
 */

import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { RouteModule } from '@presentation/routes/RouteModule';
import { AuthController } from '@presentation/controllers/AuthController';
import { createRateLimitMiddleware } from '@middleware/RateLimiting';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { validateBody } from '@middleware/Validation';
import {
  registerWithResearcherSchema,
  resetPasswordWithTokenRequestSchema
} from '@odysseus/shared-schemas';

export class PublicRouteModule implements RouteModule {
  private readonly rateLimitMiddleware: RequestHandler;

  constructor(
    private readonly authController: AuthController,
    configurationRepository: ConfigurationRepository
  ) {
    // Create rate limit middleware with injected repository
    this.rateLimitMiddleware = createRateLimitMiddleware(configurationRepository);
  }

  getBasePath(): string {
    return '/api/public';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.rateLimitMiddleware,
      // Note: No auth middleware for public routes
    ];
  }

  configure(router: Router): void {
    // System status endpoints
    router.get('/auth/first-time',
      this.authController.checkFirstTime.bind(this.authController)
    );

    // Password requirements (for registration form)
    router.get('/auth/password-requirements',
      this.authController.getPasswordRequirements.bind(this.authController)
    );

    // Registration endpoint (first-time setup)
    router.post('/auth/register', 
      validateBody(z.object({
        username: z.string().min(1).max(50),
        password: z.string().min(8).max(128),
        role: z.enum(['admin', 'user']).optional()
      })),
      this.authController.register.bind(this.authController)
    );

    // Login endpoint
    router.post('/auth/login',
      validateBody(z.object({
        username: z.string().min(1),
        password: z.string().min(1)
      })),
      this.authController.login.bind(this.authController)
    );

    // Register with researcher profile (new user flow with approval workflow)
    router.post('/auth/register-with-researcher',
      validateBody(registerWithResearcherSchema),
      this.authController.registerWithResearcher.bind(this.authController)
    );

    // Token refresh endpoint (OAuth 2.0 standard)
    router.post('/auth/refresh',
      validateBody(z.object({
        refreshToken: z.string().min(1)
      })),
      this.authController.refreshToken.bind(this.authController)
    );

    // Email verification (public - anyone with token can verify)
    router.post('/auth/verify-email',
      validateBody(z.object({
        token: z.string().min(32)
      })),
      this.authController.verifyEmail.bind(this.authController)
    );

    // Resend verification email (public - no auth required)
    router.post('/auth/resend-verification',
      validateBody(z.object({
        usernameOrEmail: z.string().min(1)
      })),
      this.authController.resendVerificationPublic.bind(this.authController)
    );

    // Password reset with token (public - anyone with token can reset)
    router.post('/auth/reset-password',
      validateBody(resetPasswordWithTokenRequestSchema),
      this.authController.resetPasswordWithToken.bind(this.authController)
    );

    // Health check (moved from main routes)
    router.get('/health', async (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'OK',
          timestamp: new Date().toISOString(),
          service: 'odysseus-api',
          version: '1.0.0'
        }
      });
    });
  }
}
