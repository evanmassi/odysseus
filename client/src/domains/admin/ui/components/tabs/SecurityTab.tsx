/**
 * Security Settings Tab Component
 *
 * Provides admin interface for configuring security policies including:
 * - Authentication settings (enhanced auth, password requirements)
 * - Session management (timeouts, concurrent sessions)
 * - Rate limiting (brute force protection)
 *
 * Part of the Admin Settings modal tab system.
 *
 * @module admin/ui/components/tabs
 */

import { Shield } from 'lucide-react';

import { NumberInput, Toggle } from '@shared/ui';

import type { SecurityConfig } from '@odysseus/shared-schemas';

/**
 * SecurityTab Props Interface
 *
 * @interface SecurityTabProps
 */
export interface SecurityTabProps {
  /** Current security configuration */
  config: SecurityConfig;

  /** Callback invoked when any security setting is changed */
  onChange: (field: keyof SecurityConfig, value: boolean | number | string) => void;
}

/**
 * Security Tab Component
 *
 * Renders form controls for all security-related settings. Changes are
 * propagated up via onChange callback for parent component to manage state.
 *
 * @param {SecurityTabProps} props - Component props
 * @returns {JSX.Element} Security settings form
 *
 * @example
 * ```tsx
 * <SecurityTab
 *   config={currentConfig}
 *   onChange={(field, value) => setConfig({...config, [field]: value})}
 * />
 * ```
 */
export function SecurityTab({ config, onChange }: SecurityTabProps) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-3 border-b border-border mb-4">
        <Shield size={22} className="text-secondary-foreground" />
        <h3 className="text-xl font-semibold text-card-foreground">Security</h3>
      </div>

      {/* Authentication Settings Section */}
      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">
          Authentication Settings
        </h4>
        <div className="space-y-1.5">
          {/* Enhanced Authentication Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-card-foreground">Enhanced Authentication</h5>
              <p className="text-xs text-secondary-foreground">
                Enable stronger password-based authentication
              </p>
            </div>
            <Toggle
              checked={config.useEnhancedAuth}
              onChange={checked => onChange('useEnhancedAuth', checked)}
              aria-label="Enable enhanced authentication"
            />
          </div>

          {/* Strong Password Requirements Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-card-foreground">
                Strong Password Requirements
              </h5>
              <p className="text-xs text-secondary-foreground">
                Enforce complex password policies (uppercase, lowercase, numbers)
              </p>
            </div>
            <Toggle
              checked={config.requireStrongPasswords}
              onChange={checked => onChange('requireStrongPasswords', checked)}
              aria-label="Require strong password requirements"
            />
          </div>

          {/* Password Minimum Length & Special Characters - Combined Row */}
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
                aria-label="Require special characters in passwords"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Session Management Section */}
      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">Session Management</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {/* Auto-Logout */}
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
                aria-label="Session timeout in minutes"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(5-10080 min)</p>
            </div>
          </div>

          {/* Logout Warning */}
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
                aria-label="Idle warning in minutes"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(1-60 min)</p>
            </div>
          </div>

          {/* Max Login Time */}
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
                aria-label="Absolute session timeout in hours"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(1-720 hrs)</p>
            </div>
          </div>

          {/* Token Lifetime */}
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
                aria-label="Access token expiry in minutes"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(5-60 min)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Limiting Section */}
      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">Rate Limiting</h4>
        <div className="space-y-1.5">
          {/* Enable Rate Limiting Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-card-foreground">Enable Rate Limiting</h5>
              <p className="text-xs text-secondary-foreground">Prevent brute force attacks</p>
            </div>
            <Toggle
              checked={config.enableRateLimiting}
              onChange={checked => onChange('enableRateLimiting', checked)}
              aria-label="Enable rate limiting to prevent brute force attacks"
            />
          </div>

          {/* Conditional Rate Limiting Configuration */}
          {config.enableRateLimiting && (
            <div className="grid grid-cols-2 gap-1.5">
              {/* Max Login Attempts Input */}
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
                    aria-label="Login attempts per minute"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">(1-50 attempts)</p>
                </div>
              </div>

              {/* Lockout Duration Input */}
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
