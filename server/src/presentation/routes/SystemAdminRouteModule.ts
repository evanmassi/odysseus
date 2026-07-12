/**
 * System Admin Route Module
 *
 * Routes for system-wide administration — lab management, invite codes,
 * global security settings, and cross-lab overview. Requires system_admin role.
 */

import { updateSecurityConfigSchema, updateDemoLimitsSchema, bulkRevokeSessionsRequestSchema } from '@odysseus/shared-schemas';


import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { AdminConfigController } from '@presentation/controllers/admin/AdminConfigController';
import type { AuditController } from '@presentation/controllers/AuditController';
import type { InviteCodeController } from '@presentation/controllers/InviteCodeController';
import type { LabController } from '@presentation/controllers/LabController';
import type { StorageController } from '@presentation/controllers/StorageController';
import type { SecurityMonitoringController } from '@presentation/controllers/system/SecurityMonitoringController';
import type { StorageAnalyticsController } from '@presentation/controllers/system/StorageAnalyticsController';
import type { SystemAdminUserController } from '@presentation/controllers/system/SystemAdminUserController';
import { createStrictRateLimiter } from '@presentation/middleware/apiRateLimiter';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  IdParams,
  LabIdParams,
  LabUserParams,
  CreateLabBodySchema,
  UpdateLabBodySchema,
  CreateInviteCodeBodySchema
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class SystemAdminRouteModule implements RouteModule {
  private readonly strictLimiter = createStrictRateLimiter();

  constructor(
    private readonly labController: LabController,
    private readonly inviteCodeController: InviteCodeController,
    private readonly adminConfigController: AdminConfigController,
    private readonly systemAdminUserController: SystemAdminUserController,
    private readonly configurationController: StorageController,
    private readonly auditController: AuditController,
    private readonly securityMonitoringController: SecurityMonitoringController,
    private readonly storageAnalyticsController: StorageAnalyticsController,
    private readonly authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/system';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate,
      this.authMiddleware.requireSystemAdmin,
    ];
  }

  configure(router: Router): void {
    // LAB MANAGEMENT

    router.get('/labs',
      this.labController.listLabs.bind(this.labController)
    );

    router.post('/labs',
      validateBody(CreateLabBodySchema),
      this.labController.createLab.bind(this.labController)
    );

    router.put('/labs/:id',
      validateParams(IdParams),
      validateBody(UpdateLabBodySchema),
      this.labController.updateLab.bind(this.labController)
    );

    router.post('/labs/:id/deactivate',
      validateParams(IdParams),
      this.labController.deactivateLab.bind(this.labController)
    );

    router.post('/labs/:id/activate',
      validateParams(IdParams),
      this.labController.activateLab.bind(this.labController)
    );

    // LAB DETAILS

    router.get('/labs/:labId/details',
      validateParams(LabIdParams),
      this.labController.getLabDetails.bind(this.labController)
    );

    // INVITE CODES (system admin can manage any lab's codes)

    router.post('/labs/:labId/invite-codes',
      validateParams(LabIdParams),
      validateBody(CreateInviteCodeBodySchema),
      this.inviteCodeController.create.bind(this.inviteCodeController)
    );

    // GLOBAL SECURITY SETTINGS

    router.put('/security-config',
      validateBody(updateSecurityConfigSchema),
      this.adminConfigController.updateSecurityConfig.bind(this.adminConfigController)
    );

    // CROSS-LAB OVERVIEW

    router.get('/overview',
      this.labController.getOverview.bind(this.labController)
    );

    // DEMO MANAGEMENT (system admin, explicit labId)

    router.post('/labs/:labId/demo/reset',
      validateParams(LabIdParams),
      this.strictLimiter,
      this.configurationController.resetDemoDataForLab.bind(this.configurationController)
    );

    router.post('/labs/:labId/demo/seed',
      validateParams(LabIdParams),
      this.strictLimiter,
      this.configurationController.seedDemoLab.bind(this.configurationController)
    );

    router.post('/labs/:labId/demo/unseed',
      validateParams(LabIdParams),
      this.strictLimiter,
      this.configurationController.unseedDemoLab.bind(this.configurationController)
    );

    router.get('/labs/:labId/demo/limits',
      validateParams(LabIdParams),
      this.labController.getDemoLimits.bind(this.labController)
    );

    router.put('/labs/:labId/demo/limits',
      validateParams(LabIdParams),
      validateBody(updateDemoLimitsSchema),
      this.labController.updateDemoLimits.bind(this.labController)
    );

    // LAB AUDIT LOG

    router.get('/labs/:labId/audit',
      validateParams(LabIdParams),
      this.auditController.getLabAuditLog.bind(this.auditController)
    );

    // CROSS-LAB USER MANAGEMENT

    router.post('/labs/:labId/users/:userId/activate',
      validateParams(LabUserParams),
      this.systemAdminUserController.activateUserForLab.bind(this.systemAdminUserController)
    );

    router.post('/labs/:labId/users/:userId/deactivate',
      validateParams(LabUserParams),
      this.systemAdminUserController.deactivateUserForLab.bind(this.systemAdminUserController)
    );

    router.post('/labs/:labId/users/:userId/suspend',
      validateParams(LabUserParams),
      this.systemAdminUserController.suspendUserForLab.bind(this.systemAdminUserController)
    );

    router.delete('/labs/:labId/users/:userId',
      validateParams(LabUserParams),
      this.systemAdminUserController.deleteUserForLab.bind(this.systemAdminUserController)
    );

    // SESSION & SECURITY MONITORING

    router.get('/security/overview',
      this.securityMonitoringController.getSecurityOverview.bind(this.securityMonitoringController)
    );

    router.get('/security/sessions',
      this.securityMonitoringController.getActiveSessions.bind(this.securityMonitoringController)
    );

    router.get('/security/ip-activity',
      this.securityMonitoringController.getIpActivity.bind(this.securityMonitoringController)
    );

    router.post('/security/purge-expired',
      this.strictLimiter,
      this.securityMonitoringController.purgeExpiredSessions.bind(this.securityMonitoringController)
    );

    router.get('/security/session-activity',
      this.securityMonitoringController.getSessionActivity.bind(this.securityMonitoringController)
    );

    router.get('/security/failed-logins',
      this.securityMonitoringController.getFailedLogins.bind(this.securityMonitoringController)
    );

    router.post('/security/sessions/bulk-revoke',
      this.strictLimiter,
      validateBody(bulkRevokeSessionsRequestSchema),
      this.securityMonitoringController.bulkRevokeSessions.bind(this.securityMonitoringController)
    );

    router.post('/security/sessions/:id/revoke',
      validateParams(IdParams),
      this.securityMonitoringController.revokeSession.bind(this.securityMonitoringController)
    );

    // STORAGE ANALYTICS

    router.get('/storage/analytics',
      this.storageAnalyticsController.getCrossLabStorageAnalytics.bind(this.storageAnalyticsController)
    );

    router.get('/labs/:labId/storage/analytics',
      validateParams(LabIdParams),
      this.storageAnalyticsController.getLabStorageAnalytics.bind(this.storageAnalyticsController)
    );
  }
}
