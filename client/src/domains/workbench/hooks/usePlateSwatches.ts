import { useMemo } from 'react';

import { useWorkbenchStore } from '../stores/workbenchStore';
import { plateSwatches, type PlateSwatchOf } from '../utils/plateMap/plateSwatches';

import { useProtocolWith } from './useWorkbenchSlice';

export function usePlateSwatches(): PlateSwatchOf {
  const protocol = useProtocolWith('plate');
  const board = useWorkbenchStore(state => state.board);
  return useMemo(() => plateSwatches(protocol, board), [protocol, board]);
}
