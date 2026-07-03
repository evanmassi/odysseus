/**
 * Monitoring Tab
 *
 * Audit log viewer with retention settings and archive controls.
 */

import { AlertBanner } from '@shared/ui';

import { AuditLogViewer } from '../AuditLogViewer';
import { AuditRetentionSettings } from '../AuditRetentionSettings';

interface MonitoringTabProps {
  isSystemAdmin?: boolean;
  isDemo?: boolean;
}

export function MonitoringTab({ isSystemAdmin, isDemo }: MonitoringTabProps) {
  return (
    <div className="space-y-4">
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
