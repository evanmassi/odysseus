import { useMemo } from 'react';

import { HeaderStrip, PanelEmptyState, Select, Tooltip } from '@shared/ui';

import { useFluorCatalog } from '../../../../hooks/useFluorCatalog';
import { useCardsOf, useProtocolWith, useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { BUILT_IN_CYTOMETERS } from '../../../../utils/flowCytometry/cytometerCatalog';
import { stainAmountId } from '../../../../utils/flowCytometry/flowCytometryNames';
import {
  panelLayout,
  markerCandidates,
  markerFluor,
  panelStainings,
} from '../../../../utils/flowCytometry/flowCytometryPanel';
import { markerCandidatesOn } from '../../../../utils/flowCytometry/markerPlacement';
import { calculationAnswerText } from '../../../../utils/formulas/boardCalculation';
import { listedMaterials } from '../../../../utils/materials/materialLookup';
import { stainedPlaces } from '../../../../utils/plateMap/stainSide';
import { CARD_ICONS } from '../../board/cardIcons';

import { FLOW_CYTOMETRY_CELL } from './flowCytometryTableStyles';
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

const HEAD_CELL =
  'whitespace-nowrap px-3 py-2 text-left type-label text-label-2xs font-semibold text-muted-foreground';
const COLUMN_COUNT = 11;
const NUMBER_HEAD_CELL =
  'w-24 px-3 py-2 text-right align-bottom type-label text-label-2xs font-semibold leading-tight text-muted-foreground';

export function WorkbenchFlowCytometryPanel({ card }: WorkbenchFlowCytometryPanelProps) {
  const actions = useFlowCytometryActions(card);
  const { cards: cards } = useProtocolWith('materials');
  const materials = useMemo(() => listedMaterials({ cards: cards }), [cards]);
  const catalog = useFluorCatalog();
  const layout = useMemo(() => panelLayout(card, materials, catalog), [card, materials, catalog]);
  const stainings = useMemo(() => panelStainings(card), [card]);
  const amountEntries = useWorkbenchData(state =>
    card.markers.map((row): [string, StainAmount] => {
      const result = state.board.results.get(stainAmountId(row.id));
      if (result?.status === 'ok') return [row.id, { text: calculationAnswerText(result) }];
      return [row.id, { problem: result?.status === 'error' ? result.message : undefined }];
    })
  );
  const amounts = useMemo(() => new Map(amountEntries), [amountEntries]);
  const plateCards = useCardsOf('plateMap');
  const stainPlaces = useMemo(() => stainedPlaces(plateCards), [plateCards]);
  const wellsPerStain = useMemo(
    () =>
      new Map(
        [...stainPlaces].map(([stainId, places]) => [
          stainId,
          places.reduce((sum, place) => sum + place.count, 0),
        ])
      ),
    [stainPlaces]
  );
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
                  <th className={HEAD_CELL}>Laser</th>
                  <th className={HEAD_CELL}>{isSpectral ? 'Peak detector' : 'Detector'}</th>
                  <th className={HEAD_CELL}>Filter</th>
                  <th className={HEAD_CELL}>Fluor</th>
                  <th className={HEAD_CELL}>Marker</th>
                  <th className={HEAD_CELL}>Clone</th>
                  <th className={HEAD_CELL}>Isotype</th>
                  <th className={HEAD_CELL}>
                    <Tooltip content="The staining the marker goes in: Surface, ICS or Viability. Each staining gets its own cocktail">
                      <span>Staining</span>
                    </Tooltip>
                  </th>
                  <th className={NUMBER_HEAD_CELL}>Dilution factor</th>
                  <th className={NUMBER_HEAD_CELL}>Amount per well</th>
                  <th className={HEAD_CELL} />
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
                  actions={actions}
                />
              ))}
              {layout.unplaced.length > 0 && (
                <tbody>
                  <tr>
                    <td
                      colSpan={COLUMN_COUNT}
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
                      amount={amounts.get(marker.row.id) ?? {}}
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
            wellsPerStain={wellsPerStain}
            materialNames={materialNames}
          />
        </>
      )}
    </div>
  );
}
