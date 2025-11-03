/**
 * Sync Engine - Orchestrates data synchronization between local and Firebase
 * Clean separation of concerns for sync operations
 */
import { firebaseService, SyncedTubeData } from './FirebaseSyncService';
import { workspaceService } from './WorkspaceService';
import { TubeData, ResearcherData, UserData } from '../../interfaces/DatabaseProvider';
import { logger } from '../../utils/logger';

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
  conflicts: number;
}

export interface SyncStats {
  lastSyncAt: string;
  totalSynced: number;
  pendingSync: number;
  conflictsResolved: number;
}

class SyncEngine {
  private enabled: boolean = false;
  private workspaceId: string | null = null;
  private userId: string | null = null;
  private syncInProgress: boolean = false;
  private stats: SyncStats = {
    lastSyncAt: '',
    totalSynced: 0,
    pendingSync: 0,
    conflictsResolved: 0
  };

  /**
   * Initialize sync engine for a user and workspace
   */
  public async initialize(userId: string, userEmail: string, workspaceName?: string): Promise<boolean> {
    try {
      this.userId = userId;
      
      if (!firebaseService.isConnected()) {
        logger.info('Firebase not connected, running in local-only mode');
        this.enabled = false;
        return false;
      }

      // Find existing workspace or create new one
      const existingWorkspaces = await workspaceService.getUserWorkspaces(userId);
      
      if (existingWorkspaces.length > 0) {
        // User is already part of a workspace
        this.workspaceId = existingWorkspaces[0].id;
        logger.info(`Joined existing workspace: ${existingWorkspaces[0].name}`);
      } else {
        // Create new workspace for first-time user
        const workspace = await workspaceService.createWorkspace(
          userId, 
          userEmail, 
          workspaceName || `${userEmail}'s Lab`
        );
        this.workspaceId = workspace.id;
        logger.info(`Created new workspace: ${workspace.name}`);
      }

      this.enabled = true;
      logger.info(`🔄 Sync engine initialized for workspace: ${this.workspaceId}`);
      return true;

    } catch (error) {
      logger.error('Failed to initialize sync engine:', error);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Check if sync is enabled and ready
   */
  public isEnabled(): boolean {
    return this.enabled && firebaseService.isConnected() && this.workspaceId !== null;
  }

  /**
   * Get current workspace ID
   */
  public getWorkspaceId(): string | null {
    return this.workspaceId;
  }

  /**
   * Sync a tube to Firebase (called after local save)
   */
  public async syncTube(tube: TubeData): Promise<boolean> {
    if (!this.isEnabled() || this.syncInProgress) {
      return false;
    }

    try {
      const db = firebaseService.getFirestore();
      const syncedTube: SyncedTubeData = {
        ...tube,
        timestamps: {
          createdAt: typeof tube.timestamps.createdAt === 'string' 
            ? tube.timestamps.createdAt 
            : tube.timestamps.createdAt.toISOString(),
          updatedAt: typeof tube.timestamps.updatedAt === 'string'
            ? tube.timestamps.updatedAt
            : tube.timestamps.updatedAt.toISOString()
        },
        workspaceId: this.workspaceId!,
        lastSyncedAt: new Date().toISOString(),
        version: 1,
        modifiedBy: this.userId!
      };

      await db.collection('workspaces')
        .doc(this.workspaceId!)
        .collection('tubes')
        .doc(tube.id)
        .set(syncedTube);

      this.stats.totalSynced++;
      this.stats.lastSyncAt = new Date().toISOString();

      logger.debug(`Tube synced to Firebase: ${tube.id}`);
      return true;

    } catch (error) {
      logger.error('Failed to sync tube:', error);
      return false;
    }
  }

  /**
   * Sync tube deletion to Firebase
   */
  public async syncTubeDeletion(tubeId: string): Promise<boolean> {
    if (!this.isEnabled() || this.syncInProgress) {
      return false;
    }

    try {
      const db = firebaseService.getFirestore();
      await db.collection('workspaces')
        .doc(this.workspaceId!)
        .collection('tubes')
        .doc(tubeId)
        .delete();

      logger.debug(`Tube deletion synced to Firebase: ${tubeId}`);
      return true;

    } catch (error) {
      logger.error('Failed to sync tube deletion:', error);
      return false;
    }
  }

  /**
   * Sync all local tubes to Firebase (initial sync)
   */
  public async syncAllTubes(localTubes: TubeData[]): Promise<SyncResult> {
    if (!this.isEnabled()) {
      return { success: false, synced: 0, errors: ['Sync not enabled'], conflicts: 0 };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: [],
      conflicts: 0
    };

    try {
      const db = firebaseService.getFirestore();
      const batch = db.batch();
      const tubesCollection = db.collection('workspaces')
        .doc(this.workspaceId!)
        .collection('tubes');

      for (const tube of localTubes) {
        try {
          const syncedTube: SyncedTubeData = {
            ...tube,
            timestamps: {
              createdAt: typeof tube.timestamps.createdAt === 'string' 
                ? tube.timestamps.createdAt 
                : tube.timestamps.createdAt.toISOString(),
              updatedAt: typeof tube.timestamps.updatedAt === 'string'
                ? tube.timestamps.updatedAt
                : tube.timestamps.updatedAt.toISOString()
            },
            workspaceId: this.workspaceId!,
            lastSyncedAt: new Date().toISOString(),
            version: 1,
            modifiedBy: this.userId!
          };

          batch.set(tubesCollection.doc(tube.id), syncedTube);
          result.synced++;

        } catch (error) {
          result.errors.push(`Failed to sync tube ${tube.id}: ${error}`);
        }
      }

      await batch.commit();
      
      this.stats.totalSynced += result.synced;
      this.stats.lastSyncAt = new Date().toISOString();

      logger.info(`Bulk sync completed: ${result.synced} tubes synced`);

    } catch (error) {
      logger.error('Failed to sync all tubes:', error);
      result.success = false;
      result.errors.push(`Bulk sync failed: ${error}`);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Pull changes from Firebase (download updates from other users)
   */
  public async pullChanges(): Promise<TubeData[]> {
    if (!this.isEnabled()) {
      return [];
    }

    try {
      const db = firebaseService.getFirestore();
      const snapshot = await db.collection('workspaces')
        .doc(this.workspaceId!)
        .collection('tubes')
        .get();

      const remoteTubes: TubeData[] = [];
      
      snapshot.forEach(doc => {
        const syncedTube = doc.data() as SyncedTubeData;
        
        // Convert back to local tube format
        const localTube: TubeData = {
          id: syncedTube.id,
          location: {
            tankId: syncedTube.location.tankId || 'tank-1', // Default tank for backward compatibility
            rackId: syncedTube.location.rackId,
            boxId: syncedTube.location.boxId,
            position: syncedTube.location.position
          },
          sample: {
            cellType: syncedTube.sample.cellType,
            donorInternalId: syncedTube.sample.donorInternalId,
            donorSourceId: syncedTube.sample.donorSourceId,
            concentration: syncedTube.sample.concentration,
            concentrationUnit: syncedTube.sample.concentrationUnit,
            date: syncedTube.sample.date,
            media: syncedTube.sample.media,
            cultureCondition: syncedTube.sample.cultureCondition,
            lotNumber: syncedTube.sample.lotNumber,
            notes: syncedTube.sample.notes
          },
          researcherId: syncedTube.researcherId,
          timestamps: {
            createdAt: syncedTube.timestamps.createdAt,
            updatedAt: syncedTube.timestamps.updatedAt
          }
        };

        remoteTubes.push(localTube);
      });

      logger.debug(`Pulled ${remoteTubes.length} tubes from Firebase`);
      return remoteTubes;

    } catch (error) {
      logger.error('Failed to pull changes from Firebase:', error);
      return [];
    }
  }

  /**
   * Create an invite code for the current workspace
   */
  public async createInviteCode(role: 'admin' | 'user' = 'user'): Promise<string | null> {
    if (!this.isEnabled() || !this.userId || !this.workspaceId) {
      return null;
    }

    try {
      const inviteCode = await workspaceService.createInviteCode(
        this.workspaceId,
        this.userId,
        role
      );

      logger.info(`Invite code created: ${inviteCode}`);
      return inviteCode;

    } catch (error) {
      logger.error('Failed to create invite code:', error);
      return null;
    }
  }

  /**
   * Use an invite code to join a workspace
   */
  public async joinWorkspace(inviteCode: string, userEmail: string): Promise<boolean> {
    if (!this.userId) {
      return false;
    }

    try {
      const result = await workspaceService.useInviteCode(inviteCode, this.userId, userEmail);
      
      if (result.success && result.workspaceId) {
        this.workspaceId = result.workspaceId;
        this.enabled = true;
        logger.info(`Successfully joined workspace: ${result.workspaceId}`);
        return true;
      }

      logger.warn(`Failed to join workspace: ${result.error}`);
      return false;

    } catch (error) {
      logger.error('Failed to join workspace:', error);
      return false;
    }
  }

  /**
   * Get sync statistics
   */
  public getSyncStats(): SyncStats {
    return { ...this.stats };
  }

  /**
   * Listen for real-time changes from Firebase
   */
  public startRealtimeSync(onTubeChanged: (tube: TubeData) => void, onTubeDeleted: (tubeId: string) => void): void {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const db = firebaseService.getFirestore();
      const tubesCollection = db.collection('workspaces')
        .doc(this.workspaceId!)
        .collection('tubes');

      // Listen for changes
      tubesCollection.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const syncedTube = change.doc.data() as SyncedTubeData;
            
            // Don't process changes made by this user
            if (syncedTube.modifiedBy === this.userId) {
              return;
            }

            const localTube: TubeData = {
              id: syncedTube.id,
              location: {
                tankId: syncedTube.location.tankId || 'tank-1', // Default tank for backward compatibility
                rackId: syncedTube.location.rackId,
                boxId: syncedTube.location.boxId,
                position: syncedTube.location.position
              },
              sample: {
                cellType: syncedTube.sample.cellType,
                donorInternalId: syncedTube.sample.donorInternalId,
                donorSourceId: syncedTube.sample.donorSourceId,
                concentration: syncedTube.sample.concentration,
                concentrationUnit: syncedTube.sample.concentrationUnit,
                date: syncedTube.sample.date,
                media: syncedTube.sample.media,
                cultureCondition: syncedTube.sample.cultureCondition,
                lotNumber: syncedTube.sample.lotNumber,
                notes: syncedTube.sample.notes
              },
              researcherId: syncedTube.researcherId,
              timestamps: {
                createdAt: syncedTube.timestamps.createdAt,
                updatedAt: syncedTube.timestamps.updatedAt
              }
            };

            onTubeChanged(localTube);
            
          } else if (change.type === 'removed') {
            onTubeDeleted(change.doc.id);
          }
        });
      });

      logger.info('🔄 Real-time sync started');

    } catch (error) {
      logger.error('Failed to start real-time sync:', error);
    }
  }

  /**
   * Disable sync and run in local-only mode
   */
  public disable(): void {
    this.enabled = false;
    this.workspaceId = null;
    logger.info('Sync engine disabled, running in local-only mode');
  }
}

export const syncEngine = new SyncEngine();
