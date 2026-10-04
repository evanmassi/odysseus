import { AlertBanner } from '@shared/ui';

interface AuthPasswordChangedModalProps {
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
        <span>{status}</span>
        <span className="auth-microheader-rule" />
      </div>
    </>
  );
}
