/**
 * Design System Border Tokens
 * 
 * Consistent border widths, styles, and radius values
 * Following design system principles for visual hierarchy
 */

// Border widths
export const borderWidths = {
  0: '0',
  px: '1px',      // Hairline border
  0.5: '0.5px',   // Ultra-thin border (high DPI displays)
  1: '1px',       // Default thin border
  2: '2px',       // Medium border
  4: '4px',       // Thick border
  8: '8px',       // Very thick border (rare)
} as const;

// Border styles
export const borderStyles = {
  none: 'none',
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  double: 'double',
} as const;

// Border radius (following spacing scale for consistency)
export const borderRadius = {
  none: '0',
  xs: '0.125rem',   // 2px - minimal rounding
  sm: '0.25rem',    // 4px - small rounding
  base: '0.375rem', // 6px - default rounding
  md: '0.5rem',     // 8px - medium rounding  
  lg: '0.75rem',    // 12px - large rounding
  xl: '1rem',       // 16px - extra large rounding
  '2xl': '1.5rem',  // 24px - very large rounding
  '3xl': '2rem',    // 32px - huge rounding
  full: '9999px',   // Fully rounded (pills, circles)
} as const;

// Semantic border tokens for different components
export const semanticBorders = {
  // Default borders
  default: {
    width: borderWidths[1],     // 1px
    style: borderStyles.solid,
    radius: borderRadius.base,  // 6px
  },
  
  // Subtle borders (less prominent)
  subtle: {
    width: borderWidths.px,     // 1px hairline
    style: borderStyles.solid,
    radius: borderRadius.sm,    // 4px
  },
  
  // Strong borders (more prominent) 
  strong: {
    width: borderWidths[2],     // 2px
    style: borderStyles.solid,
    radius: borderRadius.md,    // 8px
  },
  
  // Focus borders (accessibility)
  focus: {
    width: borderWidths[2],     // 2px
    style: borderStyles.solid,
    radius: borderRadius.base,  // 6px
  },
  
  // Error borders
  error: {
    width: borderWidths[1],     // 1px
    style: borderStyles.solid,
    radius: borderRadius.base,  // 6px
  },
  
  // Success borders
  success: {
    width: borderWidths[1],     // 1px
    style: borderStyles.solid,
    radius: borderRadius.base,  // 6px
  },
  
  // Warning borders
  warning: {
    width: borderWidths[1],     // 1px
    style: borderStyles.solid,
    radius: borderRadius.base,  // 6px
  },
} as const;

