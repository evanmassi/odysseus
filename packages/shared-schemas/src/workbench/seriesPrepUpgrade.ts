import { z } from 'zod';

import { MARKER_DILUTION_FILE_VERSION } from './markerDilutionUpgrade';

export const SERIES_PREP_FILE_VERSION = 5;

const OLD_EXTRA_DEFAULT = '20';

export const movedPrepValueSchema = z.object({
  plateId: z.string(),
  seriesId: z.string(),
  volumePerWell: z.string().optional(),
  totalWellVolume: z.string().optional(),
  extra: z.string().optional(),
});

export type MovedPrepValue = z.infer<typeof movedPrepValueSchema>;

const seriesSchema = z.looseObject({
  prep: z
    .looseObject({
      volumeAdded: z.string().optional(),
      wellVolume: z.string().optional(),
      extraPercent: z.string().optional(),
    })
    .optional(),
});

const plateMapSchema = z.looseObject({
  type: z.literal('plateMap'),
  id: z.string(),
  series: z.record(z.string(), seriesSchema),
});

const typed = (value: string | undefined) => (value?.trim() ? value : undefined);

function movedFrom(plateId: string, seriesId: string, series: z.infer<typeof seriesSchema>) {
  if (!('top' in series)) return [];
  const prep = series.prep ?? {};
  // PITFALL: a dilution series with Extra never typed used a hidden 20%; it moves as typed so the answers stay the same.
  const extra = prep.extraPercent === undefined ? OLD_EXTRA_DEFAULT : typed(prep.extraPercent);
  const volumePerWell = typed(prep.volumeAdded);
  const totalWellVolume = typed(prep.wellVolume);
  return [
    {
      plateId,
      seriesId,
      ...(volumePerWell && { volumePerWell }),
      ...(totalWellVolume && { totalWellVolume }),
      ...(extra && { extra }),
    },
  ];
}

const movedFromCard = (card: unknown): MovedPrepValue[] => {
  const plateMap = plateMapSchema.safeParse(card);
  if (!plateMap.success) return [];
  const { id, series } = plateMap.data;
  return Object.entries(series).flatMap(([seriesId, each]) => movedFrom(id, seriesId, each));
};

export const seriesPrepFileSchema = z
  .looseObject({
    version: z.literal(SERIES_PREP_FILE_VERSION),
    protocol: z.looseObject({ cards: z.array(z.unknown()) }),
  })
  .transform(file => ({
    ...file,
    version: MARKER_DILUTION_FILE_VERSION,
    movedPrepValues: file.protocol.cards.flatMap(movedFromCard),
  }));
