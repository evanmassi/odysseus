/**
 * User Settings and Lookup Controller
 *
 * HTTP handlers for user settings CRUD and user display-info lookups.
 */

import { Request, Response } from 'express';
import { UpdateUserSettingsCommandHandler } from '@application/commands/UserCommands';
import { GetUserSettingsQueryHandler } from '@application/queries/UserQueries';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { userSettingsSchema, userLookupRequestSchema } from '@odysseus/shared-schemas';
import { BaseController } from '@presentation/controllers/BaseController';
import type { User } from '@domain/entities/User';
export class UserController extends BaseController {
  constructor(
    private updateUserSettingsHandler: UpdateUserSettingsCommandHandler,
    private getUserSettingsHandler: GetUserSettingsQueryHandler,
    private userRepository: UserRepository,
    private personRepository: PersonRepository
  ) {
    super();
  }

  /** GET /api/users/me/settings */
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

  /** PUT /api/users/me/settings */
  async updateCurrentUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
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

  /** POST /api/users/lookup — uses batch queries to avoid N+1 */
  async lookupUsers(req: Request, res: Response): Promise<void> {
    try {
      const { userIds } = userLookupRequestSchema.parse(req.body);
      const users = await this.userRepository.findByIds(userIds);
      const displayUsers = await this.toDisplayUsers(users);

      res.json({ success: true, users: displayUsers });
    } catch (error) {
      handleControllerError(error, res, 'Failed to lookup users');
    }
  }

  /** GET /api/users/list — minimal display info for user selection dropdowns */
  async listActiveUsers(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const allUsers = await this.userRepository.findByStatus('approved');
      const users = allUsers.filter(u => u.labId === authenticatedUser.labId);
      const displayUsers = await this.toDisplayUsers(users);

      res.json({ success: true, users: displayUsers });
    } catch (error) {
      handleControllerError(error, res, 'Failed to list active users');
    }
  }

  private async toDisplayUsers(users: User[]) {
    const personIds = users
      .map(u => u.toPublicData().personId)
      .filter((id): id is string => id != null);

    const persons = await this.personRepository.findByIds(personIds);
    const personMap = new Map(persons.map(p => [p.id, p]));

    return users.map(user => {
      const publicData = user.toPublicData();
      const person = publicData.personId ? personMap.get(publicData.personId) : null;

      return {
        id: publicData.id,
        username: publicData.username,
        firstName: person?.firstName,
        lastName: person?.lastName,
        hasResearcher: user.hasResearcherProfile(),
      };
    });
  }

}
