/**
 * User Domain Errors
 * 
 * Domain-specific errors for user operations.
 */

import { DomainError } from './DomainError';

export class UserAlreadyExistsError extends DomainError {
  readonly code = 'USER_ALREADY_EXISTS';
  readonly statusCode = 409;

  constructor(username: string) {
    super(`User with username '${username}' already exists`, { username });
  }
}

export class EmailAlreadyExistsError extends DomainError {
  readonly code = 'EMAIL_ALREADY_EXISTS';
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
  readonly code = 'USER_NOT_FOUND';
  readonly statusCode = 404;

  constructor(identifier: string) {
    super(`User not found: ${identifier}`, { identifier });
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly statusCode = 401;

  constructor(message: string = 'Invalid credentials') {
    super(message);
  }
}

export class UserInactiveError extends DomainError {
  readonly code = 'USER_INACTIVE';
  readonly statusCode = 403;

  constructor(username: string) {
    super(`User '${username}' is inactive`, { username });
  }
}

export class PasswordRequirementError extends DomainError {
  readonly code = 'PASSWORD_REQUIREMENTS_NOT_MET';
  readonly statusCode = 400;

  constructor(requirements: string[]) {
    const message = `Password does not meet requirements: ${requirements.join(', ')}`;
    super(message, { requirements });
  }
}

export class SessionExpiredError extends DomainError {
  readonly code = 'SESSION_EXPIRED';
  readonly statusCode = 401;

  constructor() {
    super('Session has expired');
  }
}

export class TooManyLoginAttemptsError extends DomainError {
  readonly code = 'TOO_MANY_LOGIN_ATTEMPTS';
  readonly statusCode = 429;

  constructor(lockoutDuration: number) {
    super(`Too many failed login attempts. Account locked for ${lockoutDuration} minutes.`, { lockoutDuration });
  }
}
