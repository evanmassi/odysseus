import { Router } from 'express';
import { UserController } from '@presentation/controllers/UserController';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { RouteModule } from '@presentation/routes/RouteModule';

/**
 * User Route Module
 *
 * Handles user-related HTTP routes (settings, profile, etc.)
 * All routes require authentication.
 */
export class UserRouteModule implements RouteModule {
  constructor(
    private userController: UserController,
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
  getMiddleware(): any[] {
    return [
      this.authMiddleware.authenticate.bind(this.authMiddleware)
    ];
  }

  /**
   * Configure routes on the provided router
   */
  configure(router: Router): void {
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
  }

  /**
   * Get route count for monitoring
   */
  getRouteCount(): number {
    return 2; // Total number of routes configured
  }
}
