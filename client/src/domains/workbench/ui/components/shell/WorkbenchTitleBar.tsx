import { DatePicker, Input } from '@shared/ui';

import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { experimentId } from '../../../utils/protocolFile/experimentId';

import type { Protocol } from '@odysseus/shared-schemas';

const FIELD_LABEL = 'text-body-sm text-muted-foreground';

export function WorkbenchTitleBar() {
  const protocol = useWorkbenchStore(state => state.protocol);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);

  const setField = <Key extends 'title' | 'descriptor' | 'runNumber'>(
    key: Key,
    value: Protocol[Key]
  ) =>
    updateProtocol(draft => {
      draft[key] = value;
    });

  const setRunOn = (edge: 'from' | 'to', value: string) =>
    updateProtocol(draft => {
      draft.runOn[edge] = value;
    });

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
      <div className="min-w-[16rem] flex-1">
        <input
          value={protocol.title}
          aria-label="Protocol title"
          spellCheck={false}
          onChange={event => setField('title', event.target.value)}
          className="w-full bg-transparent text-title-lg text-foreground outline-none"
        />
        <div className="font-mono text-data-sm text-secondary-foreground">
          {experimentId(protocol)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={FIELD_LABEL}>Run on</span>
        <DatePicker
          size="sm"
          clearable
          value={protocol.runOn.from}
          onChange={value => setRunOn('from', value)}
          aria-label="Run from"
        />
        <span className={FIELD_LABEL}>to</span>
        <DatePicker
          size="sm"
          clearable
          value={protocol.runOn.to}
          onChange={value => setRunOn('to', value)}
          aria-label="Run to"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className={FIELD_LABEL}>Descriptor</span>
        <Input
          size="sm"
          value={protocol.descriptor}
          placeholder="D12-CMV"
          aria-label="Descriptor"
          spellCheck={false}
          onChange={event => setField('descriptor', event.target.value)}
          className="w-32"
        />
        <span className={FIELD_LABEL}>Run #</span>
        <Input
          size="sm"
          value={protocol.runNumber}
          placeholder="1"
          aria-label="Run number"
          inputMode="numeric"
          onChange={event => setField('runNumber', event.target.value)}
          className="w-14"
        />
      </div>
    </div>
  );
}
