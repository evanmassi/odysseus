import { useRef } from 'react';

import { ScrollArea } from '@shared/ui';

import { listWithAnd } from '../../../../utils/materials/materialGuesser';

import { MATERIAL_TABLE, MATERIAL_WARNING_TEXT, HORIZONTAL_SCROLL } from './materialTableStyles';
import { WorkbenchMaterialFieldSelector } from './WorkbenchMaterialFieldSelector';
import {
  WorkbenchMaterialHeaderRow,
  type MaterialSectionActions,
} from './WorkbenchMaterialHeaderRow';
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
  onQueryChange: (query: string) => void;
  onToggle: (key: string) => void;
  onTogglePin: (key: string) => void;
  onAddCustom: () => void;
  onClose: () => void;
}

interface WorkbenchMaterialTableProps {
  group: string;
  items: readonly MaterialItem[];
  columns: readonly FieldDefinition[];
  clashes: readonly ConjugateClash[];
  customGroups: readonly string[];
  usage: ReadonlyMap<string, NameUsage>;
  recipeOf: (item: MaterialItem) => readonly RecipeLine[];
  recipeUsers: ReadonlyMap<string, readonly string[]>;
  plateWells: ReadonlyMap<string, number>;
  panelDetectors: ReadonlyMap<string, string>;
  duplicateIds: ReadonlySet<string>;
  fresh: { ids: ReadonlySet<string>; stamp: number };
  removed: RemovedMaterial | undefined;
  editing: MaterialCellEditing;
  actions: MaterialRowActions;
  fieldMenu: MaterialFieldMenu;
  sectionActions: MaterialSectionActions;
  onUndo: () => void;
}

const clashNote = ({ color, panel, items }: ConjugateClash) =>
  `${panel ? `${panel}: ` : ''}${color} is on ${listWithAnd(items.map(item => item.name))}.${
    panel ? '' : ' If they are stained in separate tubes, give them different panels.'
  }`;

export function WorkbenchMaterialTable({
  group,
  items,
  columns,
  clashes,
  customGroups,
  usage,
  recipeOf,
  recipeUsers,
  plateWells,
  panelDetectors,
  duplicateIds,
  fresh,
  removed,
  editing,
  actions,
  fieldMenu,
  sectionActions,
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
      panelDetectors={panelDetectors.get(item.id) ?? ''}
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
            <WorkbenchMaterialHeaderRow
              group={group}
              columns={columns}
              isFieldMenuOpen={fieldMenu.isOpen}
              fieldButtonRef={fieldButtonRef}
              actions={sectionActions}
            />
            <tbody>{rows}</tbody>
          </table>
        </ScrollArea>
      </div>
    </>
  );
}
