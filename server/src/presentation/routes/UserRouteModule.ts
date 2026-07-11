/**
 * User Route Module
 *
 * Authenticated routes for user settings, profile, sessions, and user lookups.
 */

import { userLookupRequestSchema } from '@odysseus/shared-schemas';

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { PersonController } from '@presentation/controllers/PersonController';
import type { UserController } from '@presentation/controllers/UserController';
import type { UserSessionController } from '@presentation/controllers/UserSessionController';
import { validateBody } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';

import type { Router, RequestHandler } from 'express';

export class UserRouteModule implements RouteModule {
  constructor(
    private userController: UserController,
    private personController: PersonController,
    private sessionController: UserSessionController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/users';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate.bind(this.authMiddleware)
    ];
  }

  configure(router: Router): void {

    router.get('/me/profile',
      this.personController.getMyProfile.bind(this.personController)
    );

    router.put('/me/profile',
      this.personController.updateMyProfile.bind(this.personController)
    );

    router.get('/me/settings',
      this.userController.getCurrentUserSettings.bind(this.userController)
    );

    router.put('/me/settings',
      this.userController.updateCurrentUserSettings.bind(this.userController)
    );

    router.get('/me/sessions',
      this.sessionController.getUserSessions.bind(this.sessionController)
    );

    router.delete('/me/sessions/:id',
      this.sessionController.revokeSession.bind(this.sessionController)
    );

    router.post('/lookup',
      validateBody(userLookupRequestSchema),
      this.userController.lookupUsers.bind(this.userController)
    );

    router.get('/list',
      this.userController.listActiveUsers.bind(this.userController)
    );
  }
}
