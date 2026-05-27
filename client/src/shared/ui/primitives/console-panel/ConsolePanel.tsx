/**
 * Console Panel
 *
 * Bordered chassis surface with rim sheen and a lit background. Optional
 * status- and identity-tinted lighting layers; omit both for a neutral panel.
 * `intensity` controls the strength of the neutral lighting and adds an
 * ambient primary bloom on focal surfaces like modals.
 */

import type { CSSProperties, ReactNode } from 'react';

export type ConsolePanelIntensity = 'soft' | 'lit';

export interface ConsolePanelProps {
  /** CSS color for the status-tinted layers — diagonal sheen, bottom-right wash, outer bloom. */
  statusColor?: string;
  /** CSS color for the top-left identity wash. */
  identityColor?: string;
  /** Lighting strength. 'soft' (default) for content panels; 'lit' for focal surfaces like modals. */
  intensity?: ConsolePanelIntensity;
  className?: string;
  children: ReactNode;
}

const TOP_SHEEN: Record<ConsolePanelIntensity, string> = {
  soft: 'linear-gradient(180deg, hsl(var(--foreground)/0.045) 0%, transparent 12%)',
  // Lit sheen is primary-tinted so the header reads body-tone (blue) instead of
  // a warm cream highlight against the dark card.
  lit: 'linear-gradient(180deg, hsl(var(--primary)/0.12) 0%, transparent 18%)',
};

const NEUTRAL_LIGHTING: Record<ConsolePanelIntensity, string[]> = {
  soft: [
    'radial-gradient(ellipse 100% 130% at 0% 0%, hsl(var(--primary)/0.05), transparent 68%)',
    'radial-gradient(ellipse 75% 85% at 100% 100%, hsl(var(--primary)/0.065), transparent 66%)',
    'radial-gradient(ellipse 70% 80% at 100% 100%, rgba(0,0,0,0.10), transparent 62%)',
  ],
  lit: [
    // Top-left primary — peak sits at the first section title, spread wide with a low peak alpha so the
    // glow reads as ambient warmth rather than a concentrated hot spot.
    'radial-gradient(ellipse 120% 60% at 22% 28%, hsl(var(--primary)/0.11), transparent 65%)',
    // Bottom primary — right-biased floor light; slightly expanded vs. the prior pass
    'radial-gradient(ellipse 115% 55% at 68% 92%, hsl(var(--primary)/0.11), transparent 65%)',
    // Soft corner shadow keeps the BR grounded without competing with the floor light
    'radial-gradient(ellipse 55% 50% at 100% 100%, rgba(0,0,0,0.14), transparent 55%)',
  ],
};

const RIM_SHEEN = [
  'inset 0 1px 0 hsl(var(--foreground)/0.07)',
  'inset 1px 0 0 hsl(var(--foreground)/0.035)',
  'inset -1px 0 0 rgba(0,0,0,0.22)',
  'inset 0 -1px 0 rgba(0,0,0,0.32)',
  '0 20px 44px -24px rgba(0,0,0,0.65)',
];

const OUTER_BLOOM = '0 0 60px -16px hsl(var(--primary)/0.18)';

export function ConsolePanel({
  statusColor,
  identityColor,
  intensity = 'soft',
  className = '',
  children,
}: ConsolePanelProps) {
  const isNeutral = !statusColor && !identityColor;

  const background = [
    TOP_SHEEN[intensity],
    ...(isNeutral ? NEUTRAL_LIGHTING[intensity] : []),
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
    intensity === 'lit' && isNeutral && OUTER_BLOOM,
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
