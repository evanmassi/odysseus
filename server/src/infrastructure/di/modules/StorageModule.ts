/**
 * Storage DI Module
 *
 * Lazy-singleton wiring for storage configuration, tank/rack/box management,
 * lookup values, and demo seeding.
 */

import {
  AddBoxesCommandHandler,
  UpdateBoxCommandHandler,
  DeleteBoxCommandHandler,
  AssignBoxCommandHandler,
} from '@application/commands/BoxCommands';
import {
  BulkUnassignResourcesCommandHandler,
  BulkReassignResourcesCommandHandler,
} from '@application/commands/BulkAssignmentCommands';
import {
  ResetDemoDataCommandHandler,
  SeedDemoCommandHandler,
  UnseedDemoCommandHandler,
} from '@application/commands/DemoSeedCommands';
import { InitializeStorageCommandHandler } from '@application/commands/InitializeStorageCommand';
import {
  AddRacksCommandHandler,
  UpdateRackCommandHandler,
  DeleteRackCommandHandler,
  AssignRackCommandHandler,
} from '@application/commands/RackCommands';
import {
  UpdateSystemStorageCommandHandler,
  ResetStorageToDefaultCommandHandler,
  ImportStorageCommandHandler,
  UpdateResourceLabelCommandHandler,
} from '@application/commands/StorageCommands';
import {
  AddTankCommandHandler,
  UpdateTankCommandHandler,
  DeleteTankCommandHandler,
} from '@application/commands/TankCommands';
import {
  GetCurrentStorageQueryHandler,
  GetStorageHistoryQueryHandler,
  GetStorageByVersionQueryHandler,
  CheckStorageHealthQueryHandler,
  GetSystemMetricsQueryHandler,
} from '@application/queries/StorageQueries';
import { LookupValueApplicationService } from '@application/services/LookupValueApplicationService';
import { SecurityConfigApplicationService } from '@application/services/SecurityConfigApplicationService';
import { StorageAnalyticsApplicationService } from '@application/services/StorageAnalyticsApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { AdminConfigController } from '@presentation/controllers/admin/AdminConfigController';
import { LookupValueController } from '@presentation/controllers/LookupValueController';
import { StorageController } from '@presentation/controllers/StorageController';
import { StorageAnalyticsController } from '@presentation/controllers/system/StorageAnalyticsController';

export class StorageModule {
  // Storage command handlers
  private updateSystemStorageHandler?: UpdateSystemStorageCommandHandler;
  private resetStorageToDefaultHandler?: ResetStorageToDefaultCommandHandler;
  private importStorageHandler?: ImportStorageCommandHandler;
  private updateResourceLabelHandler?: UpdateResourceLabelCommandHandler;

  // Tank/rack/box handlers
  private addTankHandler?: AddTankCommandHandler;
  private updateTankHandler?: UpdateTankCommandHandler;
  private deleteTankHandler?: DeleteTankCommandHandler;
  private resetDemoDataHandler?: ResetDemoDataCommandHandler;
  private addRacksHandler?: AddRacksCommandHandler;
  private updateRackHandler?: UpdateRackCommandHandler;
  private deleteRackHandler?: DeleteRackCommandHandler;
  private assignRackHandler?: AssignRackCommandHandler;
  private addBoxesHandler?: AddBoxesCommandHandler;
  private updateBoxHandler?: UpdateBoxCommandHandler;
  private deleteBoxHandler?: DeleteBoxCommandHandler;
  private assignBoxHandler?: AssignBoxCommandHandler;
  private bulkUnassignHandler?: BulkUnassignResourcesCommandHandler;
  private bulkReassignHandler?: BulkReassignResourcesCommandHandler;
  private initializeStorageHandler?: InitializeStorageCommandHandler;
  private seedDemoHandler?: SeedDemoCommandHandler;
  private unseedDemoHandler?: UnseedDemoCommandHandler;

