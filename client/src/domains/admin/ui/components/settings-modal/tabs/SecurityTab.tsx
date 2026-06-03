/**
 * Security Settings Tab
 *
 * Authentication, session, and login-protection policies for admins.
 */

import { AlertBanner, NumberInput, SettingsRow, Subsection, Toggle } from '@shared/ui';

import type { SecurityConfig } from '@odysseus/shared-schemas';

export interface SecurityTabProps {
  config: SecurityConfig;
  onChange: (field: keyof SecurityConfig, value: boolean | number | string) => void;
  readOnly?: boolean;
}

export function SecurityTab({ config, onChange, readOnly = false }: SecurityTabProps) {
  // Dependent rows stay rendered when rate limiting is off so the form doesn't pop.
  const rateLimitDisabled = readOnly || !config.enableRateLimiting;

  return (
    <div>
      {readOnly && (
        <AlertBanner variant="info" spacing="sm">
          Only system admins can modify security settings.
        </AlertBanner>
      )}

      <Subsection title="Authentication" index={1}>
        <SettingsRow label="Enhanced Authentication" hint="Stronger password auth">
          <Toggle
            checked={config.useEnhancedAuth}
            onChange={checked => onChange('useEnhancedAuth', checked)}
            disabled={readOnly}
            aria-label="Enable enhanced authentication"
          />
        </SettingsRow>
        <SettingsRow label="Strong Passwords" hint="Uppercase, lowercase, numbers">
          <Toggle
            checked={config.requireStrongPasswords}
            onChange={checked => onChange('requireStrongPasswords', checked)}
            disabled={readOnly}
            aria-label="Require strong password requirements"
          />
        </SettingsRow>
        <SettingsRow
          label="Minimum Password Length"
          hint="Enforce minimum length · 4–128 characters"
        >
          <NumberInput
            value={config.passwordMinLength}
            onChange={value => onChange('passwordMinLength', value)}
            min={4}
            max={128}
            size="sm"
            disabled={readOnly}
            aria-label="Minimum password length"
          />
        </SettingsRow>
        <SettingsRow label="Require Special Characters" hint="!@#$%^&* and friends">
          <Toggle
            checked={config.passwordRequireSpecialChars}
            onChange={checked => onChange('passwordRequireSpecialChars', checked)}
            disabled={readOnly}
            aria-label="Require special characters in passwords"
          />
        </SettingsRow>
      </Subsection>

      <Subsection title="Session Management" index={2}>
        <SettingsRow label="Auto-Logout" hint="Logout after inactivity · 5–10080 min">
          <NumberInput
            value={config.sessionTimeoutMinutes}
            onChange={value => onChange('sessionTimeoutMinutes', value)}
            min={5}
            max={10080}
            size="sm"
            disabled={readOnly}
            aria-label="Session timeout in minutes"
          />
        </SettingsRow>
        <SettingsRow label="Logout Warning" hint="Warning before logout · 1–60 min">
          <NumberInput
            value={config.idleWarningMinutes}
            onChange={value => onChange('idleWarningMinutes', value)}
            min={1}
            max={60}
            size="sm"
            disabled={readOnly}
            aria-label="Idle warning in minutes"
          />
        </SettingsRow>
        <SettingsRow label="Max Login Time" hint="Force re-login after · 1–720 hrs">
          <NumberInput
            value={config.absoluteSessionTimeoutHours}
            onChange={value => onChange('absoluteSessionTimeoutHours', value)}
            min={1}
            max={720}
            size="sm"
            disabled={readOnly}
            aria-label="Absolute session timeout in hours"
          />
        </SettingsRow>
        <SettingsRow label="Token Lifetime" hint="Security refresh interval · 5–60 min">
          <NumberInput
            value={config.accessTokenExpiryMinutes}
            onChange={value => onChange('accessTokenExpiryMinutes', value)}
            min={5}
            max={60}
            size="sm"
            disabled={readOnly}
            aria-label="Access token expiry in minutes"
          />
        </SettingsRow>
      </Subsection>

      <Subsection title="Login Protection" index={3}>
        <SettingsRow
          label="Enable Login Protection"
          hint="Prevent brute-force attacks"
          className="col-span-2"
        >
          <Toggle
            checked={config.enableRateLimiting}
            onChange={checked => onChange('enableRateLimiting', checked)}
            disabled={readOnly}
            aria-label="Enable login protection to prevent brute force attacks"
          />
        </SettingsRow>
        <SettingsRow label="Max Attempts/Minute" hint="Limit login attempts · 1–50 attempts">
          <NumberInput
            value={config.loginAttemptsPerMinute}
            onChange={value => onChange('loginAttemptsPerMinute', value)}
            min={1}
            max={50}
            size="sm"
            disabled={rateLimitDisabled}
            aria-label="Login attempts per minute"
          />
        </SettingsRow>
        <SettingsRow label="Lockout Duration" hint="Set lockout period · 1–1440 min">
          <NumberInput
            value={config.lockoutDurationMinutes}
            onChange={value => onChange('lockoutDurationMinutes', value)}
            min={1}
            max={1440}
            size="sm"
            disabled={rateLimitDisabled}
            aria-label="Lockout duration in minutes"
          />
        </SettingsRow>
      </Subsection>
    </div>
  );
}
