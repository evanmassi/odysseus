/**
 * Location Controller
 *
 * HTTP handlers for the lab-wide location tree.
 */

import type { LocationApplicationService } from '@application/services/LocationApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface LocationControllerDeps {
  locationService: LocationApplicationService;
}

export class LocationController extends BaseController {
  constructor(private deps: LocationControllerDeps) {
    super();
  }

  async listLocations(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const locations = await this.deps.locationService.list(labId);
      res.json(ResponseBuilder.success({ locations }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list locations', req.requestId);
    }
  }

  async createLocation(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const location = await this.deps.locationService.create(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ location }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create location', req.requestId);
    }
  }

  async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const location = await this.deps.locationService.update(
        labId,
        req.params.locationId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ location }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update location', req.requestId);
    }
  }

  async deleteLocation(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.locationService.delete(labId, req.params.locationId, user);
      res.status(204).send();
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete location', req.requestId);
    }
  }
}
