/**
 * Supply DI Module
 *
 * Lazy-singleton wiring for supply inventory operations.
 */

import { SupplyApplicationService } from '@application/services/SupplyApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { SupplyController } from '@presentation/controllers/SupplyController';

export class SupplyModule {
  private supplyApplicationService?: SupplyApplicationService;
  private supplyController?: SupplyController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  getSupplyApplicationService(): SupplyApplicationService {
    if (!this.supplyApplicationService) {
      this.supplyApplicationService = new SupplyApplicationService(
        this.repositoryFactory.getSupplyCategoryRepository(),
        this.repositoryFactory.getSupplyProductRepository(),
        this.repositoryFactory.getSupplyLocationRepository(),
        this.shared.accessControlService,
        this.shared.eventBus
      );
    }
    return this.supplyApplicationService;
  }

  getSupplyController(): SupplyController {
    if (!this.supplyController) {
      this.supplyController = new SupplyController({
        supplyApplicationService: this.getSupplyApplicationService(),
      });
    }
    return this.supplyController;
  }
}
