/**
 * Audit Retention Settings
 *
 * Admin controls for retention policy, metrics, and manual archival.
 */
import { useState, useEffect } from 'react';

import {
  RefreshCw,
  Archive,
  Download,
  FileClock,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { logger } from '@infra/logger';
import { AlertBanner, Button, ConsolePanel, StatCell, STAT_STRIP, Subsection } from '@shared/ui';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { downloadBlob } from '@shared/utils/downloadBlob';

import { auditService } from '../../../services/AuditService';

import type { RetentionMetrics, RetentionPolicy } from '@odysseus/shared-schemas';

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle, label: 'Healthy', textClass: 'text-success-text' },
  warning: { icon: AlertTriangle, label: 'Warning', textClass: 'text-warning-text' },
} as const;

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
      downloadBlob(blob, `audit-archive-${new Date().toISOString().split('T')[0]}.json`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export archive');
      logger.error('Failed to export archive', { err });
    }
  };

  const formatDate = (date: Date | null) => (date ? formatDateForDisplay(date) : '—');

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

  // First load only: a refresh keeps the panel on screen and lets the button's spinner carry it.
  if (loading && !metrics) {
    return (
      <ConsolePanel intensity="soft">
        <div className="px-4 py-3 text-center type-label text-label-xs text-muted-foreground">
          Loading retention…
        </div>
      </ConsolePanel>
    );
  }

  // Collapsed View — single status bar; warning tints the chassis.
  if (isCollapsed) {
    return (
      <ConsolePanel
        intensity="soft"
        statusColor={status === 'warning' ? 'hsl(var(--color-warning-bg))' : undefined}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
          onClick={() => setIsCollapsed(false)}
          aria-expanded="false"
          aria-label="Expand audit retention settings"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <StatusIcon
              className={`h-4 w-4 shrink-0 ${currentStatus.textClass}`}
              aria-hidden="true"
            />
            <span className="type-label text-label-xs tracking-label-wide text-foreground/80">
              Audit Retention
            </span>
            <span className="truncate font-mono text-data-sm tracking-data text-muted-foreground">
              {metrics ? formatNumber(metrics.activeTable.count) : '—'} active
              <span className="px-1.5 text-foreground/30">·</span>
              {metrics ? formatNumber(metrics.archiveTable.count) : '—'} archived
              <span className="px-1.5 text-foreground/30">·</span>
              <span className={currentStatus.textClass}>{currentStatus.label}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {metrics?.nextArchivalDate && (
              <span className="hidden type-label text-label-2xs text-muted-foreground/70 sm:inline">
                Next · {formatDate(metrics.nextArchivalDate)}
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </button>
      </ConsolePanel>
    );
  }

  // Expanded View
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="group flex items-center gap-2.5"
          onClick={() => setIsCollapsed(true)}
          aria-expanded="true"
          aria-label="Collapse audit retention settings"
        >
          <ChevronUp className="h-3.5 w-3.5 text-foreground/40 transition-colors group-hover:text-foreground/70" />
          <span
            aria-hidden
            className="h-3 w-0.5 shrink-0 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.6)]"
          />
          <FileClock className="h-3.5 w-3.5 text-foreground/55" />
          <span className="type-label text-label-xs tracking-label-wide text-foreground/70">
            Audit Log Retention
          </span>
        </button>
        <Button
          variant="secondary"
          size="xs"
          onClick={() => void loadData()}
          isLoading={loading}
          leftIcon={<RefreshCw size={12} />}
        >
          Refresh
        </Button>
      </div>

      {/* Performance Warning */}
      {metrics?.performanceWarning && (
        <AlertBanner variant="warning" title="Performance warning" spacing="none">
          Active audit log table is approaching the warning threshold (
          {policy?.activeTableWarningThreshold?.toLocaleString()} entries). Consider reducing the
          active retention period or investigating log volume.
        </AlertBanner>
      )}

      {/* Archive Result */}
      {archiveResult && (
        <AlertBanner variant="success" title="Archival completed" spacing="none">
          Archived {archiveResult.archived} entries and deleted {archiveResult.deleted} expired
          entries.
        </AlertBanner>
      )}

      {/* Error */}
      {error && (
        <AlertBanner variant="error" spacing="none">
          {error}
        </AlertBanner>
      )}

      <ConsolePanel intensity="soft">
        {/* Retention Policy */}
        {policy && (
          <Subsection title="Retention Policy" index={1} accent>
            <div className="col-span-2 py-2">
              <div className={STAT_STRIP}>
                <StatCell
                  size="sm"
                  label="Active Retention"
                  value={policy.activeRetentionDays}
                  unit="days"
                  className="flex-1"
                />
                <StatCell
                  size="sm"
                  label="Archive Retention"
                  value={policy.archiveRetentionDays}
                  unit="days"
                  className="flex-1"
                />
                <StatCell
                  size="sm"
                  label="Total Retention"
                  value={policy.totalRetentionDays}
                  unit="days"
                  className="flex-1"
                />
                <StatCell
                  size="sm"
                  label="Auto Archival"
                  tone={policy.enableAutoArchival ? 'success' : 'danger'}
                  value={
                    <span
                      className={
                        policy.enableAutoArchival ? 'text-success-text' : 'text-danger-text'
                      }
                    >
                      {policy.enableAutoArchival ? 'Enabled' : 'Disabled'}
                    </span>
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </Subsection>
        )}

        {/* Active Table Metrics */}
        {metrics && (
          <Subsection title="Active Table" index={2} accent meta="Hot storage">
            <div className="col-span-2 py-2">
              <div className={STAT_STRIP}>
                <StatCell
                  size="sm"
                  label="Total Entries"
                  tone={metrics.performanceWarning ? 'warning' : 'default'}
                  value={formatNumber(metrics.activeTable.count)}
                  className="flex-1"
                />
                <StatCell
                  size="sm"
                  label="Oldest Entry"
                  value={formatDate(metrics.activeTable.oldestEntry)}
                  className="flex-1"
                />
                <StatCell
                  size="sm"
                  label="Newest Entry"
                  value={formatDate(metrics.activeTable.newestEntry)}
                  className="flex-1"
                />
                <StatCell
                  size="sm"
                  label="Next Archival"
                  value={formatDate(metrics.nextArchivalDate)}
                  className="flex-1"
                />
              </div>
            </div>
          </Subsection>
        )}

        {/* Archive Table Metrics */}
        {metrics && (
          <Subsection title="Archive Table" index={3} accent meta="Warm storage">
            <div className="col-span-2 py-2">
              <div className={STAT_STRIP}>
                <StatCell
                  size="sm"
                  label="Total Entries"
                  value={formatNumber(metrics.archiveTable.count)}
                  className="flex-1"
                />
                <StatCell
                  size="sm"
                  label="Oldest Entry"
                  value={formatDate(metrics.archiveTable.oldestEntry)}
                  className="flex-1"
                />
                <StatCell
                  size="sm"
                  label="Retention Period"
                  value={metrics.archiveTable.retentionDays}
                  unit="days"
                  className="flex-1"
                />
              </div>
            </div>
          </Subsection>
        )}

        {/* Manual Operations */}
        <Subsection title="Operations" index={4} accent>
          <div className="col-span-2 space-y-3 py-4">
            <div className="flex flex-wrap gap-2">
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
            <p className="font-mono text-data-sm leading-relaxed tracking-data text-muted-foreground">
              Manual archival moves logs older than {policy?.activeRetentionDays} days to the
              archive table and deletes logs older than {policy?.totalRetentionDays} days.
            </p>
          </div>
        </Subsection>
      </ConsolePanel>
    </div>
  );
}
