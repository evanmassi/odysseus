/**
 * Attribute DI Module
 *
 * Lazy-singleton wiring for lab attribute definitions and options.
 */

import { AttributeApplicationService } from '@application/services/AttributeApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { AttributeController } from '@presentation/controllers/AttributeController';

export class AttributeModule {
  private attributeApplicationService?: AttributeApplicationService;
  private attributeController?: AttributeController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  getAttributeApplicationService(): AttributeApplicationService {
    if (!this.attributeApplicationService) {
      this.attributeApplicationService = new AttributeApplicationService(
        this.repositoryFactory.getAttributeRepository(),
        this.shared.accessControlService
      );
    }
    return this.attributeApplicationService;
  }

  getAttributeController(): AttributeController {
    if (!this.attributeController) {
      this.attributeController = new AttributeController({
        attributeService: this.getAttributeApplicationService(),
      });
    }
    return this.attributeController;
  }
}
