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
      email
        ? `Email '${email}' is already in use`
        : 'Email is already in use',
      email ? { email } : {}
    );
  }
}

export class UserNotFoundError extends DomainError {
  readonly code = API_ERROR_CODES.RESOURCE_NOT_FOUND;
  readonly statusCode = 404;

  constructor(identifier: string) {
    super(`User not found: ${identifier}`, { identifier });
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = API_ERROR_CODES.INVALID_CREDENTIALS;
  readonly statusCode = 401;

  constructor(message: string = 'Invalid credentials') {
    super(message);
  }
}

export class UserInactiveError extends DomainError {
  readonly code = API_ERROR_CODES.FORBIDDEN;
  readonly statusCode = 403;

  constructor(username: string) {
    super(`User '${username}' is inactive`, { username });
  }
}

export class SessionExpiredError extends DomainError {
  readonly code = API_ERROR_CODES.SESSION_EXPIRED;
  readonly statusCode = 401;

  constructor() {
    super('Session has expired');
  }
}

export class TooManyLoginAttemptsError extends DomainError {
  readonly code = API_ERROR_CODES.RATE_LIMITED;
  readonly statusCode = 429;

  constructor(lockoutDuration: number) {
    super(`Too many failed login attempts. Account locked for ${lockoutDuration} minutes.`, { lockoutDuration });
  }
}
