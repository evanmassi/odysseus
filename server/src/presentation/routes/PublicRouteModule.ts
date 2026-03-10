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
import { InviteCodeController } from '@presentation/controllers/InviteCodeController';
import { createRateLimitMiddleware } from '@presentation/middleware/loginRateLimiting';
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
    private readonly authController: AuthController,
    private readonly inviteCodeController: InviteCodeController,
    storageRepository: StorageRepository
  ) {
    // Create rate limit middleware with injected repository
    this.rateLimitMiddleware = createRateLimitMiddleware(storageRepository);
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

    // Force change password (public - user has temp token from login response)
    // Used when user logs in with requirePasswordChange=true (admin reset flow)
    router.post('/auth/force-change-password',
      validateBody(forceChangePasswordRequestSchema),
      this.authController.forceChangePassword.bind(this.authController)
    );

    // Session info for idle timeout warning
    // PUBLIC ENDPOINT - handles own auth with updateActivity: false
    // This prevents polling from extending the session (which would defeat idle timeout)
    router.get('/auth/session-info',
      this.authController.getSessionInfo.bind(this.authController)
    );

    // Invite code validation (for registration flow)
    router.post('/invite-codes/validate',
      validateBody(z.object({ code: z.string().min(1) })),
      this.inviteCodeController.validate.bind(this.inviteCodeController)
    );

    // One-time system admin setup
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
      this.authController.setupSystemAdmin.bind(this.authController)
    );

    // Health check (moved from main routes)
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

    // Version info endpoint
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
