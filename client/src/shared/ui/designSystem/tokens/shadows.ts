/**
 * Design System Shadow Tokens
 * 
 * Consistent elevation and depth system using box shadows
 * Following Material Design principles for natural shadow progression
 */

// Base shadow definitions with natural progression
export const baseShadows = {
  // No shadow (flat design)
  none: 'none',
  
  // Subtle shadows (minimal elevation)
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  
  // Small shadows (slight elevation - cards, buttons)  
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  
  // Medium shadows (moderate elevation - dropdowns, popovers)
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  
  // Large shadows (high elevation - modals, flyouts)
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  
  // Extra large shadows (very high elevation - major overlays)
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  
  // 2XL shadows (maximum elevation - top-level overlays)
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  // Inner shadows (inset/pressed effect)
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
} as const;

// Colored shadows for interactive states and branding
export const coloredShadows = {
  // Primary brand shadows (blue tints)
  'primary-xs': '0 1px 2px 0 rgba(59, 130, 246, 0.05)',
  'primary-sm': '0 1px 3px 0 rgba(59, 130, 246, 0.1), 0 1px 2px -1px rgba(59, 130, 246, 0.1)',
  'primary-md': '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -2px rgba(59, 130, 246, 0.1)',
  'primary-lg': '0 10px 15px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -4px rgba(59, 130, 246, 0.1)',
  
  // Success shadows (green tints)
  'success-xs': '0 1px 2px 0 rgba(34, 197, 94, 0.05)',
  'success-sm': '0 1px 3px 0 rgba(34, 197, 94, 0.1), 0 1px 2px -1px rgba(34, 197, 94, 0.1)',
  'success-md': '0 4px 6px -1px rgba(34, 197, 94, 0.1), 0 2px 4px -2px rgba(34, 197, 94, 0.1)',
  
  // Error shadows (red tints)
  'error-xs': '0 1px 2px 0 rgba(239, 68, 68, 0.05)',
  'error-sm': '0 1px 3px 0 rgba(239, 68, 68, 0.1), 0 1px 2px -1px rgba(239, 68, 68, 0.1)',
  'error-md': '0 4px 6px -1px rgba(239, 68, 68, 0.1), 0 2px 4px -2px rgba(239, 68, 68, 0.1)',
  
  // Warning shadows (amber tints)
  'warning-xs': '0 1px 2px 0 rgba(245, 158, 11, 0.05)',
  'warning-sm': '0 1px 3px 0 rgba(245, 158, 11, 0.1), 0 1px 2px -1px rgba(245, 158, 11, 0.1)',
  'warning-md': '0 4px 6px -1px rgba(245, 158, 11, 0.1), 0 2px 4px -2px rgba(245, 158, 11, 0.1)',
} as const;

// Interactive state shadows
export const interactiveShadows = {
  // Default state
  default: baseShadows.sm,
  
  // Hover state (slightly elevated)
  hover: baseShadows.md,
  
  // Active/pressed state (reduced shadow)
  active: baseShadows.xs,
  
  // Focus state (prominent outline)
  focus: '0 0 0 3px rgba(59, 130, 246, 0.15), 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  
  // Focus visible (keyboard navigation)
  'focus-visible': '0 0 0 3px rgba(59, 130, 246, 0.2), 0 1px 3px 0 rgba(0, 0, 0, 0.15)',
  
  // Disabled state (very subtle)
  disabled: '0 1px 2px 0 rgba(0, 0, 0, 0.025)',
} as const;

