import type { ClipboardEvent, KeyboardEvent, Ref } from 'react';

import { Plus } from 'lucide-react';

import { Button, Input } from '@shared/ui';

interface WorkbenchAddBarProps {
  value: string;
  placeholder: string;
  itemLabel: string;
  inputRef?: Ref<HTMLInputElement>;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onEscape: () => void;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
}

export function WorkbenchAddBar({
  value,
  placeholder,
  itemLabel,
  inputRef,
  onValueChange,
  onSubmit,
  onEscape,
  onPaste,
}: WorkbenchAddBarProps) {
  const hasText = !!value.trim();

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') onEscape();
    if (event.key !== 'Enter' || !hasText) return;
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="flex max-w-[38.75rem] items-center gap-2">
      <div className="min-w-0 flex-1">
        <Input
          ref={inputRef}
          size="md"
          fullWidth
          value={value}
          placeholder={placeholder}
          aria-label={`Add a ${itemLabel.toLowerCase()}`}
          spellCheck={false}
          autoComplete="off"
          inputClassName="placeholder:italic"
          onValueChange={onValueChange}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
        />
      </div>
      <Button
        variant="primary"
        size="md"
        leftIcon={<Plus className="h-4 w-4" />}
        disabled={!hasText}
        onClick={onSubmit}
      >
        Add {itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}
