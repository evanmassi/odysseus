import { useState } from 'react';

import { Select, type SelectOption } from '@shared/ui';

import { focusOnMount } from '../../../utils/dom/focusOnMount';

interface WorkbenchMaterialPickProps {
  label: string;
  newLabel: string;
  example: string;
  options: SelectOption[];
  onPick: (materialId: string) => void;
  onCreate: (text: string) => void;
  clear?: { label: string; onClear: () => void };
}

const NEW_MATERIAL = '__new-material__';
const CLEAR = '__clear__';

export function WorkbenchMaterialPick({
  label,
  newLabel,
  example,
  options,
  onPick,
  onCreate,
  clear,
}: WorkbenchMaterialPickProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [text, setText] = useState('');

  if (isTyping || !options.length) {
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
          className="w-72 bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
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
        ...options,
        { value: NEW_MATERIAL, label: newLabel },
        ...(clear ? [{ value: CLEAR, label: clear.label }] : []),
      ]}
      aria-label={label}
      onChange={choice => {
        if (choice === NEW_MATERIAL) setIsTyping(true);
        else if (choice === CLEAR) clear?.onClear();
        else onPick(String(choice));
      }}
    />
  );
}
