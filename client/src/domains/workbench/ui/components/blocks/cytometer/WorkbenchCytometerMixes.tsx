import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Button, DropdownMenu, MenuItem, SubsectionHeader } from '@shared/ui';

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
  const [fmoMenuAt, setFmoMenuAt] = useState<CSSProperties>();
  const fmoRef = useRef<HTMLSpanElement>(null);

  return (
    <section aria-label="Mixes" className="flex flex-col gap-2.5">
      <SubsectionHeader title="Mixes" meta={block.mixes.length || undefined} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button size="xs" variant="ghost" onClick={() => actions.addMixes([fullStainMix(columns)])}>
          Full Stain
        </Button>
        <span
          role="group"
          aria-label="Controls"
          className="inline-flex items-center gap-1 border border-line-faint px-1 py-0.5"
        >
          <Button size="xs" variant="ghost" onClick={() => actions.addMixes([unstainedMix()])}>
            Unstained
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={!columns.length}
            onClick={() => actions.addMixes(singleStainMixes(columns))}
          >
            Single Stain
          </Button>
          <span ref={fmoRef} className="inline-flex">
            <Button
              size="xs"
              variant="ghost"
              disabled={!columns.length}
              aria-haspopup="menu"
              aria-expanded={!!fmoMenuAt}
              onClick={() => {
                const trigger = fmoRef.current?.getBoundingClientRect();
                const isOpening = !fmoMenuAt && trigger;
                setFmoMenuAt(
                  isOpening ? { left: trigger.left, top: trigger.bottom + 4 } : undefined
                );
              }}
            >
              FMO
            </Button>
          </span>
          <DropdownMenu
            isOpen={!!fmoMenuAt}
            onClose={() => setFmoMenuAt(undefined)}
            triggerRef={fmoRef}
            portal
            align="start"
            aria-label="Leave out"
            className="min-w-48 py-1"
            style={fmoMenuAt}
          >
            {columns.map(column => (
              <MenuItem
                key={column.stain.row.id}
                label={column.label}
                onClick={() => {
                  setFmoMenuAt(undefined);
                  const mix = fmoMix(columns, column.stain.row.id);
                  if (mix) actions.addMixes([mix]);
                }}
              />
            ))}
          </DropdownMenu>
        </span>
        <Button size="xs" variant="ghost" onClick={() => actions.addMixes([emptyMix()])}>
          Empty Mix
        </Button>
      </div>

      {block.mixes.length > 0 && (
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
