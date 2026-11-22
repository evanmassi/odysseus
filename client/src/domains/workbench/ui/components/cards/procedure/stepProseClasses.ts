import type { ProsePiece } from '../../../../utils/steps/stepTemplate';
import type { UnitKind } from '@odysseus/shared-schemas';

export const STEP_PROSE_CLASSES = {
  plain: undefined,
  quantity: 'text-primary',
  verb: 'text-label-2xs font-bold uppercase tracking-meta text-foreground',
} as const;

const AMOUNT_KIND_CLASSES: Partial<Record<UnitKind, string>> = {
  time: 'text-warning-text',
  temperature: 'text-info-text',
};

export const amountKindClass = (kind: UnitKind | undefined, otherwise: string): string =>
  (kind && AMOUNT_KIND_CLASSES[kind]) ?? otherwise;

export const proseClass = (piece: ProsePiece, quantityOtherwise: string): string | undefined =>
  piece.kind === 'quantity'
    ? amountKindClass(piece.unitKind, quantityOtherwise)
    : STEP_PROSE_CLASSES[piece.kind];
