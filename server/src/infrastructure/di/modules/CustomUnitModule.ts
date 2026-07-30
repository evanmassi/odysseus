/**
 * Custom Unit DI Module
 *
 * Lazy-singleton wiring for the lab's custom units.
 */

import { CustomUnitApplicationService } from '@application/services/CustomUnitApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { CustomUnitController } from '@presentation/controllers/CustomUnitController';

export class CustomUnitModule {
  private customUnitApplicationService?: CustomUnitApplicationService;
  private customUnitController?: CustomUnitController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  getCustomUnitApplicationService(): CustomUnitApplicationService {
    if (!this.customUnitApplicationService) {
      this.customUnitApplicationService = new CustomUnitApplicationService(
        this.repositoryFactory.getCustomUnitRepository(),
        this.shared.accessControlService
      );
    }
    return this.customUnitApplicationService;
  }

  getCustomUnitController(): CustomUnitController {
    if (!this.customUnitController) {
      this.customUnitController = new CustomUnitController({
        customUnitService: this.getCustomUnitApplicationService(),
      });
    }
    return this.customUnitController;
  }
}
