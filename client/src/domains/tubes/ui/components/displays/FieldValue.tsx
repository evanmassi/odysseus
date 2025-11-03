/**
 * Simple field value display component
 * Read-only presentation of a single field with label and value
 */

import React from 'react';

interface FieldValueProps {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}

export const FieldValue: React.FC<FieldValueProps> = ({ label, value, className = '' }) => {
  // Don't render if no value
  if (!value && value !== 0) return null;

  return (
    <div className={className}>
      <div className="font-medium text-odysseus-muted uppercase tracking-wider text-[10.5px]">
        {label}
      </div>
      <div className="font-bold text-odysseus-dark text-xs pl-1">
        {value}
      </div>
    </div>
  );
};
