/**
 * Row Hover Glow
 *
 * Hover-preview recipe for full-width ledger rows (data Table rows, detail rows):
 * light is a flat tone tint + soft leading stripe; the lit recipe (scanline +
 * directional wash + 8-layer bloom) is restored under `dark:`. Tone-keyed to the
 * row's state color. Each entry is one literal string per tone — Tailwind's JIT
 * won't emit interpolated classes.
 */

type RowHoverTone = 'primary' | 'success' | 'warning' | 'danger';

export const ROW_HOVER_GLOW: Record<RowHoverTone, string> = {
  primary: [
    'hover:[background-image:linear-gradient(0deg,hsl(var(--primary)/0.06),hsl(var(--primary)/0.06))]',
    'hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)/var(--alpha-hover-stripe))]',
    'dark:hover:[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--primary)/var(--alpha-hover-wash-1))_0%,hsl(var(--primary)/var(--alpha-hover-wash-2))_18%,hsl(var(--primary)/var(--alpha-hover-wash-3))_48%,hsl(var(--primary)/var(--alpha-hover-wash-4))_78%,hsl(var(--primary)/0)_100%)]',
    'dark:hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--primary)/var(--alpha-hover-edge)),inset_0_1px_0_hsl(var(--primary)/var(--alpha-hover-rim)),inset_0_-1px_0_hsl(var(--primary)/var(--alpha-hover-rim)),inset_0_10px_16px_-8px_hsl(var(--primary)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--primary)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--primary)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--primary)/var(--alpha-hover-bloom-far))]',
  ].join(' '),
  success: [
    'hover:[background-image:linear-gradient(0deg,hsl(var(--color-success-bg)/0.06),hsl(var(--color-success-bg)/0.06))]',
    'hover:shadow-[inset_3px_0_0_0_hsl(var(--color-success-bg)/var(--alpha-hover-stripe))]',
    'dark:hover:[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--color-success-bg)/var(--alpha-hover-wash-1))_0%,hsl(var(--color-success-bg)/var(--alpha-hover-wash-2))_18%,hsl(var(--color-success-bg)/var(--alpha-hover-wash-3))_48%,hsl(var(--color-success-bg)/var(--alpha-hover-wash-4))_78%,hsl(var(--color-success-bg)/0)_100%)]',
    'dark:hover:shadow-[inset_3px_0_0_0_hsl(var(--color-success-bg)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--color-success-bg)/var(--alpha-hover-edge)),inset_0_1px_0_hsl(var(--color-success-bg)/var(--alpha-hover-rim)),inset_0_-1px_0_hsl(var(--color-success-bg)/var(--alpha-hover-rim)),inset_0_10px_16px_-8px_hsl(var(--color-success-bg)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--color-success-bg)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--color-success-bg)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--color-success-bg)/var(--alpha-hover-bloom-far))]',
  ].join(' '),
  warning: [
    'hover:[background-image:linear-gradient(0deg,hsl(var(--color-warning-bg)/0.06),hsl(var(--color-warning-bg)/0.06))]',
    'hover:shadow-[inset_3px_0_0_0_hsl(var(--color-warning-bg)/var(--alpha-hover-stripe))]',
    'dark:hover:[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--color-warning-bg)/var(--alpha-hover-wash-1))_0%,hsl(var(--color-warning-bg)/var(--alpha-hover-wash-2))_18%,hsl(var(--color-warning-bg)/var(--alpha-hover-wash-3))_48%,hsl(var(--color-warning-bg)/var(--alpha-hover-wash-4))_78%,hsl(var(--color-warning-bg)/0)_100%)]',
    'dark:hover:shadow-[inset_3px_0_0_0_hsl(var(--color-warning-bg)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--color-warning-bg)/var(--alpha-hover-edge)),inset_0_1px_0_hsl(var(--color-warning-bg)/var(--alpha-hover-rim)),inset_0_-1px_0_hsl(var(--color-warning-bg)/var(--alpha-hover-rim)),inset_0_10px_16px_-8px_hsl(var(--color-warning-bg)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--color-warning-bg)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--color-warning-bg)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--color-warning-bg)/var(--alpha-hover-bloom-far))]',
  ].join(' '),
  danger: [
    'hover:[background-image:linear-gradient(0deg,hsl(var(--color-danger-bg)/0.06),hsl(var(--color-danger-bg)/0.06))]',
    'hover:shadow-[inset_3px_0_0_0_hsl(var(--color-danger-bg)/var(--alpha-hover-stripe))]',
    'dark:hover:[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--color-danger-bg)/var(--alpha-hover-wash-1))_0%,hsl(var(--color-danger-bg)/var(--alpha-hover-wash-2))_18%,hsl(var(--color-danger-bg)/var(--alpha-hover-wash-3))_48%,hsl(var(--color-danger-bg)/var(--alpha-hover-wash-4))_78%,hsl(var(--color-danger-bg)/0)_100%)]',
    'dark:hover:shadow-[inset_3px_0_0_0_hsl(var(--color-danger-bg)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--color-danger-bg)/var(--alpha-hover-edge)),inset_0_1px_0_hsl(var(--color-danger-bg)/var(--alpha-hover-rim)),inset_0_-1px_0_hsl(var(--color-danger-bg)/var(--alpha-hover-rim)),inset_0_10px_16px_-8px_hsl(var(--color-danger-bg)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--color-danger-bg)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--color-danger-bg)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--color-danger-bg)/var(--alpha-hover-bloom-far))]',
  ].join(' '),
};
