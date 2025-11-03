/**
 * Design System Color Tokens
 * 
 * WCAG AA Compliant color palette for Odysseus application
 * All color combinations meet minimum contrast ratio requirements:
 * - Normal text: 4.5:1 contrast ratio
 * - Large text: 3:1 contrast ratio
 */

// Base color palette
export const baseColors = {
  // Blue palette (Primary brand colors)
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  
  // Gray palette (Neutral colors)
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Green palette (Success states)
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  
  // Red palette (Error states)
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  
  // Yellow/Amber palette (Warning states)
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  
  // Pure colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Semantic color tokens mapped to base colors
export const semanticColors = {
  // Primary brand colors
  primary: {
    50: baseColors.blue[50],
    100: baseColors.blue[100],
    200: baseColors.blue[200],
    300: baseColors.blue[300],
    400: baseColors.blue[400],
    500: baseColors.blue[500],
    600: baseColors.blue[600],
    700: baseColors.blue[700],
    800: baseColors.blue[800],
    900: baseColors.blue[900],
    950: baseColors.blue[950],
  },
  
  // Neutral colors
  neutral: {
    50: baseColors.gray[50],
    100: baseColors.gray[100],
    200: baseColors.gray[200],
    300: baseColors.gray[300],
    400: baseColors.gray[400],
    500: baseColors.gray[500],
    600: baseColors.gray[600],
    700: baseColors.gray[700],
    800: baseColors.gray[800],
    900: baseColors.gray[900],
    950: baseColors.gray[950],
  },
  
  // Status colors
  success: {
    50: baseColors.green[50],
    100: baseColors.green[100],
    200: baseColors.green[200],
    300: baseColors.green[300],
    400: baseColors.green[400],
    500: baseColors.green[500],
    600: baseColors.green[600],
    700: baseColors.green[700],
    800: baseColors.green[800],
    900: baseColors.green[900],
    950: baseColors.green[950],
  },
  
  error: {
    50: baseColors.red[50],
    100: baseColors.red[100],
    200: baseColors.red[200],
    300: baseColors.red[300],
    400: baseColors.red[400],
    500: baseColors.red[500],
    600: baseColors.red[600],
    700: baseColors.red[700],
    800: baseColors.red[800],
    900: baseColors.red[900],
    950: baseColors.red[950],
  },
  
  warning: {
    50: baseColors.amber[50],
    100: baseColors.amber[100],
    200: baseColors.amber[200],
    300: baseColors.amber[300],
    400: baseColors.amber[400],
    500: baseColors.amber[500],
    600: baseColors.amber[600],
    700: baseColors.amber[700],
    800: baseColors.amber[800],
    900: baseColors.amber[900],
    950: baseColors.amber[950],
  },
} as const;

// Surface colors for backgrounds and cards
export const surfaceColors = {
  // Light theme surfaces
  background: baseColors.white,
  surface: baseColors.gray[50],
  'surface-elevated': baseColors.white,
  'surface-variant': baseColors.gray[100],
  
  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  'overlay-light': 'rgba(0, 0, 0, 0.25)',
  'overlay-heavy': 'rgba(0, 0, 0, 0.75)',
} as const;

// Border colors
export const borderColors = {
  default: baseColors.gray[200],
  muted: baseColors.gray[100],
  strong: baseColors.gray[300],
  primary: semanticColors.primary[300],
  success: semanticColors.success[300],
  error: semanticColors.error[300],
  warning: semanticColors.warning[300],
} as const;

// Text colors with WCAG AA compliance
export const textColors = {
  // Primary text (high contrast) - 21:1 contrast on white
  primary: baseColors.gray[900],
  
  // Secondary text (medium contrast) - 7:1 contrast on white
  secondary: baseColors.gray[600],
  
  // Muted text (lower contrast) - 4.5:1 contrast on white
  muted: baseColors.gray[500],
  
  // Inverted text for dark backgrounds
  'primary-inverted': baseColors.white,
  'secondary-inverted': baseColors.gray[200],
  'muted-inverted': baseColors.gray[400],
  
  // Status text colors (WCAG AA compliant)
  success: semanticColors.success[700],
  error: semanticColors.error[600],
  warning: semanticColors.warning[700],
  info: semanticColors.primary[700],
} as const;

// Interactive element colors
export const interactiveColors = {
  // Links
  link: semanticColors.primary[600],
  'link-hover': semanticColors.primary[700],
  'link-visited': semanticColors.primary[800],
  
  // Focus states
  'focus-ring': semanticColors.primary[500],
  'focus-ring-offset': baseColors.white,
} as const;

// Complete color system export
export const colors = {
  ...baseColors,
  ...semanticColors,
  surface: surfaceColors,
  border: borderColors,
  text: textColors,
  interactive: interactiveColors,
} as const;

// Type definitions for colors
export type BaseColor = keyof typeof baseColors;
export type SemanticColor = keyof typeof semanticColors;
export type SurfaceColor = keyof typeof surfaceColors;
export type BorderColor = keyof typeof borderColors;
export type TextColor = keyof typeof textColors;
export type InteractiveColor = keyof typeof interactiveColors;

// Color shade type for semantic colors
export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

// Utility type for accessing semantic color shades
export type SemanticColorValue = {
  [K in SemanticColor]: typeof semanticColors[K]
};
