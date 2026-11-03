import { useState, useCallback } from 'react';

import {
  useUpdateTankMutation,
  useUpdateRackMutation,
  useUpdateBoxGridMutation,
  useUpdateResourceLabelMutation,
} from '../../../hooks/useStorageMutations';

import type { BoxGridScope } from './StorageManagerContext';
import type {
  TankConfiguration,
  RackConfiguration,
  GridConfiguration,
} from '@odysseus/shared-schemas';

export function useEditModals() {
  const updateTankMutation = useUpdateTankMutation();
  const updateRackMutation = useUpdateRackMutation();
  const updateBoxGridMutation = useUpdateBoxGridMutation();
  const updateLabelMutation = useUpdateResourceLabelMutation();

  const isMutating =
    updateTankMutation.isPending ||
    updateRackMutation.isPending ||
    updateBoxGridMutation.isPending ||
    updateLabelMutation.isPending;

  const [tankModalData, setTankModalData] = useState<TankConfiguration | null>(null);
  const [isTankModalOpen, setIsTankModalOpen] = useState(false);

  const [gridModalData, setGridModalData] = useState<{
    scope: BoxGridScope;
    label: string;
  } | null>(null);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);

  const [rackModalData, setRackModalData] = useState<{
    tankId: string;
    rack: RackConfiguration;
  } | null>(null);
  const [isRackModalOpen, setIsRackModalOpen] = useState(false);

  const [labelModalData, setLabelModalData] = useState<{
    type: 'rack' | 'box';
    tankId: string;
    rackId: string;
    boxId?: string;
    currentLabel?: string;
  } | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  const onEditTank = useCallback((tank: TankConfiguration) => {
    setTankModalData(tank);
    setIsTankModalOpen(true);
  }, []);

  const onEditRack = useCallback((tankId: string, rack: RackConfiguration) => {
    setRackModalData({ tankId, rack });
    setIsRackModalOpen(true);
  }, []);

  const onEditRackLabel = useCallback((tankId: string, rackId: string, currentLabel: string) => {
    setLabelModalData({ type: 'rack', tankId, rackId, currentLabel });
    setIsLabelModalOpen(true);
  }, []);

  const onChangeBoxGrid = useCallback((scope: BoxGridScope, label: string) => {
    setGridModalData({ scope, label });
    setIsGridModalOpen(true);
  }, []);

  const onEditBoxLabel = useCallback(
    (tankId: string, rackId: string, boxId: string, currentLabel: string) => {
      setLabelModalData({ type: 'box', tankId, rackId, boxId, currentLabel });
      setIsLabelModalOpen(true);
    },
    []
  );

  const handleUpdateTank = (tankId: string, updates: Partial<TankConfiguration>) => {
    updateTankMutation.mutate(
      {
        tankId,
        updates: {
          name: updates.name,
          location: updates.location,
          isActive: updates.isActive,
        },
      },
      { onSuccess: () => setIsTankModalOpen(false) }
    );
  };

  const handleUpdateRack = (
    tankId: string,
    rackId: string,
    updates: Partial<RackConfiguration>
  ) => {
    updateRackMutation.mutate(
      {
        tankId,
        rackId,
        updates: {
          name: updates.name,
          isActive: updates.isActive,
        },
      },
      { onSuccess: () => setIsRackModalOpen(false) }
    );
  };

  const handleUpdateBoxGrid = (scope: BoxGridScope, gridConfig: GridConfiguration) => {
    updateBoxGridMutation.mutate(
      { ...scope, gridConfig },
      { onSuccess: () => setIsGridModalOpen(false) }
    );
  };

  const handleUpdateCustomLabel = (
    type: 'rack' | 'box',
    tankId: string,
    rackId: string,
    boxId: string | undefined,
    label: string
  ) => {
    updateLabelMutation.mutate(
      { resourceType: type, tankId, rackId, boxId, customLabel: label },
      { onSuccess: () => setIsLabelModalOpen(false) }
    );
  };

  return {
    isMutating,

    tankModalData,
    isTankModalOpen,
    setIsTankModalOpen,
    gridModalData,
    isGridModalOpen,
    setIsGridModalOpen,
    rackModalData,
    isRackModalOpen,
    setIsRackModalOpen,
    labelModalData,
    isLabelModalOpen,
    setIsLabelModalOpen,

    onEditTank,
    onEditRack,
    onEditRackLabel,
    onChangeBoxGrid,
    onEditBoxLabel,

    handleUpdateTank,
    handleUpdateRack,
    handleUpdateBoxGrid,
    handleUpdateCustomLabel,
  };
}
