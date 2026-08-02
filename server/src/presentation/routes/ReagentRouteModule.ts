/**
 * Reagent Route Module
 *
 * Routes for reagent categories, items, documents,
 * barcodes, per-lot stock operations, and bulk actions.
 */

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { ReagentController } from '@presentation/controllers/ReagentController';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  IdParams,
  ReagentCategoryIdParams,
  ReagentDocIdParams,
  ReagentBarcodeIdParams,
  CreateReagentCategoryHttpSchema,
  UpdateReagentCategoryHttpSchema,
  CreateReagentItemHttpSchema,
  UpdateReagentItemHttpSchema,
  CreateReagentBarcodeHttpSchema,
  UpdateReagentBarcodeHttpSchema,
  SetAttributeValueHttpSchema,
  CreateReagentDocumentHttpSchema,
  UpdateReagentDocumentHttpSchema,
  RecordReagentTransactionHttpSchema,
  RecordReagentStockCountHttpSchema,
  ReagentBulkReceiveHttpSchema,
  ReagentBulkIssueHttpSchema,
  ReagentBulkReassignCategoryHttpSchema,
  ReagentBulkArchiveHttpSchema,
  ReagentBulkBarcodesHttpSchema,
  VoidReagentTransactionHttpSchema,
  ReagentBulkVoidHttpSchema,
  ReagentTransactionVoidParams,
  ReagentPackagingLevelIdParams,
  CreateReagentPackagingLevelHttpSchema,
  ReagentLotIdParams,
  UpdateReagentLotHttpSchema,
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class ReagentRouteModule implements RouteModule {
  constructor(
    private reagentController: ReagentController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/reagents';
  }

  getMiddleware(): RequestHandler[] {
    return [this.authMiddleware.authenticate.bind(this.authMiddleware)];
  }

  configure(router: Router): void {
    // Categories — registered before /:id to avoid matching as an ID

    router.get('/categories', this.reagentController.listCategories.bind(this.reagentController));

    router.post(
      '/categories',
      validateBody(CreateReagentCategoryHttpSchema),
      this.reagentController.createCategory.bind(this.reagentController)
    );

    router.put(
      '/categories/:categoryId',
      validateParams(ReagentCategoryIdParams),
      validateBody(UpdateReagentCategoryHttpSchema),
      this.reagentController.updateCategory.bind(this.reagentController)
    );

    router.delete(
      '/categories/:categoryId',
      validateParams(ReagentCategoryIdParams),
      this.reagentController.deleteCategory.bind(this.reagentController)
    );

    // Bulk operations — registered before /:id

    router.post(
      '/bulk/receive',
      validateBody(ReagentBulkReceiveHttpSchema),
      this.reagentController.bulkReceive.bind(this.reagentController)
    );

    router.post(
      '/bulk/issue',
      validateBody(ReagentBulkIssueHttpSchema),
      this.reagentController.bulkIssue.bind(this.reagentController)
    );

    router.post(
      '/bulk/reassign-category',
      validateBody(ReagentBulkReassignCategoryHttpSchema),
      this.reagentController.bulkReassignCategory.bind(this.reagentController)
    );

    router.post(
      '/bulk/archive',
      validateBody(ReagentBulkArchiveHttpSchema),
      this.reagentController.bulkArchive.bind(this.reagentController)
    );

    router.post(
      '/bulk/void',
      validateBody(ReagentBulkVoidHttpSchema),
      this.reagentController.bulkVoidTransactions.bind(this.reagentController)
    );

    router.post(
      '/bulk/barcodes',
      validateBody(ReagentBulkBarcodesHttpSchema),
      this.reagentController.bulkGetBarcodes.bind(this.reagentController)
    );

    router.post(
      '/bulk/lot-labels',
      validateBody(ReagentBulkBarcodesHttpSchema),
      this.reagentController.bulkGetLotLabels.bind(this.reagentController)
    );

    // Stock operations (not scoped to an item)

    router.post(
      '/transactions',
      validateBody(RecordReagentTransactionHttpSchema),
      this.reagentController.recordTransaction.bind(this.reagentController)
    );

    router.post(
      '/stock-counts',
      validateBody(RecordReagentStockCountHttpSchema),
      this.reagentController.recordStockCount.bind(this.reagentController)
    );

    router.post(
      '/transactions/:transactionId/void',
      validateParams(ReagentTransactionVoidParams),
      validateBody(VoidReagentTransactionHttpSchema),
      this.reagentController.voidTransaction.bind(this.reagentController)
    );

    // Items

    router.get('/', this.reagentController.listItems.bind(this.reagentController));

    router.post(
      '/',
      validateBody(CreateReagentItemHttpSchema),
      this.reagentController.createItem.bind(this.reagentController)
    );

    router.get(
      '/:id',
      validateParams(IdParams),
      this.reagentController.getItem.bind(this.reagentController)
    );

    router.put(
      '/:id',
      validateParams(IdParams),
      validateBody(UpdateReagentItemHttpSchema),
      this.reagentController.updateItem.bind(this.reagentController)
    );

    router.delete(
      '/:id',
      validateParams(IdParams),
      this.reagentController.deleteItem.bind(this.reagentController)
    );

    router.post(
      '/:id/archive',
      validateParams(IdParams),
      this.reagentController.archiveItem.bind(this.reagentController)
    );

    // Attribute values

    router.put(
      '/:id/attributes',
      validateParams(IdParams),
      validateBody(SetAttributeValueHttpSchema),
      this.reagentController.setAttributeValue.bind(this.reagentController)
    );

    // Documents

    router.post(
      '/:id/documents',
      validateParams(IdParams),
      validateBody(CreateReagentDocumentHttpSchema),
      this.reagentController.addDocument.bind(this.reagentController)
    );

    router.put(
      '/:id/documents/:docId',
      validateParams(ReagentDocIdParams),
      validateBody(UpdateReagentDocumentHttpSchema),
      this.reagentController.updateDocument.bind(this.reagentController)
    );

    router.delete(
      '/:id/documents/:docId',
      validateParams(ReagentDocIdParams),
      this.reagentController.removeDocument.bind(this.reagentController)
    );

    // Barcodes

    router.post(
      '/:id/barcodes',
      validateParams(IdParams),
      validateBody(CreateReagentBarcodeHttpSchema),
      this.reagentController.addBarcode.bind(this.reagentController)
    );

    router.post(
      '/:id/barcodes/regenerate-internal',
      validateParams(IdParams),
      this.reagentController.regenerateInternalBarcode.bind(this.reagentController)
    );

    router.put(
      '/:id/barcodes/:barcodeId',
      validateParams(ReagentBarcodeIdParams),
      validateBody(UpdateReagentBarcodeHttpSchema),
      this.reagentController.updateBarcode.bind(this.reagentController)
    );

    router.delete(
      '/:id/barcodes/:barcodeId',
      validateParams(ReagentBarcodeIdParams),
      this.reagentController.removeBarcode.bind(this.reagentController)
    );

    // Packaging levels

    router.post(
      '/:id/packaging-levels',
      validateParams(IdParams),
      validateBody(CreateReagentPackagingLevelHttpSchema),
      this.reagentController.addPackagingLevel.bind(this.reagentController)
    );

    router.delete(
      '/:id/packaging-levels/:levelId',
      validateParams(ReagentPackagingLevelIdParams),
      this.reagentController.removePackagingLevel.bind(this.reagentController)
    );

    // Lots — date corrections only; stock leaves through a transaction

    router.put(
      '/:id/lots/:lotId',
      validateParams(ReagentLotIdParams),
      validateBody(UpdateReagentLotHttpSchema),
      this.reagentController.updateLot.bind(this.reagentController)
    );

    // Transaction history

    router.get(
      '/:id/transactions',
      validateParams(IdParams),
      this.reagentController.getTransactionHistory.bind(this.reagentController)
    );
  }
}
