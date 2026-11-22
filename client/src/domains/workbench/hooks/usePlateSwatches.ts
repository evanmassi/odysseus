import { useMemo } from 'react';

import { useWorkbenchStore } from '../stores/workbenchStore';
import { plateSwatches, type PlateSwatchOf } from '../utils/vessels/plateSwatches';

import { useProtocolWith } from './useWorkbenchSlice';

export function usePlateSwatches(): PlateSwatchOf {
  const protocol = useProtocolWith('plate');
  const calculation = useWorkbenchStore(state => state.calculation);
  return useMemo(() => plateSwatches(protocol, calculation), [protocol, calculation]);
}
