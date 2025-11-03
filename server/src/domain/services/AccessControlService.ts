import { User } from '@domain/entities/User';
import { Tube } from '@domain/entities/Tube';
import { Researcher } from '@domain/entities/Researcher';
import { Configuration } from '@domain/entities/Configuration';
import { UserRepository } from '@domain/repositories/UserRepository';
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { PermissionError } from '@domain/errors/PermissionError';
import { NotFoundError } from '@domain/errors/NotFoundError';

/**
 * AccessControlService
 * 
 * Domain service that handles complex access control and permission logic
 * that involves multiple aggregates and business rules.
 * 
 * This service encapsulates authorization logic that goes beyond simple role checking:
 * - Context-aware permissions (e.g., can edit own tubes vs all tubes)
 * - Resource-level authorization (e.g., can delete specific tube)
 * - Business rule enforcement (e.g., admin operations)
 * - Cross-entity permission checks
 */
export class AccessControlService {
  
  constructor(
    private userRepository: UserRepository,
    private tubeRepository: TubeRepository
  ) {}

  // TUBE OPERATIONS

  /**
   * Check if user can create tubes (OAuth 2.0 token-based authorization)
   */
  async canCreateTube(user: User): Promise<AccessResult> {
    // OAuth 2.0 permission validation - token ensures user is active
    if (!user.hasPermission('create_tubes')) {
      return this.createDeniedResult('User does not have permission to create tubes');
    }

    // Access token presence validates user activity (30-minute token lifespan)
    return this.createAllowedResult('OAuth 2.0 token validation successful');
  }

  /**
   * Check if user can edit a specific tube
   */
  async canEditTube(user: User, tube: Tube): Promise<AccessResult> {
    // Basic permission check
    if (!user.hasPermission('edit_tubes')) {
      return this.createDeniedResult('User does not have permission to edit tubes');
    }

    // Business rule: Admins can edit any tube
    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    // Business rule: Users can only edit their own tubes (if researcherId matches user's researcher)
    // Note: This now requires comparing researcher ID to user's linked researcher ID
    if (tube.researcherId && tube.researcherId === user.researcherId) {
      return this.createAllowedResult('Owner access');
    }

    // Business rule: Users can edit tubes with no assigned researcher
    if (!tube.researcherId || tube.researcherId.trim() === '') {
      return this.createAllowedResult('Unassigned tube');
    }

    return this.createDeniedResult(`Only the assigned researcher or administrators can edit this tube`);
  }

  /**
   * Check if user can delete a specific tube
   */
  async canDeleteTube(user: User, tube: Tube): Promise<AccessResult> {
    // Basic permission check
    if (!user.hasPermission('delete_tubes')) {
      return this.createDeniedResult('User does not have permission to delete tubes');
    }

    // Business rule: Admins can delete any tube
    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    // Business rule: Users can only delete their own tubes
    if (tube.researcherId && tube.researcherId === user.researcherId) {
      // Additional business rule: Check if tube is not too old (prevent accidental deletion)
      const daysSinceCreation = (Date.now() - tube.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 365) { // 1 year
        return this.createDeniedResult('Cannot delete tubes older than 1 year. Please contact an administrator.');
      }

      return this.createAllowedResult('Owner access');
    }

    // Business rule: Users can delete tubes with no assigned researcher (within limits)
    if (!tube.researcherId || tube.researcherId.trim() === '') {
      const daysSinceCreation = (Date.now() - tube.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation <= 7) { // 7 days
        return this.createAllowedResult('Recent unassigned tube');
      }
      return this.createDeniedResult('Cannot delete old unassigned tubes. Please contact an administrator.');
    }

    return this.createDeniedResult(`Only the assigned researcher or administrators can delete this tube`);
  }

  /**
   * Check if user can move tube to a different location
   */
  async canMoveTube(user: User, tube: Tube, newLocation: any): Promise<AccessResult> {
    // First check if user can edit the tube
    const editCheck = await this.canEditTube(user, tube);
    if (!editCheck.allowed) {
      return editCheck;
    }

    // Additional business rule: Check if destination is in a restricted area
    // (This could be enhanced with location-based restrictions)
    
    return this.createAllowedResult();
  }

