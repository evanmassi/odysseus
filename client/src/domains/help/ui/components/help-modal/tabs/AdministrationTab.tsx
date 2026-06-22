/**
 * Administration Tab
 *
 * Admin-only help content covering the Admin Settings panel.
 * Section order matches the tab order in the Admin Settings modal.
 */
import { Well } from '@shared/ui';

import { HelpSection } from '../HelpSection';

export function AdministrationTab() {
  return (
    <div className="space-y-8">
      {/* Overview */}
      <HelpSection id="admin-overview">
        <p className="text-body-sm text-muted-foreground">
          The Admin Settings panel is accessible from the header menu. It is the central hub for
          managing your lab — users, researchers, security, registration, catalog values, and system
          configuration are all controlled from here.
        </p>
      </HelpSection>

      {/* System */}
      <HelpSection id="admin-system">
        <ul className="text-body-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Edit your lab name</li>
          <li>View storage utilization — capacity usage across tanks, racks, and boxes</li>
          <li>Export system data</li>
          <li>Toggle detailed system logging for troubleshooting</li>
        </ul>
      </HelpSection>

      {/* Security Settings */}
      <HelpSection id="admin-security">
        <p className="text-body-sm text-muted-foreground mb-2">
          Authentication, login, and timeout settings for your lab. Only the system administrator
          can modify these settings — lab admins can view them but not make changes.
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-body-sm text-card-foreground font-medium">Authentication</span>
            <span className="text-body-sm text-muted-foreground">
              — Strong passwords, minimum length, special character requirements
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-body-sm text-card-foreground font-medium">Sessions</span>
            <span className="text-body-sm text-muted-foreground">
              — Auto-logout timeout, idle warning, how many devices can be logged in at once
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-body-sm text-card-foreground font-medium">Login Protection</span>
            <span className="text-body-sm text-muted-foreground">
              — Limits on failed login attempts and temporary lockout after too many tries
            </span>
          </div>
        </div>
      </HelpSection>

      {/* User Management */}
      <HelpSection id="admin-users">
        <p className="text-body-sm text-muted-foreground mb-2">
          View and manage all user accounts in your lab.
        </p>
        <ul className="text-body-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Assign roles — promote users to lab admin or revert to standard user</li>
          <li>Reset passwords — trigger a password reset for any user</li>
          <li>Link to researchers — connect a user account to a researcher profile</li>
          <li>Activate or deactivate accounts</li>
        </ul>
        <Well className="p-3 mt-3">
          <h4 className="text-body-sm font-medium text-card-foreground mb-1">
            Researcher Link & Access
          </h4>
          <p className="text-body-sm text-muted-foreground">
            Users with a linked researcher profile have full read/write access — they can add, edit,
            and manage tubes in their assigned storage. Users without a linked researcher have
            read-only access and can browse the system but cannot modify tube data.
          </p>
        </Well>
      </HelpSection>

      {/* Researcher Management */}
      <HelpSection id="admin-researchers">
        <p className="text-body-sm text-muted-foreground mb-2">
          Manage researcher profiles independently from user accounts.
        </p>
        <ul className="text-body-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Create new researcher profiles with name and contact details</li>
          <li>Link or unlink a researcher to a user account for self-service access</li>
          <li>Activate or deactivate researchers while preserving their tube associations</li>
          <li>View how many tubes each researcher owns</li>
        </ul>
      </HelpSection>

      {/* Invite Codes */}
      <HelpSection id="admin-invites">
        <p className="text-body-sm text-muted-foreground">
          Generate invite codes to allow new users to register for your lab. Each code can be
          configured with a maximum number of uses and can optionally auto-create a researcher
          profile on registration. Copy the code to share it, and deactivate it when no longer
          needed.
        </p>
      </HelpSection>

      {/* Catalog Management */}
      <HelpSection id="admin-catalog">
        <p className="text-body-sm text-muted-foreground">
          Customize the options available when filling out tube and donor forms — species, source
          types, media types, and specimen types. You can add new options, rename existing ones, and
          remove options that are no longer relevant. Before removing an option, the system shows
          how many records currently use it.
        </p>
      </HelpSection>

      {/* Monitoring */}
      <HelpSection id="admin-monitoring">
        <p className="text-body-sm text-muted-foreground">
          The audit log tracks user actions across the system. Filter by user, action type, or date
          range to review activity. Useful for troubleshooting or verifying changes.
        </p>
      </HelpSection>
    </div>
  );
}
