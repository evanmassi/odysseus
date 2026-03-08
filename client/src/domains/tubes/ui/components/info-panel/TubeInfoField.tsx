/**
 * Tube Info Field
 *
 * Read-only label–value display with inline or stacked layout and mixed-state indicator.
 */

import type { FC } from 'react';

import { AlertTriangle } from 'lucide-react';

interface TubeInfoFieldProps {
  label: string;
  value: string | number | null | undefined;
  className?: string;
  inline?: boolean;
  isMixed?: boolean;
}

export const TubeInfoField: FC<TubeInfoFieldProps> = ({
  label,
  value,
  className = '',
  inline = true,
  isMixed = false,
}) => {
  if (!value && value !== 0 && !isMixed) return null;

  if (inline) {
    return (
      <div className={className}>
        <span className="text-card-foreground/50 text-xs">{label}:</span>{' '}
        {isMixed ? (
          <>
            <AlertTriangle className="inline w-3 h-3 text-warning-text mr-0.5" />
            <span className="text-card-foreground/30 text-sm">—</span>
          </>
        ) : (
          <span className="text-card-foreground font-medium text-sm break-all">{value}</span>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1 text-card-foreground/50 text-xs">
        {label}
        {isMixed && <AlertTriangle className="w-3 h-3 text-warning-text" />}
      </div>
      <div className="text-card-foreground font-medium text-sm break-all">
        {isMixed ? <span className="text-card-foreground/30 font-normal">—</span> : value}
      </div>
    </div>
  );
};
