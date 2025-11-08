import { useState, useCallback, useMemo } from 'react';
import type { StorageHierarchy, SelectedLocation } from './storageNavigatorTypes';

export const useStorageNavigation = (
  data: StorageHierarchy,
  selected: SelectedLocation,
  onSelect: (location: SelectedLocation) => void
) => {
  // Initialize with all tanks expanded by default
  const initialExpandedTanks = useMemo(() => {
    return new Set(data.tanks.map(tank => tank.id));
  }, []);

  const [expandedTanks, setExpandedTanks] = useState<Set<string>>(initialExpandedTanks);
  const [expandedRacks, setExpandedRacks] = useState<Set<string>>(new Set());

  const toggleTank = useCallback((tankId: string) => {
    setExpandedTanks((prev) => {
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
    setExpandedRacks((prev) => {
      const next = new Set(prev);
      if (next.has(compositeKey)) {
        next.delete(compositeKey);
      } else {
        next.add(compositeKey);
      }
      return next;
    });
  }, []);

  const selectTank = useCallback((tankId: string) => {
    const tank = data.tanks.find(t => t.id === tankId);
    if (!tank || tank.racks.length === 0) {
      console.warn('No racks available in tank:', tankId);
      return;
    }

    const firstRack = tank.racks[0];
    if (firstRack.boxes.length === 0) {
      console.warn('No boxes available in rack:', firstRack.id);
      return;
    }

    const firstBox = firstRack.boxes[0];
    onSelect({ tankId, rackId: firstRack.id, boxId: firstBox.id });
  }, [data, onSelect]);

  const selectRack = useCallback((tankId: string, rackId: string) => {
    const tank = data.tanks.find(t => t.id === tankId);
    const rack = tank?.racks.find(r => r.id === rackId);
    if (!rack || rack.boxes.length === 0) {
      console.warn('No boxes available in rack:', rackId);
      return;
    }

    const firstBox = rack.boxes[0];
    onSelect({ tankId, rackId, boxId: firstBox.id });
  }, [data, onSelect]);

  const selectBox = useCallback((tankId: string, rackId: string, boxId: string) => {
    onSelect({ tankId, rackId, boxId });
  }, [onSelect]);

  const isTankSelected = useCallback((tankId: string) => {
    return selected.tankId === tankId;
  }, [selected]);

  const isRackSelected = useCallback((tankId: string, rackId: string) => {
    return selected.tankId === tankId && selected.rackId === rackId;
  }, [selected]);

  const isBoxSelected = useCallback((tankId: string, rackId: string, boxId: string) => {
    return selected.tankId === tankId && selected.rackId === rackId && selected.boxId === boxId;
  }, [selected]);

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
