/**
 * Consumable Route Module
 *
 * Routes for consumable categories, locations, products, documents,
 * barcodes, stock operations, and bulk actions.
 */

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { ConsumableController } from '@presentation/controllers/ConsumableController';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  IdParams,
  ConsumableCategoryIdParams,
  ConsumableLocationIdParams,
  ConsumableDocIdParams,
  ConsumableBarcodeIdParams,
  CreateConsumableCategoryHttpSchema,
  UpdateConsumableCategoryHttpSchema,
  CreateConsumableLocationHttpSchema,
  UpdateConsumableLocationHttpSchema,
  CreateConsumableProductHttpSchema,
  UpdateConsumableProductHttpSchema,
  CreateConsumableBarcodeHttpSchema,
  UpdateConsumableBarcodeHttpSchema,
  CreateConsumableDocumentHttpSchema,
  UpdateConsumableDocumentHttpSchema,
  RecordConsumableTransactionHttpSchema,
  RecordConsumableStockCountHttpSchema,
  ConsumableBulkReceiveHttpSchema,
  ConsumableBulkConsumeHttpSchema,
  ConsumableBulkReassignCategoryHttpSchema,
  ConsumableBulkArchiveHttpSchema,
  ConsumablePackagingLevelIdParams,
  CreateConsumablePackagingLevelHttpSchema,
  UpdateConsumablePackagingLevelHttpSchema,
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class ConsumableRouteModule implements RouteModule {

  constructor(
    private consumableController: ConsumableController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/consumables';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate.bind(this.authMiddleware)
    ];
  }

  configure(router: Router): void {

    // Categories — registered before /:id to avoid matching as an ID

    router.get('/categories',
      this.consumableController.listCategories.bind(this.consumableController)
    );

    router.post('/categories',
      validateBody(CreateConsumableCategoryHttpSchema),
      this.consumableController.createCategory.bind(this.consumableController)
    );

    router.put('/categories/:categoryId',
      validateParams(ConsumableCategoryIdParams),
      validateBody(UpdateConsumableCategoryHttpSchema),
      this.consumableController.updateCategory.bind(this.consumableController)
    );

    router.delete('/categories/:categoryId',
      validateParams(ConsumableCategoryIdParams),
      this.consumableController.deleteCategory.bind(this.consumableController)
    );

    // Locations — registered before /:id

    router.get('/locations',
      this.consumableController.listLocations.bind(this.consumableController)
    );

    router.post('/locations',
      validateBody(CreateConsumableLocationHttpSchema),
      this.consumableController.createLocation.bind(this.consumableController)
    );

    router.put('/locations/:locationId',
      validateParams(ConsumableLocationIdParams),
      validateBody(UpdateConsumableLocationHttpSchema),
      this.consumableController.updateLocation.bind(this.consumableController)
    );

    router.delete('/locations/:locationId',
      validateParams(ConsumableLocationIdParams),
      this.consumableController.deleteLocation.bind(this.consumableController)
    );

    // Bulk operations — registered before /:id

    router.post('/bulk/receive',
      validateBody(ConsumableBulkReceiveHttpSchema),
      this.consumableController.bulkReceive.bind(this.consumableController)
    );

    router.post('/bulk/consume',
      validateBody(ConsumableBulkConsumeHttpSchema),
      this.consumableController.bulkConsume.bind(this.consumableController)
    );

    router.post('/bulk/reassign-category',
      validateBody(ConsumableBulkReassignCategoryHttpSchema),
      this.consumableController.bulkReassignCategory.bind(this.consumableController)
    );

    router.post('/bulk/archive',
      validateBody(ConsumableBulkArchiveHttpSchema),
      this.consumableController.bulkArchive.bind(this.consumableController)
    );

    // Barcode resolution — query param, registered before /:id

    router.get('/barcodes/resolve',
      this.consumableController.resolveBarcode.bind(this.consumableController)
    );

    // Reorder list — registered before /:id

    router.get('/reorder-list',
      this.consumableController.getReorderList.bind(this.consumableController)
    );

    // Stock operations (not scoped to a product)

    router.post('/transactions',
      validateBody(RecordConsumableTransactionHttpSchema),
      this.consumableController.recordTransaction.bind(this.consumableController)
    );

    router.post('/stock-counts',
      validateBody(RecordConsumableStockCountHttpSchema),
      this.consumableController.recordStockCount.bind(this.consumableController)
    );

    // Products

    router.get('/',
      this.consumableController.listProducts.bind(this.consumableController)
    );

    router.post('/',
      validateBody(CreateConsumableProductHttpSchema),
      this.consumableController.createProduct.bind(this.consumableController)
    );

    router.get('/:id',
      validateParams(IdParams),
      this.consumableController.getProduct.bind(this.consumableController)
    );

    router.put('/:id',
      validateParams(IdParams),
      validateBody(UpdateConsumableProductHttpSchema),
      this.consumableController.updateProduct.bind(this.consumableController)
    );

    router.delete('/:id',
      validateParams(IdParams),
      this.consumableController.deleteProduct.bind(this.consumableController)
    );

    router.post('/:id/archive',
      validateParams(IdParams),
      this.consumableController.archiveProduct.bind(this.consumableController)
    );

    // Documents

    router.post('/:id/documents',
      validateParams(IdParams),
      validateBody(CreateConsumableDocumentHttpSchema),
      this.consumableController.addDocument.bind(this.consumableController)
    );

    router.put('/:id/documents/:docId',
      validateParams(ConsumableDocIdParams),
      validateBody(UpdateConsumableDocumentHttpSchema),
      this.consumableController.updateDocument.bind(this.consumableController)
    );

    router.delete('/:id/documents/:docId',
      validateParams(ConsumableDocIdParams),
      this.consumableController.removeDocument.bind(this.consumableController)
    );

    // Barcodes

    router.post('/:id/barcodes',
      validateParams(IdParams),
      validateBody(CreateConsumableBarcodeHttpSchema),
      this.consumableController.addBarcode.bind(this.consumableController)
    );

    router.post('/:id/barcodes/regenerate-internal',
      validateParams(IdParams),
      this.consumableController.regenerateInternalBarcode.bind(this.consumableController)
    );

    router.put('/:id/barcodes/:barcodeId',
      validateParams(ConsumableBarcodeIdParams),
      validateBody(UpdateConsumableBarcodeHttpSchema),
      this.consumableController.updateBarcode.bind(this.consumableController)
    );

    router.delete('/:id/barcodes/:barcodeId',
      validateParams(ConsumableBarcodeIdParams),
      this.consumableController.removeBarcode.bind(this.consumableController)
    );

    // Packaging levels

    router.post('/:id/packaging-levels',
      validateParams(IdParams),
      validateBody(CreateConsumablePackagingLevelHttpSchema),
      this.consumableController.addPackagingLevel.bind(this.consumableController)
    );

    router.put('/:id/packaging-levels/:levelId',
      validateParams(ConsumablePackagingLevelIdParams),
      validateBody(UpdateConsumablePackagingLevelHttpSchema),
      this.consumableController.updatePackagingLevel.bind(this.consumableController)
    );

    router.delete('/:id/packaging-levels/:levelId',
      validateParams(ConsumablePackagingLevelIdParams),
      this.consumableController.removePackagingLevel.bind(this.consumableController)
    );

    // Transaction history

    router.get('/:id/transactions',
      validateParams(IdParams),
      this.consumableController.getTransactionHistory.bind(this.consumableController)
    );
  }
}
