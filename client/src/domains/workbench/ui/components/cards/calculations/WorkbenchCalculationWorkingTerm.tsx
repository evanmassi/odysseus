import { useMemo, useState } from 'react';

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

import type { WorkingRef } from '../../../../utils/formulas/workingTree';

const TERM_SOURCE_CLASS: Record<WorkingRef['source'], string> = {
  value: 'text-foreground',
  count: 'text-info-text',
  calculation: 'text-action',
};

const TERM_LABEL = 'text-label-2xs text-muted-foreground';

interface WorkbenchCalculationWorkingTermProps {
  node: WorkingRef;
  label: string;
}

export function WorkbenchCalculationWorkingTerm({
  node,
  label,
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

  const stackClass = `inline-flex flex-col items-center ${node.isSetAside ? 'line-through' : ''}`;
  const labelLine = <span className={TERM_LABEL}>{label}</span>;
  const shown = (
    <>
      {labelLine}
      <span className={`font-mono text-data-sm ${TERM_SOURCE_CLASS[node.source]}`}>
        {withPerLabwareKind(node.text, node.name)}
      </span>
    </>
  );

  if (source && entry?.kind === 'value') {
    if (isEditing) {
      return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Enter, Escape and leaving bubble up from the field's own inputs
        <span
          className={stackClass}
          onBlur={leave.onBlur}
          onFocus={leave.onFocus}
          onKeyDown={event => {
            if (event.key !== 'Enter' && event.key !== 'Escape') return;
            event.preventDefault();
            setIsEditing(false);
          }}
        >
          {labelLine}
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
    return (
      <Tooltip content="Click to change">
        <button
          type="button"
          className={`${stackClass} inline-edit`}
          onClick={() => setIsEditing(true)}
        >
          {shown}
        </button>
      </Tooltip>
    );
  }

  const origin = entry?.origin;
  if (!origin) return <span className={stackClass}>{shown}</span>;
  return (
    <Tooltip content="Go to where this is set">
      <button
        type="button"
        className={`${stackClass} hover:underline hover:decoration-dotted`}
        onClick={() => showTarget(origin)}
      >
        {shown}
      </button>
    </Tooltip>
  );
}
