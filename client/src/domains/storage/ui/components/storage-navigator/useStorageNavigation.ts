import { useState, useCallback, useMemo } from 'react';

import { logger } from '@shared/infrastructure/logger';

import type { StorageHierarchy, SelectedLocation } from './storageNavigatorTypes';

export const useStorageNavigation = (
  data: StorageHierarchy,
  selected: SelectedLocation,
  onSelect: (location: SelectedLocation) => void
) => {
  // Track what user has explicitly collapsed (inverted logic for reliable initialization)
  // Empty set = nothing collapsed = all tanks expanded by default
  const [collapsedTanks, setCollapsedTanks] = useState<Set<string>>(new Set());
  const [expandedRacks, setExpandedRacks] = useState<Set<string>>(new Set());

  // Derive expandedTanks from data - a tank is expanded if NOT in collapsedTanks
  const expandedTanks = useMemo(() => {
    const expanded = new Set<string>();
    data.tanks.forEach(tank => {
      if (!collapsedTanks.has(tank.id)) {
        expanded.add(tank.id);
      }
    });
    return expanded;
  }, [data.tanks, collapsedTanks]);

  const toggleTank = useCallback((tankId: string) => {
    setCollapsedTanks(prev => {
      const next = new Set(prev);
      if (next.has(tankId)) {
        // Currently collapsed, expand it
        next.delete(tankId);
      } else {
        // Currently expanded, collapse it
        next.add(tankId);
      }
      return next;
    });
  }, []);

  const toggleRack = useCallback((tankId: string, rackId: string) => {
    const compositeKey = `${tankId}-${rackId}`;
    setExpandedRacks(prev => {
      const next = new Set(prev);
      if (next.has(compositeKey)) {
        next.delete(compositeKey);
      } else {
        next.add(compositeKey);
      }
      return next;
    });
  }, []);

  const selectTank = useCallback(
    (tankId: string) => {
      const tank = data.tanks.find(t => t.id === tankId);
      if (!tank || tank.racks.length === 0) {
        logger.warn('No racks available in tank', { tankId });
        return;
      }

      const firstRack = tank.racks[0];
      if (firstRack.boxes.length === 0) {
        logger.warn('No boxes available in rack', { rackId: firstRack.id });
        return;
      }

      const firstBox = firstRack.boxes[0];
      onSelect({ tankId, rackId: firstRack.id, boxId: firstBox.id });
    },
    [data, onSelect]
  );

  const selectRack = useCallback(
    (tankId: string, rackId: string) => {
      const tank = data.tanks.find(t => t.id === tankId);
      const rack = tank?.racks.find(r => r.id === rackId);
      if (!rack || rack.boxes.length === 0) {
        logger.warn('No boxes available in rack', { rackId });
        return;
      }

      const firstBox = rack.boxes[0];
      onSelect({ tankId, rackId, boxId: firstBox.id });
    },
    [data, onSelect]
  );

  const selectBox = useCallback(
    (tankId: string, rackId: string, boxId: string) => {
      onSelect({ tankId, rackId, boxId });
    },
    [onSelect]
  );

  const isTankSelected = useCallback(
    (tankId: string) => {
      return selected.tankId === tankId;
    },
    [selected]
  );

  const isRackSelected = useCallback(
    (tankId: string, rackId: string) => {
      return selected.tankId === tankId && selected.rackId === rackId;
    },
    [selected]
  );

  const isBoxSelected = useCallback(
    (tankId: string, rackId: string, boxId: string) => {
      return selected.tankId === tankId && selected.rackId === rackId && selected.boxId === boxId;
    },
    [selected]
  );

  return {
    expandedTanks,
    expandedRacks,
    toggleTank,
    toggleRack,
    selectTank,
    selectRack,
    selectBox,
    isTankSelected,
    isRackSelected,
    isBoxSelected,
  };
};
