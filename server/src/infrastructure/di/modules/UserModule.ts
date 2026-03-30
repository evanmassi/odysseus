/**
 * User DI Module
 *
 * Lazy-singleton wiring for user management, roles, settings, researchers, and persons.
 */

import { ChangeUserRoleCommandHandler, UpdateUserSettingsCommandHandler } from '@application/commands/UserCommands';
import { GetUserSettingsQueryHandler, CheckFirstTimeSetupQueryHandler, GetUserByIdQueryHandler, GetUserStatisticsQueryHandler } from '@application/queries/UserQueries';
import { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import { UserApplicationService } from '@application/services/UserApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { PersonController } from '@presentation/controllers/PersonController';
import { ResearcherController } from '@presentation/controllers/ResearcherController';
import { SecurityMonitoringController } from '@presentation/controllers/system/SecurityMonitoringController';
import { SystemAdminUserController } from '@presentation/controllers/system/SystemAdminUserController';
import { UserController } from '@presentation/controllers/UserController';
import { UserSessionController } from '@presentation/controllers/UserSessionController';

export class UserModule {
  private changeRoleHandler?: ChangeUserRoleCommandHandler;
  private updateUserSettingsHandler?: UpdateUserSettingsCommandHandler;
  private getUserSettingsHandler?: GetUserSettingsQueryHandler;
  private checkFirstTimeHandler?: CheckFirstTimeSetupQueryHandler;
  private getUserByIdHandler?: GetUserByIdQueryHandler;
  private getUserStatsHandler?: GetUserStatisticsQueryHandler;
  private userApplicationService?: UserApplicationService;
  private researcherApplicationService?: ResearcherApplicationService;
  private userController?: UserController;
  private personController?: PersonController;
  private userSessionController?: UserSessionController;
  private systemAdminUserController?: SystemAdminUserController;
  private securityMonitoringController?: SecurityMonitoringController;
  private researcherController?: ResearcherController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  // Handlers

  getChangeRoleHandler(): ChangeUserRoleCommandHandler {
    if (!this.changeRoleHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.changeRoleHandler = new ChangeUserRoleCommandHandler(
        repositories.users,
        this.shared.eventBus
      );
    }
    return this.changeRoleHandler;
  }

  getUpdateUserSettingsHandler(): UpdateUserSettingsCommandHandler {
    if (!this.updateUserSettingsHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateUserSettingsHandler = new UpdateUserSettingsCommandHandler(
        repositories.users
      );
    }
    return this.updateUserSettingsHandler;
  }

  getGetUserSettingsHandler(): GetUserSettingsQueryHandler {
    if (!this.getUserSettingsHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getUserSettingsHandler = new GetUserSettingsQueryHandler(
        repositories.users
      );
    }
    return this.getUserSettingsHandler;
  }

  getCheckFirstTimeHandler(): CheckFirstTimeSetupQueryHandler {
    if (!this.checkFirstTimeHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.checkFirstTimeHandler = new CheckFirstTimeSetupQueryHandler(
        repositories.users
      );
    }
    return this.checkFirstTimeHandler;
  }

  getGetUserByIdHandler(): GetUserByIdQueryHandler {
    if (!this.getUserByIdHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getUserByIdHandler = new GetUserByIdQueryHandler(
        repositories.users
      );
    }
    return this.getUserByIdHandler;
  }

  getGetUserStatsHandler(): GetUserStatisticsQueryHandler {
    if (!this.getUserStatsHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getUserStatsHandler = new GetUserStatisticsQueryHandler(
        repositories.users
      );
    }
    return this.getUserStatsHandler;
  }

  // Services

  getUserApplicationService(): UserApplicationService {
    if (!this.userApplicationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.userApplicationService = new UserApplicationService(
        repositories.users,
        this.shared.accessControlService,
        repositories.persons,
        repositories.researchers,
        repositories.storage,
        this.shared.eventBus,
        repositories.inviteCodes,
        repositories.labs,
        repositories.userSessions,
        this.shared.passwordService,
        repositories.tubes
      );
    }
    return this.userApplicationService;
  }

  getResearcherApplicationService(): ResearcherApplicationService {
    if (!this.researcherApplicationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.researcherApplicationService = new ResearcherApplicationService(
        repositories.researchers,
        repositories.users,
        repositories.persons,
        repositories.tubes,
        this.shared.accessControlService,
        this.shared.eventBus
      );
    }
    return this.researcherApplicationService;
  }

  // Controllers

  getUserController(): UserController {
    if (!this.userController) {
      this.userController = new UserController({
        updateUserSettingsHandler: this.getUpdateUserSettingsHandler(),
        getUserSettingsHandler: this.getGetUserSettingsHandler(),
        userRepository: this.repositoryFactory.getUserRepository(),
        personRepository: this.repositoryFactory.getPersonRepository(),
      });
    }
    return this.userController;
  }

  getPersonController(): PersonController {
    if (!this.personController) {
      this.personController = new PersonController({
        personRepository: this.repositoryFactory.getPersonRepository(),
        userRepository: this.repositoryFactory.getUserRepository(),
        passwordService: this.shared.passwordService,
      });
    }
    return this.personController;
  }

  getUserSessionController(): UserSessionController {
    if (!this.userSessionController) {
      this.userSessionController = new UserSessionController({
        userSessionRepository: this.repositoryFactory.getUserSessionRepository(),
      });
    }
    return this.userSessionController;
  }

  getSystemAdminUserController(): SystemAdminUserController {
    if (!this.systemAdminUserController) {
      this.systemAdminUserController = new SystemAdminUserController({
        userApplicationService: this.getUserApplicationService(),
      });
    }
    return this.systemAdminUserController;
  }

  getSecurityMonitoringController(): SecurityMonitoringController {
    if (!this.securityMonitoringController) {
      this.securityMonitoringController = new SecurityMonitoringController({
        userSessionRepository: this.repositoryFactory.getUserSessionRepository(),
        refreshTokenRepository: this.repositoryFactory.getRefreshTokenRepository(),
        auditRepository: this.repositoryFactory.getAuditRepository(),
      });
    }
    return this.securityMonitoringController;
  }

  getResearcherController(): ResearcherController {
    if (!this.researcherController) {
      this.researcherController = new ResearcherController({
        researcherApplicationService: this.getResearcherApplicationService(),
      });
    }
    return this.researcherController;
  }
}
