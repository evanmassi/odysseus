/**
 * Active Session List
 *
 * Displays active sessions with revocation controls.
 */

import { useState, useMemo } from 'react';

import { formatDistanceToNow, format } from 'date-fns';
import { Monitor, TabletSmartphone, MonitorCheck, LogOut, RefreshCw } from 'lucide-react';
import { UAParser } from 'ua-parser-js';

import { useUserSessions } from '@domains/users';
import { Button, Table, Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import type { ActiveSession } from '@odysseus/shared-schemas';
import type { TableColumn } from '@shared/ui';
import type { LucideIcon } from 'lucide-react';

function parseUserAgent(userAgent: string | undefined) {
  if (!userAgent) return { device: 'Unknown Device', type: 'desktop' as const };

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const browser = result.browser.name ?? 'Unknown Browser';
  const browserVersion = result.browser.version?.split('.')[0] ?? '';
  const os = result.os.name ?? 'Unknown OS';
  const osVersion = result.os.version ?? '';
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty device type is invalid, default to 'desktop'
  const deviceType = result.device.type || 'desktop';

  const deviceName = `${browser}${browserVersion ? ' ' + browserVersion : ''} on ${os}${osVersion ? ' ' + osVersion : ''}`;

  return {
    device: deviceName,
    type: deviceType as 'desktop' | 'mobile' | 'tablet',
  };
}

function formatTimestamp(date: Date) {
  const relative = formatDistanceToNow(date, { addSuffix: true });
  const absolute = format(date, 'MMM d, yyyy, h:mm a');
  return { relative, absolute };
}

function getDeviceIcon(isCurrentSession: boolean, deviceType: string) {
  if (isCurrentSession) return MonitorCheck;
  return deviceType === 'desktop' ? Monitor : TabletSmartphone;
}

function CurrentSessionBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-light text-success-text mt-1">
      Current Session
    </span>
  );
}

type DisplaySession = ActiveSession & {
  device: string;
  DeviceIcon: LucideIcon;
  timestamp: { relative: string; absolute: string };
};

