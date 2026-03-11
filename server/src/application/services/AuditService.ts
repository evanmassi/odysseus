/**
 * Audit Logging Service
 *
 * Non-blocking audit log writes with immutable entries and structured JSON details.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { PaginatedResult, QueryOptions } from '@domain/types/repository';
import { logger } from '@infrastructure/logging/logger';

export interface LogActionParams {
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  labId?: string;
}

export class AuditService {
  constructor(private auditRepository: AuditRepository) {}

  async logAction(params: LogActionParams): Promise<void> {
    try {
      if (!params.userId || !params.username || !params.action || !params.entityType) {
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

  async getAuditLog(filters: AuditLogFilters = {}): Promise<PaginatedResult<AuditLogEntry>> {
    return await this.auditRepository.findAll(filters);
  }

  async getAuditLogForLab(filters: AuditLogFilters = {}, labId: string): Promise<PaginatedResult<AuditLogEntry>> {
    return await this.auditRepository.findAllForLab(filters, labId);
  }

  async getEntityHistory(entityId: string, entityType: string): Promise<AuditLogEntry[]> {
    return await this.auditRepository.findByEntityId(entityId, entityType);
  }

  async getUserActivity(userId: string, options?: QueryOptions): Promise<AuditLogEntry[]> {
    return await this.auditRepository.findByUserId(userId, options);
  }

  async getActionLog(action: string, options?: QueryOptions): Promise<AuditLogEntry[]> {
    return await this.auditRepository.findByAction(action, options);
  }

  async getStatistics(): Promise<{
    total: number;
    today: number;
    thisWeek: number;
  }> {
    const total = await this.auditRepository.count();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const today = await this.auditRepository.countInRange(todayStart, now);
    const thisWeek = await this.auditRepository.countInRange(weekStart, now);

    return {
      total,
      today,
      thisWeek,
    };
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
