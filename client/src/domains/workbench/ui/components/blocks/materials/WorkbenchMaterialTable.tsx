import { useRef } from 'react';

import { X } from 'lucide-react';

import { ScrollArea, Tooltip } from '@shared/ui';

import { listWithAnd } from '../../../../utils/materials/materialGuesser';

import {
  MATERIAL_HEAD_CELL,
  MATERIAL_HEAD_ROW,
  MATERIAL_TABLE,
  MATERIAL_WARNING_TEXT,
  HORIZONTAL_SCROLL,
} from './materialTableStyles';
import { WorkbenchMaterialFieldSelector } from './WorkbenchMaterialFieldSelector';
import { WorkbenchMaterialRow, type MaterialRowActions } from './WorkbenchMaterialRow';
import { WorkbenchMaterialUndoRow } from './WorkbenchMaterialUndoRow';

import type { MaterialCellEditing } from './useMaterialCellEditing';
import type { RemovedMaterial } from './useMaterialRemoval';
import type { NameUsage } from '../../../../utils/formulas/nameUsage';
import type { ConjugateClash } from '../../../../utils/materials/materialClashes';
import type { RecipeLine } from '../../../../utils/materials/materialRecipe';
import type { FieldChoice } from '../../../../utils/materials/materialSectionFields';
import type { FieldDefinition, MaterialItem } from '@odysseus/shared-schemas';

interface MaterialFieldMenu {
  isOpen: boolean;
  choices: readonly FieldChoice[];
  pinnedKeys: ReadonlySet<string>;
  query: string;
  onToggleOpen: () => void;
  onQueryChange: (query: string) => void;
  onToggle: (key: string) => void;
  onTogglePin: (key: string) => void;
  onAddCustom: () => void;
  onClose: () => void;
}

interface WorkbenchMaterialTableProps {
  items: readonly MaterialItem[];
  columns: readonly FieldDefinition[];
  clashes: readonly ConjugateClash[];
  customGroups: readonly string[];
  usage: ReadonlyMap<string, NameUsage>;
  recipeOf: (item: MaterialItem) => readonly RecipeLine[];
  recipeUsers: ReadonlyMap<string, readonly string[]>;
  plateWells: ReadonlyMap<string, number>;
  duplicateIds: ReadonlySet<string>;
  fresh: { ids: ReadonlySet<string>; stamp: number };
  removed: RemovedMaterial | undefined;
  editing: MaterialCellEditing;
  actions: MaterialRowActions;
  fieldMenu: MaterialFieldMenu;
  onHideColumn: (key: string) => void;
  onUndo: () => void;
}

const clashNote = ({ color, panel, items }: ConjugateClash) =>
  `${panel ? `${panel}: ` : ''}${color} is on ${listWithAnd(items.map(item => item.name))}.${
    panel ? '' : ' If they are stained in separate tubes, give them different panels.'
  }`;

export function WorkbenchMaterialTable({
  items,
  columns,
  clashes,
  customGroups,
  usage,
  recipeOf,
  recipeUsers,
  plateWells,
  duplicateIds,
  fresh,
  removed,
  editing,
  actions,
  fieldMenu,
  onHideColumn,
  onUndo,
}: WorkbenchMaterialTableProps) {
  const fieldButtonRef = useRef<HTMLButtonElement>(null);
  const clashingIds = new Set(clashes.flatMap(clash => clash.items.map(item => item.id)));
  const rows = items.map((item, index) => (
    <WorkbenchMaterialRow
      key={item.id}
      item={item}
      index={index}
      previous={items[index - 1]}
      columns={columns}
      customGroups={customGroups}
      usage={usage.get(item.id)}
      recipe={recipeOf(item)}
      recipeUsers={recipeUsers.get(item.id) ?? []}
      plateWellCount={plateWells.get(item.id) ?? 0}
      isClashing={clashingIds.has(item.id)}
      isDuplicateName={duplicateIds.has(item.id)}
      freshStamp={fresh.ids.has(item.id) ? fresh.stamp : undefined}
      editing={editing}
      actions={actions}
    />
  ));
  if (removed) {
    rows.splice(
      Math.min(removed.placeIndex, rows.length),
      0,
      <WorkbenchMaterialUndoRow
        key="undo"
        removed={removed}
        span={columns.length + 3}
        onUndo={onUndo}
      />
    );
  }

  return (
    <>
      {clashes.map(clash => (
        <p
          key={`${clash.panel}|${clash.color}`}
          className={`mb-2.5 ml-5 text-body-sm ${MATERIAL_WARNING_TEXT}`}
        >
          {clashNote(clash)}
        </p>
      ))}
      <div className="relative">
        <WorkbenchMaterialFieldSelector
          isOpen={fieldMenu.isOpen}
          triggerRef={fieldButtonRef}
          choices={fieldMenu.choices}
          pinnedKeys={fieldMenu.pinnedKeys}
          query={fieldMenu.query}
          onQueryChange={fieldMenu.onQueryChange}
          onToggle={fieldMenu.onToggle}
          onTogglePin={fieldMenu.onTogglePin}
          onAddCustom={fieldMenu.onAddCustom}
          onClose={fieldMenu.onClose}
        />
        <ScrollArea options={HORIZONTAL_SCROLL}>
          <table className={MATERIAL_TABLE}>
            <thead>
              <tr className={MATERIAL_HEAD_ROW}>
                <th className={MATERIAL_HEAD_CELL}>Name</th>
                <th className={MATERIAL_HEAD_CELL}>Type</th>
                {columns.map(column => (
                  <th key={column.key} className={MATERIAL_HEAD_CELL}>
                    {column.label}
                    <Tooltip content="Hide this column">
                      <button
                        type="button"
                        className="ml-1.5 inline-flex align-middle text-muted-foreground opacity-0 transition-opacity hover:text-danger-text focus-visible:opacity-100 group-hover/head:opacity-100"
                        aria-label={`Hide ${column.label}`}
                        onClick={() => onHideColumn(column.key)}
                      >
                        <X aria-hidden className="h-3 w-3" />
                      </button>
                    </Tooltip>
                  </th>
                ))}
                <th className={MATERIAL_HEAD_CELL}>Used in</th>
                <th className={`${MATERIAL_HEAD_CELL} w-px text-right`}>
                  <button
                    ref={fieldButtonRef}
                    type="button"
                    className={`type-label transition-colors hover:text-foreground ${
                      fieldMenu.isOpen ? 'text-foreground' : 'text-foreground/55'
                    }`}
                    aria-expanded={fieldMenu.isOpen}
                    onClick={fieldMenu.onToggleOpen}
                  >
                    + Field
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </ScrollArea>
      </div>
    </>
  );
}
