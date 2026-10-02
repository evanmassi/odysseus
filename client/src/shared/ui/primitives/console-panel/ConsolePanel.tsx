import type { CSSProperties, ReactNode } from 'react';

type ConsolePanelIntensity = 'soft' | 'medium' | 'lit';

interface ConsolePanelProps {
  statusColor?: string;
  identityColor?: string;
  intensity?: ConsolePanelIntensity;
  className?: string;
  children: ReactNode;
}

const TOP_SHEEN: Record<ConsolePanelIntensity, string> = {
  soft: 'linear-gradient(180deg, hsl(var(--foreground) / calc(0.045 * var(--lit))) 0%, transparent 12%)',
  medium:
    'linear-gradient(180deg, hsl(var(--primary) / calc(0.032 * var(--lit))) 0%, transparent 17%)',
  lit: 'linear-gradient(180deg, hsl(var(--primary) / calc(0.042 * var(--lit))) 0%, transparent 18%)',
};

const NEUTRAL_LIGHTING: Record<ConsolePanelIntensity, string[]> = {
  soft: [
    'radial-gradient(ellipse 100% 130% at 0% 0%, hsl(var(--primary) / calc(0.05 * var(--lit))), transparent 68%)',
    'radial-gradient(ellipse 75% 85% at 100% 100%, hsl(var(--primary) / calc(0.065 * var(--lit))), transparent 66%)',
    'radial-gradient(ellipse 70% 80% at 100% 100%, hsl(var(--shade) / calc(0.1 * var(--lit))), transparent 62%)',
  ],
  medium: [
    'radial-gradient(ellipse 115% 58% at 22% 26%, hsl(var(--primary) / calc(0.025 * var(--lit))), transparent 62%)',
    'radial-gradient(ellipse 110% 54% at 68% 93%, hsl(var(--primary) / calc(0.025 * var(--lit))), transparent 62%)',
    'radial-gradient(ellipse 55% 50% at 100% 100%, hsl(var(--shade) / calc(0.045 * var(--lit))), transparent 55%)',
  ],
  lit: [
    'radial-gradient(ellipse 120% 60% at 22% 28%, hsl(var(--primary) / calc(0.039 * var(--lit))), transparent 65%)',
    'radial-gradient(ellipse 115% 55% at 68% 92%, hsl(var(--primary) / calc(0.039 * var(--lit))), transparent 65%)',
    'radial-gradient(ellipse 55% 50% at 100% 100%, hsl(var(--shade) / calc(0.049 * var(--lit))), transparent 55%)',
  ],
};

const RIM_SHEEN = [
  'inset 0 1px 0 hsl(var(--foreground) / calc(0.07 * var(--lit)))',
  'inset 1px 0 0 hsl(var(--foreground) / calc(0.035 * var(--lit)))',
  'inset -1px 0 0 hsl(var(--shade) / calc(0.22 * var(--lit)))',
  'inset 0 -1px 0 hsl(var(--shade) / calc(0.32 * var(--lit)))',
];

const ELEVATION = '0 20px 44px -24px hsl(var(--recess) / 0.65)';

const OUTER_BLOOM = '0 0 60px -16px hsl(var(--primary) / calc(0.063 * var(--lit)))';

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
    ELEVATION,
    statusColor && `0 0 58px -26px color-mix(in srgb, ${statusColor} 50%, transparent)`,
    intensity !== 'soft' && isNeutral && OUTER_BLOOM,
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
