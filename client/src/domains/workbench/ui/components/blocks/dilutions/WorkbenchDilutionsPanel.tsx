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
  type SeriesPrepKey,
} from '../../../../utils/dilutions/dilutionEdits';
import { dilutionPrep } from '../../../../utils/dilutions/dilutionPrep';
import { dilutionRuns, type DilutionRun } from '../../../../utils/dilutions/dilutionRuns';
import { STOCK_FIELD, WEIGHT_FIELD } from '../../../../utils/dilutions/dilutionStock';
import { materialGroup } from '../../../../utils/materials/materialCatalog';
import { guessMaterial } from '../../../../utils/materials/materialGuesser';
import { materialFromGuess } from '../../../../utils/materials/materialItems';
import {
  ensureMaterial,
  listedMaterials,
  shortNameOf,
} from '../../../../utils/materials/materialLookup';
import { materialKnowledge } from '../../../../utils/materials/materialMemory';
import { BLOCK_ICONS } from '../../board/blockIcons';
import { WorkbenchTabStrip } from '../../board/WorkbenchTabStrip';
import { WorkbenchMarkSwatch } from '../vessels/WorkbenchMarkSwatch';

import { WorkbenchDilutionDiluentField } from './WorkbenchDilutionDiluentField';
import { PLAIN_RAIL, WorkbenchDilutionSeriesSection } from './WorkbenchDilutionSeriesSection';

import type { PlateSwatch } from '../../../../utils/vessels/plateSwatches';
import type { ProtocolBlock } from '@odysseus/shared-schemas';

const ALL_SERIES = 'all';
const DILUENT_GROUPS: ReadonlySet<string> = new Set(['media']);
const DILUENT_HINT = 'e.g. medium';

interface WorkbenchDilutionsPanelProps {
  block: Extract<ProtocolBlock, { type: 'dilutions' }>;
}

export function WorkbenchDilutionsPanel({ block }: WorkbenchDilutionsPanelProps) {
  const protocol = useProtocolOutsidePages();
  const calculation = useWorkbenchStore(state => state.calculation);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const memory = useMaterialMemoryStore(state => state.memory);
  const known = useMemo(() => materialKnowledge(memory, protocol), [memory, protocol]);
  const swatchOf = usePlateSwatches();
  const runs = dilutionRuns(protocol);
  const markOf = (run: DilutionRun): PlateSwatch =>
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

  const listDiluent = (name: string) => {
    if (!name.trim()) return;
    updateProtocol(draft => {
      ensureMaterial(draft, name.trim(), createMaterial);
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
        icon={BLOCK_ICONS.dilutions}
        message="Add a dilution series on a plate"
        description="Pick wells, type an amount and click Dilution"
      />
    );
  }

  const hasTabs = runs.length > 1;
  const protocolDiluent = (
    <WorkbenchDilutionDiluentField
      value={protocol.diluent}
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
                  <WorkbenchMarkSwatch swatch={markOf(run)} />
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
        const prep = dilutionPrep(run, protocol, calculation, diluents.get(run.key) ?? '');
        return (
          <WorkbenchDilutionSeriesSection
            key={run.key}
            id={`${block.id}-${run.key}`}
            subject={run.subject}
            places={run.places.length > 1 ? run.places : []}
            color={run.color}
            swatch={markOf(run)}
            prep={prep}
            diluent={ownDiluent(run)}
            diluentPlaceholder={protocol.diluent.trim() || DILUENT_HINT}
            diluentChoices={diluentChoices}
            onSettingChange={(key, value) => setOnMembers(run, key, value)}
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
