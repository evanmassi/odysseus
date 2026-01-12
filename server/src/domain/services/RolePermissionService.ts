import { Permission, PermissionKey } from '@domain/valueObjects/Permission';
import { ValidationError } from '@domain/errors/ValidationError';

/**
 * Role Permission Service
 *
 * Centralized service for managing role-based permissions.
 * Implements RBAC (Role-Based Access Control) for the application.
 *
 * Responsibilities:
 * - Define role-permission mappings
 * - Validate permission assignments
 * - Provide permission checking logic
 * - Support permission auditing and reporting
 */
export class RolePermissionService {
  
  // ROLE DEFINITIONS
  
  /**
   * Available user roles in the system
   */
  static readonly ROLES = ['admin', 'user'] as const;
  
  // ROLE-PERMISSION MATRIX
  
  /**
   * Complete role-permission mapping
   */
  private static readonly ROLE_PERMISSION_MATRIX: Record<UserRole, readonly Permission[]> = {
    /**
     * Administrator Role
     * - Full system access
     * - All permissions granted
     */
    admin: Permission.ADMIN_PERMISSIONS,
    
    /**
     * Regular User Role  
     * - Basic tube management
     * - Limited system access
     */
    user: Permission.USER_PERMISSIONS,
  } as const;

  // PERMISSION CHECKING

  /**
   * Check if a role has a specific permission
   * 
   * @param role - User role to check
   * @param permission - Permission to validate
   * @returns true if role has permission, false otherwise
   * 
   * @example
   * const hasPermission = RolePermissionService.hasPermission('admin', Permission.MANAGE_USERS);
   */
  static hasPermission(role: UserRole, permission: Permission): boolean {
    try {
      this.validateRole(role);
      const rolePermissions = this.getPermissionsForRole(role);
      return rolePermissions.some(p => p.equals(permission));
    } catch {
      // Invalid role or permission - deny access
      return false;
    }
  }

  /**
   * Check if a role has permission by key (string-based lookup)
   * 
   * @param role - User role to check
   * @param permissionKey - Permission key string
   * @returns true if role has permission, false otherwise
   */
  static hasPermissionByKey(role: UserRole, permissionKey: string): boolean {
    const permission = Permission.fromKey(permissionKey);
    if (!permission) {
      // Unknown permission key - deny access
      return false;
    }

    return this.hasPermission(role, permission);
  }

