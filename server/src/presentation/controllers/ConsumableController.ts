/**
 * Consumable Controller
 *
 * HTTP handlers for consumable categories, locations, products, documents,
 * barcodes, stock operations, and bulk actions.
 */

import type { ConsumableApplicationService } from '@application/services/ConsumableApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface ConsumableControllerDeps {
  consumableApplicationService: ConsumableApplicationService;
}

export class ConsumableController extends BaseController {
  constructor(private deps: ConsumableControllerDeps) {
    super();
  }

  // Categories

  async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const categories = await this.deps.consumableApplicationService.listCategories(labId);
      res.json(ResponseBuilder.success({ categories }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list consumable categories', req.requestId);
    }
  }

  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const category = await this.deps.consumableApplicationService.createCategory(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ category }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create consumable category', req.requestId);
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const category = await this.deps.consumableApplicationService.updateCategory(labId, req.params.categoryId, req.body, user);
      res.json(ResponseBuilder.success({ category }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update consumable category', req.requestId);
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.consumableApplicationService.deleteCategory(labId, req.params.categoryId, user);
      res.json(ResponseBuilder.success({ message: 'Category deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete consumable category', req.requestId);
    }
  }

  // Locations

  async listLocations(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const locations = await this.deps.consumableApplicationService.listLocations(labId);
      res.json(ResponseBuilder.success({ locations }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list consumable locations', req.requestId);
    }
  }

  async createLocation(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const location = await this.deps.consumableApplicationService.createLocation(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ location }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create consumable location', req.requestId);
    }
  }

  async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const location = await this.deps.consumableApplicationService.updateLocation(labId, req.params.locationId, req.body, user);
      res.json(ResponseBuilder.success({ location }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update consumable location', req.requestId);
    }
  }

  async deleteLocation(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.consumableApplicationService.deleteLocation(labId, req.params.locationId, user);
      res.json(ResponseBuilder.success({ message: 'Location deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete consumable location', req.requestId);
    }
  }

  // Products

  async listProducts(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const products = await this.deps.consumableApplicationService.listProducts(labId);
      res.json(ResponseBuilder.success({ products }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list consumable products', req.requestId);
    }
  }

  async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const detail = await this.deps.consumableApplicationService.getProduct(labId, req.params.id);
      res.json(ResponseBuilder.success(detail));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get consumable product', req.requestId);
    }
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const product = await this.deps.consumableApplicationService.createProduct(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ product }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create consumable product', req.requestId);
    }
  }

  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const product = await this.deps.consumableApplicationService.updateProduct(labId, req.params.id, req.body, user);
      res.json(ResponseBuilder.success({ product }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update consumable product', req.requestId);
    }
  }

  async archiveProduct(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.consumableApplicationService.archiveProduct(labId, req.params.id, user);
      res.json(ResponseBuilder.success({ message: 'Product archived' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to archive consumable product', req.requestId);
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.consumableApplicationService.deleteProduct(labId, req.params.id, user);
      res.json(ResponseBuilder.success({ message: 'Product deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete consumable product', req.requestId);
    }
  }

  // Documents

  async addDocument(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const document = await this.deps.consumableApplicationService.addDocument(labId, req.params.id, req.body, user);
      res.status(201).json(ResponseBuilder.success({ document }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add consumable document', req.requestId);
    }
  }

  async removeDocument(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.consumableApplicationService.removeDocument(labId, req.params.id, req.params.docId, user);
      res.json(ResponseBuilder.success({ message: 'Document removed' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to remove consumable document', req.requestId);
    }
  }

  // Barcodes

  async addBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const barcode = await this.deps.consumableApplicationService.addBarcode(labId, req.params.id, req.body, user);
      res.status(201).json(ResponseBuilder.success({ barcode }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add consumable barcode', req.requestId);
    }
  }

  async removeBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.consumableApplicationService.removeBarcode(labId, req.params.id, req.params.barcodeId, user);
      res.json(ResponseBuilder.success({ message: 'Barcode removed' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to remove consumable barcode', req.requestId);
    }
  }

  async resolveBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const value = req.query.value as string;
      if (!value) {
        res.status(400).json(ResponseBuilder.error('VALIDATION_ERROR', 'Barcode value is required'));
        return;
      }
      const product = await this.deps.consumableApplicationService.resolveBarcode(labId, value);
      res.json(ResponseBuilder.success({ product }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to resolve barcode', req.requestId);
    }
  }

  async regenerateInternalBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const barcode = await this.deps.consumableApplicationService.regenerateInternalBarcode(labId, req.params.id, user);
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
      const packagingLevel = await this.deps.consumableApplicationService.addPackagingLevel(labId, req.params.id, req.body, user);
      res.status(201).json(ResponseBuilder.success({ packagingLevel }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add packaging level', req.requestId);
    }
  }

  async updatePackagingLevel(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.consumableApplicationService.updatePackagingLevel(labId, req.params.id, req.params.levelId, req.body.quantity, user);
      res.json(ResponseBuilder.success({ message: 'Packaging level updated' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update packaging level', req.requestId);
    }
  }

  async removePackagingLevel(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.consumableApplicationService.removePackagingLevel(labId, req.params.id, req.params.levelId, user);
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
      const transaction = await this.deps.consumableApplicationService.recordTransaction(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ transaction }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to record consumable transaction', req.requestId);
    }
  }

  async recordStockCount(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const transaction = await this.deps.consumableApplicationService.recordStockCount(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ transaction }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to record stock count', req.requestId);
    }
  }

  async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const transactions = await this.deps.consumableApplicationService.getTransactionHistory(req.params.id);
      res.json(ResponseBuilder.success({ transactions }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get transaction history', req.requestId);
    }
  }

  // Bulk operations

  async bulkReceive(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const result = await this.deps.consumableApplicationService.bulkReceive(labId, req.body, user);
      const status = result.failed.length > 0 ? 207 : 201;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk receive consumables', req.requestId);
    }
  }

  async bulkConsume(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const result = await this.deps.consumableApplicationService.bulkConsume(labId, req.body, user);
      const status = result.failed.length > 0 ? 207 : 201;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk consume consumables', req.requestId);
    }
  }

  async bulkReassignCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { productIds, categoryId } = req.body;
      const result = await this.deps.consumableApplicationService.bulkReassignCategory(labId, productIds, categoryId, user);
      const status = result.failed.length > 0 ? 207 : 200;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk reassign consumable category', req.requestId);
    }
  }

  async bulkArchive(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { productIds } = req.body;
      const result = await this.deps.consumableApplicationService.bulkArchive(labId, productIds, user);
      const status = result.failed.length > 0 ? 207 : 200;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk archive consumables', req.requestId);
    }
  }

  // Reorder list

  async getReorderList(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const products = await this.deps.consumableApplicationService.getReorderList(labId);
      res.json(ResponseBuilder.success({ products }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get reorder list', req.requestId);
    }
  }
}
