export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: ['expanded', 'tank-level', 'rack-level', 'selector-level'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        page: 'hsl(var(--page) / <alpha-value>)',

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
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',

        line: {
          faint: 'hsl(var(--line-faint))',
          soft: 'hsl(var(--line-soft))',
          mid: 'hsl(var(--line-mid))',
          strong: 'hsl(var(--line-strong))',
        },

        shade: 'hsl(var(--shade) / <alpha-value>)',
        sheen: 'hsl(var(--sheen) / <alpha-value>)',
        scrim: 'hsl(var(--scrim) / <alpha-value>)',

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
      fontSize: {
        caption: ['0.8125rem', { lineHeight: '1.4' }],
        'body-sm': ['0.875rem', { lineHeight: '1.45' }],
        body: ['1rem', { lineHeight: '1.5' }],
        'body-lg': ['1.125rem', { lineHeight: '1.5' }],

        'title-sm': ['1.125rem', { lineHeight: '1.3', fontWeight: '600' }],
        title: ['1.25rem', { lineHeight: '1.25', fontWeight: '600' }],
        'title-lg': ['1.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        display: ['1.875rem', { lineHeight: '1.15', fontWeight: '700' }],

        'label-2xs': ['0.75rem', { lineHeight: '1' }],
        'label-xs': ['0.8125rem', { lineHeight: '1' }],
        'label-sm': ['0.875rem', { lineHeight: '1.1' }],
        'label-md': ['0.9375rem', { lineHeight: '1.1' }],
        'label-lg': ['1rem', { lineHeight: '1.1' }],
        'label-xl': ['1.125rem', { lineHeight: '1.1' }],

        'data-sm': ['0.8125rem', { lineHeight: '1.2' }],
        data: ['0.875rem', { lineHeight: '1.3' }],
        'data-lg': ['1rem', { lineHeight: '1.3' }],
        stat: ['1.875rem', { lineHeight: '1.05' }],
      },
      letterSpacing: {
        data: '0.02em',
        meta: '0.10em',
        label: '0.08em',
        'label-wide': '0.12em',
        ceremonial: '0.32em',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        sheen: 'inset 0 1px 0 0 hsl(var(--sheen) / 0.18)',
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
        'lit-fill':
          'linear-gradient(180deg, hsl(var(--primary) / 0.28) 0%, hsl(var(--primary) / 0.28) 1px, transparent 1px), linear-gradient(115deg, hsl(var(--sheen) / 0.08) 0%, hsl(var(--sheen) / 0.02) 28%, transparent 58%), repeating-linear-gradient(to bottom, hsl(var(--scanline)) 0, hsl(var(--scanline)) 1px, transparent 1px, transparent 3px)',
      },
      dropShadow: {
        'icon-bloom':
          '0 0 6px color-mix(in srgb, currentColor calc(55% * var(--lit)), transparent)',
        'icon-bloom-hover': [
          '0 0 8px color-mix(in srgb, currentColor calc(70% * var(--lit)), transparent)',
          '0 0 14px color-mix(in srgb, currentColor calc(35% * var(--lit)), transparent)',
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
