/**
 * Simple field value display component
 * Read-only presentation of a single field with label and value
 * Supports inline (Label: Value) or stacked layout
 */

import React from 'react';

interface FieldValueProps {
  label: string;
  value: string | number | null | undefined;
  className?: string;
  /** Use inline "Label: Value" format (default: true) */
  inline?: boolean;
}

export const FieldValue: React.FC<FieldValueProps> = ({
  label,
  value,
  className = '',
  inline = true,
}) => {
  // Don't render if no value
  if (!value && value !== 0) return null;

  if (inline) {
    return (
      <div className={`text-xs ${className}`}>
        <span className="text-odysseus-dark/50">{label}:</span>{' '}
        <span className="text-odysseus-dark font-bold">{value}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="text-odysseus-dark/50 text-[10px]">{label}</div>
      <div className="text-odysseus-dark font-bold text-xs">{value}</div>
    </div>
  );
};
