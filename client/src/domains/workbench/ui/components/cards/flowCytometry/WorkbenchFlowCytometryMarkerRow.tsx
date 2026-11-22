import type { CSSProperties, ReactNode } from 'react';

import { X } from 'lucide-react';

import { Autocomplete, Button, Tooltip } from '@shared/ui';

import { CONJUGATE_FIELD } from '../../../../utils/materials/conjugateConflicts';
import { WorkbenchConjugateField } from '../../fluors/WorkbenchConjugateField';

import {
  FLOW_CYTOMETRY_CELL,
  FLOW_CYTOMETRY_FIELD,
  FLOW_CYTOMETRY_PICK_FIELD,
  FLUOR_SQUARE,
  HOVER_ROW,
  LIT_ROW,
} from './flowCytometryTableStyles';
import { WorkbenchFlowCytometryTextCell } from './WorkbenchFlowCytometryTextCell';

import type { FlowCytometryActions } from './useFlowCytometryActions';
import type { PanelMarker } from '../../../../utils/flowCytometry/flowCytometryPanel';

interface WorkbenchFlowCytometryMarkerRowProps {
  marker: PanelMarker;
  color: string | undefined;
  tone?: string;
  lead?: ReactNode;
  detectorCell: ReactNode;
  conflictWording: string;
  stainings: readonly string[];
  amount: StainAmount;
  actions: FlowCytometryActions;
}

export interface StainAmount {
  text?: string;
  problem?: string;
}

export function WorkbenchFlowCytometryMarkerRow({
  marker: marker,
  color,
  tone,
  lead,
  detectorCell,
  conflictWording,
  stainings,
  amount,
  actions,
}: WorkbenchFlowCytometryMarkerRowProps) {
  const { row, material } = marker;
  const name = [material?.name.trim()].find(Boolean) ?? 'this marker';
  const writeMaterial = (key: string) => (value: string) =>
    material && actions.writeMaterial(material.id, key, value);

  return (
    <tr
      className={tone ? `group ${LIT_ROW}` : HOVER_ROW}
      style={tone ? ({ '--row-tone': tone } as CSSProperties) : undefined}
    >
      {lead}
      {detectorCell}
      <td className={FLOW_CYTOMETRY_CELL}>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className={FLUOR_SQUARE}
            style={{ backgroundColor: color ?? 'hsl(var(--muted-foreground))' }}
          />
          {material && marker.isFluorEditable ? (
            <span className="inline-edit">
              <WorkbenchConjugateField
                value={marker.fluor}
                label={`Fluor of ${name}`}
                placeholder="Fluor"
                includesOtherConjugates={false}
                inputClassName={`${FLOW_CYTOMETRY_PICK_FIELD} w-28`}
                onChange={writeMaterial(CONJUGATE_FIELD)}
              />
            </span>
          ) : (
            <span>{marker.fluor}</span>
          )}
        </span>
        {marker.misplacement && (
          <span className="flex items-center gap-2 text-label-xs text-warning-text">
            <Tooltip content={marker.misplacement.text}>
              <span>Works best on {marker.misplacement.detectorId}</span>
            </Tooltip>
            <Button
              size="xs"
              variant="ghost"
              aria-label={`Move ${name} to ${marker.misplacement.detectorId}`}
              onClick={() =>
                marker.misplacement &&
                actions.changeRow(row.id, { detectorId: marker.misplacement.detectorId })
              }
            >
              Move
            </Button>
          </span>
        )}
        {marker.sharesDetectorWith.length > 0 && (
          <span className="block text-label-xs text-danger-text">
            {conflictWording} {marker.sharesDetectorWith.join(', ')}
          </span>
        )}
      </td>
      <td className={`${FLOW_CYTOMETRY_CELL} font-semibold`}>
        {material ? (
          <WorkbenchFlowCytometryTextCell
            value={marker.markerName}
            label={`Marker of ${name}`}
            placeholder={material.name}
            className="font-semibold"
            onChange={writeMaterial(marker.markerKey)}
          />
        ) : (
          <span className="font-normal italic text-muted-foreground">removed from Materials</span>
        )}
      </td>
      <td className={FLOW_CYTOMETRY_CELL}>
        {material && (
          <WorkbenchFlowCytometryTextCell
            value={marker.clone}
            label={`Clone of ${name}`}
            placeholder="—"
            onChange={writeMaterial('clone')}
          />
        )}
      </td>
      <td className={FLOW_CYTOMETRY_CELL}>
        {material && (
          <WorkbenchFlowCytometryTextCell
            value={marker.isotype}
            label={`Isotype of ${name}`}
            placeholder="—"
            onChange={writeMaterial('isotype')}
          />
        )}
      </td>
      <td className={FLOW_CYTOMETRY_CELL}>
        <span className="inline-edit">
          <Autocomplete
            value={row.staining}
            placeholder="e.g. Surface"
            options={stainings.map(staining => ({ value: staining, label: staining }))}
            aria-label={`Staining of ${name}`}
            inputClassName={`${FLOW_CYTOMETRY_PICK_FIELD} w-20`}
            onChange={staining => actions.changeRow(row.id, { staining: staining })}
          />
        </span>
      </td>
      <td className={`${FLOW_CYTOMETRY_CELL} text-right font-mono`}>
        <span className="inline-flex items-center justify-end gap-0.5">
          1:
          <span className="inline-edit" data-align="end">
            <input
              value={row.dilution}
              placeholder="N"
              aria-label={`Dilution factor of ${name}`}
              spellCheck={false}
              autoComplete="off"
              className={`${FLOW_CYTOMETRY_FIELD} w-12 font-mono`}
              onChange={event => actions.setDilution(row.id, event.target.value)}
            />
          </span>
        </span>
      </td>
      <td className={`${FLOW_CYTOMETRY_CELL} text-right`}>
        {amount.text ?? (
          <Tooltip content={amount.problem ?? 'Set a dilution factor'}>
            <span className="text-muted-foreground">—</span>
          </Tooltip>
        )}
      </td>
      <td className={`${FLOW_CYTOMETRY_CELL} w-px px-2`}>
        <Tooltip content="Remove from the panel">
          <button
            type="button"
            aria-label={`Remove ${name} from the panel`}
            className="text-muted-foreground opacity-0 hover:text-danger-text focus-visible:opacity-100 group-hover:opacity-100"
            onClick={() => actions.removeMarker(row.id)}
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </td>
    </tr>
  );
}
