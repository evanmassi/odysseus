import { RepositoryFactory } from '@infrastructure/repositories';

// CQRS Command Handlers
import { CreateUserCommandHandler, LoginCommandHandler, ChangeUserPasswordCommandHandler, ChangeUserRoleCommandHandler, DeleteUserCommandHandler, UpdateUserSettingsCommandHandler, GetUserSettingsQueryHandler } from '@application/commands/UserCommands';
import { UpdateSystemConfigurationCommandHandler, UpdateEquipmentConfigurationCommandHandler, ResetConfigurationToDefaultCommandHandler, ImportConfigurationCommandHandler, UpdateConfigurationCommandHandler, UpdateBoxPositionDisplayCommandHandler, UpdateLabDefaultPositionDisplayCommandHandler, UpdateResourceLabelCommandHandler } from '@application/commands/ConfigurationCommands';
import { SendVerificationEmailCommandHandler, VerifyEmailCommandHandler, ResendVerificationEmailCommandHandler } from '@application/commands/EmailVerificationCommands';
import { AdminResetPasswordCommandHandler, GeneratePasswordResetTokenCommandHandler, ResetPasswordWithTokenCommandHandler } from '@application/commands/PasswordResetCommands';

// CQRS Query Handlers
import { CheckFirstTimeSetupQueryHandler, GetUserByIdQueryHandler, GetAllUsersQueryHandler, GetUserStatisticsQueryHandler } from '@application/queries/UserQueries';
import { GetCurrentConfigurationQueryHandler, GetConfigurationHistoryQueryHandler, GetConfigurationByVersionQueryHandler, CheckConfigurationHealthQueryHandler } from '@application/queries/ConfigurationQueries';

// Event Bus
import { InMemoryEventBus } from '@infrastructure/events/InMemoryEventBus';
import { AuditEventHandler } from '@application/eventHandlers/AuditEventHandler';
import { SocketEventHandler } from '@application/eventHandlers/SocketEventHandler';
import type { Server as SocketIOServer } from 'socket.io';

// Controllers
import { AuthController } from '@presentation/controllers/AuthController';
import { TubeController } from '@presentation/controllers/TubeController';
import { TubeLockController } from '@presentation/controllers/TubeLockController';
import { ResearcherController } from '@presentation/controllers/ResearcherController';
import { ConfigurationController } from '@presentation/controllers/ConfigurationController';
import { SearchController } from '@presentation/controllers/SearchController';
import { UserController } from '@presentation/controllers/UserController';
import { PersonController } from '@presentation/controllers/PersonController';
import { SessionController } from '@presentation/controllers/SessionController';
import { AuditController } from '@presentation/controllers/AuditController';

