import { Plus, RefreshCw } from 'lucide-react';

import { Button } from '@shared/ui';
import { notifications } from '@shared/utils';

import { useCreateLabMutation } from '../../../hooks/useLabMutations';
import { useLabsQuery, useSystemOverviewQuery } from '../../../hooks/useLabQueries';

interface LabsToolbarProps {
  onCreateLab: () => void;
}

export function LabsToolbar({ onCreateLab }: LabsToolbarProps) {
  const { data: labs = [], isLoading, refetch } = useLabsQuery();
  const { refetch: refetchOverview } = useSystemOverviewQuery();
  const createLabMutation = useCreateLabMutation();
  const demoLabExists = labs.some(lab => lab.isDemo);

  const handleRefresh = () => {
    void refetch();
    void refetchOverview();
  };

  const handleCreateDemoLab = () => {
    createLabMutation.mutate(
      { name: 'Demo Lab', isDemo: true },
      { onSuccess: () => notifications.success('Demo lab created') }
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={isLoading}
        leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
      >
        Refresh
      </Button>
      {!demoLabExists && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCreateDemoLab}
          isLoading={createLabMutation.isPending}
          leftIcon={<Plus size={14} />}
        >
          Create Demo Lab
        </Button>
      )}
      <Button variant="primary" size="sm" onClick={onCreateLab} leftIcon={<Plus size={14} />}>
        Create Lab
      </Button>
    </div>
  );
}
