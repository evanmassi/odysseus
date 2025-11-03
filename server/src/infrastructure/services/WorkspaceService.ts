/**
 * Workspace Service - Manages lab workspaces and member invitations
 * Clean business logic for multi-user collaboration
 */
import { firebaseService, WorkspaceData, InviteCode } from './FirebaseSyncService';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface WorkspaceInvite {
  code: string;
  workspaceName: string;
  invitedBy: string;
  role: 'admin' | 'user';
  expiresAt: string;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  joinedAt: string;
  lastActivity: string;
}

class WorkspaceService {
  /**
   * Create a new workspace (typically called when first user registers)
   */
  public async createWorkspace(
    ownerId: string, 
    ownerEmail: string, 
    workspaceName: string
  ): Promise<WorkspaceData> {
    try {
      if (!firebaseService.isConnected()) {
        throw new Error('Firebase not connected');
      }

      const db = firebaseService.getFirestore();
      const workspaceId = this.generateWorkspaceId(workspaceName);
      
      const workspace: WorkspaceData = {
        id: workspaceId,
        name: workspaceName,
        ownerId,
        ownerEmail,
        members: [ownerId],
        admins: [ownerId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          allowInvites: true,
          requireApproval: false,
          maxMembers: 50
        }
      };

      await db.collection('workspaces').doc(workspaceId).set(workspace);
      
      logger.info(`Workspace created: ${workspaceName} (${workspaceId})`, {
        owner: ownerEmail,
        workspaceId
      });

      return workspace;
    } catch (error) {
      logger.error('Failed to create workspace:', error);
      throw error;
    }
  }

  /**
   * Get workspace by ID
   */
  public async getWorkspace(workspaceId: string): Promise<WorkspaceData | null> {
    try {
      if (!firebaseService.isConnected()) {
        return null;
      }

      const db = firebaseService.getFirestore();
      const doc = await db.collection('workspaces').doc(workspaceId).get();
      
      if (!doc.exists) {
        return null;
      }

      return doc.data() as WorkspaceData;
    } catch (error) {
      logger.error('Failed to get workspace:', error);
      return null;
    }
  }

  /**
   * Find workspace by user ID
   */
  public async getUserWorkspaces(userId: string): Promise<WorkspaceData[]> {
    try {
      if (!firebaseService.isConnected()) {
        return [];
      }

      const db = firebaseService.getFirestore();
      const snapshot = await db.collection('workspaces')
        .where('members', 'array-contains', userId)
        .get();

      return snapshot.docs.map(doc => doc.data() as WorkspaceData);
    } catch (error) {
      logger.error('Failed to get user workspaces:', error);
      return [];
    }
  }

  /**
   * Generate an invite code for a workspace
   */
  public async createInviteCode(
    workspaceId: string,
    createdBy: string,
    role: 'admin' | 'user' = 'user',
    expirationHours: number = 168 // 1 week default
  ): Promise<string> {
    try {
      if (!firebaseService.isConnected()) {
        throw new Error('Firebase not connected');
      }

      const db = firebaseService.getFirestore();
      const code = this.generateInviteCode();
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString();

      const invite: InviteCode = {
        code,
        workspaceId,
        createdBy,
        role,
        expiresAt,
        active: true
      };

      await db.collection('invites').doc(code).set(invite);

      logger.info(`Invite code created: ${code}`, {
        workspaceId,
        createdBy,
        role,
        expiresAt
      });

      return code;
    } catch (error) {
      logger.error('Failed to create invite code:', error);
      throw error;
    }
  }

