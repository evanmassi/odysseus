/**
 * Reagent DI Module
 *
 * Lazy-singleton wiring for reagent inventory operations.
 */

import { ReagentApplicationService } from '@application/services/ReagentApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { ReagentController } from '@presentation/controllers/ReagentController';

export class ReagentModule {
  private reagentApplicationService?: ReagentApplicationService;
  private reagentController?: ReagentController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  getReagentApplicationService(): ReagentApplicationService {
    if (!this.reagentApplicationService) {
      this.reagentApplicationService = new ReagentApplicationService(
        this.repositoryFactory.getReagentCategoryRepository(),
        this.repositoryFactory.getReagentItemRepository(),
        this.shared.accessControlService,
        this.shared.eventBus
      );
    }
    return this.reagentApplicationService;
  }

  getReagentController(): ReagentController {
    if (!this.reagentController) {
      this.reagentController = new ReagentController({
        reagentApplicationService: this.getReagentApplicationService(),
      });
    }
    return this.reagentController;
  }
}
