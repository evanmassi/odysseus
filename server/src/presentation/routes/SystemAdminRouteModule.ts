/**
 * System Admin Route Module
 *
 * Routes for system-wide administration — lab management, invite codes,
 * global security settings, and cross-lab overview. Requires system_admin role.
 */

import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { RouteModule } from '@presentation/routes/RouteModule';
import { LabController } from '@presentation/controllers/LabController';
import { InviteCodeController } from '@presentation/controllers/InviteCodeController';
import { AuthController } from '@presentation/controllers/AuthController';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { validateBody, validateParams } from '@middleware/Validation';
import { updateSecurityConfigSchema } from '@odysseus/shared-schemas';

export class SystemAdminRouteModule implements RouteModule {
  constructor(
    private readonly labController: LabController,
    private readonly inviteCodeController: InviteCodeController,
    private readonly authController: AuthController,
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
      validateBody(z.object({ name: z.string().min(1).max(200) })),
      this.labController.createLab.bind(this.labController)
    );

    router.put('/labs/:id',
      validateParams(z.object({ id: z.string() })),
      validateBody(z.object({ name: z.string().min(1).max(200) })),
      this.labController.updateLab.bind(this.labController)
    );

    router.post('/labs/:id/deactivate',
      validateParams(z.object({ id: z.string() })),
      this.labController.deactivateLab.bind(this.labController)
    );

    // INVITE CODES (system admin can manage any lab's codes)

    router.get('/labs/:labId/invite-codes',
      validateParams(z.object({ labId: z.string() })),
      this.inviteCodeController.listForLab.bind(this.inviteCodeController)
    );

    router.post('/labs/:labId/invite-codes',
      validateParams(z.object({ labId: z.string() })),
      validateBody(z.object({
        role: z.enum(['lab_admin', 'user']).optional(),
        maxUses: z.number().int().positive().optional(),
        expiresAt: z.string().optional(),
      })),
      this.inviteCodeController.create.bind(this.inviteCodeController)
    );

    // GLOBAL SECURITY SETTINGS

    router.get('/security-config',
      this.authController.getSecurityConfig.bind(this.authController)
    );

    router.put('/security-config',
      validateBody(updateSecurityConfigSchema),
      this.authController.updateSecurityConfig.bind(this.authController)
    );

    // CROSS-LAB OVERVIEW

    router.get('/overview',
      this.labController.getOverview.bind(this.labController)
    );
  }
}
