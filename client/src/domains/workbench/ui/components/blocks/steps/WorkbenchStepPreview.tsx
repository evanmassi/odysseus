import { useCallback, useMemo } from 'react';

import { useStoreWithEqualityFn } from 'zustand/traditional';

import { Tooltip } from '@shared/ui';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { describeName, readsNamesAlike } from '../../../../utils/formulas/nameDisplay';
import { parseStepTemplate, splitProse } from '../../../../utils/steps/stepTemplate';

import { referenceToneClass } from './stepReferenceTone';

import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';

interface WorkbenchStepPreviewProps {
  text: string;
}

const PROSE_CLASSES = {
  plain: undefined,
  quantity: 'text-primary',
  verb: 'text-label-2xs font-bold uppercase tracking-meta text-foreground',
} as const;

export function WorkbenchStepPreview({ text }: WorkbenchStepPreviewProps) {
  const parts = useMemo(() => parseStepTemplate(text), [text]);
  const isAlikeForStep = useCallback(
    (a: BoardCalculation, b: BoardCalculation) =>
      readsNamesAlike(
        parts.flatMap(part => (part.kind === 'reference' ? [part.name] : [])),
        a,
        b
      ),
    [parts]
  );
  const calculation = useStoreWithEqualityFn(
    useWorkbenchStore,
    state => state.calculation,
    isAlikeForStep
  );
  return (
    <>
      {parts.map((part, partIndex) => {
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
