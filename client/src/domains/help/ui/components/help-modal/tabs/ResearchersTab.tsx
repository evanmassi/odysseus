/**
 * Researchers Tab
 *
 * Explains the relationship between users and researchers,
 * how tubes connect to researchers, and management workflows.
 */
import { isAdminRole } from '@odysseus/shared-schemas';
import { Link, ShieldUser, TestTubeDiagonal, UserRoundCog, UsersRound } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';

export function ResearchersTab() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

  return (
    <div className="space-y-8">
      {/* Section A: Users vs Researchers */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <UsersRound size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Users vs Researchers</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          A user is a login account — someone who can sign in and use the app. A researcher is a
          profile that can own tubes. They&apos;re separate things. Not every user is a researcher,
          and a researcher doesn&apos;t always need a user account (e.g. a collaborator whose
          samples you&apos;re storing).
        </p>
      </section>

      {/* Section B: How Tubes Connect to Researchers */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TestTubeDiagonal size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">
            How Tubes Connect to Researchers
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Every tube can be assigned to a researcher, though it is not required. This is how
          Odysseus tracks whose samples are whose. When you add a tube, you pick the researcher it
          belongs to, which is typically the researcher that froze down the sample(s). If this
          information is unknown, that selection can simply remain blank.
        </p>
      </section>

      {/* Section C: Linked vs Unlinked Researchers */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Link size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">
            Linked vs Unlinked Researchers
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          A researcher can optionally be linked to a user account. When linked, that user can see
          and manage their own tubes. Unlinked researchers are profiles managed by admins on behalf
          of others (e.g. external collaborators or former lab members).
        </p>
      </section>

      {/* Section D: Managing Researchers */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <UserRoundCog size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Managing Researchers</h3>
        </div>
        <div className="flex items-start gap-2">
          <ShieldUser size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Admins can add new researchers, edit profiles, and manage researcher status.
          </p>
        </div>
        {isAdmin && (
          <ul className="text-xs text-muted-foreground mt-3 space-y-1 list-disc list-inside">
            <li>Create researcher profiles with name and contact details</li>
            <li>Link a researcher to a user account so they can manage their own tubes</li>
            <li>Unlink a researcher from a user without losing tube associations</li>
            <li>Deactivate researchers while preserving their existing tube data</li>
            <li>View tube counts per researcher from the Admin Settings panel</li>
          </ul>
        )}
      </section>
    </div>
  );
}
