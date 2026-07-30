/**
 * Unit Options Hook
 *
 * The unit dropdowns every catalog form draws from: the fixed registry plus whatever the
 * lab has added, so a custom unit is offered everywhere its dimension applies.
 */

import { useMemo } from 'react';

import { useCustomUnitsQuery } from '@domains/lab-management';
import { amountUnitOptions, concentrationUnitOptions, packUnits } from '@shared/utils/unitOptions';

export function useUnitOptions() {
  const { data: customUnits = [] } = useCustomUnitsQuery();

  return useMemo(
    () => ({
      concentration: concentrationUnitOptions(customUnits),
      amount: amountUnitOptions(customUnits),
      pack: packUnits(customUnits),
    }),
    [customUnits]
  );
}
