/**
 * Audit Log Viewer Component
 *
 * Displays audit log entries with filtering and pagination.
 * Shows detailed activity tracking for compliance and debugging.
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import { adminService } from '@domains/admin/services/AdminService';

interface AuditLogViewerProps {
  /** Optional initial filters */
  initialFilters?: Partial<AuditLogFilters>;
  /** Optional callback when filters change */
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
  const [tempFilters, setTempFilters] = useState<Partial<AuditLogFilters>>({});

  // Load audit log entries
  const loadAuditLog = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.getAuditLog(filters);
      setEntries(result.entries);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
      console.error('Failed to load audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLog();
  }, [filters]);

  // Apply filters
  const applyFilters = () => {
    const newFilters = {
      ...filters,
      ...tempFilters,
      offset: 0, // Reset to first page
    };
    setFilters(newFilters);
    setShowFilters(false);
    onFiltersChange?.(newFilters);
  };

  // Clear filters
  const clearFilters = () => {
    const resetFilters = {
      limit: 50,
      offset: 0,
    };
    setFilters(resetFilters);
    setTempFilters({});
    setShowFilters(false);
    onFiltersChange?.(resetFilters);
  };

  // Pagination
  const goToNextPage = () => {
    if (pagination.hasMore) {
      setFilters(prev => ({ ...prev, offset: (prev.offset || 0) + (prev.limit || 50) }));
    }
  };

  const goToPreviousPage = () => {
    if ((filters.offset || 0) > 0) {
      setFilters(prev => ({ ...prev, offset: Math.max(0, (prev.offset || 0) - (prev.limit || 50)) }));
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format action for display - simple verb
  const formatAction = (action: string) => {
    // Remove entity type prefix and capitalize (e.g., "tube_created" → "Created")
    const parts = action.split('_');
    if (parts.length > 1) {
      // Take the action part (after entity type)
      return parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
    }
    return action.charAt(0).toUpperCase() + action.slice(1);
  };

  // Get action badge class based on type
  const getActionBadgeClass = (action: string) => {
    if (action.includes('created')) return 'badge-action-created';
    if (action.includes('updated')) return 'badge-action-updated';
    if (action.includes('moved')) return 'badge-action-moved';
    if (action.includes('deleted')) return 'badge-action-deleted';
    return 'badge-action-default';
  };

  // Format entity type for display
  const formatEntityType = (entityType: string) => {
    return entityType.charAt(0).toUpperCase() + entityType.slice(1);
  };

  // Get entity badge class
  const getEntityBadgeClass = (entityType: string) => {
    if (entityType === 'tube') return 'badge-entity-tube';
    if (entityType === 'user') return 'badge-entity-user';
    if (entityType === 'researcher') return 'badge-entity-researcher';
    if (entityType === 'tank') return 'badge-entity-tank';
    if (entityType === 'rack') return 'badge-entity-rack';
    if (entityType === 'box') return 'badge-entity-box';
    if (entityType === 'lab') return 'badge-entity-lab';
    return 'badge-entity-default';
  };

  // Parse and format details for display
  const formatDetails = (entry: AuditLogEntry) => {
    try {
      const details = JSON.parse(entry.details);
      const action = entry.action;
      const entityType = entry.entityType;

      // TUBES: Show location
      if (entityType === 'tube') {
        if (details.displayLocation) return details.displayLocation;
        if (details.location) return details.location;
        return '-';
      }

      // TANK EVENTS
      if (entityType === 'tank') {
        if (action === 'tank_created') {
          const tankName = details.tankName || details.tankId || '';
          return `Tank '${tankName}'`;
        }
        if (action === 'tank_deleted') {
          const tankName = details.tankName || details.tankId || '';
          return `Tank '${tankName}'`;
        }
        if (action === 'tank_updated' && details.changes) {
          const nameChange = details.changes.find((c: any) => c.field === 'name');
          if (nameChange) {
            return `Tank '${nameChange.oldValue}' renamed to '${nameChange.newValue}'`;
          }
          const activeChange = details.changes.find((c: any) => c.field === 'isActive');
          if (activeChange) {
            const tankName = nameChange?.newValue || details.tankId || '';
            return `Tank '${tankName}' ${activeChange.newValue ? 'activated' : 'deactivated'}`;
          }
        }
        const tankName = details.tankId || '';
        return `Tank '${tankName}'`;
      }

      // RACK EVENTS
      if (entityType === 'rack') {
        const tankName = details.tankName || details.tankId || '';
        const rackName = details.rackName || `Rack ${details.rackId}` || '';
        const path = `${tankName}/${rackName}`;

        if (action === 'rack_created') {
          return path;
        }
        if (action === 'rack_deleted') {
          return path;
        }
        if (action === 'rack_updated' && details.changes) {
          const nameChange = details.changes.find((c: any) => c.field === 'name');
          if (nameChange) {
            const oldPath = `${tankName}/${nameChange.oldValue}`;
            return `${oldPath} renamed to '${nameChange.newValue}'`;
          }
          const activeChange = details.changes.find((c: any) => c.field === 'isActive');
          if (activeChange) {
            return `${path} ${activeChange.newValue ? 'activated' : 'deactivated'}`;
          }
        }
        return path;
      }

      // BOX EVENTS
      if (entityType === 'box') {
        const tankName = details.tankName || details.tankId || '';
        const rackName = details.rackName || `Rack ${details.rackId}` || '';
        const boxName = details.boxName || `Box ${details.boxId}` || '';
        const path = `${tankName}/${rackName}/${boxName}`;

        if (action === 'box_created') {
          return path;
        }
        if (action === 'box_deleted') {
          return path;
        }
        if (action === 'box_updated' && details.changes) {
          const nameChange = details.changes.find((c: any) => c.field === 'name');
          if (nameChange) {
            const oldPath = `${tankName}/${rackName}/Box ${nameChange.oldValue}`;
            return `${oldPath} renamed to 'Box ${nameChange.newValue}'`;
          }
          const rowChange = details.changes.find((c: any) => c.field === 'gridConfig.rows');
          const colChange = details.changes.find((c: any) => c.field === 'gridConfig.cols');
          if (rowChange && colChange) {
            return `${path} resized to ${rowChange.newValue}x${colChange.newValue}`;
          }
          const activeChange = details.changes.find((c: any) => c.field === 'isActive');
          if (activeChange) {
            return `${path} ${activeChange.newValue ? 'activated' : 'deactivated'}`;
          }
        }
        return path;
      }

      // LAB EVENTS
      if (entityType === 'lab') {
        if (action === 'lab_name_changed' && details.oldName && details.newName) {
          return `'${details.oldName}' renamed to '${details.newName}'`;
        }
        return details.newName || '-';
      }

      // OTHER ENTITY TYPES (user, researcher)
      if (details.email) return details.email;
      if (details.department) return details.department;

      return '-';
    } catch {
      return '-';
    }
  };

  const hasActiveFilters = Object.keys(tempFilters).some(
    key => key !== 'limit' && key !== 'offset' && tempFilters[key as keyof AuditLogFilters]
  );

  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1;
  const totalPages = Math.ceil((pagination?.total || 0) / (filters.limit || 50));

  return (
    <div className="space-y-3">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-semibold text-gray-900">Audit Log</h4>
          <span className="text-xs text-gray-500">
            ({(pagination?.total || 0).toLocaleString()} total entries)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            >
              <X className="w-3 h-3" />
              Clear Filters
            </button>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              showFilters
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-3 h-3" />
            Filters
          </button>

          <button
            onClick={loadAuditLog}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <Search className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">User</label>
              <input
                type="text"
                placeholder="Filter by username"
                value={tempFilters.userId || ''}
                onChange={(e) => setTempFilters(prev => ({ ...prev, userId: e.target.value || undefined }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
              <select
                value={tempFilters.action || ''}
                onChange={(e) => setTempFilters(prev => ({ ...prev, action: e.target.value || undefined }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Actions</option>
                <option value="tube_created">Tube Created</option>
                <option value="tube_updated">Tube Updated</option>
                <option value="tube_moved">Tube Moved</option>
                <option value="tube_deleted">Tube Deleted</option>
                <option value="tube_bulk_updated">Bulk Update</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entity Type</label>
              <select
                value={tempFilters.entityType || ''}
                onChange={(e) => setTempFilters(prev => ({ ...prev, entityType: e.target.value || undefined }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="tube">Tube</option>
                <option value="user">User</option>
                <option value="researcher">Researcher</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="datetime-local"
                value={tempFilters.dateFrom || ''}
                onChange={(e) => setTempFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setTempFilters({});
                setShowFilters(false);
              }}
              className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              onClick={applyFilters}
              className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-sm text-gray-500">
          Loading audit log...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      {!loading && !error && entries && entries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Timestamp</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">User</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Item</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Details</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{entry.username}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {entry.entityType ? (
                        <span className={getEntityBadgeClass(entry.entityType)}>
                          {formatEntityType(entry.entityType)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={formatDetails(entry)}>
                      {formatDetails(entry)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={getActionBadgeClass(entry.action)}>
                        {formatAction(entry.action)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && (!entries || entries.length === 0) && (
        <div className="text-center py-8 text-sm text-gray-500">
          No audit log entries found.
        </div>
      )}

      {/* Pagination */}
      {!loading && entries && entries.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>
            Showing {(filters.offset || 0) + 1} - {Math.min((filters.offset || 0) + (entries?.length || 0), pagination?.total || 0)} of {(pagination?.total || 0).toLocaleString()}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousPage}
              disabled={(filters.offset || 0) === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={goToNextPage}
              disabled={!pagination?.hasMore}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