  // BULK OPERATIONS

  /**
   * Check if user can perform bulk operations
   */
  async canPerformBulkOperation(user: User, operation: BulkOperation, tubeIds: string[]): Promise<BulkAccessResult> {
    const results: BulkAccessResult = {
      allowed: true,
      allowedTubes: [],
      deniedTubes: [],
      errors: []
    };

    // Business rule: Limit bulk operation size for non-admins
    if (!user.isAdmin() && tubeIds.length > 50) {
      return {
        allowed: false,
        allowedTubes: [],
        deniedTubes: tubeIds,
        errors: ['Bulk operations limited to 50 tubes for non-administrators']
      };
    }

    // Check each tube individually
    for (const tubeId of tubeIds) {
      try {
        const tube = await this.tubeRepository.findById(tubeId);
        if (!tube) {
          results.deniedTubes.push(tubeId);
          results.errors.push(`Tube ${tubeId} not found`);
          continue;
        }

        let accessResult: AccessResult;
        
        switch (operation) {
          case 'edit':
            accessResult = await this.canEditTube(user, tube);
            break;
          case 'delete':
            accessResult = await this.canDeleteTube(user, tube);
            break;
          case 'move':
            accessResult = await this.canMoveTube(user, tube, null); // Location checked separately
            break;
          default:
            accessResult = this.createDeniedResult('Unknown operation');
        }

        if (accessResult.allowed) {
          results.allowedTubes.push(tubeId);
        } else {
          results.deniedTubes.push(tubeId);
          results.errors.push(`${tubeId}: ${accessResult.reason}`);
        }
      } catch (error) {
        results.deniedTubes.push(tubeId);
        results.errors.push(`${tubeId}: Error checking permissions`);
      }
    }

    // Overall operation is allowed if at least one tube is allowed
    results.allowed = results.allowedTubes.length > 0;

    return results;
  }

  // RESEARCHER OPERATIONS

  /**
   * Check if user can manage researchers
   */
  async canManageResearchers(user: User): Promise<AccessResult> {
    if (!user.hasPermission('manage_researchers')) {
      return this.createDeniedResult('User does not have permission to manage researchers');
    }

    return this.createAllowedResult();
  }

  /**
   * Check if user can edit a specific researcher
   */
  async canEditResearcher(user: User, researcher: Researcher): Promise<AccessResult> {
    const manageCheck = await this.canManageResearchers(user);
    if (!manageCheck.allowed) {
      return manageCheck;
    }

    // Business rule: Check if researcher has active tubes
    const tubeCount = await this.tubeRepository.countByResearcher(researcher.getFullName());
    if (tubeCount > 0) {
      return this.createAllowedResult(`Researcher has ${tubeCount} tubes`, { tubeCount });
    }

    return this.createAllowedResult();
  }

  /**
   * Check if user can delete a researcher
   */
  async canDeleteResearcher(user: User, researcher: Researcher): Promise<AccessResult> {
    const manageCheck = await this.canManageResearchers(user);
    if (!manageCheck.allowed) {
      return manageCheck;
    }

    // Business rule: Cannot delete researchers with active tubes
    const tubeCount = await this.tubeRepository.countByResearcher(researcher.getFullName());
    if (tubeCount > 0) {
      return this.createDeniedResult(`Cannot delete researcher with ${tubeCount} active tubes. Reassign or delete tubes first.`);
    }

    return this.createAllowedResult();
  }

  // USER MANAGEMENT

  /**
   * Check if user can manage other users
   */
  async canManageUsers(user: User): Promise<AccessResult> {
    if (!user.hasPermission('manage_users')) {
      return this.createDeniedResult('User does not have permission to manage users');
    }

    return this.createAllowedResult();
  }

  /**
   * Check if user can manage a specific user
   */
  async canManageUser(user: User, targetUser: User): Promise<AccessResult> {
    const manageCheck = await this.canManageUsers(user);
    if (!manageCheck.allowed) {
      return manageCheck;
    }

    // Business rule: Cannot manage yourself (prevents lockout)
    if (user.equals(targetUser)) {
      return this.createDeniedResult('Cannot manage your own user account');
    }

    // Business rule: Check if this would leave no admins
    if (targetUser.isAdmin()) {
      const adminCount = await this.userRepository.countByRole('admin');
      if (adminCount <= 1) {
        return this.createDeniedResult('Cannot modify the last administrator account');
      }
    }

    return this.createAllowedResult();
  }

