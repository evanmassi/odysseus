/**
 * PasswordRequirements Component
 *
 * Real-time password validation checklist that shows users which
 * password requirements are met as they type.
 */

import React, { useMemo } from 'react';

import { PasswordValidator, type PasswordRequirement } from '@odysseus/shared-schemas';

import type { PasswordRequirements as PasswordConfig } from '../../../services/AuthService';

export interface PasswordRequirementsProps {
  password: string;
  config: PasswordConfig;
  showError?: boolean; // Show red error state when true
  className?: string;
}

/**
 * PasswordRequirements Component
 *
 * Displays real-time password validation as a simple bullet list.
 * Shows green when met, gray when unmet, red when error state active.
 */
export function PasswordRequirements({
  password,
  config,
  showError = false,
  className = '',
}: PasswordRequirementsProps) {
  const requirements = useMemo(
    () => PasswordValidator.getRequirements(password, config),
    [password, config]
  );

  const getRequirementColor = (isMet: boolean) => {
    if (isMet) return 'text-success-text font-medium';
    if (showError) return 'text-danger-text';
    return 'text-secondary-foreground';
  };

  return (
    <ul className={`space-y-0.5 mt-1.5 ${className}`}>
      {requirements.map((requirement: PasswordRequirement) => (
        <li
          key={requirement.id}
          className={`text-[10px] flex items-start ${getRequirementColor(requirement.isMet)}`}
        >
          <span className="mr-1">{requirement.isMet ? '✓' : showError ? '✗' : '•'}</span>
          <span>{requirement.label}</span>
        </li>
      ))}
    </ul>
  );
}
