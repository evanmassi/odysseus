import { useCallback, useMemo } from 'react';

import { useStoreWithEqualityFn } from 'zustand/traditional';

import { Tooltip } from '@shared/ui';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { describeName, readsNamesAlike } from '../../../../utils/formulas/nameDisplay';
import { parseStepTemplate, splitProse } from '../../../../utils/steps/stepTemplate';

import { proseClass, STEP_PROSE_CLASSES } from './stepProseClasses';
import { referenceToneClass } from './stepReferenceTone';

import type { SolvedBoard } from '../../../../utils/formulas/boardCalculation';

interface WorkbenchStepPreviewProps {
  text: string;
}

export function WorkbenchStepPreview({ text }: WorkbenchStepPreviewProps) {
  const parts = useMemo(() => parseStepTemplate(text), [text]);
  const isAlikeForStep = useCallback(
    (a: SolvedBoard, b: SolvedBoard) =>
      readsNamesAlike(
        parts.flatMap(part => (part.kind === 'reference' ? [part.name] : [])),
        a,
        b
      ),
    [parts]
  );
  const board = useStoreWithEqualityFn(useWorkbenchStore, state => state.board, isAlikeForStep);
  return (
    <>
      {parts.map((part, partIndex) => {
        if (part.kind === 'reference') {
          const display = describeName(board, part.name);
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
          <span
            key={`${partIndex}-${pieceIndex}`}
            className={proseClass(piece, STEP_PROSE_CLASSES.quantity)}
          >
            {piece.text}
          </span>
        ));
      })}
    </>
  );
}
