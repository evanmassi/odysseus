/**
 * User Settings and Lookup Controller
 *
 * HTTP handlers for user settings CRUD and user display-info lookups.
 */

import { userSettingsSchema, userLookupRequestSchema } from '@odysseus/shared-schemas';


import type { UpdateUserSettingsCommandHandler } from '@application/commands/UserCommands';
import type { GetUserSettingsQueryHandler } from '@application/queries/UserQueries';
import type { User } from '@domain/entities/User';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';
export interface UserControllerDeps {
  updateUserSettingsHandler: UpdateUserSettingsCommandHandler;
  getUserSettingsHandler: GetUserSettingsQueryHandler;
  userRepository: UserRepository;
  personRepository: PersonRepository;
}

export class UserController extends BaseController {
  constructor(private deps: UserControllerDeps) {
    super();
  }

  /** GET /api/users/me/settings */
  async getCurrentUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const settings = await this.deps.getUserSettingsHandler.handle({ userId });

      res.json(ResponseBuilder.success({ settings }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get user settings');
    }
  }

  /** PUT /api/users/me/settings */
  async updateCurrentUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const settings = userSettingsSchema.parse(req.body.settings);

      const updatedUser = await this.deps.updateUserSettingsHandler.handle({
        userId,
        settings,
      });

      res.json(ResponseBuilder.success({ settings: updatedUser.settings }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update user settings');
    }
  }

  /** POST /api/users/lookup — uses batch queries to avoid N+1 */
  async lookupUsers(req: Request, res: Response): Promise<void> {
    try {
      const { userIds } = userLookupRequestSchema.parse(req.body);
      const users = await this.deps.userRepository.findByIds(userIds);
      const displayUsers = await this.toDisplayUsers(users);

      res.json(ResponseBuilder.success({ users: displayUsers }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to lookup users');
    }
  }

  /** GET /api/users/list — minimal display info for user selection dropdowns */
  async listActiveUsers(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const allUsers = await this.deps.userRepository.findByStatus('approved');
      const users = allUsers.filter(u => u.labId === authenticatedUser.labId);
      const displayUsers = await this.toDisplayUsers(users);

      res.json(ResponseBuilder.success({ users: displayUsers }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list active users');
    }
  }

  private async toDisplayUsers(users: User[]) {
    const personIds = users
      .map(u => u.toPublicData().personId)
      .filter((id): id is string => id != null);

    const persons = await this.deps.personRepository.findByIds(personIds);
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
