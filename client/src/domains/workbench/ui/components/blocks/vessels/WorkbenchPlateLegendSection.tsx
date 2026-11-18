import { useState, type ReactNode } from 'react';

import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { renamePlateValue } from '../../../../utils/materials/renameFollowing';
import { recolorValue, renameLine } from '../../../../utils/vessels/wellEdits';
import { META_LABEL } from '../../board/metaLabelClass';
import { PICK_NAME_ATTRIBUTE } from '../../tray/useTrayPickDrag';

import { useUpdateVesselMap } from './useUpdateVesselMap';
import { WorkbenchColorSwatchList } from './WorkbenchColorSwatchList';
import { WorkbenchPlateNameField } from './WorkbenchPlateNameField';

import type { PlateBand } from '../../../../utils/vessels/plateLayers';
import type { VesselCount } from '../../../../utils/vessels/vesselMapNames';
import type { PlateLine, VesselMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchPlateLegendSectionProps {
  block: VesselMapBlock;
  colorLine: PlateLine | undefined;
  counts: readonly VesselCount[];
  bands: readonly PlateBand[];
  fillAmounts: ReadonlyMap<string, string>;
}

const SHADE_STEPS = [100, 60, 30] as const;
const SEPARATOR = 'text-muted-foreground/60';
const VALUE_NAME = 'text-body-sm text-foreground';
const TREATMENTS_HEADING = 'Treatments';
const CONDITIONS_HEADING = 'Conditions';
const MOST_ROWS_PER_COLUMN = 4;
const SWATCH_BUTTON =
  'box-border h-3.5 w-3.5 flex-none hover:outline hover:outline-2 hover:outline-offset-1 hover:outline-foreground/50';

interface LegendSection {
  label: string;
  lines: PlateLine[];
  treatments: PlateLine['values'];
  bands: PlateBand[];
}

type SwatchKind = 'fill' | 'band' | 'stripe';

interface LegendEntry {
  key: string;
  swatch: SwatchKind;
  color: string | undefined;
  valueId: string | undefined;
  label: string;
  name: ReactNode;
  amount: string;
  count: number | undefined;
  pickName: string | undefined;
}

function balancedColumns<Item>(items: readonly Item[]): Item[][] {
  const columns = Math.max(1, Math.ceil(items.length / MOST_ROWS_PER_COLUMN));
  const perColumn = Math.ceil(items.length / columns);
  return Array.from({ length: columns }, (_, index) =>
    items.slice(index * perColumn, (index + 1) * perColumn)
  );
}

const swatchStyle = (kind: SwatchKind, color = 'currentColor') =>
  kind === 'fill'
    ? { backgroundColor: color }
    : {
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        boxShadow: kind === 'stripe' ? `inset 0 4px 0 ${color}` : undefined,
      };

export function WorkbenchPlateLegendSection({
  block,
  colorLine,
  counts,
  bands,
  fillAmounts,
}: WorkbenchPlateLegendSectionProps) {
  const updateVesselMap = useUpdateVesselMap(block);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const [recoloringId, setRecoloringId] = useState<string>();
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

  const sections = new Map<string, LegendSection>();
  const addToSection = (line: PlateLine, fallback: string, content: Partial<LegendSection>) => {
    const label = line.name.trim() || fallback;
    const key = normalizeMaterialKey(label);
    const section = sections.get(key) ?? { label, lines: [], treatments: [], bands: [] };
    section.lines.push(line);
    section.treatments.push(...(content.treatments ?? []));
    section.bands.push(...(content.bands ?? []));
    sections.set(key, section);
  };
  if (colorLine && treatments.length) {
    addToSection(colorLine, TREATMENTS_HEADING, { treatments });
  }
  for (const line of block.lines) {
    const onLine = bands.filter(band => band.lineId === line.id && band.kind !== 'fill');
    if (onLine.length) addToSection(line, CONDITIONS_HEADING, { bands: onLine });
  }

  const valueName = (valueId: string, text: string, shown = text) => (
    <WorkbenchPlateNameField
      name={text}
      shown={shown}
      label={`Rename ${text}`}
      className={VALUE_NAME}
      onRename={next => updateProtocol(draft => renamePlateValue(draft, block.id, valueId, next))}
    />
  );

  const entriesOf = (section: LegendSection): LegendEntry[] => [
    ...section.treatments.map(
      (value): LegendEntry => ({
        key: value.id,
        swatch: 'fill',
        color: value.color,
        valueId: value.id,
        label: value.text,
        name: valueName(value.id, value.text),
        amount: fillAmounts.get(value.id) ?? '',
        count: countOf.get(value.id)?.count,
        pickName: countOf.get(value.id)?.name,
      })
    ),
    ...section.bands.map(
      (band, index): LegendEntry => ({
        key: `${band.lineId}:${band.valueId}:${index}`,
        swatch: band.kind === 'stripe' ? 'stripe' : 'band',
        color: band.color,
        valueId: band.valueId,
        label: band.label || band.text,
        name: band.valueId
          ? valueName(band.valueId, valueTexts.get(band.valueId) ?? band.label, band.label)
          : band.label,
        amount: band.amount,
        count: band.wellsInMap,
        pickName: undefined,
      })
    ),
  ];

  const sharedAmount = (entries: readonly LegendEntry[]) => {
    const amounts = new Set(entries.map(entry => entry.amount));
    const [only] = amounts;
    return amounts.size === 1 && only ? only : undefined;
  };

  const sectionHeading = (section: LegendSection, amount: string | undefined) => (
    <div className="mb-1 flex flex-col gap-0.5 border-b border-line-soft pb-1">
      <WorkbenchPlateNameField
        name={section.label}
        shown={section.label}
        label="Line name"
        className={META_LABEL}
        onRename={name =>
          updateVesselMap(draft => section.lines.forEach(line => renameLine(draft, line.id, name)))
        }
      />
      {amount && <span className="text-caption text-muted-foreground">{amount}</span>}
    </div>
  );

  const entryCells = (entry: LegendEntry, isAmountShared: boolean) => [
    <span
      key={`${entry.key}:name`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      {...{ [PICK_NAME_ATTRIBUTE]: entry.pickName }}
    >
      <button
        type="button"
        aria-label={`Change the color of ${entry.label}`}
        disabled={!entry.valueId}
        className={`${SWATCH_BUTTON} ${entry.swatch === 'fill' ? '' : 'border-[1.5px]'}`}
        style={swatchStyle(entry.swatch, entry.color)}
        onClick={() => toggleRecolor(entry.valueId)}
      />
      {entry.name}
    </span>,
    ...(isAmountShared
      ? []
      : [
          <span
            key={`${entry.key}:amount`}
            className="whitespace-nowrap text-caption text-muted-foreground"
          >
            {entry.amount}
          </span>,
        ]),
    <b key={`${entry.key}:count`} className="text-right font-mono text-data-sm text-foreground">
      {entry.count}
    </b>,
  ];

  if (!treatments.length && !bands.length && !used) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-line-soft pt-2">
      <div className="flex flex-wrap items-start gap-x-10 gap-y-3">
        {[...sections.values()].map(section => {
          const entries = entriesOf(section);
          const amount = sharedAmount(entries);
          return (
            <section key={section.lines.map(line => line.id).join('|')} className="flex flex-col">
              {sectionHeading(section, amount)}
              <div className="flex gap-x-7">
                {balancedColumns(entries).map(column => (
                  <div
                    key={column[0].key}
                    className={`grid items-center gap-x-4 gap-y-1 text-body-sm text-foreground ${
                      amount
                        ? 'grid-cols-[max-content_max-content]'
                        : 'grid-cols-[max-content_max-content_max-content]'
                    }`}
                  >
                    {column.flatMap(entry => entryCells(entry, !!amount))}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
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
