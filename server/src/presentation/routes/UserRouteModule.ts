/**
 * User Route Module
 *
 * Authenticated routes for user settings, profile, sessions, and user lookups.
 */

import { Router, RequestHandler } from 'express';
import { UserController } from '@presentation/controllers/UserController';
import { PersonController } from '@presentation/controllers/PersonController';
import { UserSessionController } from '@presentation/controllers/UserSessionController';
import { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import { RouteModule } from '@presentation/routes/RouteModule';
import { validateBody } from '@presentation/middleware/requestValidation';
import { userLookupRequestSchema } from '@odysseus/shared-schemas';

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
    // PROFILE

    router.get('/me/profile',
      this.personController.getMyProfile.bind(this.personController)
    );

    router.put('/me/profile',
      this.personController.updateMyProfile.bind(this.personController)
    );

    // SETTINGS

    router.get('/me/settings',
      this.userController.getCurrentUserSettings.bind(this.userController)
    );

    router.put('/me/settings',
      this.userController.updateCurrentUserSettings.bind(this.userController)
    );

    // SESSIONS

    router.get('/me/sessions',
      this.sessionController.getUserSessions.bind(this.sessionController)
    );

    router.delete('/me/sessions/:id',
      this.sessionController.revokeSession.bind(this.sessionController)
    );

    router.delete('/me/sessions/all',
      this.sessionController.revokeAllOtherSessions.bind(this.sessionController)
    );

    // USER LOOKUP

    router.post('/lookup',
      validateBody(userLookupRequestSchema),
      this.userController.lookupUsers.bind(this.userController)
    );

    router.get('/list',
      this.userController.listActiveUsers.bind(this.userController)
    );
  }
}
