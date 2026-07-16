/**
 * Auth Link Button
 *
 * Inline text button in the auth ambient accent — the sign-in / register /
 * forgot-password links across the auth screens.
 */

import type { ReactNode } from 'react';

const BASE = 'text-[rgb(var(--auth-ambient))] hover:opacity-80 transition-opacity rounded px-1';

interface AuthLinkButtonProps {
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function AuthLinkButton({ onClick, children, className, disabled }: AuthLinkButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className ? `${className} ${BASE}` : BASE}
    >
      {children}
    </button>
  );
}
