/**
 * Admin Route Module
 *
 * Routes requiring admin privileges — user management, security config, audit, exports.
 */

import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { RouteModule } from '@presentation/routes/RouteModule';
import { AdminUserController } from '@presentation/controllers/admin/AdminUserController';
import { AdminConfigController } from '@presentation/controllers/admin/AdminConfigController';
import { ResearcherController } from '@presentation/controllers/ResearcherController';
import { AuditController } from '@presentation/controllers/AuditController';
import { ExportController } from '@presentation/controllers/ExportController';
import { LookupValueController } from '@presentation/controllers/LookupValueController';
import { InviteCodeController } from '@presentation/controllers/InviteCodeController';
import { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import {
  updateSecurityConfigSchema,
  createResearcherProfileSchema,
  adminResetPasswordRequestSchema,
  createLookupValueRequestSchema,
  renameLookupValueRequestSchema
} from '@odysseus/shared-schemas';

export class AdminRouteModule implements RouteModule {
  constructor(
    private readonly adminUserController: AdminUserController,
    private readonly adminConfigController: AdminConfigController,
    private readonly researcherController: ResearcherController,
    private readonly auditController: AuditController,
    private readonly exportController: ExportController,
    private readonly lookupValueController: LookupValueController,
    private readonly inviteCodeController: InviteCodeController,
    private readonly authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/admin';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate,
      this.authMiddleware.requireAdmin
    ];
  }

  configure(router: Router): void {
    // USER MANAGEMENT ENDPOINTS

    router.get('/users',
      this.adminUserController.getAllUsers.bind(this.adminUserController)
    );

    // USER APPROVAL ENDPOINTS (must come before /users/:id to avoid route collision)

    router.get('/users/pending',
      this.adminUserController.getPendingUsers.bind(this.adminUserController)
    );

    router.post('/users/:userId/approve',
      validateParams(z.object({ userId: z.string() })),
      this.adminUserController.approveUser.bind(this.adminUserController)
    );

    router.post('/users/:userId/reject',
      validateParams(z.object({ userId: z.string() })),
      this.adminUserController.rejectUser.bind(this.adminUserController)
    );

    router.post('/users/:userId/deactivate',
      validateParams(z.object({ userId: z.string() })),
      this.adminUserController.deactivateUser.bind(this.adminUserController)
    );

    router.post('/users/:userId/activate',
      validateParams(z.object({ userId: z.string() })),
      this.adminUserController.activateUser.bind(this.adminUserController)
    );

    router.post('/users/:userId/link-researcher',
      validateParams(z.object({ userId: z.string() })),
      validateBody(z.object({
        researcherId: z.string().optional(),
        newResearcher: createResearcherProfileSchema.optional()
      }).refine(data => data.researcherId || data.newResearcher, {
        message: 'Must provide either researcherId or newResearcher'
      })),
      this.adminUserController.linkResearcherToUser.bind(this.adminUserController)
    );

    router.post('/users/:userId/unlink-researcher',
      validateParams(z.object({ userId: z.string() })),
      this.adminUserController.unlinkResearcherFromUser.bind(this.adminUserController)
    );

    // USER CRUD ENDPOINTS (parameterized routes come after specific routes)

    router.get('/users/:id',
      validateParams(z.object({ id: z.string() })),
      this.adminUserController.getUserById.bind(this.adminUserController)
    );

    router.put('/users/:id/role',
      validateParams(z.object({ id: z.string() })),
      validateBody(z.object({ role: z.enum(['lab_admin', 'user']) })),
      this.adminUserController.updateUserRole.bind(this.adminUserController)
    );

    router.delete('/users/:id',
      validateParams(z.object({ id: z.string() })),
      this.adminUserController.deleteUser.bind(this.adminUserController)
    );

    // PASSWORD RESET ENDPOINTS (admin-initiated)

    router.post('/users/:userId/reset-password',
      validateParams(z.object({ userId: z.string() })),
      validateBody(adminResetPasswordRequestSchema),
      this.adminUserController.adminResetPassword.bind(this.adminUserController)
    );

    router.post('/users/:userId/generate-reset-token',
      validateParams(z.object({ userId: z.string() })),
      this.adminUserController.generatePasswordResetToken.bind(this.adminUserController)
    );

    // RESEARCHER MANAGEMENT ENDPOINTS

    // Must come before /researchers to avoid route collision
    router.get('/researchers/unlinked',
      this.researcherController.getUnlinkedResearchers.bind(this.researcherController)
    );

    router.get('/researchers',
      this.researcherController.getResearchersWithMetadata.bind(this.researcherController)
    );

    router.delete('/researchers/:researcherId',
      validateParams(z.object({ researcherId: z.string() })),
      this.researcherController.deleteResearcher.bind(this.researcherController)
    );

    // SECURITY & CONFIGURATION ENDPOINTS

    router.get('/security-config',
      this.adminConfigController.getSecurityConfig.bind(this.adminConfigController)
    );

    router.put('/security-config',
      validateBody(updateSecurityConfigSchema),
      this.adminConfigController.updateSecurityConfig.bind(this.adminConfigController)
    );

    // METRICS & MONITORING ENDPOINTS

    router.get('/metrics',
      this.adminConfigController.getMetrics.bind(this.adminConfigController)
    );

    router.get('/stats/users',
      this.adminConfigController.getUserStatistics.bind(this.adminConfigController)
    );

    // AUDIT LOG ENDPOINTS

    router.get('/audit/statistics',
      this.auditController.getStatistics.bind(this.auditController)
    );

    // Must come before /audit to avoid route collision
    router.get('/audit/entity/:entityType/:entityId',
      validateParams(z.object({
        entityType: z.string(),
        entityId: z.string()
      })),
      this.auditController.getEntityHistory.bind(this.auditController)
    );

    router.get('/audit',
      this.auditController.getAuditLog.bind(this.auditController)
    );

    // AUDIT RETENTION ENDPOINTS

    router.get('/audit/retention/metrics',
      this.auditController.getRetentionMetrics.bind(this.auditController)
    );

    router.get('/audit/retention/policy',
      this.auditController.getRetentionPolicy.bind(this.auditController)
    );

    router.get('/audit/retention/export',
      this.auditController.exportArchivedLogs.bind(this.auditController)
    );

    router.post('/audit/retention/archive',
      this.auditController.runManualArchival.bind(this.auditController)
    );

    router.get('/audit/search',
      this.auditController.searchAuditLogs.bind(this.auditController)
    );

    // DATA EXPORT ENDPOINTS

    router.get('/export/tubes',
      this.exportController.exportTubes.bind(this.exportController)
    );

    router.get('/export/users',
      this.exportController.exportUsers.bind(this.exportController)
    );

    router.get('/export/researchers',
      this.exportController.exportResearchers.bind(this.exportController)
    );

    router.get('/export/system-backup',
      this.exportController.exportSystemBackup.bind(this.exportController)
    );

    // LOOKUP VALUE MANAGEMENT (admin catalog)

    router.get('/lookups/:category',
      validateParams(z.object({ category: z.string() })),
      this.lookupValueController.getAllValues.bind(this.lookupValueController)
    );

    router.post('/lookups',
      validateBody(createLookupValueRequestSchema),
      this.lookupValueController.createValue.bind(this.lookupValueController)
    );

    router.put('/lookups/:id/rename',
      validateParams(z.object({ id: z.string() })),
      validateBody(renameLookupValueRequestSchema),
      this.lookupValueController.renameValue.bind(this.lookupValueController)
    );

    router.delete('/lookups/:id',
      validateParams(z.object({ id: z.string() })),
      this.lookupValueController.deleteValue.bind(this.lookupValueController)
    );

    // INVITE CODE MANAGEMENT (lab admin — scoped to their own lab)

    router.get('/invite-codes',
      this.inviteCodeController.listForCurrentLab.bind(this.inviteCodeController)
    );

    router.post('/invite-codes',
      validateBody(z.object({
        role: z.enum(['lab_admin', 'user']).optional(),
        maxUses: z.number().int().positive().optional(),
        expiresAt: z.string().optional(),
      })),
      this.inviteCodeController.createForCurrentLab.bind(this.inviteCodeController)
    );

    router.delete('/invite-codes/:id',
      validateParams(z.object({ id: z.string() })),
      this.inviteCodeController.deactivate.bind(this.inviteCodeController)
    );
  }
}
