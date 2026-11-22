import { markSwatchClass, markSwatchStyle } from './markSwatch';

import type { PlateSwatch } from '../../../../utils/vessels/plateSwatches';

interface WorkbenchMarkSwatchProps {
  swatch: PlateSwatch | undefined;
}

export function WorkbenchMarkSwatch({ swatch }: WorkbenchMarkSwatchProps) {
  if (!swatch) return null;
  return (
    <span
      aria-hidden
      className={markSwatchClass(swatch.kind)}
      style={markSwatchStyle(swatch.kind, swatch.color)}
    />
  );
}
