/**
 * Selection Analysis Hook
 *
 * Partitions selected grid positions into filled (has tube) and empty sets,
 * avoiding duplicate position-key parsing across Dashboard and AppHeader.
 */

import { useMemo } from 'react';

import { parsePositionKey } from '@shared/types/GridSelection';

import type { TubeData } from '@domains/tubes/types';
import type { PositionKey } from '@shared/types/GridSelection';

export interface SelectionAnalysis {
  selectedTubes: TubeData[];
  emptyPositions: Set<string>;
  filledPositions: Set<string>;
  hasSelection: boolean;
  hasEmpty: boolean;
  hasFilled: boolean;
  isMixed: boolean;
  totalSelected: number;
}

const EMPTY_ANALYSIS: SelectionAnalysis = {
  selectedTubes: [],
  emptyPositions: new Set<string>(),
  filledPositions: new Set<string>(),
  hasSelection: false,
  hasEmpty: false,
  hasFilled: false,
  isMixed: false,
  totalSelected: 0,
};

export function useSelectionAnalysis(
  selectedPositions: Set<PositionKey> | undefined,
  tubes: TubeData[] | undefined
): SelectionAnalysis {
  return useMemo(() => {
    if (!selectedPositions || selectedPositions.size === 0 || !tubes) {
      return EMPTY_ANALYSIS;
    }

    const selectedTubes = Array.from(selectedPositions)
      .map(key => {
        const { tankId, rackId, boxId, position } = parsePositionKey(key);
        return tubes.find(
          t =>
            t.location.tankId === tankId &&
            t.location.rackId === rackId &&
            t.location.boxId === boxId &&
            t.location.position === position
        );
      })
      .filter((tube): tube is TubeData => tube !== undefined);

    const emptyPositions = new Set(
      Array.from(selectedPositions).filter(key => {
        const { tankId, rackId, boxId, position } = parsePositionKey(key);
        return !tubes.find(
          t =>
            t.location.tankId === tankId &&
            t.location.rackId === rackId &&
            t.location.boxId === boxId &&
            t.location.position === position
        );
      })
    );

    const filledPositions = new Set(
      Array.from(selectedPositions).filter(key => !emptyPositions.has(key))
    );

    const hasEmpty = emptyPositions.size > 0;
    const hasFilled = filledPositions.size > 0;

    return {
      selectedTubes,
      emptyPositions,
      filledPositions,
      hasSelection: true,
      hasEmpty,
      hasFilled,
      isMixed: hasEmpty && hasFilled,
      totalSelected: selectedPositions.size,
    };
  }, [selectedPositions, tubes]);
}
