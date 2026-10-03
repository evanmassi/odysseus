import type { ReactNode } from 'react';

import { Divider } from '../divider/Divider';
import { ScrollArea } from '../scroll-area/ScrollArea';
import { PanelHeader } from '../titles/PanelHeader';

interface FramelessPanelProps {
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function FramelessPanel({ icon, title, meta, footer, children }: FramelessPanelProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-px [background:linear-gradient(180deg,transparent_0%,hsl(var(--foreground)/0.12)_8%,hsl(var(--foreground)/0.12)_92%,transparent_100%)]"
      />
      <div className="flex flex-shrink-0 items-center justify-between gap-4 pr-4">
        <PanelHeader icon={icon} title={title} />
        {meta}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 pb-4 pt-4">{children}</div>
      </ScrollArea>

      {footer && (
        <div className="relative flex-shrink-0 px-4 pt-3">
          <Divider tone="primary" className="absolute inset-x-0 top-0" />
          {footer}
        </div>
      )}
    </div>
  );
}
