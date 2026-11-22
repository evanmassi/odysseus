import { Button } from '@shared/ui';
import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { displayValue } from '../../../../utils/formulas/quantities';
import { readingStepsText, type ValueReading } from '../../../../utils/steps/stepReadings';

interface WorkbenchValueReadingsSectionProps {
  readings: readonly ValueReading[];
  onAccept: (readings: readonly ValueReading[]) => void;
  onIgnore: (reading: ValueReading) => void;
}

const CELL = 'px-2 py-1.5 align-middle';

export function WorkbenchValueReadingsSection({
  readings,
  onAccept,
  onIgnore,
}: WorkbenchValueReadingsSectionProps) {
  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center gap-2 px-2">
        <span className="type-label text-label-md font-semibold text-foreground">
          From your steps
        </span>
        <span className="font-mono text-label-xs text-muted-foreground">{readings.length}</span>
        <span className="flex-1" />
        <Button variant="ghost" size="xs" onClick={() => onAccept(readings)}>
          Add all
        </Button>
      </div>
      <table className="w-full border-collapse">
        <tbody>
          {readings.map(reading => (
            <tr
              key={reading.key}
              className={`group italic ${ROW_HOVER_GLOW.primary} even:bg-[hsl(var(--foreground)/var(--alpha-zebra))]`}
            >
              <td className={`${CELL} text-body-sm text-muted-foreground`}>
                {reading.name}
                <span className="ml-2 text-label-xs not-italic text-muted-foreground/70">
                  {readingStepsText(reading.uses)}
                </span>
              </td>
              <td className={`${CELL} text-right font-mono text-data-sm text-muted-foreground`}>
                {displayValue(reading.value, reading.unit)}
              </td>
              <td className={`${CELL} w-px whitespace-nowrap text-right not-italic`}>
                <Button variant="ghost" size="xs" onClick={() => onAccept([reading])}>
                  Add
                </Button>
                <Button
                  variant="ghost-danger"
                  size="xs"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => onIgnore(reading)}
                >
                  Ignore
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
