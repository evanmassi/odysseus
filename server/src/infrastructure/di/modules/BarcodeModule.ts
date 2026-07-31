/**
 * Barcode DI Module
 *
 * Lazy-singleton wiring for lab-wide barcode resolution.
 */

import { BarcodeApplicationService } from '@application/services/BarcodeApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import { BarcodeController } from '@presentation/controllers/BarcodeController';

export class BarcodeModule {
  private barcodeApplicationService?: BarcodeApplicationService;
  private barcodeController?: BarcodeController;

  constructor(private repositoryFactory: RepositoryFactory) {}

  getBarcodeApplicationService(): BarcodeApplicationService {
    if (!this.barcodeApplicationService) {
      this.barcodeApplicationService = new BarcodeApplicationService(
        this.repositoryFactory.getSupplyItemRepository(),
        this.repositoryFactory.getReagentItemRepository()
      );
    }
    return this.barcodeApplicationService;
  }

  getBarcodeController(): BarcodeController {
    if (!this.barcodeController) {
      this.barcodeController = new BarcodeController({
        barcodeService: this.getBarcodeApplicationService(),
      });
    }
    return this.barcodeController;
  }
}
