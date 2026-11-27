import { useMemo, useState } from 'react';

import { Plus } from 'lucide-react';

import { HeaderStrip, Tab } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { usePlateSwatches } from '../../../../hooks/usePlateSwatches';
import { useShowTarget } from '../../../../hooks/useShowTarget';
import { useProtocolOutsidePages } from '../../../../hooks/useWorkbenchSlice';
import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { ownDiluent, runDiluents } from '../../../../utils/dilutions/dilutionDiluents';
import { recordOnMaterial, setSharedPrepValue } from '../../../../utils/dilutions/dilutionEdits';
import { dilutionPrep } from '../../../../utils/dilutions/dilutionPrep';
import { dilutionRuns, type DilutionRun } from '../../../../utils/dilutions/dilutionRuns';
import { STOCK_FIELD, WEIGHT_FIELD } from '../../../../utils/dilutions/dilutionStock';
import { seriesRowView } from '../../../../utils/dilutions/seriesNumbers';
import { readReference } from '../../../../utils/formulas/nameReferences';
import { materialGroup } from '../../../../utils/materials/materialCatalog';
import { guessMaterial } from '../../../../utils/materials/materialGuesser';
import { materialFromGuess } from '../../../../utils/materials/materialItems';
import {
  ensureMaterial,
  listedMaterials,
  shortNameOf,
} from '../../../../utils/materials/materialLookup';
import { materialKnowledge } from '../../../../utils/materials/materialMemory';
import {
  removeSeriesEverywhere,
  setPrepSetting,
  startSeries,
} from '../../../../utils/plateMap/seriesEdits';
import { assaySetupTitleOf } from '../../../../utils/values/valueNames';
import { writeValueSource, writeValueSourceUnit } from '../../../../utils/values/valueSources';
import { CARD_ICONS } from '../../board/cardIcons';
import { WorkbenchMaterialPick } from '../../board/WorkbenchMaterialPick';
import { WorkbenchTabStrip } from '../../board/WorkbenchTabStrip';
import { WorkbenchIndicatorSwatch } from '../plateMap/WorkbenchIndicatorSwatch';

import { WorkbenchDilutionDiluentField } from './WorkbenchDilutionDiluentField';
import { PLAIN_RAIL, WorkbenchDilutionSeriesSection } from './WorkbenchDilutionSeriesSection';

import type { PlateSwatch } from '../../../../utils/plateMap/plateSwatches';
import type { ProtocolCard } from '@odysseus/shared-schemas';

const ALL_SERIES = 'all';
const DILUENT_GROUPS: ReadonlySet<string> = new Set(['media']);
const DILUENT_HINT = 'e.g. medium';

interface WorkbenchDilutionsPanelProps {
  card: Extract<ProtocolCard, { type: 'dilutions' }>;
}

