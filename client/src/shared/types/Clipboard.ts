/**
 * Clipboard and Undo/Redo Types
 */
import type { TubeData } from './Tube';

export interface ClipboardData {
  tubes: TubeData[];
  operation: 'copy' | 'cut';
  timestamp: Date;
  sourceLocation?: {
    tankId: string;
    rackId: string;
    boxId: string;
  };
}

export interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription?: string;
  redoDescription?: string;
}

export interface HistoryAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'bulk-update' | 'bulk-delete';
  description: string;
  timestamp: Date;
  data: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic undo/redo data for flexible action types
    before?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic undo/redo data for flexible action types
    after?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic undo/redo data for flexible action types
    items?: any[];
  };
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export interface HistoryStack {
  actions: HistoryAction[];
  currentIndex: number;
  maxSize: number;
}
