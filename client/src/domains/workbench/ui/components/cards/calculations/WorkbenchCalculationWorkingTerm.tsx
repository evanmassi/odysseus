import { useMemo, useState, type ReactNode } from 'react';

import { Tooltip } from '@shared/ui';

import { useFocusLeave } from '../../../../hooks/useFocusLeave';
import { useShowTarget } from '../../../../hooks/useShowTarget';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { nameKey } from '../../../../utils/formulas/boardCalculation';
import { isUnreadableAmount } from '../../../../utils/formulas/quantities';
import { withPerLabwareKind } from '../../../../utils/terms/termLookup';
import {
  valueSourceOf,
  writeValueSource,
  writeValueSourceUnit,
} from '../../../../utils/values/valueSources';
import { WorkbenchValueAmountField } from '../values/WorkbenchValueAmountField';

import { WorkbenchCalculationWorkingQuantity } from './WorkbenchCalculationWorkingQuantity';

import type { WorkingRef } from '../../../../utils/formulas/workingTree';
import type { UnitPart } from '../../../../utils/formulas/workingUnits';

const TERM_SOURCE_CLASS: Record<WorkingRef['source'], string> = {
  value: 'text-foreground',
  count: 'text-info-text',
  calculation: 'text-action',
};

export const WORKING_HOT = 'bg-primary/15 text-foreground';
const FOLLOWED = 'bg-primary/15 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.5)]';

interface WorkbenchCalculationWorkingTermProps {
  node: WorkingRef;
  isBracketed: boolean;
  struckParts: ReadonlySet<UnitPart> | undefined;
  isHot: boolean;
  isFollowed: boolean;
  onHover: (isHovered: boolean) => void;
  onFollow: (name: string) => void;
}

export function WorkbenchCalculationWorkingTerm({
  node,
  isBracketed,
  struckParts,
  isHot,
  isFollowed,
  onHover,
  onFollow,
}: WorkbenchCalculationWorkingTermProps) {
  const entry = useWorkbenchStore(state => state.board.names.get(nameKey(node.name)));
  const protocol = useWorkbenchStore(state => state.protocol);
  const source = useMemo(
    () => (entry?.kind === 'value' ? valueSourceOf(protocol, entry.id) : undefined),
    [entry, protocol]
  );
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const showTarget = useShowTarget();
  const [isEditing, setIsEditing] = useState(false);
  const leave = useFocusLeave(() => setIsEditing(false));

  const shown = (
    <WorkbenchCalculationWorkingQuantity
      text={withPerLabwareKind(node.text, node.name)}
      struckParts={struckParts}
      isSetAside={node.isSetAside}
    />
  );
  const framed = (content: ReactNode) => (
    <span
      className={`whitespace-nowrap ${isHot ? WORKING_HOT : ''}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {isBracketed && <span className="text-muted-foreground">(</span>}
      {content}
      {isBracketed && <span className="text-muted-foreground">)</span>}
    </span>
  );
  const sourceClass = TERM_SOURCE_CLASS[node.source];

  if (source && entry?.kind === 'value') {
    if (isEditing) {
      return framed(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Enter, Escape and leaving bubble up from the field's own inputs
        <span
          className="inline-flex"
          onBlur={leave.onBlur}
          onFocus={leave.onFocus}
          onKeyDown={event => {
            if (event.key !== 'Enter' && event.key !== 'Escape') return;
            event.preventDefault();
            setIsEditing(false);
          }}
        >
          <WorkbenchValueAmountField
            value={entry.value}
            unit={entry.unit}
            placeholder="0"
            isFocusedOnMount
            isInvalid={isUnreadableAmount(entry.value, entry.unit)}
            onValueChange={value => updateProtocol(draft => writeValueSource(draft, source, value))}
            onUnitChange={unit =>
              updateProtocol(draft => writeValueSourceUnit(draft, source, unit))
            }
          />
        </span>
      );
    }
    return framed(
      <Tooltip content="Click to change">
        <button
          type="button"
          className={`inline-edit ${sourceClass}`}
          onClick={() => setIsEditing(true)}
        >
          {shown}
        </button>
      </Tooltip>
    );
  }

  if (node.source === 'calculation') {
    return framed(
      <Tooltip content={isFollowed ? 'Hide how this is worked out' : 'Show how this is worked out'}>
        <button
          type="button"
          aria-expanded={isFollowed}
          className={`${sourceClass} hover:underline hover:decoration-dotted ${isFollowed ? FOLLOWED : ''}`}
          onClick={() => onFollow(node.name)}
        >
          {shown}
        </button>
      </Tooltip>
    );
  }

  const origin = entry?.origin;
  if (!origin) return framed(<span className={sourceClass}>{shown}</span>);
  return framed(
    <Tooltip content="Go to where this is set">
      <button
        type="button"
        className={`${sourceClass} hover:underline hover:decoration-dotted`}
        onClick={() => showTarget(origin)}
      >
        {shown}
      </button>
    </Tooltip>
  );
}
