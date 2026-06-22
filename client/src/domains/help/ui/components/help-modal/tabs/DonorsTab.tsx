/**
 * Donors Tab
 *
 * Explains the Donor Registry: browsing, profiles, collection history,
 * linking to tubes, and admin management workflows.
 */
import { isAdminRole } from '@odysseus/shared-schemas';

import { useAuthStore } from '@domains/authentication';

import { HelpSection } from '../HelpSection';

export function DonorsTab() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

  return (
    <div className="space-y-8">
      {/* Section A: What is the Donor Registry? */}
      <HelpSection id="donors-what">
        <p className="text-body-sm text-muted-foreground">
          The Donor Registry is a curated database of donor profiles. Each donor can have two
          identifiers — a Source ID (external) and an Internal ID (lab-assigned) — along with
          demographics, clinical information, and a collection history. Donors are linked to tubes
          so you can track whose samples are stored where. All users can browse and view donor
          profiles, but only lab admins can add, edit, or remove donor records.
        </p>
      </HelpSection>

      {/* Section B: Browsing & Searching */}
      <HelpSection id="donors-browse">
        <p className="text-body-sm text-muted-foreground">
          Open the Donor Registry from the header menu. It displays a searchable table on the left
          and a detail panel on the right. Search by either Source ID or Internal ID — matching is
          flexible, so you don&apos;t need to type the ID exactly. Click any row to view the full
          profile.
        </p>
      </HelpSection>

      {/* Section C: Donor Profiles */}
      <HelpSection id="donors-profiles">
        <p className="text-body-sm text-muted-foreground mb-3">Each donor profile contains:</p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-body-sm text-card-foreground font-medium">Identifiers</span>
            <span className="text-body-sm text-muted-foreground">— Source ID, Internal ID</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-body-sm text-card-foreground font-medium">Demographics</span>
            <span className="text-body-sm text-muted-foreground">
              — Species, age, sex, ethnicity
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-body-sm text-card-foreground font-medium">Clinical</span>
            <span className="text-body-sm text-muted-foreground">
              — Clinical status (healthy or diseased), diagnosis, disease stage
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-body-sm text-card-foreground font-medium">Notes</span>
            <span className="text-body-sm text-muted-foreground">
              — Free-form notes for additional context
            </span>
          </div>
        </div>
      </HelpSection>

      {/* Section D: Collection History */}
      <HelpSection id="donors-history">
        <p className="text-body-sm text-muted-foreground">
          Each donor has a timeline of collection events. Entries record the collection date,
          specimen type (e.g. whole blood, leukopak), and source (e.g. the clinic or lab the sample
          came from). This helps track when and where samples were obtained from a given donor.
        </p>
      </HelpSection>

      {/* Section E: Linking Donors to Tubes */}
      <HelpSection id="donors-linking">
        <p className="text-body-sm text-muted-foreground">
          When adding or editing a tube, use the donor search fields to link it to an existing
          donor. Selecting a donor automatically fills in both the Source ID and Internal ID if
          available.
        </p>
        <p className="text-body-sm text-muted-foreground mt-2">
          If you type a donor ID that doesn&apos;t exist yet, a new donor record is automatically
          created in the registry — a lab admin can then fill in the remaining details
          (demographics, clinical info, etc.) later.
        </p>
        <p className="text-body-sm text-muted-foreground mt-2">
          Linked donors enable donor-based color coding on the grid and allow you to filter or
          search tubes by donor. You can also click a donor ID on a tube to jump directly to that
          donor&apos;s profile in the registry.
        </p>
      </HelpSection>

      {/* Section F: Managing Donors (admin only) */}
      {isAdmin && (
        <HelpSection id="donors-managing">
          <p className="text-body-sm text-muted-foreground mb-2">
            As an admin, you can create, edit, and delete donor profiles from the registry.
          </p>
          <ul className="text-body-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              <span className="text-card-foreground font-medium">Add donors</span> — click the add
              button in the table header. At least one identifier (Source ID or Internal ID) is
              required.
            </li>
            <li>
              <span className="text-card-foreground font-medium">Edit profiles</span> — select a
              donor and click Edit to update any field.
            </li>
            <li>
              <span className="text-card-foreground font-medium">Collection history</span> — add,
              edit, or remove collection entries from the timeline.
            </li>
            <li>
              <span className="text-card-foreground font-medium">Review</span> — donors with an
              amber indicator have not been reviewed yet. These are typically auto-created entries
              that need an admin to verify and complete the profile.
            </li>
            <li>
              <span className="text-card-foreground font-medium">Delete donors</span> — removes the
              donor and all associated collection history. Any tubes referencing this donor will
              have their donor fields cleared.
            </li>
          </ul>
        </HelpSection>
      )}
    </div>
  );
}
