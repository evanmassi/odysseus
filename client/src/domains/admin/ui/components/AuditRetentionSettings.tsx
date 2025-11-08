/**
 * Audit Retention Settings Component
 *
 * Displays retention policy, metrics, and manual archival controls.
 * Admin-only component for managing audit log retention.
 * Supports collapsed and expanded views for space efficiency.
 */

import React, { useState, useEffect } from 'react';

import { RefreshCw, Archive, Download, FileClock, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

import { adminService } from '@domains/admin/services/AdminService';

interface RetentionMetrics {
  activeTable: {
    count: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    retentionDays: number;
  };
  archiveTable: {
    count: number;
    oldestEntry: Date | null;
    retentionDays: number;
  };
  nextArchivalDate: Date | null;
  performanceWarning: boolean;
}

interface RetentionPolicy {
  activeRetentionDays: number;
  totalRetentionDays: number;
  archiveRetentionDays: number;
  enableAutoArchival: boolean;
  activeTableWarningThreshold: number;
}

interface AuditRetentionSettingsProps {
  /** Start in collapsed mode */
  defaultCollapsed?: boolean;
}

export function AuditRetentionSettings({ defaultCollapsed = true }: AuditRetentionSettingsProps) {
  const [metrics, setMetrics] = useState<RetentionMetrics | null>(null);
  const [policy, setPolicy] = useState<RetentionPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState<{ archived: number; deleted: number } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Load metrics and policy
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsResult, policyResult] = await Promise.all([
        adminService.getRetentionMetrics(),
        adminService.getRetentionPolicy(),
      ]);

      setMetrics(metricsResult.data);
      setPolicy(policyResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load retention data');
      console.error('Failed to load retention data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Manually trigger archival
  const runArchival = async () => {
    try {
      setArchiving(true);
      setArchiveResult(null);
      setError(null);

      const result = await adminService.runManualArchival();
      setArchiveResult({
        archived: result.data.archived,
        deleted: result.data.deleted,
      });

      // Reload metrics after archival
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run archival');
      console.error('Failed to run archival:', err);
    } finally {
      setArchiving(false);
    }
  };

  // Export archived logs
  const exportArchive = async () => {
    try {
      const blob = await adminService.exportArchivedLogs();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-archive-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export archive');
      console.error('Failed to export archive:', err);
    }
  };

  // Format date
  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Determine status
  const getStatus = (): 'healthy' | 'warning' | 'critical' => {
    if (!metrics) return 'healthy';
    if (metrics.performanceWarning) return 'warning';
    return 'healthy';
  };

  const status = getStatus();

  // Status display
  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      text: 'Healthy',
      alertClass: 'alert-success',
      iconClass: 'alert-success-icon',
      headingClass: 'alert-success-heading',
      textClass: 'alert-success-text',
    },
    warning: {
      icon: AlertTriangle,
      text: 'Warning',
      alertClass: 'alert-warning',
      iconClass: 'alert-warning-icon',
      headingClass: 'alert-warning-heading',
      textClass: 'alert-warning-text',
    },
    critical: {
      icon: AlertTriangle,
      text: 'Critical',
      alertClass: 'alert-error',
      iconClass: 'alert-error-icon',
      headingClass: 'alert-error-heading',
      textClass: 'alert-error-text',
    },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-center text-sm text-gray-500">Loading retention settings...</div>
      </div>
    );
  }

  // Collapsed View
  if (isCollapsed) {
    return (
      <div className={`${currentStatus.alertClass} rounded-lg p-3 cursor-pointer`} onClick={() => setIsCollapsed(false)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${currentStatus.iconClass}`} />
            <span className={`text-sm font-medium ${currentStatus.headingClass}`}>
              Retention: {metrics ? formatNumber(metrics.activeTable.count) : '-'} active • {metrics ? formatNumber(metrics.archiveTable.count) : '-'} archived • {currentStatus.text}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {metrics?.nextArchivalDate && (
              <span className={`text-xs ${currentStatus.textClass}`}>
                Next archival: {formatDate(metrics.nextArchivalDate)}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 ${currentStatus.iconClass}`} />
          </div>
        </div>
      </div>
    );
  }

  // Expanded View
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileClock className="w-4 h-4 text-gray-700" />
            <h4 className="text-sm font-semibold text-gray-900">Audit Log Retention</h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="btn-refresh-compact flex items-center space-x-1"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronUp className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Performance Warning */}
      {metrics?.performanceWarning && (
        <div className="alert-warning rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="alert-warning-icon w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="alert-warning-heading text-sm">Performance Warning</h5>
            <p className="alert-warning-text text-xs mt-1">
              Active audit log table is approaching the warning threshold ({policy?.activeTableWarningThreshold?.toLocaleString()} entries).
              Consider reducing the active retention period or investigating log volume.
            </p>
          </div>
        </div>
      )}

      {/* Archive Result */}
      {archiveResult && (
        <div className="alert-success rounded-lg p-3 flex items-start gap-2">
          <CheckCircle className="alert-success-icon w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="alert-success-heading text-sm">Archival Completed</h5>
            <p className="alert-success-text text-xs mt-1">
              Archived {archiveResult.archived} entries and deleted {archiveResult.deleted} expired entries.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert-error rounded-lg p-3">
          <p className="alert-error-text text-sm">{error}</p>
        </div>
      )}

      {/* Retention Policy */}
      {policy && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-gray-900 mb-2">Retention Policy</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-gray-500">Active Retention</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{policy.activeRetentionDays} days</div>
            </div>
            <div>
              <div className="text-gray-500">Archive Retention</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{policy.archiveRetentionDays} days</div>
            </div>
            <div>
              <div className="text-gray-500">Total Retention</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{policy.totalRetentionDays} days</div>
            </div>
            <div>
              <div className="text-gray-500">Auto Archival</div>
              <div className={`text-sm font-semibold mt-1 ${policy.enableAutoArchival ? 'text-success-bg' : 'text-danger-bg'}`}>
                {policy.enableAutoArchival ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Table Metrics */}
      {metrics && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-gray-900">Active Table (Hot Storage)</h5>
            <div className="text-xs text-gray-500">Fast queries with full indexes</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-gray-500">Total Entries</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">
                {formatNumber(metrics.activeTable.count)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Oldest Entry</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">
                {formatDate(metrics.activeTable.oldestEntry)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Newest Entry</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">
                {formatDate(metrics.activeTable.newestEntry)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Next Archival</div>
              <div className="text-sm font-semibold text-gray-900 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(metrics.nextArchivalDate)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Table Metrics */}
      {metrics && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-gray-900">Archive Table (Warm Storage)</h5>
            <div className="text-xs text-gray-500">Minimal indexes, slower queries</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-gray-500">Total Entries</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">
                {formatNumber(metrics.archiveTable.count)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Oldest Entry</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">
                {formatDate(metrics.archiveTable.oldestEntry)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Retention Period</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">
                {metrics.archiveTable.retentionDays} days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h5 className="text-xs font-semibold text-gray-900 mb-2">Manual Operations</h5>
        <div className="flex gap-2">
          <button
            onClick={runArchival}
            disabled={archiving}
            className="btn-compact bg-action text-white hover:bg-action-hover flex items-center space-x-1"
          >
            <Archive size={12} className={archiving ? 'animate-spin' : ''} />
            <span>{archiving ? 'Running Archival...' : 'Run Manual Archival'}</span>
          </button>
          <button
            onClick={exportArchive}
            className="btn-compact border border-odysseus-border bg-odysseus-surface text-odysseus-secondary hover:bg-odysseus-surface-hover hover:border-odysseus-primary flex items-center space-x-1"
          >
            <Download size={12} />
            <span>Export Archive</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Manual archival will move logs older than {policy?.activeRetentionDays} days to the archive table
          and delete logs older than {policy?.totalRetentionDays} days.
        </p>
      </div>
    </div>
  );
}
