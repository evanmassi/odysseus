import { Request, Response } from 'express';
import {
  UpdateUserSettingsCommandHandler,
  GetUserSettingsQueryHandler
} from '@application/commands/UserCommands';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { userSettingsSchema, userLookupRequestSchema } from '@odysseus/shared-schemas';

/**
 * User Controller
 *
 * Handles user-related HTTP requests (settings, profile, lookup, etc.)
 */
export class UserController {
  constructor(
    private updateUserSettingsHandler: UpdateUserSettingsCommandHandler,
    private getUserSettingsHandler: GetUserSettingsQueryHandler,
    private userRepository: UserRepository,
    private personRepository: PersonRepository
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
   * POST /api/users/lookup
   * Look up display info for a list of user IDs
   * Access: Any authenticated user
   *
   * Uses batch queries to avoid N+1 performance issues.
   */
  async lookupUsers(req: Request, res: Response): Promise<void> {
    try {
      const { userIds } = userLookupRequestSchema.parse(req.body);

      // Batch fetch all users
      const users = await this.userRepository.findByIds(userIds);

      // Collect all personIds that need to be fetched
      const personIds = users
        .map(u => u.toPublicData().personId)
        .filter((id): id is string => id != null);

      // Batch fetch all persons in one query
      const persons = await this.personRepository.findByIds(personIds);
      const personMap = new Map(persons.map(p => [p.id, p]));

      // Build response with person names
      const displayUsers = users.map(user => {
        const publicData = user.toPublicData();
        const person = publicData.personId ? personMap.get(publicData.personId) : null;

        return {
          id: publicData.id,
          username: publicData.username,
          firstName: person?.firstName,
          lastName: person?.lastName,
        };
      });

      res.json({ success: true, users: displayUsers });
    } catch (error) {
      this.handleError(error, res, 'Failed to lookup users');
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
