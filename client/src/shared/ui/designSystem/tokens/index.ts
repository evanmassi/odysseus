/**
 * Design System Tokens
 * 
 * Centralized export of all design tokens for the Odysseus application
 * These tokens form the foundation of the component library and ensure
 * consistent visual design across the entire application.
 */

// Import all tokens from individual files
import { borders, borderWidths, borderStyles, borderRadius, semanticBorders, componentBorders, responsiveBorders, effectBorders } from './borders';
import { colors, baseColors, semanticColors, surfaceColors, borderColors, textColors, interactiveColors } from './colors';
import { shadows, baseShadows, coloredShadows, interactiveShadows, componentShadows, layoutShadows, utilityShadows, darkShadows } from './shadows';
import { 
  spacingSystem, 
  spacing as baseSpacing, 
  semanticSpacing, 
  gridSpacing, 
  interactiveSpacing, 
  responsiveSpacing, 
  safeAreaSpacing 
} from './spacing';
import { typography, fontFamilies, fontWeights, fontSizes, lineHeights, letterSpacing, typeScale } from './typography';

// Re-export individual token exports
export { colors, baseColors, semanticColors, surfaceColors, borderColors, textColors, interactiveColors };
export type { BaseColor, SemanticColor, SurfaceColor, BorderColor, TextColor, InteractiveColor, ColorShade, SemanticColorValue } from './colors';

export { typography, fontFamilies, fontWeights, fontSizes, lineHeights, letterSpacing, typeScale };
export type { FontFamily, FontWeight, FontSize, LineHeight, LetterSpacing, TypeScale } from './typography';

export { 
  spacingSystem, 
  baseSpacing, 
  semanticSpacing, 
  gridSpacing, 
  interactiveSpacing, 
  responsiveSpacing, 
  safeAreaSpacing 
};
export type { Spacing, SemanticSpacing, GridSpacing, InteractiveSpacing, ResponsiveSpacing, SpacingValue } from './spacing';

export { borders, borderWidths, borderStyles, borderRadius, semanticBorders, componentBorders, responsiveBorders, effectBorders };
export type { BorderWidth, BorderStyle, BorderRadius, SemanticBorder, ComponentBorder, BorderWidthValue, BorderRadiusValue } from './borders';

export { shadows, baseShadows, coloredShadows, interactiveShadows, componentShadows, layoutShadows, utilityShadows, darkShadows };
export type { BaseShadow, ColoredShadow, InteractiveShadow, ComponentShadow, LayoutShadow, UtilityShadow, ShadowValue } from './shadows';

// Consolidated design system export
export const designSystem = {
  colors,
  typography,
  spacing: spacingSystem,
  borders,
  shadows,
} as const;

// Theme configuration for easy consumption
export const theme = {
  // Color palette
  colors: {
    // Base colors
    ...baseColors,
    // Semantic colors
    primary: semanticColors.primary,
    neutral: semanticColors.neutral,
    success: semanticColors.success,
    error: semanticColors.error,
    warning: semanticColors.warning,
    // Surface colors
    surface: surfaceColors,
    // Border colors  
    border: borderColors,
    // Text colors
    text: textColors,
    // Interactive colors
    interactive: interactiveColors,
  },
  
  // Typography system
  typography: {
    // Font families
    fonts: fontFamilies,
    // Font weights
    weights: fontWeights,
    // Font sizes
    sizes: fontSizes,
    // Line heights
    lineHeights: lineHeights,
    // Letter spacing
    letterSpacing: letterSpacing,
    // Type scale (semantic typography)
    typeScale: typeScale,
  },
  
  // Spacing system
  spacing: {
    // Base spacing scale
    base: baseSpacing,
    // Semantic spacing
    semantic: semanticSpacing,
    // Grid spacing
    grid: gridSpacing,
    // Interactive element spacing
    interactive: interactiveSpacing,
    // Responsive spacing
    responsive: responsiveSpacing,
    // Safe area spacing
    safeArea: safeAreaSpacing,
  },
  
  // Border system
  borders: {
    // Border widths
    widths: borderWidths,
    // Border styles
    styles: borderStyles,
    // Border radius
    radius: borderRadius,
    // Semantic borders
    semantic: semanticBorders,
    // Component borders
    components: componentBorders,
    // Responsive borders
    responsive: responsiveBorders,
    // Effect borders
    effects: effectBorders,
  },
  
  // Shadow system
  shadows: {
    // Base shadows
    base: baseShadows,
    // Colored shadows
    colored: coloredShadows,
    // Interactive shadows
    interactive: interactiveShadows,
    // Component shadows
    components: componentShadows,
    // Layout shadows
    layout: layoutShadows,
    // Utility shadows
    utilities: utilityShadows,
    // Dark theme shadows
    dark: darkShadows,
  },
} as const;

// Breakpoints for responsive design
export const breakpoints = {
  xs: '480px',     // Extra small devices (phones)
  sm: '640px',     // Small devices (large phones, small tablets)
  md: '768px',     // Medium devices (tablets)
  lg: '1024px',    // Large devices (small laptops)
  xl: '1280px',    // Extra large devices (large laptops, desktops)
  '2xl': '1536px', // 2X large devices (large desktops)
} as const;

// Z-index scale for layering
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Animation durations and easings
export const animations = {
  // Duration tokens
  duration: {
    instant: '0ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '800ms',
  },
  
  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    backIn: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
    backOut: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    backInOut: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// Complete theme export with utilities
export const odysseusTheme = {
  ...theme,
  breakpoints,
  zIndex,
  animations,
} as const;

// Type definitions for the complete theme
export type OdysseusTheme = typeof odysseusTheme;
export type ThemeColors = typeof theme.colors;
export type ThemeTypography = typeof theme.typography;
export type ThemeSpacing = typeof theme.spacing;
export type ThemeBorders = typeof theme.borders;
export type ThemeShadows = typeof theme.shadows;
export type Breakpoint = keyof typeof breakpoints;
export type ZIndex = keyof typeof zIndex;
export type AnimationDuration = keyof typeof animations.duration;
export type AnimationEasing = keyof typeof animations.easing;
