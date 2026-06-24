/**
 * Audit Log Viewer
 *
 * Paginated audit log table with filtering and archive search
 */
import { useState, useEffect, useCallback, createElement } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import {
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Archive,
  TestTubeDiagonal,
  UserRound,
  Icon,
  Rows3,
  Box,
  Dna,
  Microscope,
} from 'lucide-react';

import { auditService } from '@domains/admin/services/AuditService';
import { labService } from '@domains/admin/services/LabService';
import { formatAuditDetails } from '@domains/admin/utils/auditLogFormatters';
import { logger } from '@infra/logger';
import { Button, Table, Tooltip } from '@shared/ui';

import { AuditLogFilterPanel, type AuditFilterState } from './AuditLogFilterPanel';

import type { Pagination } from '@domains/admin/types/auditTypes';
import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { TableColumn } from '@shared/ui';

const ACTION_LABEL_OVERRIDES: Record<string, string> = {
  user_logged_in: 'Login',
  user_logged_out: 'Logout',
  user_linked_to_researcher: 'Linked',
  user_unlinked_from_researcher: 'Unlinked',
  user_password_changed: 'Updated',
  user_role_changed: 'Updated',
  tube_bulk_updated: 'Bulk Updated',
  user_deactivated: 'Deactivated',
  user_suspended: 'Suspended',
  user_reactivated: 'Reactivated',
  user_rejected: 'Rejected',
  invite_code_created: 'Created',
  invite_code_used: 'Used',
  researcher_approved: 'Approved',
  lab_created: 'Created',
};

// Full class names so Tailwind's content scanner can detect them
const BADGE_CLASS_OVERRIDES: Record<string, string> = {
  invite_code_created: 'badge-audit-action-created',
  invite_code_used: 'badge-audit-action-linked',
  user_password_changed: 'badge-audit-action-updated',
  user_role_changed: 'badge-audit-action-updated',
  tube_bulk_updated: 'badge-audit-action-updated',
  user_logged_in: 'badge-audit-action-login',
  user_logged_out: 'badge-audit-action-logout',
};

const SUFFIX_BADGE_MAP: Record<string, string> = {
  created: 'badge-audit-action-created',
  approved: 'badge-audit-action-created',
  reactivated: 'badge-audit-action-created',
  unlocked: 'badge-audit-action-created',
  updated: 'badge-audit-action-updated',
  moved: 'badge-audit-action-moved',
  reassigned: 'badge-audit-action-moved',
  locked: 'badge-audit-action-moved',
  deleted: 'badge-audit-action-deleted',
  deactivated: 'badge-audit-action-deleted',
  suspended: 'badge-audit-action-deleted',
  rejected: 'badge-audit-action-deleted',
  assigned: 'badge-audit-action-linked',
  shared: 'badge-audit-action-linked',
  linked: 'badge-audit-action-linked',
  unassigned: 'badge-audit-action-unlinked',
  unlinked: 'badge-audit-action-unlinked',
  revoked: 'badge-audit-action-unlinked',
};

interface AuditLogViewerProps {
  initialFilters?: Partial<AuditLogFilters>;
  onFiltersChange?: (filters: AuditLogFilters) => void;
  labId?: string;
  readOnly?: boolean;
  hideHeader?: boolean;
}

