import { useMemo } from 'react';
import type { CSSProperties } from 'react';

import { Button, Select } from '@shared/ui';

import {
  emptyMix,
  fmoMix,
  fullStainMix,
  mixColumns,
  singleStainMixes,
  unstainedMix,
} from '../../../../utils/cytometer/cytometerMixes';

import { FLUOROCHROME_SQUARE } from './cytometerTableStyles';
import { WorkbenchCytometerMixRow } from './WorkbenchCytometerMixRow';

import type { CytometerActions } from './useCytometerActions';
import type { PanelLayout } from '../../../../utils/cytometer/cytometerPanel';
import type { CytometerBlock, MaterialItem } from '@odysseus/shared-schemas';

interface WorkbenchCytometerMixesProps {
  block: CytometerBlock;
  layout: PanelLayout;
  materials: readonly MaterialItem[];
  materialNames: ReadonlyMap<string, string>;
  mixWells: ReadonlyMap<string, number>;
  steps: readonly string[];
  actions: CytometerActions;
}

const HEAD_CELL =
  'whitespace-nowrap px-3 py-2 text-left type-label text-label-2xs font-semibold text-muted-foreground';

export function WorkbenchCytometerMixes({
  block,
  layout,
  materials,
  materialNames,
  mixWells,
  steps,
  actions,
}: WorkbenchCytometerMixesProps) {
  const columns = useMemo(() => mixColumns(layout), [layout]);
  const materialOptions = useMemo(
    () => materials.map(item => ({ value: item.id, label: item.name.trim() })),
    [materials]
  );
  const stepOptions = steps.map(step => ({ value: step, label: step }));
  const fmoOptions = columns.map(column => ({ value: column.stain.row.id, label: column.label }));

  return (
    <section aria-label="Mixes" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="mr-2 type-label text-label-xs font-semibold text-muted-foreground">Mixes</h4>
        <Button size="xs" variant="ghost" onClick={() => actions.addMixes([fullStainMix(columns)])}>
          Full stain
        </Button>
        <Button size="xs" variant="ghost" onClick={() => actions.addMixes([unstainedMix()])}>
          Unstained
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={!columns.length}
          onClick={() => actions.addMixes(singleStainMixes(columns))}
        >
          Single stains, one per antibody
        </Button>
        <Select
          size="xs"
          isQuiet
          value={null}
          placeholder="FMO leaving out…"
          options={fmoOptions}
          disabled={!columns.length}
          aria-label="Add an FMO leaving out"
          className="w-48"
          onChange={rowId => {
            const mix = fmoMix(columns, String(rowId));
            if (mix) actions.addMixes([mix]);
          }}
        />
        <Button size="xs" variant="ghost" onClick={() => actions.addMixes([emptyMix()])}>
          Empty mix
        </Button>
      </div>

      {block.mixes.length === 0 ? (
        <p className="text-body-sm italic text-muted-foreground">
          A mix is a name and the panel stains it gets: the full stain, an unstained control, single
          stains, FMOs or any set you tick. Its name is what you put on the wells.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-y-0.5">
            <thead>
              <tr>
                <th className={HEAD_CELL}>Mix</th>
                {columns.map(column => (
                  <th
                    key={column.stain.row.id}
                    className="border-t-[3px] border-t-[color:var(--laser)] bg-[color-mix(in_srgb,var(--laser)_8%,transparent)] px-2 py-1.5 text-center"
                    style={{ '--laser': column.laserColor } as CSSProperties}
                  >
                    <span className="block whitespace-nowrap text-label-xs font-semibold text-foreground">
                      {column.stain.marker || column.label}
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-label-2xs text-muted-foreground">
                      <span
                        aria-hidden
                        className={FLUOROCHROME_SQUARE}
                        style={{ backgroundColor: column.color }}
                      />
                      {column.stain.fluorochrome}
                    </span>
                  </th>
                ))}
                <th className={HEAD_CELL}>Plus</th>
                <th className={`${HEAD_CELL} text-right`}>On the plate</th>
                <th className={HEAD_CELL} />
              </tr>
            </thead>
            <tbody>
              {block.mixes.map(mix => (
                <WorkbenchCytometerMixRow
                  key={mix.id}
                  mix={mix}
                  columns={columns}
                  wellCount={mixWells.get(mix.name) ?? 0}
                  materialNames={materialNames}
                  materialOptions={materialOptions}
                  stepOptions={stepOptions}
                  actions={actions}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
