/**
 * Audit Log Viewer
 *
 * Paginated audit log table with filtering and archive search
 */
import React, { useState, useEffect, useCallback } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import {
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Archive,
  TestTube,
  UserRound,
  Icon,
  Rows3,
  Box,
} from 'lucide-react';

import { adminService } from '@domains/admin/services/AdminService';
import { formatAuditDetails } from '@domains/admin/utils/auditLogFormatters';
import { logger } from '@shared/infrastructure/logger';
import { Button, Table } from '@shared/ui';
import { ResearcherIcon } from '@shared/ui/components/icons';
import { Tooltip } from '@shared/ui/primitives/tooltip';

import { AuditLogFilterPanel, type AuditFilterState } from './AuditLogFilterPanel';

import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { TableColumn, TableRow } from '@shared/ui';

interface AuditLogViewerProps {
  initialFilters?: Partial<AuditLogFilters>;
  onFiltersChange?: (filters: AuditLogFilters) => void;
}

export function AuditLogViewer({ initialFilters = {}, onFiltersChange }: AuditLogViewerProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 50,
    offset: 0,
    ...initialFilters,
  });

  const [pagination, setPagination] = useState({
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
      const result = await adminService.searchAuditLogs(filters, includeArchive);
      setEntries(result.entries);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
      logger.error('Failed to load audit log', { err });
    } finally {
      setLoading(false);
    }
  }, [filters, includeArchive]);

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

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    // Special cases for clearer display
    if (action === 'user_logged_in') return 'Login';
    if (action === 'user_logged_out') return 'Logout';
    if (action === 'user_linked_to_researcher') return 'Linked';
    if (action === 'user_unlinked_from_researcher') return 'Unlinked';
    if (action === 'user_password_changed') return 'Updated';
    if (action === 'user_role_changed') return 'Updated';
    if (action === 'tube_bulk_updated') return 'Bulk Updated';

    // Remove entity type prefix and capitalize (e.g., "tube_created" → "Created")
    const parts = action.split('_');
    if (parts.length > 1) {
      // Take the action part (after entity type)
      return parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
    }
    return action.charAt(0).toUpperCase() + action.slice(1);
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('created')) return 'badge-action-created';
    if (action.includes('updated')) return 'badge-action-updated';
    if (action.includes('password_changed')) return 'badge-action-updated';
    if (action.includes('role_changed')) return 'badge-action-updated';
    if (action.includes('moved')) return 'badge-action-moved';
    if (action.includes('deleted')) return 'badge-action-deleted';
    if (action.includes('deactivated')) return 'badge-action-deleted';
    if (action.includes('unlinked')) return 'badge-action-unlinked';
    if (action.includes('logged_in')) return 'badge-action-login';
    if (action.includes('logged_out')) return 'badge-action-logout';
    if (action.includes('linked')) return 'badge-action-linked';
    if (action.includes('reactivated')) return 'badge-action-created';
    if (action.includes('approved')) return 'badge-action-created';
    if (action.includes('assigned')) return 'badge-action-linked';
    if (action.includes('unassigned')) return 'badge-action-unlinked';
    if (action.includes('reassigned')) return 'badge-action-moved';
    if (action.includes('locked')) return 'badge-action-logout';
    if (action.includes('unlocked')) return 'badge-action-login';
    if (action.includes('shared')) return 'badge-action-linked';
    if (action.includes('revoked')) return 'badge-action-unlinked';
    return 'badge-action-default';
  };

  const formatEntityType = (entityType: string) => {
    return entityType.charAt(0).toUpperCase() + entityType.slice(1);
  };

  const getEntityBadgeClass = (entityType: string) => {
    if (entityType === 'tube') return 'badge-entity-tube';
    if (entityType === 'user') return 'badge-entity-user';
    if (entityType === 'researcher') return 'badge-entity-researcher';
    if (entityType === 'tank') return 'badge-entity-tank';
    if (entityType === 'rack') return 'badge-entity-rack';
    if (entityType === 'box') return 'badge-entity-box';
    if (entityType === 'lab') return 'badge-entity-lab';
    if (entityType === 'configuration') return 'badge-entity-configuration';
    return 'badge-entity-default';
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'tube':
        return TestTube;
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
      default:
        return null;
    }
  };

  const hasActiveFilters = Object.keys(filterState).some(
    key => key !== 'datePreset' && filterState[key as keyof AuditFilterState]
  );

  // Define table columns - use TableRow base type, cast in render functions
  const auditLogColumns: TableColumn<TableRow>[] = [
    {
      id: 'timestamp',
      header: 'Timestamp',
      width: '8rem',
      render: (_, row) => {
        const entry = row as unknown as AuditLogEntry;
        return (
          <span className="whitespace-nowrap text-muted-foreground text-[11px]">
            {formatTimestamp(entry.timestamp)}
          </span>
        );
      },
    },
    {
      id: 'username',
      header: 'User',
      width: '6rem',
      render: (_, row) => {
        const entry = row as unknown as AuditLogEntry;
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
      render: (_, row) => {
        const entry = row as unknown as AuditLogEntry;
        return (
          <span className={`whitespace-nowrap ${getActionBadgeClass(entry.action)}`}>
            {formatAction(entry.action)}
          </span>
        );
      },
    },
    {
      id: 'entityType',
      header: 'Item',
      width: '5rem',
      render: (_, row) => {
        const entry = row as unknown as AuditLogEntry;
        if (!entry.entityType) {
          return <span className="text-muted-foreground text-xs">-</span>;
        }
        const icon = getEntityIcon(entry.entityType);
        return (
          <span className={`whitespace-nowrap ${getEntityBadgeClass(entry.entityType)} gap-1`}>
            {icon === 'researcher' ? (
              <ResearcherIcon size={12} />
            ) : icon === 'tank' ? (
              <Icon iconNode={refrigeratorFreezer} size={12} />
            ) : icon && typeof icon !== 'string' ? (
              React.createElement(icon, { size: 12 })
            ) : null}
            {formatEntityType(entry.entityType)}
          </span>
        );
      },
    },
    {
      id: 'details',
      header: 'Details',
      render: (_, row) => {
        const entry = row as unknown as AuditLogEntry;
        const details = formatAuditDetails(entry);
        return (
          <span className="text-secondary-foreground max-w-md truncate block" title={details}>
            {details}
          </span>
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
          <h4 className="text-base font-semibold text-card-foreground">Audit Log</h4>
          <span className="text-xs text-muted-foreground">
            ({(pagination?.total || 0).toLocaleString()} total entries)
          </span>
        </div>

        <div className="flex items-center gap-2">
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
          onApply={clearFilters}
          onClear={clearFilters}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading audit log...</div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-validation-error-bg border border-validation-error-border text-validation-error-text px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      {!loading && !error && entries && entries.length > 0 && (
        <Table
          columns={auditLogColumns}
          data={entries as TableRow[]}
          size="sm"
          variant="default"
          hoverable
          rounded="lg"
          className="text-xs"
          aria-label="Audit log entries"
        />
      )}

      {/* Empty State */}
      {!loading && !error && (!entries || entries.length === 0) && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No audit log entries found.
        </div>
      )}

      {/* Pagination */}
      {!loading && entries && entries.length > 0 && (
        <div className="flex items-center justify-between text-xs text-secondary-foreground">
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
