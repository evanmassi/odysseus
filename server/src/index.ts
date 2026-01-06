import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { initializeRepositories, RepositoryFactory } from '@infrastructure/repositories';
import { ServiceContainer } from '@infrastructure/di/ServiceContainer';
import { logger } from '@utils/logger';
import { featureFlags, FEATURES } from '@utils/featureFlags';
import { validateBody, validateParams, sanitizeStrings } from '@middleware/Validation';
import { z } from 'zod';

// Load environment variables from appropriate file
// Resolve from project root (works for both tsx and compiled dist)
const serverRoot = path.resolve(__dirname, '..');
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';
dotenv.config({ path: path.join(serverRoot, envFile) });

class OdysseusServer {
  private app: express.Application;
  private server: any;
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
    console.log('💾 [DATABASE] Initializing PostgreSQL connection');
    console.log('💾 [DATABASE] Using clean repository pattern with DDD');
    this.repositoryFactory = initializeRepositories();
  }

  private setupServices(): void {
    // Initialize service container with dependency injection
    this.serviceContainer = new ServiceContainer(this.repositoryFactory);

    // Pass Socket.IO instance to service container
    this.serviceContainer.setSocketIO(this.io);

    // Initialize audit event handler to start listening for domain events
    this.serviceContainer.getAuditEventHandler();
    logger.info('Audit event handler initialized');

    // Initialize Socket.IO event handler for real-time updates
    this.serviceContainer.getSocketEventHandler();
    logger.info('Socket event handler initialized');

    // Initialize and start audit archival job
    this.serviceContainer.getAuditArchivalJob().start();
    logger.info('Audit archival job started');
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

    // Logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Initialize modular route system
    const { RouteRegistry, PublicRouteModule, AuthRouteModule, AdminRouteModule, ResourceRouteModule, ConfigurationRouteModule, SearchRouteModule, UserRouteModule } = require('./presentation/routes');

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
    const authMiddleware = this.serviceContainer.getAuthMiddleware();
    const configurationRepository = this.repositoryFactory.getConfigurationRepository();

    // Register all route modules with ConfigurationRepository for dynamic rate limiting
    registry.registerModule(new PublicRouteModule(authController, configurationRepository));
    registry.registerModule(new AuthRouteModule(authController, authMiddleware, configurationRepository));
    registry.registerModule(new AdminRouteModule(authController, researcherController, auditController, authMiddleware));
    const tubeLockController = this.serviceContainer.getTubeLockController();
    registry.registerModule(new ResourceRouteModule(tubeController, tubeLockController, researcherController, authMiddleware, configurationRepository));
    registry.registerModule(new ConfigurationRouteModule(configurationController, authMiddleware));
    registry.registerModule(new SearchRouteModule(searchController, authMiddleware, configurationRepository));
    registry.registerModule(new UserRouteModule(userController, personController, sessionController, authMiddleware));

    // Apply all routes
    registry.applyRoutes();

    // Legacy DELETE tank endpoint (bypasses domain layer)
    // TODO: Migrate to ConfigurationCommandHandler for proper DDD implementation
    this.app.delete('/api/tanks/:tankId', this.deleteTank.bind(this));

    logger.info('🚀 Route system initialized', {
      modules: registry.getModuleSummary()
    });
    }

  private setupErrorHandling(): void {
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Server error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    });

    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  private async getMetrics(req: express.Request, res: express.Response): Promise<void> {
    try {
      const isHealthy = await this.repositoryFactory.isHealthy();
      res.json({
        success: true,
        metrics: {
          databaseType: 'postgresql',
          databaseConnected: isHealthy,
          featuresEnabled: {
            auditTrail: FEATURES.ENABLE_AUDIT_TRAIL,
            queryCache: FEATURES.ENABLE_QUERY_CACHING,
            bulkOperations: FEATURES.ENABLE_BULK_OPERATIONS
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  private async getAuditTrail(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { entityType, entityId } = req.params;
      
      if (!FEATURES.ENABLE_AUDIT_TRAIL) {
        res.status(404).json({ error: 'Audit trail feature not enabled' });
        return;
      }

      // TODO: Implement audit trail with repositories
      const auditEntries: any[] = [];
      res.json({ success: true, auditEntries });
    } catch (error) {
      logger.error('Error fetching audit trail:', error);
      res.status(500).json({ error: 'Failed to fetch audit trail' });
    }
  }

  private async searchTubes(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { query, filters, limit, offset, orderBy, orderDirection } = req.body;
      
      // Allow search with just filters or just query
      if (!query?.trim() && (!filters || Object.keys(filters).length === 0)) {
        res.json({ success: true, results: [], total: 0 });
        return;
      }

      // TODO: Implement advanced search with repositories
      const results: any[] = [];
      
      res.json({ success: true, results, total: results.length });
    } catch (error) {
      logger.error('Error searching tubes:', error);
      res.status(500).json({ error: 'Failed to search tubes' });
    }
  }




  // Admin-only middleware
  private requireAdmin(req: any, res: express.Response, next: express.NextFunction): void {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // User already authenticated by middleware, check if admin
      if (!req.user.isAdmin?.()) {
        logger.warn(`Non-admin user attempted admin access: ${req.user.username}`);
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      next();
    } catch (error) {
      logger.error('Admin check error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  }

  // Admin endpoints (now handled by AdminRouteModule)
  private async getUsers(req: express.Request, res: express.Response): Promise<void> {
    try {
      const repositories = this.repositoryFactory.getRepositories();
      const users = await repositories.users.findAll();
      const userDtos = users.map(user => user.toPublicData());
      console.log('🔍 SERVER: getAllUsers returned:', userDtos);
      res.json({ success: true, users: userDtos });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  private async updateUserRole(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'user'].includes(role)) {
        res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
        return;
      }
      
      const repositories = this.repositoryFactory.getRepositories();
      const success = await repositories.users.updateRole(userId, role);
      if (success) {
        logger.info(`User role updated by admin`, {
          admin: (req as any).user?.username,
          userId,
          newRole: role
        });
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      logger.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }

  private async deleteUser(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const repositories = this.repositoryFactory.getRepositories();
      const success = await repositories.users.delete(userId);
      if (success) {
        logger.info(`User deleted by admin`, {
          admin: (req as any).user?.username,
          userId
        });
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }


  private async deleteTank(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { tankId } = req.params;
      
      if (!tankId) {
        res.status(400).json({ error: 'Tank ID is required' });
        return;
      }
      
      logger.info(`Attempting to delete tank: ${tankId}`);

      // Delete all tubes associated with this tank first
      const repositories = this.repositoryFactory.getRepositories();
      const allTubes = await repositories.tubes.findAll();
      const tankTubes = allTubes.filter(tube => tube.location.tankId === tankId);
      
      for (const tube of tankTubes) {
        await repositories.tubes.delete(tube.id);
      }

      // Legacy Socket.IO emissions for tube and tank deletion
      // NOTE: These are manual emissions because this endpoint bypasses the domain layer.
      // When tank deletion is properly moved to use DeleteTankCommandHandler (CQRS),
      // these manual emissions can be removed as SocketEventHandler will handle them
      // via domain events automatically.
      if (this.io) {
        this.io.emit('tubeUpdate', {
          type: 'bulk-delete',
          data: { deletedTubes: tankTubes, tankId }
        });

        // Configuration changes are now handled by SocketEventHandler via domain events,
        // but this legacy endpoint still needs manual emission
        this.io.emit('tankDeleted', { tankId });
      }
      
      logger.info(`Tank ${tankId} deleted with ${tankTubes.length} tubes`);
      res.json({ 
        success: true, 
        message: `Tank deleted successfully`,
        deletedTubes: tankTubes.length,
        tankId
      });
    } catch (error) {
      logger.error('Error deleting tank:', error);
      res.status(500).json({ error: 'Failed to delete tank' });
    }
  }

  private async getDatabaseStatus(req: express.Request, res: express.Response): Promise<void> {
    try {
      const isHealthy = await this.repositoryFactory.isHealthy();
      res.json({
        success: true,
        status: {
          type: 'PostgreSQL',
          initialized: true,
          connected: isHealthy,
          features: {
            auditTrail: FEATURES.ENABLE_AUDIT_TRAIL
          }
        }
      });
    } catch (error) {
      logger.error('Error getting database status:', error);
      res.status(500).json({ error: 'Failed to get database status' });
    }
  }

  public async start(): Promise<void> {
    try {
      await this.repositoryFactory.initialize();

      const port = process.env.PORT || 3001;
      this.server.listen(port, async () => {
        const isHealthy = await this.repositoryFactory.isHealthy();
        logger.info(`🚀 Odysseus server started on port ${port}`);
        logger.info(`📊 Database: PostgreSQL ${isHealthy ? 'Connected' : 'Disconnected'}`);
        logger.info(`🏛️ Architecture: Clean Repository Pattern with DDD`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down server...');
    try {
      // Stop audit archival job
      this.serviceContainer.getAuditArchivalJob().stop();
      logger.info('Audit archival job stopped');

      // Clean shutdown of repository factory
      await this.repositoryFactory.close();
      this.server.close(() => {
        logger.info('Server shut down successfully');
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
server.start().catch(console.error);
