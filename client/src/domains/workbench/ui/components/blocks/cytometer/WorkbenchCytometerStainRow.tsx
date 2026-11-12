import type { ReactNode } from 'react';

import { X } from 'lucide-react';

import { Autocomplete, Tooltip } from '@shared/ui';

import { CONJUGATE_KEY } from '../../../../utils/cytometer/cytometerPanel';

import {
  CYTOMETER_CELL,
  CYTOMETER_FIELD,
  FLUOROCHROME_SQUARE,
  LASER_WASH,
} from './cytometerTableStyles';
import { WorkbenchCytometerTextCell } from './WorkbenchCytometerTextCell';

import type { CytometerActions } from './useCytometerActions';
import type { PanelStain } from '../../../../utils/cytometer/cytometerPanel';

interface WorkbenchCytometerStainRowProps {
  stain: PanelStain;
  color: string | undefined;
  lead?: ReactNode;
  detectorCells: ReactNode;
  clashWording: string;
  steps: readonly string[];
  actions: CytometerActions;
}

export function WorkbenchCytometerStainRow({
  stain,
  color,
  lead,
  detectorCells,
  clashWording,
  steps,
  actions,
}: WorkbenchCytometerStainRowProps) {
  const { row, material } = stain;
  const name = [material?.name.trim()].find(Boolean) ?? 'this stain';
  const writeMaterial = (key: string) => (value: string) =>
    material && actions.writeMaterial(material.id, key, value);

  return (
    <tr className={`group ${LASER_WASH}`}>
      {lead}
      {detectorCells}
      <td className={CYTOMETER_CELL}>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className={FLUOROCHROME_SQUARE}
            style={{ backgroundColor: color ?? 'hsl(var(--muted-foreground))' }}
          />
          {material && stain.isFluorochromeEditable ? (
            <WorkbenchCytometerTextCell
              value={stain.fluorochrome}
              label={`Fluorochrome of ${name}`}
              placeholder="Fluorochrome"
              onChange={writeMaterial(CONJUGATE_KEY)}
            />
          ) : (
            <span>{stain.fluorochrome}</span>
          )}
        </span>
        {stain.sharesDetectorWith.length > 0 && (
          <span className="block text-label-xs text-danger-text">
            {clashWording} {stain.sharesDetectorWith.join(', ')}
          </span>
        )}
      </td>
      <td className={`${CYTOMETER_CELL} font-semibold`}>
        {material ? (
          <WorkbenchCytometerTextCell
            value={stain.marker}
            label={`Marker of ${name}`}
            placeholder={material.name}
            className="font-semibold"
            onChange={writeMaterial(stain.markerKey)}
          />
        ) : (
          <span className="font-normal italic text-muted-foreground">no longer in Materials</span>
        )}
      </td>
      <td className={CYTOMETER_CELL}>
        {material && (
          <WorkbenchCytometerTextCell
            value={stain.clone}
            label={`Clone of ${name}`}
            placeholder="—"
            onChange={writeMaterial('clone')}
          />
        )}
      </td>
      <td className={`${CYTOMETER_CELL} text-muted-foreground`}>{stain.catalog || '—'}</td>
      <td className={CYTOMETER_CELL}>
        <span className="inline-edit">
          <Autocomplete
            value={row.stain}
            placeholder="Stain step"
            options={steps.map(step => ({ value: step, label: step }))}
            aria-label={`Stain step of ${name}`}
            inputClassName={`${CYTOMETER_FIELD} w-24 bg-transparent outline-none`}
            onChange={stainStep => actions.changeRow(row.id, { stain: stainStep })}
          />
        </span>
      </td>
      <td className={`${CYTOMETER_CELL} text-right font-mono`}>
        <span className="inline-flex items-center justify-end gap-0.5">
          1:
          <span className="inline-edit" data-align="end">
            <input
              value={row.dilution}
              placeholder="N"
              aria-label={`Dilution factor of ${name}`}
              spellCheck={false}
              autoComplete="off"
              className={`${CYTOMETER_FIELD} w-12 font-mono`}
              onChange={event => actions.setDilution(row.id, event.target.value)}
            />
          </span>
        </span>
      </td>
      <td className={`${CYTOMETER_CELL} w-px px-2`}>
        <Tooltip content="Take it off the panel">
          <button
            type="button"
            aria-label={`Take ${name} off the panel`}
            className="text-muted-foreground opacity-0 hover:text-danger-text focus-visible:opacity-100 group-hover:opacity-100"
            onClick={() => actions.removeStain(row.id)}
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </td>
    </tr>
  );
}
