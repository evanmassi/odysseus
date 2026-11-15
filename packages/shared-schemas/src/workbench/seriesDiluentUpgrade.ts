import { z } from 'zod';

import { PROTOCOL_FILE_VERSION } from './protocolFileSchemas';

export const SERIES_DILUENT_FILE_VERSION = 3;

const seriesSchema = z.looseObject({
  prep: z.looseObject({ diluent: z.string().optional() }).optional(),
});
const plateSchema = z.looseObject({
  type: z.literal('plate'),
  series: z.record(z.string(), seriesSchema),
});

const firstChosenDiluent = (blocks: readonly unknown[]): string =>
  blocks
    .flatMap(block => {
      const plate = plateSchema.safeParse(block);
      return plate.success ? Object.values(plate.data.series) : [];
    })
    .map(series => series.prep?.diluent?.trim() ?? '')
    .find(Boolean) ?? '';

export const seriesDiluentFileSchema = z
  .looseObject({
    version: z.literal(SERIES_DILUENT_FILE_VERSION),
    protocol: z.looseObject({ blocks: z.array(z.unknown()) }),
  })
  .transform(file => ({
    ...file,
    version: PROTOCOL_FILE_VERSION,
    protocol: { ...file.protocol, diluent: firstChosenDiluent(file.protocol.blocks) },
  }));
