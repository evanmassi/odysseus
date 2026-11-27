import { Fragment, useState, type CSSProperties, type ReactNode } from 'react';

import { Pencil, X } from 'lucide-react';

import { Autocomplete, Button, Tooltip, type SelectOption } from '@shared/ui';

import { dilutionFactor } from '../../../../utils/flowCytometry/flowCytometryPanel';
import { RATIO_NOTATION } from '../../../../utils/formulas/quantities';
import { CONJUGATE_FIELD } from '../../../../utils/materials/conjugateConflicts';
import { AMOUNT_FIELD } from '../../../../utils/materials/materialCatalog';
import { WorkbenchMaterialPick } from '../../board/WorkbenchMaterialPick';
import { TREE_BRANCH_INDENT, WorkbenchTreeRail } from '../../board/WorkbenchTreeRail';
import { WorkbenchConjugateField } from '../../fluors/WorkbenchConjugateField';

import {
  FLOW_CYTOMETRY_CELL,
  FLOW_CYTOMETRY_FIELD,
  FLOW_CYTOMETRY_PICK_FIELD,
  FLUOR_SQUARE,
  HOVER_ROW,
  LIT_ROW,
  SUB_LIT_ROW,
  SUB_LIT_ROW_EDGE,
} from './flowCytometryTableStyles';
import { WorkbenchFlowCytometryTextCell } from './WorkbenchFlowCytometryTextCell';

import type { FlowCytometryActions } from './useFlowCytometryActions';
import type { PanelMarker } from '../../../../utils/flowCytometry/flowCytometryPanel';
import type { MarkerAmount } from '../../../../utils/flowCytometry/markerAmount';
import type { MaterialItem } from '@odysseus/shared-schemas';

interface WorkbenchFlowCytometryMarkerRowProps {
  marker: PanelMarker;
  color: string | undefined;
  tone?: string;
  lead?: ReactNode;
  subLead?: ReactNode;
  detectorCell: ReactNode;
  conflictWording: string;
  stainings: readonly string[];
  amounts: readonly StainAmount[];
  secondaryAmounts: readonly StainAmount[];
  secondaryPick: SecondaryPick;
  actions: FlowCytometryActions;
}

export interface StainAmount {
  text?: string;
  problem?: string;
}

export interface SecondaryPick {
  options: SelectOption[];
  detectorFor: (material: MaterialItem) => string | undefined;
}

const SECONDARY_RAIL_LEFT = 12;
const DETECTOR_CELL_COUNT = 2;
const NAME_COLUMN_COUNT = 4;

