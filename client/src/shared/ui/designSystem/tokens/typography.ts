/**
 * Design System Typography Tokens
 *
 * Type scale configuration:
 * - Based on modular scale (1.250 - major third)
 * - Includes font weights, line heights, and letter spacing
 * - Responsive sizing for different screen sizes
 */

// Font families
export const fontFamilies = {
  // Primary font stack for UI (system fonts for performance)
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    '"Noto Sans"',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
    '"Noto Color Emoji"',
  ].join(', '),
  
  // Monospace for code and data
  mono: [
    '"JetBrains Mono"',
    '"Fira Code"',
    'Consolas',
    '"Liberation Mono"',
    'Menlo',
    'Monaco',
    '"Courier New"',
    'monospace',
  ].join(', '),
} as const;

// Font weights
export const fontWeights = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

// Base font sizes (modular scale with 1.250 ratio)
export const fontSizes = {
  xs: '0.75rem',      // 12px
  sm: '0.875rem',     // 14px
  base: '1rem',       // 16px (base size)
  lg: '1.125rem',     // 18px
  xl: '1.25rem',      // 20px
  '2xl': '1.5rem',    // 24px
  '3xl': '1.875rem',  // 30px
  '4xl': '2.25rem',   // 36px
  '5xl': '3rem',      // 48px
  '6xl': '3.75rem',   // 60px
  '7xl': '4.5rem',    // 72px
  '8xl': '6rem',      // 96px
  '9xl': '8rem',      // 128px
} as const;

// Line heights for optimal readability
export const lineHeights = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
  // Specific line heights for font sizes
  xs: '1rem',      // 16px
  sm: '1.25rem',   // 20px
  base: '1.5rem',  // 24px
  lg: '1.75rem',   // 28px
  xl: '1.75rem',   // 28px
  '2xl': '2rem',   // 32px
  '3xl': '2.25rem', // 36px
  '4xl': '2.5rem',  // 40px
  '5xl': '1',       // 1 (tight for large headings)
  '6xl': '1',       // 1 (tight for large headings)
  '7xl': '1',       // 1 (tight for large headings)
  '8xl': '1',       // 1 (tight for large headings)
  '9xl': '1',       // 1 (tight for large headings)
} as const;

