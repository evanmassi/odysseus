/**
 * Strip Label
 *
 * Mono label with an accent tick, used for the field labels in an
 * item info panel's header strip.
 */
import { AccentTick, type AccentTickTone } from './AccentTick';

export function StripLabel({
  children,
  tone = 'primary',
}: {
  children: string;
  tone?: AccentTickTone;
}) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap type-label text-label-2xs tracking-label-wide text-muted-foreground">
      <AccentTick tone={tone} />
      {children}
    </span>
  );
}