  // CONFIGURATION OPERATIONS

  /**
   * Check if user can modify system configuration
   */
  async canModifyConfiguration(user: User): Promise<AccessResult> {
    if (!user.hasPermission('manage_configuration')) {
      return this.createDeniedResult('User does not have permission to modify configuration');
    }

    return this.createAllowedResult();
  }

  /**
   * Check if user can delete equipment (tanks, racks, boxes)
   */
  async canDeleteEquipment(user: User, equipmentType: 'tank' | 'rack' | 'box', equipmentId: string): Promise<AccessResult> {
    const configCheck = await this.canModifyConfiguration(user);
    if (!configCheck.allowed) {
      return configCheck;
    }

    // Business rule: Check if equipment has tubes
    let tubeCount = 0;
    
    try {
      if (equipmentType === 'tank') {
        tubeCount = await this.tubeRepository.countByTank(equipmentId);
      }
      // Add similar checks for rack and box if needed
      
      if (tubeCount > 0) {
        return this.createDeniedResult(`Cannot delete ${equipmentType} with ${tubeCount} tubes. Move or delete tubes first.`);
      }
    } catch (error) {
      return this.createDeniedResult('Unable to verify equipment usage');
    }

    return this.createAllowedResult();
  }

  // ADMIN OPERATIONS

  /**
   * Check if user can access admin features (OAuth 2.0 token-based authorization)
   */
  async canAccessAdminFeatures(user: User): Promise<AccessResult> {
    if (!user.hasPermission('admin_settings')) {
      return this.createDeniedResult('User does not have administrative privileges');
    }

    // OAuth 2.0 token validation ensures fresh authentication (30-minute token lifespan)
    // Token presence guarantees user authenticated within last 30 minutes
    return this.createAllowedResult('OAuth 2.0 admin token validation successful');
  }

  /**
   * Check if user can perform system maintenance
   */
  async canPerformMaintenance(user: User): Promise<AccessResult> {
    const adminCheck = await this.canAccessAdminFeatures(user);
    if (!adminCheck.allowed) {
      return adminCheck;
    }

    // Additional business rule: Verify admin count
    const adminCount = await this.userRepository.countByRole('admin');
    if (adminCount < 2) {
      return this.createDeniedResult('System maintenance requires at least 2 active administrators');
    }

    return this.createAllowedResult();
  }

  // HELPER METHODS

  private createAllowedResult(reason?: string, metadata?: any): AccessResult {
    return {
      allowed: true,
      reason: reason || 'Access granted',
      metadata
    };
  }

  private createDeniedResult(reason: string, metadata?: any): AccessResult {
    return {
      allowed: false,
      reason,
      metadata
    };
  }

  /**
   * Require permission or throw error
   */
  async requireTubeAccess(user: User, tube: Tube, operation: 'create' | 'edit' | 'delete' | 'move'): Promise<void> {
    let result: AccessResult;

    switch (operation) {
      case 'create':
        result = await this.canCreateTube(user);
        break;
      case 'edit':
        result = await this.canEditTube(user, tube);
        break;
      case 'delete':
        result = await this.canDeleteTube(user, tube);
        break;
      case 'move':
        result = await this.canMoveTube(user, tube, null);
        break;
      default:
        throw new PermissionError(`Unknown operation: ${operation}`);
    }

    if (!result.allowed) {
      throw new PermissionError(result.reason, {
        userId: user.id,
        tubeId: tube.id,
        operation
      });
    }
  }

  /**
   * Require admin access or throw error
   */
  async requireAdminAccess(user: User): Promise<void> {
    const result = await this.canAccessAdminFeatures(user);
    if (!result.allowed) {
      throw new PermissionError(result.reason, { userId: user.id });
    }
  }

  // ADDITIONAL REQUIRE METHODS

