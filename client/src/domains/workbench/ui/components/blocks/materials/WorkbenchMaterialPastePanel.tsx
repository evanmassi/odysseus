import { X } from 'lucide-react';

import { Button } from '@shared/ui';

import { materialCount, reviewActionLabel } from '../../../../utils/materials/materialReview';

import {
  MATERIAL_CELL,
  MATERIAL_NAME,
  MATERIAL_TABLE,
  materialRowClass,
} from './materialTableStyles';
import { WorkbenchMaterialKindSelector } from './WorkbenchMaterialKindSelector';

import type { MaterialKind } from './materialSelectOptions';
import type { PasteReview } from './useMaterialAdding';

interface WorkbenchMaterialPastePanelProps {
  paste: PasteReview;
  customGroups: readonly string[];
  onChooseKind: (index: number, kind: MaterialKind) => void;
  onNewGroup: (index: number) => void;
  onToggleKeep: (index: number) => void;
  onDropRow: (index: number) => void;
  onAdd: () => void;
  onCancel: () => void;
}

const PASTE_CELL = `${MATERIAL_CELL} !py-1`;

export function WorkbenchMaterialPastePanel({
  paste,
  customGroups,
  onChooseKind,
  onNewGroup,
  onToggleKeep,
  onDropRow,
  onAdd,
  onCancel,
}: WorkbenchMaterialPastePanelProps) {
  return (
    <div className="mt-3.5 max-w-4xl">
      <p className="mb-1.5 text-body-sm text-muted-foreground">
        {materialCount(paste.rows.length)} from {paste.source}. Check them, then add.
      </p>
      <table className={MATERIAL_TABLE}>
        <tbody>
          {paste.rows.map((row, index) => (
            <tr key={row.item.id} className={materialRowClass(index)}>
              <td className={`${PASTE_CELL} ${MATERIAL_NAME}`}>{row.item.name}</td>
              <td className={PASTE_CELL}>
                <WorkbenchMaterialKindSelector
                  kind={row.item}
                  customGroups={customGroups}
                  onChoose={kind => onChooseKind(index, kind)}
                  onNewGroup={() => onNewGroup(index)}
                />
              </td>
              <td className={`${PASTE_CELL} text-muted-foreground`}>
                {row.duplicateId ? (
                  <>
                    <span className="font-semibold text-warning-text">
                      Already listed: {row.isKeptBoth ? 'keeping both' : 'will merge'}
                    </span>
                    <Button variant="ghost" size="xs" onClick={() => onToggleKeep(index)}>
                      {row.isKeptBoth ? 'Merge' : 'Keep both'}
                    </Button>
                  </>
                ) : (
                  <span className="italic">{row.why}</span>
                )}
              </td>
              <td className="w-px px-2 text-right">
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  aria-label={`Leave ${row.item.name} out`}
                  title="Leave this one out"
                  onClick={() => onDropRow(index)}
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2.5 flex items-center gap-2.5">
        <Button variant="primary" size="sm" onClick={onAdd}>
          + {reviewActionLabel(paste.rows)}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
