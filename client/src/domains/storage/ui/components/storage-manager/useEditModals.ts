/**
 * Storage Edit Modals
 *
 * Modal lifecycle state and update mutations for the storage manager's edit modals.
 */

import { useState, useCallback } from 'react';

import {
  useUpdateTankMutation,
  useUpdateRackMutation,
  useUpdateBoxMutation,
  useUpdateResourceLabelMutation,
} from '@domains/storage';

import type {
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
  GridConfiguration,
} from '@domains/storage';

export function useEditModals() {
  const updateTankMutation = useUpdateTankMutation();
  const updateRackMutation = useUpdateRackMutation();
  const updateBoxMutation = useUpdateBoxMutation();
  const updateLabelMutation = useUpdateResourceLabelMutation();

  const isMutating =
    updateTankMutation.isPending ||
    updateRackMutation.isPending ||
    updateBoxMutation.isPending ||
    updateLabelMutation.isPending;

  const [tankModalData, setTankModalData] = useState<TankConfiguration | null>(null);
  const [isTankModalOpen, setIsTankModalOpen] = useState(false);

  const [boxModalData, setBoxModalData] = useState<{
    tankId: string;
    rackId: string;
    box: BoxConfiguration;
  } | null>(null);
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);

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

  const onEditBox = useCallback((tankId: string, rackId: string, box: BoxConfiguration) => {
    setBoxModalData({ tankId, rackId, box });
    setIsBoxModalOpen(true);
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
          capacity: updates.capacity,
          isActive: updates.isActive,
        },
      },
      { onSuccess: () => setIsRackModalOpen(false) }
    );
  };

  const handleUpdateBoxGrid = (
    tankId: string,
    rackId: string,
    boxId: string,
    gridConfig: GridConfiguration
  ) => {
    updateBoxMutation.mutate(
      { tankId, rackId, boxId, updates: { gridConfig } },
      { onSuccess: () => setIsBoxModalOpen(false) }
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
      { resourceType: type, tankId, rackId, boxId, customLabel: label || undefined },
      { onSuccess: () => setIsLabelModalOpen(false) }
    );
  };

  return {
    isMutating,

    tankModalData,
    isTankModalOpen,
    setIsTankModalOpen,
    boxModalData,
    isBoxModalOpen,
    setIsBoxModalOpen,
    rackModalData,
    isRackModalOpen,
    setIsRackModalOpen,
    labelModalData,
    isLabelModalOpen,
    setIsLabelModalOpen,

    onEditTank,
    onEditRack,
    onEditRackLabel,
    onEditBox,
    onEditBoxLabel,

    handleUpdateTank,
    handleUpdateRack,
    handleUpdateBoxGrid,
    handleUpdateCustomLabel,
  };
}
