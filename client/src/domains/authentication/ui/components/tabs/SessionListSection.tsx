/**
 * Session List Section
 *
 * Displays active sessions with revocation controls
 * Shows current session + 4 most recent sessions
 */

import { useState, useMemo } from 'react';

import { formatDistanceToNow, format } from 'date-fns';
import { Monitor, TabletSmartphone, MonitorCheck, LogOut, RefreshCw } from 'lucide-react';
import { UAParser } from 'ua-parser-js';

import { useUserSessions } from '@domains/users';
import { Tooltip } from '@shared/ui';
import { notifications } from '@shared/utils';

export function SessionListSection() {
  const { sessions, isLoading, revokeSession, isRevoking, revokeAll, isRevokingAll } =
    useUserSessions();

  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const parseUserAgent = (userAgent: string | undefined) => {
    if (!userAgent) return { device: 'Unknown Device', type: 'desktop' };

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
  };

  const formatTimestamp = (date: Date) => {
    const relative = formatDistanceToNow(date, { addSuffix: true });
    const absolute = format(date, 'MMM d, yyyy, h:mm a');
    return { relative, absolute };
  };

  const displayedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime());

    const current = sorted.find(s => s.isCurrentSession);
    const others = sorted.filter(s => !s.isCurrentSession).slice(0, 4);

    return current ? [current, ...others] : others.slice(0, 5);
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
          <button
            onClick={() => setShowRevokeAllConfirm(true)}
            disabled={isRevokingAll}
            className="btn btn-danger flex items-center space-x-2 text-xs px-3 py-1.5 disabled:opacity-50"
          >
            {isRevokingAll ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <LogOut size={12} />
            )}
            <span>{isRevokingAll ? 'Revoking...' : 'Logout All Other Devices'}</span>
          </button>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-foreground">
                Device
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-foreground">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-foreground">
                Last Active
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {displayedSessions.map(session => {
              const { device, type } = parseUserAgent(session.userAgent);
              const DeviceIcon = session.isCurrentSession
                ? MonitorCheck
                : type === 'desktop'
                  ? Monitor
                  : TabletSmartphone;
              const timestamp = formatTimestamp(session.lastUsedAt);

              return (
                <tr
                  key={session.id}
                  className={
                    session.isCurrentSession
                      ? 'bg-emerald-50/50 border-l-4 border-l-emerald-500'
                      : ''
                  }
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <DeviceIcon size={16} className="text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{device}</p>
                        {session.isCurrentSession && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 mt-1">
                            Current Session
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-secondary-foreground">
                      {session.ipAddress ?? 'Unknown'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-foreground font-medium">{timestamp.relative}</p>
                      <p className="text-xs text-muted-foreground">{timestamp.absolute}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!session.isCurrentSession && (
                      <Tooltip content="Logout from this session" side="bottom">
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={isRevoking || revokingSessionId === session.id}
                          className="btn-danger-compact flex items-center space-x-1"
                        >
                          {revokingSessionId === session.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <LogOut size={12} />
                          )}
                          <span>Logout</span>
                        </button>
                      </Tooltip>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {displayedSessions.map(session => {
          const { device, type } = parseUserAgent(session.userAgent);
          const DeviceIcon = session.isCurrentSession
            ? MonitorCheck
            : type === 'desktop'
              ? Monitor
              : TabletSmartphone;
          const timestamp = formatTimestamp(session.lastUsedAt);

          return (
            <div
              key={session.id}
              className={`rounded-lg p-4 ${session.isCurrentSession ? 'bg-emerald-50/50 border border-border border-l-4 border-l-emerald-500' : 'border border-border bg-background'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <DeviceIcon size={20} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{device}</p>
                    {session.isCurrentSession && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 mt-1">
                        Current Session
                      </span>
                    )}
                  </div>
                </div>
                {!session.isCurrentSession && (
                  <Tooltip content="Logout from this session" side="bottom">
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={isRevoking || revokingSessionId === session.id}
                      className="btn-danger-compact flex-shrink-0 ml-2 flex items-center space-x-1"
                    >
                      {revokingSessionId === session.id ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <LogOut size={12} />
                      )}
                    </button>
                  </Tooltip>
                )}
              </div>
              <div className="space-y-1 text-xs text-secondary-foreground">
                <p>
                  <span className="font-medium">Location:</span> {session.ipAddress ?? 'Unknown'}
                </p>
                <div>
                  <span className="font-medium">Last Active:</span>
                  <p className="ml-0 mt-0.5">{timestamp.relative}</p>
                  <p className="text-[11px] text-muted-foreground ml-0">{timestamp.absolute}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      {showRevokeAllConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 animate-modal-backdrop-in">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full mx-4 animate-modal-blowup-in">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Logout All Other Devices?</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-secondary-foreground">
                This will end all other active sessions ({otherSessionsCount} device
                {otherSessionsCount !== 1 ? 's' : ''}). You will remain logged in on this device.
              </p>
            </div>
            <div className="px-6 py-4 bg-muted flex justify-end space-x-3">
              <button
                onClick={() => setShowRevokeAllConfirm(false)}
                disabled={isRevokingAll}
                className="btn btn-secondary text-sm px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeAll}
                disabled={isRevokingAll}
                className="btn btn-danger flex items-center space-x-2 text-sm px-4 py-2 disabled:opacity-50"
              >
                {isRevokingAll ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={14} />
                    <span>Logout All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
