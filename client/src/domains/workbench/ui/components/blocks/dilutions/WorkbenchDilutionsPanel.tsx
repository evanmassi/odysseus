import { useMemo, useState } from 'react';

import { Tab } from '@shared/ui';

import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { recordOnMaterial, setPrepSetting } from '../../../../utils/dilutions/dilutionEdits';
import { dilutionPrep } from '../../../../utils/dilutions/dilutionPrep';
import { dilutionRuns } from '../../../../utils/dilutions/dilutionRuns';
import { STOCK_FIELD, WEIGHT_FIELD } from '../../../../utils/dilutions/dilutionStock';
import { guessMaterial } from '../../../../utils/materials/materialGuesser';
import { materialFromGuess } from '../../../../utils/materials/materialItems';
import { rememberedKinds } from '../../../../utils/materials/materialMemory';
import { WorkbenchTabStrip } from '../../board/WorkbenchTabStrip';

import { WorkbenchDilutionSeriesSection } from './WorkbenchDilutionSeriesSection';

import type { ProtocolBlock } from '@odysseus/shared-schemas';

const ALL_SERIES = 'all';

interface WorkbenchDilutionsPanelProps {
  block: Extract<ProtocolBlock, { type: 'dilutions' }>;
}

export function WorkbenchDilutionsPanel({ block }: WorkbenchDilutionsPanelProps) {
  const protocol = useWorkbenchStore(state => state.protocol);
  const calculation = useWorkbenchStore(state => state.calculation);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const memory = useMaterialMemoryStore(state => state.memory);
  const remembered = useMemo(() => rememberedKinds(memory, protocol), [memory, protocol]);
  const runs = dilutionRuns(protocol);
  const [shownKey, setShownKey] = useState(ALL_SERIES);
  const shown = runs.find(run => run.key === shownKey);
  const isShowingAll = !shown;

  if (!runs.length) {
    return (
      <p className="px-4 py-3 text-body-sm text-muted-foreground">
        Fill a dilution series across wells on a plate map, and how to make it shows here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-3 pt-1">
      {runs.length > 1 && (
        <WorkbenchTabStrip
          value={isShowingAll ? ALL_SERIES : shownKey}
          ids={[ALL_SERIES, ...runs.map(run => run.key)]}
          onChange={setShownKey}
        >
          <Tab id={ALL_SERIES}>All</Tab>
          {runs.map(run => (
            <Tab key={run.key} id={run.key}>
              <span
                aria-hidden
                className="mr-1.5 inline-block h-2.5 w-2.5 bg-muted-foreground"
                style={{ backgroundColor: run.color }}
              />
              {run.subject || 'Unnamed treatment'}
            </Tab>
          ))}
        </WorkbenchTabStrip>
      )}
      {runs.map(run => {
        if (!isShowingAll && run !== shown) return null;
        const prep = dilutionPrep(run, protocol, calculation);
        return (
          <WorkbenchDilutionSeriesSection
            key={run.key}
            id={`${block.id}-${run.key}`}
            subject={run.subject}
            places={run.places.length > 1 ? run.places : []}
            color={run.color}
            prep={prep}
            onSettingChange={(key, value) =>
              updateProtocol(draft => {
                for (const member of run.members) {
                  setPrepSetting(draft, member.plateId, member.seriesId, key, value);
                }
              })
            }
            onStockSave={(value, unit) => {
              if (prep.kind !== 'ready' || prep.stock.kind !== 'ask') return;
              const field = prep.stock.need === 'weight' ? WEIGHT_FIELD : STOCK_FIELD;
              updateProtocol(draft =>
                recordOnMaterial(draft, run.subject, field, value, unit, name =>
                  materialFromGuess(guessMaterial(name, remembered), memory)
                )
              );
            }}
          />
        );
      })}
    </div>
  );
}
