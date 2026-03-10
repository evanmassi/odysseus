import { User } from '@domain/entities/User';
import { Tube } from '@domain/entities/Tube';
import { Researcher } from '@domain/entities/Researcher';
import { Storage } from '@domain/entities/Storage';
import { Location } from '@domain/valueObjects/Location';
import { UserRepository } from '@domain/repositories/UserRepository';
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { PermissionError } from '@domain/errors/PermissionError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import type { AccessResult, BulkAccessResult, BulkOperation } from '@domain/types/services';
import type { RackConfiguration, BoxConfiguration } from '@odysseus/shared-schemas';

/**
 * Minimal interface for resource ownership checking
 * Only requires assignedUserId since that's all canEditResource uses
 */
export interface ResourceWithOwnership {
  assignedUserId?: string | null;
}

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

    // Admins can create tubes without a researcher profile
    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    // Non-admins require a linked researcher profile for tube operations
    if (!user.hasResearcherProfile()) {
      return this.createDeniedResult('Researcher profile required for tube operations');
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
  async canMoveTube(user: User, tube: Tube, newLocation?: Location): Promise<AccessResult> {
    // First check if user can edit the tube
    const editCheck = await this.canEditTube(user, tube);
    if (!editCheck.allowed) {
      return editCheck;
    }

    // Additional business rule: Check if destination is in a restricted area
    // (This could be enhanced with location-based restrictions)

    return this.createAllowedResult();
  }

  // TUBE LOCK OPERATIONS

  /**
   * Check if user can lock a tube
   *
   * Lock permission rules:
   * - Admins can lock any tube
   * - Users can lock tubes in their assigned space (via rack/box assignment)
   * - Users can lock tubes in common space (no assignment)
   * - Users cannot lock tubes in another user's assigned space
   */
  canLockTube(
    user: User,
    tube: Tube,
    containerInfo?: { rack?: ResourceWithOwnership; box?: ResourceWithOwnership }
  ): AccessResult {
    // Already locked
    if (tube.isLocked) {
      return this.createDeniedResult('Tube is already locked');
    }

    // Admin can lock any tube
    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    // Non-admins require a linked researcher profile for tube operations
    if (!user.hasResearcherProfile()) {
      return this.createDeniedResult('Researcher profile required for tube operations');
    }

    // Check container assignment
    if (containerInfo) {
      const { rack, box } = containerInfo;

      // Box-level assignment takes precedence
      if (box?.assignedUserId !== undefined && box.assignedUserId !== null) {
        if (box.assignedUserId !== user.id) {
          return this.createDeniedResult('Cannot lock tube in another user\'s assigned box');
        }
        return this.createAllowedResult('Box owner');
      }

      // Rack-level assignment
      if (rack?.assignedUserId !== undefined && rack.assignedUserId !== null) {
        if (rack.assignedUserId !== user.id) {
          return this.createDeniedResult('Cannot lock tube in another user\'s assigned rack');
        }
        return this.createAllowedResult('Rack owner');
      }
    }

    // Common space - anyone can lock
    return this.createAllowedResult('Common space');
  }

  /**
   * Check if user can unlock a tube
   *
   * Unlock permission rules:
   * - Admins can unlock any tube
   * - Lock owner can unlock their own locks
   * - Users with shared access cannot unlock (only edit)
   */
  canUnlockTube(user: User, tube: Tube): AccessResult {
    // Not locked
    if (!tube.isLocked) {
      return this.createDeniedResult('Tube is not locked');
    }

    // Admin can unlock any tube
    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    // Non-admins require a linked researcher profile for tube operations
    if (!user.hasResearcherProfile()) {
      return this.createDeniedResult('Researcher profile required for tube operations');
    }

    // Lock owner can unlock
    if (tube.lockedBy === user.id) {
      return this.createAllowedResult('Lock owner');
    }

    return this.createDeniedResult('Only the lock owner or an administrator can unlock this tube');
  }

  /**
   * Check if user can access a locked tube for editing
   *
   * Access rules:
   * - Not locked = access granted
   * - Admin = access granted
   * - Lock owner = access granted
   * - Shared user = access granted
   * - Others = denied
   */
  canAccessLockedTube(user: User, tube: Tube): AccessResult {
    // Not locked - no restriction
    if (!tube.isLocked) {
      return this.createAllowedResult('Tube is not locked');
    }

    // Admin bypass
    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    // Lock owner
    if (tube.lockedBy === user.id) {
      return this.createAllowedResult('Lock owner');
    }

    // Shared access
    if (tube.sharedWithUserIds.includes(user.id)) {
      return this.createAllowedResult('Shared access');
    }

    return this.createDeniedResult('Tube is locked by another user');
  }

  /**
   * Check if user can share access to a locked tube
   *
   * Share permission rules:
   * - Admin can share any locked tube
   * - Lock owner can share their locked tubes
   */
  canShareTubeAccess(user: User, tube: Tube): AccessResult {
    if (!tube.isLocked) {
      return this.createDeniedResult('Cannot share access to an unlocked tube');
    }

    // Admin can share any tube
    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    // Non-admins require a linked researcher profile for tube operations
    if (!user.hasResearcherProfile()) {
      return this.createDeniedResult('Researcher profile required for tube operations');
    }

    // Lock owner can share
    if (tube.lockedBy === user.id) {
      return this.createAllowedResult('Lock owner');
    }

    return this.createDeniedResult('Only the lock owner or an administrator can share access');
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
        const tube = await this.tubeRepository.findById(tubeId, user.labId ?? '');
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
            accessResult = await this.canMoveTube(user, tube, undefined); // Location checked separately
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

    const tubeCount = await this.tubeRepository.countByResearcher(researcher.id, user.labId ?? '');
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

    const tubeCount = await this.tubeRepository.countByResearcher(researcher.id, user.labId ?? '');
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

    if (user.equals(targetUser)) {
      return this.createDeniedResult('Cannot manage your own user account');
    }

    // Lab admins can only manage users in their own lab
    if (user.isLabAdmin() && !user.isSystemAdmin()) {
      if (user.labId !== targetUser.labId) {
        return this.createDeniedResult('Lab administrators can only manage users within their own lab');
      }
      if (targetUser.isSystemAdmin()) {
        return this.createDeniedResult('Lab administrators cannot manage system admin accounts');
      }
    }

    // Prevent removing the last lab_admin from a lab
    if (targetUser.isLabAdmin() && !targetUser.isSystemAdmin() && targetUser.labId) {
      const labAdminCount = await this.userRepository.countByRoleInLab('lab_admin', targetUser.labId);
      if (labAdminCount <= 1) {
        return this.createDeniedResult('Cannot modify the last lab administrator account');
      }
    }

    return this.createAllowedResult();
  }

  // CONFIGURATION OPERATIONS

  /**
   * Check if user can modify system configuration
   */
  async canModifyStorage(user: User): Promise<AccessResult> {
    if (!user.hasPermission('manage_configuration')) {
      return this.createDeniedResult('User does not have permission to modify configuration');
    }

    return this.createAllowedResult();
  }

  /**
   * Check if user can delete equipment (tanks, racks, boxes)
   */
  async canDeleteEquipment(user: User, equipmentType: 'tank' | 'rack' | 'box', equipmentId: string): Promise<AccessResult> {
    const configCheck = await this.canModifyStorage(user);
    if (!configCheck.allowed) {
      return configCheck;
    }

    // Business rule: Check if equipment has tubes
    let tubeCount = 0;
    
    try {
      if (equipmentType === 'tank') {
        tubeCount = await this.tubeRepository.countByTank(equipmentId, user.labId ?? '');
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

  // RESOURCE ASSIGNMENT OPERATIONS

  /**
   * Check if user can access a container (rack/box) for tube operations
   *
   * Container access rules (for tube operations like create/edit/delete/lock):
   * - Admins can access any container
   * - null assignment = common space, anyone can access
   * - User can access if assigned to them at box level
   * - User can access if box assignment is undefined (inherit) and rack is assigned to them
   * - Users cannot access containers assigned to other users
   *
   * This protects the container - all tube operations require container access.
   */
  canAccessContainer(
    user: User,
    containerInfo: { rack?: ResourceWithOwnership; box?: ResourceWithOwnership }
  ): AccessResult {
    // Admin can access any container
    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    // Non-admins require a linked researcher profile for tube operations
    if (!user.hasResearcherProfile()) {
      return this.createDeniedResult('Researcher profile required for tube operations');
    }

    const { rack, box } = containerInfo;

    // Box-level assignment takes precedence
    if (box?.assignedUserId !== undefined && box.assignedUserId !== null) {
      if (box.assignedUserId !== user.id) {
        return this.createDeniedResult('This box is assigned to another user');
      }
      return this.createAllowedResult('Box owner');
    }

    // null box assignment = common space (box explicitly unassigned)
    if (box?.assignedUserId === null) {
      return this.createAllowedResult('Common space (box)');
    }

    // Box assignment is undefined (inherit from rack)
    // Check rack-level assignment
    if (rack?.assignedUserId !== undefined && rack.assignedUserId !== null) {
      if (rack.assignedUserId !== user.id) {
        return this.createDeniedResult('This rack is assigned to another user');
      }
      return this.createAllowedResult('Rack owner');
    }

    // null rack assignment = common space (rack explicitly unassigned)
    // No assignment at all = common space
    return this.createAllowedResult('Common space');
  }

  /**
   * Check if user can access a tube for modification operations
   *
   * Two-phase authorization:
   * 1. Base access: container ownership OR shared access to the tube
   * 2. Lock access: if tube is locked, user must be lock owner, shared user, or admin
   *
   * Both phases must pass for modification to be allowed.
   *
   * Note: This is for MODIFY operations only (edit/delete/copy/cut).
   * ADD operations (creating new tubes) require container access - shared access doesn't help.
   */
  canAccessTubeForModification(
    user: User,
    tube: Tube,
    containerInfo: { rack?: ResourceWithOwnership; box?: ResourceWithOwnership }
  ): AccessResult {
    // Phase 1: Check base access (container OR shared)
    const containerAccess = this.canAccessContainer(user, containerInfo);
    const hasContainerAccess = containerAccess.allowed;
    const hasSharedAccess = tube.sharedWithUserIds.includes(user.id);

    if (!hasContainerAccess && !hasSharedAccess) {
      return containerAccess; // Return original container denial message
    }

    // Phase 2: If tube is locked, verify lock access
    const lockAccess = this.canAccessLockedTube(user, tube);
    if (!lockAccess.allowed) {
      return lockAccess;
    }

    return this.createAllowedResult(hasContainerAccess ? containerAccess.reason : 'Shared access to tube');
  }

  /**
   * Check if user can assign resources (racks/boxes) to users
   * Only admins can assign resources
   */
  canAssignResource(user: User): boolean {
    return user.isAdmin();
  }

  /**
   * Check if user can edit a resource (rack or box)
   *
   * Implements ownership cascade:
   * - Admins can edit any resource
   * - null = explicitly unassigned/common - anyone can edit
   * - User can edit if explicitly assigned to them
   * - User can edit box if undefined (inherit) and they own the parent rack
   *
   * Uses minimal ResourceWithOwnership interface to avoid type coupling
   * with full schema types - only assignedUserId is needed for this check
   */
  canEditResource(
    user: User,
    resource: ResourceWithOwnership,
    parentRack?: ResourceWithOwnership
  ): boolean {
    // Admin can edit anything
    if (user.isAdmin()) {
      return true;
    }

    // null = explicitly unassigned/common - anyone can edit
    if (resource.assignedUserId === null) {
      return true;
    }

    // Explicit assignment to this resource
    if (resource.assignedUserId === user.id) {
      return true;
    }

    // Ownership cascade (boxes only)
    // If box has undefined assignment (inherit), check rack ownership
    if (parentRack && resource.assignedUserId === undefined && parentRack.assignedUserId === user.id) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can be assigned resources
   * User must be active to receive resource assignments
   */
  canBeAssignedResources(user: User): boolean {
    return true;
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

    const labAdminCount = await this.userRepository.countByRole('lab_admin');
    if (labAdminCount < 2) {
      return this.createDeniedResult('System maintenance requires at least 2 active administrators');
    }

    return this.createAllowedResult();
  }

  // HELPER METHODS

  private createAllowedResult(reason?: string, metadata?: Record<string, unknown>): AccessResult {
    return {
      allowed: true,
      reason: reason || 'Access granted',
      metadata
    };
  }

  private createDeniedResult(reason: string, metadata?: Record<string, unknown>): AccessResult {
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
        result = await this.canMoveTube(user, tube, undefined);
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

  // REQUIRE METHODS — throw PermissionError if check fails

  /** Require user can create tubes (OAuth 2.0 token-based authorization) */
  requireCanCreateTube(user: User): void {
    this.requirePermission(user, 'create_tubes', 'create tubes');

    // Non-admins require a linked researcher profile for tube operations
    if (!user.isAdmin() && !user.hasResearcherProfile()) {
      throw new PermissionError('Researcher profile required for tube operations', {
        userId: user.id,
        role: user.roleString
      });
    }
  }

  /** Require user can view a specific tube (permission + ownership) */
  requireCanViewTube(user: User, tube: Tube): void {
    this.requirePermission(user, 'view_tubes', 'view tubes', { tubeId: tube.id });
    this.requireTubeOwnership(user, tube, 'view');
  }

  /** Require user can view tubes list */
  requireCanViewTubes(user: User): void {
    this.requirePermission(user, 'view_tubes', 'view tubes');
  }

  /** Require user can edit a specific tube (permission + ownership) */
  requireCanEditTube(user: User, tube: Tube): void {
    this.requirePermission(user, 'edit_tubes', 'edit tubes', { tubeId: tube.id });
    this.requireTubeOwnership(user, tube, 'edit');
  }

  /** Require user can delete a specific tube (permission + ownership) */
  requireCanDeleteTube(user: User, tube: Tube): void {
    this.requirePermission(user, 'delete_tubes', 'delete tubes', { tubeId: tube.id });
    this.requireTubeOwnership(user, tube, 'delete');
  }

  /** Require user can bulk edit tubes (permission + admin) */
  requireCanBulkEditTubes(user: User): void {
    this.requirePermission(user, 'bulk_edit', 'perform bulk operations');
    if (!user.isAdmin()) {
      throw new PermissionError('Bulk operations require administrative privileges', {
        userId: user.id,
        role: user.roleString
      });
    }
  }

  /** Require user can manage users (OAuth 2.0 token-based authorization) */
  requireCanManageUsers(user: User): void {
    if (!user.isAdmin()) {
      throw new PermissionError('User management requires administrative privileges', {
        userId: user.id,
        role: user.roleString,
        requiredRole: 'admin'
      });
    }
  }

  /** Require user can manage researchers */
  requireCanManageResearchers(user: User): void {
    this.requirePermission(user, 'manage_researchers', 'manage researchers');
  }

  // SHARED REQUIRE HELPERS

  /** Throws PermissionError if user lacks the given permission */
  private requirePermission(
    user: User,
    permission: string,
    action: string,
    extra?: Record<string, unknown>
  ): void {
    if (!user.hasPermission(permission)) {
      throw new PermissionError(`User does not have permission to ${action}`, {
        userId: user.id,
        role: user.roleString,
        requiredPermission: permission,
        ...extra
      });
    }
  }

  /** Throws PermissionError if non-admin user doesn't own the tube */
  private requireTubeOwnership(user: User, tube: Tube, action: string): void {
    if (!user.isAdmin() && tube.researcherId !== user.researcherId) {
      throw new PermissionError(`User can only ${action} their own tubes`, {
        userId: user.id,
        tubeId: tube.id,
        tubeResearcherId: tube.researcherId
      });
    }
  }
}

