/**
 * Odysseus Server
 *
 * Application entry point — bootstraps Express, Socket.IO, database, and route modules.
 */

import { createServer } from 'http';
import path from 'path';

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';

import { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import { ServiceContainer } from '@infrastructure/di/ServiceContainer';
import { logger } from '@infrastructure/logging/logger';
import { EnvironmentConfigurationService } from '@infrastructure/services/EnvironmentConfigurationService';
import { requestIdMiddleware } from '@presentation/middleware/requestId';
import { sanitizeStrings } from '@presentation/middleware/requestValidation';
import { createSocketAuthMiddleware } from '@presentation/middleware/socketAuth';
import { AdminRouteModule } from '@presentation/routes/AdminRouteModule';
import { AuthRouteModule } from '@presentation/routes/AuthRouteModule';
import { PublicRouteModule } from '@presentation/routes/PublicRouteModule';
import { ResourceRouteModule } from '@presentation/routes/ResourceRouteModule';
import { RouteRegistry } from '@presentation/routes/RouteRegistry';
import { SearchRouteModule } from '@presentation/routes/SearchRouteModule';
import { StorageRouteModule } from '@presentation/routes/StorageRouteModule';
import { SystemAdminRouteModule } from '@presentation/routes/SystemAdminRouteModule';
import { UserRouteModule } from '@presentation/routes/UserRouteModule';

import type { Server } from 'http';

// Resolve from project root (works for both tsx and compiled dist)
const serverRoot = path.resolve(__dirname, '..');
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';
dotenv.config({ path: path.join(serverRoot, envFile) });

class OdysseusServer {
  private app: express.Application;
  private server: Server;
  private io!: SocketIOServer;
  private configurationService: EnvironmentConfigurationService;
  private repositoryFactory!: RepositoryFactory;
  private serviceContainer!: ServiceContainer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.configurationService = new EnvironmentConfigurationService();
    this.setupSocket();
    this.setupDatabase();
    this.setupServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupSocket(): void {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },

      pingTimeout: 60000,
      pingInterval: 25000,

      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      },

      transports: ['websocket', 'polling'],

      perMessageDeflate: false, // Low latency over bandwidth savings
      httpCompression: false,
    });

    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  private setupDatabase(): void {
    const { url, ssl, maxConnections } = this.configurationService.get('database');
    this.repositoryFactory = new RepositoryFactory({ connectionString: url, ssl, maxConnections });
  }

  private setupServices(): void {
    this.serviceContainer = new ServiceContainer(this.repositoryFactory, this.configurationService);
    this.serviceContainer.setSocketIO(this.io);

    // Must be registered before connection handlers
    const sessionService = this.serviceContainer.getSessionService();
    this.io.use(createSocketAuthMiddleware(sessionService));

    // Side-effect initialization — registers event bus subscribers
    this.serviceContainer.getAuditEventHandler();
    this.serviceContainer.getSocketEventHandler();
    this.serviceContainer.getResearcherApprovalEventHandler();

    this.serviceContainer.getAuditArchivalJob().start();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({
      origin: this.configurationService.get('server').allowedOrigins,
      credentials: true
    }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(sanitizeStrings);
    this.app.use(requestIdMiddleware);

    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, { requestId: req.requestId });
      next();
    });
  }

  private setupRoutes(): void {
    const registry = new RouteRegistry(this.app, this.configurationService.isDevelopment());
    const publicAuthController = this.serviceContainer.getPublicAuthController();
    const authController = this.serviceContainer.getAuthController();
    const adminUserController = this.serviceContainer.getAdminUserController();
    const adminConfigController = this.serviceContainer.getAdminConfigController();
    const systemAdminUserController = this.serviceContainer.getSystemAdminUserController();
    const tubeController = this.serviceContainer.getTubeController();
    const tubeLockController = this.serviceContainer.getTubeLockController();
    const researcherController = this.serviceContainer.getResearcherController();
    const storageController = this.serviceContainer.getStorageController();
    const searchController = this.serviceContainer.getSearchController();
    const userController = this.serviceContainer.getUserController();
    const personController = this.serviceContainer.getPersonController();
    const sessionController = this.serviceContainer.getUserSessionController();
    const auditController = this.serviceContainer.getAuditController();
    const exportController = this.serviceContainer.getExportController();
    const lookupValueController = this.serviceContainer.getLookupValueController();
    const labController = this.serviceContainer.getLabController();
    const inviteCodeController = this.serviceContainer.getInviteCodeController();
    const authMiddleware = this.serviceContainer.getAuthMiddleware();
    const storageRepository = this.repositoryFactory.getStorageRepository();

    registry.registerModule(new PublicRouteModule(
      publicAuthController,
      inviteCodeController,
      storageRepository,
      this.configurationService.get('app').version,
      this.configurationService.get('server').environment
    ));
    registry.registerModule(new AuthRouteModule(authController, authMiddleware, storageRepository));
    registry.registerModule(new AdminRouteModule(adminUserController, adminConfigController, researcherController, auditController, exportController, lookupValueController, inviteCodeController, authMiddleware));
    registry.registerModule(new SystemAdminRouteModule(labController, inviteCodeController, adminConfigController, systemAdminUserController, storageController, auditController, authMiddleware));
    registry.registerModule(new ResourceRouteModule(tubeController, tubeLockController, researcherController, lookupValueController, authMiddleware, storageRepository));
    registry.registerModule(new StorageRouteModule(storageController, authMiddleware));
    registry.registerModule(new SearchRouteModule(searchController, authMiddleware, storageRepository));
    registry.registerModule(new UserRouteModule(userController, personController, sessionController, authMiddleware));

    registry.applyRoutes();

  }

  private setupErrorHandling(): void {
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  public async start(): Promise<void> {
    try {
      await this.repositoryFactory.initialize();

      const port = this.configurationService.get('server').port;
      this.server.listen(port, async () => {
        const isHealthy = await this.repositoryFactory.isHealthy();
        logger.info(`Server started on port ${port}`, {
          database: isHealthy ? 'connected' : 'disconnected'
        });
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down...');
    try {
      this.serviceContainer.getAuditArchivalJob().stop();
      await this.repositoryFactory.close();
      this.server.close(() => {
        logger.info('Server stopped');
        process.exit(0);
      });
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

const server = new OdysseusServer();
server.start().catch((error) => logger.error('Server startup failed:', { error }));
