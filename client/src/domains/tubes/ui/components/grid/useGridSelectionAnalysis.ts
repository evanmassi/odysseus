/**
 * Grid Selection Analysis
 *
 * Partitions selected grid positions into filled (has tube) and empty sets,
 * avoiding duplicate position-key parsing across Dashboard and AppHeader.
 */

import { useMemo } from 'react';

import { toPositionKey } from '@domains/tubes/types/gridSelectionTypes';

import type { TubeData } from '@domains/tubes/types';
import type { PositionKey } from '@domains/tubes/types/gridSelectionTypes';

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

export function useGridSelectionAnalysis(
  selectedPositions: Set<PositionKey> | undefined,
  tubes: TubeData[] | undefined
): SelectionAnalysis {
  return useMemo(() => {
    if (!selectedPositions || selectedPositions.size === 0 || !tubes) {
      return EMPTY_ANALYSIS;
    }

    const tubeByPosition = new Map<PositionKey, TubeData>();
    for (const tube of tubes) {
      tubeByPosition.set(toPositionKey(tube.location, tube.location.position), tube);
    }

    const selectedTubes: TubeData[] = [];
    const emptyPositions = new Set<string>();
    const filledPositions = new Set<string>();

    for (const key of selectedPositions) {
      const tube = tubeByPosition.get(key);
      if (tube) {
        selectedTubes.push(tube);
        filledPositions.add(key);
      } else {
        emptyPositions.add(key);
      }
    }

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