// Component-specific border configurations
export const componentBorders = {
  // Button borders
  button: {
    xs: {
      width: borderWidths[1],
      radius: borderRadius.sm,   // 4px - small buttons
    },
    sm: {
      width: borderWidths[1], 
      radius: borderRadius.base, // 6px - small buttons
    },
    md: {
      width: borderWidths[1],
      radius: borderRadius.base, // 6px - medium buttons (default)
    },
    lg: {
      width: borderWidths[1],
      radius: borderRadius.md,   // 8px - large buttons
    },
    xl: {
      width: borderWidths[1],
      radius: borderRadius.lg,   // 12px - extra large buttons
    },
    pill: {
      width: borderWidths[1],
      radius: borderRadius.full, // Pill-shaped buttons
    },
  },
  
  // Input borders
  input: {
    xs: {
      width: borderWidths[1],
      radius: borderRadius.sm,   // 4px - small inputs
    },
    sm: {
      width: borderWidths[1],
      radius: borderRadius.base, // 6px - small inputs  
    },
    md: {
      width: borderWidths[1],
      radius: borderRadius.base, // 6px - medium inputs (default)
    },
    lg: {
      width: borderWidths[1],
      radius: borderRadius.md,   // 8px - large inputs
    },
    xl: {
      width: borderWidths[1],
      radius: borderRadius.lg,   // 12px - extra large inputs
    },
  },
  
  // Card borders
  card: {
    default: {
      width: borderWidths[1],
      radius: borderRadius.lg,   // 12px - default cards
    },
    elevated: {
      width: borderWidths[0],    // No border (shadow provides separation)
      radius: borderRadius.xl,   // 16px - elevated cards
    },
    interactive: {
      width: borderWidths[1],
      radius: borderRadius.lg,   // 12px - hoverable cards
    },
  },
  
  // Modal borders
  modal: {
    default: {
      width: borderWidths[0],    // No border
      radius: borderRadius.xl,   // 16px - modern modal appearance
    },
    bordered: {
      width: borderWidths[1],
      radius: borderRadius.xl,   // 16px - bordered modal
    },
  },
  
  // Table borders
  table: {
    cell: {
      width: borderWidths[1],
      style: borderStyles.solid,
    },
    header: {
      width: borderWidths[2],    // Thicker for headers
      style: borderStyles.solid,
    },
  },
  
  // Badge borders
  badge: {
    default: {
      width: borderWidths[1],
      radius: borderRadius.base, // 6px - default badges
    },
    pill: {
      width: borderWidths[1], 
      radius: borderRadius.full, // Pill-shaped badges
    },
    square: {
      width: borderWidths[1],
      radius: borderRadius.sm,   // 4px - square badges
    },
  },
  
  // Avatar borders
  avatar: {
    square: {
      width: borderWidths[1],
      radius: borderRadius.base, // 6px - square avatars
    },
    rounded: {
      width: borderWidths[1],
      radius: borderRadius.lg,   // 12px - rounded avatars
    },
    circle: {
      width: borderWidths[1],
      radius: borderRadius.full, // Circular avatars
    },
  },
  
  // Tooltip borders
  tooltip: {
    default: {
      width: borderWidths[1],
      radius: borderRadius.base, // 6px - tooltips
    },
  },
  
  // Popover borders
  popover: {
    default: {
      width: borderWidths[1],
      radius: borderRadius.lg,   // 12px - popovers
    },
  },
  
  // Dropdown borders
  dropdown: {
    default: {
      width: borderWidths[1],
      radius: borderRadius.md,   // 8px - dropdowns
    },
  },
  
  // Checkbox/Radio borders
  checkbox: {
    default: {
      width: borderWidths[2],    // Thicker for visibility
      radius: borderRadius.sm,   // 4px - checkbox
    },
  },
  
  radio: {
    default: {
      width: borderWidths[2],    // Thicker for visibility
      radius: borderRadius.full, // Circular radio buttons
    },
  },
  
  // Progress borders
  progress: {
    bar: {
      width: borderWidths[0],
      radius: borderRadius.full, // Rounded progress bars
    },
    track: {
      width: borderWidths[1],
      radius: borderRadius.full, // Rounded progress track
    },
  },
  
  // Tab borders
  tab: {
    default: {
      width: borderWidths[1],
      radius: borderRadius.base, // 6px - tab buttons
    },
    underline: {
      width: borderWidths[2],    // Underline indicator
      radius: borderRadius.none,
    },
  },
} as const;

// Responsive border adjustments
export const responsiveBorders = {
  // Touch-friendly borders for mobile
  mobile: {
    minTouchTarget: {
      width: borderWidths[2],    // Thicker borders for touch
      radius: borderRadius.md,   // Slightly more rounded for touch
    },
  },
  
  // Fine borders for desktop
  desktop: {
    precise: {
      width: borderWidths.px,    // Hairline borders
      radius: borderRadius.base, // Standard rounding
    },
  },
} as const;

// Special effects borders
export const effectBorders = {
  // Gradient borders (for CSS border-image)
  gradient: {
    width: borderWidths[1],
    style: borderStyles.solid,
    radius: borderRadius.lg,
  },
  
  // Dashed outline borders
  outline: {
    width: borderWidths[2],
    style: borderStyles.dashed,
    radius: borderRadius.base,
  },
  
  // Double borders for emphasis
  double: {
    width: borderWidths[4],
    style: borderStyles.double,
    radius: borderRadius.base,
  },
} as const;

// Type definitions
export type BorderWidth = keyof typeof borderWidths;
export type BorderStyle = keyof typeof borderStyles; 
export type BorderRadius = keyof typeof borderRadius;
export type SemanticBorder = keyof typeof semanticBorders;
export type ComponentBorder = keyof typeof componentBorders;

// Utility type for border values
export type BorderWidthValue = typeof borderWidths[BorderWidth];
export type BorderRadiusValue = typeof borderRadius[BorderRadius];

// Complete border system export
export const borders = {
  widths: borderWidths,
  styles: borderStyles,
  radius: borderRadius,
  semantic: semanticBorders,
  components: componentBorders,
  responsive: responsiveBorders,
  effects: effectBorders,
} as const;
