/**
 * Equipment Route Module
 *
 * Routes for equipment categories, items, documents, and maintenance logs.
 */

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { EquipmentController } from '@presentation/controllers/EquipmentController';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  IdParams,
  EquipmentCategoryIdParams,
  EquipmentDocIdParams,
  EquipmentMaintenanceEntryIdParams,
  CreateEquipmentCategoryHttpSchema,
  UpdateEquipmentCategoryHttpSchema,
  CreateEquipmentItemHttpSchema,
  UpdateEquipmentItemHttpSchema,
  DecommissionEquipmentItemHttpSchema,
  CreateEquipmentDocumentHttpSchema,
  UpdateEquipmentDocumentHttpSchema,
  CreateEquipmentMaintenanceLogHttpSchema,
  UpdateEquipmentMaintenanceLogHttpSchema,
  EquipmentBulkMaintenanceHttpSchema,
  EquipmentBulkStatusHttpSchema,
  EquipmentBulkRelocateHttpSchema,
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class EquipmentRouteModule implements RouteModule {
  constructor(
    private equipmentController: EquipmentController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/equipment';
  }

  getMiddleware(): RequestHandler[] {
    return [this.authMiddleware.authenticate.bind(this.authMiddleware)];
  }

  configure(router: Router): void {
    // Categories — registered before /:id to avoid "categories" matching as an ID

    router.get(
      '/categories',
      this.equipmentController.listCategories.bind(this.equipmentController)
    );

    router.post(
      '/categories',
      validateBody(CreateEquipmentCategoryHttpSchema),
      this.equipmentController.createCategory.bind(this.equipmentController)
    );

    router.put(
      '/categories/:categoryId',
      validateParams(EquipmentCategoryIdParams),
      validateBody(UpdateEquipmentCategoryHttpSchema),
      this.equipmentController.updateCategory.bind(this.equipmentController)
    );

    router.delete(
      '/categories/:categoryId',
      validateParams(EquipmentCategoryIdParams),
      this.equipmentController.deleteCategory.bind(this.equipmentController)
    );

    // Bulk operations — registered before /:id to avoid "bulk" matching as an ID

    router.post(
      '/bulk/maintenance',
      validateBody(EquipmentBulkMaintenanceHttpSchema),
      this.equipmentController.bulkLogMaintenance.bind(this.equipmentController)
    );

    router.post(
      '/bulk/status',
      validateBody(EquipmentBulkStatusHttpSchema),
      this.equipmentController.bulkChangeStatus.bind(this.equipmentController)
    );

    router.post(
      '/bulk/relocate',
      validateBody(EquipmentBulkRelocateHttpSchema),
      this.equipmentController.bulkRelocate.bind(this.equipmentController)
    );

    // Items

    router.get('/', this.equipmentController.listItems.bind(this.equipmentController));

    router.get(
      '/:id',
      validateParams(IdParams),
      this.equipmentController.getItem.bind(this.equipmentController)
    );

    router.post(
      '/',
      validateBody(CreateEquipmentItemHttpSchema),
      this.equipmentController.createItem.bind(this.equipmentController)
    );

    router.put(
      '/:id',
      validateParams(IdParams),
      validateBody(UpdateEquipmentItemHttpSchema),
      this.equipmentController.updateItem.bind(this.equipmentController)
    );

    router.delete(
      '/:id',
      validateParams(IdParams),
      this.equipmentController.deleteItem.bind(this.equipmentController)
    );

    router.post(
      '/:id/decommission',
      validateParams(IdParams),
      validateBody(DecommissionEquipmentItemHttpSchema),
      this.equipmentController.decommissionItem.bind(this.equipmentController)
    );

    // Documents

    router.post(
      '/:id/documents',
      validateParams(IdParams),
      validateBody(CreateEquipmentDocumentHttpSchema),
      this.equipmentController.addDocument.bind(this.equipmentController)
    );

    router.put(
      '/:id/documents/:docId',
      validateParams(EquipmentDocIdParams),
      validateBody(UpdateEquipmentDocumentHttpSchema),
      this.equipmentController.updateDocument.bind(this.equipmentController)
    );

    router.delete(
      '/:id/documents/:docId',
      validateParams(EquipmentDocIdParams),
      this.equipmentController.removeDocument.bind(this.equipmentController)
    );

    // Maintenance log

    router.post(
      '/:id/maintenance',
      validateParams(IdParams),
      validateBody(CreateEquipmentMaintenanceLogHttpSchema),
      this.equipmentController.addMaintenanceEntry.bind(this.equipmentController)
    );

    router.put(
      '/:id/maintenance/:entryId',
      validateParams(EquipmentMaintenanceEntryIdParams),
      validateBody(UpdateEquipmentMaintenanceLogHttpSchema),
      this.equipmentController.updateMaintenanceEntry.bind(this.equipmentController)
    );

    router.delete(
      '/:id/maintenance/:entryId',
      validateParams(EquipmentMaintenanceEntryIdParams),
      this.equipmentController.deleteMaintenanceEntry.bind(this.equipmentController)
    );
  }
}
