import type { CSSProperties, ReactNode } from 'react';

import { type SelectOption } from '@shared/ui';

import { firstOpenDetector } from '../../../../utils/cytometer/cytometerPanel';

import { CYTOMETER_CELL, FLUOROCHROME_SQUARE, LASER_LEAD, OPEN_ROW } from './cytometerTableStyles';
import { WorkbenchCytometerAddStain } from './WorkbenchCytometerAddStain';
import { WorkbenchCytometerDetectorCells } from './WorkbenchCytometerDetectorCells';
import { WorkbenchCytometerDetectorPicker } from './WorkbenchCytometerDetectorPicker';
import { WorkbenchCytometerStainRow, type StainAmount } from './WorkbenchCytometerStainRow';

import type { CytometerActions } from './useCytometerActions';
import type { LaserGroup } from '../../../../utils/cytometer/cytometerPanel';
import type { StainCandidate } from '../../../../utils/cytometer/stainPlacement';

interface WorkbenchCytometerLaserGroupProps {
  laser: LaserGroup;
  isSpectral: boolean;
  detectorOptions: SelectOption[];
  candidates: readonly StainCandidate[];
  steps: readonly string[];
  amounts: ReadonlyMap<string, StainAmount>;
  actions: CytometerActions;
}

const COLUMNS_AFTER_FILTER = 8;
const NO_AMOUNT: StainAmount = {};
const WARNING_TONE = 'var(--color-warning-bg)';

function groupedOptions(
  candidates: readonly StainCandidate[],
  worksBestHere: (candidate: StainCandidate) => boolean,
  place: string
): SelectOption[] {
  const here = candidates.filter(worksBestHere);
  const others = candidates.filter(candidate => !worksBestHere(candidate));
  return [
    ...here.map(({ materialId, name }) => ({
      value: materialId,
      label: name,
      group: `Works best on ${place}`,
    })),
    ...others.map(({ materialId, name, best }) => ({
      value: materialId,
      label: best ? `${name} · works best on ${best.detector.id}` : name,
      group: here.length ? 'Other stains' : undefined,
    })),
  ];
}

export function WorkbenchCytometerLaserGroup({
  laser,
  isSpectral,
  detectorOptions,
  candidates,
  steps,
  amounts,
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
        {isSpectral ? (
          <span className="mt-1 block text-label-xs text-muted-foreground">
            {stains.length} {stains.length === 1 ? 'dye' : 'dyes'}
            <span className="block">{laser.slots.length} detectors</span>
          </span>
        ) : (
          <span className="mt-1 block text-label-xs text-muted-foreground">
            {usedCount} of {laser.slots.length} used
          </span>
        )}
      </td>
    );
  };

  const addStain = (
    label: string,
    options: SelectOption[],
    detectorId: string | undefined,
    placeOf: (materialId: string) => string | undefined = () => undefined
  ) =>
    detectorId && (
      <WorkbenchCytometerAddStain
        label={label}
        stainOptions={options}
        onAdd={materialId => actions.addStain(materialId, placeOf(materialId) ?? detectorId)}
        onCreate={text => actions.createStain(text, detectorId)}
      />
    );
  const workingBestHere = (detectorId: string) => {
    const names = candidates
      .filter(candidate => candidate.best?.detector.id === detectorId)
      .map(candidate => candidate.name);
    if (!names.length) return '';
    return `${names.join(', ')} ${names.length === 1 ? 'works' : 'work'} best here`;
  };
  const bestOf = (materialId: string) =>
    candidates.find(candidate => candidate.materialId === materialId)?.best;

  return (
    <tbody style={{ '--laser': laser.color } as CSSProperties}>
      {shownSlots.map(slot => {
        if (!slot.stains.length) {
          return (
            <tr
              key={slot.detector.id}
              className={OPEN_ROW}
              style={{ '--row-tone': laser.tone } as CSSProperties}
            >
              {leadOnce()}
              <WorkbenchCytometerDetectorCells detector={slot.detector} />
              <td colSpan={COLUMNS_AFTER_FILTER} className={CYTOMETER_CELL}>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`${FLUOROCHROME_SQUARE} outline-dashed outline-1 -outline-offset-1 outline-muted-foreground/60`}
                  />
                  {addStain(
                    `Add a stain on ${slot.detector.id}`,
                    groupedOptions(
                      candidates,
                      candidate => candidate.best?.detector.id === slot.detector.id,
                      slot.detector.id
                    ),
                    slot.detector.id
                  )}
                  {workingBestHere(slot.detector.id) && (
                    <span className="text-label-xs text-success-text">
                      {workingBestHere(slot.detector.id)}
                    </span>
                  )}
                </span>
              </td>
            </tr>
          );
        }
        return slot.stains.map(stain => (
          <WorkbenchCytometerStainRow
            key={stain.row.id}
            stain={stain}
            color={stain.dyeColor ?? slot.color}
            tone={stain.misplacement ? WARNING_TONE : laser.tone}
            lead={leadOnce()}
            clashWording={isSpectral ? 'Same peak as' : 'Same detector as'}
            detectorCell={
              <WorkbenchCytometerDetectorCells
                detector={slot.detector}
                isLit
                picker={
                  isSpectral ? (
                    <WorkbenchCytometerDetectorPicker
                      value={stain.row.detectorId}
                      options={detectorOptions}
                      label={`Peak detector of ${stain.material?.name ?? 'this dye'}`}
                      onPick={detectorId => actions.changeRow(stain.row.id, { detectorId })}
                    />
                  ) : undefined
                }
              />
            }
            steps={steps}
            amount={amounts.get(stain.row.id) ?? NO_AMOUNT}
            actions={actions}
          />
        ));
      })}
      {isSpectral && (
        <tr className="text-muted-foreground">
          {leadOnce()}
          <WorkbenchCytometerDetectorCells detector={undefined} />
          <td colSpan={COLUMNS_AFTER_FILTER} className={CYTOMETER_CELL}>
            <span className="flex items-center">
              {addStain(
                `Add a dye on ${laser.name}`,
                groupedOptions(
                  candidates,
                  candidate => candidate.best?.laser.name === laser.name,
                  laser.name
                ),
                firstOpenDetector(laser),
                materialId => bestOf(materialId)?.detector.id
              )}
            </span>
          </td>
        </tr>
      )}
    </tbody>
  );
}
