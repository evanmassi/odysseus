import type { ReactNode } from 'react';

import { BeanOff, CircleCheckBig, OctagonX, Sprout } from 'lucide-react';

import { useResolvedTheme } from '@shared/hooks';
import { ConsolePanel } from '@shared/ui';
import { LabBadge, getLabBadgeTextClasses } from '@shared/ui/components/badges/LabBadge';

const LABEL_SEPARATOR =
  'h-[3px] w-[3px] bg-foreground/55 dark:shadow-[0_0_5px_1px_hsl(var(--foreground)/0.25)]';

interface LabIdentityPanelProps {
  labId: string;
  labName: string;
  isActive: boolean;
  isDemo: boolean;
  isSeeded?: boolean;
  children: ReactNode;
}

export function LabIdentityPanel({
  labId,
  labName,
  isActive,
  isDemo,
  isSeeded,
  children,
}: LabIdentityPanelProps) {
  const isDark = useResolvedTheme() === 'dark';
  const statusVar = isActive ? '--color-success-bg' : '--color-danger-bg';
  const statusTextClass = isActive ? 'text-success-text' : 'text-danger-text';
  const identityTextClass = getLabBadgeTextClasses(labId, isDemo);

  return (
    <div className="relative pt-7">
      <div
        aria-hidden
        className="absolute inset-x-0 top-3 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, hsl(var(${statusVar})/0.6) 9%, hsl(var(${statusVar})/0.6) 91%, transparent 100%)`,
          boxShadow: isDark ? `0 0 8px hsl(var(${statusVar})/0.4)` : undefined,
        }}
      />
      <div className="absolute top-1.5 left-1/2 z-10 -translate-x-1/2 bg-page px-3">
        <span className="flex items-center gap-2.5 type-label text-label-xs tracking-label-wide whitespace-nowrap">
          <span className="text-foreground">{labName}</span>
          <span aria-hidden className={LABEL_SEPARATOR} />
          <span className={`flex items-center gap-1.5 ${statusTextClass}`}>
            {isActive ? <CircleCheckBig size={11} /> : <OctagonX size={11} />}
            {isActive ? 'active' : 'deactivated'}
          </span>
          {isDemo && isSeeded !== undefined && (
            <>
              <span aria-hidden className={LABEL_SEPARATOR} />
              <span
                className={`flex items-center gap-1.5 ${isSeeded ? 'text-success-text' : 'text-warning-text'}`}
              >
                {isSeeded ? <Sprout size={11} /> : <BeanOff size={11} />}
                {isSeeded ? 'seeded' : 'not seeded'}
              </span>
            </>
          )}
        </span>
      </div>

      <ConsolePanel
        className={`flex items-stretch ${identityTextClass}`}
        identityColor="currentColor"
      >
        <div
          className={`flex w-14 shrink-0 flex-col items-center border-r border-line-soft pt-5 ${identityTextClass}`}
        >
          <LabBadge labId={labId} labName={labName} size="md" isDemo={isDemo} isActive={isActive} />
          <span
            aria-hidden
            className="mb-4 w-px flex-1"
            style={{
              background:
                'linear-gradient(180deg, currentColor 0%, currentColor 24%, color-mix(in srgb, currentColor 45%, transparent) 60%, transparent 100%)',
              filter: isDark
                ? 'drop-shadow(0 0 3px currentColor) drop-shadow(0 0 10px color-mix(in srgb, currentColor 55%, transparent))'
                : undefined,
            }}
          />
        </div>

        {children}
      </ConsolePanel>
    </div>
  );
}
