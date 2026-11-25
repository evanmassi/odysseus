import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Button, DropdownMenu, MenuItem, SubsectionHeader } from '@shared/ui';

import {
  emptyStain,
  fmoStain,
  fullStain,
  markerColumns,
  singleStains,
  unstainedControl,
} from '../../../../utils/flowCytometry/flowCytometryStains';
import { SECTION_RULE } from '../../board/sectionRuleClass';

import {
  FLOW_CYTOMETRY_HEAD_CELL,
  FLOW_CYTOMETRY_NUMBER_HEAD_CELL,
  FLUOR_SQUARE,
} from './flowCytometryTableStyles';
import { WorkbenchFlowCytometryStainRow } from './WorkbenchFlowCytometryStainRow';

import type { FlowCytometryActions } from './useFlowCytometryActions';
import type { PanelLayout } from '../../../../utils/flowCytometry/flowCytometryPanel';
import type { StainedPlace } from '../../../../utils/plateMap/stainSide';
import type { FlowCytometryPanel, MaterialItem } from '@odysseus/shared-schemas';

interface WorkbenchFlowCytometryStainsProps {
  panel: FlowCytometryPanel;
  layout: PanelLayout;
  materials: readonly MaterialItem[];
  materialNames: ReadonlyMap<string, string>;
  stainPlaces: ReadonlyMap<string, readonly StainedPlace[]>;
  stainings: readonly string[];
  actions: FlowCytometryActions;
}

export function WorkbenchFlowCytometryStains({
  panel,
  layout,
  materials,
  materialNames,
  stainPlaces,
  stainings,
  actions,
}: WorkbenchFlowCytometryStainsProps) {
  const columns = useMemo(() => markerColumns(layout), [layout]);
  const materialOptions = useMemo(
    () => materials.map(item => ({ value: item.id, label: item.name.trim() })),
    [materials]
  );
  const stainingOptions = stainings.map(staining => ({ value: staining, label: staining }));
  const [fmoMenuAt, setFmoMenuAt] = useState<CSSProperties>();
  const fmoRef = useRef<HTMLSpanElement>(null);

  return (
    <section aria-label="Stains" className="mt-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <SubsectionHeader title="Stains" meta={panel.stains.length || undefined} />
        <span aria-hidden className={SECTION_RULE} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button size="xs" variant="ghost" onClick={() => actions.addStains([fullStain(columns)])}>
          Full stain
        </Button>
        <span
          role="group"
          aria-label="Controls"
          className="inline-flex items-center gap-1 border border-line-faint px-1 py-0.5"
        >
          <Button size="xs" variant="ghost" onClick={() => actions.addStains([unstainedControl()])}>
            Unstained
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={!columns.length}
            onClick={() => actions.addStains(singleStains(columns))}
          >
            Single stain
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
                key={column.marker.row.id}
                label={column.label}
                onClick={() => {
                  setFmoMenuAt(undefined);
                  const stain = fmoStain(columns, column.marker.row.id);
                  if (stain) actions.addStains([stain]);
                }}
              />
            ))}
          </DropdownMenu>
        </span>
        <Button size="xs" variant="ghost" onClick={() => actions.addStains([emptyStain()])}>
          Empty stain
        </Button>
      </div>

      {panel.stains.length > 0 && (
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-y-0.5">
            <thead>
              <tr>
                <th className={FLOW_CYTOMETRY_HEAD_CELL}>Stain</th>
                {columns.map(column => (
                  <th
                    key={column.marker.row.id}
                    className="border-t-[3px] border-t-[color:var(--laser)] bg-[color-mix(in_srgb,var(--laser)_8%,transparent)] px-2 py-1.5 text-center"
                    style={{ '--laser': column.laserColor } as CSSProperties}
                  >
                    <span className="block whitespace-nowrap text-label-xs font-semibold text-foreground">
                      {column.marker.markerName || column.label}
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-label-2xs text-muted-foreground">
                      <span
                        aria-hidden
                        className={FLUOR_SQUARE}
                        style={{ backgroundColor: column.color }}
                      />
                      {column.marker.fluor}
                    </span>
                  </th>
                ))}
                <th className={FLOW_CYTOMETRY_HEAD_CELL}>Plus</th>
                <th className={FLOW_CYTOMETRY_NUMBER_HEAD_CELL}>On the plate</th>
                <th className={FLOW_CYTOMETRY_HEAD_CELL} />
              </tr>
            </thead>
            <tbody>
              {panel.stains.map(stain => (
                <WorkbenchFlowCytometryStainRow
                  key={stain.id}
                  stain={stain}
                  columns={columns}
                  places={stainPlaces.get(stain.id) ?? []}
                  materialNames={materialNames}
                  materialOptions={materialOptions}
                  stainingOptions={stainingOptions}
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
