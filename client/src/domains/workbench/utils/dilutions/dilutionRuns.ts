import {
  lineValueOf,
  type Protocol,
  type PlateMapCard,
  normalizeMaterialKey,
} from '@odysseus/shared-schemas';

import { cachedPerCard } from '../cards/cachedPerCard';
import { plateNameOf, labwareTitle } from '../plateMap/plateMapTabs';
import { dilutionFactorOf, type StepSeries } from '../plateMap/plateSeries';

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
  replicatesByPoint: Map<number, number>;
}

interface PlacedRun extends Omit<DilutionRun, 'key' | 'members' | 'places'> {
  ref: SeriesRef;
  place: string;
}

interface PlateRun extends Omit<PlacedRun, 'place'> {
  tabNames: string[];
}

const runsOnPlate = cachedPerCard((plateMap: PlateMapCard): PlateRun[] =>
  plateMap.lines.flatMap(line => {
    const runs = new Map<string, Omit<PlateRun, 'tabNames'> & { plateIds: Set<string> }>();
    for (const [key, lines] of Object.entries(plateMap.cells)) {
      const entry = lines[line.id];
      const series = entry?.seriesId === undefined ? undefined : plateMap.series[entry.seriesId];
      if (!entry?.seriesId || !series || !('start' in series)) continue;
      const value = lineValueOf(line, entry);
      const run = runs.get(entry.seriesId) ?? {
        ref: { plateId: plateMap.id, seriesId: entry.seriesId },
        plateIds: new Set<string>(),
        series,
        subject: value?.text.trim() ?? '',
        color: value?.color,
        replicatesByPoint: new Map<number, number>(),
      };
      runs.set(entry.seriesId, run);
      run.plateIds.add(key.split(':')[0]);
      const point = entry.seriesStep ?? 0;
      run.replicatesByPoint.set(point, (run.replicatesByPoint.get(point) ?? 0) + 1);
    }
    return [...runs.values()].map(({ plateIds, ...run }) => ({
      ...run,
      tabNames: plateMap.plates
        .filter(candidate => plateIds.has(candidate.id))
        .map(candidate => plateNameOf(plateMap, candidate)),
    }));
  })
);

function placedRuns(plates: readonly PlateMapCard[]): PlacedRun[] {
  return plates.flatMap(plateMap =>
    runsOnPlate(plateMap).map(({ tabNames, ...run }) => {
      const showsCard = plates.length > 1 || !tabNames.length;
      return {
        ...run,
        place: [showsCard ? labwareTitle(plateMap) : '', ...tabNames].filter(Boolean).join(' · '),
      };
    })
  );
}

const sameSourceKey = ({ subject, series }: PlacedRun) =>
  [
    normalizeMaterialKey(subject),
    series.start.trim(),
    series.unit,
    dilutionFactorOf(series.fold),
  ].join('|');

export function dilutionRuns(protocol: Pick<Protocol, 'blocks'>): DilutionRun[] {
  const plates = protocol.blocks.filter((card): card is PlateMapCard => card.type === 'plate');
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
        replicatesByPoint: new Map(run.replicatesByPoint),
      });
      continue;
    }
    existing.members.push(ref);
    if (!existing.places.includes(place)) existing.places.push(place);
    for (const [point, wells] of run.replicatesByPoint) {
      existing.replicatesByPoint.set(point, (existing.replicatesByPoint.get(point) ?? 0) + wells);
    }
  }
  return [...pooled.values()];
}
