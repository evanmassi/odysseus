import {
  ArrowDownToLine,
  FlaskConical,
  FunctionSquare,
  Grid3x3,
  Hash,
  ListOrdered,
  PenLine,
  Pilcrow,
  Rainbow,
  Table2,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import type { ProtocolCardType } from '@odysseus/shared-schemas';

export const CARD_ICONS: Readonly<Record<ProtocolCardType, LucideIcon>> = {
  materials: FlaskConical,
  table: Table2,
  values: Hash,
  calculations: FunctionSquare,
  plateMap: Grid3x3,
  linkedPlateMap: Grid3x3,
  flowCytometryPanel: Rainbow,
  procedure: ListOrdered,
  dilutions: ArrowDownToLine,
  flowDiagram: Workflow,
  sketch: PenLine,
  text: Pilcrow,
};