// Component-specific shadow presets
export const componentShadows = {
  // Button shadows
  button: {
    default: baseShadows.sm,
    hover: baseShadows.md,
    active: baseShadows.xs,
    focus: interactiveShadows.focus,
  },
  
  // Card shadows
  card: {
    flat: baseShadows.xs,
    elevated: baseShadows.sm,
    floating: baseShadows.md,
    prominent: baseShadows.lg,
  },
  
  // Modal shadows
  modal: {
    backdrop: 'rgba(0, 0, 0, 0.25)',
    container: baseShadows.xl,
    drawer: baseShadows.lg,
  },
  
  // Dropdown shadows
  dropdown: {
    menu: baseShadows.lg,
    item: baseShadows.none,
    'item-hover': baseShadows.xs,
  },
  
  // Popover shadows
  popover: {
    default: baseShadows.md,
    elevated: baseShadows.lg,
  },
  
  // Tooltip shadows
  tooltip: {
    default: baseShadows.sm,
  },
  
  // Input shadows
  input: {
    default: baseShadows.none,
    focus: interactiveShadows.focus,
    error: coloredShadows['error-sm'],
  },
  
  // Table shadows
  table: {
    container: baseShadows.xs,
    header: baseShadows.sm,
    'row-hover': baseShadows.xs,
  },
  
  // Tab shadows
  tab: {
    panel: baseShadows.sm,
    'active-tab': baseShadows.xs,
  },
  
  // Badge shadows
  badge: {
    default: baseShadows.xs,
    prominent: baseShadows.sm,
  },
  
  // Avatar shadows
  avatar: {
    default: baseShadows.xs,
    elevated: baseShadows.sm,
  },
  
  // Progress shadows
  progress: {
    track: baseShadows.inner,
    bar: baseShadows.xs,
  },
  
  // Navigation shadows
  navigation: {
    sidebar: baseShadows.lg,
    header: baseShadows.sm,
    'mobile-menu': baseShadows.xl,
  },
  
  // Loading shadows
  loading: {
    skeleton: baseShadows.xs,
    spinner: baseShadows.none,
  },
} as const;

// Layout-specific shadows
export const layoutShadows = {
  // Container shadows
  container: {
    page: baseShadows.none,
    section: baseShadows.xs,
    elevated: baseShadows.sm,
  },
  
  // Header shadows
  header: {
    sticky: baseShadows.sm,
    floating: baseShadows.md,
  },
  
  // Footer shadows
  footer: {
    default: baseShadows.none,
    elevated: baseShadows.sm,
  },
  
  // Sidebar shadows
  sidebar: {
    default: baseShadows.lg,
    overlay: baseShadows.xl,
  },
} as const;

// Utility shadows for special effects
export const utilityShadows = {
  // Glow effects
  glow: {
    primary: '0 0 20px rgba(59, 130, 246, 0.3)',
    success: '0 0 20px rgba(34, 197, 94, 0.3)',
    error: '0 0 20px rgba(239, 68, 68, 0.3)',
    warning: '0 0 20px rgba(245, 158, 11, 0.3)',
  },
  
  // Ring effects (for focus states)
  ring: {
    default: '0 0 0 3px rgba(59, 130, 246, 0.15)',
    thick: '0 0 0 4px rgba(59, 130, 246, 0.15)',
    error: '0 0 0 3px rgba(239, 68, 68, 0.15)',
    success: '0 0 0 3px rgba(34, 197, 94, 0.15)',
    warning: '0 0 0 3px rgba(245, 158, 11, 0.15)',
  },
  
  // Text shadows
  text: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0 1px 3px rgba(0, 0, 0, 0.15)',
    lg: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  
  // Inset shadows
  inset: {
    sm: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
    md: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
    lg: 'inset 0 4px 8px rgba(0, 0, 0, 0.15)',
  },
} as const;

// Dark theme shadows (adjusted for dark backgrounds)
export const darkShadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
} as const;

// Type definitions
export type BaseShadow = keyof typeof baseShadows;
export type ColoredShadow = keyof typeof coloredShadows;
export type InteractiveShadow = keyof typeof interactiveShadows;
export type ComponentShadow = keyof typeof componentShadows;
export type LayoutShadow = keyof typeof layoutShadows;
export type UtilityShadow = keyof typeof utilityShadows;

// Utility type for shadow values
export type ShadowValue = typeof baseShadows[BaseShadow];

// Complete shadow system export
export const shadows = {
  base: baseShadows,
  colored: coloredShadows,
  interactive: interactiveShadows,
  components: componentShadows,
  layout: layoutShadows,
  utilities: utilityShadows,
  dark: darkShadows,
} as const;
