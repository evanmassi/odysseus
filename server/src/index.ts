import express from 'express';
import { createServer, Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { initializeRepositories, RepositoryFactory } from '@infrastructure/repositories';
import { ServiceContainer } from '@infrastructure/di/ServiceContainer';
import { logger } from '@utils/logger';
import { sanitizeStrings } from '@middleware/Validation';
import { requestIdMiddleware } from '@middleware/RequestId';
import { createSocketAuthMiddleware } from '@presentation/middleware/socketAuth';

// Load environment variables from appropriate file
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
  private repositoryFactory!: RepositoryFactory;
  private serviceContainer!: ServiceContainer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
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

      // Production-grade timing configuration
      pingTimeout: 60000,    // 60 seconds (increased from 5s default)
      pingInterval: 25000,   // 25 seconds (keep default)

      // Connection recovery for brief disconnections
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      },

      // Transport configuration with fallback
      transports: ['websocket', 'polling'],

      // Performance tuning
      perMessageDeflate: false, // Disable compression for low latency
      httpCompression: false,   // Disable HTTP compression
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
    this.repositoryFactory = initializeRepositories();
  }

  private setupServices(): void {
    // Initialize service container with dependency injection
    this.serviceContainer = new ServiceContainer(this.repositoryFactory);

    // Pass Socket.IO instance to service container
    this.serviceContainer.setSocketIO(this.io);

    // Register socket authentication middleware (must be before connection handlers)
    const sessionService = this.serviceContainer.getSessionService();
    this.io.use(createSocketAuthMiddleware(sessionService));

    // Initialize event handlers for audit logging, real-time updates, and approval workflows
    this.serviceContainer.getAuditEventHandler();
    this.serviceContainer.getSocketEventHandler();
    this.serviceContainer.getResearcherApprovalEventHandler();

    // Start scheduled jobs
    this.serviceContainer.getAuditArchivalJob().start();
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Input sanitization (applies to all routes)
    this.app.use(sanitizeStrings);

    // Request ID for traceability
    this.app.use(requestIdMiddleware);

    // Logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, { requestId: req.requestId });
      next();
    });
  }

  private setupRoutes(): void {
    // Initialize modular route system
    const { RouteRegistry, PublicRouteModule, AuthRouteModule, AdminRouteModule, ResourceRouteModule, ConfigurationRouteModule, SearchRouteModule, UserRouteModule, SystemAdminRouteModule } = require('./presentation/routes');

    const registry = new RouteRegistry(this.app);
    const authController = this.serviceContainer.getAuthController();
    const tubeController = this.serviceContainer.getTubeController();
    const researcherController = this.serviceContainer.getResearcherController();
    const configurationController = this.serviceContainer.getConfigurationController();
    const searchController = this.serviceContainer.getSearchController();
    const userController = this.serviceContainer.getUserController();
    const personController = this.serviceContainer.getPersonController();
    const sessionController = this.serviceContainer.getSessionController();
    const auditController = this.serviceContainer.getAuditController();
    const exportController = this.serviceContainer.getExportController();
    const lookupValueController = this.serviceContainer.getLookupValueController();
    const labController = this.serviceContainer.getLabController();
    const inviteCodeController = this.serviceContainer.getInviteCodeController();
    const authMiddleware = this.serviceContainer.getAuthMiddleware();
    const configurationRepository = this.repositoryFactory.getConfigurationRepository();

    // Register all route modules
    registry.registerModule(new PublicRouteModule(authController, inviteCodeController, configurationRepository));
    registry.registerModule(new AuthRouteModule(authController, authMiddleware, configurationRepository));
    registry.registerModule(new AdminRouteModule(authController, researcherController, auditController, exportController, lookupValueController, inviteCodeController, authMiddleware));
    registry.registerModule(new SystemAdminRouteModule(labController, inviteCodeController, authController, configurationController, authMiddleware));
    const tubeLockController = this.serviceContainer.getTubeLockController();
    registry.registerModule(new ResourceRouteModule(tubeController, tubeLockController, researcherController, lookupValueController, authMiddleware, configurationRepository));
    registry.registerModule(new ConfigurationRouteModule(configurationController, authMiddleware));
    registry.registerModule(new SearchRouteModule(searchController, authMiddleware, configurationRepository));
    registry.registerModule(new UserRouteModule(userController, personController, sessionController, authMiddleware));

    // Apply all routes
    registry.applyRoutes();

  }

  private setupErrorHandling(): void {
    this.app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Server error:', error);
      const message = error instanceof Error ? error.message : undefined;
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? message : undefined
      });
    });

    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  public async start(): Promise<void> {
    try {
      await this.repositoryFactory.initialize();

      const port = process.env.PORT || 3001;
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

// Start main server
const server = new OdysseusServer();
server.start().catch((error) => logger.error('Server startup failed:', { error }));