// Application services
import { TubeApplicationService } from '@application/services/TubeApplicationService';
import { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import { UserApplicationService } from '@application/services/UserApplicationService';
import { AuditService } from '@application/services/AuditService';
import { AuditRetentionService } from '@application/services/AuditRetentionService';
import { TubePositionService, AccessControlService, ValidationService } from '@domain/services';
import { ConfigurationChangeDetector } from '@domain/services/ConfigurationChangeDetector';

// Infrastructure services
import { BcryptPasswordService } from '@infrastructure/services/BcryptPasswordService';
import { JwtSessionService } from '@infrastructure/services/JwtSessionService';
import { ExpressAuthMiddleware } from '@infrastructure/security/ExpressAuthMiddleware';
import { ConfigurationService } from '@infrastructure/configuration/ConfigurationService';
import { ConsoleEmailService } from '@infrastructure/services/ConsoleEmailService';
import { AuditArchiveRepository } from '@infrastructure/repositories/AuditArchiveRepository';
import { AuditArchivalJob } from '@infrastructure/jobs/AuditArchivalJob';

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
  private updateResourceLabelHandler?: UpdateResourceLabelCommandHandler;
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
  private tubeLockController?: TubeLockController;
  private researcherController?: ResearcherController;
  private configurationController?: ConfigurationController;
  private searchController?: SearchController;
  private userController?: UserController;
  private personController?: PersonController;
  private sessionController?: SessionController;
  private auditController?: AuditController;

  // Infrastructure services
  private passwordService?: PasswordService;
  private sessionService?: SessionService;
  private emailService?: EmailService;

  // Application services
  private tubeApplicationService?: TubeApplicationService;
  private researcherApplicationService?: ResearcherApplicationService;
  private userApplicationService?: UserApplicationService;
  private auditService?: AuditService;
  private auditRetentionService?: AuditRetentionService;
  private tubePositionService?: TubePositionService;
  private accessControlService?: AccessControlService;
  private validationService?: ValidationService;

  // Infrastructure repositories
  private auditArchiveRepository?: AuditArchiveRepository;

  // Jobs
  private auditArchivalJob?: AuditArchivalJob;

  // Event Handlers
  private auditEventHandler?: AuditEventHandler;
  private socketEventHandler?: SocketEventHandler;

  // Middleware
  private authMiddleware?: AuthMiddleware;

  // Socket.IO server instance
  private socketIO?: SocketIOServer;

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
        this.getSessionService(),
        this.getEventBus()
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
        repositories.configurations,
        repositories.userSessions
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
        this.getEventBus(),
        repositories.configurations
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
        repositories.users,
        this.getEventBus(),
        this.getConfigurationChangeDetector()
      );
    }
    return this.updateConfigurationHandler;
  }

  getConfigurationChangeDetector(): ConfigurationChangeDetector {
    return new ConfigurationChangeDetector();
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

  getUpdateResourceLabelHandler(): UpdateResourceLabelCommandHandler {
    if (!this.updateResourceLabelHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateResourceLabelHandler = new UpdateResourceLabelCommandHandler(
        repositories.configurations,
        repositories.users,
        this.getAccessControlService(),
        this.getEventBus()
      );
    }
    return this.updateResourceLabelHandler;
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
        this.repositoryFactory.getPersonRepository(),

        // Event Bus
        this.getEventBus()
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
        this.getUpdateLabDefaultPositionDisplayHandler(),
        this.getUpdateResourceLabelHandler()
      );
    }
    return this.configurationController;
  }

  getUserController(): UserController {
    if (!this.userController) {
      this.userController = new UserController(
        this.getUpdateUserSettingsHandler(),
        this.getGetUserSettingsHandler(),
        this.repositoryFactory.getUserRepository(),
        this.repositoryFactory.getPersonRepository()
      );
    }
    return this.userController;
  }

  getPersonController(): PersonController {
    if (!this.personController) {
      this.personController = new PersonController(
        this.repositoryFactory.getPersonRepository(),
        this.repositoryFactory.getUserRepository()
      );
    }
    return this.personController;
  }

  getSessionController(): SessionController {
    if (!this.sessionController) {
      this.sessionController = new SessionController(
        this.repositoryFactory.getUserSessionRepository()
      );
    }
    return this.sessionController;
  }

  getAuditService(): AuditService {
    if (!this.auditService) {
      this.auditService = new AuditService(this.repositoryFactory.getAuditRepository());
    }
    return this.auditService;
  }

  getAuditArchiveRepository(): AuditArchiveRepository {
    if (!this.auditArchiveRepository) {
      this.auditArchiveRepository = new AuditArchiveRepository(
        this.repositoryFactory.getSQLiteContext()
      );
    }
    return this.auditArchiveRepository;
  }

  getAuditRetentionService(): AuditRetentionService {
    if (!this.auditRetentionService) {
      this.auditRetentionService = new AuditRetentionService(
        this.repositoryFactory.getAuditRepository(),
        this.getAuditArchiveRepository()
      );
    }
    return this.auditRetentionService;
  }

  getAuditArchivalJob(): AuditArchivalJob {
    if (!this.auditArchivalJob) {
      this.auditArchivalJob = new AuditArchivalJob(
        this.getAuditRetentionService()
      );
    }
    return this.auditArchivalJob;
  }

  getAuditController(): AuditController {
    if (!this.auditController) {
      this.auditController = new AuditController(
        this.getAuditService(),
        this.getAuditRetentionService()
      );
    }
    return this.auditController;
  }

  getAuditEventHandler(): AuditEventHandler {
    if (!this.auditEventHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.auditEventHandler = new AuditEventHandler(
        this.getAuditService(),
        this.getEventBus(),
        repositories.users,
        repositories.configurations
      );
    }
    return this.auditEventHandler;
  }

  /**
   * Initialize Socket.IO event handler
   * Must be called after Socket.IO server is created
   */
  setSocketIO(io: SocketIOServer): void {
    this.socketIO = io;
  }

  getSocketEventHandler(): SocketEventHandler | null {
    if (!this.socketIO) {
      console.warn('⚠️ Socket.IO not initialized. Call setSocketIO() first.');
      return null;
    }

    if (!this.socketEventHandler) {
      this.socketEventHandler = new SocketEventHandler(
        this.socketIO,
        this.getEventBus()
      );
    }
    return this.socketEventHandler;
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
        repositories.persons,
        repositories.configurations,
        this.getTubePositionService(),
        this.getAccessControlService(),
        this.getEventBus()
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
        this.getAccessControlService(),
        this.getEventBus()
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
        this.repositoryFactory.getSQLiteContext(),
        this.getEventBus()
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

  getTubeLockController(): TubeLockController {
    if (!this.tubeLockController) {
      this.tubeLockController = new TubeLockController(
        this.getTubeApplicationService()
      );
    }
    return this.tubeLockController;
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
      configurations: this.getConfigurationController(),
      person: this.getPersonController()
    };
  }
}
