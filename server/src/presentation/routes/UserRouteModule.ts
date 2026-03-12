import { Router, RequestHandler } from 'express';
import { UserController } from '@presentation/controllers/UserController';
import { PersonController } from '@presentation/controllers/PersonController';
import { UserSessionController } from '@presentation/controllers/UserSessionController';
import { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import { RouteModule } from '@presentation/routes/RouteModule';
import { validateBody } from '@presentation/middleware/requestValidation';
import { userLookupRequestSchema } from '@odysseus/shared-schemas';

/**
 * User Route Module
 *
 * Handles user-related HTTP routes (settings, profile, sessions, etc.)
 * All routes require authentication.
 */
export class UserRouteModule implements RouteModule {
  constructor(
    private userController: UserController,
    private personController: PersonController,
    private sessionController: UserSessionController,
    private authMiddleware: AuthMiddleware
  ) {}

  /**
   * Get base path for user routes
   */
  getBasePath(): string {
    return '/api/users';
  }

  /**
   * Get middleware stack applied to all user routes
   */
  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate.bind(this.authMiddleware)
    ];
  }

  /**
   * Configure routes on the provided router
   */
  configure(router: Router): void {
    /**
     * GET /api/users/me/profile
     * Get current user's person profile
     *
     * Access: Any authenticated user
     * Used by: Frontend profile management UI
     */
    router.get('/me/profile',
      this.personController.getMyProfile.bind(this.personController)
    );

    /**
     * PUT /api/users/me/profile
     * Update current user's person profile
     *
     * Access: Any authenticated user
     * Used by: Frontend when user updates their profile
     */
    router.put('/me/profile',
      this.personController.updateMyProfile.bind(this.personController)
    );

    /**
     * GET /api/users/me/settings
     * Get current user's settings
     *
     * Access: Any authenticated user
     * Used by: Frontend user settings modal
     */
    router.get('/me/settings',
      this.userController.getCurrentUserSettings.bind(this.userController)
    );

    /**
     * PUT /api/users/me/settings
     * Update current user's settings
     *
     * Access: Any authenticated user
     * Used by: Frontend when user changes preferences
     */
    router.put('/me/settings',
      this.userController.updateCurrentUserSettings.bind(this.userController)
    );

    /**
     * GET /api/users/me/sessions
     * Get all active sessions for current user
     *
     * Access: Any authenticated user
     * Used by: Frontend security settings to display active sessions
     */
    router.get('/me/sessions',
      this.sessionController.getUserSessions.bind(this.sessionController)
    );

    /**
     * DELETE /api/users/me/sessions/:id
     * Revoke a specific session
     *
     * Access: Any authenticated user (can only revoke own sessions)
     * Used by: Frontend security settings to logout from specific device
     */
    router.delete('/me/sessions/:id',
      this.sessionController.revokeSession.bind(this.sessionController)
    );

    /**
     * DELETE /api/users/me/sessions/all
     * Revoke all other sessions (except current)
     *
     * Access: Any authenticated user
     * Used by: Frontend security settings "logout all other devices" button
     */
    router.delete('/me/sessions/all',
      this.sessionController.revokeAllOtherSessions.bind(this.sessionController)
    );

    /**
     * POST /api/users/lookup
     * Look up display info for multiple users by ID
     *
     * Access: Any authenticated user
     * Used by: Storage Management Modal for ownership display
     */
    router.post('/lookup',
      validateBody(userLookupRequestSchema),
      this.userController.lookupUsers.bind(this.userController)
    );

    /**
     * GET /api/users/list
     * Get all active, approved users for sharing/assignment
     *
     * Access: Any authenticated user
     * Used by: ShareAccessModal, StorageManagementModal dropdowns
     */
    router.get('/list',
      this.userController.listActiveUsers.bind(this.userController)
    );
  }

  /**
   * Get route count for monitoring
   */
  getRouteCount(): number {
    return 9; // Total number of routes configured
  }
}
