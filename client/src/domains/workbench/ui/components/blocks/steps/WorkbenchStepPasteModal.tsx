import { useMemo, useState } from 'react';

import { ListOrdered, Plus } from 'lucide-react';

import { Button, Textarea } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';

import {
  parseProtocolText,
  PASTE_EXAMPLE,
  type ParsedProtocolStep,
} from '../../../../utils/steps/protocolText';
import { stepNumbers } from '../../../../utils/steps/stepNumbering';

interface WorkbenchStepPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (steps: ParsedProtocolStep[]) => void;
}

const PREVIEW_NUMBER = 'min-w-5 flex-none text-right font-mono text-data-sm text-muted-foreground';

export function WorkbenchStepPasteModal({ isOpen, onClose, onAdd }: WorkbenchStepPasteModalProps) {
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseProtocolText(text), [text]);
  const numbers = useMemo(
    () => stepNumbers(parsed.map((item, index) => ({ ...item, id: String(index) }))),
    [parsed]
  );
  const stepCount = parsed.filter(item => item.kind === 'step').length;

  const close = () => {
    setText('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title="Paste a protocol"
      subtitle="Paste steps from a vendor sheet or an old protocol. Sections, numbered steps, a. b. sub-steps, bullets and notes are recognized, and lines broken mid-sentence are joined. Check the outline before adding."
      icon={<ListOrdered size={20} />}
      size="xl"
      onClose={close}
      footer={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="mr-auto"
            onClick={() => setText(PASTE_EXAMPLE)}
          >
            Try an example
          </Button>
          <Button variant="cancel" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus size={14} />}
            disabled={!stepCount}
            onClick={() => {
              onAdd(parsed);
              close();
            }}
          >
            {stepCount ? `Add ${stepCount} Step${stepCount === 1 ? '' : 's'}` : 'Add Steps'}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-5">
        <Textarea
          value={text}
          onValueChange={setText}
          placeholder="Paste here…"
          aria-label="Protocol text"
          resize="none"
          className="min-h-[420px] font-mono text-data leading-relaxed"
        />
        <div className="max-h-[420px] overflow-auto pr-1">
          {parsed.length ? (
            parsed.map((item, index) =>
              item.kind === 'section' ? (
                <div
                  key={index}
                  className="mb-1.5 mt-3.5 flex gap-2.5 border-b border-foreground/10 pb-1.5 type-label text-label-sm font-semibold tracking-label-wide first:mt-0"
                >
                  <span className="text-primary">{numbers.get(String(index))}</span>
                  {item.text}
                </div>
              ) : (
                <div
                  key={index}
                  className={`flex gap-2.5 py-1 leading-normal ${item.level === 2 ? 'pl-12 text-caption text-foreground/90' : 'pl-[18px] text-body-sm'}`}
                >
                  <span className={PREVIEW_NUMBER}>{numbers.get(String(index))}</span>
                  {item.text}
                </div>
              )
            )
          ) : (
            <p className="italic text-muted-foreground">The outline appears here as you paste.</p>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
