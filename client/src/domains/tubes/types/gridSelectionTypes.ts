/**
 * Grid Selection Types
 *
 * Position management, clipboard, navigation, lock context, and controller interfaces for the tube grid.
 */

import type { TubeData, TubeLocation, CreateTubeRequest } from '@odysseus/shared-schemas';

export interface PositionContext {
  tankId: string;
  rackId: string;
  boxId: string;
}

export type PositionKey = `${string}:${string}:${string}:${number}`;

/** Uses colon separator for composite keys (won't conflict with user-defined IDs) */
export const toPositionKey = (ctx: PositionContext, position: number): PositionKey =>
  `${ctx.tankId}:${ctx.rackId}:${ctx.boxId}:${position}`;

export const parsePositionKey = (key: PositionKey) => {
  const [tankId, rackId, boxId, posStr] = key.split(':');
  return {
    tankId,
    rackId,
    boxId,
    position: Number(posStr),
  };
};

export interface TubeClipboardItem {
  tubeId: string;
  fromPosition: number;
}

export interface LockContext {
  canLockTube: (tube: TubeData) => boolean;
  canUnlockTube: (tube: TubeData) => boolean;
  canShareTubeAccess: (tube: TubeData) => boolean;
  isLockedByCurrentUser: (tube: TubeData) => boolean;
  isLockedOutFrom: (tube: TubeData) => boolean;
  hasExplicitSharedAccess: (tube: TubeData) => boolean;
  getLockOwnerName: (tube: TubeData) => string | undefined;
  getSharedUserNames: (tube: TubeData) => string[];
}

export interface GridControllerProps {
  tankId: string;
  rackId: string;
  boxId: string;
  selectedPositions: Set<PositionKey>;
  onSelectionChange: (selection: Set<PositionKey>) => void;

  resolveTubeIdAtPosition?: (position: number) => string | null;
  onDeleteTubes?: (tubeIds: string[], silent?: boolean) => Promise<void>;
  onPasteTubes?: (tubes: CreateTubeRequest[]) => Promise<void>;
  onMoveTubes?: (
    moves: Array<{ tubeId: string; version: number; destination: TubeLocation }>
  ) => Promise<void>;

  onLockTubes?: (tubeIds: string[]) => void;
  onUnlockTubes?: (tubeIds: string[]) => Promise<void>;
  onShareAccess?: (tubeIds: string[]) => void;
  lockContext?: LockContext;
  isUnlocking?: boolean;

  currentUserId?: string;
  // When true, 'add' operations are blocked client-side;
  // modify operations check tube-level shared access before proceeding
  isViewOnlySpace?: boolean;
  // Admin users bypass lock checks on tubes
  isAdmin?: boolean;
  // Users without a researcher profile can only browse (no edit operations)
  hasResearcherProfile?: boolean;
}

export interface GridControllerReturn {
  handlePositionClick: (
    position: number,
    event: React.MouseEvent | React.KeyboardEvent,
    gridSize?: number
  ) => void;
  handlePositionDoubleClick: (position: number) => void;
  handleBulkSelection: (positions: number[]) => void;
  isPositionSelected: (position: number) => boolean;
  setMousePosition: (position: { x: number; y: number } | null) => void;

  openModal: () => void;

  copy: () => Promise<void>;
  cut: () => Promise<void>;
  paste: (options?: { targetStart?: number }) => Promise<void>;
  delete: () => Promise<void>;

  actions: {
    setSelection: (position: number) => void;
    addToSelection: (position: number) => void;
    removeFromSelection: (position: number) => void;
    toggleInSelection: (position: number) => void;
    clearSelection: () => void;
    copy: () => Promise<void>;
    cut: () => Promise<void>;
    paste: (options?: { targetStart?: number }) => Promise<void>;
    delete: () => Promise<void>;
    toggleLock?: () => Promise<void>;
    lock?: () => void;
    unlock?: () => Promise<void>;
    shareAccess?: () => void;
  };

  clipboard: {
    hasData: boolean;
    count: number;
    cutPositions: Set<PositionKey>;
    copyPositions: Set<PositionKey>;
  };

  contextMenu: {
    isOpen: boolean;
    x: number;
    y: number;
    show: (x: number, y: number) => void;
    hide: () => void;
  };

  selection: {
    hasFilledSelection: boolean;
    isMixed: boolean;
    filledCount: number;
    emptyCount: number;
    lockableCount?: number;
    unlockableCount?: number;
    sharableCount?: number;
    isUnlocking?: boolean;
  };

  getCopyLabel: () => string;
  getCutLabel: () => string;
  getPasteLabel: () => string;
}
