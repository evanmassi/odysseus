/**
 * Firebase Service - Handles Firebase connection and authentication
 * Clean separation from business logic
 */
import { initializeApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { applicationDefault } from 'firebase-admin/app';
import { logger } from '../../utils/logger';

// Firebase configuration from your project
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBs3wHeil4xsbB0p0bt8DkfMBihO_IMZ98",
  authDomain: "odysseus-xcellbio-inventory.firebaseapp.com",
  projectId: "odysseus-xcellbio-inventory",
  storageBucket: "odysseus-xcellbio-inventory.firebasestorage.app",
  messagingSenderId: "683866993890",
  appId: "1:683866993890:web:2e1769a791371bc3625abb"
};

export interface WorkspaceData {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  members: string[];
  admins: string[];
  createdAt: string;
  updatedAt: string;
  settings: {
    allowInvites: boolean;
    requireApproval: boolean;
    maxMembers: number;
  };
}

export interface MediaData {
  type?: string;
  supplements?: string;
  selection?: string;
}

/**
 * Nested structure matching TubeData from shared schemas
 */
export interface SyncedTubeData {
  id: string;
  workspaceId: string;
  location: {
    tankId: string;
    rackId: string;
    boxId: string;
    position: number;
  };
  sample: {
    cellType?: string;
    donorInternalId?: string;
    donorSourceId?: string;
    concentration?: number;
    concentrationUnit?: 'c/v' | 'c/mL';
    date?: string | Date;
    media?: MediaData;
    cultureCondition?: string;
    lotNumber?: string;
    notes?: string;
  };
  researcherId?: string;
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  // Sync metadata
  lastSyncedAt: string;
  version: number;
  modifiedBy: string;
}

export interface InviteCode {
  code: string;
  workspaceId: string;
  createdBy: string;
  role: 'admin' | 'user';
  expiresAt: string;
  usedBy?: string;
  usedAt?: string;
  active: boolean;
}

class FirebaseService {
  private app: App | null = null;
  private db: Firestore | null = null;
  private auth: Auth | null = null;
  private connected: boolean = false;

  /**
   * Initialize Firebase connection
   */
  public async initialize(): Promise<void> {
    try {
      // For initial implementation, we'll run in local-only mode
      // Firebase connection will be added later when we set up proper auth
      logger.info('🔥 Firebase service - running in development mode (local-only)');
      this.connected = false;
      return;
      
      // TODO: Implement proper Firebase connection
      // this.app = initializeApp({
      //   projectId: FIREBASE_CONFIG.projectId,
      //   // credential: will need service account key
      // });
      // this.db = getFirestore(this.app);
      // this.auth = getAuth(this.app);
      
    } catch (error) {
      logger.error('Failed to initialize Firebase service:', error);
      this.connected = false;
      // Don't throw - app should work without Firebase
    }
  }

  /**
   * Initialize Firestore security rules
   */
  private async initializeSecurityRules(): Promise<void> {
    // Note: Security rules are set via Firebase console or CLI
    // This just logs what rules should be in place
    logger.info('🔒 Firebase security rules should be configured as:');
    logger.info(`
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          // Workspaces - only members can read, only admins can write
          match /workspaces/{workspaceId} {
            allow read: if isWorkspaceMember(workspaceId);
            allow write: if isWorkspaceAdmin(workspaceId);
          }
          
          // Tubes - only workspace members can read/write
          match /workspaces/{workspaceId}/tubes/{tubeId} {
            allow read, write: if isWorkspaceMember(workspaceId);
          }
          
          // Invite codes - only workspace admins can manage
          match /invites/{inviteCode} {
            allow read: if request.auth != null;
            allow write: if isWorkspaceAdmin(resource.data.workspaceId);
          }
        }
        
        function isWorkspaceMember(workspaceId) {
          return request.auth != null && 
            request.auth.uid in get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.members;
        }
        
        function isWorkspaceAdmin(workspaceId) {
          return request.auth != null && 
            request.auth.uid in get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.admins;
        }
      }
    `);
  }

  /**
   * Check if Firebase is connected
   */
  public isConnected(): boolean {
    return this.connected && this.db !== null;
  }

  /**
   * Get Firestore database instance
   */
  public getFirestore(): Firestore {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }
    return this.db;
  }

  /**
   * Get Firebase Auth instance
   */
  public getAuth(): Auth {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }
    return this.auth;
  }

  /**
   * Create or verify a Firebase user token
   */
  public async createUserToken(userId: string, email: string): Promise<string> {
    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      // Create custom token for the user
      const customToken = await this.auth.createCustomToken(userId, {
        email,
        role: 'user'
      });
      
      return customToken;
    } catch (error) {
      logger.error('Failed to create user token:', error);
      throw error;
    }
  }

  /**
   * Verify a user's Firebase token
   */
  public async verifyUserToken(token: string): Promise<any> {
    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      const decodedToken = await this.auth.verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      logger.error('Failed to verify user token:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      if (this.app) {
        // TODO: Implement proper shutdown when Firebase is connected
        // await this.app.delete();
        this.app = null;
        this.db = null;
        this.auth = null;
        this.connected = false;
        logger.info('Firebase service shutdown completed');
      }
    } catch (error) {
      logger.error('Error during Firebase shutdown:', error);
    }
  }
}

// Singleton instance
export const firebaseService = new FirebaseService();
