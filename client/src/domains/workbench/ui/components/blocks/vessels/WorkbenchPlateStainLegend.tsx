import { useState } from 'react';

import { Tooltip } from '@shared/ui';

import { MIX_TINT, type StainMix } from '../../../../utils/vessels/stainSide';
import { META_LABEL } from '../../board/metaLabelClass';

import { WorkbenchColorSwatchList } from './WorkbenchColorSwatchList';

interface WorkbenchPlateStainLegendProps {
  mixes: readonly StainMix[];
  counts: ReadonlyMap<string, number>;
  hasSelection: boolean;
  onPick: (mixId: string | undefined) => void;
  onFillUnstained: (mixId: string) => void;
  onRecolor: (mixId: string, color: string) => void;
}

const SWATCH = 'box-border h-3.5 w-3.5 flex-none border';
const SWATCH_BUTTON = `${SWATCH} hover:outline hover:outline-2 hover:outline-offset-1 hover:outline-foreground/50`;
const PICK = 'whitespace-nowrap text-left enabled:hover:text-primary disabled:cursor-default';

export function WorkbenchPlateStainLegend({
  mixes,
  counts,
  hasSelection,
  onPick,
  onFillUnstained,
  onRecolor,
}: WorkbenchPlateStainLegendProps) {
  const [recoloringId, setRecoloringId] = useState<string>();
  const recoloring = mixes.find(mix => mix.id === recoloringId);

  if (!mixes.length) {
    return (
      <p className="border-t border-line-soft pt-2 text-body-sm text-muted-foreground">
        Make mixes in a Flow panel to stain this plate.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1 border-t border-line-soft pt-2">
      <div className="flex items-baseline gap-3 border-b border-line-soft pb-1">
        <span className={META_LABEL}>Mixes</span>
        <span className="text-caption text-muted-foreground">
          {hasSelection ? 'Pick a mix for the selected wells' : 'Select wells, then pick a mix'}
        </span>
      </div>
      <div className="grid grid-cols-[max-content_max-content_max-content_max-content] items-center gap-x-4 gap-y-1 text-body-sm text-foreground">
        {mixes.map(mix => [
          <button
            key={`${mix.id}:color`}
            type="button"
            aria-label={`Change the color of ${mix.name}`}
            className={`${SWATCH_BUTTON} -mr-2.5`}
            style={{
              backgroundColor: `color-mix(in srgb, ${mix.color} ${MIX_TINT}%, transparent)`,
              borderColor: `color-mix(in srgb, ${mix.color} 70%, transparent)`,
            }}
            onClick={() => setRecoloringId(recoloringId === mix.id ? undefined : mix.id)}
          />,
          <button
            key={`${mix.id}:pick`}
            type="button"
            disabled={!hasSelection}
            className={PICK}
            onClick={() => onPick(mix.id)}
          >
            {mix.name}
          </button>,
          <b key={`${mix.id}:count`} className="text-right font-mono text-data-sm text-foreground">
            {counts.get(mix.id) ?? ''}
          </b>,
          <Tooltip key={`${mix.id}:fill`} content={`${mix.name} on every unstained well in use`}>
            <button
              type="button"
              className="text-caption text-muted-foreground hover:text-primary"
              onClick={() => onFillUnstained(mix.id)}
            >
              Fill the rest
            </button>
          </Tooltip>,
        ])}
        <i aria-hidden className={`${SWATCH} -mr-2.5 border-dashed border-foreground/40`} />
        <button
          type="button"
          disabled={!hasSelection}
          className={PICK}
          onClick={() => onPick(undefined)}
        >
          Not stained
        </button>
      </div>
      {recoloring && (
        <WorkbenchColorSwatchList
          current={recoloring.color}
          onPick={color => {
            onRecolor(recoloring.id, color);
            setRecoloringId(undefined);
          }}
        />
      )}
    </div>
  );
}
