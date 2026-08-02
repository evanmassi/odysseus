/**
 * Reagent Print Label Selection
 *
 * Holds which labels a print run will produce: the product's, or the individual bottles the
 * user ticks. Lot labels are fetched as the picker's source, so nothing prints unseen.
 */

import { useCallback, useMemo, useState } from 'react';

import { useReagentLotLabelsQuery } from '@domains/reagents/hooks';

import { fetchReagentItemPrintLabels, toLotPrintableLabels } from './reagentPrintLabels';

import type { ReagentLotLabel } from './reagentPrintLabels';
import type { ReagentItemWithStock } from '@odysseus/shared-schemas';
import type { PrintableLabel } from '@shared/ui/components/barcodes';

export type LabelSource = 'item' | 'lot';

export interface ReagentPrintLabelState {
  source: LabelSource;
  setSource: (source: LabelSource) => void;
  lotLabels: ReagentLotLabel[];
  isLoadingLots: boolean;
  checkedLotIds: Set<string>;
  toggleLot: (lotId: string) => void;
  setAllChecked: (checked: boolean) => void;
  /** Labels the current settings would print — the footer count, and the print-button gate. */
  labelCount: number;
  fetchLabels: (itemIds: string[]) => Promise<PrintableLabel[]>;
  reset: () => void;
}

export function useReagentPrintLabels(
  items: ReagentItemWithStock[],
  selectedIds: Set<string>
): ReagentPrintLabelState {
  const [source, setSource] = useState<LabelSource>('item');
  const [checkedLotIds, setCheckedLotIds] = useState<Set<string>>(new Set());

  // Sorted so ticking items in a different order doesn't miss the cache.
  const itemIds = useMemo(() => [...selectedIds].sort(), [selectedIds]);
  const { data: lotLabels = [], isFetching: isLoadingLots } = useReagentLotLabelsQuery(
    itemIds,
    source === 'lot'
  );

  // Ticks survive a selection change only while their lot is still on offer.
  const checkedLotLabels = useMemo(
    () => lotLabels.filter(lotLabel => checkedLotIds.has(lotLabel.lotId)),
    [lotLabels, checkedLotIds]
  );

  const toggleLot = useCallback((lotId: string) => {
    setCheckedLotIds(prev => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  }, []);

  const setAllChecked = useCallback(
    (checked: boolean) => {
      setCheckedLotIds(checked ? new Set(lotLabels.map(lotLabel => lotLabel.lotId)) : new Set());
    },
    [lotLabels]
  );

  const fetchLabels = useCallback(
    (ids: string[]) =>
      source === 'item'
        ? fetchReagentItemPrintLabels(items, ids)
        : Promise.resolve(toLotPrintableLabels(items, checkedLotLabels)),
    [source, items, checkedLotLabels]
  );

  const reset = useCallback(() => {
    setSource('item');
    setCheckedLotIds(new Set());
  }, []);

  return {
    source,
    setSource,
    lotLabels,
    isLoadingLots,
    checkedLotIds,
    toggleLot,
    setAllChecked,
    labelCount: source === 'item' ? selectedIds.size : checkedLotLabels.length,
    fetchLabels,
    reset,
  };
}
