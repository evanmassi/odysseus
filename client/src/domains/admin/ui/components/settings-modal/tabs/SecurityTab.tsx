/**
 * Security Settings Tab
 *
 * Admin controls for authentication, session management, and login protection policies.
 */

import { Shield } from 'lucide-react';

import { AlertBanner, NumberInput, Toggle } from '@shared/ui';

import type { SecurityConfig } from '@odysseus/shared-schemas';

export interface SecurityTabProps {
  config: SecurityConfig;
  onChange: (field: keyof SecurityConfig, value: boolean | number | string) => void;
  readOnly?: boolean;
  hideHeader?: boolean;
}

export function SecurityTab({
  config,
  onChange,
  readOnly = false,
  hideHeader = false,
}: SecurityTabProps) {
  return (
    <div className="space-y-2">
      {!hideHeader && (
        <div className="flex items-center space-x-2 pb-3 border-b border-border mb-4">
          <Shield size={22} className="text-secondary-foreground" />
          <h3 className="text-xl font-semibold text-card-foreground">Security</h3>
        </div>
      )}

      {readOnly && (
        <AlertBanner variant="info" spacing="none">
          Only system admins can modify security settings.
        </AlertBanner>
      )}

      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">Authentication</h4>
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-card-foreground">
                  Enhanced Authentication
                </h5>
                <p className="text-xs text-secondary-foreground">Stronger password auth</p>
              </div>
              <Toggle
                checked={config.useEnhancedAuth}
                onChange={checked => onChange('useEnhancedAuth', checked)}
                disabled={readOnly}
                aria-label="Enable enhanced authentication"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-card-foreground">Strong Passwords</h5>
                <p className="text-xs text-secondary-foreground">Uppercase, lowercase, numbers</p>
              </div>
              <Toggle
                checked={config.requireStrongPasswords}
                onChange={checked => onChange('requireStrongPasswords', checked)}
                disabled={readOnly}
                aria-label="Require strong password requirements"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-card-foreground">
                  Minimum Password Length
                </h5>
                <p className="text-xs text-secondary-foreground">Enforce minimum length</p>
              </div>
              <div className="flex flex-col items-center">
                <NumberInput
                  value={config.passwordMinLength}
                  onChange={value => onChange('passwordMinLength', value)}
                  min={4}
                  max={128}
                  size="sm"
                  disabled={readOnly}
                  aria-label="Minimum password length"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">(4-128 characters)</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-card-foreground">
                  Require Special Characters
                </h5>
                <p className="text-xs text-secondary-foreground">(!@#$%^&*)</p>
              </div>
              <Toggle
                checked={config.passwordRequireSpecialChars}
                onChange={checked => onChange('passwordRequireSpecialChars', checked)}
                disabled={readOnly}
                aria-label="Require special characters in passwords"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">Session Management</h4>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-card-foreground">Auto-Logout</h5>
              <p className="text-xs text-secondary-foreground">Logout after inactivity</p>
            </div>
            <div className="flex flex-col items-center">
              <NumberInput
                value={config.sessionTimeoutMinutes}
                onChange={value => onChange('sessionTimeoutMinutes', value)}
                min={5}
                max={10080}
                size="sm"
                disabled={readOnly}
                aria-label="Session timeout in minutes"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(5-10080 min)</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-card-foreground">Logout Warning</h5>
              <p className="text-xs text-secondary-foreground">Warning before logout</p>
            </div>
            <div className="flex flex-col items-center">
              <NumberInput
                value={config.idleWarningMinutes}
                onChange={value => onChange('idleWarningMinutes', value)}
                min={1}
                max={60}
                size="sm"
                disabled={readOnly}
                aria-label="Idle warning in minutes"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(1-60 min)</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-card-foreground">Max Login Time</h5>
              <p className="text-xs text-secondary-foreground">Force re-login after</p>
            </div>
            <div className="flex flex-col items-center">
              <NumberInput
                value={config.absoluteSessionTimeoutHours}
                onChange={value => onChange('absoluteSessionTimeoutHours', value)}
                min={1}
                max={720}
                size="sm"
                disabled={readOnly}
                aria-label="Absolute session timeout in hours"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(1-720 hrs)</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-card-foreground">Token Lifetime</h5>
              <p className="text-xs text-secondary-foreground">Security refresh interval</p>
            </div>
            <div className="flex flex-col items-center">
              <NumberInput
                value={config.accessTokenExpiryMinutes}
                onChange={value => onChange('accessTokenExpiryMinutes', value)}
                min={5}
                max={60}
                size="sm"
                disabled={readOnly}
                aria-label="Access token expiry in minutes"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(5-60 min)</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">Login Protection</h4>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-card-foreground">Enable Login Protection</h5>
              <p className="text-xs text-secondary-foreground">Prevent brute force attacks</p>
            </div>
            <Toggle
              checked={config.enableRateLimiting}
              onChange={checked => onChange('enableRateLimiting', checked)}
              disabled={readOnly}
              aria-label="Enable login protection to prevent brute force attacks"
            />
          </div>

          {config.enableRateLimiting && (
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                <div>
                  <h5 className="text-sm font-medium text-card-foreground">Max Attempts/Minute</h5>
                  <p className="text-xs text-secondary-foreground">Limit login attempts</p>
                </div>
                <div className="flex flex-col items-center">
                  <NumberInput
                    value={config.loginAttemptsPerMinute}
                    onChange={value => onChange('loginAttemptsPerMinute', value)}
                    min={1}
                    max={50}
                    size="sm"
                    disabled={readOnly}
                    aria-label="Login attempts per minute"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">(1-50 attempts)</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                <div>
                  <h5 className="text-sm font-medium text-card-foreground">Lockout Duration</h5>
                  <p className="text-xs text-secondary-foreground">Set lockout period</p>
                </div>
                <div className="flex flex-col items-center">
                  <NumberInput
                    value={config.lockoutDurationMinutes}
                    onChange={value => onChange('lockoutDurationMinutes', value)}
                    min={1}
                    max={1440}
                    size="sm"
                    disabled={readOnly}
                    aria-label="Lockout duration in minutes"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">(1-1440 minutes)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
