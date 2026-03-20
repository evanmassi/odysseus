/**
 * Authentication DI Module
 *
 * Lazy-singleton wiring for auth handlers, controllers, and middleware.
 */

import { SendVerificationEmailCommandHandler, VerifyEmailCommandHandler, ResendVerificationEmailCommandHandler } from '@application/commands/EmailVerificationCommands';
import { AdminResetPasswordCommandHandler, GeneratePasswordResetTokenCommandHandler, ResetPasswordWithTokenCommandHandler } from '@application/commands/PasswordResetCommands';
import { CreateUserCommandHandler, LoginCommandHandler, ChangeUserPasswordCommandHandler, CreateSystemAdminCommandHandler } from '@application/commands/UserCommands';
import type { ChangeUserRoleCommandHandler, DeleteUserCommandHandler } from '@application/commands/UserCommands';
import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { CheckFirstTimeSetupQueryHandler, GetUserByIdQueryHandler } from '@application/queries/UserQueries';
import type { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import type { UserApplicationService } from '@application/services/UserApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { ExpressAuthMiddleware } from '@infrastructure/security/ExpressAuthMiddleware';
import { AdminUserController } from '@presentation/controllers/admin/AdminUserController';
import { AuthController } from '@presentation/controllers/auth/AuthController';
import { PublicAuthController } from '@presentation/controllers/auth/PublicAuthController';

interface AuthCrossModuleDeps {
  getCheckFirstTimeHandler: () => CheckFirstTimeSetupQueryHandler;
  getGetUserByIdHandler: () => GetUserByIdQueryHandler;
  getChangeRoleHandler: () => ChangeUserRoleCommandHandler;
  getDeleteUserHandler: () => DeleteUserCommandHandler;
  getUserApplicationService: () => UserApplicationService;
  getResearcherApplicationService: () => ResearcherApplicationService;
}

export class AuthModule {
  private createUserHandler?: CreateUserCommandHandler;
  private loginHandler?: LoginCommandHandler;
  private changePasswordHandler?: ChangeUserPasswordCommandHandler;
  private sendVerificationEmailHandler?: SendVerificationEmailCommandHandler;
  private verifyEmailHandler?: VerifyEmailCommandHandler;
  private resendVerificationHandler?: ResendVerificationEmailCommandHandler;
  private adminResetPasswordHandler?: AdminResetPasswordCommandHandler;
  private generatePasswordResetTokenHandler?: GeneratePasswordResetTokenCommandHandler;
  private resetPasswordWithTokenHandler?: ResetPasswordWithTokenCommandHandler;
  private createSystemAdminHandler?: CreateSystemAdminCommandHandler;
  private publicAuthController?: PublicAuthController;
  private authController?: AuthController;
  private adminUserController?: AdminUserController;
  private authMiddleware?: AuthMiddleware;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory,
    private crossModuleDeps: AuthCrossModuleDeps
  ) {}

  // Handlers

  getCreateUserHandler(): CreateUserCommandHandler {
    if (!this.createUserHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.createUserHandler = new CreateUserCommandHandler(
        repositories.users,
        this.shared.eventBus,
        repositories.storage,
        this.shared.passwordService
      );
    }
    return this.createUserHandler;
  }

  getLoginHandler(): LoginCommandHandler {
    if (!this.loginHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.loginHandler = new LoginCommandHandler(
        repositories.users,
        this.shared.eventBus,
        this.shared.passwordService,
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
        this.shared.eventBus,
        repositories.storage,
        repositories.userSessions,
        this.shared.passwordService
      );
    }
    return this.changePasswordHandler;
  }

  getSendVerificationEmailHandler(): SendVerificationEmailCommandHandler {
    if (!this.sendVerificationEmailHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.sendVerificationEmailHandler = new SendVerificationEmailCommandHandler(
        repositories.users,
        repositories.persons,
        this.shared.emailService,
        this.shared.eventBus
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
        this.shared.eventBus
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
        this.shared.emailService,
        this.shared.eventBus
      );
    }
    return this.resendVerificationHandler;
  }

  getAdminResetPasswordHandler(): AdminResetPasswordCommandHandler {
    if (!this.adminResetPasswordHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.adminResetPasswordHandler = new AdminResetPasswordCommandHandler(
        repositories.users,
        this.shared.eventBus,
        repositories.refreshTokens,
        repositories.userSessions,
        this.shared.passwordService,
        repositories.storage
      );
    }
    return this.adminResetPasswordHandler;
  }

  getGeneratePasswordResetTokenHandler(): GeneratePasswordResetTokenCommandHandler {
    if (!this.generatePasswordResetTokenHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.generatePasswordResetTokenHandler = new GeneratePasswordResetTokenCommandHandler(
        repositories.users,
        this.shared.eventBus,
        this.shared.configurationService.get('email').resetPasswordBaseUrl
      );
    }
    return this.generatePasswordResetTokenHandler;
  }

  getResetPasswordWithTokenHandler(): ResetPasswordWithTokenCommandHandler {
    if (!this.resetPasswordWithTokenHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.resetPasswordWithTokenHandler = new ResetPasswordWithTokenCommandHandler(
        repositories.users,
        this.shared.eventBus,
        repositories.refreshTokens,
        repositories.userSessions,
        this.shared.passwordService,
        repositories.storage
      );
    }
    return this.resetPasswordWithTokenHandler;
  }

  getCreateSystemAdminHandler(): CreateSystemAdminCommandHandler {
    if (!this.createSystemAdminHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.createSystemAdminHandler = new CreateSystemAdminCommandHandler(
        repositories.users,
        repositories.storage,
        this.shared.eventBus,
        repositories.persons,
        this.shared.passwordService,
        this.shared.configurationService.get('security').systemAdminSetupKey
      );
    }
    return this.createSystemAdminHandler;
  }

  // Controllers

  getPublicAuthController(): PublicAuthController {
    if (!this.publicAuthController) {
      this.publicAuthController = new PublicAuthController({
        createUserHandler: this.getCreateUserHandler(),
        loginHandler: this.getLoginHandler(),
        createSystemAdminHandler: this.getCreateSystemAdminHandler(),
        checkFirstTimeHandler: this.crossModuleDeps.getCheckFirstTimeHandler(),
        sendVerificationEmailHandler: this.getSendVerificationEmailHandler(),
        verifyEmailHandler: this.getVerifyEmailHandler(),
        resendVerificationHandler: this.getResendVerificationHandler(),
        resetPasswordWithTokenHandler: this.getResetPasswordWithTokenHandler(),
        sessionService: this.shared.sessionService,
        userApplicationService: this.crossModuleDeps.getUserApplicationService(),
        configRepository: this.repositoryFactory.getStorageRepository(),
        personRepository: this.repositoryFactory.getPersonRepository(),
        userSessionRepository: this.repositoryFactory.getUserSessionRepository(),
        userRepository: this.repositoryFactory.getUserRepository(),
        passwordService: this.shared.passwordService,
        eventBus: this.shared.eventBus,
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
        eventBus: this.shared.eventBus,
      });
    }
    return this.authController;
  }

  getAdminUserController(): AdminUserController {
    if (!this.adminUserController) {
      this.adminUserController = new AdminUserController({
        changeRoleHandler: this.crossModuleDeps.getChangeRoleHandler(),
        deleteUserHandler: this.crossModuleDeps.getDeleteUserHandler(),
        adminResetPasswordHandler: this.getAdminResetPasswordHandler(),
        generatePasswordResetTokenHandler: this.getGeneratePasswordResetTokenHandler(),
        getUserByIdHandler: this.crossModuleDeps.getGetUserByIdHandler(),
        userApplicationService: this.crossModuleDeps.getUserApplicationService(),
        researcherApplicationService: this.crossModuleDeps.getResearcherApplicationService(),
      });
    }
    return this.adminUserController;
  }

  // Middleware

  getAuthMiddleware(): AuthMiddleware {
    if (!this.authMiddleware) {
      this.authMiddleware = new ExpressAuthMiddleware(
        this.shared.sessionService
      );
    }
    return this.authMiddleware;
  }
}
