/**
 * Person Controller
 *
 * Handles profile management for the authenticated user.
 */

import type { PersonApplicationService } from '@application/services/PersonApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface PersonControllerDeps {
  personApplicationService: PersonApplicationService;
}

export class PersonController extends BaseController {
  constructor(private deps: PersonControllerDeps) {
    super();
  }

  /** GET /api/users/me/profile */
  async getMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const profile = await this.deps.personApplicationService.getMyProfile(user);
      res.status(200).json(ResponseBuilder.success(profile));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get profile');
    }
  }

  /** PUT /api/users/me/profile */
  async updateMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const profile = await this.deps.personApplicationService.updateMyProfile(user, req.body);
      res.status(200).json(ResponseBuilder.success(profile));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update profile');
    }
  }
}
