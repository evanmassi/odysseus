import { z } from 'zod';

import { ASSAY_SETUP_TITLE_FILE_VERSION } from './assaySetupTitleUpgrade';

export const MARKER_DILUTION_FILE_VERSION = 6;

export const movedMarkerDilutionSchema = z.object({
  materialId: z.string(),
  dilution: z.string(),
});

export type MovedMarkerDilution = z.infer<typeof movedMarkerDilutionSchema>;

const panelSchema = z.looseObject({
  type: z.literal('flowCytometryPanel'),
  markers: z.array(z.looseObject({ materialId: z.string(), dilution: z.string().optional() })),
});

const movedFromCard = (card: unknown): MovedMarkerDilution[] => {
  const panel = panelSchema.safeParse(card);
  if (!panel.success) return [];
  return panel.data.markers.flatMap(({ materialId, dilution }) =>
    dilution?.trim() ? [{ materialId, dilution }] : []
  );
};

export const markerDilutionFileSchema = z
  .looseObject({
    version: z.literal(MARKER_DILUTION_FILE_VERSION),
    protocol: z.looseObject({ cards: z.array(z.unknown()) }),
  })
  .transform(file => ({
    ...file,
    version: ASSAY_SETUP_TITLE_FILE_VERSION,
    movedMarkerDilutions: file.protocol.cards.flatMap(movedFromCard),
  }));
