import type { CSSProperties } from 'react';

import { X } from 'lucide-react';

import { Select, Tooltip, type SelectOption } from '@shared/ui';

import { useShowTarget } from '../../../../hooks/useShowTarget';

import { FLOW_CYTOMETRY_CELL, FLUOR_SQUARE, HOVER_ROW } from './flowCytometryTableStyles';
import { WorkbenchFlowCytometryTextCell } from './WorkbenchFlowCytometryTextCell';

import type { FlowCytometryActions } from './useFlowCytometryActions';
import type { MarkerColumn } from '../../../../utils/flowCytometry/flowCytometryStains';
import type { StainedPlace } from '../../../../utils/plateMap/stainSide';
import type { Stain } from '@odysseus/shared-schemas';

interface WorkbenchFlowCytometryStainRowProps {
  stain: Stain;
  columns: readonly MarkerColumn[];
  places: readonly StainedPlace[];
  materialNames: ReadonlyMap<string, string>;
  materialOptions: SelectOption[];
  stainingOptions: SelectOption[];
  actions: FlowCytometryActions;
}

const REMOVE_BUTTON = 'text-muted-foreground hover:text-danger-text';

export function WorkbenchFlowCytometryStainRow({
  stain,
  columns,
  places,
  materialNames,
  materialOptions,
  stainingOptions,
  actions,
}: WorkbenchFlowCytometryStainRowProps) {
  const showTarget = useShowTarget();
  const stainName = stain.name.trim() || 'this stain';
  const plusIds = new Set(stain.plus.map(plus => plus.materialId));

  return (
    <tr className={HOVER_ROW}>
      <td className={FLOW_CYTOMETRY_CELL}>
        <WorkbenchFlowCytometryTextCell
          value={stain.name}
          label="Stain name"
          placeholder="Stain name"
          className="font-semibold"
          onChange={name => actions.renameStain(stain.id, name)}
        />
      </td>
      {columns.map(column => {
        const isIn = stain.markerIds.includes(column.marker.row.id);
        return (
          <td
            key={column.marker.row.id}
            className="bg-[color-mix(in_srgb,var(--laser)_4%,transparent)] p-0 text-center"
            style={{ '--laser': column.laserColor } as CSSProperties}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={isIn}
              aria-label={`${column.label} in ${stainName}`}
              className="grid h-7 w-full place-items-center hover:bg-foreground/[0.06]"
              onClick={() => actions.toggleStainMarker(stain.id, column.marker.row.id)}
            >
              <span
                aria-hidden
                className={`${FLUOR_SQUARE} h-3 w-3 ${
                  isIn ? '' : 'outline outline-1 -outline-offset-1 outline-muted-foreground/40'
                }`}
                style={isIn ? { backgroundColor: column.color } : undefined}
              />
            </button>
          </td>
        );
      })}
      <td className={FLOW_CYTOMETRY_CELL}>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {stain.plus.map(plus => {
            const name = materialNames.get(plus.materialId) ?? 'removed from Materials';
            return (
              <span key={plus.id} className="inline-flex items-center gap-1">
                <span>{name}</span>
                <Select
                  size="xs"
                  isQuiet
                  value={plus.staining || null}
                  placeholder="e.g. Surface"
                  options={stainingOptions}
                  aria-label={`Staining of ${name} in ${stainName}`}
                  onChange={staining =>
                    actions.setPlusStaining(stain.id, plus.id, String(staining ?? ''))
                  }
                />
                <Tooltip content="Remove from this stain">
                  <button
                    type="button"
                    aria-label={`Remove ${name} from ${stainName}`}
                    className={REMOVE_BUTTON}
                    onClick={() => actions.removePlus(stain.id, plus.id)}
                  >
                    <X aria-hidden className="h-3 w-3" />
                  </button>
                </Tooltip>
              </span>
            );
          })}
          <Select
            size="xs"
            isQuiet
            value={null}
            placeholder="Add material"
            options={materialOptions.filter(option => !plusIds.has(String(option.value)))}
            aria-label={`Add a material to ${stainName}`}
            onChange={materialId =>
              actions.addPlus(stain.id, String(materialId), String(stainingOptions[0]?.value ?? ''))
            }
          />
        </span>
      </td>
      <td className={`${FLOW_CYTOMETRY_CELL} text-right`}>
        {places.length ? (
          <span className="inline-flex flex-wrap justify-end gap-x-2">
            {places.map(place => (
              <button
                key={`${place.plateMapId}:${place.name}`}
                type="button"
                className="whitespace-nowrap hover:text-primary"
                onClick={() => showTarget({ type: 'plateMap', shows: place.plateMapId })}
              >
                {place.name} · {place.count}
              </button>
            ))}
          </span>
        ) : (
          <span className="text-warning-text">not placed</span>
        )}
      </td>
      <td className={`${FLOW_CYTOMETRY_CELL} w-px px-2`}>
        <Tooltip content="Remove this stain">
          <button
            type="button"
            aria-label={`Remove ${stainName}`}
            className={`${REMOVE_BUTTON} opacity-0 focus-visible:opacity-100 group-hover:opacity-100`}
            onClick={() => actions.removeStain(stain.id)}
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </td>
    </tr>
  );
}
