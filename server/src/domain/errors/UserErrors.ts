/**
 * User Domain Errors
 *
 * Domain-specific errors for user operations.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import { DomainError } from './DomainError';

export class UserAlreadyExistsError extends DomainError {
  readonly code = API_ERROR_CODES.RESOURCE_ALREADY_EXISTS;
  readonly statusCode = 409;

  constructor(username: string) {
    super(`User with username '${username}' already exists`, { username });
  }
}

export class EmailAlreadyExistsError extends DomainError {
  readonly code = API_ERROR_CODES.RESOURCE_ALREADY_EXISTS;
  readonly statusCode = 409;

  constructor(email?: string) {
    super(
      email ? `Email '${email}' is already in use` : 'Email is already in use',
      email ? { email } : {}
    );
  }
}

export class UserNotFoundError extends DomainError {
  readonly code = API_ERROR_CODES.RESOURCE_NOT_FOUND;
  readonly statusCode = 404;

  constructor(identifier: string) {
    super('This user could not be found.', { identifier });
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = API_ERROR_CODES.INVALID_CREDENTIALS;
  readonly statusCode = 401;

  constructor(message: string = 'Invalid credentials') {
    super(message);
  }
}
