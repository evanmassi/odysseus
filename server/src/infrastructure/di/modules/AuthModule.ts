/**
 * Authentication DI Module
 *
 * Lazy-singleton wiring for auth handlers, controllers, and middleware.
 */

import { SendVerificationEmailCommandHandler, VerifyEmailCommandHandler, ResendVerificationEmailCommandHandler } from '@application/commands/EmailVerificationCommands';
import { AdminResetPasswordCommandHandler, GeneratePasswordResetTokenCommandHandler, ResetPasswordWithTokenCommandHandler, ForceChangePasswordCommandHandler } from '@application/commands/PasswordResetCommands';
import { LoginCommandHandler, ChangeUserPasswordCommandHandler, CreateSystemAdminCommandHandler } from '@application/commands/UserCommands';
import type { ChangeUserRoleCommandHandler } from '@application/commands/UserCommands';
import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import { GetSessionInfoQueryHandler } from '@application/queries/SessionQueries';
import type { CheckFirstTimeSetupQueryHandler } from '@application/queries/UserQueries';
import type { PersonApplicationService } from '@application/services/PersonApplicationService';
import type { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import type { SecurityConfigApplicationService } from '@application/services/SecurityConfigApplicationService';
import type { UserApplicationService } from '@application/services/UserApplicationService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { ExpressAuthMiddleware } from '@infrastructure/security/ExpressAuthMiddleware';
import { AdminUserController } from '@presentation/controllers/admin/AdminUserController';
import { AuthController } from '@presentation/controllers/auth/AuthController';
import { PublicAuthController } from '@presentation/controllers/auth/PublicAuthController';

interface AuthCrossModuleDeps {
  getCheckFirstTimeHandler: () => CheckFirstTimeSetupQueryHandler;
  getChangeRoleHandler: () => ChangeUserRoleCommandHandler;
  getUserApplicationService: () => UserApplicationService;
  getResearcherApplicationService: () => ResearcherApplicationService;
  getPersonApplicationService: () => PersonApplicationService;
  getSecurityConfigApplicationService: () => SecurityConfigApplicationService;
}

export class AuthModule {
  private loginHandler?: LoginCommandHandler;
  private changePasswordHandler?: ChangeUserPasswordCommandHandler;
  private sendVerificationEmailHandler?: SendVerificationEmailCommandHandler;
  private verifyEmailHandler?: VerifyEmailCommandHandler;
  private resendVerificationHandler?: ResendVerificationEmailCommandHandler;
  private adminResetPasswordHandler?: AdminResetPasswordCommandHandler;
  private generatePasswordResetTokenHandler?: GeneratePasswordResetTokenCommandHandler;
  private resetPasswordWithTokenHandler?: ResetPasswordWithTokenCommandHandler;
  private createSystemAdminHandler?: CreateSystemAdminCommandHandler;
  private forceChangePasswordHandler?: ForceChangePasswordCommandHandler;
  private getSessionInfoHandler?: GetSessionInfoQueryHandler;
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
        this.shared.passwordService,
        this.repositoryFactory
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
        this.shared.passwordService,
        repositories.storage,
        this.repositoryFactory
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
        this.shared.passwordService,
        repositories.storage,
        this.repositoryFactory
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
        this.shared.configurationService.get('security').systemAdminSetupKey,
        this.shared.configurationService.get('server').environment === 'production'
      );
    }
    return this.createSystemAdminHandler;
  }

  getForceChangePasswordHandler(): ForceChangePasswordCommandHandler {
    if (!this.forceChangePasswordHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.forceChangePasswordHandler = new ForceChangePasswordCommandHandler(
        repositories.users,
        this.shared.eventBus,
        this.shared.passwordService,
        repositories.storage,
        this.repositoryFactory
      );
    }
    return this.forceChangePasswordHandler;
  }

  getGetSessionInfoHandler(): GetSessionInfoQueryHandler {
    if (!this.getSessionInfoHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.getSessionInfoHandler = new GetSessionInfoQueryHandler(
        this.shared.sessionService,
        repositories.userSessions,
        repositories.storage
      );
    }
    return this.getSessionInfoHandler;
  }

  // Controllers

  getPublicAuthController(): PublicAuthController {
    if (!this.publicAuthController) {
      this.publicAuthController = new PublicAuthController({
        loginHandler: this.getLoginHandler(),
        createSystemAdminHandler: this.getCreateSystemAdminHandler(),
        checkFirstTimeHandler: this.crossModuleDeps.getCheckFirstTimeHandler(),
        sendVerificationEmailHandler: this.getSendVerificationEmailHandler(),
        verifyEmailHandler: this.getVerifyEmailHandler(),
        resendVerificationHandler: this.getResendVerificationHandler(),
        resetPasswordWithTokenHandler: this.getResetPasswordWithTokenHandler(),
        forceChangePasswordHandler: this.getForceChangePasswordHandler(),
        getSessionInfoHandler: this.getGetSessionInfoHandler(),
        sessionService: this.shared.sessionService,
        userApplicationService: this.crossModuleDeps.getUserApplicationService(),
        securityConfigService: this.crossModuleDeps.getSecurityConfigApplicationService(),
        personApplicationService: this.crossModuleDeps.getPersonApplicationService(),
        eventBus: this.shared.eventBus,
      });
    }
    return this.publicAuthController;
  }

  getAuthController(): AuthController {
    if (!this.authController) {
      this.authController = new AuthController({
        changePasswordHandler: this.getChangePasswordHandler(),
        userSessionRepository: this.repositoryFactory.getRepositories().userSessions,
        eventBus: this.shared.eventBus,
      });
    }
    return this.authController;
  }

  getAdminUserController(): AdminUserController {
    if (!this.adminUserController) {
      this.adminUserController = new AdminUserController({
        changeRoleHandler: this.crossModuleDeps.getChangeRoleHandler(),
        adminResetPasswordHandler: this.getAdminResetPasswordHandler(),
        generatePasswordResetTokenHandler: this.getGeneratePasswordResetTokenHandler(),
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
