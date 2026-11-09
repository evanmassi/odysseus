import { Button, ScrollArea } from '@shared/ui';

import { readingStepsText, type MaterialReading } from '../../../../utils/steps/stepReadings';

import {
  MATERIAL_ACTIONS_CELL,
  MATERIAL_CELL,
  MATERIAL_MUTED,
  MATERIAL_TABLE,
  ROW_ACTION,
  materialRowClass,
  HORIZONTAL_SCROLL,
} from './materialTableStyles';
import { WorkbenchMaterialSection } from './WorkbenchMaterialSection';

interface WorkbenchMaterialReadingsSectionProps {
  readings: readonly MaterialReading[];
  guessType: (name: string) => string;
  onAccept: (readings: readonly MaterialReading[]) => void;
  onIgnore: (reading: MaterialReading) => void;
}

export function WorkbenchMaterialReadingsSection({
  readings,
  guessType,
  onAccept,
  onIgnore,
}: WorkbenchMaterialReadingsSectionProps) {
  return (
    <WorkbenchMaterialSection
      title="From your steps"
      count={readings.length}
      action={
        <Button variant="ghost" size="xs" onClick={() => onAccept(readings)}>
          Add all
        </Button>
      }
    >
      <ScrollArea options={HORIZONTAL_SCROLL}>
        <table className={MATERIAL_TABLE}>
          <tbody>
            {readings.map((reading, index) => (
              <tr key={reading.key} className={`${materialRowClass(index)} italic`}>
                <td className={`${MATERIAL_CELL} text-muted-foreground`}>{reading.name}</td>
                <td className={`${MATERIAL_CELL} ${MATERIAL_MUTED}`}>
                  {reading.isOnBoard ? 'Already here' : guessType(reading.name)}
                </td>
                <td className={`${MATERIAL_CELL} ${MATERIAL_MUTED}`}>
                  {readingStepsText(reading.uses)}
                </td>
                <td className={`${MATERIAL_ACTIONS_CELL} not-italic`}>
                  <Button variant="ghost" size="xs" onClick={() => onAccept([reading])}>
                    {reading.isOnBoard ? 'Link' : 'Add'}
                  </Button>
                  <Button
                    variant="ghost-danger"
                    size="xs"
                    className={ROW_ACTION}
                    onClick={() => onIgnore(reading)}
                  >
                    Ignore
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </WorkbenchMaterialSection>
  );
}
