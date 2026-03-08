/**
 * Clipboard Types
 *
 * Data structures for grid copy/cut/paste operations.
 */

import type { PositionContext } from './gridSelectionTypes';
import type { TubeData } from '@odysseus/shared-schemas';

export type SelectionMode = 'drag' | 'standard';

export interface ClipboardData {
  tubes: TubeData[];
  operation: 'copy' | 'cut';
  timestamp: Date;
  /** How the tubes were selected — determines paste behavior (rectangular vs sequential) */
  selectionMode: SelectionMode;
  sourceLocation?: PositionContext;
}
