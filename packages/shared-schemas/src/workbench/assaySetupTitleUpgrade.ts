import { z } from 'zod';

import { PROTOCOL_FILE_VERSION } from './protocolFileSchemas';

export const ASSAY_SETUP_TITLE_FILE_VERSION = 7;

const valuesCardSchema = z.looseObject({
  type: z.literal('values'),
  generalTitle: z.string().optional(),
});

function withAssaySetupTitle(card: unknown): unknown {
  const values = valuesCardSchema.safeParse(card);
  if (!values.success) return card;
  const { generalTitle, ...rest } = values.data;
  return generalTitle === undefined ? rest : { ...rest, assaySetupTitle: generalTitle };
}

export const assaySetupTitleFileSchema = z
  .looseObject({
    version: z.literal(ASSAY_SETUP_TITLE_FILE_VERSION),
    protocol: z.looseObject({ cards: z.array(z.unknown()) }),
  })
  .transform(file => ({
    ...file,
    version: PROTOCOL_FILE_VERSION,
    protocol: { ...file.protocol, cards: file.protocol.cards.map(withAssaySetupTitle) },
  }));
