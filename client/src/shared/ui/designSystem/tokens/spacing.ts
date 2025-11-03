/**
 * Design System Spacing Tokens
 * 
 * Based on 4px/8px grid system for consistent spacing
 * All values are multiples of 4px for pixel-perfect alignment
 */

// Base spacing scale (4px grid system)
export const spacing = {
  0: '0',           // 0px
  px: '1px',        // 1px (for borders)
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// Semantic spacing tokens for common use cases
export const semanticSpacing = {
  // Component internal spacing
  'component-xs': spacing[1],    // 4px - tight internal spacing
  'component-sm': spacing[2],    // 8px - small internal spacing
  'component-md': spacing[3],    // 12px - medium internal spacing
  'component-lg': spacing[4],    // 16px - large internal spacing
  'component-xl': spacing[6],    // 24px - extra large internal spacing
  
  // Content spacing
  'content-xs': spacing[2],      // 8px - minimal content spacing
  'content-sm': spacing[4],      // 16px - small content spacing
  'content-md': spacing[6],      // 24px - medium content spacing
  'content-lg': spacing[8],      // 32px - large content spacing
  'content-xl': spacing[12],     // 48px - extra large content spacing
  
  // Layout spacing
  'layout-xs': spacing[4],       // 16px - tight layout spacing
  'layout-sm': spacing[6],       // 24px - small layout spacing
  'layout-md': spacing[8],       // 32px - medium layout spacing
  'layout-lg': spacing[12],      // 48px - large layout spacing
  'layout-xl': spacing[16],      // 64px - extra large layout spacing
  'layout-2xl': spacing[20],     // 80px - section spacing
  'layout-3xl': spacing[24],     // 96px - major section spacing
  
  // Page spacing
  'page-xs': spacing[8],         // 32px - minimal page margins
  'page-sm': spacing[12],        // 48px - small page margins
  'page-md': spacing[16],        // 64px - medium page margins
  'page-lg': spacing[20],        // 80px - large page margins
  'page-xl': spacing[24],        // 96px - extra large page margins
  
  // Container spacing
  'container-xs': spacing[4],    // 16px - minimal container padding
  'container-sm': spacing[6],    // 24px - small container padding
  'container-md': spacing[8],    // 32px - medium container padding
  'container-lg': spacing[12],   // 48px - large container padding
  'container-xl': spacing[16],   // 64px - extra large container padding
} as const;

// Grid and column spacing
export const gridSpacing = {
  // Grid gaps
  'grid-xs': spacing[2],         // 8px - tight grid gap
  'grid-sm': spacing[3],         // 12px - small grid gap
  'grid-md': spacing[4],         // 16px - medium grid gap
  'grid-lg': spacing[6],         // 24px - large grid gap
  'grid-xl': spacing[8],         // 32px - extra large grid gap
  
  // Column gaps
  'column-xs': spacing[3],       // 12px - tight column gap
  'column-sm': spacing[4],       // 16px - small column gap
  'column-md': spacing[6],       // 24px - medium column gap
  'column-lg': spacing[8],       // 32px - large column gap
  'column-xl': spacing[12],      // 48px - extra large column gap
  
  // Row gaps
  'row-xs': spacing[2],          // 8px - tight row gap
  'row-sm': spacing[3],          // 12px - small row gap
  'row-md': spacing[4],          // 16px - medium row gap
  'row-lg': spacing[6],          // 24px - large row gap
  'row-xl': spacing[8],          // 32px - extra large row gap
} as const;

// Interactive element spacing
export const interactiveSpacing = {
  // Button padding
  'button-xs': {
    x: spacing[3],               // 12px horizontal
    y: spacing[1.5],            // 6px vertical
  },
  'button-sm': {
    x: spacing[3],               // 12px horizontal  
    y: spacing[2],               // 8px vertical
  },
  'button-md': {
    x: spacing[4],               // 16px horizontal
    y: spacing[2.5],             // 10px vertical
  },
  'button-lg': {
    x: spacing[6],               // 24px horizontal
    y: spacing[3],               // 12px vertical
  },
  'button-xl': {
    x: spacing[8],               // 32px horizontal
    y: spacing[4],               // 16px vertical
  },
  
  // Input padding
  'input-xs': {
    x: spacing[2.5],             // 10px horizontal
    y: spacing[1.5],             // 6px vertical
  },
  'input-sm': {
    x: spacing[3],               // 12px horizontal
    y: spacing[2],               // 8px vertical
  },
  'input-md': {
    x: spacing[3],               // 12px horizontal
    y: spacing[2.5],             // 10px vertical
  },
  'input-lg': {
    x: spacing[4],               // 16px horizontal
    y: spacing[3],               // 12px vertical
  },
  'input-xl': {
    x: spacing[5],               // 20px horizontal
    y: spacing[3.5],             // 14px vertical
  },
  
  // Card padding
  'card-xs': spacing[3],         // 12px - minimal card padding
  'card-sm': spacing[4],         // 16px - small card padding
  'card-md': spacing[6],         // 24px - medium card padding
  'card-lg': spacing[8],         // 32px - large card padding
  'card-xl': spacing[10],        // 40px - extra large card padding
  
  // Modal padding
  'modal-xs': spacing[4],        // 16px - minimal modal padding
  'modal-sm': spacing[6],        // 24px - small modal padding
  'modal-md': spacing[8],        // 32px - medium modal padding
  'modal-lg': spacing[10],       // 40px - large modal padding
  'modal-xl': spacing[12],       // 48px - extra large modal padding
} as const;

// Responsive spacing breakpoints
export const responsiveSpacing = {
  // Mobile-first responsive spacing
  mobile: {
    page: spacing[4],            // 16px page margins on mobile
    section: spacing[6],         // 24px section spacing on mobile  
    component: spacing[3],       // 12px component spacing on mobile
  },
  tablet: {
    page: spacing[6],            // 24px page margins on tablet
    section: spacing[8],         // 32px section spacing on tablet
    component: spacing[4],       // 16px component spacing on tablet
  },
  desktop: {
    page: spacing[8],            // 32px page margins on desktop
    section: spacing[12],        // 48px section spacing on desktop
    component: spacing[6],       // 24px component spacing on desktop
  },
  wide: {
    page: spacing[12],           // 48px page margins on wide screens
    section: spacing[16],        // 64px section spacing on wide screens  
    component: spacing[8],       // 32px component spacing on wide screens
  },
} as const;

// Safe area spacing for mobile devices
export const safeAreaSpacing = {
  top: 'env(safe-area-inset-top)',
  right: 'env(safe-area-inset-right)', 
  bottom: 'env(safe-area-inset-bottom)',
  left: 'env(safe-area-inset-left)',
} as const;

// Type definitions
export type Spacing = keyof typeof spacing;
export type SemanticSpacing = keyof typeof semanticSpacing;
export type GridSpacing = keyof typeof gridSpacing;
export type InteractiveSpacing = keyof typeof interactiveSpacing;
export type ResponsiveSpacing = keyof typeof responsiveSpacing;

// Utility type for spacing values
export type SpacingValue = typeof spacing[Spacing];

// Complete spacing system export
export const spacingSystem = {
  base: spacing,
  semantic: semanticSpacing,
  grid: gridSpacing,
  interactive: interactiveSpacing,
  responsive: responsiveSpacing,
  safeArea: safeAreaSpacing,
} as const;
