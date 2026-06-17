/**
 * Password Requirement Checklist
 *
 * Real-time validation checklist showing which requirements are met as the user types.
 */

import { useMemo } from 'react';

import { PasswordValidator, type PasswordRequirement } from '@odysseus/shared-schemas';

import type { PasswordRequirements as PasswordConfig } from '@domains/authentication/services/AuthService';

export type PasswordRequirementsVariant = 'card' | 'console';

export interface PasswordRequirementsProps {
  password: string;
  config: PasswordConfig;
  showError?: boolean;
  variant?: PasswordRequirementsVariant;
  className?: string;
}

export function PasswordRequirements({
  password,
  config,
  showError = false,
  variant = 'card',
  className = '',
}: PasswordRequirementsProps) {
  const requirements = useMemo(
    () => PasswordValidator.getRequirements(password, config),
    [password, config]
  );

  const idleColor =
    variant === 'console' ? 'text-[rgb(var(--auth-text-mute))]' : 'text-secondary-foreground';

  const getRequirementColor = (isMet: boolean) => {
    if (isMet) return variant === 'console' ? 'text-success-text' : 'text-success-text font-medium';
    if (showError) return 'text-danger-text';
    return idleColor;
  };

  const listFont = variant === 'console' ? 'font-mono' : '';

  return (
    <ul className={`space-y-0.5 mt-1.5 ${listFont} ${className}`}>
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
