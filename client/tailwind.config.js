/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: ['expanded', 'tank-level', 'rack-level', 'selector-level'],
  theme: {
    extend: {
      colors: {
        /* Core color system */

        /* Core */
        background: 'var(--background)',
        foreground: 'var(--foreground)',

        /* Surfaces */
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },

        /* Semantic */
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        /* Utilities */
        border: 'var(--border)',
        input: 'var(--input)',

        /* Application-specific extensions */

        action: {
          DEFAULT: 'var(--color-action-default)',
          hover: 'var(--color-action-hover)',
          focus: 'var(--color-action-focus)',
        },
        danger: {
          bg: 'var(--color-danger-bg)',
          hover: 'var(--color-danger-hover)',
          text: 'var(--color-danger-text)',
          btnText: 'var(--color-danger-btnText)',
          light: 'var(--color-danger-light)',
          border: 'var(--color-danger-border)',
        },
        clear: {
          bg: 'var(--color-clear-bg)',
          hover: 'var(--color-clear-hover)',
          text: 'var(--color-clear-text)',
        },
        warning: {
          bg: 'var(--color-warning-bg)',
          hover: 'var(--color-warning-hover)',
          text: 'var(--color-warning-text)',
          btnText: 'var(--color-warning-btnText)',
          light: 'var(--color-warning-light)',
          border: 'var(--color-warning-border)',
        },
        lock: {
          bg: 'var(--color-lock-bg)',
          hover: 'var(--color-lock-hover)',
          text: 'var(--color-lock-text)',
          btnText: 'var(--color-lock-btnText)',
        },
        share: {
          bg: 'var(--color-share-bg)',
          hover: 'var(--color-share-hover)',
          text: 'var(--color-share-text)',
          btnText: 'var(--color-share-btnText)',
        },
        success: {
          bg: 'var(--color-success-bg)',
          hover: 'var(--color-success-hover)',
          text: 'var(--color-success-text)',
          btnText: 'var(--color-success-btnText)',
          light: 'var(--color-success-light)',
          border: 'var(--color-success-border)',
        },
        info: {
          bg: 'var(--color-info-bg)',
          hover: 'var(--color-info-hover)',
          text: 'var(--color-info-text)',
          btnText: 'var(--color-info-btnText)',
          light: 'var(--color-info-light)',
          border: 'var(--color-info-border)',
        },
        validation: {
          error: {
            border: 'var(--color-validation-error-border)',
            bg: 'var(--color-validation-error-bg)',
            text: 'var(--color-validation-error-text)',
            label: 'var(--color-validation-error-label)',
            helper: 'var(--color-validation-error-helper)',
            ring: 'var(--color-validation-error-ring)',
            icon: 'var(--color-validation-error-icon)',
            required: 'var(--color-validation-error-required)',
          },
          warning: {
            border: 'var(--color-validation-warning-border)',
            bg: 'var(--color-validation-warning-bg)',
            text: 'var(--color-validation-warning-text)',
            label: 'var(--color-validation-warning-label)',
            helper: 'var(--color-validation-warning-helper)',
            ring: 'var(--color-validation-warning-ring)',
            icon: 'var(--color-validation-warning-icon)',
          },
          success: {
            border: 'var(--color-validation-success-border)',
            bg: 'var(--color-validation-success-bg)',
            text: 'var(--color-validation-success-text)',
            label: 'var(--color-validation-success-label)',
            ring: 'var(--color-validation-success-ring)',
            icon: 'var(--color-validation-success-icon)',
          },
          default: {
            border: 'var(--color-validation-default-border)',
            bg: 'var(--color-validation-default-bg)',
            ring: 'var(--color-validation-default-ring)',
          },
        },

        /* Always-dark components */

        toast: {
          DEFAULT: 'var(--toast)',
          foreground: 'var(--toast-foreground)',
        },
        tooltip: {
          DEFAULT: 'var(--tooltip)',
          foreground: 'var(--tooltip-foreground)',
          border: 'var(--tooltip-border)',
          muted: 'var(--tooltip-muted)',
        },
        'chip-active': {
          DEFAULT: 'var(--chip-active)',
          foreground: 'var(--chip-active-foreground)',
          hover: 'var(--chip-active-hover)',
        },
        'status-offline': {
          DEFAULT: 'var(--status-offline)',
          foreground: 'var(--status-offline-foreground)',
          border: 'var(--status-offline-border)',
          muted: 'var(--status-offline-muted)',
          hover: 'var(--status-offline-hover)',
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
        slideDown: {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
        },
        slideUp: {
          from: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
          to: { height: '0', opacity: '0' },
        },
      },
      animation: {
        'zoom-in-98': 'zoom-in-98 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        'zoom-in-95': 'zoom-in-95 250ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up-fade': 'slide-up-fade 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        slideDown: 'slideDown 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        slideUp: 'slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
