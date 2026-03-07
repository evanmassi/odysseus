/**
 * Storage Navigator Hook
 *
 * Manages expand/collapse state and selection for the storage tree hierarchy.
 */

import { useState, useCallback, useMemo } from 'react';

import { logger } from '@shared/infrastructure/logger';

import type { StorageHierarchy, SelectedLocation } from './types';

export function useStorageNavigator(
  data: StorageHierarchy,
  selected: SelectedLocation,
  onSelect: (location: SelectedLocation) => void
) {
  // Inverted logic: tracking collapsed rather than expanded ensures all tanks start expanded without needing data
  const [collapsedTanks, setCollapsedTanks] = useState<Set<string>>(new Set());
  const [expandedRacks, setExpandedRacks] = useState<Set<string>>(new Set());

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
        next.delete(tankId);
      } else {
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
}
