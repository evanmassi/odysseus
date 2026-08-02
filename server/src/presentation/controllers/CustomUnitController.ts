/**
 * Custom Unit Controller
 *
 * HTTP handlers for the lab's custom units.
 */

import type { CustomUnitApplicationService } from '@application/services/CustomUnitApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface CustomUnitControllerDeps {
  customUnitService: CustomUnitApplicationService;
}

export class CustomUnitController extends BaseController {
  constructor(private deps: CustomUnitControllerDeps) {
    super();
  }

  async listCustomUnits(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const customUnits = await this.deps.customUnitService.list(labId);
      res.json(ResponseBuilder.success({ customUnits }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list custom units', req.requestId);
    }
  }

  async createCustomUnit(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const customUnit = await this.deps.customUnitService.create(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ customUnit }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create custom unit', req.requestId);
    }
  }

  async updateCustomUnit(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const customUnit = await this.deps.customUnitService.update(
        labId,
        req.params.unitId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ customUnit }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update custom unit', req.requestId);
    }
  }

  async deleteCustomUnit(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.customUnitService.delete(labId, req.params.unitId, user);
      res.json(ResponseBuilder.success({ message: 'Custom unit deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete custom unit', req.requestId);
    }
  }
}
