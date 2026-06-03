/**
 * Password Changed Confirmation
 *
 * Success state shared by the forced-change login flow and the token reset page.
 */

import { AlertBanner } from '@shared/ui';

interface AuthPasswordChangedModalProps {
  /** Status shown below the banner, e.g. "Logging in…" or "Redirecting…". */
  status: string;
}

export function AuthPasswordChangedModal({ status }: AuthPasswordChangedModalProps) {
  return (
    <>
      <AlertBanner variant="success" spacing="md">
        Password changed
      </AlertBanner>

      <div className="auth-microheader">
        <span className="auth-microheader-bar" />
        <span className="phosphor-text">[ {status} ]</span>
        <span className="auth-microheader-rule" />
      </div>
    </>
  );
}
