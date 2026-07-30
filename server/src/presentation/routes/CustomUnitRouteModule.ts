/**
 * Custom Unit Route Module
 *
 * Routes for the lab's custom units.
 */

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { CustomUnitController } from '@presentation/controllers/CustomUnitController';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  CustomUnitIdParams,
  CreateCustomUnitHttpSchema,
  RenameCustomUnitHttpSchema,
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class CustomUnitRouteModule implements RouteModule {
  constructor(
    private customUnitController: CustomUnitController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/custom-units';
  }

  getMiddleware(): RequestHandler[] {
    return [this.authMiddleware.authenticate.bind(this.authMiddleware)];
  }

  configure(router: Router): void {
    router.get('/', this.customUnitController.listCustomUnits.bind(this.customUnitController));

    router.post(
      '/',
      validateBody(CreateCustomUnitHttpSchema),
      this.customUnitController.createCustomUnit.bind(this.customUnitController)
    );

    router.put(
      '/:unitId',
      validateParams(CustomUnitIdParams),
      validateBody(RenameCustomUnitHttpSchema),
      this.customUnitController.renameCustomUnit.bind(this.customUnitController)
    );

    router.delete(
      '/:unitId',
      validateParams(CustomUnitIdParams),
      this.customUnitController.deleteCustomUnit.bind(this.customUnitController)
    );
  }
}
