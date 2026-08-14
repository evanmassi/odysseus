/**
 * Supply Route Module
 *
 * Routes for supply categories, items, documents,
 * barcodes, stock operations, and bulk actions.
 */

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { SupplyController } from '@presentation/controllers/SupplyController';
import { createModerateRateLimiter } from '@presentation/middleware/apiRateLimiter';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  IdParams,
  SupplyCategoryIdParams,
  SupplyDocIdParams,
  SupplyBarcodeIdParams,
  CreateSupplyCategoryHttpSchema,
  UpdateSupplyCategoryHttpSchema,
  CreateSupplyItemHttpSchema,
  UpdateSupplyItemHttpSchema,
  CreateSupplyBarcodeHttpSchema,
  UpdateSupplyBarcodeHttpSchema,
  CreateSupplyDocumentHttpSchema,
  UpdateSupplyDocumentHttpSchema,
  RecordSupplyTransactionHttpSchema,
  RecordSupplyStockCountHttpSchema,
  SupplyBulkReceiveHttpSchema,
  SupplyBulkIssueHttpSchema,
  SupplyBulkReassignCategoryHttpSchema,
  SupplyBulkArchiveHttpSchema,
  SupplyBulkBarcodesHttpSchema,
  VoidSupplyTransactionHttpSchema,
  SupplyBulkVoidHttpSchema,
  SupplyTransactionVoidParams,
  SupplyPackagingLevelIdParams,
  SetAttributeValueHttpSchema,
  CreateSupplyPackagingLevelHttpSchema,
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class SupplyRouteModule implements RouteModule {
  // Bulk stock writes are the highest-throughput path in the catalog; label fetches are
  // left unthrottled so a legitimate bulk print run isn't capped.
  private readonly moderateLimiter = createModerateRateLimiter();

  constructor(
    private supplyController: SupplyController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/supplies';
  }

  getMiddleware(): RequestHandler[] {
    return [this.authMiddleware.authenticate.bind(this.authMiddleware)];
  }

  configure(router: Router): void {
    // Categories — registered before /:id to avoid matching as an ID

    router.get('/categories', this.supplyController.listCategories.bind(this.supplyController));

    router.post(
      '/categories',
      validateBody(CreateSupplyCategoryHttpSchema),
      this.supplyController.createCategory.bind(this.supplyController)
    );

    router.put(
      '/categories/:categoryId',
      validateParams(SupplyCategoryIdParams),
      validateBody(UpdateSupplyCategoryHttpSchema),
      this.supplyController.updateCategory.bind(this.supplyController)
    );

    router.delete(
      '/categories/:categoryId',
      validateParams(SupplyCategoryIdParams),
      this.supplyController.deleteCategory.bind(this.supplyController)
    );

    // Bulk operations — registered before /:id

    router.post(
      '/bulk/receive',
      this.moderateLimiter,
      validateBody(SupplyBulkReceiveHttpSchema),
      this.supplyController.bulkReceive.bind(this.supplyController)
    );

    router.post(
      '/bulk/issue',
      this.moderateLimiter,
      validateBody(SupplyBulkIssueHttpSchema),
      this.supplyController.bulkIssue.bind(this.supplyController)
    );

    router.post(
      '/bulk/reassign-category',
      this.moderateLimiter,
      validateBody(SupplyBulkReassignCategoryHttpSchema),
      this.supplyController.bulkReassignCategory.bind(this.supplyController)
    );

    router.post(
      '/bulk/archive',
      this.moderateLimiter,
      validateBody(SupplyBulkArchiveHttpSchema),
      this.supplyController.bulkArchive.bind(this.supplyController)
    );

    router.post(
      '/bulk/void',
      this.moderateLimiter,
      validateBody(SupplyBulkVoidHttpSchema),
      this.supplyController.bulkVoidTransactions.bind(this.supplyController)
    );

    router.post(
      '/bulk/barcodes',
      validateBody(SupplyBulkBarcodesHttpSchema),
      this.supplyController.bulkGetBarcodes.bind(this.supplyController)
    );

    // Stock operations (not scoped to an item)

    router.post(
      '/transactions',
      validateBody(RecordSupplyTransactionHttpSchema),
      this.supplyController.recordTransaction.bind(this.supplyController)
    );

    router.post(
      '/stock-counts',
      validateBody(RecordSupplyStockCountHttpSchema),
      this.supplyController.recordStockCount.bind(this.supplyController)
    );

    router.post(
      '/transactions/:transactionId/void',
      validateParams(SupplyTransactionVoidParams),
      validateBody(VoidSupplyTransactionHttpSchema),
      this.supplyController.voidTransaction.bind(this.supplyController)
    );

    // Items

    router.get('/', this.supplyController.listItems.bind(this.supplyController));

    router.post(
      '/',
      validateBody(CreateSupplyItemHttpSchema),
      this.supplyController.createItem.bind(this.supplyController)
    );

    router.get(
      '/:id',
      validateParams(IdParams),
      this.supplyController.getItem.bind(this.supplyController)
    );

    router.put(
      '/:id',
      validateParams(IdParams),
      validateBody(UpdateSupplyItemHttpSchema),
      this.supplyController.updateItem.bind(this.supplyController)
    );

    router.delete(
      '/:id',
      validateParams(IdParams),
      this.supplyController.deleteItem.bind(this.supplyController)
    );

    router.post(
      '/:id/archive',
      validateParams(IdParams),
      this.supplyController.archiveItem.bind(this.supplyController)
    );

    // Documents

    router.post(
      '/:id/documents',
      validateParams(IdParams),
      validateBody(CreateSupplyDocumentHttpSchema),
      this.supplyController.addDocument.bind(this.supplyController)
    );

    router.put(
      '/:id/documents/:docId',
      validateParams(SupplyDocIdParams),
      validateBody(UpdateSupplyDocumentHttpSchema),
      this.supplyController.updateDocument.bind(this.supplyController)
    );

    router.delete(
      '/:id/documents/:docId',
      validateParams(SupplyDocIdParams),
      this.supplyController.removeDocument.bind(this.supplyController)
    );

    // Barcodes

    router.post(
      '/:id/barcodes',
      validateParams(IdParams),
      validateBody(CreateSupplyBarcodeHttpSchema),
      this.supplyController.addBarcode.bind(this.supplyController)
    );

    router.post(
      '/:id/barcodes/regenerate-internal',
      validateParams(IdParams),
      this.supplyController.regenerateInternalBarcode.bind(this.supplyController)
    );

    router.put(
      '/:id/barcodes/:barcodeId',
      validateParams(SupplyBarcodeIdParams),
      validateBody(UpdateSupplyBarcodeHttpSchema),
      this.supplyController.updateBarcode.bind(this.supplyController)
    );

    router.delete(
      '/:id/barcodes/:barcodeId',
      validateParams(SupplyBarcodeIdParams),
      this.supplyController.removeBarcode.bind(this.supplyController)
    );

    // Attribute values

    router.put(
      '/:id/attributes',
      validateParams(IdParams),
      validateBody(SetAttributeValueHttpSchema),
      this.supplyController.setAttributeValue.bind(this.supplyController)
    );

    // Packaging levels

    router.post(
      '/:id/packaging-levels',
      validateParams(IdParams),
      validateBody(CreateSupplyPackagingLevelHttpSchema),
      this.supplyController.addPackagingLevel.bind(this.supplyController)
    );

    router.delete(
      '/:id/packaging-levels/:levelId',
      validateParams(SupplyPackagingLevelIdParams),
      this.supplyController.removePackagingLevel.bind(this.supplyController)
    );

    // Transaction history

    router.get(
      '/:id/transactions',
      validateParams(IdParams),
      this.supplyController.getTransactionHistory.bind(this.supplyController)
    );
  }
}
