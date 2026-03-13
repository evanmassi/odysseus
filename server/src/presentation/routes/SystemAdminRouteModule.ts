/**
 * System Admin Route Module
 *
 * Routes for system-wide administration — lab management, invite codes,
 * global security settings, and cross-lab overview. Requires system_admin role.
 */

import { updateSecurityConfigSchema, updateDemoLimitsSchema } from '@odysseus/shared-schemas';


import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { AdminConfigController } from '@presentation/controllers/admin/AdminConfigController';
import type { AuditController } from '@presentation/controllers/AuditController';
import type { InviteCodeController } from '@presentation/controllers/InviteCodeController';
import type { LabController } from '@presentation/controllers/LabController';
import type { StorageController } from '@presentation/controllers/StorageController';
import type { SystemAdminUserController } from '@presentation/controllers/system/SystemAdminUserController';
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
  constructor(
    private readonly labController: LabController,
    private readonly inviteCodeController: InviteCodeController,
    private readonly adminConfigController: AdminConfigController,
    private readonly systemAdminUserController: SystemAdminUserController,
    private readonly configurationController: StorageController,
    private readonly auditController: AuditController,
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

    router.get('/labs/:labId/invite-codes',
      validateParams(LabIdParams),
      this.inviteCodeController.listForLab.bind(this.inviteCodeController)
    );

    router.post('/labs/:labId/invite-codes',
      validateParams(LabIdParams),
      validateBody(CreateInviteCodeBodySchema),
      this.inviteCodeController.create.bind(this.inviteCodeController)
    );

    // GLOBAL SECURITY SETTINGS

    router.get('/security-config',
      this.adminConfigController.getSecurityConfig.bind(this.adminConfigController)
    );

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
      this.configurationController.resetDemoDataForLab.bind(this.configurationController)
    );

    router.post('/labs/:labId/demo/seed',
      validateParams(LabIdParams),
      this.configurationController.seedDemoLab.bind(this.configurationController)
    );

    router.post('/labs/:labId/demo/unseed',
      validateParams(LabIdParams),
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
  }
}
