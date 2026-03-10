/**
 * Tube and Resource Access Authorization
 *
 * Context-aware permission checks that combine role, ownership, and resource assignment rules.
 */

import { User } from '@domain/entities/User';
import { Tube } from '@domain/entities/Tube';
import { Researcher } from '@domain/entities/Researcher';
import { Location } from '@domain/valueObjects/Location';
import { UserRepository } from '@domain/repositories/UserRepository';
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { PermissionError } from '@domain/errors/PermissionError';
import type { AccessResult, BulkAccessResult, BulkOperation } from '@domain/types/services';

/**
 * Minimal interface for resource ownership checking.
 * Only requires assignedUserId since that's all canEditResource uses.
 */
export interface ResourceWithOwnership {
  assignedUserId?: string | null;
}
export class AccessControlService {
  
  constructor(
    private userRepository: UserRepository,
    private tubeRepository: TubeRepository
  ) {}

  // TUBE OPERATIONS

  async canCreateTube(user: User): Promise<AccessResult> {
    if (!user.hasPermission('create_tubes')) {
      return this.createDeniedResult('User does not have permission to create tubes');
    }

    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    if (!user.hasResearcherProfile()) {
      return this.createDeniedResult('Researcher profile required for tube operations');
    }

    return this.createAllowedResult('Authorized');
  }

  async canEditTube(user: User, tube: Tube): Promise<AccessResult> {
    if (!user.hasPermission('edit_tubes')) {
      return this.createDeniedResult('User does not have permission to edit tubes');
    }

    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    if (tube.researcherId && tube.researcherId === user.researcherId) {
      return this.createAllowedResult('Owner access');
    }

    if (!tube.researcherId || tube.researcherId.trim() === '') {
      return this.createAllowedResult('Unassigned tube');
    }

    return this.createDeniedResult(`Only the assigned researcher or administrators can edit this tube`);
  }

