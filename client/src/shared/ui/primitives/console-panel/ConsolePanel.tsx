/**
 * Console Panel
 *
 * Bordered chassis surface with rim sheen and a lit background. Optional
 * status- and identity-tinted lighting layers; omit both for a neutral panel.
 */

import type { CSSProperties, ReactNode } from 'react';

export interface ConsolePanelProps {
  /** CSS color for the status-tinted layers — diagonal sheen, bottom-right wash, outer bloom. */
  statusColor?: string;
  /** CSS color for the top-left identity wash. */
  identityColor?: string;
  className?: string;
  children: ReactNode;
}

const TOP_SHEEN = 'linear-gradient(180deg, hsl(var(--foreground)/0.045) 0%, transparent 12%)';

const RIM_SHEEN = [
  'inset 0 1px 0 hsl(var(--foreground)/0.07)',
  'inset 1px 0 0 hsl(var(--foreground)/0.035)',
  'inset -1px 0 0 rgba(0,0,0,0.22)',
  'inset 0 -1px 0 rgba(0,0,0,0.32)',
  '0 20px 44px -24px rgba(0,0,0,0.65)',
];

export function ConsolePanel({
  statusColor,
  identityColor,
  className = '',
  children,
}: ConsolePanelProps) {
  const isNeutral = !statusColor && !identityColor;

  const background = [
    TOP_SHEEN,
    isNeutral &&
      'radial-gradient(ellipse 100% 130% at 0% 0%, hsl(var(--primary)/0.05), transparent 68%)',
    isNeutral &&
      'radial-gradient(ellipse 75% 85% at 100% 100%, hsl(var(--primary)/0.065), transparent 66%)',
    isNeutral && 'radial-gradient(ellipse 70% 80% at 100% 100%, rgba(0,0,0,0.10), transparent 62%)',
    statusColor &&
      `linear-gradient(115deg, transparent 15%, color-mix(in srgb, ${statusColor} 3.5%, transparent) 50%, transparent 85%)`,
    identityColor &&
      `radial-gradient(ellipse 65% 75% at 10% 0%, color-mix(in srgb, ${identityColor} 9%, transparent), transparent 62%)`,
    statusColor &&
      `radial-gradient(ellipse 60% 70% at 100% 100%, color-mix(in srgb, ${statusColor} 4%, transparent), transparent 60%)`,
    'hsl(var(--card))',
  ];

  const boxShadow = [
    ...RIM_SHEEN,
    statusColor && `0 0 58px -26px color-mix(in srgb, ${statusColor} 50%, transparent)`,
  ];

  const style: CSSProperties = {
    background: background.filter(Boolean).join(', '),
    boxShadow: boxShadow.filter(Boolean).join(', '),
  };

  return (
    <div className={`border border-line-soft ${className}`} style={style}>
      {children}
    </div>
  );
}
