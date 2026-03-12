/**
 * Lookup Value Controller
 *
 * HTTP handlers for admin-managed dropdown values (species, source).
 */

import { Request, Response } from 'express';
import { BaseController } from '@presentation/controllers/BaseController';
import { LookupValueApplicationService } from '@application/services/LookupValueApplicationService';
import { StorageRepository } from '@domain/repositories/StorageRepository';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import { ValidationError } from '@domain/errors/ValidationError';
import { handleControllerError } from '@presentation/utils/errorHandler';
import type { LookupCategory } from '@domain/entities/LookupValue';

export class LookupValueController extends BaseController {
  constructor(
    private lookupValueService: LookupValueApplicationService,
    private storageRepository: StorageRepository
  ) {
    super();
  }

  private async rejectIfSeededDemo(req: Request): Promise<void> {
    const user = this.getAuthenticatedUser(req);
    if (user.isSystemAdmin()) return;
    if (!user.isDemo) return;

    const config = await this.storageRepository.getForLab(this.extractLabId(req));
    if (config?.hasAnySeededResources()) {
      throw new ValidationError('Catalog is locked in seeded demo mode');
    }
  }

  /** GET /api/lookups/:category — active values for form dropdowns */
  async getActiveValues(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const category = req.params.category as LookupCategory;
      const values = await this.lookupValueService.getActiveByCategory(labId, category);
      res.json(ResponseBuilder.success(values));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get active lookup values', req.requestId);
    }
  }

  /** GET /api/admin/lookups/:category — all values with tube counts for admin */
  async getAllValues(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const category = req.params.category as LookupCategory;
      const values = await this.lookupValueService.getAllByCategory(labId, category);
      res.json(ResponseBuilder.success(values));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get all lookup values', req.requestId);
    }
  }

  /** POST /api/admin/lookups — create new value */
  async createValue(req: Request, res: Response): Promise<void> {
    try {
      await this.rejectIfSeededDemo(req);
      const labId = this.extractLabId(req);
      const { category, value } = req.body;
      const created = await this.lookupValueService.create(labId, category, value);
      res.status(201).json(ResponseBuilder.success(created));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create lookup value', req.requestId);
    }
  }

  /** PUT /api/admin/lookups/:id/rename — rename value (cascades to tubes) */
  async renameValue(req: Request, res: Response): Promise<void> {
    try {
      await this.rejectIfSeededDemo(req);
      const labId = this.extractLabId(req);
      const { id } = req.params;
      const { newValue } = req.body;
      const updated = await this.lookupValueService.rename(labId, id, newValue);
      res.json(ResponseBuilder.success(updated));
    } catch (error) {
      handleControllerError(error, res, 'Failed to rename lookup value', req.requestId);
    }
  }

  /** DELETE /api/admin/lookups/:id — delete value (blocked if tubes reference it) */
  async deleteValue(req: Request, res: Response): Promise<void> {
    try {
      await this.rejectIfSeededDemo(req);
      const labId = this.extractLabId(req);
      const { id } = req.params;
      await this.lookupValueService.delete(labId, id);
      res.json(ResponseBuilder.success({ deleted: true }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete lookup value', req.requestId);
    }
  }
}
