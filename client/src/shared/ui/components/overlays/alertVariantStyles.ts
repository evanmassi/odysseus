/**
 * Alert Dialog Variant Styles
 *
 * Icon color, corner-pin glow, and animated mark for each alert-dialog severity,
 * shared by ConfirmDialog and InfoDialog.
 */

import type { ComponentType } from 'react';

import { AnimatedInfoMark } from '@shared/ui/components/icons/AnimatedInfoMark';
import { AnimatedWarningMark } from '@shared/ui/components/icons/AnimatedWarningMark';
import { AnimatedXMark } from '@shared/ui/components/icons/AnimatedXMark';

interface AlertVariantStyle {
  Mark: ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  pin: string;
}

export const ALERT_VARIANT_STYLES: Record<'danger' | 'warning' | 'info', AlertVariantStyle> = {
  danger: {
    iconColor: 'text-danger-text',
    pin: 'bg-danger-bg dark:shadow-[0_0_6px_1px_hsl(var(--color-danger-bg)/0.7)]',
    Mark: AnimatedXMark,
  },
  warning: {
    iconColor: 'text-warning-text',
    pin: 'bg-warning-bg dark:shadow-[0_0_6px_1px_hsl(var(--color-warning-bg)/0.7)]',
    Mark: AnimatedWarningMark,
  },
  info: {
    iconColor: 'text-info-text',
    pin: 'bg-info-bg dark:shadow-[0_0_6px_1px_hsl(var(--color-info-bg)/0.7)]',
    Mark: AnimatedInfoMark,
  },
};