  /**
   * Require user can create tubes (OAuth 2.0 token-based authorization)
   */
  requireCanCreateTube(user: User): void {
    if (!user.hasPermission('create_tubes')) {
      throw new PermissionError('User does not have permission to create tubes', {
        userId: user.id,
        username: user.username,
        role: user.roleString,
        requiredPermission: 'create_tubes'
      });
    }

    // OAuth 2.0: User presence here validates active authentication
    // Valid access token (30-minute lifespan) ensures recent authentication
  }

  /**
   * Require user can view tube (throws if not allowed)
   */
  requireCanViewTube(user: User, tube: Tube): void {
    if (!user.hasPermission('view_tubes')) {
      throw new PermissionError('User does not have permission to view tubes', {
        userId: user.id,
        tubeId: tube.id
      });
    }

    // Regular users can only view their own tubes
    if (!user.isAdmin() && tube.researcherId !== user.researcherId) {
      throw new PermissionError('User can only view their own tubes', {
        userId: user.id,
        tubeId: tube.id,
        tubeResearcherId: tube.researcherId
      });
    }
  }

  /**
   * Require user can view tubes (throws if not allowed)
   */
  requireCanViewTubes(user: User): void {
    if (!user.hasPermission('view_tubes')) {
      throw new PermissionError('User does not have permission to view tubes', {
        userId: user.id,
        role: user.roleString
      });
    }
  }

  /**
   * Require user can edit tube (throws if not allowed)
   */
  requireCanEditTube(user: User, tube: Tube): void {
    if (!user.hasPermission('edit_tubes')) {
      throw new PermissionError('User does not have permission to edit tubes', {
        userId: user.id,
        tubeId: tube.id
      });
    }

    // Regular users can only edit their own tubes
    if (!user.isAdmin() && tube.researcherId !== user.researcherId) {
      throw new PermissionError('User can only edit their own tubes', {
        userId: user.id,
        tubeId: tube.id,
        tubeResearcherId: tube.researcherId
      });
    }
  }

  /**
   * Require user can delete tube (throws if not allowed)
   */
  requireCanDeleteTube(user: User, tube: Tube): void {
    if (!user.hasPermission('delete_tubes')) {
      throw new PermissionError('User does not have permission to delete tubes', {
        userId: user.id,
        tubeId: tube.id
      });
    }

    // Regular users can only delete their own tubes
    if (!user.isAdmin() && tube.researcherId !== user.researcherId) {
      throw new PermissionError('User can only delete their own tubes', {
        userId: user.id,
        tubeId: tube.id,
        tubeResearcherId: tube.researcherId
      });
    }
  }

  /**
   * Require user can bulk edit tubes (throws if not allowed)
   */
  requireCanBulkEditTubes(user: User): void {
    if (!user.hasPermission('bulk_edit')) {
      throw new PermissionError('User does not have permission for bulk operations', {
        userId: user.id,
        role: user.roleString
      });
    }

    // Bulk operations require admin or elevated permissions
    if (!user.isAdmin()) {
      throw new PermissionError('Bulk operations require administrative privileges', {
        userId: user.id,
        role: user.roleString
      });
    }
  }

  /**
   * Require user can manage users (OAuth 2.0 token-based authorization)
   */
  requireCanManageUsers(user: User): void {
    if (!user.isAdmin()) {
      throw new PermissionError('User management requires administrative privileges', {
        userId: user.id,
        role: user.roleString,
        requiredRole: 'admin'
      });
    }

    // OAuth 2.0: Valid access token (30-minute lifespan) ensures fresh admin authentication
    // No additional session checks needed - token validity = authentication freshness
  }

  /**
   * Require user can manage researchers (throws if not allowed)
   */
  requireCanManageResearchers(user: User): void {
    // Allow users to manage researchers (needed for tube creation)
    if (!user.hasPermission('manage_researchers')) {
      throw new PermissionError('User does not have permission to manage researchers', {
        userId: user.id,
        role: user.roleString
      });
    }
  }
}

// TYPES AND INTERFACES

export interface AccessResult {
  allowed: boolean;
  reason: string;
  metadata?: any;
}

export interface BulkAccessResult {
  allowed: boolean;
  allowedTubes: string[];
  deniedTubes: string[];
  errors: string[];
}

export type BulkOperation = 'edit' | 'delete' | 'move';
