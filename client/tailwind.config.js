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
        sans: ['Lato', 'system-ui', 'sans-serif'],
        mono: [
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