// Letter spacing for improved readability
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// Semantic typography styles
export const typeScale = {
  // Display headings (hero sections, main headings)
  'display-2xl': {
    fontSize: fontSizes['8xl'],     // 96px
    lineHeight: lineHeights['8xl'], // 1
    fontWeight: fontWeights.bold,   // 700
    letterSpacing: letterSpacing.tighter, // -0.05em
    fontFamily: fontFamilies.sans,
  },
  
  'display-xl': {
    fontSize: fontSizes['7xl'],     // 72px
    lineHeight: lineHeights['7xl'], // 1
    fontWeight: fontWeights.bold,   // 700
    letterSpacing: letterSpacing.tighter, // -0.05em
    fontFamily: fontFamilies.sans,
  },
  
  'display-lg': {
    fontSize: fontSizes['6xl'],     // 60px
    lineHeight: lineHeights['6xl'], // 1
    fontWeight: fontWeights.bold,   // 700
    letterSpacing: letterSpacing.tight, // -0.025em
    fontFamily: fontFamilies.sans,
  },
  
  'display-md': {
    fontSize: fontSizes['5xl'],     // 48px
    lineHeight: lineHeights['5xl'], // 1
    fontWeight: fontWeights.bold,   // 700
    letterSpacing: letterSpacing.tight, // -0.025em
    fontFamily: fontFamilies.sans,
  },
  
  'display-sm': {
    fontSize: fontSizes['4xl'],     // 36px
    lineHeight: lineHeights['4xl'], // 2.5rem / 40px
    fontWeight: fontWeights.bold,   // 700
    letterSpacing: letterSpacing.tight, // -0.025em
    fontFamily: fontFamilies.sans,
  },
  
  'display-xs': {
    fontSize: fontSizes['3xl'],     // 30px
    lineHeight: lineHeights['3xl'], // 2.25rem / 36px
    fontWeight: fontWeights.bold,   // 700
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.sans,
  },
  
  // Standard headings (page sections, cards)
  'heading-xl': {
    fontSize: fontSizes['2xl'],     // 24px
    lineHeight: lineHeights['2xl'], // 2rem / 32px
    fontWeight: fontWeights.bold,   // 700
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.sans,
  },
  
  'heading-lg': {
    fontSize: fontSizes.xl,         // 20px
    lineHeight: lineHeights.xl,     // 1.75rem / 28px
    fontWeight: fontWeights.semibold, // 600
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.sans,
  },
  
  'heading-md': {
    fontSize: fontSizes.lg,         // 18px
    lineHeight: lineHeights.lg,     // 1.75rem / 28px
    fontWeight: fontWeights.semibold, // 600
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.sans,
  },
  
  'heading-sm': {
    fontSize: fontSizes.base,       // 16px
    lineHeight: lineHeights.base,   // 1.5rem / 24px
    fontWeight: fontWeights.semibold, // 600
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.sans,
  },
  
  'heading-xs': {
    fontSize: fontSizes.sm,         // 14px
    lineHeight: lineHeights.sm,     // 1.25rem / 20px
    fontWeight: fontWeights.semibold, // 600
    letterSpacing: letterSpacing.wide, // 0.025em
    fontFamily: fontFamilies.sans,
  },
  
  // Body text
  'body-xl': {
    fontSize: fontSizes.xl,         // 20px
    lineHeight: lineHeights.xl,     // 1.75rem / 28px
    fontWeight: fontWeights.normal, // 400
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.sans,
  },
  
  'body-lg': {
    fontSize: fontSizes.lg,         // 18px
    lineHeight: lineHeights.lg,     // 1.75rem / 28px
    fontWeight: fontWeights.normal, // 400
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.sans,
  },
  
  'body-md': {
    fontSize: fontSizes.base,       // 16px
    lineHeight: lineHeights.base,   // 1.5rem / 24px
    fontWeight: fontWeights.normal, // 400
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.sans,
  },
  
  'body-sm': {
    fontSize: fontSizes.sm,         // 14px
    lineHeight: lineHeights.sm,     // 1.25rem / 20px
    fontWeight: fontWeights.normal, // 400
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.sans,
  },
  
  'body-xs': {
    fontSize: fontSizes.xs,         // 12px
    lineHeight: lineHeights.xs,     // 1rem / 16px
    fontWeight: fontWeights.normal, // 400
    letterSpacing: letterSpacing.wide, // 0.025em
    fontFamily: fontFamilies.sans,
  },
  
  // Labels and captions
  'label-lg': {
    fontSize: fontSizes.base,       // 16px
    lineHeight: lineHeights.base,   // 1.5rem / 24px
    fontWeight: fontWeights.medium, // 500
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.sans,
  },
  
  'label-md': {
    fontSize: fontSizes.sm,         // 14px
    lineHeight: lineHeights.sm,     // 1.25rem / 20px
    fontWeight: fontWeights.medium, // 500
    letterSpacing: letterSpacing.wide, // 0.025em
    fontFamily: fontFamilies.sans,
  },
  
  'label-sm': {
    fontSize: fontSizes.xs,         // 12px
    lineHeight: lineHeights.xs,     // 1rem / 16px
    fontWeight: fontWeights.medium, // 500
    letterSpacing: letterSpacing.wider, // 0.05em
    fontFamily: fontFamilies.sans,
  },
  
  // Code and monospace
  'code-lg': {
    fontSize: fontSizes.base,       // 16px
    lineHeight: lineHeights.base,   // 1.5rem / 24px
    fontWeight: fontWeights.normal, // 400
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.mono,
  },
  
  'code-md': {
    fontSize: fontSizes.sm,         // 14px
    lineHeight: lineHeights.sm,     // 1.25rem / 20px
    fontWeight: fontWeights.normal, // 400
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.mono,
  },
  
  'code-sm': {
    fontSize: fontSizes.xs,         // 12px
    lineHeight: lineHeights.xs,     // 1rem / 16px
    fontWeight: fontWeights.normal, // 400
    letterSpacing: letterSpacing.normal, // 0em
    fontFamily: fontFamilies.mono,
  },
} as const;

// Type definitions
export type FontFamily = keyof typeof fontFamilies;
export type FontWeight = keyof typeof fontWeights;
export type FontSize = keyof typeof fontSizes;
export type LineHeight = keyof typeof lineHeights;
export type LetterSpacing = keyof typeof letterSpacing;
export type TypeScale = keyof typeof typeScale;

// Export consolidated typography system
export const typography = {
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacing,
  typeScale,
} as const;
