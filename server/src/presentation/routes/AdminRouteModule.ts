/**
 * Admin Route Module
 *
 * Handles administrative routes that require admin privileges.
 * These routes are for user management, system configuration, and admin tools.
 */

import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { RouteModule } from '@presentation/routes/RouteModule';
import { AuthController } from '@presentation/controllers/AuthController';
import { ResearcherController } from '@presentation/controllers/ResearcherController';
import { AuditController } from '@presentation/controllers/AuditController';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { createRateLimitMiddleware } from '@middleware/RateLimiting';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { validateBody, validateParams } from '@middleware/Validation';
import {
  updateSecurityConfigSchema,
  createResearcherProfileSchema,
  adminResetPasswordRequestSchema
} from '@odysseus/shared-schemas';

export class AdminRouteModule implements RouteModule {
  private readonly rateLimitMiddleware: RequestHandler;

  constructor(
    private readonly authController: AuthController,
    private readonly researcherController: ResearcherController,
    private readonly auditController: AuditController,
    private readonly authMiddleware: AuthMiddleware,
    configurationRepository: ConfigurationRepository
  ) {
    // Create rate limit middleware with injected repository
    this.rateLimitMiddleware = createRateLimitMiddleware(configurationRepository);
  }

  getBasePath(): string {
    return '/api/admin';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate,
      this.authMiddleware.requireAdmin, // Admin-only middleware
      this.rateLimitMiddleware
    ];
  }

  configure(router: Router): void {
    // USER MANAGEMENT ENDPOINTS

    router.get('/users',
      this.authController.getAllUsers.bind(this.authController)
    );

    // USER APPROVAL ENDPOINTS (must come before /users/:id to avoid route collision)

    router.get('/users/pending',
      this.authController.getPendingUsers.bind(this.authController)
    );

    router.post('/users/:userId/approve',
      validateParams(z.object({ userId: z.string() })),
      this.authController.approveUser.bind(this.authController)
    );

    router.post('/users/:userId/reject',
      validateParams(z.object({ userId: z.string() })),
      this.authController.rejectUser.bind(this.authController)
    );

    router.post('/users/:userId/link-researcher',
      validateParams(z.object({ userId: z.string() })),
      validateBody(z.object({
        researcherId: z.string().optional(),
        newResearcher: createResearcherProfileSchema.optional()
      }).refine(data => data.researcherId || data.newResearcher, {
        message: 'Must provide either researcherId or newResearcher'
      })),
      this.authController.linkResearcherToUser.bind(this.authController)
    );

    router.post('/users/:userId/unlink-researcher',
      validateParams(z.object({ userId: z.string() })),
      this.authController.unlinkResearcherFromUser.bind(this.authController)
    );

    // USER CRUD ENDPOINTS (parameterized routes come after specific routes)

    router.get('/users/:id',
      validateParams(z.object({ id: z.string() })),
      this.authController.getUserById.bind(this.authController)
    );

    router.put('/users/:id/role',
      validateParams(z.object({ id: z.string() })),
      validateBody(z.object({ role: z.enum(['admin', 'user']) })),
      this.authController.updateUserRole.bind(this.authController)
    );

    router.delete('/users/:id',
      validateParams(z.object({ id: z.string() })),
      this.authController.deleteUser.bind(this.authController)
    );

    // PASSWORD RESET ENDPOINTS (admin-initiated)

    router.post('/users/:userId/reset-password',
      validateParams(z.object({ userId: z.string() })),
      validateBody(adminResetPasswordRequestSchema),
      this.authController.adminResetPassword.bind(this.authController)
    );

    router.post('/users/:userId/generate-reset-token',
      validateParams(z.object({ userId: z.string() })),
      this.authController.generatePasswordResetToken.bind(this.authController)
    );

    // RESEARCHER MANAGEMENT ENDPOINTS

    // Get unlinked researchers (for user linking interface) - must come before /researchers
    router.get('/researchers/unlinked',
      this.researcherController.getUnlinkedResearchers.bind(this.researcherController)
    );

    // Get researchers with admin metadata (tube counts, linked users)
    router.get('/researchers',
      this.researcherController.getResearchersWithMetadata.bind(this.researcherController)
    );

    // Delete researcher (safe deletion only - no tubes, no linked user)
    router.delete('/researchers/:researcherId',
      validateParams(z.object({ researcherId: z.string() })),
      this.researcherController.deleteResearcher.bind(this.researcherController)
    );

    // SECURITY & CONFIGURATION ENDPOINTS

    router.get('/security-config',
      this.authController.getSecurityConfig.bind(this.authController)
    );

    router.put('/security-config',
      validateBody(updateSecurityConfigSchema), // Validate with proper schema
      this.authController.updateSecurityConfig.bind(this.authController)
    );

    // METRICS & MONITORING ENDPOINTS

    router.get('/metrics',
      this.authController.getMetrics.bind(this.authController)
    );

    router.get('/sync-status',
      this.authController.getSyncStatus.bind(this.authController)
    );

    router.get('/stats/users',
      this.authController.getUserStatistics.bind(this.authController)
    );

    // AUDIT LOG ENDPOINTS

    // Get audit statistics (for dashboard)
    router.get('/audit/statistics',
      this.auditController.getStatistics.bind(this.auditController)
    );

    // Get entity history (must come before general audit route to avoid collision)
    router.get('/audit/entity/:entityType/:entityId',
      validateParams(z.object({
        entityType: z.string(),
        entityId: z.string()
      })),
      this.auditController.getEntityHistory.bind(this.auditController)
    );

    // Get full audit log with filtering
    router.get('/audit',
      this.auditController.getAuditLog.bind(this.auditController)
    );

    // DATABASE MANAGEMENT

    router.get('/database/status',
      this.getDatabaseStatus.bind(this)
    );
  }

  private async getDatabaseStatus(req: any, res: any): Promise<void> {
    res.json({
      success: true,
      data: {
        type: 'SQLite',
        status: 'connected',
        timestamp: new Date().toISOString()
      }
    });
  }
}
