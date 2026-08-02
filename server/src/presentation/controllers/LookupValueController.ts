/**
 * Lookup Value Controller
 *
 * HTTP handlers for lab lookup values — form dropdowns and admin catalog management.
 */

import type { LookupValueApplicationService } from '@application/services/LookupValueApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { LookupCategory } from '@odysseus/shared-schemas';
import type { Request, Response } from 'express';

export interface LookupValueControllerDeps {
  lookupValueService: LookupValueApplicationService;
}

export class LookupValueController extends BaseController {
  constructor(private deps: LookupValueControllerDeps) {
    super();
  }

  /** GET /api/lookups/:category — active values for form dropdowns */
  async getActiveValues(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const category = req.params.category as LookupCategory;
      const values = await this.deps.lookupValueService.getActiveByCategory(labId, category);
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
      const values = await this.deps.lookupValueService.getAllByCategory(labId, category);
      res.json(ResponseBuilder.success(values));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get all lookup values', req.requestId);
    }
  }

  /** POST /api/admin/lookups — create new value */
  async createValue(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { category, value } = req.body;
      const created = await this.deps.lookupValueService.create(labId, category, value, user);
      res.status(201).json(ResponseBuilder.success(created));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create lookup value', req.requestId);
    }
  }

  /** PUT /api/admin/lookups/:id/rename — rename value (cascades to tubes) */
  async renameValue(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { id } = req.params;
      const { newValue } = req.body;
      const updated = await this.deps.lookupValueService.rename(labId, id, newValue, user);
      res.json(ResponseBuilder.success(updated));
    } catch (error) {
      handleControllerError(error, res, 'Failed to rename lookup value', req.requestId);
    }
  }

  /** DELETE /api/admin/lookups/:id — delete value (blocked if tubes reference it) */
  async deleteValue(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { id } = req.params;
      await this.deps.lookupValueService.delete(labId, id, user);
      res.json(ResponseBuilder.success({ deleted: true }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete lookup value', req.requestId);
    }
  }
}
