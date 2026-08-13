/**
 * Equipment DI Module
 *
 * Lazy-singleton wiring for equipment inventory operations.
 */

import { EquipmentApplicationService } from '@application/services/EquipmentApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { EquipmentController } from '@presentation/controllers/EquipmentController';

export class EquipmentModule {
  private equipmentApplicationService?: EquipmentApplicationService;
  private equipmentController?: EquipmentController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  getEquipmentApplicationService(): EquipmentApplicationService {
    if (!this.equipmentApplicationService) {
      this.equipmentApplicationService = new EquipmentApplicationService(
        this.repositoryFactory.getEquipmentCategoryRepository(),
        this.repositoryFactory.getEquipmentItemRepository(),
        this.repositoryFactory.getAttributeRepository(),
        this.shared.accessControlService,
        this.shared.eventBus,
        this.repositoryFactory.getStorageRepository()
      );
    }
    return this.equipmentApplicationService;
  }

  getEquipmentController(): EquipmentController {
    if (!this.equipmentController) {
      this.equipmentController = new EquipmentController({
        equipmentApplicationService: this.getEquipmentApplicationService(),
      });
    }
    return this.equipmentController;
  }
}