  // Query handlers
  private getCurrentStorageHandler?: GetCurrentStorageQueryHandler;
  private getStorageHistoryHandler?: GetStorageHistoryQueryHandler;
  private getStorageByVersionHandler?: GetStorageByVersionQueryHandler;
  private checkStorageHealthHandler?: CheckStorageHealthQueryHandler;
  private getSystemMetricsHandler?: GetSystemMetricsQueryHandler;

  // Services
  private lookupValueApplicationService?: LookupValueApplicationService;
  private securityConfigApplicationService?: SecurityConfigApplicationService;
  private storageAnalyticsApplicationService?: StorageAnalyticsApplicationService;

  // Controllers
  private storageController?: StorageController;
  private adminConfigController?: AdminConfigController;
  private lookupValueController?: LookupValueController;
  private storageAnalyticsController?: StorageAnalyticsController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  // Storage command handlers

  getUpdateSystemStorageHandler(): UpdateSystemStorageCommandHandler {
    if (!this.updateSystemStorageHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateSystemStorageHandler = new UpdateSystemStorageCommandHandler(
        repositories.storage,
        this.shared.validationService,
        repositories.users
      );
    }
    return this.updateSystemStorageHandler;
  }

  getResetStorageToDefaultHandler(): ResetStorageToDefaultCommandHandler {
    if (!this.resetStorageToDefaultHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.resetStorageToDefaultHandler = new ResetStorageToDefaultCommandHandler(
        repositories.storage,
        repositories.tubes,
        repositories.users
      );
    }
    return this.resetStorageToDefaultHandler;
  }

  getImportStorageHandler(): ImportStorageCommandHandler {
    if (!this.importStorageHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.importStorageHandler = new ImportStorageCommandHandler(
        repositories.storage,
        this.shared.validationService,
        repositories.users
      );
    }
    return this.importStorageHandler;
  }

  getUpdateResourceLabelHandler(): UpdateResourceLabelCommandHandler {
    if (!this.updateResourceLabelHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateResourceLabelHandler = new UpdateResourceLabelCommandHandler(
        repositories.storage,
        repositories.users,
        this.shared.accessControlService,
        this.shared.eventBus
      );
    }
    return this.updateResourceLabelHandler;
  }

  // Tank/rack/box handlers

