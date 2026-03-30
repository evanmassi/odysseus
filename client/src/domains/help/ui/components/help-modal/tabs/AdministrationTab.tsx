/**
 * Administration Tab
 *
 * Admin-only help content covering the Admin Settings panel:
 * users, researchers, security, invite codes, catalog, monitoring, and system.
 */
import {
  Activity,
  BookOpen,
  Dna,
  Gauge,
  Settings,
  Shield,
  TicketCheck,
  UsersRound,
} from 'lucide-react';

export function AdministrationTab() {
  return (
    <div className="space-y-8">
      {/* Section A: Overview */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Settings size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Admin Settings Overview</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          The Admin Settings panel is accessible from the header menu. It is the central hub for
          managing your lab — users, researchers, security, registration, catalog values, and system
          configuration are all controlled from here.
        </p>
      </section>

      {/* Section B: User Management */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <UsersRound size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">User Management</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          View and manage all user accounts in your lab.
        </p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Assign roles — promote users to lab admin or revert to standard user</li>
          <li>Reset passwords — trigger a password reset for any user</li>
          <li>Link to researchers — connect a user account to a researcher profile</li>
          <li>Activate or deactivate accounts</li>
        </ul>
        <div className="rounded-lg border border-border p-3 bg-muted/30 mt-3">
          <h4 className="text-xs font-medium text-card-foreground mb-1">
            Researcher Link & Access
          </h4>
          <p className="text-xs text-muted-foreground">
            Users with a linked researcher profile have full read/write access — they can add, edit,
            and manage tubes in their assigned storage. Users without a linked researcher have
            read-only access and can browse the system but cannot modify tube data.
          </p>
        </div>
      </section>

      {/* Section C: Researcher Management */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Dna size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Researcher Management</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Manage researcher profiles independently from user accounts.
        </p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Create new researcher profiles with name and contact details</li>
          <li>Link or unlink a researcher to a user account for self-service access</li>
          <li>Activate or deactivate researchers while preserving their tube associations</li>
          <li>View how many tubes each researcher owns</li>
        </ul>
      </section>

      {/* Section D: Security Settings */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Security Settings</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Configure authentication and session policies for your lab.
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs text-card-foreground font-medium">Authentication</span>
            <span className="text-xs text-muted-foreground">
              — Strong passwords, minimum length, special character requirements
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-card-foreground font-medium">Sessions</span>
            <span className="text-xs text-muted-foreground">
              — Auto-logout timeout, idle warning, maximum concurrent sessions
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-card-foreground font-medium">Rate Limiting</span>
            <span className="text-xs text-muted-foreground">
              — Max login attempts per minute, lockout duration after repeated failures
            </span>
          </div>
        </div>
      </section>

      {/* Section E: Invite Codes */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TicketCheck size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Invite Codes</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Generate invite codes to allow new users to register for your lab. Each code can be
          configured with a maximum number of uses and can optionally auto-create a researcher
          profile on registration. Copy the code to share it, and deactivate it when no longer
          needed.
        </p>
      </section>

      {/* Section F: Catalog Management */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Catalog Management</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Manage the lookup values that appear in dropdowns across the system — species, source
          types, media types, and specimen types. You can add new values, rename existing ones, and
          remove values that are no longer needed. The system shows how many records reference each
          value before deletion.
        </p>
      </section>

      {/* Section G: Monitoring & System */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Monitoring</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          The audit log tracks user actions across the system. Filter by user, action type, or date
          range to review activity. Useful for troubleshooting or verifying changes.
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Gauge size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">System</h3>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Edit your lab name</li>
          <li>View storage utilization — capacity usage across tanks, racks, and boxes</li>
          <li>Export system data</li>
          <li>Toggle detailed system logging</li>
        </ul>
      </section>
    </div>
  );
}
