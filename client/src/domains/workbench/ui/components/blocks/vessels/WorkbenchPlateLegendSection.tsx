import { useState, type ReactNode } from 'react';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { withGreekLetters } from '../../../../utils/materials/greekLetters';
import { renamePlateValue } from '../../../../utils/materials/renameFollowing';
import { recolorValue } from '../../../../utils/vessels/wellEdits';
import { META_LABEL } from '../../board/metaLabelClass';
import { PICK_NAME_ATTRIBUTE } from '../../tray/useTrayPickDrag';

import { useUpdateVesselMap } from './useUpdateVesselMap';
import { WorkbenchColorSwatchList } from './WorkbenchColorSwatchList';

import type { PlateBand } from '../../../../utils/vessels/plateLayers';
import type { VesselCount } from '../../../../utils/vessels/vesselMapNames';
import type { PlateLine, VesselMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchPlateLegendSectionProps {
  block: VesselMapBlock;
  colorLine: PlateLine | undefined;
  counts: readonly VesselCount[];
  bands: readonly PlateBand[];
}

const SHADE_STEPS = [100, 60, 30] as const;
const SEPARATOR = 'text-muted-foreground/60';
const AFTER_RENAMABLE = `${SEPARATOR} ml-4`;
const MIN_NAME_FIELD_CH = 14;
const NAME_FIELD_ROOM_CH = 4;
const ROW_LABEL = `pt-0.5 ${META_LABEL}`;
const ITEM = 'inline-flex items-center gap-1.5 text-body-sm text-foreground';
const SWATCH_BUTTON =
  'flex-none hover:outline hover:outline-2 hover:outline-offset-1 hover:outline-foreground/50';

export function WorkbenchPlateLegendSection({
  block,
  colorLine,
  counts,
  bands,
}: WorkbenchPlateLegendSectionProps) {
  const updateVesselMap = useUpdateVesselMap(block);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const [recoloringId, setRecoloringId] = useState<string>();
  const [renamingId, setRenamingId] = useState<string>();
  const countOf = new Map(counts.map(count => [count.key, count]));
  const valueTexts = new Map(
    block.lines.flatMap(line => line.values.map(value => [value.id, value.text] as const))
  );
  const treatments = (colorLine?.values ?? []).filter(value => countOf.has(value.id));
  const used = countOf.get('used');
  const hasSeries =
    !!colorLine &&
    Object.values(block.cells).some(lines => lines[colorLine.id]?.seriesId !== undefined);
  const recoloring = block.lines
    .flatMap(line => line.values)
    .find(value => value.id === recoloringId);

  const toggleRecolor = (valueId: string | undefined) =>
    valueId && setRecoloringId(recoloringId === valueId ? undefined : valueId);

  const nameOf = (valueId: string, text: string, shown = text): ReactNode =>
    renamingId === valueId ? (
      <input
        ref={focusOnMount}
        defaultValue={text}
        aria-label={`Rename ${text}`}
        spellCheck={false}
        className="inline-edit-field max-w-none text-body-sm text-foreground"
        style={{ width: `${Math.max(MIN_NAME_FIELD_CH, text.length + NAME_FIELD_ROOM_CH)}ch` }}
        onBlur={event => {
          const next = event.currentTarget.value;
          setRenamingId(undefined);
          updateProtocol(draft =>
            renamePlateValue(draft, block.id, valueId, withGreekLetters(next))
          );
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') setRenamingId(undefined);
        }}
      />
    ) : (
      <button
        type="button"
        className="inline-edit text-left text-body-sm text-foreground"
        onClick={() => setRenamingId(valueId)}
      >
        {shown}
      </button>
    );

  if (!treatments.length && !bands.length && !used) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-line-soft pt-2">
      <div className="grid grid-cols-[6.5rem_1fr] items-start gap-x-3 gap-y-1.5">
        {treatments.length > 0 && (
          <>
            <span className={ROW_LABEL}>Treatments</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {treatments.map(value => {
                const count = countOf.get(value.id);
                return (
                  <span key={value.id} className={ITEM} {...{ [PICK_NAME_ATTRIBUTE]: count?.name }}>
                    <button
                      type="button"
                      aria-label={`Change the color of ${value.text}`}
                      className={`${SWATCH_BUTTON} h-3.5 w-3.5`}
                      style={{ backgroundColor: value.color }}
                      onClick={() => toggleRecolor(value.id)}
                    />
                    {nameOf(value.id, value.text)}
                    <span className={AFTER_RENAMABLE}>·</span>
                    <b className="font-mono text-data-sm">{count?.count}</b>
                  </span>
                );
              })}
            </div>
          </>
        )}
        {bands.length > 0 && (
          <>
            <span className={ROW_LABEL}>Conditions</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {bands.map(band => (
                <span key={band.text} className={ITEM}>
                  <button
                    type="button"
                    aria-label={`Change the color of ${band.text}`}
                    disabled={!band.valueId}
                    className={`${SWATCH_BUTTON} h-3 w-3.5 border`}
                    style={{
                      borderColor: band.color,
                      backgroundColor: `color-mix(in srgb, ${band.color} 14%, transparent)`,
                    }}
                    onClick={() => toggleRecolor(band.valueId)}
                  />
                  {band.valueId
                    ? nameOf(band.valueId, valueTexts.get(band.valueId) ?? band.text, band.text)
                    : band.text}
                  <span className={band.valueId ? AFTER_RENAMABLE : SEPARATOR}>·</span>
                  <b className="font-mono text-data-sm">{band.wellsInMap}</b>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
      {recoloring && (
        <WorkbenchColorSwatchList
          current={recoloring.color}
          onPick={color => {
            updateVesselMap(draft => recolorValue(draft, recoloring.id, color));
            setRecoloringId(undefined);
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
        {used && (
          <span {...{ [PICK_NAME_ATTRIBUTE]: used.name }}>
            {used.name} <span className={SEPARATOR}>·</span>{' '}
            <b className="font-mono text-data-sm text-foreground">{used.count}</b>
          </span>
        )}
        {used && hasSeries && <span className={SEPARATOR}>·</span>}
        {hasSeries && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex gap-0.5">
              {SHADE_STEPS.map(strength => (
                <i
                  key={strength}
                  className="h-2.5 w-2.5"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${treatments[0]?.color ?? 'currentColor'} ${strength}%, transparent)`,
                  }}
                />
              ))}
            </span>
            stronger color = higher dose
          </span>
        )}
      </div>
    </div>
  );
}
