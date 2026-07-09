/**
 * Strip Label
 *
 * Mono label with a primary accent stripe, used for the field labels in an
 * item info panel's header strip.
 */

export function StripLabel({ children }: { children: string }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap type-label text-label-2xs tracking-label-wide text-muted-foreground">
      <span
        aria-hidden
        className="h-2.5 w-0.5 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
      />
      {children}
    </span>
  );
}
