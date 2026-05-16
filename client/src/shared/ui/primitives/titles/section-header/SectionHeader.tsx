/**
 * Section Header
 *
 * Compact tactical title chip rendered above a Panel.
 */

export interface SectionHeaderProps {
  title: string;
  meta?: string;
  className?: string;
}

export function SectionHeader({ title, meta, className }: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <div
        className="flex items-center h-7 bg-surface-elev bg-lit-fill pl-2 pr-3 font-mono text-[12px] uppercase tracking-[0.22em] text-foreground whitespace-nowrap"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
        }}
      >
        <span
          aria-hidden
          className="mr-2.5 h-1.5 w-1.5 shrink-0 bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.7)]"
        />
        <span className="font-medium phosphor-text">{title}</span>
        {meta && (
          <>
            <span aria-hidden className="mx-2.5 h-3.5 w-px bg-foreground/25" />
            <span className="tracking-[0.18em] text-foreground/60">{meta}</span>
          </>
        )}
      </div>
      <span
        aria-hidden
        className="self-end mb-1 h-1.5 w-2.5 bg-foreground/70 bg-scanlines shrink-0"
      />
    </div>
  );
}
