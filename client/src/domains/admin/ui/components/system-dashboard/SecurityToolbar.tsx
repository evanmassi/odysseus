import { RefreshCw } from 'lucide-react';

import { Button } from '@shared/ui';

import { useRefreshSecurityData } from '../../../hooks/useSecurityMonitoringQueries';

export function SecurityToolbar() {
  const { refresh, isRefreshing } = useRefreshSecurityData();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={refresh}
      leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
    >
      Refresh
    </Button>
  );
}
