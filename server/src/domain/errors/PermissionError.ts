/**
 * Permission Error
 *
 * User lacks permission for the requested action. Maps to HTTP 403.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import { DomainError } from './DomainError';
export class PermissionError extends DomainError {
  readonly code = API_ERROR_CODES.FORBIDDEN;
  readonly statusCode = 403;

  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }

  static forAction(action: string, userId?: string): PermissionError {
    return new PermissionError(
      `Permission denied for action: ${action}`,
      { action, userId }
    );
  }

  static configurationManagement(operation: string, userId?: string): PermissionError {
    return PermissionError.forAction(`manage configuration: ${operation}`, userId);
  }
}
