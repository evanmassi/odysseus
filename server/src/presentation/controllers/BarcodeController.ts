/**
 * Barcode Controller
 *
 * HTTP handler for lab-wide barcode resolution.
 */

import type { BarcodeApplicationService } from '@application/services/BarcodeApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface BarcodeControllerDeps {
  barcodeService: BarcodeApplicationService;
}

export class BarcodeController extends BaseController {
  constructor(private deps: BarcodeControllerDeps) {
    super();
  }

  async resolveBarcode(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const match = await this.deps.barcodeService.resolve(labId, req.query.value as string);
      res.json(ResponseBuilder.success({ match }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to resolve barcode', req.requestId);
    }
  }
}
