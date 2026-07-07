/**
 * Lab DI Module
 *
 * Lazy-singleton wiring for lab management, invite codes, and demo limits.
 */

import { UpdateDemoLimitsCommandHandler } from '@application/commands/DemoSeedCommands';
import { CreateInviteCodeCommandHandler, DeactivateInviteCodeCommandHandler } from '@application/commands/InviteCodeCommands';
import { CreateLabCommandHandler, UpdateLabCommandHandler, DeactivateLabCommandHandler, ActivateLabCommandHandler } from '@application/commands/LabCommands';
import { ValidateInviteCodeQueryHandler, ListInviteCodesQueryHandler } from '@application/queries/InviteCodeQueries';
import { LabApplicationService } from '@application/services/LabApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { InviteCodeController } from '@presentation/controllers/InviteCodeController';
import { LabController } from '@presentation/controllers/LabController';

export class LabModule {
  private createLabHandler?: CreateLabCommandHandler;
  private updateLabHandler?: UpdateLabCommandHandler;
  private deactivateLabHandler?: DeactivateLabCommandHandler;
  private activateLabHandler?: ActivateLabCommandHandler;
  private updateDemoLimitsHandler?: UpdateDemoLimitsCommandHandler;
  private createInviteCodeHandler?: CreateInviteCodeCommandHandler;
  private deactivateInviteCodeHandler?: DeactivateInviteCodeCommandHandler;
  private validateInviteCodeHandler?: ValidateInviteCodeQueryHandler;
  private listInviteCodesHandler?: ListInviteCodesQueryHandler;
  private labApplicationService?: LabApplicationService;
  private labController?: LabController;
  private inviteCodeController?: InviteCodeController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  // Handlers

  getCreateLabHandler(): CreateLabCommandHandler {
    if (!this.createLabHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.createLabHandler = new CreateLabCommandHandler(
        repositories.labs,
        repositories.storage,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.createLabHandler;
  }

  getUpdateLabHandler(): UpdateLabCommandHandler {
    if (!this.updateLabHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateLabHandler = new UpdateLabCommandHandler(
        repositories.labs,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.updateLabHandler;
  }

  getDeactivateLabHandler(): DeactivateLabCommandHandler {
    if (!this.deactivateLabHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.deactivateLabHandler = new DeactivateLabCommandHandler(
        repositories.labs,
        repositories.users,
        repositories.userSessions,
        this.shared.eventBus
      );
    }
    return this.deactivateLabHandler;
  }

  getActivateLabHandler(): ActivateLabCommandHandler {
    if (!this.activateLabHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.activateLabHandler = new ActivateLabCommandHandler(
        repositories.labs,
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.activateLabHandler;
  }

  getUpdateDemoLimitsHandler(): UpdateDemoLimitsCommandHandler {
    if (!this.updateDemoLimitsHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateDemoLimitsHandler = new UpdateDemoLimitsCommandHandler(
        repositories.labs,
        repositories.users
      );
    }
    return this.updateDemoLimitsHandler;
  }

  getCreateInviteCodeHandler(): CreateInviteCodeCommandHandler {
    if (!this.createInviteCodeHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.createInviteCodeHandler = new CreateInviteCodeCommandHandler(
        repositories.inviteCodes,
        repositories.labs,
        repositories.users,
        repositories.storage,
        this.shared.eventBus
      );
    }
    return this.createInviteCodeHandler;
  }

  getDeactivateInviteCodeHandler(): DeactivateInviteCodeCommandHandler {
    if (!this.deactivateInviteCodeHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.deactivateInviteCodeHandler = new DeactivateInviteCodeCommandHandler(
        repositories.inviteCodes,
        repositories.users
      );
    }
    return this.deactivateInviteCodeHandler;
  }

  getValidateInviteCodeHandler(): ValidateInviteCodeQueryHandler {
    if (!this.validateInviteCodeHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.validateInviteCodeHandler = new ValidateInviteCodeQueryHandler(
        repositories.inviteCodes,
        repositories.labs
      );
    }
    return this.validateInviteCodeHandler;
  }

  getListInviteCodesHandler(): ListInviteCodesQueryHandler {
    if (!this.listInviteCodesHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.listInviteCodesHandler = new ListInviteCodesQueryHandler(
        repositories.inviteCodes
      );
    }
    return this.listInviteCodesHandler;
  }

  getLabApplicationService(): LabApplicationService {
    if (!this.labApplicationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.labApplicationService = new LabApplicationService({
        labRepository: repositories.labs,
        userRepository: repositories.users,
        tubeRepository: repositories.tubes,
        storageRepository: repositories.storage,
        researcherRepository: repositories.researchers,
        personRepository: repositories.persons,
      });
    }
    return this.labApplicationService;
  }

  // Controllers

  getLabController(): LabController {
    if (!this.labController) {
      this.labController = new LabController({
        createLabHandler: this.getCreateLabHandler(),
        updateLabHandler: this.getUpdateLabHandler(),
        deactivateLabHandler: this.getDeactivateLabHandler(),
        activateLabHandler: this.getActivateLabHandler(),
        updateDemoLimitsHandler: this.getUpdateDemoLimitsHandler(),
        labApplicationService: this.getLabApplicationService(),
      });
    }
    return this.labController;
  }

  getInviteCodeController(): InviteCodeController {
    if (!this.inviteCodeController) {
      this.inviteCodeController = new InviteCodeController({
        createInviteCodeHandler: this.getCreateInviteCodeHandler(),
        deactivateInviteCodeHandler: this.getDeactivateInviteCodeHandler(),
        validateInviteCodeHandler: this.getValidateInviteCodeHandler(),
        listInviteCodesHandler: this.getListInviteCodesHandler(),
      });
    }
    return this.inviteCodeController;
  }
}
