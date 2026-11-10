import { lineValueOf, type Protocol, type VesselMapBlock } from '@odysseus/shared-schemas';

import { normalizeMaterialKey } from '../materials/materialGuesser';
import { foldOf, type StepSeries } from '../vessels/plateSeries';
import { plateNameOf } from '../vessels/vesselTabs';

export interface SeriesRef {
  plateId: string;
  seriesId: string;
}

export interface DilutionRun {
  key: string;
  members: SeriesRef[];
  places: string[];
  series: StepSeries;
  subject: string;
  color: string | undefined;
  wellsPerPoint: Map<number, number>;
}

interface PlacedRun extends Omit<DilutionRun, 'key' | 'members' | 'places'> {
  ref: SeriesRef;
  place: string;
}

function placedRuns(plates: readonly VesselMapBlock[]): PlacedRun[] {
  return plates.flatMap(plate =>
    plate.lines.flatMap(line => {
      const runs = new Map<string, PlacedRun & { plateIds: Set<string> }>();
      for (const [key, lines] of Object.entries(plate.cells)) {
        const cell = lines[line.id];
        const series = cell?.seriesId === undefined ? undefined : plate.series[cell.seriesId];
        if (!cell?.seriesId || !series || !('start' in series)) continue;
        const value = lineValueOf(line, cell);
        const run = runs.get(cell.seriesId) ?? {
          ref: { plateId: plate.id, seriesId: cell.seriesId },
          place: '',
          plateIds: new Set<string>(),
          series,
          subject: value?.text.trim() ?? '',
          color: value?.color,
          wellsPerPoint: new Map<number, number>(),
        };
        runs.set(cell.seriesId, run);
        run.plateIds.add(key.split(':')[0]);
        const step = cell.seriesStep ?? 0;
        run.wellsPerPoint.set(step, (run.wellsPerPoint.get(step) ?? 0) + 1);
      }
      return [...runs.values()].map(({ plateIds, ...run }) => {
        const tabNames = plate.plates
          .filter(candidate => plateIds.has(candidate.id))
          .map(candidate => plateNameOf(plate, candidate));
        const showsCard = plates.length > 1 || !tabNames.length;
        return {
          ...run,
          place: [showsCard ? plate.title.trim() : '', ...tabNames].filter(Boolean).join(' · '),
        };
      });
    })
  );
}

const sameSourceKey = ({ subject, series }: PlacedRun) =>
  [normalizeMaterialKey(subject), series.start.trim(), series.unit, foldOf(series.fold)].join('|');

export function dilutionRuns(protocol: Pick<Protocol, 'blocks'>): DilutionRun[] {
  const plates = protocol.blocks.filter((block): block is VesselMapBlock => block.type === 'plate');
  const pooled = new Map<string, DilutionRun>();
  for (const placed of placedRuns(plates)) {
    const { ref, place, ...run } = placed;
    const key = sameSourceKey(placed);
    const existing = pooled.get(key);
    if (!existing) {
      pooled.set(key, {
        ...run,
        key: `${ref.plateId}:${ref.seriesId}`,
        members: [ref],
        places: [place],
        wellsPerPoint: new Map(run.wellsPerPoint),
      });
      continue;
    }
    existing.members.push(ref);
    if (!existing.places.includes(place)) existing.places.push(place);
    for (const [step, wells] of run.wellsPerPoint) {
      existing.wellsPerPoint.set(step, (existing.wellsPerPoint.get(step) ?? 0) + wells);
    }
  }
  return [...pooled.values()];
}
