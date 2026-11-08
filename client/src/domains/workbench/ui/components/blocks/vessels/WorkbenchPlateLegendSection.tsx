import { useState } from 'react';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { PICK_NAME_ATTRIBUTE } from '../../tray/useTrayPickDrag';

import { useUpdateVesselMap } from './useUpdateVesselMap';

import type { DoseHeaders, PlateBand } from '../../../../utils/vessels/plateLayers';
import type { PlateLine, VesselMapBlock } from '@odysseus/shared-schemas';

interface LegendCount {
  name: string;
  count: number;
  key: string;
}

interface WorkbenchPlateLegendSectionProps {
  block: VesselMapBlock;
  colorLine: PlateLine | undefined;
  counts: readonly LegendCount[];
  bands: readonly PlateBand[];
  headers: DoseHeaders | undefined;
}

const PALETTE = [
  '#f0b35b',
  '#e8875a',
  '#d97a7a',
  '#e88fbf',
  '#b48ee6',
  '#8b9cf0',
  '#6fa8e8',
  '#8fd3e8',
  '#5cc8bd',
  '#6fbf73',
  '#b8d36a',
  '#c9ccd3',
  '#b9802a',
  '#b85a32',
  '#a84848',
  '#b5568a',
  '#7d58b3',
  '#5565c2',
  '#3d73b8',
  '#4b9bb8',
  '#2e8f86',
  '#3f8a47',
  '#83a033',
  '#7d8494',
] as const;
const SHADE_STEPS = [100, 60, 30] as const;
const ITEM = 'inline-flex items-center gap-1.5 text-body-sm text-foreground';
const SWATCH = 'h-3.5 w-3.5 flex-none rounded-[3px]';

export function WorkbenchPlateLegendSection({
  block,
  colorLine,
  counts,
  bands,
  headers,
}: WorkbenchPlateLegendSectionProps) {
  const updateVesselMap = useUpdateVesselMap(block);
  const [recoloringId, setRecoloringId] = useState<string>();
  const [renamingId, setRenamingId] = useState<string>();
  const countOf = new Map(counts.map(count => [count.key, count]));
  const values = (colorLine?.values ?? []).filter(value => countOf.has(value.id));
  const used = countOf.get('used');
  const hasSeries =
    !!colorLine &&
    Object.values(block.cells).some(lines => lines[colorLine.id]?.seriesId !== undefined);

  const changeValue = (valueId: string, change: { text?: string; color?: string }) =>
    updateVesselMap(draft => {
      const value = draft.lines
        .find(line => line.id === colorLine?.id)
        ?.values.find(candidate => candidate.id === valueId);
      if (value) Object.assign(value, change);
    });

  const finishRename = (valueId: string, text: string) => {
    setRenamingId(undefined);
    if (text.trim()) changeValue(valueId, { text: text.trim() });
  };

  return (
    <div className="flex flex-col gap-2 border-t border-line-soft pt-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {values.map(value => {
          const count = countOf.get(value.id);
          return (
            <span key={value.id} className={ITEM} {...{ [PICK_NAME_ATTRIBUTE]: count?.name }}>
              <button
                type="button"
                aria-label={`Change the color of ${value.text}`}
                className={`${SWATCH} hover:outline hover:outline-2 hover:outline-offset-1 hover:outline-foreground/50`}
                style={{ backgroundColor: value.color }}
                onClick={() => setRecoloringId(recoloringId === value.id ? undefined : value.id)}
              />
              {renamingId === value.id ? (
                <input
                  ref={focusOnMount}
                  defaultValue={value.text}
                  aria-label={`Rename ${value.text}`}
                  spellCheck={false}
                  className="w-32 border-b border-primary bg-transparent text-body-sm text-foreground outline-none"
                  onBlur={event => finishRename(value.id, event.currentTarget.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') setRenamingId(undefined);
                  }}
                />
              ) : (
                <button
                  type="button"
                  title="Rename"
                  className="hover:underline"
                  onClick={() => setRenamingId(value.id)}
                >
                  {value.text}
                </button>
              )}
              <b className="font-mono text-data-sm">{count?.count}</b>
            </span>
          );
        })}
        {hasSeries && (
          <span className={`${ITEM} text-muted-foreground`}>
            <span className="inline-flex gap-0.5">
              {SHADE_STEPS.map(strength => (
                <i
                  key={strength}
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${values[0]?.color ?? PALETTE[6]} ${strength}%, transparent)`,
                  }}
                />
              ))}
            </span>
            stronger color = higher dose
            {headers && ` (${headers.axis === 'col' ? 'columns' : 'rows'} show the dose)`}
          </span>
        )}
        {bands.map(band => (
          <span key={band.text} className={ITEM}>
            <i
              className="h-3 w-3.5 flex-none rounded-[3px] border"
              style={{
                borderColor: band.color,
                backgroundColor: `color-mix(in srgb, ${band.color} 14%, transparent)`,
              }}
            />
            {band.text}
          </span>
        ))}
        {used && (
          <span
            className={`${ITEM} ml-auto text-muted-foreground`}
            {...{ [PICK_NAME_ATTRIBUTE]: used.name }}
          >
            {used.name}
            <b className="font-mono text-data-sm text-foreground">{used.count}</b>
          </span>
        )}
      </div>
      {recoloringId && (
        <div className="grid w-max grid-cols-12 gap-1.5" role="group" aria-label="Pick a color">
          {PALETTE.map(color => (
            <button
              key={color}
              type="button"
              aria-label={`Use ${color}`}
              className={`${SWATCH} h-5 w-5 hover:outline hover:outline-2 hover:outline-offset-1 hover:outline-foreground/50`}
              style={{ backgroundColor: color }}
              onClick={() => {
                changeValue(recoloringId, { color });
                setRecoloringId(undefined);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