  getAddTankHandler(): AddTankCommandHandler {
    if (!this.addTankHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.addTankHandler = new AddTankCommandHandler(
        repositories.storage,
        repositories.labs,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.addTankHandler;
  }

  getUpdateTankHandler(): UpdateTankCommandHandler {
    if (!this.updateTankHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateTankHandler = new UpdateTankCommandHandler(
        repositories.storage,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.updateTankHandler;
  }

  getDeleteTankHandler(): DeleteTankCommandHandler {
    if (!this.deleteTankHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.deleteTankHandler = new DeleteTankCommandHandler(
        repositories.storage,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.deleteTankHandler;
  }

  getResetDemoDataHandler(): ResetDemoDataCommandHandler {
    if (!this.resetDemoDataHandler) {
      this.resetDemoDataHandler = new ResetDemoDataCommandHandler(
        this.repositoryFactory,
        this.repositoryFactory.getUserRepository()
      );
    }
    return this.resetDemoDataHandler;
  }

  getAddRacksHandler(): AddRacksCommandHandler {
    if (!this.addRacksHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.addRacksHandler = new AddRacksCommandHandler(
        repositories.storage,
        repositories.labs,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.addRacksHandler;
  }

  getUpdateRackHandler(): UpdateRackCommandHandler {
    if (!this.updateRackHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateRackHandler = new UpdateRackCommandHandler(
        repositories.storage,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.updateRackHandler;
  }

  getDeleteRackHandler(): DeleteRackCommandHandler {
    if (!this.deleteRackHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.deleteRackHandler = new DeleteRackCommandHandler(
        repositories.storage,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.deleteRackHandler;
  }

  getAssignRackHandler(): AssignRackCommandHandler {
    if (!this.assignRackHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.assignRackHandler = new AssignRackCommandHandler(
        repositories.storage,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.assignRackHandler;
  }

  getAddBoxesHandler(): AddBoxesCommandHandler {
    if (!this.addBoxesHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.addBoxesHandler = new AddBoxesCommandHandler(
        repositories.storage,
        repositories.labs,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.addBoxesHandler;
  }

  getUpdateBoxHandler(): UpdateBoxCommandHandler {
    if (!this.updateBoxHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateBoxHandler = new UpdateBoxCommandHandler(
        repositories.storage,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.updateBoxHandler;
  }

  getDeleteBoxHandler(): DeleteBoxCommandHandler {
    if (!this.deleteBoxHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.deleteBoxHandler = new DeleteBoxCommandHandler(
        repositories.storage,
        repositories.tubes,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.deleteBoxHandler;
  }

  getAssignBoxHandler(): AssignBoxCommandHandler {
    if (!this.assignBoxHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.assignBoxHandler = new AssignBoxCommandHandler(
        repositories.storage,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.assignBoxHandler;
  }

  getBulkUnassignHandler(): BulkUnassignResourcesCommandHandler {
    if (!this.bulkUnassignHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.bulkUnassignHandler = new BulkUnassignResourcesCommandHandler(
        repositories.storage,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.bulkUnassignHandler;
  }

  getBulkReassignHandler(): BulkReassignResourcesCommandHandler {
    if (!this.bulkReassignHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.bulkReassignHandler = new BulkReassignResourcesCommandHandler(
        repositories.storage,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.bulkReassignHandler;
  }

  getInitializeStorageHandler(): InitializeStorageCommandHandler {
    if (!this.initializeStorageHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.initializeStorageHandler = new InitializeStorageCommandHandler(
        repositories.storage,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.initializeStorageHandler;
  }

  getSeedDemoHandler(): SeedDemoCommandHandler {
    if (!this.seedDemoHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.seedDemoHandler = new SeedDemoCommandHandler(
        repositories.storage,
        repositories.labs,
        repositories.users,
        this.repositoryFactory.getAuditRepository()
      );
    }
    return this.seedDemoHandler;
  }

  getUnseedDemoHandler(): UnseedDemoCommandHandler {
    if (!this.unseedDemoHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.unseedDemoHandler = new UnseedDemoCommandHandler(
        repositories.storage,
        repositories.labs,
        repositories.users
      );
    }
    return this.unseedDemoHandler;
  }

  // Query handlers

  getGetCurrentStorageHandler(): GetCurrentStorageQueryHandler {
    if (!this.getCurrentStorageHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getCurrentStorageHandler = new GetCurrentStorageQueryHandler(
        repositories.storage,
        repositories.labs
      );
    }
    return this.getCurrentStorageHandler;
  }

  getGetStorageHistoryHandler(): GetStorageHistoryQueryHandler {
    if (!this.getStorageHistoryHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getStorageHistoryHandler = new GetStorageHistoryQueryHandler(repositories.storage);
    }
    return this.getStorageHistoryHandler;
  }

  getGetStorageByVersionHandler(): GetStorageByVersionQueryHandler {
    if (!this.getStorageByVersionHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getStorageByVersionHandler = new GetStorageByVersionQueryHandler(repositories.storage);
    }
    return this.getStorageByVersionHandler;
  }

  getCheckStorageHealthHandler(): CheckStorageHealthQueryHandler {
    if (!this.checkStorageHealthHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.checkStorageHealthHandler = new CheckStorageHealthQueryHandler(repositories.storage);
    }
    return this.checkStorageHealthHandler;
  }

  getGetSystemMetricsHandler(): GetSystemMetricsQueryHandler {
    if (!this.getSystemMetricsHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getSystemMetricsHandler = new GetSystemMetricsQueryHandler(repositories.storage);
    }
    return this.getSystemMetricsHandler;
  }

  // Services

  getSecurityConfigApplicationService(): SecurityConfigApplicationService {
    if (!this.securityConfigApplicationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.securityConfigApplicationService = new SecurityConfigApplicationService({
        storageRepository: repositories.storage,
      });
    }
    return this.securityConfigApplicationService;
  }

  getLookupValueApplicationService(): LookupValueApplicationService {
    if (!this.lookupValueApplicationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.lookupValueApplicationService = new LookupValueApplicationService(
        repositories.lookupValues,
        repositories.storage,
        repositories.equipmentItems,
        repositories.donors,
        repositories.supplyItems,
        repositories.reagentItems
      );
    }
    return this.lookupValueApplicationService;
  }

  getStorageAnalyticsApplicationService(): StorageAnalyticsApplicationService {
    if (!this.storageAnalyticsApplicationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.storageAnalyticsApplicationService = new StorageAnalyticsApplicationService({
        storageRepository: repositories.storage,
        tubeRepository: repositories.tubes,
        labRepository: repositories.labs,
      });
    }
    return this.storageAnalyticsApplicationService;
  }

  // Controllers

  getStorageController(): StorageController {
    if (!this.storageController) {
      this.storageController = new StorageController({
        getCurrentStorageHandler: this.getGetCurrentStorageHandler(),
        getStorageHistoryHandler: this.getGetStorageHistoryHandler(),
        getStorageByVersionHandler: this.getGetStorageByVersionHandler(),
        checkStorageHealthHandler: this.getCheckStorageHealthHandler(),
        updateSystemStorageHandler: this.getUpdateSystemStorageHandler(),
        resetStorageHandler: this.getResetStorageToDefaultHandler(),
        importStorageHandler: this.getImportStorageHandler(),
        updateResourceLabelHandler: this.getUpdateResourceLabelHandler(),
        addTankHandler: this.getAddTankHandler(),
        updateTankHandler: this.getUpdateTankHandler(),
        deleteTankHandler: this.getDeleteTankHandler(),
        resetDemoDataHandler: this.getResetDemoDataHandler(),
        addRacksHandler: this.getAddRacksHandler(),
        updateRackHandler: this.getUpdateRackHandler(),
        deleteRackHandler: this.getDeleteRackHandler(),
        assignRackHandler: this.getAssignRackHandler(),
        addBoxesHandler: this.getAddBoxesHandler(),
        updateBoxHandler: this.getUpdateBoxHandler(),
        deleteBoxHandler: this.getDeleteBoxHandler(),
        assignBoxHandler: this.getAssignBoxHandler(),
        bulkUnassignHandler: this.getBulkUnassignHandler(),
        bulkReassignHandler: this.getBulkReassignHandler(),
        seedDemoHandler: this.getSeedDemoHandler(),
        unseedDemoHandler: this.getUnseedDemoHandler(),
        initializeConfigHandler: this.getInitializeStorageHandler(),
      });
    }
    return this.storageController;
  }

  getAdminConfigController(): AdminConfigController {
    if (!this.adminConfigController) {
      this.adminConfigController = new AdminConfigController({
        securityConfigService: this.getSecurityConfigApplicationService(),
        getSystemMetricsHandler: this.getGetSystemMetricsHandler(),
      });
    }
    return this.adminConfigController;
  }

  getLookupValueController(): LookupValueController {
    if (!this.lookupValueController) {
      this.lookupValueController = new LookupValueController({
        lookupValueService: this.getLookupValueApplicationService(),
      });
    }
    return this.lookupValueController;
  }

  getStorageAnalyticsController(): StorageAnalyticsController {
    if (!this.storageAnalyticsController) {
      this.storageAnalyticsController = new StorageAnalyticsController({
        storageAnalyticsService: this.getStorageAnalyticsApplicationService(),
      });
    }
    return this.storageAnalyticsController;
  }
}
