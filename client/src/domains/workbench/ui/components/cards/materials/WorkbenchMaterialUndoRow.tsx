import { Button } from '@shared/ui';

import { MATERIAL_ACTIONS_CELL, MATERIAL_CELL } from './materialTableStyles';

import type { RemovedMaterial } from './useMaterialRemoval';

interface WorkbenchMaterialUndoRowProps {
  removed: RemovedMaterial;
  span: number;
  onUndo: () => void;
}

export function WorkbenchMaterialUndoRow({ removed, span, onUndo }: WorkbenchMaterialUndoRowProps) {
  return (
    <tr>
      <td colSpan={span} className={`${MATERIAL_CELL} !py-1.5 italic text-muted-foreground`}>
        {removed.verb} {removed.item.name || 'a material'}
      </td>
      <td className={MATERIAL_ACTIONS_CELL}>
        <Button variant="ghost" size="xs" onClick={onUndo}>
          Undo
        </Button>
      </td>
    </tr>
  );
}
