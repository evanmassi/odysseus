import { Button, ScrollArea } from '@shared/ui';

import { usageSummary, type NameUsage } from '../../../../utils/formulas/nameUsage';
import { UNSORTED_GROUP } from '../../../../utils/materials/materialItems';

import {
  MATERIAL_ACTIONS_CELL,
  MATERIAL_CELL,
  MATERIAL_MUTED,
  MATERIAL_TABLE,
  MATERIAL_WARNING_TEXT,
  ROW_ACTION,
  materialRowClass,
  HORIZONTAL_SCROLL,
} from './materialTableStyles';
import { WorkbenchMaterialSection } from './WorkbenchMaterialSection';
import { WorkbenchMaterialUndoRow } from './WorkbenchMaterialUndoRow';

import type { RemovedMaterial } from './useMaterialRemoval';
import type { MaterialItem } from '@odysseus/shared-schemas';

interface WorkbenchMaterialDroppedSectionProps {
  items: readonly MaterialItem[];
  usage: ReadonlyMap<string, NameUsage>;
  isOpen: boolean;
  removed: RemovedMaterial | undefined;
  onToggleOpen: () => void;
  onRestore: (item: MaterialItem) => void;
  onRemove: (item: MaterialItem) => void;
  onUndo: () => void;
}

const lowerFirst = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;

export function WorkbenchMaterialDroppedSection({
  items,
  usage,
  isOpen,
  removed,
  onToggleOpen,
  onRestore,
  onRemove,
  onUndo,
}: WorkbenchMaterialDroppedSectionProps) {
  const rows = items.map((item, index) => {
    const used = usageSummary(usage.get(item.id) ?? { steps: [], formulaCount: 0 });
    return (
      <tr key={item.id} className={materialRowClass(index)}>
        <td className={`${MATERIAL_CELL} text-muted-foreground line-through`}>{item.name}</td>
        <td className={`${MATERIAL_CELL} ${MATERIAL_MUTED} line-through`}>
          {item.group === UNSORTED_GROUP ? 'Unsorted' : item.type}
        </td>
        <td className={`${MATERIAL_CELL} ${MATERIAL_MUTED}`}>
          {used && <span className={MATERIAL_WARNING_TEXT}>Still in {lowerFirst(used)}</span>}
        </td>
        <td className={MATERIAL_ACTIONS_CELL}>
          <Button variant="ghost" size="xs" className={ROW_ACTION} onClick={() => onRestore(item)}>
            Restore
          </Button>
          <Button
            variant="ghost-danger"
            size="xs"
            className={ROW_ACTION}
            onClick={() => onRemove(item)}
          >
            Remove
          </Button>
        </td>
      </tr>
    );
  });
  if (removed) {
    rows.splice(
      Math.min(removed.placeIndex, rows.length),
      0,
      <WorkbenchMaterialUndoRow key="undo" removed={removed} span={3} onUndo={onUndo} />
    );
  }

  return (
    <WorkbenchMaterialSection
      title="Dropped"
      count={items.length}
      isFolded={!isOpen}
      onToggleFold={onToggleOpen}
    >
      <ScrollArea options={HORIZONTAL_SCROLL}>
        <table className={MATERIAL_TABLE}>
          <tbody>{rows}</tbody>
        </table>
      </ScrollArea>
    </WorkbenchMaterialSection>
  );
}
