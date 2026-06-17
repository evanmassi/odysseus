/**
 * Scrim Halo
 *
 * Always-dark backdrop behind floating chrome — tooltips, toasts, and the console
 * dialogs. Driven by --scrim so it stays dark in both themes.
 */
export function ScrimHalo() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -inset-2 -z-10 bg-scrim/[0.93] blur"
    />
  );
}
