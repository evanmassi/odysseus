import { useMemo } from 'react';

import { Select } from '@shared/ui';

import { useDyeCatalog } from '../../../../hooks/useDyeCatalog';
import {
  useBlocksOf,
  useProtocolWith,
  useWorkbenchData,
} from '../../../../hooks/useWorkbenchSlice';
import { stainAmountId } from '../../../../utils/cytometer/cytometerNames';
import {
  panelLayout,
  stainCandidates,
  stainFluorochrome,
  stainSteps,
} from '../../../../utils/cytometer/cytometerPanel';
import { BUILT_IN_INSTRUMENTS } from '../../../../utils/cytometer/instrumentCatalog';
import { stainCandidatesOn } from '../../../../utils/cytometer/stainPlacement';
import { formulaAnswerText } from '../../../../utils/formulas/boardCalculation';
import { listedMaterials } from '../../../../utils/materials/materialLookup';
import { wellsNamed } from '../../../../utils/vessels/vesselMapNames';

import { CYTOMETER_CELL } from './cytometerTableStyles';
import { useCytometerActions } from './useCytometerActions';
import { WorkbenchCytometerCocktails } from './WorkbenchCytometerCocktails';
import { WorkbenchCytometerDetectorCells } from './WorkbenchCytometerDetectorCells';
import { WorkbenchCytometerDetectorPicker } from './WorkbenchCytometerDetectorPicker';
import { WorkbenchCytometerLaserGroup } from './WorkbenchCytometerLaserGroup';
import { WorkbenchCytometerMixes } from './WorkbenchCytometerMixes';
import { WorkbenchCytometerPeakMap } from './WorkbenchCytometerPeakMap';
import { WorkbenchCytometerStainRow, type StainAmount } from './WorkbenchCytometerStainRow';

import type { CytometerBlock } from '@odysseus/shared-schemas';

interface WorkbenchCytometerPanelProps {
  block: CytometerBlock;
}

const HEAD_CELL =
  'whitespace-nowrap px-3 py-2 text-left type-label text-label-2xs font-semibold text-muted-foreground';
const COLUMN_COUNT = 11;
const NUMBER_HEAD_CELL =
  'w-24 px-3 py-2 text-right align-bottom type-label text-label-2xs font-semibold leading-tight text-muted-foreground';

export function WorkbenchCytometerPanel({ block }: WorkbenchCytometerPanelProps) {
  const actions = useCytometerActions(block);
  const { blocks } = useProtocolWith('materials');
  const materials = useMemo(() => listedMaterials({ blocks }), [blocks]);
  const catalog = useDyeCatalog();
  const layout = useMemo(() => panelLayout(block, materials, catalog), [block, materials, catalog]);
  const steps = useMemo(() => stainSteps(block), [block]);
  const amountEntries = useWorkbenchData(state =>
    block.rows.map((row): [string, StainAmount] => {
      const result = state.calculation.results.get(stainAmountId(row.id));
      if (result?.status === 'ok') return [row.id, { text: formulaAnswerText(result) }];
      return [row.id, { problem: result?.status === 'error' ? result.message : undefined }];
    })
  );
  const amounts = useMemo(() => new Map(amountEntries), [amountEntries]);
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
  const candidates = useMemo(
    () =>
      block.instrument
        ? stainCandidatesOn(
            block.instrument,
            catalog,
            stainCandidates(block, materials).map(item => ({
              materialId: item.id,
              name: item.name.trim(),
              fluorochrome: stainFluorochrome(item),
            }))
          )
        : [],
    [block, materials, catalog]
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
        {layout.misplacedCount > 0 && (
          <span className="text-warning-text">
            {layout.misplacedCount}{' '}
            {layout.misplacedCount === 1 ? 'stain would work' : 'stains would work'} better on
            another detector
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
                  <th className={HEAD_CELL}>{isSpectral ? 'Peak detector' : 'Detector'}</th>
                  <th className={HEAD_CELL}>Filter</th>
                  <th className={HEAD_CELL}>Fluorochrome</th>
                  <th className={HEAD_CELL}>Marker</th>
                  <th className={HEAD_CELL}>Clone</th>
                  <th className={HEAD_CELL}>Isotype</th>
                  <th className={HEAD_CELL}>Stain</th>
                  <th className={NUMBER_HEAD_CELL}>Dilution factor</th>
                  <th className={NUMBER_HEAD_CELL}>Amount per well</th>
                  <th className={HEAD_CELL} />
                </tr>
              </thead>
              {layout.lasers.map(laser => (
                <WorkbenchCytometerLaserGroup
                  key={laser.name}
                  laser={laser}
                  isSpectral={isSpectral}
                  detectorOptions={detectorOptions}
                  candidates={candidates}
                  steps={steps}
                  amounts={amounts}
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
                      detectorCell={
                        <WorkbenchCytometerDetectorCells
                          detector={undefined}
                          picker={
                            <WorkbenchCytometerDetectorPicker
                              value={null}
                              placeholder={stain.row.detectorId}
                              options={detectorOptions}
                              label={`Detector for ${stain.material?.name ?? 'this stain'}`}
                              onPick={detectorId => actions.changeRow(stain.row.id, { detectorId })}
                            />
                          }
                        />
                      }
                      steps={steps}
                      amount={amounts.get(stain.row.id) ?? {}}
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
