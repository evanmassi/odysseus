import { Request, Response } from 'express';
import {
  UpdateUserSettingsCommandHandler,
  GetUserSettingsQueryHandler
} from '@application/commands/UserCommands';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { handleControllerError } from '@presentation/utilities/ErrorHandler';
import { userSettingsSchema, userLookupRequestSchema } from '@odysseus/shared-schemas';
import { BaseController } from '@presentation/controllers/BaseController';

/**
 * User Controller
 *
 * Handles user-related HTTP requests (settings, profile, lookup, etc.)
 */
export class UserController extends BaseController {
  constructor(
    private updateUserSettingsHandler: UpdateUserSettingsCommandHandler,
    private getUserSettingsHandler: GetUserSettingsQueryHandler,
    private userRepository: UserRepository,
    private personRepository: PersonRepository
  ) {
    super();
  }

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
      handleControllerError(error, res, 'Failed to get user settings');
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
      handleControllerError(error, res, 'Failed to update user settings');
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
      handleControllerError(error, res, 'Failed to lookup users');
    }
  }

  /**
   * GET /api/users/list
   * Get all active, approved users for sharing/assignment
   * Access: Any authenticated user
   *
   * Returns minimal display info for user selection dropdowns.
   */
  async listActiveUsers(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);

      const allUsers = await this.userRepository.findByStatus('approved');

      const users = allUsers.filter(u => u.labId === authenticatedUser.labId);

      // Collect all personIds for batch lookup
      const personIds = users
        .map(u => u.toPublicData().personId)
        .filter((id): id is string => id != null);

      // Batch fetch all persons
      const persons = await this.personRepository.findByIds(personIds);
      const personMap = new Map(persons.map(p => [p.id, p]));

      // Build response with minimal display info
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
      handleControllerError(error, res, 'Failed to list active users');
    }
  }

}
