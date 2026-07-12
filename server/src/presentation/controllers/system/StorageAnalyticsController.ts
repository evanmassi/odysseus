/**
 * Storage Analytics Controller
 *
 * System admin and lab admin endpoints for storage capacity and utilization analytics.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import type { StorageAnalyticsApplicationService } from '@application/services/StorageAnalyticsApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface StorageAnalyticsControllerDeps {
  storageAnalyticsService: StorageAnalyticsApplicationService;
}

export class StorageAnalyticsController extends BaseController {
  constructor(private deps: StorageAnalyticsControllerDeps) {
    super();
  }

  async getLabStorageAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const labId = req.params.labId ?? user.labId;
      if (!labId) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.REQUIRED_FIELD_MISSING, 'Lab context required'));
        return;
      }

      const result = await this.deps.storageAnalyticsService.getLabAnalytics(labId);
      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get storage analytics', req.requestId);
    }
  }

  async getCrossLabStorageAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.deps.storageAnalyticsService.getCrossLabAnalytics();
      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get cross-lab storage analytics', req.requestId);
    }
  }
}
