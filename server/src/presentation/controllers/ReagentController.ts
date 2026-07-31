/**
 * Reagent Controller
 *
 * HTTP handlers for reagent categories, locations, items, documents,
 * barcodes, per-lot stock operations, and bulk actions.
 */

import type { ReagentApplicationService } from '@application/services/ReagentApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface ReagentControllerDeps {
  reagentApplicationService: ReagentApplicationService;
}

export class ReagentController extends BaseController {
  constructor(private deps: ReagentControllerDeps) {
    super();
  }

  // Categories

  async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const categories = await this.deps.reagentApplicationService.listCategories(labId);
      res.json(ResponseBuilder.success({ categories }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list reagent categories', req.requestId);
    }
  }

  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const category = await this.deps.reagentApplicationService.createCategory(
        labId,
        req.body,
        user
      );
      res.status(201).json(ResponseBuilder.success({ category }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create reagent category', req.requestId);
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const category = await this.deps.reagentApplicationService.updateCategory(
        labId,
        req.params.categoryId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ category }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update reagent category', req.requestId);
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.reagentApplicationService.deleteCategory(labId, req.params.categoryId, user);
      res.json(ResponseBuilder.success({ message: 'Category deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete reagent category', req.requestId);
    }
  }

  // Items

  async listItems(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const items = await this.deps.reagentApplicationService.listItems(labId);
      res.json(ResponseBuilder.success({ items }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list reagent items', req.requestId);
    }
  }

  async getItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const detail = await this.deps.reagentApplicationService.getItem(labId, req.params.id);
      res.json(ResponseBuilder.success(detail));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get reagent item', req.requestId);
    }
  }

  async createItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const item = await this.deps.reagentApplicationService.createItem(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ item }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create reagent item', req.requestId);
    }
  }

  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const item = await this.deps.reagentApplicationService.updateItem(
        labId,
        req.params.id,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ item }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update reagent item', req.requestId);
    }
  }

  async archiveItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.reagentApplicationService.archiveItem(labId, req.params.id, user);
      res.json(ResponseBuilder.success({ message: 'Item archived' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to archive reagent item', req.requestId);
    }
  }

  async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.reagentApplicationService.deleteItem(labId, req.params.id, user);
      res.json(ResponseBuilder.success({ message: 'Item deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete reagent item', req.requestId);
    }
  }

  // Attribute values

  async setAttributeValue(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const attributeValues = await this.deps.reagentApplicationService.setAttributeValue(
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

  // Documents

  async addDocument(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const document = await this.deps.reagentApplicationService.addDocument(
        labId,
        req.params.id,
        req.body,
        user
      );
      res.status(201).json(ResponseBuilder.success({ document }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add reagent document', req.requestId);
    }
  }

  async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const document = await this.deps.reagentApplicationService.updateDocument(
        labId,
        req.params.id,
        req.params.docId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ document }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update reagent document', req.requestId);
    }
  }

  async removeDocument(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.reagentApplicationService.removeDocument(
        labId,
        req.params.id,
        req.params.docId,
        user
      );
      res.json(ResponseBuilder.success({ message: 'Document removed' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to remove reagent document', req.requestId);
    }
  }

  // Barcodes

  async addBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const barcode = await this.deps.reagentApplicationService.addBarcode(
        labId,
        req.params.id,
        req.body,
        user
      );
      res.status(201).json(ResponseBuilder.success({ barcode }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add reagent barcode', req.requestId);
    }
  }

  async updateBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const barcode = await this.deps.reagentApplicationService.updateBarcode(
        labId,
        req.params.id,
        req.params.barcodeId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ barcode }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update reagent barcode', req.requestId);
    }
  }

  async removeBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.reagentApplicationService.removeBarcode(
        labId,
        req.params.id,
        req.params.barcodeId,
        user
      );
      res.json(ResponseBuilder.success({ message: 'Barcode removed' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to remove reagent barcode', req.requestId);
    }
  }

  async regenerateInternalBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const barcode = await this.deps.reagentApplicationService.regenerateInternalBarcode(
        labId,
        req.params.id,
        user
      );
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
      const packagingLevel = await this.deps.reagentApplicationService.addPackagingLevel(
        labId,
        req.params.id,
        req.body,
        user
      );
      res.status(201).json(ResponseBuilder.success({ packagingLevel }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add packaging level', req.requestId);
    }
  }

  async removePackagingLevel(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.reagentApplicationService.removePackagingLevel(
        labId,
        req.params.id,
        req.params.levelId,
        user
      );
      res.json(ResponseBuilder.success({ message: 'Packaging level removed' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to remove packaging level', req.requestId);
    }
  }

  // Lots

  async updateLot(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const lot = await this.deps.reagentApplicationService.updateLot(
        labId,
        req.params.id,
        req.params.lotId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ lot }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update lot', req.requestId);
    }
  }

  // Stock operations

  async recordTransaction(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const transactions = await this.deps.reagentApplicationService.recordTransaction(
        labId,
        req.body,
        user
      );
      res.status(201).json(ResponseBuilder.success({ transactions }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to record reagent transaction', req.requestId);
    }
  }

  async recordStockCount(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const transactions = await this.deps.reagentApplicationService.recordStockCount(
        labId,
        req.body,
        user
      );
      res.status(201).json(ResponseBuilder.success({ transactions }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to record stock count', req.requestId);
    }
  }

  async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const transactions = await this.deps.reagentApplicationService.getTransactionHistory(
        labId,
        req.params.id
      );
      res.json(ResponseBuilder.success({ transactions }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get transaction history', req.requestId);
    }
  }

  async voidTransaction(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const result = await this.deps.reagentApplicationService.voidTransaction(
        labId,
        req.params.transactionId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to void reagent transaction', req.requestId);
    }
  }

  // Bulk operations

  async bulkReceive(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const result = await this.deps.reagentApplicationService.bulkReceive(labId, req.body, user);
      const status = result.failed.length > 0 ? 207 : 201;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk receive reagents', req.requestId);
    }
  }

  async bulkIssue(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const result = await this.deps.reagentApplicationService.bulkIssue(labId, req.body, user);
      const status = result.failed.length > 0 ? 207 : 201;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk issue reagents', req.requestId);
    }
  }

  async bulkReassignCategory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { itemIds, categoryId } = req.body;
      const result = await this.deps.reagentApplicationService.bulkReassignCategory(
        labId,
        itemIds,
        categoryId,
        user
      );
      const status = result.failed.length > 0 ? 207 : 200;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk reassign reagent category', req.requestId);
    }
  }

  async bulkArchive(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const { itemIds } = req.body;
      const result = await this.deps.reagentApplicationService.bulkArchive(labId, itemIds, user);
      const status = result.failed.length > 0 ? 207 : 200;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk archive reagents', req.requestId);
    }
  }

  async bulkVoidTransactions(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const result = await this.deps.reagentApplicationService.bulkVoidTransactions(
        labId,
        req.body,
        user
      );
      const status = result.failed.length > 0 ? 207 : 200;
      res.status(status).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk void reagent transactions', req.requestId);
    }
  }

  async bulkGetBarcodes(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const { itemIds } = req.body;
      const barcodes = await this.deps.reagentApplicationService.getBulkBarcodes(labId, itemIds);
      res.json(ResponseBuilder.success({ barcodes }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to fetch reagent barcodes', req.requestId);
    }
  }
}