export function WorkbenchDilutionsPanel({ card }: WorkbenchDilutionsPanelProps) {
  const protocol = useProtocolOutsidePages();
  const board = useWorkbenchStore(state => state.board);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const memory = useMaterialMemoryStore(state => state.memory);
  const known = useMemo(() => materialKnowledge(memory, protocol), [memory, protocol]);
  const swatchOf = usePlateSwatches();
  const runs = dilutionRuns(protocol);
  const indicatorOf = (run: DilutionRun): PlateSwatch =>
    swatchOf(run.subject) ?? { color: run.color ?? PLAIN_RAIL, kind: 'fill' };
  const diluents = runDiluents(runs, protocol.diluent);
  const diluentChoices = useMemo(
    () =>
      listedMaterials(protocol)
        .sort((a, b) => Number(DILUENT_GROUPS.has(b.group)) - Number(DILUENT_GROUPS.has(a.group)))
        .map(item => ({
          value: item.name.trim(),
          label: item.name.trim(),
          secondary: shortNameOf(item) || undefined,
          group: materialGroup(item.group).label,
        })),
    [protocol]
  );
  const [shownKey, setShownKey] = useState(ALL_SERIES);
  const [removing, setRemoving] = useState<DilutionRun>();
  const showTarget = useShowTarget();
  const firstPlateMapId = protocol.plateMaps[0]?.id;
  const materialOptions = useMemo(
    () =>
      listedMaterials(protocol).map(item => ({
        value: item.id,
        label: item.name.trim(),
        group: materialGroup(item.group).label,
      })),
    [protocol]
  );
  const createMaterial = (name: string) => materialFromGuess(guessMaterial(name, known), memory);
  const shown = runs.find(run => run.key === shownKey);
  const isShowingAll = !shown;

  const listDiluent = (saved: string) => {
    const { name } = readReference(saved);
    if (!name) return;
    updateProtocol(draft => {
      ensureMaterial(draft, name, createMaterial);
    });
  };

  const setRunDiluent = (run: DilutionRun, diluent: string) =>
    updateProtocol(draft => {
      for (const seriesId of run.seriesIds) setPrepSetting(draft, seriesId, 'diluent', diluent);
    });

  const showSeries = (seriesId: string) => setShownKey(runs.length ? seriesId : ALL_SERIES);
  const newDilution = (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Plus aria-hidden className="h-3.5 w-3.5 flex-none text-primary" />
      <WorkbenchMaterialPick
        label="Add dilution"
        newLabel="New material…"
        example="Drug X"
        options={materialOptions}
        onPick={materialId => {
          let seriesId = '';
          updateProtocol(draft => {
            seriesId = startSeries(draft, materialId);
          });
          showSeries(seriesId);
        }}
        onCreate={text => {
          let seriesId = '';
          updateProtocol(draft => {
            seriesId = startSeries(draft, ensureMaterial(draft, text, createMaterial).id);
          });
          showSeries(seriesId);
        }}
      />
    </div>
  );
  const removeDialog = (
    <ConfirmDialog
      isOpen={!!removing}
      variant="danger"
      title="Remove dilution"
      message={`The ${removing?.subject.trim() ? removing.subject : 'unnamed'} dilution is permanently removed${removing?.members.length ? ', along with its wells on the plate' : ''}.`}
      confirmText="Remove"
      onConfirm={() => {
        if (removing) updateProtocol(draft => removeSeriesEverywhere(draft, removing.seriesIds));
        setShownKey(ALL_SERIES);
        setRemoving(undefined);
      }}
      onCancel={() => setRemoving(undefined)}
    />
  );

  if (!runs.length) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <CARD_ICONS.dilutions aria-hidden className="h-6 w-6 text-muted-foreground" />
        <p className="text-body-sm text-foreground">No dilutions yet</p>
        <p className="text-body-sm text-muted-foreground">
          Start one here, or paint a dilution on a plate.
        </p>
        {newDilution}
      </div>
    );
  }

  const hasTabs = runs.length > 1;
  const protocolDiluent = (
    <WorkbenchDilutionDiluentField
      value={readReference(protocol.diluent).name}
      placeholder={DILUENT_HINT}
      choices={diluentChoices}
      isInline={hasTabs}
      onChange={diluent =>
        updateProtocol(draft => {
          draft.diluent = diluent;
        })
      }
      onDone={() => listDiluent(protocol.diluent)}
    />
  );

  return (
    <div className={`flex flex-col gap-4 px-4 pb-3 ${hasTabs ? '' : 'pt-1'}`}>
      {!hasTabs && protocolDiluent}
      {hasTabs && (
        <HeaderStrip className="-mx-4 flex items-center gap-3 px-4">
          <WorkbenchTabStrip
            value={isShowingAll ? ALL_SERIES : shownKey}
            ids={[ALL_SERIES, ...runs.map(run => run.key)]}
            onChange={setShownKey}
          >
            <Tab id={ALL_SERIES}>All</Tab>
            {runs.map(run => (
              <Tab key={run.key} id={run.key}>
                <span className="mr-1.5 inline-flex align-middle">
                  <WorkbenchIndicatorSwatch swatch={indicatorOf(run)} />
                </span>
                {run.subject || 'Unnamed treatment'}
              </Tab>
            ))}
          </WorkbenchTabStrip>
          <span className="flex-none">{protocolDiluent}</span>
        </HeaderStrip>
      )}
      {runs.map(run => {
        if (!isShowingAll && run !== shown) return null;
        const prep = dilutionPrep(run, protocol, board, diluents.get(run.key) ?? '');
        return (
          <WorkbenchDilutionSeriesSection
            key={run.key}
            id={`${card.id}-${run.key}`}
            subject={run.subject}
            places={run.places.length > 1 ? run.places : []}
            color={run.color}
            swatch={indicatorOf(run)}
            prep={prep}
            assaySetupTitle={assaySetupTitleOf(protocol)}
            diluent={readReference(ownDiluent(run)).name}
            diluentPlaceholder={readReference(protocol.diluent).name || DILUENT_HINT}
            diluentChoices={diluentChoices}
            onSharedChange={(field, value) =>
              updateProtocol(draft => setSharedPrepValue(draft, run, field, value, card.page))
            }
            onRoundToChange={value =>
              updateProtocol(draft =>
                writeValueSource(draft, { kind: 'roundTo', seriesIds: run.seriesIds }, value)
              )
            }
            onDiluentChange={diluent => setRunDiluent(run, diluent)}
            onDiluentDone={() => listDiluent(ownDiluent(run))}
            seriesRow={seriesRowView(run)}
            plateNames={run.places}
            isPainted={run.members.length > 0}
            onSeriesChange={(field, value) =>
              updateProtocol(draft =>
                writeValueSource(draft, { kind: 'series', seriesIds: run.seriesIds, field }, value)
              )
            }
            onTopUnitChange={unit =>
              updateProtocol(draft =>
                writeValueSourceUnit(
                  draft,
                  { kind: 'series', seriesIds: run.seriesIds, field: 'top' },
                  unit
                )
              )
            }
            onRemove={() => setRemoving(run)}
            onPutOnPlate={
              firstPlateMapId
                ? () => showTarget({ type: 'plateMap', shows: firstPlateMapId })
                : undefined
            }
            onStockSave={(value, unit) => {
              if (prep.kind !== 'ready' || prep.stock.kind !== 'ask') return;
              const field = prep.stock.need === 'weight' ? WEIGHT_FIELD : STOCK_FIELD;
              updateProtocol(draft =>
                recordOnMaterial(draft, run.subject, field, value, unit, createMaterial)
              );
            }}
          />
        );
      })}
      {newDilution}
      {removeDialog}
    </div>
  );
}
