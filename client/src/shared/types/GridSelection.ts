/**
 * Grid Types and Position Management
 * Type definitions for grid operations
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TubeData, CreateTubeRequest } from './Tube';

// Position and location types
export type TankId = string;
export type RackId = string;
export type BoxId = string;
export type Position = number;
export type TubeId = string;

export interface PositionContext {
  tankId: TankId;
  rackId: RackId;
  boxId: BoxId;
}

export type PositionKey = `${TankId}:${RackId}:${BoxId}:${Position}`;

/**
 * Create a stable position key for selection management
 * Uses colon separator for composite keys (won't conflict with user-defined IDs)
 */
export const toPositionKey = (ctx: PositionContext, position: Position): PositionKey =>
  `${ctx.tankId}:${ctx.rackId}:${ctx.boxId}:${position}`;

/**
 * Parse position key back to components
 * Parses colon-separated composite key format
 */
export const parsePositionKey = (key: PositionKey) => {
  const [tankId, rackId, boxId, posStr] = key.split(':');
  return {
    tankId,
    rackId,
    boxId,
    position: Number(posStr) as Position,
  };
};

// Clipboard types for tube operations
export interface TubeClipboardItem {
  tubeId: TubeId;
  fromPosition: Position;
}

export interface GridClipboard {
  type: 'GridClipboard/Tubes';
  version: 1;
  sourceContext: PositionContext;
  items: TubeClipboardItem[];
  operation: 'copy' | 'cut';
  createdAt: number;
}

// Grid navigation interface
export interface GridNavigationReturn {
  handleKeyDown: (event: KeyboardEvent) => void;
  focusPosition: number | null;
  navigateToPosition: (position: number) => void;
  setMousePosition?: (position: number) => void; // Optional for TubeGrid integration
}

/**
 * Unified lock context for all lock-related operations
 * Components use the functions they need from this shared interface
 */
export interface LockContext {
  // Permission checks
  canLockTube: (tube: TubeData) => boolean;
  canUnlockTube: (tube: TubeData) => boolean;
  canShareTubeAccess: (tube: TubeData) => boolean;
  isLockedByCurrentUser: (tube: TubeData) => boolean;
  isLockedOutFrom: (tube: TubeData) => boolean;
  hasExplicitSharedAccess: (tube: TubeData) => boolean;
  // Display helpers
  getLockOwnerName: (tube: TubeData) => string | undefined;
  getSharedUserNames: (tube: TubeData) => string[];
}

// Grid controller interfaces
export interface GridControllerProps {
  tankId: string;
  rackId: string;
  boxId: string;
  selectedPositions: Set<PositionKey>;
  onSelectionChange: (selection: Set<PositionKey>) => void;

  // Domain callbacks for tube operations
  resolveTubeIdAtPosition?: (position: number) => string | null;
  onDeleteTubes?: (tubeIds: string[], silent?: boolean) => Promise<void>;
  onPasteTubes?: (tubes: CreateTubeRequest[]) => Promise<void>;

  // Lock callbacks (optional - for lock-enabled grids)
  onLockTubes?: (tubeIds: string[]) => void;
  onUnlockTubes?: (tubeIds: string[]) => Promise<void>;
  onShareAccess?: (tubeIds: string[]) => void;
  lockContext?: LockContext;
  isUnlocking?: boolean;

  // Access control
  // Current user ID for shared access checks
  currentUserId?: string;
  // View-only mode (container assigned to another user)
  // When true, 'add' operations are blocked client-side
  // Modify operations check tube-level shared access before proceeding
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

  // Unified modal opener
  openModal: () => void;

  // Core operations
  copy: () => Promise<void>;
  cut: () => Promise<void>;
  paste: (options?: { targetStart?: number }) => Promise<void>;
  delete: () => Promise<void>;

  // Action methods
  actions: {
    setSelection: (position: number) => void;
    addToSelection: (position: number) => void;
    removeFromSelection: (position: number) => void;
    toggleInSelection: (position: number) => void;
    clearSelection: () => void;
    add: () => void;
    edit: () => void;
    copy: () => Promise<void>;
    cut: () => Promise<void>;
    paste: (options?: { targetStart?: number }) => Promise<void>;
    delete: () => Promise<void>;
    // Lock actions (optional - only available when lock hooks are provided)
    toggleLock?: () => Promise<void>;
    lock?: () => void;
    unlock?: () => Promise<void>;
    shareAccess?: () => void;
  };

  // Grid selection operations state
  clipboard: {
    hasData: boolean;
    count: number;
    cutPositions: Set<PositionKey>;
    copyPositions: Set<PositionKey>;
  };

  // Grid context menu state
  contextMenu: {
    isOpen: boolean;
    x: number;
    y: number;
    show: (x: number, y: number) => void;
    hide: () => void;
  };

  // Grid selection state
  selection: {
    hasFilledSelection: boolean;
    isMixed: boolean;
    filledCount: number;
    emptyCount: number;
    // Lock-related counts (optional - populated when lock context available)
    lockableCount?: number;
    unlockableCount?: number;
    sharableCount?: number;
    isUnlocking?: boolean;
  };

  // Label methods for UI
  getCopyLabel: () => string;
  getCutLabel: () => string;
  getPasteLabel: () => string;
}
