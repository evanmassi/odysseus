/**
 * Audit Retention Settings
 *
 * Admin controls for retention policy, metrics, and manual archival
 */
import React, { useState, useEffect } from 'react';

import {
  RefreshCw,
  Archive,
  Download,
  FileClock,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { auditService } from '@domains/admin/services/AuditService';
import { logger } from '@infra/logger';
import { Button } from '@shared/ui';

import type { RetentionMetrics, RetentionPolicy } from '@odysseus/shared-schemas';

const STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle,
    text: 'Healthy',
    alertClass: 'alert-success',
    lightClass: 'bg-success-light',
    outlineClass: 'outline-success-border/50',
    hoverClass: 'hover:bg-success-light-hover',
    iconClass: 'alert-success-icon',
    headingClass: 'alert-success-heading',
    textClass: 'alert-success-text',
  },
  warning: {
    icon: AlertTriangle,
    text: 'Warning',
    alertClass: 'alert-warning',
    lightClass: 'bg-warning-light',
    outlineClass: 'outline-warning-border/50',
    hoverClass: 'hover:bg-warning-light-hover',
    iconClass: 'alert-warning-icon',
    headingClass: 'alert-warning-heading',
    textClass: 'alert-warning-text',
  },
};

interface AuditRetentionSettingsProps {
  defaultCollapsed?: boolean;
  isDemo?: boolean;
}

