/**
 * Section Header
 *
 * Compact lit chip — semi-transparent fill with CRT scanlines and a top-edge sheen,
 * glowing primary signal dot, mono caps title with phosphor glow, optional meta after
 * a vertical hairline divider. Top-right notch and a single scanlined end-cap on the
 * right round out the tactical chrome.
 */

export interface SectionHeaderProps {
  title: string;
  meta?: string;
  className?: string;
}

const BAR_BACKGROUND = `
  linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, transparent 45%),
  repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0.12) 0, rgba(0, 0, 0, 0.12) 1px, transparent 1px, transparent 3px)
`;

export function SectionHeader({ title, meta, className }: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <div
        className="flex items-center h-7 bg-foreground/20 pl-2 pr-3 font-mono text-[12px] uppercase tracking-[0.22em] text-foreground whitespace-nowrap"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
          backgroundImage: BAR_BACKGROUND,
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
