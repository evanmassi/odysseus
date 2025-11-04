import { RepositoryFactory } from '@infrastructure/repositories';

// CQRS Command Handlers
import { CreateUserCommandHandler, LoginCommandHandler, ChangeUserPasswordCommandHandler, ChangeUserRoleCommandHandler, DeleteUserCommandHandler, UpdateUserSettingsCommandHandler, GetUserSettingsQueryHandler } from '@application/commands/UserCommands';
import { UpdateSystemConfigurationCommandHandler, UpdateEquipmentConfigurationCommandHandler, ResetConfigurationToDefaultCommandHandler, ImportConfigurationCommandHandler, UpdateConfigurationCommandHandler, UpdateBoxPositionDisplayCommandHandler, UpdateLabDefaultPositionDisplayCommandHandler } from '@application/commands/ConfigurationCommands';
import { SendVerificationEmailCommandHandler, VerifyEmailCommandHandler, ResendVerificationEmailCommandHandler } from '@application/commands/EmailVerificationCommands';
import { AdminResetPasswordCommandHandler, GeneratePasswordResetTokenCommandHandler, ResetPasswordWithTokenCommandHandler } from '@application/commands/PasswordResetCommands';

// CQRS Query Handlers
import { CheckFirstTimeSetupQueryHandler, GetUserByIdQueryHandler, GetAllUsersQueryHandler, GetUserStatisticsQueryHandler } from '@application/queries/UserQueries';
import { GetCurrentConfigurationQueryHandler, GetConfigurationHistoryQueryHandler, GetConfigurationByVersionQueryHandler, CheckConfigurationHealthQueryHandler } from '@application/queries/ConfigurationQueries';

// Event Bus
import { InMemoryEventBus } from '@infrastructure/events/InMemoryEventBus';

// Controllers
import { AuthController } from '@presentation/controllers/AuthController';
import { TubeController } from '@presentation/controllers/TubeController';
import { ResearcherController } from '@presentation/controllers/ResearcherController';
import { ConfigurationController } from '@presentation/controllers/ConfigurationController';
import { SearchController } from '@presentation/controllers/SearchController';
import { UserController } from '@presentation/controllers/UserController';

