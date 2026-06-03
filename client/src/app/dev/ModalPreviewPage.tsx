/**
 * Modal Preview (Dev Only)
 *
 * Renders auth and admin modals in isolation with mock data so their visuals can
 * be tuned without driving the real flows. Mounted only at /__dev/modals in dev builds.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { modalStore } from '@app/stores/modalStore';
import { adminUserService } from '@domains/admin/services/AdminUserService';
import { PasswordResetModal } from '@domains/admin/ui/components/settings-modal/PasswordResetModal';
import { useShellConfig } from '@domains/authentication/hooks/useShellConfig';
import { AuthGatewayPanel } from '@domains/authentication/ui/components/gateway/AuthGatewayPanel';
import { AuthRegistrationSuccessModal } from '@domains/authentication/ui/components/gateway/AuthRegistrationSuccessModal';
import { AuthSessionTimeoutModal } from '@domains/authentication/ui/components/gateway/AuthSessionTimeoutModal';

// Mirrors the chrome the registration flow declares for its success state, so the
// modal renders inside AuthGatewayPanel exactly as it does in production.
function RegistrationSuccessShell({ onClose }: { onClose: () => void }) {
  useShellConfig({
    contentKey: 'registration:success',
    variant: 'console',
    width: 'narrow',
    showBranding: true,
  });
  return <AuthRegistrationSuccessModal username="jdoe_x7k2" onClose={onClose} />;
}

function RegistrationSuccessPreview({ onClose }: { onClose: () => void }) {
  return (
    <AuthGatewayPanel>
      <RegistrationSuccessShell onClose={onClose} />
    </AuthGatewayPanel>
  );
}

// The timeout modal reads its state from the modal store; prime it on mount via the
// real action so the live countdown and tone transitions behave exactly as in prod.
function SessionTimeoutPreview({
  timeRemainingMs,
  onClose,
}: {
  timeRemainingMs: number;
  onClose: () => void;
}) {
  useEffect(() => {
    modalStore.getState().showSessionTimeoutWarning({
      timeRemainingMs,
      onStayLoggedIn: onClose,
      onLogout: onClose,
    });
    return () => modalStore.getState().hideSessionTimeoutWarning();
  }, [timeRemainingMs, onClose]);

  return <AuthSessionTimeoutModal />;
}

// Stub the two network calls so the generated-link and reset success states are
// reachable offline. Originals are restored on unmount.
function PasswordResetPreview({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const originalGenerate = adminUserService.generatePasswordResetToken;
    const originalReset = adminUserService.resetUserPassword;
    adminUserService.generatePasswordResetToken = async () => ({
      resetUrl: 'https://lab.example.com/reset-password?token=devpreviewtoken0123456789',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      message: 'Reset link generated',
    });
    adminUserService.resetUserPassword = async () => {};
    return () => {
      adminUserService.generatePasswordResetToken = originalGenerate;
      adminUserService.resetUserPassword = originalReset;
    };
  }, []);

  return (
    <PasswordResetModal
      isOpen
      userId="dev-user-1"
      username="Jane Doe"
      onClose={onClose}
      onSuccess={onClose}
    />
  );
}

interface ModalSpec {
  id: string;
  group: string;
  label: string;
  note?: string;
  render: (close: () => void) => ReactNode;
}

const SPECS: ModalSpec[] = [
  {
    id: 'registration-success',
    group: 'Auth gateway',
    label: 'Registration Success',
    note: 'Animated checkmark + username copy, inside the gateway chrome',
    render: close => <RegistrationSuccessPreview onClose={close} />,
  },
  {
    id: 'session-timeout',
    group: 'Auth gateway',
    label: 'Session Timeout — 5:00 (calm)',
    note: 'Amber phosphor digits + diamond track',
    render: close => <SessionTimeoutPreview timeRemainingMs={5 * 60 * 1000} onClose={close} />,
  },
  {
    id: 'session-timeout-warn',
    group: 'Auth gateway',
    label: 'Session Timeout — 0:45 (warn)',
    note: 'Crimson tint, bloom heartbeat',
    render: close => <SessionTimeoutPreview timeRemainingMs={45 * 1000} onClose={close} />,
  },
  {
    id: 'session-timeout-crit',
    group: 'Auth gateway',
    label: 'Session Timeout — 0:12 (critical)',
    note: 'Bright crimson, faster beat',
    render: close => <SessionTimeoutPreview timeRemainingMs={12 * 1000} onClose={close} />,
  },
  {
    id: 'password-reset',
    group: 'Admin',
    label: 'Password Reset',
    note: 'Direct-set tab + generated-link success state (network stubbed)',
    render: close => <PasswordResetPreview onClose={close} />,
  },
];

export function ModalPreviewPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const close = useCallback(() => setActiveId(null), []);
  const active = SPECS.find(spec => spec.id === activeId);
  const groups = Array.from(new Set(SPECS.map(spec => spec.group)));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-8 py-12">
        <header className="mb-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Dev · /__dev/modals
          </span>
          <h1 className="mt-1 text-xl font-semibold">Modal Preview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Render modals in isolation with mock data. Close a modal to pick another.
          </p>
        </header>

        {groups.map(group => (
          <section key={group} className="mb-8">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {group}
            </h2>
            <div className="space-y-2">
              {SPECS.filter(spec => spec.group === group).map(spec => (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => setActiveId(spec.id)}
                  className="flex w-full flex-col items-start rounded-md border border-line-soft bg-card px-4 py-3 text-left transition-colors hover:border-primary/60"
                >
                  <span className="text-sm font-medium">{spec.label}</span>
                  {spec.note && (
                    <span className="mt-0.5 text-xs text-muted-foreground">{spec.note}</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {active?.render(close)}
    </div>
  );
}
