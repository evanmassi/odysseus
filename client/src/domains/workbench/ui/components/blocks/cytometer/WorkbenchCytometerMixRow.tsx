import type { CSSProperties } from 'react';

import { X } from 'lucide-react';

import { Select, Tooltip, type SelectOption } from '@shared/ui';

import { CYTOMETER_CELL, FLUOROCHROME_SQUARE } from './cytometerTableStyles';
import { WorkbenchCytometerTextCell } from './WorkbenchCytometerTextCell';

import type { CytometerActions } from './useCytometerActions';
import type { MixColumn } from '../../../../utils/cytometer/cytometerMixes';
import type { CytometerBlock } from '@odysseus/shared-schemas';

interface WorkbenchCytometerMixRowProps {
  mix: CytometerBlock['mixes'][number];
  columns: readonly MixColumn[];
  wellCount: number;
  materialNames: ReadonlyMap<string, string>;
  materialOptions: SelectOption[];
  stepOptions: SelectOption[];
  actions: CytometerActions;
}

const REMOVE_BUTTON = 'text-muted-foreground hover:text-danger-text';

export function WorkbenchCytometerMixRow({
  mix,
  columns,
  wellCount,
  materialNames,
  materialOptions,
  stepOptions,
  actions,
}: WorkbenchCytometerMixRowProps) {
  const mixName = mix.name.trim() || 'this mix';
  const plusIds = new Set(mix.plus.map(plus => plus.materialId));

  return (
    <tr className="group">
      <td className={CYTOMETER_CELL}>
        <WorkbenchCytometerTextCell
          value={mix.name}
          label="Mix name"
          placeholder="Mix name"
          className="font-semibold"
          onChange={name => actions.renameMix(mix.id, name)}
        />
      </td>
      {columns.map(column => {
        const isIn = mix.rowIds.includes(column.stain.row.id);
        return (
          <td
            key={column.stain.row.id}
            className="bg-[color-mix(in_srgb,var(--laser)_4%,transparent)] p-0 text-center"
            style={{ '--laser': column.laserColor } as CSSProperties}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={isIn}
              aria-label={`${column.label} in ${mixName}`}
              className="grid h-7 w-full place-items-center hover:bg-foreground/[0.06]"
              onClick={() => actions.toggleMixStain(mix.id, column.stain.row.id)}
            >
              <span
                aria-hidden
                className={`${FLUOROCHROME_SQUARE} h-3 w-3 ${
                  isIn ? '' : 'outline outline-1 -outline-offset-1 outline-muted-foreground/40'
                }`}
                style={isIn ? { backgroundColor: column.color } : undefined}
              />
            </button>
          </td>
        );
      })}
      <td className={CYTOMETER_CELL}>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {mix.plus.map(plus => {
            const name = materialNames.get(plus.materialId) ?? 'no longer in Materials';
            return (
              <span key={plus.id} className="inline-flex items-center gap-1">
                <span>{name}</span>
                <Select
                  size="xs"
                  isQuiet
                  value={plus.stain || null}
                  placeholder="Stain step"
                  options={stepOptions}
                  aria-label={`Stain step of ${name} in ${mixName}`}
                  onChange={stain => actions.setPlusStain(mix.id, plus.id, String(stain ?? ''))}
                />
                <Tooltip content="Take it out of this mix">
                  <button
                    type="button"
                    aria-label={`Take ${name} out of ${mixName}`}
                    className={REMOVE_BUTTON}
                    onClick={() => actions.removePlus(mix.id, plus.id)}
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
            placeholder="+ Material"
            options={materialOptions.filter(option => !plusIds.has(String(option.value)))}
            aria-label={`Add a material to ${mixName}`}
            className="w-36"
            onChange={materialId =>
              actions.addPlus(mix.id, String(materialId), String(stepOptions[0]?.value ?? ''))
            }
          />
        </span>
      </td>
      <td className={`${CYTOMETER_CELL} text-right`}>
        {wellCount ? (
          `${wellCount} ${wellCount === 1 ? 'well' : 'wells'}`
        ) : (
          <span className="text-warning-text">not placed</span>
        )}
      </td>
      <td className={`${CYTOMETER_CELL} w-px px-2`}>
        <Tooltip content="Remove this mix">
          <button
            type="button"
            aria-label={`Remove ${mixName}`}
            className={`${REMOVE_BUTTON} opacity-0 focus-visible:opacity-100 group-hover:opacity-100`}
            onClick={() => actions.removeMix(mix.id)}
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </td>
    </tr>
  );
}
