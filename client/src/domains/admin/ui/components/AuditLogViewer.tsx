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

  // Format action for display
  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Parse and format details
  const formatDetails = (detailsStr: string) => {
    try {
      const details = JSON.parse(detailsStr);
      // For tube operations, show key information
      if (details.location) {
        return details.location;
      }
      if (details.changes && Array.isArray(details.changes)) {
        return `${details.changes.length} field(s) changed`;
      }
      if (details.count) {
        return `${details.count} items affected`;
      }
      return 'View details';
    } catch {
      return detailsStr.substring(0, 50) + (detailsStr.length > 50 ? '...' : '');
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
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Action</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Entity</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Details</th>
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {formatAction(entry.action)}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {entry.entityType && entry.entityId ? (
                        <span className="font-mono text-xs">
                          {entry.entityType}:{entry.entityId.substring(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-md truncate">
                      {formatDetails(entry.details)}
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
