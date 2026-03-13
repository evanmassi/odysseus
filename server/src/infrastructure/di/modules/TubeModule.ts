/**
 * Tube DI Module
 *
 * Lazy-singleton wiring for tube operations, locking, and search.
 */

import { TubeApplicationService } from '@application/services/TubeApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { SearchController } from '@presentation/controllers/SearchController';
import { TubeController } from '@presentation/controllers/TubeController';
import { TubeLockController } from '@presentation/controllers/TubeLockController';

export class TubeModule {
  private tubeApplicationService?: TubeApplicationService;
  private tubeController?: TubeController;
  private tubeLockController?: TubeLockController;
  private searchController?: SearchController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  getTubeApplicationService(): TubeApplicationService {
    if (!this.tubeApplicationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.tubeApplicationService = new TubeApplicationService(
        repositories.tubes,
        repositories.users,
        repositories.researchers,
        repositories.persons,
        repositories.storage,
        this.shared.tubePositionService,
        this.shared.accessControlService,
        this.shared.eventBus
      );
    }
    return this.tubeApplicationService;
  }

  getTubeController(): TubeController {
    if (!this.tubeController) {
      this.tubeController = new TubeController({
        tubeApplicationService: this.getTubeApplicationService(),
      });
    }
    return this.tubeController;
  }

  getTubeLockController(): TubeLockController {
    if (!this.tubeLockController) {
      this.tubeLockController = new TubeLockController({
        tubeApplicationService: this.getTubeApplicationService(),
      });
    }
    return this.tubeLockController;
  }

  getSearchController(): SearchController {
    if (!this.searchController) {
      this.searchController = new SearchController({
        tubeApplicationService: this.getTubeApplicationService(),
      });
    }
    return this.searchController;
  }
}
