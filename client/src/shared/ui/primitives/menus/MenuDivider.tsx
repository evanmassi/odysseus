/**
 * Menu Divider
 *
 * Horizontal separator line between menu item groups.
 */

interface MenuDividerProps {
  /** Subtle flat faint line instead of the default rule that fades at both ends. */
  subtle?: boolean;
}

export function MenuDivider({ subtle = false }: MenuDividerProps) {
  if (subtle) {
    return <div className="relative z-10 my-1 h-px bg-line-faint" />;
  }

  return (
    <div className="relative z-10 my-1 h-px [background:linear-gradient(90deg,transparent_0%,hsl(var(--foreground)/0.18)_10%,hsl(var(--foreground)/0.18)_90%,transparent_100%)]" />
  );
}
