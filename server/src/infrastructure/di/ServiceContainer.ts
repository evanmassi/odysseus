/**
 * Service Container
 *
 * CQRS-based dependency injection container with lazy singleton initialization.
 */

import { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import { logger } from '@infrastructure/logging/logger';

// CQRS Command Handlers
import { CreateUserCommandHandler, LoginCommandHandler, ChangeUserPasswordCommandHandler, ChangeUserRoleCommandHandler, DeleteUserCommandHandler, UpdateUserSettingsCommandHandler } from '@application/commands/UserCommands';
import { GetUserSettingsQueryHandler } from '@application/queries/UserQueries';
import { UpdateSystemStorageCommandHandler, ResetStorageToDefaultCommandHandler, ImportStorageCommandHandler, UpdateBoxPositionDisplayCommandHandler, UpdateLabDefaultPositionDisplayCommandHandler, UpdateResourceLabelCommandHandler } from '@application/commands/StorageCommands';
import { SendVerificationEmailCommandHandler, VerifyEmailCommandHandler, ResendVerificationEmailCommandHandler } from '@application/commands/EmailVerificationCommands';
import { AdminResetPasswordCommandHandler, GeneratePasswordResetTokenCommandHandler, ResetPasswordWithTokenCommandHandler } from '@application/commands/PasswordResetCommands';
// CQRS Command Handlers - Storage Management
import { AddTankCommandHandler, UpdateTankCommandHandler, DeleteTankCommandHandler, ResetDemoDataCommandHandler } from '@application/commands/TankCommands';
import { AddRacksCommandHandler, UpdateRackCommandHandler, DeleteRackCommandHandler, AssignRackCommandHandler } from '@application/commands/RackCommands';
import { AddBoxesCommandHandler, UpdateBoxCommandHandler, DeleteBoxCommandHandler, AssignBoxCommandHandler } from '@application/commands/BoxCommands';
import { BulkUnassignResourcesCommandHandler, BulkReassignResourcesCommandHandler } from '@application/commands/BulkAssignmentCommands';
import { SeedDemoCommandHandler, UnseedDemoCommandHandler, UpdateDemoLimitsCommandHandler } from '@application/commands/DemoSeedCommands';
import { InitializeStorageCommandHandler } from '@application/commands/InitializeStorageCommand';
import { CreateSystemAdminCommandHandler } from '@application/commands/UserCommands';
import { CreateLabCommandHandler, UpdateLabCommandHandler, DeactivateLabCommandHandler, ActivateLabCommandHandler } from '@application/commands/LabCommands';
import { CreateInviteCodeCommandHandler, DeactivateInviteCodeCommandHandler } from '@application/commands/InviteCodeCommands';
import { ValidateInviteCodeQueryHandler } from '@application/queries/InviteCodeQueries';

// CQRS Query Handlers
import { CheckFirstTimeSetupQueryHandler, GetUserByIdQueryHandler, GetUserStatisticsQueryHandler } from '@application/queries/UserQueries';
import { GetCurrentStorageQueryHandler, GetStorageHistoryQueryHandler, GetStorageByVersionQueryHandler, CheckStorageHealthQueryHandler } from '@application/queries/StorageQueries';

// Event Bus
import { InMemoryEventBus } from '@infrastructure/events/InMemoryEventBus';
import { AuditEventHandler } from '@application/event-handlers/AuditEventHandler';
import { SocketEventHandler } from '@application/event-handlers/SocketEventHandler';
import { ResearcherApprovalEventHandler } from '@application/event-handlers/ResearcherApprovalEventHandler';
import type { Server as SocketIOServer } from 'socket.io';

// Controllers
import { PublicAuthController } from '@presentation/controllers/auth/PublicAuthController';
import { AuthController } from '@presentation/controllers/auth/AuthController';
import { AdminUserController } from '@presentation/controllers/admin/AdminUserController';
import { AdminConfigController } from '@presentation/controllers/admin/AdminConfigController';
import { SystemAdminUserController } from '@presentation/controllers/system/SystemAdminUserController';
import { TubeController } from '@presentation/controllers/TubeController';
import { TubeLockController } from '@presentation/controllers/TubeLockController';
import { ResearcherController } from '@presentation/controllers/ResearcherController';
import { StorageController } from '@presentation/controllers/StorageController';
import { SearchController } from '@presentation/controllers/SearchController';
import { UserController } from '@presentation/controllers/UserController';
import { PersonController } from '@presentation/controllers/PersonController';
import { UserSessionController } from '@presentation/controllers/UserSessionController';
import { AuditController } from '@presentation/controllers/AuditController';
import { ExportController } from '@presentation/controllers/ExportController';
import { LookupValueController } from '@presentation/controllers/LookupValueController';
import { LabController } from '@presentation/controllers/LabController';
import { InviteCodeController } from '@presentation/controllers/InviteCodeController';

// Application services
import { TubeApplicationService } from '@application/services/TubeApplicationService';
import { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import { UserApplicationService } from '@application/services/UserApplicationService';
import { AuditService } from '@application/services/AuditService';
import { AuditRetentionService } from '@application/services/AuditRetentionService';
import { ExportService } from '@application/services/ExportService';
import { LookupValueApplicationService } from '@application/services/LookupValueApplicationService';
import { PresenceService } from '@application/services/PresenceService';
import { TubePositionService } from '@domain/services/TubePositionService';
import { AccessControlService } from '@domain/services/AccessControlService';
import { ValidationService } from '@domain/services/ValidationService';
// Infrastructure services
import { BcryptPasswordService } from '@infrastructure/services/BcryptPasswordService';
import { JwtSessionService } from '@infrastructure/services/JwtSessionService';
import { ExpressAuthMiddleware } from '@infrastructure/security/ExpressAuthMiddleware';
import { ConfigurationService } from '@infrastructure/services/ConfigurationService';
import { ConsoleEmailService } from '@infrastructure/services/ConsoleEmailService';
import { AuditArchiveRepository } from '@infrastructure/repositories/AuditArchiveRepository';
import { AuditArchivalJob } from '@infrastructure/jobs/AuditArchivalJob';

// Contracts
import { PasswordService } from '@application/contracts/PasswordService';
import { SessionService } from '@application/contracts/SessionService';
import { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import { EmailService } from '@domain/services/EmailService';

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
  
  // CQRS Command Handlers - Storage Domain
  private updateSystemStorageHandler?: UpdateSystemStorageCommandHandler;
  private resetStorageToDefaultHandler?: ResetStorageToDefaultCommandHandler;
  private importStorageHandler?: ImportStorageCommandHandler;
  private updateBoxPositionDisplayHandler?: UpdateBoxPositionDisplayCommandHandler;
  private updateLabDefaultPositionDisplayHandler?: UpdateLabDefaultPositionDisplayCommandHandler;
  private updateResourceLabelHandler?: UpdateResourceLabelCommandHandler;
  private updateUserSettingsHandler?: UpdateUserSettingsCommandHandler;
  private getUserSettingsHandler?: GetUserSettingsQueryHandler;

  // CQRS Command Handlers - Storage Management
  private addTankHandler?: AddTankCommandHandler;
  private updateTankHandler?: UpdateTankCommandHandler;
  private deleteTankHandler?: DeleteTankCommandHandler;
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
  private initializeConfigHandler?: InitializeStorageCommandHandler;
  private seedDemoHandler?: SeedDemoCommandHandler;
  private unseedDemoHandler?: UnseedDemoCommandHandler;
  private updateDemoLimitsHandler?: UpdateDemoLimitsCommandHandler;

  // CQRS Command Handlers - Multi-Tenancy
  private createSystemAdminHandler?: CreateSystemAdminCommandHandler;
  private createLabHandler?: CreateLabCommandHandler;
  private updateLabHandler?: UpdateLabCommandHandler;
  private deactivateLabHandler?: DeactivateLabCommandHandler;
  private activateLabHandler?: ActivateLabCommandHandler;
  private createInviteCodeHandler?: CreateInviteCodeCommandHandler;
  private deactivateInviteCodeHandler?: DeactivateInviteCodeCommandHandler;
  private validateInviteCodeHandler?: ValidateInviteCodeQueryHandler;

  // CQRS Query Handlers - User Domain
  private checkFirstTimeHandler?: CheckFirstTimeSetupQueryHandler;
  private getUserByIdHandler?: GetUserByIdQueryHandler;
  private getUserStatsHandler?: GetUserStatisticsQueryHandler;
  
  // CQRS Query Handlers - Storage Domain
  private getCurrentStorageHandler?: GetCurrentStorageQueryHandler;
  private getStorageHistoryHandler?: GetStorageHistoryQueryHandler;
  private getStorageByVersionHandler?: GetStorageByVersionQueryHandler;
  private checkStorageHealthHandler?: CheckStorageHealthQueryHandler;
  private resetDemoDataHandler?: ResetDemoDataCommandHandler;

  // Controllers
  private publicAuthController?: PublicAuthController;
  private authController?: AuthController;
  private adminUserController?: AdminUserController;
  private adminConfigController?: AdminConfigController;
  private systemAdminUserController?: SystemAdminUserController;
  private tubeController?: TubeController;
  private tubeLockController?: TubeLockController;
  private researcherController?: ResearcherController;
  private storageController?: StorageController;
  private searchController?: SearchController;
  private userController?: UserController;
  private personController?: PersonController;
  private userSessionController?: UserSessionController;
  private auditController?: AuditController;
  private exportController?: ExportController;
  private lookupValueController?: LookupValueController;
  private labController?: LabController;
  private inviteCodeController?: InviteCodeController;

  // Application services - Export
  private exportService?: ExportService;

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
  private presenceService?: PresenceService;
  private lookupValueApplicationService?: LookupValueApplicationService;

  // Infrastructure repositories
  private auditArchiveRepository?: AuditArchiveRepository;

  // Jobs
  private auditArchivalJob?: AuditArchivalJob;

  // Event Handlers
  private auditEventHandler?: AuditEventHandler;
  private socketEventHandler?: SocketEventHandler;
  private researcherApprovalEventHandler?: ResearcherApprovalEventHandler;

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
      this.passwordService = new BcryptPasswordService();
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
        repositories.storage,
        repositories.userSessions,
        repositories.labs
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
        this.getEventBus(),
        repositories.storage
      );
    }
    return this.createUserHandler;
  }

  getLoginHandler(): LoginCommandHandler {
    if (!this.loginHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.loginHandler = new LoginCommandHandler(
        repositories.users,
        this.getEventBus(),
        repositories.labs
      );
    }
    return this.loginHandler;
  }

  getChangePasswordHandler(): ChangeUserPasswordCommandHandler {
    if (!this.changePasswordHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.changePasswordHandler = new ChangeUserPasswordCommandHandler(
        repositories.users,
        this.getEventBus(),
        repositories.storage,
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
        repositories.storage
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
        this.getEventBus(),
        process.env.RESET_PASSWORD_BASE_URL || 'http://localhost:3000/reset-password'
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

  getUpdateSystemStorageHandler(): UpdateSystemStorageCommandHandler {
    if (!this.updateSystemStorageHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateSystemStorageHandler = new UpdateSystemStorageCommandHandler(
        repositories.storage,
        this.getValidationService(),
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

  getImportConfigurationHandler(): ImportStorageCommandHandler {
    if (!this.importStorageHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.importStorageHandler = new ImportStorageCommandHandler(
        repositories.storage,
        this.getValidationService(),
        repositories.users
      );
    }
    return this.importStorageHandler;
  }

  getUpdateBoxPositionDisplayHandler(): UpdateBoxPositionDisplayCommandHandler {
    if (!this.updateBoxPositionDisplayHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateBoxPositionDisplayHandler = new UpdateBoxPositionDisplayCommandHandler(
        repositories.storage,
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
        repositories.storage,
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
        repositories.storage,
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

  // STORAGE MANAGEMENT COMMAND HANDLERS

  getAddTankHandler(): AddTankCommandHandler {
    if (!this.addTankHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.addTankHandler = new AddTankCommandHandler(
        repositories.storage,
        repositories.labs,
        repositories.users,
        this.getEventBus()
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
        this.getEventBus()
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
        this.getEventBus()
      );
    }
    return this.deleteTankHandler;
  }

  getResetDemoDataHandler(): ResetDemoDataCommandHandler {
    if (!this.resetDemoDataHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.resetDemoDataHandler = new ResetDemoDataCommandHandler(
        repositories.storage,
        repositories.tubes,
        repositories.users
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
        this.getEventBus()
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
        this.getEventBus()
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
        this.getEventBus()
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
        this.getEventBus()
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
        this.getEventBus()
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
        this.getEventBus()
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
        this.getEventBus()
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
        this.getEventBus()
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
        this.getEventBus()
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
        this.getEventBus()
      );
    }
    return this.bulkReassignHandler;
  }

  getInitializeConfigHandler(): InitializeStorageCommandHandler {
    if (!this.initializeConfigHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.initializeConfigHandler = new InitializeStorageCommandHandler(
        repositories.storage,
        repositories.users,
        this.getEventBus()
      );
    }
    return this.initializeConfigHandler;
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

  // MULTI-TENANCY COMMAND HANDLERS

  getCreateSystemAdminHandler(): CreateSystemAdminCommandHandler {
    if (!this.createSystemAdminHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.createSystemAdminHandler = new CreateSystemAdminCommandHandler(
        repositories.users,
        repositories.storage,
        this.getEventBus(),
        repositories.persons,
        process.env.SYSTEM_ADMIN_SETUP_KEY
      );
    }
    return this.createSystemAdminHandler;
  }

  getCreateLabHandler(): CreateLabCommandHandler {
    if (!this.createLabHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.createLabHandler = new CreateLabCommandHandler(
        repositories.labs,
        repositories.storage,
        repositories.users,
        this.getEventBus()
      );
    }
    return this.createLabHandler;
  }

  getUpdateLabHandler(): UpdateLabCommandHandler {
    if (!this.updateLabHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.updateLabHandler = new UpdateLabCommandHandler(
        repositories.labs,
        repositories.users
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
        repositories.userSessions
      );
    }
    return this.deactivateLabHandler;
  }

  getActivateLabHandler(): ActivateLabCommandHandler {
    if (!this.activateLabHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.activateLabHandler = new ActivateLabCommandHandler(
        repositories.labs,
        repositories.users
      );
    }
    return this.activateLabHandler;
  }

  getCreateInviteCodeHandler(): CreateInviteCodeCommandHandler {
    if (!this.createInviteCodeHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.createInviteCodeHandler = new CreateInviteCodeCommandHandler(
        repositories.inviteCodes,
        repositories.labs,
        repositories.users,
        repositories.storage,
        this.getEventBus()
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

  getGetCurrentStorageHandler(): GetCurrentStorageQueryHandler {
    if (!this.getCurrentStorageHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getCurrentStorageHandler = new GetCurrentStorageQueryHandler(
        repositories.storage
      );
    }
    return this.getCurrentStorageHandler;
  }

  getGetStorageHistoryHandler(): GetStorageHistoryQueryHandler {
    if (!this.getStorageHistoryHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getStorageHistoryHandler = new GetStorageHistoryQueryHandler(
        repositories.storage
      );
    }
    return this.getStorageHistoryHandler;
  }

  getGetStorageByVersionHandler(): GetStorageByVersionQueryHandler {
    if (!this.getStorageByVersionHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getStorageByVersionHandler = new GetStorageByVersionQueryHandler(
        repositories.storage
      );
    }
    return this.getStorageByVersionHandler;
  }

  getGetCheckConfigurationHealthHandler(): CheckStorageHealthQueryHandler {
    if (!this.checkStorageHealthHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.checkStorageHealthHandler = new CheckStorageHealthQueryHandler(
        repositories.storage
      );
    }
    return this.checkStorageHealthHandler;
  }

  // CONTROLLERS (CQRS-BASED)

  getPublicAuthController(): PublicAuthController {
    if (!this.publicAuthController) {
      this.publicAuthController = new PublicAuthController({
        createUserHandler: this.getCreateUserHandler(),
        loginHandler: this.getLoginHandler(),
        createSystemAdminHandler: this.getCreateSystemAdminHandler(),
        checkFirstTimeHandler: this.getCheckFirstTimeHandler(),
        sendVerificationEmailHandler: this.getSendVerificationEmailHandler(),
        verifyEmailHandler: this.getVerifyEmailHandler(),
        resendVerificationHandler: this.getResendVerificationHandler(),
        resetPasswordWithTokenHandler: this.getResetPasswordWithTokenHandler(),
        sessionService: this.getSessionService(),
        userApplicationService: this.getUserApplicationService(),
        configRepository: this.repositoryFactory.getStorageRepository(),
        personRepository: this.repositoryFactory.getPersonRepository(),
        userSessionRepository: this.repositoryFactory.getUserSessionRepository(),
        userRepository: this.repositoryFactory.getUserRepository(),
      });
    }
    return this.publicAuthController;
  }

  getAuthController(): AuthController {
    if (!this.authController) {
      this.authController = new AuthController({
        changePasswordHandler: this.getChangePasswordHandler(),
        resendVerificationHandler: this.getResendVerificationHandler(),
        personRepository: this.repositoryFactory.getPersonRepository(),
        eventBus: this.getEventBus(),
      });
    }
    return this.authController;
  }

  getAdminUserController(): AdminUserController {
    if (!this.adminUserController) {
      this.adminUserController = new AdminUserController({
        changeRoleHandler: this.getChangeRoleHandler(),
        deleteUserHandler: this.getDeleteUserHandler(),
        adminResetPasswordHandler: this.getAdminResetPasswordHandler(),
        generatePasswordResetTokenHandler: this.getGeneratePasswordResetTokenHandler(),
        getUserByIdHandler: this.getGetUserByIdHandler(),
        userApplicationService: this.getUserApplicationService(),
        researcherApplicationService: this.getResearcherApplicationService(),
      });
    }
    return this.adminUserController;
  }

  getAdminConfigController(): AdminConfigController {
    if (!this.adminConfigController) {
      this.adminConfigController = new AdminConfigController({
        getUserStatsHandler: this.getGetUserStatsHandler(),
        configRepository: this.repositoryFactory.getStorageRepository(),
      });
    }
    return this.adminConfigController;
  }

  getSystemAdminUserController(): SystemAdminUserController {
    if (!this.systemAdminUserController) {
      this.systemAdminUserController = new SystemAdminUserController({
        userApplicationService: this.getUserApplicationService(),
      });
    }
    return this.systemAdminUserController;
  }

  getLabController(): LabController {
    if (!this.labController) {
      this.labController = new LabController({
        createLabHandler: this.getCreateLabHandler(),
        updateLabHandler: this.getUpdateLabHandler(),
        deactivateLabHandler: this.getDeactivateLabHandler(),
        activateLabHandler: this.getActivateLabHandler(),
        updateDemoLimitsHandler: this.getUpdateDemoLimitsHandler(),
        labRepository: this.repositoryFactory.getLabRepository(),
        userRepository: this.repositoryFactory.getUserRepository(),
        tubeRepository: this.repositoryFactory.getTubeRepository(),
        storageRepository: this.repositoryFactory.getStorageRepository(),
        researcherRepository: this.repositoryFactory.getResearcherRepository(),
        personRepository: this.repositoryFactory.getPersonRepository(),
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
        inviteCodeRepository: this.repositoryFactory.getInviteCodeRepository(),
      });
    }
    return this.inviteCodeController;
  }

  getStorageController(): StorageController {
    if (!this.storageController) {
      this.storageController = new StorageController({
        getCurrentStorageHandler: this.getGetCurrentStorageHandler(),
        getStorageHistoryHandler: this.getGetStorageHistoryHandler(),
        getStorageByVersionHandler: this.getGetStorageByVersionHandler(),
        checkStorageHealthHandler: this.getGetCheckConfigurationHealthHandler(),
        updateSystemStorageHandler: this.getUpdateSystemStorageHandler(),
        resetStorageHandler: this.getResetStorageToDefaultHandler(),
        importStorageHandler: this.getImportConfigurationHandler(),
        updateBoxPositionDisplayHandler: this.getUpdateBoxPositionDisplayHandler(),
        updateLabDefaultPositionDisplayHandler: this.getUpdateLabDefaultPositionDisplayHandler(),
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
        initializeConfigHandler: this.getInitializeConfigHandler(),
        labRepository: this.repositoryFactory.getLabRepository(),
      });
    }
    return this.storageController;
  }

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

  getAuditService(): AuditService {
    if (!this.auditService) {
      this.auditService = new AuditService(this.repositoryFactory.getAuditRepository());
    }
    return this.auditService;
  }

  getPresenceService(): PresenceService {
    if (!this.presenceService) {
      this.presenceService = new PresenceService();
    }
    return this.presenceService;
  }

  getAuditArchiveRepository(): AuditArchiveRepository {
    if (!this.auditArchiveRepository) {
      this.auditArchiveRepository = new AuditArchiveRepository(
        this.repositoryFactory.getPostgresContext()
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
      this.auditController = new AuditController({
        auditService: this.getAuditService(),
        retentionService: this.getAuditRetentionService(),
      });
    }
    return this.auditController;
  }

  getExportService(): ExportService {
    if (!this.exportService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.exportService = new ExportService(
        repositories.tubes,
        repositories.users,
        repositories.researchers,
        repositories.persons,
        repositories.storage
      );
    }
    return this.exportService;
  }

  getExportController(): ExportController {
    if (!this.exportController) {
      this.exportController = new ExportController({
        exportService: this.getExportService(),
      });
    }
    return this.exportController;
  }

  getLookupValueApplicationService(): LookupValueApplicationService {
    if (!this.lookupValueApplicationService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.lookupValueApplicationService = new LookupValueApplicationService(
        repositories.lookupValues
      );
    }
    return this.lookupValueApplicationService;
  }

  getLookupValueController(): LookupValueController {
    if (!this.lookupValueController) {
      const repositories = this.repositoryFactory.getRepositories();
      this.lookupValueController = new LookupValueController({
        lookupValueService: this.getLookupValueApplicationService(),
        storageRepository: repositories.storage,
      });
    }
    return this.lookupValueController;
  }

  getAuditEventHandler(): AuditEventHandler {
    if (!this.auditEventHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.auditEventHandler = new AuditEventHandler(
        this.getAuditService(),
        this.getEventBus(),
        repositories.users,
        repositories.storage
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
      logger.warn('Socket.IO not initialized. Call setSocketIO() first.');
      return null;
    }

    if (!this.socketEventHandler) {
      this.socketEventHandler = new SocketEventHandler(
        this.socketIO,
        this.getEventBus(),
        this.getPresenceService()
      );
    }
    return this.socketEventHandler;
  }

  getResearcherApprovalEventHandler(): ResearcherApprovalEventHandler {
    if (!this.researcherApprovalEventHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.researcherApprovalEventHandler = new ResearcherApprovalEventHandler(
        this.getEventBus(),
        repositories.researchers,
        repositories.users,
        repositories.persons
      );
    }
    return this.researcherApprovalEventHandler;
  }

  // DOMAIN SERVICES

  getTubePositionService(): TubePositionService {
    if (!this.tubePositionService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.tubePositionService = new TubePositionService(
        repositories.tubes,
        repositories.storage
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
        repositories.storage,
        repositories.persons,
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
        repositories.storage,
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
        repositories.storage,
        this.getEventBus(),
        repositories.inviteCodes,
        repositories.labs,
        repositories.userSessions
      );
    }
    return this.userApplicationService;
  }

  // CONTROLLERS

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

  getResearcherController(): ResearcherController {
    if (!this.researcherController) {
      this.researcherController = new ResearcherController({
        researcherApplicationService: this.getResearcherApplicationService(),
      });
    }
    return this.researcherController;
  }

  getSearchController(): SearchController {
    if (!this.searchController) {
      this.searchController = new SearchController({
        tubeApplicationService: this.getTubeApplicationService(),
      });
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

}
