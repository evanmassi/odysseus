import {
  ArrowDownToLine,
  FlaskConical,
  FunctionSquare,
  Grid3x3,
  Hash,
  ListOrdered,
  PenLine,
  Pilcrow,
  Table2,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import type { ProtocolBlockType } from '@odysseus/shared-schemas';

export const BLOCK_ICONS: Readonly<Record<ProtocolBlockType, LucideIcon>> = {
  materials: FlaskConical,
  list: Table2,
  values: Hash,
  formula: FunctionSquare,
  plate: Grid3x3,
  steps: ListOrdered,
  dilutions: ArrowDownToLine,
  flow: Workflow,
  sketch: PenLine,
  text: Pilcrow,
};
