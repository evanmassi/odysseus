/**
 * Password Requirement Checklist
 *
 * Real-time validation checklist showing which requirements are met as the user types.
 */

import { useMemo } from 'react';

import { PasswordValidator, type PasswordRequirement } from '@odysseus/shared-schemas';

import type { PasswordRequirements as PasswordConfig } from '@domains/authentication/services/AuthService';

export interface PasswordRequirementsProps {
  password: string;
  config: PasswordConfig;
  showError?: boolean;
  className?: string;
}

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
