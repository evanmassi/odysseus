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
        <h3 className="text-xl font-semibold text-foreground">Security</h3>
      </div>

      {/* Authentication Settings Section */}
      <div>
        <h4 className="text-base font-semibold text-foreground mb-2">Authentication Settings</h4>
        <div className="space-y-1.5">
          {/* Enhanced Authentication Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-foreground">Enhanced Authentication</h5>
              <p className="text-xs text-secondary-foreground">
                Enable stronger password-based authentication
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.useEnhancedAuth}
                onChange={e => onChange('useEnhancedAuth', e.target.checked)}
                className="sr-only peer"
                aria-label="Enable enhanced authentication"
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-action/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-action"></div>
            </label>
          </div>

          {/* Strong Password Requirements Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-foreground">Strong Password Requirements</h5>
              <p className="text-xs text-secondary-foreground">
                Enforce complex password policies (uppercase, lowercase, numbers)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.requireStrongPasswords}
                onChange={e => onChange('requireStrongPasswords', e.target.checked)}
                className="sr-only peer"
                aria-label="Require strong password requirements"
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-action/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-action"></div>
            </label>
          </div>

          {/* Password Minimum Length & Special Characters - Combined Row */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-foreground">Minimum Password Length</h5>
                <p className="text-xs text-secondary-foreground">Enforce minimum length</p>
              </div>
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="4"
                  max="128"
                  value={config.passwordMinLength}
                  onChange={e => onChange('passwordMinLength', parseInt(e.target.value))}
                  className="input w-16 text-xs h-6 py-0 px-2"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">(4-128 characters)</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-foreground">Require Special Characters</h5>
                <p className="text-xs text-secondary-foreground">(!@#$%^&*)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.passwordRequireSpecialChars}
                  onChange={e => onChange('passwordRequireSpecialChars', e.target.checked)}
                  className="sr-only peer"
                  aria-label="Require special characters in passwords"
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-action/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-action"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Session Management Section */}
      <div>
        <h4 className="text-base font-semibold text-foreground mb-2">Session Management</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {/* Auto-Logout */}
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-foreground">Auto-Logout</h5>
              <p className="text-xs text-secondary-foreground">Logout after inactivity</p>
            </div>
            <div className="flex flex-col items-center">
              <input
                type="number"
                min="5"
                max="10080"
                value={config.sessionTimeoutMinutes}
                onChange={e => onChange('sessionTimeoutMinutes', parseInt(e.target.value))}
                className="input w-16 text-xs h-6 py-0 px-2"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(5-10080 min)</p>
            </div>
          </div>

          {/* Logout Warning */}
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-foreground">Logout Warning</h5>
              <p className="text-xs text-secondary-foreground">Warning before logout</p>
            </div>
            <div className="flex flex-col items-center">
              <input
                type="number"
                min="1"
                max="60"
                value={config.idleWarningMinutes}
                onChange={e => onChange('idleWarningMinutes', parseInt(e.target.value))}
                className="input w-16 text-xs h-6 py-0 px-2"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(1-60 min)</p>
            </div>
          </div>

          {/* Max Login Time */}
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-foreground">Max Login Time</h5>
              <p className="text-xs text-secondary-foreground">Force re-login after</p>
            </div>
            <div className="flex flex-col items-center">
              <input
                type="number"
                min="1"
                max="720"
                value={config.absoluteSessionTimeoutHours}
                onChange={e => onChange('absoluteSessionTimeoutHours', parseInt(e.target.value))}
                className="input w-16 text-xs h-6 py-0 px-2"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(1-720 hrs)</p>
            </div>
          </div>

          {/* Token Lifetime */}
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-foreground">Token Lifetime</h5>
              <p className="text-xs text-secondary-foreground">Security refresh interval</p>
            </div>
            <div className="flex flex-col items-center">
              <input
                type="number"
                min="5"
                max="60"
                value={config.accessTokenExpiryMinutes}
                onChange={e => onChange('accessTokenExpiryMinutes', parseInt(e.target.value))}
                className="input w-16 text-xs h-6 py-0 px-2"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">(5-60 min)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Limiting Section */}
      <div>
        <h4 className="text-base font-semibold text-foreground mb-2">Rate Limiting</h4>
        <div className="space-y-1.5">
          {/* Enable Rate Limiting Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-foreground">Enable Rate Limiting</h5>
              <p className="text-xs text-secondary-foreground">Prevent brute force attacks</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableRateLimiting}
                onChange={e => onChange('enableRateLimiting', e.target.checked)}
                className="sr-only peer"
                aria-label="Enable rate limiting to prevent brute force attacks"
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-action/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-action"></div>
            </label>
          </div>

          {/* Conditional Rate Limiting Configuration */}
          {config.enableRateLimiting && (
            <div className="grid grid-cols-2 gap-1.5">
              {/* Max Login Attempts Input */}
              <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                <div>
                  <h5 className="text-sm font-medium text-foreground">Max Attempts/Minute</h5>
                  <p className="text-xs text-secondary-foreground">Limit login attempts</p>
                </div>
                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={config.loginAttemptsPerMinute}
                    onChange={e => onChange('loginAttemptsPerMinute', parseInt(e.target.value))}
                    className="input w-16 text-xs h-6 py-0 px-2"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">(1-50 attempts)</p>
                </div>
              </div>

              {/* Lockout Duration Input */}
              <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                <div>
                  <h5 className="text-sm font-medium text-foreground">Lockout Duration</h5>
                  <p className="text-xs text-secondary-foreground">Set lockout period</p>
                </div>
                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={config.lockoutDurationMinutes}
                    onChange={e => onChange('lockoutDurationMinutes', parseInt(e.target.value))}
                    className="input w-16 text-xs h-6 py-0 px-2"
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
