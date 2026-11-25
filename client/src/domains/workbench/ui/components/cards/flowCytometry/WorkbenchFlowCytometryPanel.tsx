import { useMemo } from 'react';

import { HeaderStrip, PanelEmptyState, Select, Tooltip } from '@shared/ui';

import { useFluorCatalog } from '../../../../hooks/useFluorCatalog';
import { useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { BUILT_IN_CYTOMETERS } from '../../../../utils/flowCytometry/cytometerCatalog';
import {
  stainAmountId,
  stainSampleNouns,
} from '../../../../utils/flowCytometry/flowCytometryNames';
import {
  panelLayout,
  markerCandidates,
  markerFluor,
  panelStainings,
} from '../../../../utils/flowCytometry/flowCytometryPanel';
import { markerCandidatesOn } from '../../../../utils/flowCytometry/markerPlacement';
import { calculationAnswerText } from '../../../../utils/formulas/boardCalculation';
import { listedMaterials } from '../../../../utils/materials/materialLookup';
import { stainedPlaces, stainedSampleCounts } from '../../../../utils/plateMap/stainSide';
import {
  ANTIBODY_DILUTION,
  perLabwareKind,
  VOLUME_PER_WELL,
  WELLS,
} from '../../../../utils/terms/termList';
import { lowerLead } from '../../../../utils/values/valueNames';
import { CARD_ICONS } from '../../board/cardIcons';

import {
  FLOW_CYTOMETRY_CELL,
  FLOW_CYTOMETRY_HEAD_CELL,
  FLOW_CYTOMETRY_NUMBER_HEAD_CELL,
  LASER_HEAD_CELL,
} from './flowCytometryTableStyles';
import { useFlowCytometryActions } from './useFlowCytometryActions';
import { WorkbenchFlowCytometryCocktails } from './WorkbenchFlowCytometryCocktails';
import { WorkbenchFlowCytometryDetectorCells } from './WorkbenchFlowCytometryDetectorCells';
import { WorkbenchFlowCytometryDetectorPicker } from './WorkbenchFlowCytometryDetectorPicker';
import { WorkbenchFlowCytometryLaserGroup } from './WorkbenchFlowCytometryLaserGroup';
import {
  WorkbenchFlowCytometryMarkerRow,
  type StainAmount,
} from './WorkbenchFlowCytometryMarkerRow';
import { WorkbenchFlowCytometryPeakMap } from './WorkbenchFlowCytometryPeakMap';
import { WorkbenchFlowCytometryStains } from './WorkbenchFlowCytometryStains';
import { WorkbenchFlowCytometryUsageBar } from './WorkbenchFlowCytometryUsageBar';

import type { FlowCytometryPanelCard } from '@odysseus/shared-schemas';

interface WorkbenchFlowCytometryPanelProps {
  card: FlowCytometryPanelCard;
}

const NUMBER_HEAD_CELL = `w-24 ${FLOW_CYTOMETRY_NUMBER_HEAD_CELL}`;
const COLUMNS_BESIDE_AMOUNTS = 10;

export function WorkbenchFlowCytometryPanel({ card }: WorkbenchFlowCytometryPanelProps) {
  const actions = useFlowCytometryActions(card);
  const materialList = useWorkbenchStore(state => state.protocol.materials);
  const materials = useMemo(() => listedMaterials({ materials: materialList }), [materialList]);
  const catalog = useFluorCatalog();
  const layout = useMemo(() => panelLayout(card, materials, catalog), [card, materials, catalog]);
  const stainings = useMemo(() => panelStainings(card), [card]);
  const plateMaps = useWorkbenchStore(state => state.protocol.plateMaps);
  const stainPlaces = useMemo(() => stainedPlaces(plateMaps), [plateMaps]);
  const samples = useMemo(() => stainedSampleCounts(plateMaps), [plateMaps]);
  const amountNouns = useMemo(() => stainSampleNouns(card.stains, samples), [card, samples]);
  const amountEntries = useWorkbenchData(state =>
    card.markers.map((row): [string, StainAmount[]] => [
      row.id,
      amountNouns.map((noun): StainAmount => {
        const result = state.board.results.get(stainAmountId(row.id, noun));
        if (result?.status === 'ok') return { text: calculationAnswerText(result) };
        if (result?.status === 'error') return { problem: result.message };
        return { problem: `Not stained in ${lowerLead(perLabwareKind(WELLS, noun).word)}` };
      }),
    ])
  );
  const amounts = useMemo(() => new Map(amountEntries), [amountEntries]);
  const materialNames = useMemo(
    () => new Map(materials.map(item => [item.id, item.name.trim()])),
    [materials]
  );
  const candidates = useMemo(
    () =>
      card.cytometer
        ? markerCandidatesOn(
            card.cytometer,
            catalog,
            markerCandidates(card, materials).map(item => ({
              materialId: item.id,
              name: item.name.trim(),
              fluor: markerFluor(item),
            }))
          )
        : [],
    [card, materials, catalog]
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
  const cytometerOptions = BUILT_IN_CYTOMETERS.map(cytometer => ({
    value: cytometer.name,
    label: cytometer.name,
  }));
  const cytometer = card.cytometer;
  const isSpectral = cytometer?.kind === 'spectral';

  return (
    <div className="flex flex-col gap-3 px-3 pb-3">
      <HeaderStrip className="-mx-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 text-body-sm text-muted-foreground">
        <Select
          size="xs"
          fitsWidestOption
          value={cytometer?.name ?? null}
          placeholder="Pick the cytometer"
          options={
            cytometer && !cytometerOptions.some(option => option.value === cytometer.name)
              ? [{ value: cytometer.name, label: cytometer.name }, ...cytometerOptions]
              : cytometerOptions
          }
          aria-label="Cytometer"
          onChange={name => actions.pickCytometer(String(name))}
        />
        {layout.detectorConflictCount > 0 && (
          <span className="text-danger-text">
            {layout.detectorConflictCount}{' '}
            {layout.detectorConflictCount === 1 ? 'detector holds' : 'detectors hold'} more than one
            marker
          </span>
        )}
        {layout.misplacedCount > 0 && (
          <span className="text-warning-text">
            {layout.misplacedCount}{' '}
            {layout.misplacedCount === 1 ? 'marker would work' : 'markers would work'} better on
            another detector
          </span>
        )}
        {cytometer && <WorkbenchFlowCytometryUsageBar layout={layout} isSpectral={isSpectral} />}
      </HeaderStrip>

      {!cytometer ? (
        <PanelEmptyState
          icon={CARD_ICONS.flowCytometryPanel}
          message="Pick the cytometer above"
          description="Its lasers and detectors become the rows"
        />
      ) : (
        <>
          {isSpectral && <WorkbenchFlowCytometryPeakMap lasers={layout.lasers} />}
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-1">
              <thead>
                <tr>
                  <th className={LASER_HEAD_CELL}>Laser</th>
                  <th className={FLOW_CYTOMETRY_HEAD_CELL}>
                    {isSpectral ? 'Peak detector' : 'Detector'}
                  </th>
                  <th className={FLOW_CYTOMETRY_HEAD_CELL}>Filter</th>
                  <th className={FLOW_CYTOMETRY_HEAD_CELL}>Fluor</th>
                  <th className={FLOW_CYTOMETRY_HEAD_CELL}>Marker</th>
                  <th className={FLOW_CYTOMETRY_HEAD_CELL}>Clone</th>
                  <th className={FLOW_CYTOMETRY_HEAD_CELL}>Isotype</th>
                  <th className={FLOW_CYTOMETRY_HEAD_CELL}>
                    <Tooltip content="The staining the marker goes in: Surface, ICS or Viability. Each staining gets its own cocktail">
                      <span>Staining</span>
                    </Tooltip>
                  </th>
                  <th className={NUMBER_HEAD_CELL}>{ANTIBODY_DILUTION.word}</th>
                  {amountNouns.map(noun => (
                    <th key={noun} className={NUMBER_HEAD_CELL}>
                      {perLabwareKind(VOLUME_PER_WELL, noun).word}
                    </th>
                  ))}
                  <th className={FLOW_CYTOMETRY_HEAD_CELL} />
                </tr>
              </thead>
              {layout.lasers.map(laser => (
                <WorkbenchFlowCytometryLaserGroup
                  key={laser.name}
                  laser={laser}
                  isSpectral={isSpectral}
                  detectorOptions={detectorOptions}
                  candidates={candidates}
                  stainings={stainings}
                  amounts={amounts}
                  amountColumnCount={amountNouns.length}
                  actions={actions}
                />
              ))}
              {layout.unplaced.length > 0 && (
                <tbody>
                  <tr>
                    <td
                      colSpan={COLUMNS_BESIDE_AMOUNTS + amountNouns.length}
                      className={`${FLOW_CYTOMETRY_CELL} text-warning-text`}
                    >
                      Not on this cytometer: pick a detector for each
                    </td>
                  </tr>
                  {layout.unplaced.map(marker => (
                    <WorkbenchFlowCytometryMarkerRow
                      key={marker.row.id}
                      marker={marker}
                      color={undefined}
                      lead={<td className={FLOW_CYTOMETRY_CELL} />}
                      conflictWording=""
                      detectorCell={
                        <WorkbenchFlowCytometryDetectorCells
                          detector={undefined}
                          picker={
                            <WorkbenchFlowCytometryDetectorPicker
                              value={null}
                              placeholder={marker.row.detectorId}
                              options={detectorOptions}
                              label={`Detector for ${marker.material?.name ?? 'this marker'}`}
                              onPick={detectorId =>
                                actions.changeRow(marker.row.id, { detectorId })
                              }
                            />
                          }
                        />
                      }
                      stainings={stainings}
                      amounts={amounts.get(marker.row.id) ?? []}
                      actions={actions}
                    />
                  ))}
                </tbody>
              )}
            </table>
          </div>
          <WorkbenchFlowCytometryStains
            card={card}
            layout={layout}
            materials={materials}
            materialNames={materialNames}
            stainPlaces={stainPlaces}
            stainings={stainings}
            actions={actions}
          />
          <WorkbenchFlowCytometryCocktails
            card={card}
            layout={layout}
            samples={samples}
            materialNames={materialNames}
          />
        </>
      )}
    </div>
  );
}
