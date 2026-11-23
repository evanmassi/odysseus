import { useState } from 'react';

import { Tooltip } from '@shared/ui';

import { STAIN_TINT, type PlateStain } from '../../../../utils/plateMap/stainSide';
import { tinted, WELL_EDGE_TINT } from '../../../../utils/plateMap/wellContents';
import { META_LABEL } from '../../board/metaLabelClass';

import { WorkbenchColorSwatchList } from './WorkbenchColorSwatchList';

import type { LabwareWords } from '../../../../utils/plateMap/labwareCatalog';

interface WorkbenchPlateStainLegendProps {
  stains: readonly PlateStain[];
  counts: ReadonlyMap<string, number>;
  hasSelection: boolean;
  words: LabwareWords;
  onPick: (stainId: string | undefined) => void;
  onFillUnassigned: (stainId: string) => void;
  onRecolor: (stainId: string, color: string) => void;
}

const SWATCH = 'box-border h-3.5 w-3.5 flex-none border';
const SWATCH_BUTTON = `${SWATCH} hover:outline hover:outline-2 hover:outline-offset-1 hover:outline-foreground/50`;
const PICK = 'whitespace-nowrap text-left enabled:hover:text-primary disabled:cursor-default';

export function WorkbenchPlateStainLegend({
  stains,
  counts,
  hasSelection,
  words,
  onPick,
  onFillUnassigned,
  onRecolor,
}: WorkbenchPlateStainLegendProps) {
  const [recoloringId, setRecoloringId] = useState<string>();
  const recoloring = stains.find(stain => stain.id === recoloringId);

  if (!stains.length) {
    return (
      <p className="border-t border-line-soft pt-2 text-body-sm text-muted-foreground">
        Make stains in a Flow panel to use them on this plate.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1 border-t border-line-soft pt-2">
      <div className="flex items-baseline gap-3 border-b border-line-soft pb-1">
        <span className={META_LABEL}>Stains</span>
        <span className="text-caption text-muted-foreground">
          {hasSelection
            ? `Pick a stain for the selected ${words.plural}`
            : `Select ${words.plural}, then pick a stain`}
        </span>
      </div>
      <div className="grid grid-cols-[max-content_max-content_max-content_max-content] items-center gap-x-4 gap-y-1 text-body-sm text-foreground">
        {stains.map(stain => [
          <button
            key={`${stain.id}:color`}
            type="button"
            aria-label={`Change the color of ${stain.name}`}
            className={`${SWATCH_BUTTON} -mr-2.5`}
            style={{
              backgroundColor: tinted(stain.color, STAIN_TINT),
              borderColor: tinted(stain.color, WELL_EDGE_TINT),
            }}
            onClick={() => setRecoloringId(recoloringId === stain.id ? undefined : stain.id)}
          />,
          <button
            key={`${stain.id}:pick`}
            type="button"
            disabled={!hasSelection}
            className={PICK}
            onClick={() => onPick(stain.id)}
          >
            {stain.name}
          </button>,
          <b
            key={`${stain.id}:count`}
            className="text-right font-mono text-data-sm text-foreground"
          >
            {counts.get(stain.id) ?? ''}
          </b>,
          <Tooltip
            key={`${stain.id}:fill`}
            content={`${stain.name} on every ${words.noun} in use with no stain assigned`}
          >
            <button
              type="button"
              className="text-caption text-muted-foreground hover:text-primary"
              onClick={() => onFillUnassigned(stain.id)}
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
          No stain assigned
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
