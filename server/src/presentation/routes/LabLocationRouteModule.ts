/**
 * Lab Location Route Module
 *
 * Routes for the lab-wide location tree.
 */

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { LabLocationController } from '@presentation/controllers/LabLocationController';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  LabLocationIdParams,
  CreateLabLocationHttpSchema,
  UpdateLabLocationHttpSchema,
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class LabLocationRouteModule implements RouteModule {
  constructor(
    private locationController: LabLocationController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/locations';
  }

  getMiddleware(): RequestHandler[] {
    return [this.authMiddleware.authenticate.bind(this.authMiddleware)];
  }

  configure(router: Router): void {
    router.get('/', this.locationController.listLocations.bind(this.locationController));

    router.post(
      '/',
      validateBody(CreateLabLocationHttpSchema),
      this.locationController.createLocation.bind(this.locationController)
    );

    router.put(
      '/:locationId',
      validateParams(LabLocationIdParams),
      validateBody(UpdateLabLocationHttpSchema),
      this.locationController.updateLocation.bind(this.locationController)
    );

    router.delete(
      '/:locationId',
      validateParams(LabLocationIdParams),
      this.locationController.deleteLocation.bind(this.locationController)
    );
  }
}
