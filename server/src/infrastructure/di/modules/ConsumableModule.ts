/**
 * Consumable DI Module
 *
 * Lazy-singleton wiring for consumable inventory operations.
 */

import { ConsumableApplicationService } from '@application/services/ConsumableApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { ConsumableController } from '@presentation/controllers/ConsumableController';

export class ConsumableModule {
  private consumableApplicationService?: ConsumableApplicationService;
  private consumableController?: ConsumableController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  getConsumableApplicationService(): ConsumableApplicationService {
    if (!this.consumableApplicationService) {
      this.consumableApplicationService = new ConsumableApplicationService(
        this.repositoryFactory.getConsumableCategoryRepository(),
        this.repositoryFactory.getConsumableProductRepository(),
        this.repositoryFactory.getConsumableLocationRepository(),
        this.shared.accessControlService,
        this.shared.eventBus
      );
    }
    return this.consumableApplicationService;
  }

  getConsumableController(): ConsumableController {
    if (!this.consumableController) {
      this.consumableController = new ConsumableController({
        consumableApplicationService: this.getConsumableApplicationService(),
      });
    }
    return this.consumableController;
  }
}
