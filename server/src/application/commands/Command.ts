/**
 * Command Pattern Foundation
 *
 * CQRS command base class and handler contract for write operations.
 */

export abstract class BaseCommand {
  constructor(public readonly initiatedBy: string) {}
}

export interface CommandHandler<TCommand extends BaseCommand, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}
