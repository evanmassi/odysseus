import { v4 as uuidv4 } from 'uuid';
import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { PaginatedResult, QueryOptions } from '@domain/types/repository';
import { logger } from '@utils/logger';

/**
 * Parameters for logging an audit action
 */
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

/**
 * Audit Service
 *
 * Application layer service for audit logging operations.
 * Handles validation, orchestration, and error handling.
 *
 * Design principles:
 * - Immutable audit logs (no update operations)
 * - Non-blocking audit logging (failures don't break main operations)
 * - Structured details (JSON objects for rich data)
 * - Retention policy enforcement
 */
export class AuditService {
  constructor(private auditRepository: AuditRepository) {}

  /**
   * Log an audit action
   *
   * Creates and persists an audit log entry for a user action.
   *
   * @param params - Action details (user, action type, entity, metadata)
   * @throws Error if validation fails or database operation fails
   */
  async logAction(params: LogActionParams): Promise<void> {
    try {
      // Validate required fields
      if (!params.userId || !params.username || !params.action || !params.entityType) {
        throw new Error('Missing required audit log fields');
      }

      const entry: AuditLogEntry & { labId?: string } = {
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

      // Persist to database
      await this.auditRepository.save(entry);

      logger.debug('Audit action logged', {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
      });
    } catch (error) {
      // Log error but don't throw - audit logging failures should not break main operations
      logger.error('Failed to log audit action', {
        error: error instanceof Error ? error.message : String(error),
        userId: params.userId,
        action: params.action,
      });
    }
  }

  /**
   * Log multiple audit actions in a single transaction
   *
   * Efficient bulk logging for batch operations.
   *
   * @param actions - Array of action parameters
   */
  async logActions(actions: LogActionParams[]): Promise<void> {
    try {
      if (actions.length === 0) return;

      const entries: Array<AuditLogEntry & { labId?: string }> = actions.map(params => ({
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
      }));

      await this.auditRepository.saveMany(entries);

      logger.debug('Bulk audit actions logged', {
        count: actions.length,
      });
    } catch (error) {
      logger.error('Failed to log bulk audit actions', {
        error: error instanceof Error ? error.message : String(error),
        count: actions.length,
      });
    }
  }

  /**
   * Get full audit log with advanced filtering and pagination
   *
   * @param filters - Filter criteria (user, action, entity type, date range)
   * @returns Paginated audit log entries
   */
  async getAuditLog(filters: AuditLogFilters = {}): Promise<PaginatedResult<AuditLogEntry>> {
    return await this.auditRepository.findAll(filters);
  }

  /**
   * Get complete history for a specific entity
   *
   * Returns all audit entries for an entity (tube, user, etc.)
   * in chronological order.
   *
   * @param entityId - Entity ID
   * @param entityType - Entity type (tube, user, config, etc.)
   * @returns Array of audit entries (newest first)
   */
  async getEntityHistory(entityId: string, entityType: string): Promise<AuditLogEntry[]> {
    return await this.auditRepository.findByEntityId(entityId, entityType);
  }

  /**
   * Get user's activity log
   *
   * Returns all actions performed by a specific user.
   *
   * @param userId - User ID
   * @param options - Optional query parameters (limit, offset, date range)
   * @returns Array of audit entries
   */
  async getUserActivity(userId: string, options?: QueryOptions): Promise<AuditLogEntry[]> {
    return await this.auditRepository.findByUserId(userId, options);
  }

  /**
   * Get entries for a specific action type
   *
   * Useful for security monitoring (e.g., all failed logins).
   *
   * @param action - Action type (login_failed, tube_deleted, etc.)
   * @param options - Optional query parameters
   * @returns Array of audit entries
   */
  async getActionLog(action: string, options?: QueryOptions): Promise<AuditLogEntry[]> {
    return await this.auditRepository.findByAction(action, options);
  }

  /**
   * Get audit statistics
   *
   * Returns counts and metrics for admin dashboard.
   */
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

  /**
   * Clean old audit entries based on retention policy
   *
   * Should be run periodically (e.g., daily cron job).
   *
   * @param retentionDays - Number of days to retain audit logs
   * @returns Number of entries deleted
   */
  async cleanOldEntries(retentionDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await this.auditRepository.deleteOlderThan(cutoffDate);

      logger.info('Audit log cleanup completed', {
        retentionDays,
        deletedCount,
        cutoffDate: cutoffDate.toISOString(),
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to clean old audit entries', {
        error: error instanceof Error ? error.message : String(error),
        retentionDays,
      });
      throw error;
    }
  }
}
