import { DomainError } from './DomainError';

/**
 * Permission Error - Thrown when user lacks permission for an action
 * Maps to HTTP 403 Forbidden
 */
export class PermissionError extends DomainError {
  readonly code = 'PERMISSION_ERROR';
  readonly statusCode = 403;

  constructor(
    message: string,
    context?: Record<string, any>
  ) {
    super(message, context);
  }

  /**
   * Create permission error for a specific action
   */
  static forAction(action: string, userId?: string): PermissionError {
    return new PermissionError(
      `Permission denied for action: ${action}`,
      { action, userId }
    );
  }

  /**
   * Create permission error for admin-only action
   */
  static adminRequired(action: string, userId?: string): PermissionError {
    return new PermissionError(
      `Admin privileges required for: ${action}`,
      { action, userId, requiredRole: 'admin' }
    );
  }

  /**
   * Create permission error for resource access
   */
  static forResource(resourceType: string, resourceId: string, action: string, userId?: string): PermissionError {
    return new PermissionError(
      `Permission denied to ${action} ${resourceType}`,
      { resourceType, resourceId, action, userId }
    );
  }

  /**
   * Create permission error for tube operations
   */
  static tubeOperation(operation: string, tubeId: string, userId?: string): PermissionError {
    return PermissionError.forResource('tube', tubeId, operation, userId);
  }

  /**
   * Create permission error for user management
   */
  static userManagement(operation: string, targetUserId: string, userId?: string): PermissionError {
    return PermissionError.forResource('user', targetUserId, operation, userId);
  }

  /**
   * Create permission error for configuration management
   */
  static configurationManagement(operation: string, userId?: string): PermissionError {
    return PermissionError.forAction(`manage configuration: ${operation}`, userId);
  }
}
