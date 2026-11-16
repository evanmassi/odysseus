import { withGreekLetters } from '@odysseus/shared-schemas';
import { CircleCheckBig, CircleDashed, TriangleAlert } from 'lucide-react';

import { Button, DatePicker, Divider, Input, Textarea } from '@shared/ui';

import { selectIsDirty, useWorkbenchStore } from '../../../stores/workbenchStore';
import { experimentId } from '../../../utils/protocolFile/experimentId';
import { META_LABEL } from '../board/metaLabelClass';

import type { Protocol } from '@odysseus/shared-schemas';

interface WorkbenchTitleBarProps {
  onSaveUnderId: () => void;
}

const FILE_EXTENSION = '.json';
const STATUS_ICON = 'h-3.5 w-3.5';

export function WorkbenchTitleBar({ onSaveUnderId }: WorkbenchTitleBarProps) {
  const protocol = useWorkbenchStore(state => state.protocol);
  const fileName = useWorkbenchStore(state => state.fileName);
  const isDirty = useWorkbenchStore(selectIsDirty);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const identifier = experimentId(protocol);
  const isNamedDifferently = !!fileName && fileName !== `${identifier}${FILE_EXTENSION}`;

  const setField = <Key extends 'title' | 'descriptor' | 'purpose' | 'runNumber'>(
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
    <div className="flex flex-col gap-3">
      <div>
        <input
          value={protocol.title}
          aria-label="Protocol title"
          spellCheck={false}
          onChange={event => setField('title', event.target.value)}
          className="-ml-1 w-full max-w-3xl bg-transparent px-1 text-title-lg text-foreground outline-none hover:outline hover:outline-1 hover:outline-primary/40 focus:outline focus:outline-1 focus:outline-primary/60"
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-data-sm text-secondary-foreground">{identifier}</span>
          {isDirty ? (
            <span className="flex items-center gap-1 text-body-sm text-warning-text">
              <TriangleAlert className={STATUS_ICON} />
              Unsaved changes
            </span>
          ) : fileName ? (
            <span className="flex items-center gap-1 text-body-sm text-success-text">
              <CircleCheckBig className={STATUS_ICON} />
              Saved
            </span>
          ) : (
            <span className="flex items-center gap-1 text-body-sm text-muted-foreground">
              <CircleDashed className={STATUS_ICON} />
              Not saved to a file
            </span>
          )}
          {isNamedDifferently && (
            <>
              <span className="text-body-sm text-muted-foreground">
                · the file is still called {fileName}
              </span>
              <Button variant="ghost-primary" size="xs" onClick={onSaveUnderId}>
                Save under this name
              </Button>
            </>
          )}
        </div>
      </div>
      <Divider tone="neutral" className="max-w-6xl" />
      <div className="grid max-w-6xl grid-cols-[auto_minmax(14rem,1fr)_auto] items-end gap-x-7 gap-y-3">
        <div className="flex flex-col gap-1">
          <span className={META_LABEL}>Assay dates</span>
          <span className="flex items-center gap-2">
            <DatePicker
              size="sm"
              clearable
              value={protocol.runOn.from}
              onChange={value => setRunOn('from', value)}
              aria-label="Assay start date"
            />
            <span className="text-muted-foreground">–</span>
            <DatePicker
              size="sm"
              clearable
              value={protocol.runOn.to}
              onChange={value => setRunOn('to', value)}
              aria-label="Assay end date"
            />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={META_LABEL}>Description</span>
          <Input
            size="sm"
            fullWidth
            value={protocol.descriptor}
            placeholder="e.g. donor, cell line or condition"
            aria-label="Description"
            spellCheck={false}
            inputClassName="placeholder:italic"
            onChange={event => setField('descriptor', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={META_LABEL}>Run</span>
          <span className="w-12">
            <Input
              size="sm"
              fullWidth
              value={protocol.runNumber}
              placeholder="#"
              aria-label="Run number"
              inputMode="numeric"
              inputClassName="text-center placeholder:italic"
              onChange={event => setField('runNumber', event.target.value)}
            />
          </span>
        </div>
        <div className="col-span-3 flex flex-col gap-1">
          <span className={META_LABEL}>Purpose</span>
          <Textarea
            rows={2}
            resize="vertical"
            value={protocol.purpose}
            placeholder="e.g. aim and hypothesis"
            aria-label="Purpose"
            className="text-body-sm placeholder:italic"
            onValueChange={value => setField('purpose', value)}
            onBlur={event => {
              const converted = withGreekLetters(event.target.value);
              if (converted !== event.target.value) setField('purpose', converted);
            }}
          />
        </div>
      </div>
    </div>
  );
}
