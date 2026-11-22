import { useRef } from 'react';

import { ScrollArea, type SelectOption } from '@shared/ui';

import { usePlateSwatches } from '../../../../hooks/usePlateSwatches';
import { columnLabel } from '../../../../utils/materials/materialCatalog';
import { listWithAnd } from '../../../../utils/materials/materialGuesser';

import { MATERIAL_TABLE, MATERIAL_WARNING_TEXT, HORIZONTAL_SCROLL } from './materialTableStyles';
import { WorkbenchMaterialDonorTable, type DonorTableActions } from './WorkbenchMaterialDonorTable';
import { WorkbenchMaterialFieldSelector } from './WorkbenchMaterialFieldSelector';
import {
  WorkbenchMaterialHeaderRow,
  type MaterialSectionActions,
} from './WorkbenchMaterialHeaderRow';
import { WorkbenchMaterialRow, type MaterialRowActions } from './WorkbenchMaterialRow';
import { WorkbenchMaterialUndoRow } from './WorkbenchMaterialUndoRow';

import type { MaterialCellEditing } from './useMaterialCellEditing';
import type { RemovedMaterial } from './useMaterialRemoval';
import type { DiluentUse } from '../../../../utils/dilutions/dilutionDiluents';
import type { NameUsage } from '../../../../utils/formulas/nameUsage';
import type { ConjugateConflict } from '../../../../utils/materials/conjugateConflicts';
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
  donorTargets: readonly SelectOption[];
  group: string;
  items: readonly MaterialItem[];
  columns: readonly FieldDefinition[];
  conflicts: readonly ConjugateConflict[];
  customGroups: readonly string[];
  usage: ReadonlyMap<string, NameUsage>;
  recipeOf: (item: MaterialItem) => readonly RecipeLine[];
  recipeUsers: ReadonlyMap<string, readonly string[]>;
  plateWells: ReadonlyMap<string, number>;
  diluentUses: ReadonlyMap<string, DiluentUse>;
  panelDetectors: ReadonlyMap<string, string>;
  takenNameIds: ReadonlySet<string>;
  fresh: { ids: ReadonlySet<string>; stamp: number };
  removed: RemovedMaterial | undefined;
  editing: MaterialCellEditing;
  actions: MaterialRowActions;
  donorActions: DonorTableActions;
  plateNames: readonly string[];
  openedDonorsId: string | undefined;
  fieldMenu: MaterialFieldMenu;
  sectionActions: MaterialSectionActions;
  onUndo: () => void;
}

const conflictNote = ({ color, panel, items }: ConjugateConflict) =>
  `${panel ? `${panel}: ` : ''}${color} is on ${listWithAnd(items.map(item => item.name))}.${
    panel ? '' : ' If they are stained in separate tubes, give them different panels.'
  }`;

export function WorkbenchMaterialTable({
  group,
  items,
  columns,
  conflicts,
  customGroups,
  usage,
  recipeOf,
  recipeUsers,
  plateWells,
  diluentUses,
  panelDetectors,
  takenNameIds,
  fresh,
  removed,
  editing,
  actions,
  donorTargets,
  donorActions,
  plateNames,
  openedDonorsId,
  fieldMenu,
  sectionActions,
  onUndo,
}: WorkbenchMaterialTableProps) {
  const fieldButtonRef = useRef<HTMLButtonElement>(null);
  const swatchOf = usePlateSwatches();
  const conflictingIds = new Set(
    conflicts.flatMap(conflict => conflict.items.map(item => item.id))
  );
  const rows = items.map((item, index) => [
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
      diluentUse={diluentUses.get(item.id)}
      panelDetectors={panelDetectors.get(item.id) ?? ''}
      hasConjugateConflict={conflictingIds.has(item.id)}
      isNameTaken={takenNameIds.has(item.id)}
      swatch={swatchOf(item.name)}
      freshStamp={fresh.ids.has(item.id) ? fresh.stamp : undefined}
      editing={editing}
      actions={actions}
      donorTargets={donorTargets}
    />,
    item.sources && (
      <WorkbenchMaterialDonorTable
        key={`${item.id}-sources`}
        item={item}
        donors={item.sources}
        span={columns.length + 4}
        plateNames={plateNames}
        isJustOpened={item.id === openedDonorsId}
        actions={donorActions}
      />
    ),
  ]);
  if (removed) {
    rows.splice(Math.min(removed.placeIndex, rows.length), 0, [
      <WorkbenchMaterialUndoRow
        key="undo"
        removed={removed}
        span={columns.length + 3}
        onUndo={onUndo}
      />,
    ]);
  }

  return (
    <>
      {conflicts.map(conflict => (
        <p
          key={`${conflict.panel}|${conflict.color}`}
          className={`mb-2.5 ml-5 text-body-sm ${MATERIAL_WARNING_TEXT}`}
        >
          {conflictNote(conflict)}
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
              labels={columns.map(column => columnLabel(items, column))}
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
