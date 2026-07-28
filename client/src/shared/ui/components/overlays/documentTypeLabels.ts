/**
 * Document Type Labels
 *
 * Display names for the shared document classification, used by the link modal's
 * picker and by the catalogs that show a type on an attached document.
 */

import { type DocumentType } from '@odysseus/shared-schemas';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  sds: 'SDS',
  spec_sheet: 'Spec Sheet',
  coa: 'CoA',
  protocol: 'Protocol',
  other: 'Other',
};
