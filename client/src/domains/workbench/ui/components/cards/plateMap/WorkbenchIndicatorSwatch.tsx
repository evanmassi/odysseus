import { indicatorSwatchClass, indicatorSwatchStyle } from './indicatorSwatch';

import type { PlateSwatch } from '../../../../utils/plateMap/plateSwatches';

interface WorkbenchIndicatorSwatchProps {
  swatch: PlateSwatch | undefined;
}

export function WorkbenchIndicatorSwatch({ swatch }: WorkbenchIndicatorSwatchProps) {
  if (!swatch) return null;
  return (
    <span
      aria-hidden
      className={indicatorSwatchClass(swatch.kind)}
      style={indicatorSwatchStyle(swatch.kind, swatch.color)}
    />
  );
}
