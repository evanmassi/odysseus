import type { CSSProperties, ReactNode } from 'react';

import { type SelectOption } from '@shared/ui';

import { firstOpenDetector } from '../../../../utils/flowCytometry/flowCytometryPanel';

import {
  FLOW_CYTOMETRY_CELL,
  FLUOR_SQUARE,
  LASER_LEAD,
  OPEN_ROW,
} from './flowCytometryTableStyles';
import { WorkbenchFlowCytometryAddMarker } from './WorkbenchFlowCytometryAddMarker';
import { WorkbenchFlowCytometryDetectorCells } from './WorkbenchFlowCytometryDetectorCells';
import { WorkbenchFlowCytometryDetectorPicker } from './WorkbenchFlowCytometryDetectorPicker';
import {
  WorkbenchFlowCytometryMarkerRow,
  type StainAmount,
} from './WorkbenchFlowCytometryMarkerRow';

import type { FlowCytometryActions } from './useFlowCytometryActions';
import type { LaserGroup } from '../../../../utils/flowCytometry/flowCytometryPanel';
import type { MarkerCandidate } from '../../../../utils/flowCytometry/markerPlacement';

interface WorkbenchFlowCytometryLaserGroupProps {
  laser: LaserGroup;
  isSpectral: boolean;
  detectorOptions: SelectOption[];
  candidates: readonly MarkerCandidate[];
  stainings: readonly string[];
  amounts: ReadonlyMap<string, readonly StainAmount[]>;
  amountColumnCount: number;
  actions: FlowCytometryActions;
}

const COLUMNS_AFTER_FILTER_BESIDE_AMOUNTS = 7;
const NO_AMOUNTS: readonly StainAmount[] = [];
const WARNING_TONE = 'var(--color-warning-bg)';

function groupedOptions(
  candidates: readonly MarkerCandidate[],
  worksBestHere: (candidate: MarkerCandidate) => boolean,
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
      group: here.length ? 'Other markers' : undefined,
    })),
  ];
}

export function WorkbenchFlowCytometryLaserGroup({
  laser,
  isSpectral,
  detectorOptions,
  candidates,
  stainings,
  amounts,
  amountColumnCount,
  actions,
}: WorkbenchFlowCytometryLaserGroupProps) {
  const markers = laser.slots.flatMap(slot => slot.markers);
  const shownSlots = isSpectral ? laser.slots.filter(slot => slot.markers.length) : laser.slots;
  const rowCount =
    shownSlots.reduce((count, slot) => count + Math.max(1, slot.markers.length), 0) +
    (isSpectral ? 1 : 0);
  const usedCount = laser.slots.filter(slot => slot.markers.length).length;
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
            {markers.length} {markers.length === 1 ? 'fluor' : 'fluors'}
            <span className="block">
              {laser.slots.length} {laser.slots.length === 1 ? 'detector' : 'detectors'}
            </span>
          </span>
        ) : (
          <span className="mt-1 block text-label-xs text-muted-foreground">
            {usedCount} of {laser.slots.length} used
          </span>
        )}
      </td>
    );
  };

  const addMarker = (
    label: string,
    options: SelectOption[],
    detectorId: string | undefined,
    placeOf: (materialId: string) => string | undefined = () => undefined
  ) =>
    detectorId && (
      <WorkbenchFlowCytometryAddMarker
        label={label}
        markerOptions={options}
        onAdd={materialId => actions.addMarker(materialId, placeOf(materialId) ?? detectorId)}
        onCreate={text => actions.createMarker(text, detectorId)}
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
        if (!slot.markers.length) {
          return (
            <tr
              key={slot.detector.id}
              className={OPEN_ROW}
              style={{ '--row-tone': laser.tone } as CSSProperties}
            >
              {leadOnce()}
              <WorkbenchFlowCytometryDetectorCells detector={slot.detector} />
              <td
                colSpan={COLUMNS_AFTER_FILTER_BESIDE_AMOUNTS + amountColumnCount}
                className={FLOW_CYTOMETRY_CELL}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`${FLUOR_SQUARE} outline-dashed outline-1 -outline-offset-1 outline-muted-foreground/60`}
                  />
                  {addMarker(
                    `Add a marker on ${slot.detector.id}`,
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
        return slot.markers.map(marker => (
          <WorkbenchFlowCytometryMarkerRow
            key={marker.row.id}
            marker={marker}
            color={marker.fluorColor ?? slot.color}
            tone={marker.misplacement ? WARNING_TONE : laser.tone}
            lead={leadOnce()}
            conflictWording={isSpectral ? 'Same peak as' : 'Same detector as'}
            detectorCell={
              <WorkbenchFlowCytometryDetectorCells
                detector={slot.detector}
                isLit
                picker={
                  isSpectral ? (
                    <WorkbenchFlowCytometryDetectorPicker
                      value={marker.row.detectorId}
                      options={detectorOptions}
                      label={`Peak detector of ${marker.material?.name ?? 'this marker'}`}
                      onPick={detectorId => actions.changeRow(marker.row.id, { detectorId })}
                    />
                  ) : undefined
                }
              />
            }
            stainings={stainings}
            amounts={amounts.get(marker.row.id) ?? NO_AMOUNTS}
            actions={actions}
          />
        ));
      })}
      {isSpectral && (
        <tr className="text-muted-foreground">
          {leadOnce()}
          <WorkbenchFlowCytometryDetectorCells detector={undefined} />
          <td
            colSpan={COLUMNS_AFTER_FILTER_BESIDE_AMOUNTS + amountColumnCount}
            className={FLOW_CYTOMETRY_CELL}
          >
            <span className="flex items-center">
              {addMarker(
                `Add a marker on ${laser.name}`,
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
