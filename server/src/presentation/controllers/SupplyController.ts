/**
 * Supply Controller
 *
 * HTTP handlers for supply categories, locations, items, documents,
 * barcodes, stock operations, and bulk actions.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import type { SupplyApplicationService } from '@application/services/SupplyApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface SupplyControllerDeps {
  supplyApplicationService: SupplyApplicationService;
}

export class SupplyController extends BaseController {
  constructor(private deps: SupplyControllerDeps) {
    super();
  }

  // Categories

  async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const categories = await this.deps.supplyApplicationService.listCategories(labId);
      res.json(ResponseBuilder.success({ categories }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list supply categories', req.requestId);
    }
  }

  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const category = await this.deps.supplyApplicationService.createCategory(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ category }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create supply category', req.requestId);
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const category = await this.deps.supplyApplicationService.updateCategory(labId, req.params.categoryId, req.body, user);
      res.json(ResponseBuilder.success({ category }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update supply category', req.requestId);
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.supplyApplicationService.deleteCategory(labId, req.params.categoryId, user);
      res.json(ResponseBuilder.success({ message: 'Category deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete supply category', req.requestId);
    }
  }

  // Locations

  async listLocations(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const locations = await this.deps.supplyApplicationService.listLocations(labId);
      res.json(ResponseBuilder.success({ locations }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list supply locations', req.requestId);
    }
  }

  async createLocation(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const location = await this.deps.supplyApplicationService.createLocation(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ location }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create supply location', req.requestId);
    }
  }

  async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const location = await this.deps.supplyApplicationService.updateLocation(labId, req.params.locationId, req.body, user);
      res.json(ResponseBuilder.success({ location }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update supply location', req.requestId);
    }
  }

  async deleteLocation(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.supplyApplicationService.deleteLocation(labId, req.params.locationId, user);
      res.json(ResponseBuilder.success({ message: 'Location deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete supply location', req.requestId);
    }
  }

  // Items

  async listItems(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const items = await this.deps.supplyApplicationService.listItems(labId);
      res.json(ResponseBuilder.success({ items }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list supply items', req.requestId);
    }
  }

  async getItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const detail = await this.deps.supplyApplicationService.getItem(labId, req.params.id);
      res.json(ResponseBuilder.success(detail));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get supply item', req.requestId);
    }
  }

  async createItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const item = await this.deps.supplyApplicationService.createItem(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ item }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create supply item', req.requestId);
    }
  }

  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const item = await this.deps.supplyApplicationService.updateItem(labId, req.params.id, req.body, user);
      res.json(ResponseBuilder.success({ item }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update supply item', req.requestId);
    }
  }

  async archiveItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.supplyApplicationService.archiveItem(labId, req.params.id, user);
      res.json(ResponseBuilder.success({ message: 'Item archived' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to archive supply item', req.requestId);
    }
  }

  async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.supplyApplicationService.deleteItem(labId, req.params.id, user);
      res.json(ResponseBuilder.success({ message: 'Item deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete supply item', req.requestId);
    }
  }

  // Documents

  async addDocument(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const document = await this.deps.supplyApplicationService.addDocument(labId, req.params.id, req.body, user);
      res.status(201).json(ResponseBuilder.success({ document }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add supply document', req.requestId);
    }
  }

  async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const document = await this.deps.supplyApplicationService.updateDocument(
        labId, req.params.id, req.params.docId, req.body, user
      );
      res.json(ResponseBuilder.success({ document }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update supply document', req.requestId);
    }
  }

  async removeDocument(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.supplyApplicationService.removeDocument(labId, req.params.id, req.params.docId, user);
      res.json(ResponseBuilder.success({ message: 'Document removed' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to remove supply document', req.requestId);
    }
  }

  // Barcodes

  async addBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const barcode = await this.deps.supplyApplicationService.addBarcode(labId, req.params.id, req.body, user);
      res.status(201).json(ResponseBuilder.success({ barcode }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add supply barcode', req.requestId);
    }
  }

  async updateBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const barcode = await this.deps.supplyApplicationService.updateBarcode(
        labId, req.params.id, req.params.barcodeId, req.body, user
      );
      res.json(ResponseBuilder.success({ barcode }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update supply barcode', req.requestId);
    }
  }

  async removeBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.supplyApplicationService.removeBarcode(labId, req.params.id, req.params.barcodeId, user);
      res.json(ResponseBuilder.success({ message: 'Barcode removed' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to remove supply barcode', req.requestId);
    }
  }

  async resolveBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const value = req.query.value as string;
      if (!value) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.REQUIRED_FIELD_MISSING, 'Barcode value is required'));
        return;
      }
      const item = await this.deps.supplyApplicationService.resolveBarcode(labId, value);
      res.json(ResponseBuilder.success({ item }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to resolve barcode', req.requestId);
    }
  }

  async regenerateInternalBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const barcode = await this.deps.supplyApplicationService.regenerateInternalBarcode(labId, req.params.id, user);
      res.json(ResponseBuilder.success({ barcode }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to regenerate internal barcode', req.requestId);
    }
  }

  // Packaging levels

  async addPackagingLevel(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const packagingLevel = await this.deps.supplyApplicationService.addPackagingLevel(labId, req.params.id, req.body, user);
      res.status(201).json(ResponseBuilder.success({ packagingLevel }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add packaging level', req.requestId);
    }
  }

  async updatePackagingLevel(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.supplyApplicationService.updatePackagingLevel(labId, req.params.id, req.params.levelId, req.body.quantity, user);
      res.json(ResponseBuilder.success({ message: 'Packaging level updated' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update packaging level', req.requestId);
    }
  }

  async removePackagingLevel(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.supplyApplicationService.removePackagingLevel(labId, req.params.id, req.params.levelId, user);
      res.json(ResponseBuilder.success({ message: 'Packaging level removed' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to remove packaging level', req.requestId);
    }
  }

  // Stock operations

  async recordTransaction(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const transaction = await this.deps.supplyApplicationService.recordTransaction(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ transaction }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to record supply transaction', req.requestId);
    }
  }

  async recordStockCount(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const transaction = await this.deps.supplyApplicationService.recordStockCount(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ transaction }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to record stock count', req.requestId);
    }
  }

  async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const transactions = await this.deps.supplyApplicationService.getTransactionHistory(req.params.id);
      res.json(ResponseBuilder.success({ transactions }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get transaction history', req.requestId);
    }
  }

  async voidTransaction(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const result = await this.deps.supplyApplicationService.voidTransaction(
        labId, req.params.transactionId, req.body, user
      );
      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to void supply transaction', req.requestId);
    }
  }

  // Bulk operations

  async bulkReceive(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const result = await this.deps.supplyApplicationService.bulkReceive(labId, req.body, user);
      const status = result.failed.length > 0 ? 207 : 201;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk receive supplies', req.requestId);
    }
  }

  async bulkIssue(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const result = await this.deps.supplyApplicationService.bulkIssue(labId, req.body, user);
      const status = result.failed.length > 0 ? 207 : 201;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk issue supplies', req.requestId);
    }
  }

  async bulkReassignCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { itemIds, categoryId } = req.body;
      const result = await this.deps.supplyApplicationService.bulkReassignCategory(labId, itemIds, categoryId, user);
      const status = result.failed.length > 0 ? 207 : 200;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk reassign supply category', req.requestId);
    }
  }

  async bulkArchive(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { itemIds } = req.body;
      const result = await this.deps.supplyApplicationService.bulkArchive(labId, itemIds, user);
      const status = result.failed.length > 0 ? 207 : 200;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk archive supplies', req.requestId);
    }
  }

  async bulkVoidTransactions(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const result = await this.deps.supplyApplicationService.bulkVoidTransactions(labId, req.body, user);
      const status = result.failed.length > 0 ? 207 : 200;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk void supply transactions', req.requestId);
    }
  }

  async bulkGetBarcodes(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const { itemIds } = req.body;
      const barcodes = await this.deps.supplyApplicationService.getBulkBarcodes(labId, itemIds);
      res.json(ResponseBuilder.success({ barcodes }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to fetch supply barcodes', req.requestId);
    }
  }

  // Reorder list

  async getReorderList(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const items = await this.deps.supplyApplicationService.getReorderList(labId);
      res.json(ResponseBuilder.success({ items }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get reorder list', req.requestId);
    }
  }
}
