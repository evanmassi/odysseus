import { useMemo } from 'react';

import { Select } from '@shared/ui';

import { useBlocksOf, useProtocolWith } from '../../../../hooks/useWorkbenchSlice';
import {
  panelLayout,
  stainCandidates,
  stainSteps,
} from '../../../../utils/cytometer/cytometerPanel';
import { BUILT_IN_INSTRUMENTS } from '../../../../utils/cytometer/instrumentCatalog';
import { listedMaterials } from '../../../../utils/materials/materialLookup';
import { wellsNamed } from '../../../../utils/vessels/vesselMapNames';

import { CYTOMETER_CELL } from './cytometerTableStyles';
import { useCytometerActions } from './useCytometerActions';
import { WorkbenchCytometerCocktails } from './WorkbenchCytometerCocktails';
import { WorkbenchCytometerLaserGroup } from './WorkbenchCytometerLaserGroup';
import { WorkbenchCytometerMixes } from './WorkbenchCytometerMixes';
import { WorkbenchCytometerPeakMap } from './WorkbenchCytometerPeakMap';
import { WorkbenchCytometerStainRow } from './WorkbenchCytometerStainRow';

import type { CytometerBlock } from '@odysseus/shared-schemas';

interface WorkbenchCytometerPanelProps {
  block: CytometerBlock;
}

const HEAD_CELL =
  'whitespace-nowrap px-3 py-2 text-left type-label text-label-2xs font-semibold text-muted-foreground';
const COLUMN_COUNT = 10;

export function WorkbenchCytometerPanel({ block }: WorkbenchCytometerPanelProps) {
  const actions = useCytometerActions(block);
  const { blocks } = useProtocolWith('materials');
  const materials = useMemo(() => listedMaterials({ blocks }), [blocks]);
  const layout = useMemo(() => panelLayout(block, materials), [block, materials]);
  const steps = useMemo(() => stainSteps(block), [block]);
  const plateBlocks = useBlocksOf('plate');
  const mixWells = useMemo(
    () =>
      wellsNamed(
        plateBlocks,
        block.mixes.map(mix => mix.name)
      ),
    [plateBlocks, block.mixes]
  );
  const materialNames = useMemo(
    () => new Map(materials.map(item => [item.id, item.name.trim()])),
    [materials]
  );
  const stainOptions = useMemo(
    () => stainCandidates(block, materials).map(item => ({ value: item.id, label: item.name })),
    [block, materials]
  );
  const detectorOptions = useMemo(
    () =>
      layout.lasers.flatMap(laser =>
        laser.slots.map(slot => ({
          value: slot.detector.id,
          label: `${slot.detector.id} · ${slot.detector.filter}`,
          group: laser.name,
        }))
      ),
    [layout]
  );
  const instrumentOptions = BUILT_IN_INSTRUMENTS.map(instrument => ({
    value: instrument.name,
    label: instrument.name,
  }));
  const { instrument } = block;
  const isSpectral = instrument?.kind === 'spectral';
  const detectorCount = layout.lasers.reduce((count, laser) => count + laser.slots.length, 0);
  const usedCount = layout.lasers
    .flatMap(laser => laser.slots)
    .filter(slot => slot.stains.length).length;

  return (
    <div className="flex flex-col gap-3 px-3 pb-3 pt-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
        <Select
          size="xs"
          value={instrument?.name ?? null}
          placeholder="Pick the cytometer"
          options={
            instrument && !instrumentOptions.some(option => option.value === instrument.name)
              ? [{ value: instrument.name, label: instrument.name }, ...instrumentOptions]
              : instrumentOptions
          }
          aria-label="Cytometer"
          className="w-80"
          onChange={name => actions.pickInstrument(String(name))}
        />
        {instrument &&
          (isSpectral ? (
            <span>
              {block.rows.length} {block.rows.length === 1 ? 'dye' : 'dyes'} on{' '}
              {layout.lasers.length} lasers · {detectorCount} detectors
            </span>
          ) : (
            <span>
              {usedCount} of {detectorCount} detectors used
            </span>
          ))}
        {layout.clashCount > 0 && (
          <span className="text-danger-text">
            {layout.clashCount} {layout.clashCount === 1 ? 'detector holds' : 'detectors hold'} two
            stains
          </span>
        )}
      </div>

      {!instrument ? (
        <p className="text-body-sm italic text-muted-foreground">
          Pick the cytometer and its lasers and detectors become the rows.
        </p>
      ) : (
        <>
          {isSpectral && <WorkbenchCytometerPeakMap lasers={layout.lasers} />}
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-1">
              <thead>
                <tr>
                  <th className={HEAD_CELL}>Laser</th>
                  {isSpectral ? (
                    <th colSpan={2} className={HEAD_CELL}>
                      Peak detector
                    </th>
                  ) : (
                    <>
                      <th className={HEAD_CELL}>Detector</th>
                      <th className={HEAD_CELL}>Filter</th>
                    </>
                  )}
                  <th className={HEAD_CELL}>Fluorochrome</th>
                  <th className={HEAD_CELL}>Marker</th>
                  <th className={HEAD_CELL}>Clone</th>
                  <th className={HEAD_CELL}>Cat#</th>
                  <th className={HEAD_CELL}>Stain</th>
                  <th className={`${HEAD_CELL} text-right`}>Dilution factor</th>
                  <th className={HEAD_CELL} />
                </tr>
              </thead>
              {layout.lasers.map(laser => (
                <WorkbenchCytometerLaserGroup
                  key={laser.name}
                  laser={laser}
                  isSpectral={isSpectral}
                  detectorOptions={detectorOptions}
                  stainOptions={stainOptions}
                  steps={steps}
                  actions={actions}
                />
              ))}
              {layout.unplaced.length > 0 && (
                <tbody>
                  <tr>
                    <td colSpan={COLUMN_COUNT} className={`${CYTOMETER_CELL} text-warning-text`}>
                      Not on this cytometer: pick a detector for each
                    </td>
                  </tr>
                  {layout.unplaced.map(stain => (
                    <WorkbenchCytometerStainRow
                      key={stain.row.id}
                      stain={stain}
                      color={undefined}
                      lead={<td className={CYTOMETER_CELL} />}
                      clashWording=""
                      detectorCells={
                        <td colSpan={2} className={CYTOMETER_CELL}>
                          <Select
                            size="xs"
                            isQuiet
                            value={null}
                            placeholder={stain.row.detectorId}
                            options={detectorOptions}
                            aria-label={`Detector for ${stain.material?.name ?? 'this stain'}`}
                            className="w-36"
                            onChange={detectorId =>
                              actions.changeRow(stain.row.id, { detectorId: String(detectorId) })
                            }
                          />
                        </td>
                      }
                      steps={steps}
                      actions={actions}
                    />
                  ))}
                </tbody>
              )}
            </table>
          </div>
          <WorkbenchCytometerMixes
            block={block}
            layout={layout}
            materials={materials}
            materialNames={materialNames}
            mixWells={mixWells}
            steps={steps}
            actions={actions}
          />
          <WorkbenchCytometerCocktails
            block={block}
            layout={layout}
            mixWells={mixWells}
            materialNames={materialNames}
          />
        </>
      )}
    </div>
  );
}