  /**
   * Check if role has any of the specified permissions
   * 
   * @param role - User role to check
   * @param permissions - Array of permissions to check
   * @returns true if role has at least one permission
   */
  static hasAnyPermission(role: UserRole, permissions: readonly Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(role, permission));
  }

  /**
   * Check if role has all specified permissions
   * 
   * @param role - User role to check  
   * @param permissions - Array of permissions to check
   * @returns true if role has all permissions
   */
  static hasAllPermissions(role: UserRole, permissions: readonly Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(role, permission));
  }

  // ROLE MANAGEMENT

  /**
   * Get all permissions for a specific role
   * 
   * @param role - Role to get permissions for
   * @returns Array of permissions for the role
   */
  static getPermissionsForRole(role: UserRole): readonly Permission[] {
    this.validateRole(role);
    return this.ROLE_PERMISSION_MATRIX[role];
  }

  /**
   * Get all permission keys for a specific role
   * 
   * @param role - Role to get permission keys for
   * @returns Array of permission key strings
   */
  static getPermissionKeysForRole(role: UserRole): readonly string[] {
    return this.getPermissionsForRole(role).map(permission => permission.key);
  }

  /**
   * Check if a role exists in the system
   * 
   * @param role - Role to validate
   * @returns true if role exists
   */
  static isValidRole(role: string): role is UserRole {
    return this.ROLES.includes(role as UserRole);
  }

  /**
   * Get all available roles
   * 
   * @returns Array of all system roles
   */
  static getAllRoles(): readonly UserRole[] {
    return this.ROLES;
  }

  // PERMISSION ANALYSIS

  /**
   * Get roles that have a specific permission
   * 
   * @param permission - Permission to check
   * @returns Array of roles with the permission
   */
  static getRolesWithPermission(permission: Permission): readonly UserRole[] {
    return this.ROLES.filter(role => this.hasPermission(role, permission));
  }

  /**
   * Compare permissions between two roles
   * 
   * @param role1 - First role
   * @param role2 - Second role
   * @returns Object with permission comparison results
   */
  static compareRolePermissions(role1: UserRole, role2: UserRole): RolePermissionComparison {
    const permissions1 = new Set(this.getPermissionKeysForRole(role1));
    const permissions2 = new Set(this.getPermissionKeysForRole(role2));
    
    const common = Array.from(permissions1).filter(p => permissions2.has(p));
    const onlyInRole1 = Array.from(permissions1).filter(p => !permissions2.has(p));
    const onlyInRole2 = Array.from(permissions2).filter(p => !permissions1.has(p));
    
    return {
      role1,
      role2,
      commonPermissions: common,
      onlyInRole1,
      onlyInRole2,
      role1HasMorePermissions: permissions1.size > permissions2.size,
      role2HasMorePermissions: permissions2.size > permissions1.size,
      identicalPermissions: permissions1.size === permissions2.size && common.length === permissions1.size
    };
  }

  // VALIDATION

  /**
   * Validate that a role exists
   * 
   * @param role - Role to validate
   * @throws ValidationError if role is invalid
   */
  private static validateRole(role: UserRole): void {
    if (!this.isValidRole(role)) {
      throw new ValidationError(`Invalid role: ${role}. Valid roles: ${this.ROLES.join(', ')}`);
    }
  }

  // AUDITING & REPORTING

  /**
   * Generate complete role-permission audit report
   * 
   * @returns Comprehensive permission audit data
   */
  static generatePermissionAudit(): PermissionAuditReport {
    const auditData: PermissionAuditReport = {
      totalRoles: this.ROLES.length,
      totalPermissions: Permission.ALL_PERMISSIONS.length,
      rolePermissionMatrix: {} as Record<UserRole, readonly string[]>,
      permissionUsage: {},
      categories: Permission.getAllCategories(),
      generatedAt: new Date().toISOString()
    };

    // Build role-permission matrix for audit
    this.ROLES.forEach(role => {
      const permissions = this.getPermissionKeysForRole(role);
      auditData.rolePermissionMatrix[role] = permissions;
    });

    // Build permission usage statistics
    Permission.ALL_PERMISSIONS.forEach(permission => {
      const rolesWithPermission = this.getRolesWithPermission(permission);
      auditData.permissionUsage[permission.key] = {
        description: permission.description,
        category: permission.category,
        assignedToRoles: rolesWithPermission.slice(),
        totalRolesAssigned: rolesWithPermission.length
      };
    });

    return auditData;
  }
}

// Type Definitions

/**
 * Valid user roles in the system
 */
export type UserRole = typeof RolePermissionService.ROLES[number];

/**
 * Role permission comparison result
 */
export interface RolePermissionComparison {
  role1: UserRole;
  role2: UserRole;
  commonPermissions: string[];
  onlyInRole1: string[];
  onlyInRole2: string[];
  role1HasMorePermissions: boolean;
  role2HasMorePermissions: boolean;
  identicalPermissions: boolean;
}

/**
 * Permission audit report structure
 */
export interface PermissionAuditReport {
  totalRoles: number;
  totalPermissions: number;
  rolePermissionMatrix: Record<UserRole, readonly string[]>;
  permissionUsage: Record<string, {
    description: string;
    category: string;
    assignedToRoles: UserRole[];
    totalRolesAssigned: number;
  }>;
  categories: readonly string[];
  generatedAt: string;
}