export function AuditRetentionSettings({
  defaultCollapsed = true,
  isDemo,
}: AuditRetentionSettingsProps) {
  const [metrics, setMetrics] = useState<RetentionMetrics | null>(null);
  const [policy, setPolicy] = useState<RetentionPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState<{ archived: number; deleted: number } | null>(
    null
  );
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsResult, policyResult] = await Promise.all([
        auditService.getRetentionMetrics(),
        auditService.getRetentionPolicy(),
      ]);

      setMetrics(metricsResult);
      setPolicy(policyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load retention data');
      logger.error('Failed to load retention data', { err });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const runArchival = async () => {
    try {
      setArchiving(true);
      setArchiveResult(null);
      setError(null);

      const result = await auditService.runManualArchival();
      setArchiveResult({
        archived: result.archived,
        deleted: result.deleted,
      });

      // Reload metrics after archival
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run archival');
      logger.error('Failed to run archival', { err });
    } finally {
      setArchiving(false);
    }
  };

  const exportArchive = async () => {
    try {
      const blob = await auditService.exportArchivedLogs();
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
      logger.error('Failed to export archive', { err });
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getStatus = (): 'healthy' | 'warning' => {
    if (!metrics) return 'healthy';
    if (metrics.performanceWarning) return 'warning';
    return 'healthy';
  };

  const status = getStatus();
  const currentStatus = STATUS_CONFIG[status];
  const StatusIcon = currentStatus.icon;

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-center text-sm text-muted-foreground">
          Loading retention settings...
        </div>
      </div>
    );
  }

  // Collapsed View
  if (isCollapsed) {
    return (
      <button
        type="button"
        className={`${currentStatus.lightClass} rounded-lg p-3 cursor-pointer w-full text-left transition-colors outline outline-1 outline-offset-4 ${currentStatus.outlineClass} ${currentStatus.hoverClass}`}
        onClick={() => setIsCollapsed(false)}
        aria-expanded="false"
        aria-label="Expand audit retention settings"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${currentStatus.iconClass}`} aria-hidden="true" />
            <span className={`text-sm font-medium ${currentStatus.headingClass}`}>
              Retention: {metrics ? formatNumber(metrics.activeTable.count) : '-'} active •{' '}
              {metrics ? formatNumber(metrics.archiveTable.count) : '-'} archived •{' '}
              {currentStatus.text}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {metrics?.nextArchivalDate && (
              <span className={`text-xs ${currentStatus.textClass}`}>
                Next archival: {formatDate(metrics.nextArchivalDate)}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 ${currentStatus.iconClass}`} aria-hidden="true" />
          </div>
        </div>
      </button>
    );
  }

  // Expanded View
  return (
    <div className="space-y-3">
      {/* Header */}
      <button
        type="button"
        className="bg-card border border-border rounded-lg p-3 w-full text-left cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsCollapsed(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChevronUp className="w-4 h-4 text-secondary-foreground" />
            <FileClock className="w-4 h-4 text-secondary-foreground" />
            <h4 className="text-sm font-semibold text-card-foreground">Audit Log Retention</h4>
          </div>
          <Button
            variant="secondary"
            size="xs"
            onClick={e => {
              e.stopPropagation();
              void loadData();
            }}
            isLoading={loading}
            leftIcon={<RefreshCw size={12} />}
          >
            Refresh
          </Button>
        </div>
      </button>

      {/* Performance Warning */}
      {metrics?.performanceWarning && (
        <div className="alert-warning rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="alert-warning-icon w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="alert-warning-heading text-sm">Performance Warning</h5>
            <p className="alert-warning-text text-xs mt-1">
              Active audit log table is approaching the warning threshold (
              {policy?.activeTableWarningThreshold?.toLocaleString()} entries). Consider reducing
              the active retention period or investigating log volume.
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
              Archived {archiveResult.archived} entries and deleted {archiveResult.deleted} expired
              entries.
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
        <div className="bg-card border border-border rounded-lg p-3">
          <h5 className="text-xs font-semibold text-card-foreground mb-2">Retention Policy</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Active Retention</div>
              <div className="text-sm font-semibold text-card-foreground mt-1">
                {policy.activeRetentionDays} days
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Archive Retention</div>
              <div className="text-sm font-semibold text-card-foreground mt-1">
                {policy.archiveRetentionDays} days
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Retention</div>
              <div className="text-sm font-semibold text-card-foreground mt-1">
                {policy.totalRetentionDays} days
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Auto Archival</div>
              <div
                className={`text-sm font-semibold mt-1 ${policy.enableAutoArchival ? 'text-success-bg' : 'text-danger-bg'}`}
              >
                {policy.enableAutoArchival ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Table Metrics */}
      {metrics && (
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-card-foreground">
              Active Table (Hot Storage)
            </h5>
            <div className="text-xs text-muted-foreground">Fast queries with full indexes</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Total Entries</div>
              <div className="text-sm font-semibold text-card-foreground mt-1">
                {formatNumber(metrics.activeTable.count)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Oldest Entry</div>
              <div className="text-sm font-semibold text-card-foreground mt-1">
                {formatDate(metrics.activeTable.oldestEntry)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Newest Entry</div>
              <div className="text-sm font-semibold text-card-foreground mt-1">
                {formatDate(metrics.activeTable.newestEntry)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Next Archival</div>
              <div className="text-sm font-semibold text-card-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(metrics.nextArchivalDate)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Table Metrics */}
      {metrics && (
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-card-foreground">
              Archive Table (Warm Storage)
            </h5>
            <div className="text-xs text-muted-foreground">Minimal indexes, slower queries</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Total Entries</div>
              <div className="text-sm font-semibold text-card-foreground mt-1">
                {formatNumber(metrics.archiveTable.count)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Oldest Entry</div>
              <div className="text-sm font-semibold text-card-foreground mt-1">
                {formatDate(metrics.archiveTable.oldestEntry)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Retention Period</div>
              <div className="text-sm font-semibold text-card-foreground mt-1">
                {metrics.archiveTable.retentionDays} days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-card border border-border rounded-lg p-3">
        <h5 className="text-xs font-semibold text-card-foreground mb-2">Manual Operations</h5>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="xs"
            onClick={runArchival}
            isLoading={archiving}
            disabled={isDemo}
            loadingText="Running Archival..."
            leftIcon={<Archive size={12} />}
          >
            Run Manual Archival
          </Button>
          <Button
            variant="cancel"
            size="xs"
            onClick={exportArchive}
            disabled={isDemo}
            leftIcon={<Download size={12} />}
          >
            Export Archive
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Manual archival will move logs older than {policy?.activeRetentionDays} days to the
          archive table and delete logs older than {policy?.totalRetentionDays} days.
        </p>
      </div>
    </div>
  );
}
