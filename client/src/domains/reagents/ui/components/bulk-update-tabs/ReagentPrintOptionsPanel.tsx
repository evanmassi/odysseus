/**
 * Reagent Print Options Panel
 *
 * Chooses what a sheet prints: one label per product, or one per bottle. Bottle labels are
 * ticked individually, because every active lot of every selected reagent is far more sheet
 * than a lab usually wants.
 */

import { useMemo } from 'react';

import { Boxes, FlaskConical } from 'lucide-react';

import { useLocationsQuery } from '@domains/lab-management';
import { Button, Checkbox } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import {
  OPTION_CARD_BASE,
  OPTION_CARD_SELECTED,
  OPTION_CARD_UNSELECTED,
} from '@shared/ui/components/inventory';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import type { LabelSource, ReagentPrintLabelState } from './useReagentPrintLabels';
import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

const SOURCE_OPTIONS: { value: LabelSource; label: string; Icon: typeof Boxes }[] = [
  { value: 'item', label: 'Item labels', Icon: Boxes },
  { value: 'lot', label: 'Lot labels', Icon: FlaskConical },
];

interface ReagentPrintOptionsPanelProps {
  items: ReagentItemWithStock[];
  selectedIds: Set<string>;
  state: ReagentPrintLabelState;
}

export function ReagentPrintOptionsPanel({
  items,
  selectedIds,
  state,
}: ReagentPrintOptionsPanelProps) {
  const { source, setSource, lotLabels, isLoadingLots, checkedLotIds, toggleLot, setAllChecked } =
    state;
  const { data: locations = [] } = useLocationsQuery();

  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);

  const groups = useMemo(() => {
    const itemMap = new Map(items.map(item => [item.id, item]));
    const byItem = new Map<string, { name: string; lots: typeof lotLabels }>();
    for (const lotLabel of lotLabels) {
      const group = byItem.get(lotLabel.itemId);
      if (group) {
        group.lots.push(lotLabel);
        continue;
      }
      byItem.set(lotLabel.itemId, {
        name: itemMap.get(lotLabel.itemId)?.name ?? lotLabel.itemId,
        lots: [lotLabel],
      });
    }
    return [...byItem.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, lotLabels]);

  // Named rather than silently skipped: an item with no labelled lots contributes nothing.
  const itemsWithoutLots = selectedIds.size - groups.length;

  return (
    <div className="space-y-3">
      <div>
        <h4 className={FIELD_LABEL_COMPACT}>Label type</h4>
        <div className="grid grid-cols-2 gap-2">
          {SOURCE_OPTIONS.map(({ value, label, Icon }) => {
            const isSelected = source === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSource(value)}
                className={`flex items-center justify-center gap-2 ${OPTION_CARD_BASE} ${
                  isSelected ? OPTION_CARD_SELECTED : OPTION_CARD_UNSELECTED
                }`}
              >
                <Icon
                  size={18}
                  className={
                    isSelected
                      ? 'text-primary dark:[filter:drop-shadow(0_0_6px_hsl(var(--primary)/0.6))]'
                      : 'text-muted-foreground'
                  }
                />
                <span className={`text-body-sm font-semibold ${isSelected ? 'phosphor-text' : ''}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {source === 'lot' && (
        <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
              {checkedLotIds.size} of {lotLabels.length} lots
            </span>
            <div className="flex gap-1">
              <Button size="xs" variant="ghost" onClick={() => setAllChecked(true)}>
                Select all
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setAllChecked(false)}>
                Clear
              </Button>
            </div>
          </div>

          {isLoadingLots ? (
            <p className="py-3 text-center text-caption text-muted-foreground">Loading lots…</p>
          ) : lotLabels.length === 0 ? (
            <p className="py-3 text-center text-caption italic text-muted-foreground">
              {selectedIds.size === 0
                ? 'Select reagents to list their lots'
                : 'No labelled lots in stock for the selected reagents'}
            </p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-2 pr-2">
                {groups.map(group => (
                  <div key={group.name} className="space-y-0.5">
                    <p className="truncate text-caption font-medium text-card-foreground">
                      {group.name}
                    </p>
                    {group.lots.map(lot => (
                      <label
                        key={lot.lotId}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-accent/30"
                      >
                        <Checkbox
                          checked={checkedLotIds.has(lot.lotId)}
                          onChange={() => toggleLot(lot.lotId)}
                        />
                        <span className="truncate font-mono text-data-sm text-card-foreground">
                          {lot.lotNumber ?? 'No lot #'}
                        </span>
                        <span className="flex-1 truncate text-caption text-muted-foreground">
                          {lot.expirationDate && `exp ${formatDateForDisplay(lot.expirationDate)}`}
                        </span>
                        <span className="truncate text-caption text-muted-foreground">
                          {locationNameMap.get(lot.locationId) ?? lot.locationId}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {itemsWithoutLots > 0 && lotLabels.length > 0 && (
            <p className="text-caption text-muted-foreground">
              {itemsWithoutLots} selected reagent{itemsWithoutLots === 1 ? ' has' : 's have'} no
              labelled lots in stock.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
