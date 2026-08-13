/**
 * Lab Location DI Module
 *
 * Lazy-singleton wiring for the lab-wide location tree.
 */

import { LabLocationApplicationService } from '@application/services/LabLocationApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { LabLocationController } from '@presentation/controllers/LabLocationController';

export class LabLocationModule {
  private locationApplicationService?: LabLocationApplicationService;
  private locationController?: LabLocationController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  getLabLocationApplicationService(): LabLocationApplicationService {
    if (!this.locationApplicationService) {
      this.locationApplicationService = new LabLocationApplicationService(
        this.repositoryFactory.getLabLocationRepository(),
        this.shared.accessControlService,
        this.repositoryFactory.getStorageRepository()
      );
    }
    return this.locationApplicationService;
  }

  getLabLocationController(): LabLocationController {
    if (!this.locationController) {
      this.locationController = new LabLocationController({
        locationService: this.getLabLocationApplicationService(),
      });
    }
    return this.locationController;
  }
}
