/**
 * Audit Logging Service
 *
 * Non-blocking audit log writes with immutable entries and structured JSON details.
 */

import { v4 as uuidv4 } from 'uuid';

import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { PaginatedResult } from '@domain/types/repository';
import { logger } from '@infrastructure/logging/logger';

import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';

export interface LogActionParams {
  userId?: string;
  username: string;
  action: string;
  entityType: string;
  entityId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- audit details carry arbitrary metadata from any domain event
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  labId?: string;
}

export class AuditService {
  constructor(private auditRepository: AuditRepository) {}

  async logAction(params: LogActionParams): Promise<void> {
    try {
      if (!params.username || !params.action || !params.entityType) {
        throw new Error('Missing required audit log fields');
      }

      await this.auditRepository.save(this.buildEntry(params));

      logger.debug('Audit action logged', {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
      });
    } catch (error) {
      // Audit failures must not break main operations
      logger.error('Failed to log audit action', {
        error: error instanceof Error ? error.message : String(error),
        userId: params.userId,
        action: params.action,
      });
    }
  }

  async logActions(actions: LogActionParams[]): Promise<void> {
    try {
      if (actions.length === 0) return;

      await this.auditRepository.saveMany(actions.map(params => this.buildEntry(params)));

      logger.debug('Bulk audit actions logged', {
        count: actions.length,
      });
    } catch (error) {
      // Audit failures must not break main operations
      logger.error('Failed to log bulk audit actions', {
        error: error instanceof Error ? error.message : String(error),
        count: actions.length,
      });
    }
  }

  async getAuditLogForLab(filters: AuditLogFilters = {}, labId: string): Promise<PaginatedResult<AuditLogEntry>> {
    return await this.auditRepository.findAllForLab(filters, labId);
  }

  private buildEntry(params: LogActionParams): AuditLogEntry {
    return {
      id: uuidv4(),
      userId: params.userId,
      username: params.username,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: JSON.stringify(params.details),
      timestamp: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      labId: params.labId,
    };
  }
}
