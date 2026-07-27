/**
 * Location DI Module
 *
 * Lazy-singleton wiring for the lab-wide location tree.
 */

import { LocationApplicationService } from '@application/services/LocationApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { LocationController } from '@presentation/controllers/LocationController';

export class LocationModule {
  private locationApplicationService?: LocationApplicationService;
  private locationController?: LocationController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  getLocationApplicationService(): LocationApplicationService {
    if (!this.locationApplicationService) {
      this.locationApplicationService = new LocationApplicationService(
        this.repositoryFactory.getLocationRepository(),
        this.shared.accessControlService
      );
    }
    return this.locationApplicationService;
  }

  getLocationController(): LocationController {
    if (!this.locationController) {
      this.locationController = new LocationController({
        locationService: this.getLocationApplicationService(),
      });
    }
    return this.locationController;
  }
}
