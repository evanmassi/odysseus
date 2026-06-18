/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: ['expanded', 'tank-level', 'rack-level', 'selector-level'],
  theme: {
    extend: {
      colors: {
        /* Core color system - HSL format enables opacity modifiers */

        /* Core */
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        page: 'hsl(var(--page) / <alpha-value>)',

        /* Surfaces */
        surface: {
          void: 'hsl(var(--bg-void) / <alpha-value>)',
          base: 'hsl(var(--bg-base) / <alpha-value>)',
          panel: 'hsl(var(--bg-panel) / <alpha-value>)',
          'panel-2': 'hsl(var(--bg-panel-2) / <alpha-value>)',
          elev: 'hsl(var(--bg-elev) / <alpha-value>)',
          strip: 'hsl(var(--strip-surface) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },

        /* Semantic */
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          hover: 'hsl(var(--muted-hover) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        /* Utilities */
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',

        /* Hairlines */
        line: {
          faint: 'hsl(var(--line-faint))',
          soft: 'hsl(var(--line-soft))',
          mid: 'hsl(var(--line-mid))',
          strong: 'hsl(var(--line-strong))',
        },

        /* Console overlay washes — alpha set per use (bg-shade/35, bg-sheen/20). */
        shade: 'hsl(var(--shade) / <alpha-value>)',
        sheen: 'hsl(var(--sheen) / <alpha-value>)',
        scrim: 'hsl(var(--scrim) / <alpha-value>)',

        /* Application-specific extensions */

        action: {
          DEFAULT: 'hsl(var(--color-action-default) / <alpha-value>)',
          hover: 'hsl(var(--color-action-hover) / <alpha-value>)',
          focus: 'hsl(var(--color-action-focus) / <alpha-value>)',
          light: 'hsl(var(--color-action-light) / <alpha-value>)',
          'light-hover': 'hsl(var(--color-action-light-hover) / <alpha-value>)',
        },
        danger: {
          bg: 'hsl(var(--color-danger-bg) / <alpha-value>)',
          hover: 'hsl(var(--color-danger-hover) / <alpha-value>)',
          text: 'hsl(var(--color-danger-text) / <alpha-value>)',
          'text-hover': 'hsl(var(--color-danger-text-hover) / <alpha-value>)',
          btnText: 'hsl(var(--color-danger-btnText) / <alpha-value>)',
          light: 'hsl(var(--color-danger-light) / <alpha-value>)',
          'light-hover': 'hsl(var(--color-danger-light-hover) / <alpha-value>)',
          border: 'hsl(var(--color-danger-border) / <alpha-value>)',
        },
        clear: {
          bg: 'hsl(var(--color-clear-bg) / <alpha-value>)',
          hover: 'hsl(var(--color-clear-hover) / <alpha-value>)',
          text: 'hsl(var(--color-clear-text) / <alpha-value>)',
        },
        warning: {
          bg: 'hsl(var(--color-warning-bg) / <alpha-value>)',
          hover: 'hsl(var(--color-warning-hover) / <alpha-value>)',
          text: 'hsl(var(--color-warning-text) / <alpha-value>)',
          'text-hover': 'hsl(var(--color-warning-text-hover) / <alpha-value>)',
          btnText: 'hsl(var(--color-warning-btnText) / <alpha-value>)',
          light: 'hsl(var(--color-warning-light) / <alpha-value>)',
          'light-hover': 'hsl(var(--color-warning-light-hover) / <alpha-value>)',
          border: 'hsl(var(--color-warning-border) / <alpha-value>)',
        },
        success: {
          bg: 'hsl(var(--color-success-bg) / <alpha-value>)',
          hover: 'hsl(var(--color-success-hover) / <alpha-value>)',
          text: 'hsl(var(--color-success-text) / <alpha-value>)',
          'text-hover': 'hsl(var(--color-success-text-hover) / <alpha-value>)',
          btnText: 'hsl(var(--color-success-btnText) / <alpha-value>)',
          light: 'hsl(var(--color-success-light) / <alpha-value>)',
          'light-hover': 'hsl(var(--color-success-light-hover) / <alpha-value>)',
          border: 'hsl(var(--color-success-border) / <alpha-value>)',
        },
        demo: {
          bg: 'hsl(var(--color-demo-bg) / <alpha-value>)',
          text: 'hsl(var(--color-demo-text) / <alpha-value>)',
          light: 'hsl(var(--color-demo-light) / <alpha-value>)',
          'light-hover': 'hsl(var(--color-demo-light-hover) / <alpha-value>)',
          border: 'hsl(var(--color-demo-border) / <alpha-value>)',
        },
        info: {
          bg: 'hsl(var(--color-info-bg) / <alpha-value>)',
          hover: 'hsl(var(--color-info-hover) / <alpha-value>)',
          text: 'hsl(var(--color-info-text) / <alpha-value>)',
          'text-hover': 'hsl(var(--color-info-text-hover) / <alpha-value>)',
          btnText: 'hsl(var(--color-info-btnText) / <alpha-value>)',
          light: 'hsl(var(--color-info-light) / <alpha-value>)',
          'light-hover': 'hsl(var(--color-info-light-hover) / <alpha-value>)',
          border: 'hsl(var(--color-info-border) / <alpha-value>)',
        },
        validation: {
          default: {
            border: 'hsl(var(--color-validation-default-border) / <alpha-value>)',
            bg: 'hsl(var(--color-validation-default-bg) / <alpha-value>)',
            ring: 'hsl(var(--color-validation-default-ring) / <alpha-value>)',
          },
        },

        /* Always-dark components */

        toast: {
          DEFAULT: 'hsl(var(--toast) / <alpha-value>)',
          foreground: 'hsl(var(--toast-foreground) / <alpha-value>)',
        },
        tooltip: {
          DEFAULT: 'hsl(var(--tooltip) / <alpha-value>)',
          foreground: 'hsl(var(--tooltip-foreground) / <alpha-value>)',
          border: 'hsl(var(--tooltip-border) / <alpha-value>)',
          muted: 'hsl(var(--tooltip-muted) / <alpha-value>)',
        },
        'chip-active': {
          DEFAULT: 'hsl(var(--chip-active) / <alpha-value>)',
          foreground: 'hsl(var(--chip-active-foreground) / <alpha-value>)',
          hover: 'hsl(var(--chip-active-hover) / <alpha-value>)',
        },
        'status-offline': {
          DEFAULT: 'hsl(var(--status-offline) / <alpha-value>)',
          foreground: 'hsl(var(--status-offline-foreground) / <alpha-value>)',
          border: 'hsl(var(--status-offline-border) / <alpha-value>)',
          muted: 'hsl(var(--status-offline-muted) / <alpha-value>)',
          hover: 'hsl(var(--status-offline-hover) / <alpha-value>)',
        },
        ownership: {
          'user-badge': 'hsl(var(--ownership-user-badge) / <alpha-value>)',
          'other-badge': 'hsl(var(--ownership-other-badge) / <alpha-value>)',
          'unassigned-badge': 'hsl(var(--ownership-unassigned-badge) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Helvetica Neue"', 'sans-serif'],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      boxShadow: {
        sheen: 'inset 0 1px 0 0 hsl(var(--sheen) / 0.18)',
        /* Inset top sheen + single soft halo. Mirrors LabBadge `lit` + Toggle ON vocabulary. */
        'glow-primary':
          'inset 0 1px 0 0 hsl(var(--sheen) / 0.18), 0 0 18px -2px hsl(var(--primary) / 0.50)',
        'glow-danger':
          'inset 0 1px 0 0 hsl(var(--sheen) / 0.18), 0 0 18px -2px hsl(var(--color-danger-bg) / 0.50)',
        'glow-success':
          'inset 0 1px 0 0 hsl(var(--sheen) / 0.18), 0 0 18px -2px hsl(var(--color-success-bg) / 0.50)',
        'glow-warning':
          'inset 0 1px 0 0 hsl(var(--sheen) / 0.18), 0 0 18px -2px hsl(var(--color-warning-bg) / 0.50)',
        'glow-info':
          'inset 0 1px 0 0 hsl(var(--sheen) / 0.18), 0 0 18px -2px hsl(var(--color-info-bg) / 0.50)',
        /* Standard-weight button surface. Light (1 - --lit): paper-sheen highlight +
           faint contact shadow — the part sits ON the page, no emission. Dark (--lit):
           the inset + outer tonal glow. Both baked in; the gate swaps them per theme. */
        'standard-primary':
          'inset 0 1px 0 hsl(var(--sheen) / calc(0.55 * (1 - var(--lit)))), 0 1px 1px hsl(var(--recess) / calc(0.04 * (1 - var(--lit)))), inset 0 0 12px -2px hsl(var(--primary) / calc(0.20 * var(--lit))), 0 0 14px -4px hsl(var(--primary) / calc(0.40 * var(--lit)))',
        'standard-primary-hover':
          'inset 0 1px 0 hsl(var(--sheen) / calc(0.55 * (1 - var(--lit)))), 0 1px 2px hsl(var(--recess) / calc(0.07 * (1 - var(--lit)))), inset 0 0 16px -2px hsl(var(--primary) / calc(0.35 * var(--lit))), 0 0 22px -2px hsl(var(--primary) / calc(0.55 * var(--lit)))',
        'standard-danger':
          'inset 0 1px 0 hsl(var(--sheen) / calc(0.55 * (1 - var(--lit)))), 0 1px 1px hsl(var(--recess) / calc(0.04 * (1 - var(--lit)))), inset 0 0 12px -2px hsl(var(--color-danger-bg) / calc(0.20 * var(--lit))), 0 0 14px -4px hsl(var(--color-danger-bg) / calc(0.40 * var(--lit)))',
        'standard-danger-hover':
          'inset 0 1px 0 hsl(var(--sheen) / calc(0.55 * (1 - var(--lit)))), 0 1px 2px hsl(var(--recess) / calc(0.07 * (1 - var(--lit)))), inset 0 0 16px -2px hsl(var(--color-danger-bg) / calc(0.35 * var(--lit))), 0 0 22px -2px hsl(var(--color-danger-bg) / calc(0.55 * var(--lit)))',
        'standard-success':
          'inset 0 1px 0 hsl(var(--sheen) / calc(0.55 * (1 - var(--lit)))), 0 1px 1px hsl(var(--recess) / calc(0.04 * (1 - var(--lit)))), inset 0 0 12px -2px hsl(var(--color-success-bg) / calc(0.20 * var(--lit))), 0 0 14px -4px hsl(var(--color-success-bg) / calc(0.40 * var(--lit)))',
        'standard-success-hover':
          'inset 0 1px 0 hsl(var(--sheen) / calc(0.55 * (1 - var(--lit)))), 0 1px 2px hsl(var(--recess) / calc(0.07 * (1 - var(--lit)))), inset 0 0 16px -2px hsl(var(--color-success-bg) / calc(0.35 * var(--lit))), 0 0 22px -2px hsl(var(--color-success-bg) / calc(0.55 * var(--lit)))',
        'standard-warning':
          'inset 0 1px 0 hsl(var(--sheen) / calc(0.55 * (1 - var(--lit)))), 0 1px 1px hsl(var(--recess) / calc(0.04 * (1 - var(--lit)))), inset 0 0 12px -2px hsl(var(--color-warning-bg) / calc(0.20 * var(--lit))), 0 0 14px -4px hsl(var(--color-warning-bg) / calc(0.40 * var(--lit)))',
        'standard-warning-hover':
          'inset 0 1px 0 hsl(var(--sheen) / calc(0.55 * (1 - var(--lit)))), 0 1px 2px hsl(var(--recess) / calc(0.07 * (1 - var(--lit)))), inset 0 0 16px -2px hsl(var(--color-warning-bg) / calc(0.35 * var(--lit))), 0 0 22px -2px hsl(var(--color-warning-bg) / calc(0.55 * var(--lit)))',
        'standard-info':
          'inset 0 1px 0 hsl(var(--sheen) / calc(0.55 * (1 - var(--lit)))), 0 1px 1px hsl(var(--recess) / calc(0.04 * (1 - var(--lit)))), inset 0 0 12px -2px hsl(var(--color-info-bg) / calc(0.20 * var(--lit))), 0 0 14px -4px hsl(var(--color-info-bg) / calc(0.40 * var(--lit)))',
        'standard-info-hover':
          'inset 0 1px 0 hsl(var(--sheen) / calc(0.55 * (1 - var(--lit)))), 0 1px 2px hsl(var(--recess) / calc(0.07 * (1 - var(--lit)))), inset 0 0 16px -2px hsl(var(--color-info-bg) / calc(0.35 * var(--lit))), 0 0 22px -2px hsl(var(--color-info-bg) / calc(0.55 * var(--lit)))',
      },
      backgroundImage: {
        scanlines:
          'repeating-linear-gradient(to bottom, hsl(var(--scanline)) 0, hsl(var(--scanline)) 1px, transparent 1px, transparent 3px)',
        /* Stacked, paints front-to-back:
           1. Primary-tinted 1px hairline at the very top — etched HUD edge
           2. Off-axis sheen (115°) — implies a light source above-left, not the
              symmetric top-down sheen used by generic glass UI
           3. Scanlines — material texture */
        'lit-fill':
          'linear-gradient(180deg, hsl(var(--primary) / 0.28) 0%, hsl(var(--primary) / 0.28) 1px, transparent 1px), linear-gradient(115deg, hsl(var(--sheen) / 0.08) 0%, hsl(var(--sheen) / 0.02) 28%, transparent 58%), repeating-linear-gradient(to bottom, hsl(var(--scanline)) 0, hsl(var(--scanline)) 1px, transparent 1px, transparent 3px)',
      },
      dropShadow: {
        /* SVG-icon parallel to the text-bloom text-shadow — glows in the icon's own color. */
        'icon-bloom': '0 0 6px color-mix(in srgb, currentColor 55%, transparent)',
        'icon-bloom-hover': [
          '0 0 8px color-mix(in srgb, currentColor 70%, transparent)',
          '0 0 14px color-mix(in srgb, currentColor 35%, transparent)',
        ],
      },
      keyframes: {
        'zoom-in-98': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'zoom-in-95': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(100px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'collapsible-down': {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
          to: { height: '0', opacity: '0' },
        },
      },
      animation: {
        'zoom-in-98': 'zoom-in-98 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        'zoom-in-95': 'zoom-in-95 250ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up-fade': 'slide-up-fade 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        'collapsible-down': 'collapsible-down 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'collapsible-up': 'collapsible-up 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