export function AuditLogViewer({
  initialFilters = {},
  onFiltersChange,
  labId,
  readOnly,
  hideHeader = false,
}: AuditLogViewerProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 50,
    offset: 0,
    ...initialFilters,
  });

  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState<AuditFilterState>({});
  const [includeArchive, setIncludeArchive] = useState(false);

  const loadAuditLog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = labId
        ? await labService.getLabAuditLog(labId, filters, includeArchive)
        : await auditService.searchAuditLogs(filters, includeArchive);
      setEntries(result.entries);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
      logger.error('Failed to load audit log', { err });
    } finally {
      setLoading(false);
    }
  }, [filters, includeArchive, labId]);

  useEffect(() => {
    void loadAuditLog();
  }, [loadAuditLog]);

  const handleFilterChange = useCallback(
    (newFilterState: AuditFilterState) => {
      setFilterState(newFilterState);

      const newFilters: AuditLogFilters = {
        limit: filters.limit,
        offset: 0,
        username: newFilterState.username,
        action: newFilterState.actions?.[0], // Backend only supports single action currently
        entityType: newFilterState.entityTypes?.[0], // Backend only supports single entity type currently
        dateFrom: newFilterState.dateFrom,
        dateTo: newFilterState.dateTo,
      };
      setFilters(newFilters);
      onFiltersChange?.(newFilters);
    },
    [filters.limit, onFiltersChange]
  );

  const clearFilters = useCallback(() => {
    const resetFilters = {
      limit: 50,
      offset: 0,
    };
    setFilters(resetFilters);
    setFilterState({});
    onFiltersChange?.(resetFilters);
  }, [onFiltersChange]);

  // Pagination
  const goToNextPage = () => {
    if (pagination.hasMore) {
      setFilters(prev => ({ ...prev, offset: (prev.offset ?? 0) + (prev.limit ?? 50) }));
    }
  };

  const goToPreviousPage = () => {
    if ((filters.offset ?? 0) > 0) {
      setFilters(prev => ({
        ...prev,
        offset: Math.max(0, (prev.offset ?? 0) - (prev.limit ?? 50)),
      }));
    }
  };

  const formatAuditDate = (timestamp: Date) =>
    timestamp.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const formatAuditTime = (timestamp: Date) =>
    timestamp.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

  const formatAction = (action: string) => {
    const override = ACTION_LABEL_OVERRIDES[action];
    if (override) return override;

    const parts = action.split('_');
    if (parts.length > 1) {
      return parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
    }
    return action.charAt(0).toUpperCase() + action.slice(1);
  };

  const getActionBadgeClass = (action: string) => {
    const override = BADGE_CLASS_OVERRIDES[action];
    if (override) return override;

    const suffix = action.split('_').pop() ?? '';
    return SUFFIX_BADGE_MAP[suffix] ?? 'badge-audit-action-default';
  };

  const ENTITY_TYPE_LABELS: Record<string, string> = {
    equipment_item: 'Equipment',
  };

  const formatEntityType = (entityType: string) => {
    return (
      ENTITY_TYPE_LABELS[entityType] ?? entityType.charAt(0).toUpperCase() + entityType.slice(1)
    );
  };

  const getEntityBadgeClass = (entityType: string) => {
    if (entityType === 'tube') return 'badge-audit-entity-tube';
    if (entityType === 'user') return 'badge-audit-entity-user';
    if (entityType === 'researcher') return 'badge-audit-entity-researcher';
    if (entityType === 'tank') return 'badge-audit-entity-tank';
    if (entityType === 'rack') return 'badge-audit-entity-rack';
    if (entityType === 'box') return 'badge-audit-entity-box';
    if (entityType === 'lab') return 'badge-audit-entity-lab';
    if (entityType === 'configuration') return 'badge-audit-entity-configuration';
    if (entityType === 'equipment_item') return 'badge-audit-entity-equipment';
    return 'badge-audit-entity-default';
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'tube':
        return TestTubeDiagonal;
      case 'user':
        return UserRound;
      case 'researcher':
        return 'researcher'; // Custom component
      case 'tank':
        return 'tank'; // Custom from @lucide/lab
      case 'rack':
        return Rows3;
      case 'box':
        return Box;
      case 'equipment_item':
        return Microscope;
      default:
        return null;
    }
  };

  const hasActiveFilters = Object.keys(filterState).some(
    key => key !== 'datePreset' && filterState[key as keyof AuditFilterState]
  );

  // Define table columns - use TableRow base type, cast in render functions
  const auditLogColumns: TableColumn<AuditLogEntry>[] = [
    {
      id: 'timestamp',
      header: 'Timestamp',
      width: '8rem',
      render: (_, entry) => {
        return (
          <div className="flex flex-col leading-tight">
            <span className="text-data-sm text-secondary-foreground whitespace-nowrap">
              {formatAuditDate(entry.timestamp)}
            </span>
            <span className="text-label-xs text-muted-foreground whitespace-nowrap">
              {formatAuditTime(entry.timestamp)}
            </span>
          </div>
        );
      },
    },
    {
      id: 'username',
      header: 'User',
      width: '6rem',
      render: (_, entry) => {
        return (
          <span className="font-medium text-card-foreground whitespace-nowrap">
            {entry.username}
          </span>
        );
      },
    },
    {
      id: 'action',
      header: 'Action',
      width: '6rem',
      render: (_, entry) => {
        return (
          <span className={`badge-audit ${getActionBadgeClass(entry.action)}`}>
            {formatAction(entry.action)}
          </span>
        );
      },
    },
    {
      id: 'entityType',
      header: 'Item',
      width: '7rem',
      render: (_, entry) => {
        if (!entry.entityType) {
          return <span className="text-muted-foreground text-data">-</span>;
        }
        const icon = getEntityIcon(entry.entityType);
        return (
          <span className={`badge-audit ${getEntityBadgeClass(entry.entityType)}`}>
            {icon === 'researcher' ? (
              <Dna size={12} />
            ) : icon === 'tank' ? (
              <Icon iconNode={refrigeratorFreezer} size={12} />
            ) : icon && typeof icon !== 'string' ? (
              createElement(icon, { size: 12 })
            ) : null}
            {formatEntityType(entry.entityType)}
          </span>
        );
      },
    },
    {
      id: 'details',
      header: 'Details',
      width: '100%',
      render: (_, entry) => {
        const { text, fullText } = formatAuditDetails(entry);
        const tooltipContent = fullText ?? text;
        return (
          <Tooltip content={tooltipContent} side="bottom" align="start" disabled={text === '-'}>
            <div className="w-full truncate text-secondary-foreground">{text}</div>
          </Tooltip>
        );
      },
    },
  ];

  const currentPage = Math.floor((filters.offset ?? 0) / (filters.limit ?? 50)) + 1;
  const totalPages = Math.ceil((pagination?.total ?? 0) / (filters.limit ?? 50));

  return (
    <div className="space-y-3">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!hideHeader && (
            <h4 className="text-body font-semibold text-card-foreground">Audit Log</h4>
          )}
          <span className="text-caption text-muted-foreground">
            ({(pagination?.total || 0).toLocaleString()} total entries)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <Tooltip
              content={
                includeArchive
                  ? 'Currently showing active + archived logs'
                  : 'Currently showing active logs only'
              }
              side="bottom"
            >
              <Button
                variant={includeArchive ? 'primary' : 'secondary'}
                size="xs"
                onClick={() => setIncludeArchive(!includeArchive)}
                leftIcon={<Archive size={12} />}
              >
                {includeArchive ? 'With Archive' : 'Active Only'}
              </Button>
            </Tooltip>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="xs"
              onClick={clearFilters}
              leftIcon={<X className="w-3 h-3" />}
            >
              Clear Filters
            </Button>
          )}

          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            size="xs"
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<SlidersHorizontal size={12} />}
          >
            Filters
          </Button>

          <Button
            variant="secondary"
            size="xs"
            onClick={loadAuditLog}
            leftIcon={<RefreshCw size={12} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <AuditLogFilterPanel
          filters={filterState}
          onChange={handleFilterChange}
          onClear={clearFilters}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-body-sm text-muted-foreground">
          Loading audit log...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-muted border border-danger-border text-danger-text px-3 py-2 rounded text-body-sm">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      {!loading && !error && entries && entries.length > 0 && (
        <Table
          columns={auditLogColumns}
          data={entries}
          hoverable
          className="text-data table-fixed"
          aria-label="Audit log entries"
        />
      )}

      {/* Empty State */}
      {!loading && !error && (!entries || entries.length === 0) && (
        <div className="text-center py-8 text-body-sm text-muted-foreground">
          No audit log entries found.
        </div>
      )}

      {/* Pagination */}
      {!loading && entries && entries.length > 0 && (
        <div className="flex items-center justify-between text-caption text-secondary-foreground">
          <div>
            Showing {(filters.offset ?? 0) + 1} -{' '}
            {Math.min((filters.offset ?? 0) + (entries?.length ?? 0), pagination?.total ?? 0)} of{' '}
            {(pagination?.total ?? 0).toLocaleString()}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              onClick={goToPreviousPage}
              disabled={(filters.offset ?? 0) === 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="px-2">
              Page {currentPage} of {totalPages || 1}
            </span>

            <Button
              variant="ghost"
              size="xs"
              iconOnly
              onClick={goToNextPage}
              disabled={!pagination?.hasMore}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
