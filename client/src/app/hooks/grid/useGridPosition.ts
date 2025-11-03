/**
 * Grid Position Hook
 * Manages grid position state and mouse position coordination
 */

import { useGridUiStore } from '@shared/stores/gridUiStore';

interface GridPositionProps {
  tankId: string;
  rackId: string;
  boxId: string;
  gridSize: number;
  onPositionChange?: (position: number) => void;
}

interface GridPositionReturn {
  currentPosition: number | null;
  setPosition: (position: number) => void;
  setMousePosition: (position: { x: number; y: number } | null) => void;
  validatePosition: (position: number) => boolean;
}

export const useGridPosition = ({
  tankId,
  rackId,
  boxId,
  gridSize,
  onPositionChange
}: GridPositionProps): GridPositionReturn => {
  const { setMousePosition: setMousePositionStore } = useGridUiStore();

  const setPosition = (position: number) => {
    onPositionChange?.(position);
  };

  const setMousePosition = (position: { x: number; y: number } | null) => {
    setMousePositionStore(position);
  };

  const validatePosition = (position: number) => {
    return position >= 1 && position <= gridSize * gridSize;
  };

  return {
    currentPosition: null,
    setPosition,
    setMousePosition,
    validatePosition
  };
};
