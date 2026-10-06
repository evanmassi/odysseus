import { useEffect, type ReactNode } from 'react';

import { queryKeys } from '@app/cache/queryKeys';
import { AlertBanner } from '@shared/ui';

import { TabRefreshButton } from '../../displays/TabRefreshButton';
import { AuditLogViewer } from '../AuditLogViewer';
import { AuditRetentionSettings } from '../AuditRetentionSettings';

interface MonitoringTabProps {
  isSystemAdmin?: boolean;
  isDemo?: boolean;
  onTabAction: (action: ReactNode) => void;
}

export function MonitoringTab({ isSystemAdmin, isDemo, onTabAction }: MonitoringTabProps) {
  useEffect(() => {
    onTabAction(<TabRefreshButton queryKey={queryKeys.admin.auditLogAll()} />);
  }, [onTabAction]);

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