  async canDeleteTube(user: User, tube: Tube): Promise<AccessResult> {
    if (!user.hasPermission('delete_tubes')) {
      return this.createDeniedResult('User does not have permission to delete tubes');
    }

    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    if (tube.researcherId && tube.researcherId === user.researcherId) {
      const daysSinceCreation = (Date.now() - tube.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      // Prevent accidental deletion of old data — admins can still delete
      if (daysSinceCreation > 365) {
        return this.createDeniedResult('Cannot delete tubes older than 1 year. Please contact an administrator.');
      }

      return this.createAllowedResult('Owner access');
    }

    // Unassigned tubes can only be deleted within 7 days of creation
    if (!tube.researcherId || tube.researcherId.trim() === '') {
      const daysSinceCreation = (Date.now() - tube.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation <= 7) {
        return this.createAllowedResult('Recent unassigned tube');
      }
      return this.createDeniedResult('Cannot delete old unassigned tubes. Please contact an administrator.');
    }

    return this.createDeniedResult(`Only the assigned researcher or administrators can delete this tube`);
  }

  async canMoveTube(user: User, tube: Tube, newLocation?: Location): Promise<AccessResult> {
    const editCheck = await this.canEditTube(user, tube);
    if (!editCheck.allowed) {
      return editCheck;
    }

    return this.createAllowedResult();
  }

  // TUBE LOCK OPERATIONS

  canLockTube(
    user: User,
    tube: Tube,
    containerInfo?: { rack?: ResourceWithOwnership; box?: ResourceWithOwnership }
  ): AccessResult {
    if (tube.isLocked) {
      return this.createDeniedResult('Tube is already locked');
    }

    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    if (!user.hasResearcherProfile()) {
      return this.createDeniedResult('Researcher profile required for tube operations');
    }

    if (containerInfo) {
      const { rack, box } = containerInfo;

      if (box?.assignedUserId !== undefined && box.assignedUserId !== null) {
        if (box.assignedUserId !== user.id) {
          return this.createDeniedResult('Cannot lock tube in another user\'s assigned box');
        }
        return this.createAllowedResult('Box owner');
      }

      if (rack?.assignedUserId !== undefined && rack.assignedUserId !== null) {
        if (rack.assignedUserId !== user.id) {
          return this.createDeniedResult('Cannot lock tube in another user\'s assigned rack');
        }
        return this.createAllowedResult('Rack owner');
      }
    }

    return this.createAllowedResult('Common space');
  }

  /** Shared users cannot unlock — only the lock owner or admin can */
  canUnlockTube(user: User, tube: Tube): AccessResult {
    if (!tube.isLocked) {
      return this.createDeniedResult('Tube is not locked');
    }

    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    if (!user.hasResearcherProfile()) {
      return this.createDeniedResult('Researcher profile required for tube operations');
    }

    if (tube.lockedBy === user.id) {
      return this.createAllowedResult('Lock owner');
    }

    return this.createDeniedResult('Only the lock owner or an administrator can unlock this tube');
  }

  canAccessLockedTube(user: User, tube: Tube): AccessResult {
    if (!tube.isLocked) {
      return this.createAllowedResult('Tube is not locked');
    }

    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    if (tube.lockedBy === user.id) {
      return this.createAllowedResult('Lock owner');
    }

    if (tube.sharedWithUserIds.includes(user.id)) {
      return this.createAllowedResult('Shared access');
    }

    return this.createDeniedResult('Tube is locked by another user');
  }

  canShareTubeAccess(user: User, tube: Tube): AccessResult {
    if (!tube.isLocked) {
      return this.createDeniedResult('Cannot share access to an unlocked tube');
    }

    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    if (!user.hasResearcherProfile()) {
      return this.createDeniedResult('Researcher profile required for tube operations');
    }

    if (tube.lockedBy === user.id) {
      return this.createAllowedResult('Lock owner');
    }

    return this.createDeniedResult('Only the lock owner or an administrator can share access');
  }

  // BULK OPERATIONS

  async canPerformBulkOperation(user: User, operation: BulkOperation, tubeIds: string[]): Promise<BulkAccessResult> {
    const results: BulkAccessResult = {
      allowed: true,
      allowedTubes: [],
      deniedTubes: [],
      errors: []
    };

    if (!user.isAdmin() && tubeIds.length > 50) {
      return {
        allowed: false,
        allowedTubes: [],
        deniedTubes: tubeIds,
        errors: ['Bulk operations limited to 50 tubes for non-administrators']
      };
    }

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

    results.allowed = results.allowedTubes.length > 0;

    return results;
  }

  // RESEARCHER OPERATIONS

  async canManageResearchers(user: User): Promise<AccessResult> {
    if (!user.hasPermission('manage_researchers')) {
      return this.createDeniedResult('User does not have permission to manage researchers');
    }

    return this.createAllowedResult();
  }

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

  async canManageUsers(user: User): Promise<AccessResult> {
    if (!user.hasPermission('manage_users')) {
      return this.createDeniedResult('User does not have permission to manage users');
    }

    return this.createAllowedResult();
  }

  async canManageUser(user: User, targetUser: User): Promise<AccessResult> {
    const manageCheck = await this.canManageUsers(user);
    if (!manageCheck.allowed) {
      return manageCheck;
    }

    if (user.equals(targetUser)) {
      return this.createDeniedResult('Cannot manage your own user account');
    }

    if (user.isLabAdmin() && !user.isSystemAdmin()) {
      if (user.labId !== targetUser.labId) {
        return this.createDeniedResult('Lab administrators can only manage users within their own lab');
      }
      if (targetUser.isSystemAdmin()) {
        return this.createDeniedResult('Lab administrators cannot manage system admin accounts');
      }
    }

    if (targetUser.isLabAdmin() && !targetUser.isSystemAdmin() && targetUser.labId) {
      const labAdminCount = await this.userRepository.countByRoleInLab('lab_admin', targetUser.labId);
      if (labAdminCount <= 1) {
        return this.createDeniedResult('Cannot modify the last lab administrator account');
      }
    }

    return this.createAllowedResult();
  }

  // CONFIGURATION OPERATIONS

  async canModifyStorage(user: User): Promise<AccessResult> {
    if (!user.hasPermission('manage_configuration')) {
      return this.createDeniedResult('User does not have permission to modify configuration');
    }

    return this.createAllowedResult();
  }

  async canDeleteEquipment(user: User, equipmentType: 'tank' | 'rack' | 'box', equipmentId: string): Promise<AccessResult> {
    const configCheck = await this.canModifyStorage(user);
    if (!configCheck.allowed) {
      return configCheck;
    }

    let tubeCount = 0;

    try {
      if (equipmentType === 'tank') {
        tubeCount = await this.tubeRepository.countByTank(equipmentId, user.labId ?? '');
      }

      if (tubeCount > 0) {
        return this.createDeniedResult(`Cannot delete ${equipmentType} with ${tubeCount} tubes. Move or delete tubes first.`);
      }
    } catch (error) {
      return this.createDeniedResult('Unable to verify equipment usage');
    }

    return this.createAllowedResult();
  }

  // RESOURCE ASSIGNMENT OPERATIONS

  canAccessContainer(
    user: User,
    containerInfo: { rack?: ResourceWithOwnership; box?: ResourceWithOwnership }
  ): AccessResult {
    if (user.isAdmin()) {
      return this.createAllowedResult('Admin access');
    }

    if (!user.hasResearcherProfile()) {
      return this.createDeniedResult('Researcher profile required for tube operations');
    }

    const { rack, box } = containerInfo;

    // Box-level assignment takes precedence over rack
    if (box?.assignedUserId !== undefined && box.assignedUserId !== null) {
      if (box.assignedUserId !== user.id) {
        return this.createDeniedResult('This box is assigned to another user');
      }
      return this.createAllowedResult('Box owner');
    }

    if (box?.assignedUserId === null) {
      return this.createAllowedResult('Common space (box)');
    }

    // Box assignment undefined — inherit from rack
    if (rack?.assignedUserId !== undefined && rack.assignedUserId !== null) {
      if (rack.assignedUserId !== user.id) {
        return this.createDeniedResult('This rack is assigned to another user');
      }
      return this.createAllowedResult('Rack owner');
    }

    return this.createAllowedResult('Common space');
  }

  /**
   * Two-phase authorization for modify operations (edit/delete/copy/cut):
   * 1. Container ownership OR shared access to the tube
   * 2. Lock access (if locked): lock owner, shared user, or admin
   *
   * ADD operations require container access — shared access doesn't apply.
   */
  canAccessTubeForModification(
    user: User,
    tube: Tube,
    containerInfo: { rack?: ResourceWithOwnership; box?: ResourceWithOwnership }
  ): AccessResult {
    const containerAccess = this.canAccessContainer(user, containerInfo);
    const hasContainerAccess = containerAccess.allowed;
    const hasSharedAccess = tube.sharedWithUserIds.includes(user.id);

    if (!hasContainerAccess && !hasSharedAccess) {
      return containerAccess;
    }

    const lockAccess = this.canAccessLockedTube(user, tube);
    if (!lockAccess.allowed) {
      return lockAccess;
    }

    return this.createAllowedResult(hasContainerAccess ? containerAccess.reason : 'Shared access to tube');
  }

  canAssignResource(user: User): boolean {
    return user.isAdmin();
  }

  /**
   * Ownership cascade: explicit assignment → rack inheritance → common space.
   * Pass parentRack for boxes with undefined (inherited) assignment.
   */
  canEditResource(
    user: User,
    resource: ResourceWithOwnership,
    parentRack?: ResourceWithOwnership
  ): boolean {
    if (user.isAdmin()) {
      return true;
    }

    if (resource.assignedUserId === null) {
      return true;
    }

    if (resource.assignedUserId === user.id) {
      return true;
    }

    // Box with undefined assignment inherits from parent rack
    if (parentRack && resource.assignedUserId === undefined && parentRack.assignedUserId === user.id) {
      return true;
    }

    return false;
  }

  // ADMIN OPERATIONS

  async canAccessAdminFeatures(user: User): Promise<AccessResult> {
    if (!user.hasPermission('admin_settings')) {
      return this.createDeniedResult('User does not have administrative privileges');
    }

    return this.createAllowedResult();
  }

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

  async requireAdminAccess(user: User): Promise<void> {
    const result = await this.canAccessAdminFeatures(user);
    if (!result.allowed) {
      throw new PermissionError(result.reason, { userId: user.id });
    }
  }

  // REQUIRE METHODS

  requireCanCreateTube(user: User): void {
    this.requirePermission(user, 'create_tubes', 'create tubes');

    if (!user.isAdmin() && !user.hasResearcherProfile()) {
      throw new PermissionError('Researcher profile required for tube operations', {
        userId: user.id,
        role: user.roleString
      });
    }
  }

  requireCanViewTube(user: User, tube: Tube): void {
    this.requirePermission(user, 'view_tubes', 'view tubes', { tubeId: tube.id });
    this.requireTubeOwnership(user, tube, 'view');
  }

  requireCanViewTubes(user: User): void {
    this.requirePermission(user, 'view_tubes', 'view tubes');
  }

  requireCanEditTube(user: User, tube: Tube): void {
    this.requirePermission(user, 'edit_tubes', 'edit tubes', { tubeId: tube.id });
    this.requireTubeOwnership(user, tube, 'edit');
  }

  requireCanDeleteTube(user: User, tube: Tube): void {
    this.requirePermission(user, 'delete_tubes', 'delete tubes', { tubeId: tube.id });
    this.requireTubeOwnership(user, tube, 'delete');
  }

  requireCanBulkEditTubes(user: User): void {
    this.requirePermission(user, 'bulk_edit', 'perform bulk operations');
    if (!user.isAdmin()) {
      throw new PermissionError('Bulk operations require administrative privileges', {
        userId: user.id,
        role: user.roleString
      });
    }
  }

  requireCanManageUsers(user: User): void {
    if (!user.isAdmin()) {
      throw new PermissionError('User management requires administrative privileges', {
        userId: user.id,
        role: user.roleString,
        requiredRole: 'admin'
      });
    }
  }

  requireCanManageResearchers(user: User): void {
    this.requirePermission(user, 'manage_researchers', 'manage researchers');
  }

  // SHARED REQUIRE HELPERS

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

