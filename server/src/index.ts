import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initializeRepositories, RepositoryFactory } from '@infrastructure/repositories';
import { ServiceContainer } from '@infrastructure/di/ServiceContainer';
import { logger } from '@utils/logger';
import { featureFlags, FEATURES } from '@utils/featureFlags';
import { validateBody, validateParams, sanitizeStrings } from '@middleware/Validation';
import { firebaseService } from '@infrastructure/services/FirebaseSyncService';
import { syncEngine } from '@infrastructure/services/SyncEngine';
import { workspaceService } from '@infrastructure/services/WorkspaceService';
import { z } from 'zod';

// Load environment variables
dotenv.config();

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
      }
    });

    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private setupDatabase(): void {
    // Use different paths for development vs production
    const isElectron = process.env.ELECTRON_APP === 'true';
    let sqliteDbPath: string;
    
    if (isElectron && process.env.ODYSSEUS_DATA_DIR) {
      // In Electron production, use app data directory
      sqliteDbPath = path.join(process.env.ODYSSEUS_DATA_DIR, 'odysseus-data.sqlite');
      console.log('🏭 ELECTRON PRODUCTION MODE - Data saved in app data directory');
      console.log('📂 App data directory:', process.env.ODYSSEUS_DATA_DIR);
      console.log('💾 SQLite Database file:', sqliteDbPath);
    } else {
      // In development, use local data directory
      const dataDir = path.join(__dirname, '../data');
      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      sqliteDbPath = path.join(dataDir, 'odysseus.sqlite');
      console.log('🔧 DEVELOPMENT MODE - Data saved in dev folder');
      console.log('💾 SQLite Database file:', sqliteDbPath);
    }
    
    // Initialize repository factory with SQLite (single source of truth)
    console.log(`💾 [DATABASE] Using SQLite with clean repository pattern`);
    console.log(`💾 [DATABASE] Scale: 100 tanks × 50 racks × 20 boxes`);
    
    this.repositoryFactory = initializeRepositories(sqliteDbPath);
  }

  private setupServices(): void {
    // Initialize service container with dependency injection
    this.serviceContainer = new ServiceContainer(this.repositoryFactory);
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
    const authMiddleware = this.serviceContainer.getAuthMiddleware();
    const configurationRepository = this.repositoryFactory.getConfigurationRepository();

    // Register all route modules with ConfigurationRepository for dynamic rate limiting
    registry.registerModule(new PublicRouteModule(authController, configurationRepository));
    registry.registerModule(new AuthRouteModule(authController, authMiddleware, configurationRepository));
    registry.registerModule(new AdminRouteModule(authController, researcherController, authMiddleware, configurationRepository));
    registry.registerModule(new ResourceRouteModule(tubeController, researcherController, authMiddleware, configurationRepository));
    registry.registerModule(new ConfigurationRouteModule(configurationController, authMiddleware));
    registry.registerModule(new SearchRouteModule(searchController, authMiddleware, configurationRepository));
    registry.registerModule(new UserRouteModule(userController, personController, authMiddleware));

    // Apply all routes
    registry.applyRoutes();

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

  // Additional Endpoints
  private async getMetrics(req: express.Request, res: express.Response): Promise<void> {
    try {
      // TODO: Implement metrics gathering from repositories
      const metrics = {};
      const databaseType = 'sqlite';
      
      res.json({ 
        success: true, 
        metrics: {
          ...metrics,
          databaseType,
          featuresEnabled: {
            sqlite: true,
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



  // Database switching method removed - SQLite only architecture

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

  // Sync management endpoints
  private async getSyncStatus(req: express.Request, res: express.Response): Promise<void> {
    try {
      const syncStats = syncEngine.getSyncStats();
      const workspaceId = syncEngine.getWorkspaceId();
      
      res.json({
        success: true,
        sync: {
          enabled: syncEngine.isEnabled(),
          workspaceId,
          firebase: firebaseService.isConnected(),
          stats: syncStats
        }
      });
    } catch (error) {
      logger.error('Error fetching sync status:', error);
      res.status(500).json({ error: 'Failed to fetch sync status' });
    }
  }

  private async createWorkspaceInvite(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { role = 'user' } = req.body;
      
      if (!['admin', 'user'].includes(role)) {
        res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
        return;
      }

      const inviteCode = await syncEngine.createInviteCode(role);
      
      if (!inviteCode) {
        res.status(500).json({ error: 'Failed to create invite code. Sync may not be enabled.' });
        return;
      }

      logger.info(`Invite code created by admin`, {
        admin: (req as any).user?.username,
        inviteCode,
        role
      });

      res.json({ 
        success: true, 
        inviteCode,
        message: `Share this code with colleagues: ${inviteCode}` 
      });

    } catch (error) {
      logger.error('Error creating invite code:', error);
      res.status(500).json({ error: 'Failed to create invite code' });
    }
  }

  private async syncAllData(req: express.Request, res: express.Response): Promise<void> {
    try {
      if (!syncEngine.isEnabled()) {
        res.status(400).json({ error: 'Sync is not enabled' });
        return;
      }

      const repositories = this.repositoryFactory.getRepositories();
      const tubes = await repositories.tubes.findAll();
      const tubeDtos = tubes.map(tube => ({
        ...tube.toData(),
        sample: {
          ...tube.toData().sample,
          cellType: tube.toData().sample.cellType || '' // Ensure required field has default
        }
      }));
      const result = await syncEngine.syncAllTubes(tubeDtos);

      logger.info(`Manual sync triggered by admin`, {
        admin: (req as any).user?.username,
        synced: result.synced,
        errors: result.errors.length
      });

      res.json({
        success: result.success,
        result: {
          synced: result.synced,
          total: tubes.length,
          errors: result.errors,
          conflicts: result.conflicts
        }
      });

    } catch (error) {
      logger.error('Error syncing all data:', error);
      res.status(500).json({ error: 'Failed to sync data' });
    }
  }

  // Configuration management endpoints removed - use security config instead

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

      // Just notify frontend to handle configuration update
      if (this.io) {
        this.io.emit('tubeUpdate', { 
          type: 'bulk-delete',
          data: { deletedTubes: tankTubes, tankId }
        });
        
        // Tell frontend to remove tank from configuration
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

  private saveDebugLogs(req: express.Request, res: express.Response): void {
    try {
      const { logs } = req.body;
      
      // Get the directory where exe is running
      const isPkg = (process as any).pkg !== undefined;
      const logDir = isPkg ? path.dirname(process.execPath) : __dirname;
      const logFile = path.join(logDir, 'odysseus-debug.log');
      
      // Write logs to file
      const logContent = logs.join('\n') + '\n';
      fs.writeFileSync(logFile, logContent);
      
      logger.info('Debug logs saved to:', logFile);
      res.json({ success: true, logFile });
    } catch (error) {
      console.error('Failed to save debug logs:', error);
      res.status(500).json({ error: 'Failed to save logs' });
    }
  }

  // BACKUP/EXPORT ENDPOINTS (Disaster Recovery)

  private async createBackup(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { backupDir } = req.body;
      
      // SQLite backup with integrity verification
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupPath = path.join(backupDir || './backups', `odysseus-backup-${timestamp}.sqlite`);
      
      // TODO: Implement backup functionality with repositories
      const success = false; // Placeholder until backup is implemented
      
      if (success) {
        // TODO: Implement backup verification
        const verification = { isValid: true, size: 0, checksum: '' };
        
        res.json({
          success: true,
          message: 'SQLite backup created and verified',
          backupPath,
          verification
        });
      } else {
        res.status(500).json({ error: 'Failed to create backup' });
      }
    } catch (error) {
      logger.error('Error creating backup:', error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  }

  // JSON export method removed - SQLite backup only

  private async restoreFromBackup(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { backupPath } = req.body;
      
      if (!backupPath) {
        res.status(400).json({ error: 'Backup path is required' });
        return;
      }

      // SQLite backup restore - copy backup file to main database location
      const fs = await import('fs');
      if (!fs.existsSync(backupPath)) {
        res.status(404).json({ error: 'Backup file not found' });
        return;
      }

      // This would require app restart to use the restored database
      res.json({ 
        success: true, 
        message: 'SQLite backup restore requires manual file replacement and app restart'
      });
    } catch (error) {
      logger.error('Error restoring from backup:', error);
      res.status(500).json({ error: 'Failed to restore from backup' });
    }
  }

  private async getDatabaseStatus(req: express.Request, res: express.Response): Promise<void> {
    try {
      // SQLite-only database status
      res.json({
        success: true,
        status: {
          type: 'SQLite',
          initialized: true,
          connected: true,
          features: { 
            backupSupported: true,
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
      // Initialize repository factory and database
      await this.repositoryFactory.initialize();
      
      // Initialize Firebase (non-blocking - app works without it)
      firebaseService.initialize().catch(error => 
        logger.warn('Firebase initialization failed - running in local-only mode:', error)
      );
      
      const port = process.env.PORT || 3001;
      this.server.listen(port, async () => {
        const isHealthy = await this.repositoryFactory.isHealthy();
        logger.info(`🚀 Odysseus server started on port ${port}`);
        logger.info(`📊 Database: ${isHealthy ? 'Connected' : 'Disconnected'}`);
        logger.info(`🔥 Firebase: ${firebaseService.isConnected() ? 'Connected' : 'Local-only mode'}`);
        logger.info(`🏛️ Architecture: Clean Repository Pattern with Domain-Driven Design`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down server...');
    try {
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
