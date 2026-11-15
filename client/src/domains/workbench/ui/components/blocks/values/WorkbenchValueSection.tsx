import type { ReactNode } from 'react';

interface WorkbenchValueSectionProps {
  title: ReactNode;
  children: ReactNode;
}

export function WorkbenchValueSection({ title, children }: WorkbenchValueSectionProps) {
  return (
    <section className="min-w-0 max-w-md">
      {title && (
        <header className="px-2 pb-1.5">
          <span className="min-w-0 truncate type-name text-label-md font-semibold text-foreground">
            {title}
          </span>
        </header>
      )}
      <table className="w-full border-collapse">
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}
