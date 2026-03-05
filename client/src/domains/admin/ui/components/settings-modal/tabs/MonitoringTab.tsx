/**
 * Monitoring Tab Component
 *
 * Provides admin interface for system monitoring and audit trail viewing.
 * Displays:
 * - Audit log retention settings and metrics
 * - Audit log with filtering and search
 * - System activity tracking
 * - User action history
 *
 * Part of the Admin Settings modal tab system.
 *
 * @module admin/ui/components/tabs
 */

import { Activity } from 'lucide-react';

import { AlertBanner } from '@shared/ui';

import { AuditLogViewer } from '../AuditLogViewer';
import { AuditRetentionSettings } from '../AuditRetentionSettings';

export interface MonitoringTabProps {
  isSystemAdmin?: boolean;
  isDemo?: boolean;
}

export function MonitoringTab({ isSystemAdmin, isDemo }: MonitoringTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 pb-3 border-b border-border">
        <Activity size={22} className="text-secondary-foreground" />
        <h3 className="text-xl font-semibold text-card-foreground">System Monitoring</h3>
      </div>

      {isDemo && (
        <AlertBanner variant="demo" spacing="none">
          Audit log entries shown below are examples and do not reflect real activity.
        </AlertBanner>
      )}

      {isSystemAdmin && <AuditRetentionSettings defaultCollapsed={true} />}

      <AuditLogViewer />
    </div>
  );
}