  /**
   * Use an invite code to join a workspace
   */
  public async useInviteCode(
    inviteCode: string,
    userId: string,
    userEmail: string
  ): Promise<{ success: boolean; workspaceId?: string; error?: string }> {
    try {
      if (!firebaseService.isConnected()) {
        return { success: false, error: 'Firebase not connected' };
      }

      const db = firebaseService.getFirestore();
      
      // Get and validate invite
      const inviteDoc = await db.collection('invites').doc(inviteCode).get();
      
      if (!inviteDoc.exists) {
        return { success: false, error: 'Invalid invite code' };
      }

      const invite = inviteDoc.data() as InviteCode;
      
      if (!invite.active) {
        return { success: false, error: 'Invite code has been deactivated' };
      }

      if (new Date(invite.expiresAt) < new Date()) {
        return { success: false, error: 'Invite code has expired' };
      }

      if (invite.usedBy) {
        return { success: false, error: 'Invite code has already been used' };
      }

      // Get workspace
      const workspace = await this.getWorkspace(invite.workspaceId);
      if (!workspace) {
        return { success: false, error: 'Workspace not found' };
      }

      // Check if user is already a member
      if (workspace.members.includes(userId)) {
        return { success: false, error: 'User is already a member of this workspace' };
      }

      // Add user to workspace
      const updatedMembers = [...workspace.members, userId];
      const updatedAdmins = invite.role === 'admin' 
        ? [...workspace.admins, userId] 
        : workspace.admins;

      await db.collection('workspaces').doc(invite.workspaceId).update({
        members: updatedMembers,
        admins: updatedAdmins,
        updatedAt: new Date().toISOString()
      });

      // Mark invite as used
      await db.collection('invites').doc(inviteCode).update({
        usedBy: userId,
        usedAt: new Date().toISOString(),
        active: false
      });

      logger.info(`User joined workspace via invite`, {
        userId,
        userEmail,
        workspaceId: invite.workspaceId,
        workspaceName: workspace.name,
        role: invite.role
      });

      return { 
        success: true, 
        workspaceId: invite.workspaceId 
      };

    } catch (error) {
      logger.error('Failed to use invite code:', error);
      return { success: false, error: 'Internal error processing invite' };
    }
  }

  /**
   * Get workspace members
   */
  public async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    try {
      if (!firebaseService.isConnected()) {
        return [];
      }

      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) {
        return [];
      }

      // TODO: In a real implementation, you'd join with user data
      // For now, return basic member info
      return workspace.members.map(memberId => ({
        userId: memberId,
        email: memberId, // Placeholder - would be actual email from user table
        role: workspace.admins.includes(memberId) ? 'admin' : 'user',
        joinedAt: workspace.createdAt, // Placeholder
        lastActivity: new Date().toISOString()
      }));

    } catch (error) {
      logger.error('Failed to get workspace members:', error);
      return [];
    }
  }

  /**
   * Check if user is workspace admin
   */
  public async isWorkspaceAdmin(workspaceId: string, userId: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      return workspace ? workspace.admins.includes(userId) : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user is workspace member
   */
  public async isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      return workspace ? workspace.members.includes(userId) : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get active invite codes for a workspace
   */
  public async getWorkspaceInvites(workspaceId: string): Promise<InviteCode[]> {
    try {
      if (!firebaseService.isConnected()) {
        return [];
      }

      const db = firebaseService.getFirestore();
      const snapshot = await db.collection('invites')
        .where('workspaceId', '==', workspaceId)
        .where('active', '==', true)
        .get();

      return snapshot.docs.map(doc => doc.data() as InviteCode);
    } catch (error) {
      logger.error('Failed to get workspace invites:', error);
      return [];
    }
  }

  /**
   * Revoke an invite code
   */
  public async revokeInviteCode(inviteCode: string): Promise<boolean> {
    try {
      if (!firebaseService.isConnected()) {
        return false;
      }

      const db = firebaseService.getFirestore();
      await db.collection('invites').doc(inviteCode).update({
        active: false,
        revokedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      logger.error('Failed to revoke invite code:', error);
      return false;
    }
  }

  /**
   * Generate a workspace ID from name
   */
  private generateWorkspaceId(name: string): string {
    const sanitized = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    
    const timestamp = Date.now().toString(36);
    return `${sanitized}-${timestamp}`;
  }

  /**
   * Generate a secure invite code
   */
  private generateInviteCode(): string {
    const prefix = 'ODY';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString(36).substring(-4).toUpperCase();
    
    return `${prefix}-${random}-${timestamp}`;
  }
}

export const workspaceService = new WorkspaceService();