export function SessionListPanel() {
  const { sessions, isLoading, revokeSession, isRevoking, revokeAll, isRevokingAll } =
    useUserSessions();

  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const displayedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime());

    const current = sorted.find(s => s.isCurrentSession);
    const others = sorted.filter(s => !s.isCurrentSession).slice(0, 4);
    const selected = current ? [current, ...others] : others.slice(0, 5);

    return selected.map(session => {
      const parsed = parseUserAgent(session.userAgent);
      return {
        ...session,
        device: parsed.device,
        DeviceIcon: getDeviceIcon(session.isCurrentSession, parsed.type),
        timestamp: formatTimestamp(session.lastUsedAt),
      };
    });
  }, [sessions]);

  const otherSessionsCount = sessions.filter(s => !s.isCurrentSession).length;

  const handleRevokeSession = (sessionId: string) => {
    setRevokingSessionId(sessionId);
    revokeSession(sessionId, {
      onSuccess: () => {
        notifications.success('Logged out successfully');
        setRevokingSessionId(null);
      },
      onError: (error: Error) => {
        notifications.error(error.message || 'Failed to logout');
        setRevokingSessionId(null);
      },
    });
  };

  const handleRevokeAll = () => {
    revokeAll(undefined, {
      onSuccess: (revokedCount: number) => {
        notifications.success(
          `Logged out from ${revokedCount} device${revokedCount !== 1 ? 's' : ''} successfully`
        );
        setShowRevokeAllConfirm(false);
      },
      onError: (error: Error) => {
        notifications.error(error.message || 'Failed to logout from other devices');
        setShowRevokeAllConfirm(false);
      },
    });
  };

  const sessionColumns: TableColumn<DisplaySession>[] = [
    {
      id: 'device',
      header: 'Device',
      render: (_val, row) => (
        <div className="flex items-center space-x-3">
          <row.DeviceIcon
            size={16}
            className={`flex-shrink-0 ${row.isCurrentSession ? 'text-success-text' : 'text-muted-foreground'}`}
          />
          <div>
            <p
              className={`text-sm font-medium ${row.isCurrentSession ? 'text-success-text' : 'text-card-foreground'}`}
            >
              {row.device}
            </p>
            {row.isCurrentSession && <CurrentSessionBadge />}
          </div>
        </div>
      ),
    },
    {
      id: 'ipAddress',
      header: 'Location',
      render: (_val, row) => (
        <p
          className={`text-sm ${row.isCurrentSession ? 'text-success-text' : 'text-secondary-foreground'}`}
        >
          {row.ipAddress ?? 'Unknown'}
        </p>
      ),
    },
    {
      id: 'lastUsedAt',
      header: 'Last Active',
      render: (_val, row) => (
        <div>
          <p
            className={`text-sm font-medium ${row.isCurrentSession ? 'text-success-text' : 'text-card-foreground'}`}
          >
            {row.timestamp.relative}
          </p>
          <p
            className={`text-xs ${row.isCurrentSession ? 'text-success-text/70' : 'text-muted-foreground'}`}
          >
            {row.timestamp.absolute}
          </p>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      render: (_val, row) =>
        !row.isCurrentSession ? (
          <Tooltip content="Logout from this session" side="bottom">
            <Button
              variant="danger"
              size="xs"
              onClick={() => handleRevokeSession(row.id)}
              disabled={isRevoking}
              isLoading={revokingSessionId === row.id}
              leftIcon={<LogOut size={12} />}
            >
              Logout
            </Button>
          </Tooltip>
        ) : null,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="animate-spin text-muted-foreground" size={24} />
        <span className="ml-2 text-sm text-secondary-foreground">Loading sessions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-foreground">
          Showing {displayedSessions.length} of {sessions.length} active session
          {sessions.length !== 1 ? 's' : ''}
        </p>
        {otherSessionsCount > 0 && (
          <Button
            variant="danger"
            size="xs"
            onClick={() => setShowRevokeAllConfirm(true)}
            isLoading={isRevokingAll}
            loadingText="Revoking..."
            leftIcon={<LogOut size={12} />}
          >
            Logout All Other Devices
          </Button>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table<DisplaySession>
          columns={sessionColumns}
          data={displayedSessions}
          hoverable
          emptyMessage="No active sessions"
          aria-label="Active sessions"
          rowClassName={row =>
            row.isCurrentSession
              ? 'text-success-text [&>td]:bg-success-light [&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--color-success-bg))]'
              : ''
          }
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {displayedSessions.map(session => (
          <div
            key={session.id}
            className={`rounded-lg p-4 ${session.isCurrentSession ? 'bg-success-light border border-border border-l-4 border-l-success-bg text-success-text' : 'border border-border bg-card'}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <session.DeviceIcon
                  size={20}
                  className={`flex-shrink-0 ${session.isCurrentSession ? 'text-success-text' : 'text-muted-foreground'}`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${session.isCurrentSession ? 'text-success-text' : 'text-card-foreground'}`}
                  >
                    {session.device}
                  </p>
                  {session.isCurrentSession && <CurrentSessionBadge />}
                </div>
              </div>
              {!session.isCurrentSession && (
                <Tooltip content="Logout from this session" side="bottom">
                  <Button
                    variant="danger"
                    size="xs"
                    iconOnly
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={isRevoking}
                    isLoading={revokingSessionId === session.id}
                    aria-label="Logout from this session"
                    className="flex-shrink-0 ml-2"
                  >
                    <LogOut size={12} />
                  </Button>
                </Tooltip>
              )}
            </div>
            <div
              className={`space-y-1 text-xs ${session.isCurrentSession ? 'text-success-text' : 'text-secondary-foreground'}`}
            >
              <p>
                <span className="font-medium">Location:</span> {session.ipAddress ?? 'Unknown'}
              </p>
              <div>
                <span className="font-medium">Last Active:</span>
                <p className="ml-0 mt-0.5">{session.timestamp.relative}</p>
                <p
                  className={`text-[11px] ml-0 ${session.isCurrentSession ? 'text-success-text/70' : 'text-muted-foreground'}`}
                >
                  {session.timestamp.absolute}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={showRevokeAllConfirm}
        variant="danger"
        title="Logout All Other Devices?"
        message={
          <>
            This will end all other active sessions ({otherSessionsCount} device
            {otherSessionsCount !== 1 ? 's' : ''}). You will remain logged in on this device.
          </>
        }
        confirmText="Logout All"
        isLoading={isRevokingAll}
        onConfirm={handleRevokeAll}
        onCancel={() => setShowRevokeAllConfirm(false)}
      />
    </div>
  );
}
