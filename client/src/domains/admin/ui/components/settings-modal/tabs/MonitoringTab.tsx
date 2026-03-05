/**
 * Monitoring Tab
 *
 * Audit log viewer with retention settings and archive controls.
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
