/**
 * Menu Divider
 *
 * Horizontal separator line between menu item groups.
 */

export function MenuDivider() {
  return (
    <div className="relative z-10 my-1 h-px [background:linear-gradient(90deg,transparent_0%,hsl(var(--foreground)/0.18)_10%,hsl(var(--foreground)/0.18)_90%,transparent_100%)]" />
  );
}
