/**
 * Donor DI Module
 *
 * Lazy-singleton wiring for donor registry operations.
 */

import { DonorApplicationService } from '@application/services/DonorApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { DonorController } from '@presentation/controllers/DonorController';

export class DonorModule {
  private donorApplicationService?: DonorApplicationService;
  private donorController?: DonorController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  getDonorApplicationService(): DonorApplicationService {
    if (!this.donorApplicationService) {
      this.donorApplicationService = new DonorApplicationService(
        this.repositoryFactory.getDonorRepository(),
        this.shared.accessControlService,
        this.shared.eventBus,
        this.repositoryFactory.getLabRepository()
      );
    }
    return this.donorApplicationService;
  }

  getDonorController(): DonorController {
    if (!this.donorController) {
      this.donorController = new DonorController({
        donorApplicationService: this.getDonorApplicationService(),
      });
    }
    return this.donorController;
  }
}
