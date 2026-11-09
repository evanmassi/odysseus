import { Tooltip } from '@shared/ui';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { describeName } from '../../../../utils/formulas/nameDisplay';
import { parseStepTemplate, splitProse } from '../../../../utils/steps/stepTemplate';

import { referenceToneClass } from './stepReferenceTone';

interface WorkbenchStepPreviewProps {
  text: string;
}

const PROSE_CLASSES = {
  plain: undefined,
  quantity: 'text-primary',
  verb: 'text-label-2xs font-bold uppercase tracking-meta text-foreground',
} as const;

export function WorkbenchStepPreview({ text }: WorkbenchStepPreviewProps) {
  const calculation = useWorkbenchStore(state => state.calculation);
  return (
    <>
      {parseStepTemplate(text).map((part, partIndex) => {
        if (part.kind === 'reference') {
          const display = describeName(calculation, part.name);
          return (
            <Tooltip content={display.label} key={partIndex}>
              <span className={`cursor-help ${referenceToneClass(display)}`}>{display.text}</span>
            </Tooltip>
          );
        }
        if (part.kind === 'blank') {
          return (
            <span
              key={partIndex}
              className="border-b border-dashed border-warning-text/75 text-warning-text"
            >
              {part.label}
            </span>
          );
        }
        return splitProse(part.text, partIndex === 0).map((piece, pieceIndex) => (
          <span key={`${partIndex}-${pieceIndex}`} className={PROSE_CLASSES[piece.kind]}>
            {piece.text}
          </span>
        ));
      })}
    </>
  );
}
