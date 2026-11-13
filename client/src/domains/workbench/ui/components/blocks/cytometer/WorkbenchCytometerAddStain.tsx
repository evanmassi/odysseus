import { useState } from 'react';

import { Select, type SelectOption } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';

import { CYTOMETER_FIELD } from './cytometerTableStyles';

interface WorkbenchCytometerAddStainProps {
  label: string;
  stainOptions: SelectOption[];
  onAdd: (materialId: string) => void;
  onCreate: (text: string) => void;
}

const NEW_STAIN = '__new-stain__';

export function WorkbenchCytometerAddStain({
  label,
  stainOptions,
  onAdd,
  onCreate,
}: WorkbenchCytometerAddStainProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [text, setText] = useState('');

  if (isTyping || !stainOptions.length) {
    const finish = () => {
      setText('');
      setIsTyping(false);
    };
    return (
      <span className="inline-edit">
        <input
          value={text}
          ref={isTyping ? focusOnMount : undefined}
          placeholder={`${label}: type it, e.g. CD4 BV421 RPA-T4`}
          aria-label={`${label}, new to Materials`}
          spellCheck={false}
          autoComplete="off"
          className={`${CYTOMETER_FIELD} w-72`}
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
      options={[...stainOptions, { value: NEW_STAIN, label: 'New stain…' }]}
      aria-label={label}
      onChange={choice => {
        if (choice === NEW_STAIN) setIsTyping(true);
        else onAdd(String(choice));
      }}
    />
  );
}
