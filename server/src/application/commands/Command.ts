/**
 * Command Base Classes and Interfaces
 * 
 * CQRS Command pattern implementation for handling write operations.
 * Commands represent user intent and encapsulate all data needed to perform an operation.
 */

import { randomUUID } from 'crypto';

export interface Command {
  /**
   * Unique identifier for this command instance.
   */
  readonly commandId: string;

  /**
   * Timestamp when the command was created.
   */
  readonly createdAt: Date;

  /**
   * The user who initiated this command.
   */
  readonly initiatedBy: string;
}

export abstract class BaseCommand implements Command {
  public readonly commandId: string;
  public readonly createdAt: Date;

  constructor(
    public readonly initiatedBy: string
  ) {
    this.commandId = randomUUID();
    this.createdAt = new Date();
  }
}

/**
 * Command Handler Interface
 * 
 * Defines the contract for command handlers in the CQRS pattern.
 */
export interface CommandHandler<TCommand extends BaseCommand, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}

/**
 * Command Result
 * 
 * Standard result wrapper for command operations.
 */
export class CommandResult<T = void> {
  constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: string,
    public readonly validationErrors?: Record<string, string[]>
  ) {}

  static success<T>(data?: T): CommandResult<T> {
    return new CommandResult<T>(true, data);
  }

  static failure<T>(error: string, validationErrors?: Record<string, string[]>): CommandResult<T> {
    return new CommandResult<T>(false, undefined, error, validationErrors);
  }

  static validationFailure<T>(validationErrors: Record<string, string[]>): CommandResult<T> {
    return new CommandResult<T>(false, undefined, 'Validation failed', validationErrors);
  }
}
