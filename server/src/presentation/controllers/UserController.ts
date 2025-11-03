import { Request, Response } from 'express';
import {
  UpdateUserSettingsCommandHandler,
  GetUserSettingsQueryHandler
} from '@application/commands/UserCommands';
import { userSettingsSchema } from '@odysseus/shared-schemas';

/**
 * User Controller
 *
 * Handles user-related HTTP requests (settings, profile, etc.)
 * Currently focused on user settings management.
 */
export class UserController {
  constructor(
    private updateUserSettingsHandler: UpdateUserSettingsCommandHandler,
    private getUserSettingsHandler: GetUserSettingsQueryHandler
  ) {}

  /**
   * GET /api/users/me/settings
   * Get current user's settings
   */
  async getCurrentUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);

      const settings = await this.getUserSettingsHandler.handle({ userId });

      res.json({
        success: true,
        settings,
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to get user settings');
    }
  }

  /**
   * PUT /api/users/me/settings
   * Update current user's settings
   */
  async updateCurrentUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);

      // Validate settings with Zod
      const settings = userSettingsSchema.parse(req.body.settings);

      const updatedUser = await this.updateUserSettingsHandler.handle({
        userId,
        settings,
      });

      res.json({
        success: true,
        settings: updatedUser.settings,
        message: 'User settings updated successfully',
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to update user settings');
    }
  }

  /**
   * Extract user ID from authenticated request
   */
  private extractUserId(req: Request): string {
    const user = (req as any).user;
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  /**
   * Handle errors and send appropriate HTTP response
   */
  private handleError(error: any, res: Response, message: string): void {
    console.error(`❌ [UserController] ${message}:`, error);

    // Zod validation errors
    if (error.name === 'ZodError') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid settings data',
          details: error.errors,
        },
      });
      return;
    }

    // Domain errors
    if (error.statusCode) {
      res.status(error.statusCode).json({
        error: {
          code: error.code || 'DOMAIN_ERROR',
          message: error.message || message,
        },
      });
      return;
    }

    // Generic errors
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || message,
      },
    });
  }
}
