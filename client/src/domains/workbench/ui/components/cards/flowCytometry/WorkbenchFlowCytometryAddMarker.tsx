import { useState } from 'react';

import { Select, type SelectOption } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';

import { FLOW_CYTOMETRY_FIELD } from './flowCytometryTableStyles';

interface WorkbenchFlowCytometryAddMarkerProps {
  label: string;
  newLabel: string;
  example: string;
  markerOptions: SelectOption[];
  onAdd: (materialId: string) => void;
  onCreate: (text: string) => void;
  clear?: { label: string; onClear: () => void };
}

const NEW_MARKER = '__new-marker__';
const CLEAR = '__clear__';

export function WorkbenchFlowCytometryAddMarker({
  label,
  newLabel,
  example,
  markerOptions,
  onAdd,
  onCreate,
  clear,
}: WorkbenchFlowCytometryAddMarkerProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [text, setText] = useState('');

  if (isTyping || !markerOptions.length) {
    const finish = () => {
      setText('');
      setIsTyping(false);
    };
    return (
      <span className="inline-edit">
        <input
          value={text}
          ref={isTyping ? focusOnMount : undefined}
          placeholder={`${label}: type it, e.g. ${example}`}
          aria-label={`${label}, new to Materials`}
          spellCheck={false}
          autoComplete="off"
          className={`${FLOW_CYTOMETRY_FIELD} w-72`}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Escape') finish();
            if (event.key !== 'Enter' || !text.trim()) return;
            event.preventDefault();
            onCreate(text);
            finish();
          }}
          onBlur={() => {
            if (!text.trim()) finish();
          }}
        />
      </span>
    );
  }

  return (
    <Select
      size="xs"
      isQuiet
      value={null}
      placeholder={label}
      options={[
        ...markerOptions,
        { value: NEW_MARKER, label: newLabel },
        ...(clear ? [{ value: CLEAR, label: clear.label }] : []),
      ]}
      aria-label={label}
      onChange={choice => {
        if (choice === NEW_MARKER) setIsTyping(true);
        else if (choice === CLEAR) clear?.onClear();
        else onAdd(String(choice));
      }}
    />
  );
}
