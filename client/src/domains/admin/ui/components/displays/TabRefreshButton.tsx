import { RefreshCw } from 'lucide-react';

import { useRefreshQueryGroup } from '@shared/hooks';
import { Button } from '@shared/ui';

import type { QueryKey } from '@tanstack/react-query';

interface TabRefreshButtonProps {
  queryKey: QueryKey;
}

export function TabRefreshButton({ queryKey }: TabRefreshButtonProps) {
  const { refresh, isRefreshing } = useRefreshQueryGroup(queryKey);

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
