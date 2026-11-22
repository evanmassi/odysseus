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
  list: Table2,
  values: Hash,
  formula: FunctionSquare,
  plate: Grid3x3,
  plateView: Grid3x3,
  cytometer: Rainbow,
  steps: ListOrdered,
  dilutions: ArrowDownToLine,
  flow: Workflow,
  sketch: PenLine,
  text: Pilcrow,
};
