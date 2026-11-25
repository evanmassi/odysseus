import { useMemo, useState } from 'react';

import { HeaderStrip, PanelEmptyState, Tab } from '@shared/ui';

import { usePlateSwatches } from '../../../../hooks/usePlateSwatches';
import { useProtocolOutsidePages } from '../../../../hooks/useWorkbenchSlice';
import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { ownDiluent, runDiluents } from '../../../../utils/dilutions/dilutionDiluents';
import {
  recordOnMaterial,
  setPrepSetting,
  setSharedPrepValue,
  type SeriesPrepKey,
} from '../../../../utils/dilutions/dilutionEdits';
import { dilutionPrep } from '../../../../utils/dilutions/dilutionPrep';
import { dilutionRuns, type DilutionRun } from '../../../../utils/dilutions/dilutionRuns';
import { STOCK_FIELD, WEIGHT_FIELD } from '../../../../utils/dilutions/dilutionStock';
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
import { assaySetupTitleOf } from '../../../../utils/values/valueNames';
import { CARD_ICONS } from '../../board/cardIcons';
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

  const setOnMembers = (run: DilutionRun, key: SeriesPrepKey, value: string) =>
    updateProtocol(draft => {
      for (const member of run.members) {
        setPrepSetting(draft, member.plateId, member.seriesId, key, value);
      }
    });

  if (!runs.length) {
    return (
      <PanelEmptyState
        icon={CARD_ICONS.dilutions}
        message="Add a dilution series on a plate"
        description="Pick wells, type an amount and click Dilution"
      />
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
              updateProtocol(draft =>
                setSharedPrepValue(draft, run.subject, field, value, card.page)
              )
            }
            onRoundToChange={value => setOnMembers(run, 'roundTo', value)}
            onDiluentChange={diluent => setOnMembers(run, 'diluent', diluent)}
            onDiluentDone={() => listDiluent(ownDiluent(run))}
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
    </div>
  );
}
