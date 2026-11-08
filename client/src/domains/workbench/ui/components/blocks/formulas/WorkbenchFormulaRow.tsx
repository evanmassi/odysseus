import type { ReactNode } from 'react';

interface WorkbenchFormulaRowProps {
  name: string;
  answer: string;
  onOpen: () => void;
  children: ReactNode;
}

export function WorkbenchFormulaRow({ name, answer, onOpen, children }: WorkbenchFormulaRowProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-1 px-2 py-1.5 text-left even:bg-foreground/[0.025] hover:bg-foreground/[0.05]"
    >
      <span className="flex w-full items-baseline gap-2">
        <span className="text-body-sm text-foreground">
          {name || <span className="text-muted-foreground">Unnamed</span>}
        </span>
        <span aria-hidden className="flex-1 border-b border-dashed border-line-soft" />
        <span className="font-mono text-data-sm text-action">{answer}</span>
      </span>
      {children}
    </button>
  );
}
