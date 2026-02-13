/**
 * Lookup Value Controller
 *
 * HTTP handlers for admin-managed dropdown values (species, source).
 */

import { Request, Response } from 'express';
import { BaseController } from '@presentation/controllers/BaseController';
import { LookupValueApplicationService } from '@application/services/LookupValueApplicationService';
import { ErrorDto } from '@application/dto/ErrorDto';
import { handleControllerError } from '@presentation/utilities/ErrorHandler';
import type { LookupCategory } from '@domain/entities/LookupValue';

export class LookupValueController extends BaseController {
  constructor(private lookupValueService: LookupValueApplicationService) {
    super();
  }

  /** GET /api/lookups/:category — active values for form dropdowns */
  async getActiveValues(req: Request, res: Response): Promise<void> {
    try {
      const category = req.params.category as LookupCategory;
      const values = await this.lookupValueService.getActiveByCategory(category);
      res.json(ErrorDto.success(values));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get active lookup values', req.requestId);
    }
  }

  /** GET /api/admin/lookups/:category — all values with tube counts for admin */
  async getAllValues(req: Request, res: Response): Promise<void> {
    try {
      const category = req.params.category as LookupCategory;
      const values = await this.lookupValueService.getAllByCategory(category);
      res.json(ErrorDto.success(values));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get all lookup values', req.requestId);
    }
  }

  /** POST /api/admin/lookups — create new value */
  async createValue(req: Request, res: Response): Promise<void> {
    try {
      const { category, value } = req.body;
      const created = await this.lookupValueService.create(category, value);
      res.status(201).json(ErrorDto.success(created));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create lookup value', req.requestId);
    }
  }

  /** PUT /api/admin/lookups/:id/rename — rename value (cascades to tubes) */
  async renameValue(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newValue } = req.body;
      const updated = await this.lookupValueService.rename(id, newValue);
      res.json(ErrorDto.success(updated));
    } catch (error) {
      handleControllerError(error, res, 'Failed to rename lookup value', req.requestId);
    }
  }

  /** DELETE /api/admin/lookups/:id — delete value (blocked if tubes reference it) */
  async deleteValue(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.lookupValueService.delete(id);
      res.json(ErrorDto.success({ deleted: true }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete lookup value', req.requestId);
    }
  }
}
