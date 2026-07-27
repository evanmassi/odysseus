/**
 * Location Route Module
 *
 * Routes for the lab-wide location tree.
 */

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { LocationController } from '@presentation/controllers/LocationController';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  LocationIdParams,
  CreateLocationHttpSchema,
  UpdateLocationHttpSchema,
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class LocationRouteModule implements RouteModule {
  constructor(
    private locationController: LocationController,
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
      validateBody(CreateLocationHttpSchema),
      this.locationController.createLocation.bind(this.locationController)
    );

    router.put(
      '/:locationId',
      validateParams(LocationIdParams),
      validateBody(UpdateLocationHttpSchema),
      this.locationController.updateLocation.bind(this.locationController)
    );

    router.delete(
      '/:locationId',
      validateParams(LocationIdParams),
      this.locationController.deleteLocation.bind(this.locationController)
    );
  }
}