// Application services
import { TubeApplicationService } from '@application/services/TubeApplicationService';
import { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import { UserApplicationService } from '@application/services/UserApplicationService';
import { TubePositionService, AccessControlService, ValidationService } from '@domain/services';

// Infrastructure services
import { BcryptPasswordService } from '@infrastructure/services/BcryptPasswordService';
import { JwtSessionService } from '@infrastructure/services/JwtSessionService';
import { ExpressAuthMiddleware } from '@infrastructure/security/ExpressAuthMiddleware';
import { ConfigurationService } from '@infrastructure/configuration/ConfigurationService';
import { ConsoleEmailService } from '@infrastructure/services/ConsoleEmailService';

// Contracts
import { PasswordService } from '@application/contracts/PasswordService';
import { SessionService } from '@application/commands/UserCommands';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { EmailService } from '@domain/services/EmailService';

/**
 * ServiceContainer - CQRS-based Dependency injection container
 * 
 * Manages all CQRS handlers, controllers, and infrastructure dependencies.
 * Clean separation of concerns with proper dependency injection.
 */
export class ServiceContainer {
  private repositoryFactory: RepositoryFactory;
  private configurationService: ConfigurationService;
  
  // Event Bus
  private eventBus?: InMemoryEventBus;
  
  // CQRS Command Handlers - User Domain
  private createUserHandler?: CreateUserCommandHandler;
  private loginHandler?: LoginCommandHandler;
  private changePasswordHandler?: ChangeUserPasswordCommandHandler;
  private changeRoleHandler?: ChangeUserRoleCommandHandler;
  private deleteUserHandler?: DeleteUserCommandHandler;
  private sendVerificationEmailHandler?: SendVerificationEmailCommandHandler;
  private verifyEmailHandler?: VerifyEmailCommandHandler;
  private resendVerificationHandler?: ResendVerificationEmailCommandHandler;
  private adminResetPasswordHandler?: AdminResetPasswordCommandHandler;
  private generatePasswordResetTokenHandler?: GeneratePasswordResetTokenCommandHandler;
  private resetPasswordWithTokenHandler?: ResetPasswordWithTokenCommandHandler;
  
  // CQRS Command Handlers - Configuration Domain
  private updateSystemConfigurationHandler?: UpdateSystemConfigurationCommandHandler;
  private updateEquipmentConfigurationHandler?: UpdateEquipmentConfigurationCommandHandler;
  private resetConfigurationToDefaultHandler?: ResetConfigurationToDefaultCommandHandler;
  private importConfigurationHandler?: ImportConfigurationCommandHandler;
  private updateConfigurationHandler?: UpdateConfigurationCommandHandler;
  private updateBoxPositionDisplayHandler?: UpdateBoxPositionDisplayCommandHandler;
  private updateLabDefaultPositionDisplayHandler?: UpdateLabDefaultPositionDisplayCommandHandler;
  private updateUserSettingsHandler?: UpdateUserSettingsCommandHandler;
  private getUserSettingsHandler?: GetUserSettingsQueryHandler;

  // CQRS Query Handlers - User Domain
  private checkFirstTimeHandler?: CheckFirstTimeSetupQueryHandler;
  private getUserByIdHandler?: GetUserByIdQueryHandler;
  private getAllUsersHandler?: GetAllUsersQueryHandler;
  private getUserStatsHandler?: GetUserStatisticsQueryHandler;
  
  // CQRS Query Handlers - Configuration Domain
  private getCurrentConfigurationHandler?: GetCurrentConfigurationQueryHandler;
  private getConfigurationHistoryHandler?: GetConfigurationHistoryQueryHandler;
  private getConfigurationByVersionHandler?: GetConfigurationByVersionQueryHandler;
  private checkConfigurationHealthHandler?: CheckConfigurationHealthQueryHandler;
  
  // Controllers
  private authController?: AuthController;
  private tubeController?: TubeController;
  private researcherController?: ResearcherController;
  private configurationController?: ConfigurationController;
  private searchController?: SearchController;
  private userController?: UserController;

  // Infrastructure services
  private passwordService?: PasswordService;
  private sessionService?: SessionService;
  private emailService?: EmailService;

  // Application services
  private tubeApplicationService?: TubeApplicationService;
  private researcherApplicationService?: ResearcherApplicationService;
  private userApplicationService?: UserApplicationService;
  private tubePositionService?: TubePositionService;
  private accessControlService?: AccessControlService;
  private validationService?: ValidationService;
  
  // Middleware
  private authMiddleware?: AuthMiddleware;

  constructor(repositoryFactory: RepositoryFactory) {
    this.repositoryFactory = repositoryFactory;
    this.configurationService = new ConfigurationService();
  }

  // EVENT BUS
  
  getEventBus(): InMemoryEventBus {
    if (!this.eventBus) {
      this.eventBus = new InMemoryEventBus();
    }
    return this.eventBus;
  }

  // INFRASTRUCTURE SERVICES

  getPasswordService(): PasswordService {
    if (!this.passwordService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.passwordService = new BcryptPasswordService(
        repositories.configurations,
        12 // 12 salt rounds
      );
    }
    return this.passwordService;
  }

  getSessionService(): SessionService {
    if (!this.sessionService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.sessionService = new JwtSessionService(
        this.configurationService,
        repositories.users,
        repositories.refreshTokens,
        repositories.configurations,
        repositories.userSessions
      );
    }
    return this.sessionService;
  }

  getEmailService(): EmailService {
    if (!this.emailService) {
      const verificationBaseUrl = process.env.VERIFICATION_BASE_URL || 'http://localhost:3000/verify-email';
      this.emailService = new ConsoleEmailService(verificationBaseUrl);
    }
    return this.emailService;
  }

  // CQRS COMMAND HANDLERS

  getCreateUserHandler(): CreateUserCommandHandler {
    if (!this.createUserHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.createUserHandler = new CreateUserCommandHandler(
        repositories.users,
        this.getPasswordService(),
        this.getEventBus(),
        repositories.configurations
      );
    }
    return this.createUserHandler;
  }

  getLoginHandler(): LoginCommandHandler {
    if (!this.loginHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.loginHandler = new LoginCommandHandler(
        repositories.users,
        this.getSessionService()
      );
    }
    return this.loginHandler;
  }

  getChangePasswordHandler(): ChangeUserPasswordCommandHandler {
    if (!this.changePasswordHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.changePasswordHandler = new ChangeUserPasswordCommandHandler(
        repositories.users,
        this.getPasswordService(),
        this.getEventBus(),
        repositories.configurations
      );
    }
    return this.changePasswordHandler;
  }

  getChangeRoleHandler(): ChangeUserRoleCommandHandler {
    if (!this.changeRoleHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.changeRoleHandler = new ChangeUserRoleCommandHandler(
        repositories.users,
        this.getEventBus()
      );
    }
    return this.changeRoleHandler;
  }

  getDeleteUserHandler(): DeleteUserCommandHandler {
    if (!this.deleteUserHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.deleteUserHandler = new DeleteUserCommandHandler(
        repositories.users,
        this.getEventBus()
      );
    }
    return this.deleteUserHandler;
  }

  getSendVerificationEmailHandler(): SendVerificationEmailCommandHandler {
    if (!this.sendVerificationEmailHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.sendVerificationEmailHandler = new SendVerificationEmailCommandHandler(
        repositories.users,
        repositories.persons,
        this.getEmailService(),
        this.getEventBus()
      );
    }
    return this.sendVerificationEmailHandler;
  }

  getVerifyEmailHandler(): VerifyEmailCommandHandler {
    if (!this.verifyEmailHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.verifyEmailHandler = new VerifyEmailCommandHandler(
        repositories.users,
        repositories.persons,
        this.getEventBus()
      );
    }
    return this.verifyEmailHandler;
  }

  getResendVerificationHandler(): ResendVerificationEmailCommandHandler {
    if (!this.resendVerificationHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.resendVerificationHandler = new ResendVerificationEmailCommandHandler(
        repositories.users,
        repositories.persons,
        this.getEmailService(),
        this.getEventBus()
      );
    }
    return this.resendVerificationHandler;
  }

  getAdminResetPasswordHandler(): AdminResetPasswordCommandHandler {
    if (!this.adminResetPasswordHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.adminResetPasswordHandler = new AdminResetPasswordCommandHandler(
        repositories.users,
        this.getEventBus(),
        repositories.refreshTokens,
        repositories.userSessions
      );
    }
    return this.adminResetPasswordHandler;
  }

  getGeneratePasswordResetTokenHandler(): GeneratePasswordResetTokenCommandHandler {
    if (!this.generatePasswordResetTokenHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.generatePasswordResetTokenHandler = new GeneratePasswordResetTokenCommandHandler(
        repositories.users,
        this.getEventBus()
      );
    }
    return this.generatePasswordResetTokenHandler;
  }

  getResetPasswordWithTokenHandler(): ResetPasswordWithTokenCommandHandler {
    if (!this.resetPasswordWithTokenHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.resetPasswordWithTokenHandler = new ResetPasswordWithTokenCommandHandler(
        repositories.users,
        this.getEventBus(),
        repositories.refreshTokens,
        repositories.userSessions
      );
    }
    return this.resetPasswordWithTokenHandler;
  }

  // CONFIGURATION COMMAND HANDLERS

  getUpdateSystemConfigurationHandler(): UpdateSystemConfigurationCommandHandler {
    if (!this.updateSystemConfigurationHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateSystemConfigurationHandler = new UpdateSystemConfigurationCommandHandler(
        repositories.configurations,
        this.getValidationService(),
        repositories.users
      );
    }
    return this.updateSystemConfigurationHandler;
  }

  getUpdateEquipmentConfigurationHandler(): UpdateEquipmentConfigurationCommandHandler {
    if (!this.updateEquipmentConfigurationHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateEquipmentConfigurationHandler = new UpdateEquipmentConfigurationCommandHandler(
        repositories.configurations,
        this.getValidationService()
      );
    }
    return this.updateEquipmentConfigurationHandler;
  }

  getResetConfigurationToDefaultHandler(): ResetConfigurationToDefaultCommandHandler {
    if (!this.resetConfigurationToDefaultHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.resetConfigurationToDefaultHandler = new ResetConfigurationToDefaultCommandHandler(
        repositories.configurations,
        this.getValidationService()
      );
    }
    return this.resetConfigurationToDefaultHandler;
  }

  getImportConfigurationHandler(): ImportConfigurationCommandHandler {
    if (!this.importConfigurationHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.importConfigurationHandler = new ImportConfigurationCommandHandler(
        repositories.configurations,
        this.getValidationService()
      );
    }
    return this.importConfigurationHandler;
  }

  getUpdateConfigurationHandler(): UpdateConfigurationCommandHandler {
    if (!this.updateConfigurationHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateConfigurationHandler = new UpdateConfigurationCommandHandler(
        repositories.configurations,
        this.getValidationService(),
        repositories.users
      );
    }
    return this.updateConfigurationHandler;
  }

  getUpdateBoxPositionDisplayHandler(): UpdateBoxPositionDisplayCommandHandler {
    if (!this.updateBoxPositionDisplayHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateBoxPositionDisplayHandler = new UpdateBoxPositionDisplayCommandHandler(
        repositories.configurations,
        this.getValidationService(),
        repositories.users
      );
    }
    return this.updateBoxPositionDisplayHandler;
  }

  getUpdateLabDefaultPositionDisplayHandler(): UpdateLabDefaultPositionDisplayCommandHandler {
    if (!this.updateLabDefaultPositionDisplayHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateLabDefaultPositionDisplayHandler = new UpdateLabDefaultPositionDisplayCommandHandler(
        repositories.configurations,
        this.getValidationService(),
        repositories.users
      );
    }
    return this.updateLabDefaultPositionDisplayHandler;
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

  // CQRS QUERY HANDLERS

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

  getGetAllUsersHandler(): GetAllUsersQueryHandler {
    if (!this.getAllUsersHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getAllUsersHandler = new GetAllUsersQueryHandler(
        repositories.users
      );
    }
    return this.getAllUsersHandler;
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

  // CONFIGURATION QUERY HANDLERS

  getGetCurrentConfigurationHandler(): GetCurrentConfigurationQueryHandler {
    if (!this.getCurrentConfigurationHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getCurrentConfigurationHandler = new GetCurrentConfigurationQueryHandler(
        repositories.configurations
      );
    }
    return this.getCurrentConfigurationHandler;
  }

  getGetConfigurationHistoryHandler(): GetConfigurationHistoryQueryHandler {
    if (!this.getConfigurationHistoryHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getConfigurationHistoryHandler = new GetConfigurationHistoryQueryHandler(
        repositories.configurations
      );
    }
    return this.getConfigurationHistoryHandler;
  }

  getGetConfigurationByVersionHandler(): GetConfigurationByVersionQueryHandler {
    if (!this.getConfigurationByVersionHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getConfigurationByVersionHandler = new GetConfigurationByVersionQueryHandler(
        repositories.configurations
      );
    }
    return this.getConfigurationByVersionHandler;
  }

  getGetCheckConfigurationHealthHandler(): CheckConfigurationHealthQueryHandler {
    if (!this.checkConfigurationHealthHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.checkConfigurationHealthHandler = new CheckConfigurationHealthQueryHandler(
        repositories.configurations
      );
    }
    return this.checkConfigurationHealthHandler;
  }

  // CONTROLLERS (CQRS-BASED)

  getAuthController(): AuthController {
    if (!this.authController) {
      this.authController = new AuthController(
        // Command handlers
        this.getCreateUserHandler(),
        this.getLoginHandler(),
        this.getChangePasswordHandler(),
        this.getChangeRoleHandler(),
        this.getDeleteUserHandler(),

        // Email verification handlers
        this.getSendVerificationEmailHandler(),
        this.getVerifyEmailHandler(),
        this.getResendVerificationHandler(),

        // Password reset handlers
        this.getAdminResetPasswordHandler(),
        this.getGeneratePasswordResetTokenHandler(),
        this.getResetPasswordWithTokenHandler(),

        // Query handlers
        this.getCheckFirstTimeHandler(),
        this.getGetUserByIdHandler(),
        this.getGetAllUsersHandler(),
        this.getGetUserStatsHandler(),

        // Services
        this.getSessionService(),
        this.getUserApplicationService(),
        this.getResearcherApplicationService(),

        // Repositories (for admin endpoints)
        this.repositoryFactory.getConfigurationRepository(),
        this.repositoryFactory.getResearcherRepository(),
        this.repositoryFactory.getPersonRepository()
      );
    }
    return this.authController;
  }

  getConfigurationController(): ConfigurationController {
    if (!this.configurationController) {
      this.configurationController = new ConfigurationController(
        // Query handlers (first per constructor)
        this.getGetCurrentConfigurationHandler(),
        this.getGetConfigurationHistoryHandler(),
        this.getGetConfigurationByVersionHandler(),
        this.getGetCheckConfigurationHealthHandler(),

        // Command handlers (second per constructor)
        this.getUpdateSystemConfigurationHandler(),
        this.getUpdateEquipmentConfigurationHandler(),
        this.getResetConfigurationToDefaultHandler(),
        this.getImportConfigurationHandler(),
        this.getUpdateConfigurationHandler(),
        this.getUpdateBoxPositionDisplayHandler(),
        this.getUpdateLabDefaultPositionDisplayHandler()
      );
    }
    return this.configurationController;
  }

  getUserController(): UserController {
    if (!this.userController) {
      this.userController = new UserController(
        this.getUpdateUserSettingsHandler(),
        this.getGetUserSettingsHandler()
      );
    }
    return this.userController;
  }

  // LEGACY SERVICES (for non-migrated controllers)

  getTubePositionService(): TubePositionService {
    if (!this.tubePositionService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.tubePositionService = new TubePositionService(
        repositories.tubes,
        repositories.configurations
      );
    }
    return this.tubePositionService;
  }

  getAccessControlService(): AccessControlService {
    if (!this.accessControlService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.accessControlService = new AccessControlService(
        repositories.users,
        repositories.tubes
      );
    }
    return this.accessControlService;
  }

  getValidationService(): ValidationService {
    if (!this.validationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.validationService = new ValidationService(
        repositories.tubes,
        repositories.users,
        repositories.researchers,
        repositories.configurations,
        this.getTubePositionService(),
        this.getAccessControlService()
      );
    }
    return this.validationService;
  }

  getTubeApplicationService(): TubeApplicationService {
    if (!this.tubeApplicationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.tubeApplicationService = new TubeApplicationService(
        repositories.tubes,
        repositories.users,
        repositories.researchers,
        this.getTubePositionService(),
        this.getAccessControlService()
      );
    }
    return this.tubeApplicationService;
  }

  getResearcherApplicationService(): ResearcherApplicationService {
    if (!this.researcherApplicationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.researcherApplicationService = new ResearcherApplicationService(
        repositories.researchers,
        repositories.users,
        repositories.persons,
        this.getAccessControlService()
      );
    }
    return this.researcherApplicationService;
  }

  getUserApplicationService(): UserApplicationService {
    if (!this.userApplicationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.userApplicationService = new UserApplicationService(
        repositories.users,
        this.getAccessControlService(),
        repositories.persons,
        repositories.researchers,
        repositories.configurations,
        this.repositoryFactory.getSQLiteContext()
      );
    }
    return this.userApplicationService;
  }

  // LEGACY CONTROLLERS (to be migrated)

  getTubeController(): TubeController {
    if (!this.tubeController) {
      this.tubeController = new TubeController(
        this.getTubeApplicationService()
      );
    }
    return this.tubeController;
  }

  getResearcherController(): ResearcherController {
    if (!this.researcherController) {
      this.researcherController = new ResearcherController(
        this.getResearcherApplicationService()
      );
    }
    return this.researcherController;
  }

  getSearchController(): SearchController {
    if (!this.searchController) {
      this.searchController = new SearchController(
        this.getTubeApplicationService()
      );
    }
    return this.searchController;
  }

  // MIDDLEWARE

  getAuthMiddleware(): AuthMiddleware {
    if (!this.authMiddleware) {
      this.authMiddleware = new ExpressAuthMiddleware(
        this.getSessionService()
      );
    }
    return this.authMiddleware;
  }

  // CONTROLLER REGISTRY (for legacy route system)

  getControllers() {
    return {
      tubes: this.getTubeController(),
      auth: this.getAuthController(),
      researchers: this.getResearcherController(),
      configurations: this.getConfigurationController()
    };
  }
}
