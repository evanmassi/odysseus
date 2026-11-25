import {
  ArrowDownToLine,
  FlaskConical,
  FunctionSquare,
  Grid3x3,
  Hash,
  ListOrdered,
  Rainbow,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import type { ProtocolCardType } from '@odysseus/shared-schemas';

export const CARD_ICONS: Readonly<Record<ProtocolCardType, LucideIcon>> = {
  materials: FlaskConical,
  values: Hash,
  calculations: FunctionSquare,
  plateMap: Grid3x3,
  flowCytometryPanel: Rainbow,
  procedure: ListOrdered,
  dilutions: ArrowDownToLine,
  flowDiagram: Workflow,
};
