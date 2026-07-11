/**
 * CQRS Query Base
 *
 * Base classes and contracts for read-only query operations.
 */

import { randomUUID } from 'crypto';

interface Query {
  readonly queryId: string;
  readonly createdAt: Date;
  readonly requestedBy?: string;
}

export abstract class BaseQuery implements Query {
  public readonly queryId: string;
  public readonly createdAt: Date;

  constructor(
    public readonly requestedBy?: string
  ) {
    this.queryId = randomUUID();
    this.createdAt = new Date();
  }
}

export interface QueryHandler<TQuery extends BaseQuery, TResult> {
  handle(query: TQuery): Promise<TResult>;
}
