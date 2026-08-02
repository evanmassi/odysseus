/**
 * Equipment Controller
 *
 * HTTP handlers for equipment categories, items, documents, and maintenance logs.
 */

import type { EquipmentApplicationService } from '@application/services/EquipmentApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface EquipmentControllerDeps {
  equipmentApplicationService: EquipmentApplicationService;
}

export class EquipmentController extends BaseController {
  constructor(private deps: EquipmentControllerDeps) {
    super();
  }

  // Categories

  async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const categories = await this.deps.equipmentApplicationService.listCategories(labId);
      res.json(ResponseBuilder.success({ categories }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list equipment categories', req.requestId);
    }
  }

  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const category = await this.deps.equipmentApplicationService.createCategory(
        labId,
        req.body,
        user
      );
      res.status(201).json(ResponseBuilder.success({ category }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create equipment category', req.requestId);
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const category = await this.deps.equipmentApplicationService.updateCategory(
        labId,
        req.params.categoryId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ category }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update equipment category', req.requestId);
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.equipmentApplicationService.deleteCategory(
        labId,
        req.params.categoryId,
        user
      );
      res.json(ResponseBuilder.success({ message: 'Category deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete equipment category', req.requestId);
    }
  }

  // Items

  async listItems(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const items = await this.deps.equipmentApplicationService.listItems(labId);
      res.json(ResponseBuilder.success({ items }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list equipment items', req.requestId);
    }
  }

  async getItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const detail = await this.deps.equipmentApplicationService.getItem(labId, req.params.id);
      res.json(ResponseBuilder.success(detail));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get equipment item', req.requestId);
    }
  }

  async createItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const item = await this.deps.equipmentApplicationService.createItem(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ item }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create equipment item', req.requestId);
    }
  }

  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const item = await this.deps.equipmentApplicationService.updateItem(
        labId,
        req.params.id,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ item }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update equipment item', req.requestId);
    }
  }

  async decommissionItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const item = await this.deps.equipmentApplicationService.decommissionItem(
        labId,
        req.params.id,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ item }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to decommission equipment item', req.requestId);
    }
  }

  async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.equipmentApplicationService.deleteItem(labId, req.params.id, user);
      res.json(ResponseBuilder.success({ message: 'Equipment item deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete equipment item', req.requestId);
    }
  }

  // Documents

  async addDocument(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const document = await this.deps.equipmentApplicationService.addDocument(
        labId,
        req.params.id,
        req.body,
        user
      );
      res.status(201).json(ResponseBuilder.success({ document }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add equipment document', req.requestId);
    }
  }

  async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const document = await this.deps.equipmentApplicationService.updateDocument(
        labId,
        req.params.id,
        req.params.docId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ document }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update equipment document', req.requestId);
    }
  }

  async removeDocument(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.equipmentApplicationService.removeDocument(
        labId,
        req.params.id,
        req.params.docId,
        user
      );
      res.json(ResponseBuilder.success({ message: 'Document removed' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to remove equipment document', req.requestId);
    }
  }

  // Bulk operations

  async bulkLogMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { itemIds, data } = req.body;
      const result = await this.deps.equipmentApplicationService.bulkLogMaintenance(
        labId,
        itemIds,
        data,
        user
      );
      const status = result.failed.length > 0 ? 207 : 201;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk log maintenance', req.requestId);
    }
  }

  async bulkChangeStatus(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { itemIds, data } = req.body;
      const result = await this.deps.equipmentApplicationService.bulkChangeStatus(
        labId,
        itemIds,
        data,
        user
      );
      const status = result.failed.length > 0 ? 207 : 201;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk change status', req.requestId);
    }
  }

  async bulkRelocate(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { itemIds, data } = req.body;
      const result = await this.deps.equipmentApplicationService.bulkRelocate(
        labId,
        itemIds,
        data,
        user
      );
      const status = result.failed.length > 0 ? 207 : 201;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk relocate equipment', req.requestId);
    }
  }

  // Maintenance log

  async addMaintenanceEntry(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const entry = await this.deps.equipmentApplicationService.addMaintenanceEntry(
        labId,
        req.params.id,
        req.body,
        user
      );
      res.status(201).json(ResponseBuilder.success({ entry }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add maintenance entry', req.requestId);
    }
  }

  async updateMaintenanceEntry(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const entry = await this.deps.equipmentApplicationService.updateMaintenanceEntry(
        labId,
        req.params.id,
        req.params.entryId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ entry }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update maintenance entry', req.requestId);
    }
  }

  async deleteMaintenanceEntry(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.equipmentApplicationService.deleteMaintenanceEntry(
        labId,
        req.params.id,
        req.params.entryId,
        user
      );
      res.json(ResponseBuilder.success({ message: 'Maintenance entry deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete maintenance entry', req.requestId);
    }
  }
  async setAttributeValue(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const attributeValues = await this.deps.equipmentApplicationService.setAttributeValue(
        labId,
        req.params.id,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ attributeValues }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to set attribute value', req.requestId);
    }
  }
}
