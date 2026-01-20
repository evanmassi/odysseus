/**
 * Simple field value display component
 * Read-only presentation of a single field with label and value
 * Supports inline (Label: Value) or stacked layout
 * Supports mixed state for multi-select scenarios
 */

import React from 'react';

import { AlertTriangle } from 'lucide-react';

interface FieldValueProps {
  label: string;
  value: string | number | null | undefined;
  className?: string;
  /** Use inline "Label: Value" format (default: true) */
  inline?: boolean;
  /** Show "Mixed" indicator for conflicting values in multi-select */
  isMixed?: boolean;
}

export const FieldValue: React.FC<FieldValueProps> = ({
  label,
  value,
  className = '',
  inline = true,
  isMixed = false,
}) => {
  // Don't render if no value and not mixed
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
          <span className="text-card-foreground font-medium text-sm">{value}</span>
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
      <div className="text-card-foreground font-medium text-sm">
        {isMixed ? <span className="text-card-foreground/30 font-normal">—</span> : value}
      </div>
    </div>
  );
};
