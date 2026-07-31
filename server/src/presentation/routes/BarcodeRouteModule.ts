/**
 * Barcode Route Module
 *
 * Route for resolving a scanned barcode across catalogs.
 */

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { BarcodeController } from '@presentation/controllers/BarcodeController';
import { validateQuery } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import { BarcodeResolveQuery } from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class BarcodeRouteModule implements RouteModule {
  constructor(
    private barcodeController: BarcodeController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/barcodes';
  }

  getMiddleware(): RequestHandler[] {
    return [this.authMiddleware.authenticate.bind(this.authMiddleware)];
  }

  configure(router: Router): void {
    router.get(
      '/resolve',
      validateQuery(BarcodeResolveQuery),
      this.barcodeController.resolveBarcode.bind(this.barcodeController)
    );
  }
}
