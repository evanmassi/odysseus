/**
 * Service Container
 *
 * Thin compositor that creates shared services and delegates to domain-specific DI modules.
 */

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { ConfigurationService } from '@application/contracts/ConfigurationService';
import type { PasswordService } from '@application/contracts/PasswordService';
import type { SessionService } from '@application/contracts/SessionService';
import type { AuditEventHandler } from '@application/event-handlers/AuditEventHandler';
import type { ResearcherApprovalEventHandler } from '@application/event-handlers/ResearcherApprovalEventHandler';
import type { SocketEventHandler } from '@application/event-handlers/SocketEventHandler';
import type { AuditRetentionService } from '@application/services/AuditRetentionService';
import type { AuditService } from '@application/services/AuditService';
import type { ExportService } from '@application/services/ExportService';
import type { DonorApplicationService } from '@application/services/DonorApplicationService';
import type { LookupValueApplicationService } from '@application/services/LookupValueApplicationService';
import type { PresenceService } from '@application/services/PresenceService';
import type { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import type { TubeApplicationService } from '@application/services/TubeApplicationService';
import type { UserApplicationService } from '@application/services/UserApplicationService';
import { AccessControlService } from '@domain/services/AccessControlService';
import type { EmailService } from '@domain/services/EmailService';
import { TubePositionService } from '@domain/services/TubePositionService';
import { ValidationService } from '@domain/services/ValidationService';
import { AuditModule } from '@infrastructure/di/modules/AuditModule';
import { DonorModule } from '@infrastructure/di/modules/DonorModule';
import { AuthModule } from '@infrastructure/di/modules/AuthModule';
import { EventModule } from '@infrastructure/di/modules/EventModule';
import { LabModule } from '@infrastructure/di/modules/LabModule';
import { StorageModule } from '@infrastructure/di/modules/StorageModule';
import { TubeModule } from '@infrastructure/di/modules/TubeModule';
import { UserModule } from '@infrastructure/di/modules/UserModule';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { InMemoryEventBus } from '@infrastructure/events/InMemoryEventBus';
import type { AuditArchivalJob } from '@infrastructure/jobs/AuditArchivalJob';
import type { AuditArchiveRepository } from '@infrastructure/repositories/AuditArchiveRepository';
import { BcryptPasswordService } from '@infrastructure/services/BcryptPasswordService';
import { ConsoleEmailService } from '@infrastructure/services/ConsoleEmailService';
import { JwtSessionService } from '@infrastructure/services/JwtSessionService';
import type { AdminConfigController } from '@presentation/controllers/admin/AdminConfigController';
import type { AdminUserController } from '@presentation/controllers/admin/AdminUserController';
import type { AuditController } from '@presentation/controllers/AuditController';
import type { AuthController } from '@presentation/controllers/auth/AuthController';
import type { PublicAuthController } from '@presentation/controllers/auth/PublicAuthController';
import type { ExportController } from '@presentation/controllers/ExportController';
import type { InviteCodeController } from '@presentation/controllers/InviteCodeController';
import type { DonorController } from '@presentation/controllers/DonorController';
import type { LabController } from '@presentation/controllers/LabController';
import type { LookupValueController } from '@presentation/controllers/LookupValueController';
import type { PersonController } from '@presentation/controllers/PersonController';
import type { ResearcherController } from '@presentation/controllers/ResearcherController';
import type { SearchController } from '@presentation/controllers/SearchController';
import type { StorageController } from '@presentation/controllers/StorageController';
import type { SystemAdminUserController } from '@presentation/controllers/system/SystemAdminUserController';
import type { TubeController } from '@presentation/controllers/TubeController';
import type { TubeLockController } from '@presentation/controllers/TubeLockController';
import type { UserController } from '@presentation/controllers/UserController';
import type { UserSessionController } from '@presentation/controllers/UserSessionController';

import type { Server as SocketIOServer } from 'socket.io';

export class ServiceContainer {
  private repositoryFactory: RepositoryFactory;
  private configurationService: ConfigurationService;

  // Shared services
  private _shared?: SharedServices;
  private eventBus?: InMemoryEventBus;
  private passwordService?: PasswordService;
  private sessionService?: SessionService;
  private emailService?: EmailService;
  private tubePositionService?: TubePositionService;
  private accessControlService?: AccessControlService;
  private validationService?: ValidationService;

  // Modules
  private _eventModule?: EventModule;
  private _auditModule?: AuditModule;
  private _tubeModule?: TubeModule;
  private _labModule?: LabModule;
  private _userModule?: UserModule;
  private _storageModule?: StorageModule;
  private _authModule?: AuthModule;
  private _donorModule?: DonorModule;

  constructor(repositoryFactory: RepositoryFactory, configurationService: ConfigurationService) {
    this.repositoryFactory = repositoryFactory;
    this.configurationService = configurationService;
  }

  // Shared services builders

  private getShared(): SharedServices {
    if (!this._shared) {
      this._shared = {
        eventBus: this.getEventBus(),
        passwordService: this.getPasswordService(),
        sessionService: this.getSessionService(),
        emailService: this.getEmailService(),
        configurationService: this.configurationService,
        accessControlService: this.getAccessControlService(),
        tubePositionService: this.getTubePositionService(),
        validationService: this.getValidationService(),
      };
    }
    return this._shared;
  }

  getEventBus(): InMemoryEventBus {
    if (!this.eventBus) {
      this.eventBus = new InMemoryEventBus();
    }
    return this.eventBus;
  }

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
      this.emailService = new ConsoleEmailService(
        this.configurationService.get('email').verificationBaseUrl
      );
    }
    return this.emailService;
  }

  private getTubePositionService(): TubePositionService {
    if (!this.tubePositionService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.tubePositionService = new TubePositionService(
        repositories.tubes,
        repositories.storage
      );
    }
    return this.tubePositionService;
  }

  private getAccessControlService(): AccessControlService {
    if (!this.accessControlService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.accessControlService = new AccessControlService(
        repositories.users,
        repositories.tubes
      );
    }
    return this.accessControlService;
  }

  private getValidationService(): ValidationService {
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

  // Module accessors

  private getEventModule(): EventModule {
    if (!this._eventModule) {
      this._eventModule = new EventModule(this.getShared(), this.repositoryFactory);
    }
    return this._eventModule;
  }

  private getAuditModule(): AuditModule {
    if (!this._auditModule) {
      this._auditModule = new AuditModule(this.getShared(), this.repositoryFactory);
    }
    return this._auditModule;
  }

  private getDonorModule(): DonorModule {
    if (!this._donorModule) {
      this._donorModule = new DonorModule(this.getShared(), this.repositoryFactory);
    }
    return this._donorModule;
  }

  private getTubeModule(): TubeModule {
    if (!this._tubeModule) {
      this._tubeModule = new TubeModule(this.getShared(), this.repositoryFactory, {
        getDonorApplicationService: () => this.getDonorModule().getDonorApplicationService(),
      });
    }
    return this._tubeModule;
  }

  private getLabModule(): LabModule {
    if (!this._labModule) {
      this._labModule = new LabModule(this.getShared(), this.repositoryFactory);
    }
    return this._labModule;
  }

  private getUserModule(): UserModule {
    if (!this._userModule) {
      this._userModule = new UserModule(this.getShared(), this.repositoryFactory);
    }
    return this._userModule;
  }

  private getStorageModule(): StorageModule {
    if (!this._storageModule) {
      this._storageModule = new StorageModule(this.getShared(), this.repositoryFactory, {
        getGetUserStatsHandler: () => this.getUserModule().getGetUserStatsHandler(),
      });
    }
    return this._storageModule;
  }

  private getAuthModule(): AuthModule {
    if (!this._authModule) {
      this._authModule = new AuthModule(this.getShared(), this.repositoryFactory, {
        getCheckFirstTimeHandler: () => this.getUserModule().getCheckFirstTimeHandler(),
        getGetUserByIdHandler: () => this.getUserModule().getGetUserByIdHandler(),
        getChangeRoleHandler: () => this.getUserModule().getChangeRoleHandler(),
        getDeleteUserHandler: () => this.getUserModule().getDeleteUserHandler(),
        getUserApplicationService: () => this.getUserModule().getUserApplicationService(),
        getResearcherApplicationService: () => this.getUserModule().getResearcherApplicationService(),
      });
    }
    return this._authModule;
  }

  // Public API — EventModule

  setSocketIO(io: SocketIOServer): void {
    this.getEventModule().setSocketIO(io);
  }

  getPresenceService(): PresenceService {
    return this.getEventModule().getPresenceService();
  }

  getSocketEventHandler(): SocketEventHandler | null {
    return this.getEventModule().getSocketEventHandler();
  }

  getResearcherApprovalEventHandler(): ResearcherApprovalEventHandler {
    return this.getEventModule().getResearcherApprovalEventHandler();
  }

  // Public API — AuditModule

  getAuditService(): AuditService {
    return this.getAuditModule().getAuditService();
  }

  getAuditRetentionService(): AuditRetentionService {
    return this.getAuditModule().getAuditRetentionService();
  }

  getAuditArchiveRepository(): AuditArchiveRepository {
    return this.getAuditModule().getAuditArchiveRepository();
  }

  getAuditArchivalJob(): AuditArchivalJob {
    return this.getAuditModule().getAuditArchivalJob();
  }

  getAuditEventHandler(): AuditEventHandler {
    return this.getAuditModule().getAuditEventHandler();
  }

  getAuditController(): AuditController {
    return this.getAuditModule().getAuditController();
  }

  getExportService(): ExportService {
    return this.getAuditModule().getExportService();
  }

  getExportController(): ExportController {
    return this.getAuditModule().getExportController();
  }

  // Public API — TubeModule

  getTubeApplicationService(): TubeApplicationService {
    return this.getTubeModule().getTubeApplicationService();
  }

  getTubeController(): TubeController {
    return this.getTubeModule().getTubeController();
  }

  getTubeLockController(): TubeLockController {
    return this.getTubeModule().getTubeLockController();
  }

  getSearchController(): SearchController {
    return this.getTubeModule().getSearchController();
  }

  // Public API — LabModule

  getLabController(): LabController {
    return this.getLabModule().getLabController();
  }

  getInviteCodeController(): InviteCodeController {
    return this.getLabModule().getInviteCodeController();
  }

  // Public API — UserModule

  getUserApplicationService(): UserApplicationService {
    return this.getUserModule().getUserApplicationService();
  }

  getResearcherApplicationService(): ResearcherApplicationService {
    return this.getUserModule().getResearcherApplicationService();
  }

  getUserController(): UserController {
    return this.getUserModule().getUserController();
  }

  getPersonController(): PersonController {
    return this.getUserModule().getPersonController();
  }

  getUserSessionController(): UserSessionController {
    return this.getUserModule().getUserSessionController();
  }

  getSystemAdminUserController(): SystemAdminUserController {
    return this.getUserModule().getSystemAdminUserController();
  }

  getResearcherController(): ResearcherController {
    return this.getUserModule().getResearcherController();
  }

  // Public API — DonorModule

  getDonorApplicationService(): DonorApplicationService {
    return this.getDonorModule().getDonorApplicationService();
  }

  getDonorController(): DonorController {
    return this.getDonorModule().getDonorController();
  }

  // Public API — StorageModule

  getStorageController(): StorageController {
    return this.getStorageModule().getStorageController();
  }

  getAdminConfigController(): AdminConfigController {
    return this.getStorageModule().getAdminConfigController();
  }

  getLookupValueApplicationService(): LookupValueApplicationService {
    return this.getStorageModule().getLookupValueApplicationService();
  }

  getLookupValueController(): LookupValueController {
    return this.getStorageModule().getLookupValueController();
  }

  // Public API — AuthModule

  getPublicAuthController(): PublicAuthController {
    return this.getAuthModule().getPublicAuthController();
  }

  getAuthController(): AuthController {
    return this.getAuthModule().getAuthController();
  }

  getAdminUserController(): AdminUserController {
    return this.getAuthModule().getAdminUserController();
  }

  getAuthMiddleware(): AuthMiddleware {
    return this.getAuthModule().getAuthMiddleware();
  }
}
