import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Check, X } from 'lucide-react';

import { Tooltip } from '../../primitives/tooltip/Tooltip';

interface QuickEditFieldProps {
  initialValue: string;
  fieldName: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
}

export function InlineEditInput({
  initialValue,
  fieldName,
  onSave,
  onCancel,
  placeholder,
}: QuickEditFieldProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          onSave(value);
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onCancel();
          break;
        case 'Tab':
          // Allow tab to work normally but save on tab out
          onSave(value);
          break;
      }
    },
    [value, onSave, onCancel]
  );

  const handleBlur = useCallback(() => {
    // Auto-save on blur
    onSave(value);
  }, [value, onSave]);

  return (
    <div className="absolute inset-0 bg-card border-2 border-warning-border rounded-lg shadow-lg z-30 flex items-center p-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty placeholder is meaningless, generate helpful text
        placeholder={placeholder || `Edit ${fieldName}`}
        className="flex-1 text-xs bg-transparent border-none px-1"
      />
      <div className="flex space-x-1 ml-1">
        <Tooltip content="Save (Enter)" side="bottom">
          <button
            onClick={e => {
              e.stopPropagation();
              onSave(value);
            }}
            className="p-0.5 rounded bg-success-light text-success-text hover:bg-success-border transition-colors"
          >
            <Check size={10} />
          </button>
        </Tooltip>
        <Tooltip content="Cancel (Esc)" side="bottom">
          <button
            onClick={e => {
              e.stopPropagation();
              onCancel();
            }}
            className="p-0.5 rounded bg-danger-light text-danger-text hover:bg-danger-border transition-colors"
          >
            <X size={10} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
