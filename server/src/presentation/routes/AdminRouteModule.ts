/**
 * Admin Route Module
 *
 * Routes requiring admin privileges — user management, security config, audit, exports.
 */

import {
  updateSecurityConfigSchema,
  adminResetPasswordRequestSchema,
  createLookupValueRequestSchema,
  renameLookupValueRequestSchema
} from '@odysseus/shared-schemas';


import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import { createStrictRateLimiter } from '@presentation/middleware/apiRateLimiter';
import type { AdminConfigController } from '@presentation/controllers/admin/AdminConfigController';
import type { AdminUserController } from '@presentation/controllers/admin/AdminUserController';
import type { AuditController } from '@presentation/controllers/AuditController';
import type { ExportController } from '@presentation/controllers/ExportController';
import type { InviteCodeController } from '@presentation/controllers/InviteCodeController';
import type { LookupValueController } from '@presentation/controllers/LookupValueController';
import type { ResearcherController } from '@presentation/controllers/ResearcherController';
import type { StorageAnalyticsController } from '@presentation/controllers/system/StorageAnalyticsController';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  IdParams,
  UserIdParams,
  ResearcherIdParams,
  CategoryParams,
  EntityHistoryParams,
  UpdateRoleBodySchema,
  LinkResearcherBodySchema,
  CreateInviteCodeBodySchema
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class AdminRouteModule implements RouteModule {
  private readonly strictLimiter = createStrictRateLimiter();

  constructor(
    private readonly adminUserController: AdminUserController,
    private readonly adminConfigController: AdminConfigController,
    private readonly researcherController: ResearcherController,
    private readonly auditController: AuditController,
    private readonly exportController: ExportController,
    private readonly lookupValueController: LookupValueController,
    private readonly inviteCodeController: InviteCodeController,
    private readonly storageAnalyticsController: StorageAnalyticsController,
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

    // USER ACTIVATION ENDPOINTS (must come before /users/:id to avoid route collision)

    router.post('/users/:userId/approve',
      validateParams(UserIdParams),
      this.adminUserController.approveUser.bind(this.adminUserController)
    );

    router.post('/users/:userId/deactivate',
      validateParams(UserIdParams),
      this.adminUserController.deactivateUser.bind(this.adminUserController)
    );

    router.post('/users/:userId/activate',
      validateParams(UserIdParams),
      this.adminUserController.activateUser.bind(this.adminUserController)
    );

    router.post('/users/:userId/link-researcher',
      validateParams(UserIdParams),
      validateBody(LinkResearcherBodySchema),
      this.adminUserController.linkResearcherToUser.bind(this.adminUserController)
    );

    router.post('/users/:userId/unlink-researcher',
      validateParams(UserIdParams),
      this.adminUserController.unlinkResearcherFromUser.bind(this.adminUserController)
    );

    // USER CRUD ENDPOINTS (parameterized routes come after specific routes)

    router.get('/users/:id',
      validateParams(IdParams),
      this.adminUserController.getUserById.bind(this.adminUserController)
    );

    router.put('/users/:id/role',
      validateParams(IdParams),
      validateBody(UpdateRoleBodySchema),
      this.adminUserController.updateUserRole.bind(this.adminUserController)
    );

    router.delete('/users/:id',
      validateParams(IdParams),
      this.adminUserController.deleteUser.bind(this.adminUserController)
    );

    // PASSWORD RESET ENDPOINTS (admin-initiated)

    router.post('/users/:userId/reset-password',
      validateParams(UserIdParams),
      validateBody(adminResetPasswordRequestSchema),
      this.adminUserController.adminResetPassword.bind(this.adminUserController)
    );

    router.post('/users/:userId/generate-reset-token',
      validateParams(UserIdParams),
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
      validateParams(ResearcherIdParams),
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
      validateParams(EntityHistoryParams),
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
      this.strictLimiter,
      this.exportController.exportTubes.bind(this.exportController)
    );

    router.get('/export/users',
      this.strictLimiter,
      this.exportController.exportUsers.bind(this.exportController)
    );

    router.get('/export/researchers',
      this.strictLimiter,
      this.exportController.exportResearchers.bind(this.exportController)
    );

    router.get('/export/system-backup',
      this.strictLimiter,
      this.exportController.exportSystemBackup.bind(this.exportController)
    );

    // LOOKUP VALUE MANAGEMENT (admin catalog)

    router.get('/lookups/:category',
      validateParams(CategoryParams),
      this.lookupValueController.getAllValues.bind(this.lookupValueController)
    );

    router.post('/lookups',
      validateBody(createLookupValueRequestSchema),
      this.lookupValueController.createValue.bind(this.lookupValueController)
    );

    router.put('/lookups/:id/rename',
      validateParams(IdParams),
      validateBody(renameLookupValueRequestSchema),
      this.lookupValueController.renameValue.bind(this.lookupValueController)
    );

    router.delete('/lookups/:id',
      validateParams(IdParams),
      this.lookupValueController.deleteValue.bind(this.lookupValueController)
    );

    // INVITE CODE MANAGEMENT (lab admin — scoped to their own lab)

    router.get('/invite-codes',
      this.inviteCodeController.listForCurrentLab.bind(this.inviteCodeController)
    );

    router.post('/invite-codes',
      validateBody(CreateInviteCodeBodySchema),
      this.inviteCodeController.createForCurrentLab.bind(this.inviteCodeController)
    );

    router.delete('/invite-codes/:id',
      validateParams(IdParams),
      this.inviteCodeController.deactivate.bind(this.inviteCodeController)
    );

    // STORAGE ANALYTICS

    router.get('/storage/analytics',
      this.storageAnalyticsController.getLabStorageAnalytics.bind(this.storageAnalyticsController)
    );
  }
}
