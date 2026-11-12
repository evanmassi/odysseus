import type { CSSProperties, ReactNode } from 'react';

import { Select, type SelectOption } from '@shared/ui';

import { firstOpenDetector } from '../../../../utils/cytometer/cytometerPanel';

import {
  CYTOMETER_CELL,
  FLUOROCHROME_SQUARE,
  LASER_LEAD,
  LASER_WASH,
} from './cytometerTableStyles';
import { WorkbenchCytometerStainRow } from './WorkbenchCytometerStainRow';

import type { CytometerActions } from './useCytometerActions';
import type { LaserGroup } from '../../../../utils/cytometer/cytometerPanel';

interface WorkbenchCytometerLaserGroupProps {
  laser: LaserGroup;
  isSpectral: boolean;
  detectorOptions: SelectOption[];
  stainOptions: SelectOption[];
  steps: readonly string[];
  actions: CytometerActions;
}

const STAIN_COLUMNS = 6;

export function WorkbenchCytometerLaserGroup({
  laser,
  isSpectral,
  detectorOptions,
  stainOptions,
  steps,
  actions,
}: WorkbenchCytometerLaserGroupProps) {
  const stains = laser.slots.flatMap(slot => slot.stains);
  const shownSlots = isSpectral ? laser.slots.filter(slot => slot.stains.length) : laser.slots;
  const rowCount =
    shownSlots.reduce((count, slot) => count + Math.max(1, slot.stains.length), 0) +
    (isSpectral ? 1 : 0);
  const usedCount = laser.slots.filter(slot => slot.stains.length).length;
  let hasLead = false;
  const leadOnce = (): ReactNode => {
    if (hasLead) return undefined;
    hasLead = true;
    return (
      <td rowSpan={rowCount} className={LASER_LEAD}>
        <span className="block font-semibold text-foreground">{laser.name}</span>
        <span className="block text-label-xs text-muted-foreground">{laser.nm} nm</span>
        <span className="mt-1 block text-label-xs text-muted-foreground">
          {isSpectral
            ? `${stains.length} ${stains.length === 1 ? 'dye' : 'dyes'} · ${laser.slots.length} detectors`
            : `${usedCount} of ${laser.slots.length} used`}
        </span>
      </td>
    );
  };

  const addSelect = (label: string, detectorId: string | undefined) =>
    stainOptions.length ? (
      <Select
        size="xs"
        isQuiet
        value={null}
        placeholder={label}
        options={stainOptions}
        aria-label={label}
        className="w-56"
        onChange={materialId => detectorId && actions.addStain(String(materialId), detectorId)}
      />
    ) : (
      <span className="italic">No stains left in Materials</span>
    );

  return (
    <tbody style={{ '--laser': laser.color } as CSSProperties}>
      {shownSlots.map(slot => {
        const fixedCells = (
          <>
            <td className={`${CYTOMETER_CELL} font-semibold`}>{slot.detector.id}</td>
            <td className={`${CYTOMETER_CELL} text-muted-foreground`}>{slot.detector.filter}</td>
          </>
        );
        if (!slot.stains.length) {
          return (
            <tr key={slot.detector.id} className={`${LASER_WASH} text-muted-foreground/70`}>
              {leadOnce()}
              {fixedCells}
              <td className={CYTOMETER_CELL}>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`${FLUOROCHROME_SQUARE} outline-dashed outline-1 -outline-offset-1 outline-muted-foreground/60`}
                  />
                  {slot.detector.usual}
                </span>
              </td>
              <td colSpan={STAIN_COLUMNS} className={CYTOMETER_CELL}>
                {addSelect(`Add a stain on ${slot.detector.id}`, slot.detector.id)}
              </td>
            </tr>
          );
        }
        return slot.stains.map(stain => (
          <WorkbenchCytometerStainRow
            key={stain.row.id}
            stain={stain}
            color={slot.color}
            lead={leadOnce()}
            clashWording={isSpectral ? 'Same peak as' : 'Same detector as'}
            detectorCells={
              isSpectral ? (
                <td colSpan={2} className={CYTOMETER_CELL}>
                  <Select
                    size="xs"
                    isQuiet
                    value={stain.row.detectorId}
                    options={detectorOptions}
                    aria-label={`Peak detector of ${stain.material?.name ?? 'this dye'}`}
                    className="w-36"
                    onChange={detectorId =>
                      actions.changeRow(stain.row.id, { detectorId: String(detectorId) })
                    }
                  />
                </td>
              ) : (
                fixedCells
              )
            }
            steps={steps}
            actions={actions}
          />
        ));
      })}
      {isSpectral && (
        <tr className={`${LASER_WASH} text-muted-foreground`}>
          {leadOnce()}
          <td colSpan={STAIN_COLUMNS + 3} className={CYTOMETER_CELL}>
            {addSelect(`Add a dye on ${laser.name}`, firstOpenDetector(laser))}
          </td>
        </tr>
      )}
    </tbody>
  );
}
