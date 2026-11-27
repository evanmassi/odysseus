import {
  lineValueOf,
  type MaterialLink,
  type Protocol,
  type PlateMap,
  normalizeMaterialKey,
} from '@odysseus/shared-schemas';

import { cachedPerCardWith } from '../cards/cachedPerCard';
import { readReference } from '../formulas/nameReferences';
import { plateNameOf, labwareTitle } from '../plateMap/plateMapTabs';
import { dilutionFactorOf, type StepSeries } from '../plateMap/plateSeries';

export interface SeriesRef {
  plateId: string;
  seriesId: string;
}

export interface DilutionRun {
  key: string;
  seriesIds: string[];
  members: SeriesRef[];
  places: string[];
  series: StepSeries;
  subject: string;
  links: MaterialLink[] | undefined;
  color: string | undefined;
  replicatesByPoint: Map<number, number>;
}

interface PlacedRun extends Omit<DilutionRun, 'key' | 'seriesIds' | 'members' | 'places'> {
  ref: SeriesRef;
  place: string;
}

interface PlateRun extends Omit<PlacedRun, 'place'> {
  tabNames: string[];
}

const runsOnPlate = cachedPerCardWith(
  (plateMap: PlateMap, seriesById: Protocol['series']): PlateRun[] =>
    plateMap.lines.flatMap(line => {
      const runs = new Map<string, Omit<PlateRun, 'tabNames'> & { plateIds: Set<string> }>();
      for (const [key, lines] of Object.entries(plateMap.samples)) {
        const entry = lines[line.id];
        const series = entry?.seriesId === undefined ? undefined : seriesById[entry.seriesId];
        if (!entry?.seriesId || !series || !('top' in series)) continue;
        const value = lineValueOf(line, entry);
        const run = runs.get(entry.seriesId) ?? {
          ref: { plateId: plateMap.id, seriesId: entry.seriesId },
          plateIds: new Set<string>(),
          series,
          subject: value?.text.trim() ?? '',
          links: value?.links,
          color: value?.color,
          replicatesByPoint: new Map<number, number>(),
        };
        runs.set(entry.seriesId, run);
        run.plateIds.add(key.split(':')[0]);
        const point = entry.seriesPoint ?? 0;
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

function placedRuns(plates: readonly PlateMap[], seriesById: Protocol['series']): PlacedRun[] {
  return plates.flatMap(plateMap =>
    runsOnPlate(plateMap, seriesById).map(({ tabNames, ...run }) => {
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
    series.top.trim(),
    series.unit,
    readReference(series.dilutionFactor).id ?? dilutionFactorOf(series.dilutionFactor),
  ].join('|');

function unpaintedRuns(
  protocol: Pick<Protocol, 'materials' | 'series'>,
  painted: ReadonlySet<string>
): DilutionRun[] {
  return Object.entries(protocol.series).flatMap(([seriesId, series]) => {
    if (painted.has(seriesId) || !('top' in series)) return [];
    const material = protocol.materials.items.find(item => item.id === series.materialId);
    const subject = material?.name.trim() ?? '';
    return [
      {
        key: seriesId,
        seriesIds: [seriesId],
        members: [],
        places: [],
        series,
        subject,
        links: material ? [{ materialId: material.id, name: subject }] : undefined,
        color: undefined,
        replicatesByPoint: new Map<number, number>(),
      },
    ];
  });
}

export function dilutionRuns(
  protocol: Pick<Protocol, 'materials' | 'plateMaps' | 'series'>
): DilutionRun[] {
  const pooled = new Map<string, DilutionRun>();
  for (const placed of placedRuns(protocol.plateMaps, protocol.series)) {
    const { ref, place, ...run } = placed;
    const key = sameSourceKey(placed);
    const existing = pooled.get(key);
    if (!existing) {
      pooled.set(key, {
        ...run,
        key: ref.seriesId,
        seriesIds: [ref.seriesId],
        members: [ref],
        places: [place],
        replicatesByPoint: new Map(run.replicatesByPoint),
      });
      continue;
    }
    existing.members.push(ref);
    if (!existing.seriesIds.includes(ref.seriesId)) existing.seriesIds.push(ref.seriesId);
    if (!existing.places.includes(place)) existing.places.push(place);
    for (const [point, wells] of run.replicatesByPoint) {
      existing.replicatesByPoint.set(point, (existing.replicatesByPoint.get(point) ?? 0) + wells);
    }
  }
  const runs = [...pooled.values()];
  const painted = new Set(runs.flatMap(run => run.seriesIds));
  return [...runs, ...unpaintedRuns(protocol, painted)];
}

export function runTags(runs: readonly DilutionRun[]): Map<string, string> {
  const seen = new Map<string, number>();
  return new Map(
    runs
      .filter(run => run.subject)
      .map(run => {
        const subjectKey = normalizeMaterialKey(run.subject);
        const index = seen.get(subjectKey) ?? 0;
        seen.set(subjectKey, index + 1);
        return [run.key, index ? ` ${index + 1}` : ''];
      })
  );
}
