/**
 * Grid Types and Position Management
 * Type definitions for grid operations
 */

import type { TubeData, CreateTubeRequest } from './tubeTypes';

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
    position: Number(posStr) as Position 
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
}

export interface GridControllerReturn {
  handlePositionClick: (position: number, event: React.MouseEvent, gridSize?: number) => void;
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
    select: (position: number) => void;
    deselect: (position: number) => void;
    toggle: (position: number) => void;
    clear: () => void;
    add: () => void;
    edit: () => void;
    copy: () => Promise<void>;
    cut: () => Promise<void>;
    paste: (options?: { targetStart?: number }) => Promise<void>;
    delete: () => Promise<void>;
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
  };
  
  // Label methods for UI
  getCopyLabel: () => string;
  getCutLabel: () => string;
  getPasteLabel: () => string;
}