function AmountCell({
  amount,
  name,
  onChange,
}: {
  amount: MarkerAmount | undefined;
  name: string;
  onChange: (value: string) => void;
}) {
  const placeholder = amount?.unit === RATIO_NOTATION ? 'N' : '';
  return (
    <td className={`${FLOW_CYTOMETRY_CELL} text-right font-mono`}>
      {amount ? (
        <span className="inline-flex items-center justify-end gap-0.5">
          {amount.unit === RATIO_NOTATION && '1:'}
          <span className="inline-edit" data-align="end">
            <input
              value={amount.value}
              placeholder={placeholder}
              aria-label={`${amount.label} of ${name}`}
              spellCheck={false}
              autoComplete="off"
              className={`${FLOW_CYTOMETRY_FIELD} text-right font-mono`}
              style={{
                width: `calc(${Math.max(1, (amount.value || placeholder).length)}ch + 2px)`,
              }}
              onChange={event => {
                const typed = event.target.value;
                onChange(amount.unit === RATIO_NOTATION ? dilutionFactor(typed) : typed);
              }}
            />
          </span>
          {amount.unit !== RATIO_NOTATION && (
            <span className="text-muted-foreground">{amount.unit}</span>
          )}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </td>
  );
}

function AmountCells({ amounts }: { amounts: readonly StainAmount[] }) {
  return (
    <>
      {amounts.map((amount, at) => (
        <td key={at} className={`${FLOW_CYTOMETRY_CELL} text-right`}>
          {amount.text ?? (
            <Tooltip content={amount.problem ?? 'Set a dil.'}>
              <span className="text-muted-foreground">—</span>
            </Tooltip>
          )}
        </td>
      ))}
    </>
  );
}

export function WorkbenchFlowCytometryMarkerRow({
  marker,
  color,
  tone,
  lead,
  subLead,
  detectorCell,
  conflictWording,
  stainings,
  amounts,
  secondaryAmounts,
  secondaryPick,
  actions,
}: WorkbenchFlowCytometryMarkerRowProps) {
  const { row, material, secondary } = marker;
  const [isPickingSecondary, setIsPickingSecondary] = useState(false);
  const name = [material?.name.trim()].find(Boolean) ?? 'this marker';
  const writeMaterial = (key: string) => (value: string) =>
    material && actions.writeMaterial(material.id, key, value);
  const stainingOptions = stainings.map(staining => ({ value: staining, label: staining }));
  const secondaryMaterial = secondary?.material;
  const secondaryName = secondaryMaterial?.name.trim() ?? 'removed from Materials';

  const secondaryPicker = (canClear: boolean) => (
    <WorkbenchMaterialPick
      label="Secondary"
      newLabel="New secondary…"
      example="SA-PE"
      options={secondaryPick.options}
      onPick={materialId => {
        setIsPickingSecondary(false);
        actions.setSecondary(row.id, materialId, secondaryPick.detectorFor);
      }}
      onCreate={text => {
        setIsPickingSecondary(false);
        actions.createSecondary(row.id, text, secondaryPick.detectorFor);
      }}
      clear={
        canClear
          ? {
              label: 'No secondary',
              onClear: () => {
                setIsPickingSecondary(false);
                actions.setSecondary(row.id, undefined, secondaryPick.detectorFor);
              },
            }
          : undefined
      }
    />
  );

  const mainRow = (
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
          {material && !secondary && (
            <span
              className={
                marker.fluorColor
                  ? 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
                  : ''
              }
            >
              {secondaryPicker(false)}
            </span>
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
            options={stainingOptions}
            aria-label={`Staining of ${name}`}
            inputClassName={`${FLOW_CYTOMETRY_PICK_FIELD} w-20`}
            onChange={staining => actions.changeRow(row.id, { staining: staining })}
          />
        </span>
      </td>
      <AmountCell amount={marker.amount} name={name} onChange={writeMaterial(AMOUNT_FIELD)} />
      <AmountCells amounts={amounts} />
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

  if (!secondary) return mainRow;
  return (
    <Fragment>
      {mainRow}
      <tr
        className={tone ? SUB_LIT_ROW : HOVER_ROW}
        style={tone ? ({ '--row-tone': tone } as CSSProperties) : undefined}
      >
        {subLead}
        {Array.from({ length: DETECTOR_CELL_COUNT }, (_, at) => (
          <td
            key={at}
            className={`${FLOW_CYTOMETRY_CELL} ${tone && at === 0 ? SUB_LIT_ROW_EDGE : ''}`}
          />
        ))}
        <td colSpan={NAME_COLUMN_COUNT} className={`${FLOW_CYTOMETRY_CELL} relative`}>
          <WorkbenchTreeRail place="end" color={color} left={SECONDARY_RAIL_LEFT} />
          <span
            className="flex items-center gap-1.5"
            style={{ paddingLeft: SECONDARY_RAIL_LEFT + TREE_BRANCH_INDENT }}
          >
            {isPickingSecondary ? (
              secondaryPicker(true)
            ) : (
              <>
                <span className={secondaryMaterial ? '' : 'italic text-muted-foreground'}>
                  {secondaryName}
                </span>
                <Tooltip content="Change the secondary">
                  <button
                    type="button"
                    aria-label={`Change the secondary of ${name}`}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setIsPickingSecondary(true)}
                  >
                    <Pencil aria-hidden className="h-3 w-3" />
                  </button>
                </Tooltip>
              </>
            )}
          </span>
        </td>
        <td className={FLOW_CYTOMETRY_CELL}>
          <span className="inline-edit">
            <Autocomplete
              value={secondary.staining}
              placeholder="e.g. Secondary"
              options={stainingOptions}
              aria-label={`Staining of ${secondaryName}`}
              inputClassName={`${FLOW_CYTOMETRY_PICK_FIELD} w-20`}
              onChange={staining => actions.setSecondaryStaining(row.id, staining)}
            />
          </span>
        </td>
        <AmountCell
          amount={secondary.amount}
          name={secondaryName}
          onChange={value =>
            secondaryMaterial && actions.writeMaterial(secondaryMaterial.id, AMOUNT_FIELD, value)
          }
        />
        <AmountCells amounts={secondaryAmounts} />
        <td className={FLOW_CYTOMETRY_CELL} />
      </tr>
    </Fragment>
  );
}
