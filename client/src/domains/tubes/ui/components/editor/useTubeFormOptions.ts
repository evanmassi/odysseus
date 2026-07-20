/**
 * Tube Form Options
 *
 * Researcher list and admin-managed lookup dropdowns shared by the tube editors.
 */

import { useMemo } from 'react';

import { useActiveResearchersQuery } from '@domains/researchers';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';

export function useTubeFormOptions() {
  const { data: researchers = [] } = useActiveResearchersQuery();
  const { data: speciesValues = [] } = useLookupValuesQuery('species');
  const { data: sourceValues = [] } = useLookupValuesQuery('source');
  const { data: mediaValues = [] } = useLookupValuesQuery('media');

  const speciesOptions = useMemo(
    () => speciesValues.map(v => ({ value: v.value, label: v.value })),
    [speciesValues]
  );
  const sourceOptions = useMemo(
    () => sourceValues.map(v => ({ value: v.value, label: v.value })),
    [sourceValues]
  );
  const mediaOptions = useMemo(
    () => mediaValues.map(v => ({ value: v.value, label: v.value })),
    [mediaValues]
  );

  return { researchers, speciesOptions, sourceOptions, mediaOptions };
}
