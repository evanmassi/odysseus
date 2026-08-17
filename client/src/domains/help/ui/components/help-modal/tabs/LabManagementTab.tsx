/**
 * Lab Management Tab
 *
 * Explains the equipment, supply, and reagent suites: what each one tracks,
 * how the shared browser works, and the stock, maintenance, and barcode workflows.
 */
import { equipmentStatusValues, isAdminRole } from '@odysseus/shared-schemas';
import {
  Biohazard,
  ClipboardCheck,
  Microscope,
  Package,
  PackageMinus,
  PackagePlus,
  Trash2,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { EQUIPMENT_STATUS_DISPLAY } from '@domains/equipment';
import { Chip, Well } from '@shared/ui';

import { useHelpNav } from '../HelpNavContext';
import { HelpSection } from '../HelpSection';

const SUITES = [
  {
    icon: Microscope,
    name: 'Equipment',
    summary: 'Instruments you keep.',
    detail: 'Freezers, centrifuges, LN2 tanks. One record per unit, for the life of the asset.',
  },
  {
    icon: Package,
    name: 'Supplies',
    summary: 'Consumables you count.',
    detail: 'Conicals, tips, gloves, plates. Stock held per location.',
  },
  {
    icon: Biohazard,
    name: 'Reagents',
    summary: 'Consumables that expire.',
    detail: 'Antibodies, media, buffers. Stock held per lot, oldest out first.',
  },
];

const TRANSACTIONS = [
  {
    icon: ClipboardCheck,
    name: 'Count',
    body: 'You counted the shelf. Enter what is actually there and the difference is filed as an adjustment.',
  },
  {
    icon: PackagePlus,
    name: 'Receive',
    body: 'Stock arriving. Record the lot number, expiration date, PO number, and cost.',
  },
  { icon: PackageMinus, name: 'Issue', body: 'Stock leaving to be used.' },
  {
    icon: Trash2,
    name: 'Dispose',
    body: 'Stock leaving because it is damaged, expired, or spent.',
  },
];

export function LabManagementTab() {
  const { user } = useAuthStore();
  const { goToSection } = useHelpNav();
  const isAdmin = isAdminRole(user?.role);

  return (
    <div className="space-y-8">
      <HelpSection id="lab-suites">
        <p className="text-body-sm text-muted-foreground mb-3">
          Lab Management holds three separate inventories. Open it from the header menu, then pick a
          suite from the sidebar.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-3">
          {SUITES.map(suite => {
            const Icon = suite.icon;
            return (
              <Well key={suite.name} className="flex flex-col gap-2 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-none border border-line-faint bg-shade/30 text-secondary-foreground">
                  <Icon size={16} />
                </span>
                <span className="text-body-sm font-medium text-card-foreground">{suite.name}</span>
                <span className="text-caption leading-snug text-muted-foreground">
                  {suite.summary}
                </span>
                <span className="text-caption leading-snug text-muted-foreground/70">
                  {suite.detail}
                </span>
              </Well>
            );
          })}
        </div>

        <p className="text-body-sm text-muted-foreground">
          All three are laid out the same way: a category tree on the left, and details for whatever
          you select on the right. Everyone can browse, search, and open any item, but only lab
          admins can add items, edit them, or record stock.
        </p>
      </HelpSection>

      <HelpSection id="lab-browsing">
        <p className="text-body-sm text-muted-foreground mb-3">
          Items live in categories, one or two levels deep. Plasticware sits at the top with Tubes
          &amp; Conicals underneath it. Expand a category to see what is in it. The strip above the
          tree counts what you are currently looking at.
        </p>
        <ul className="text-body-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>
            <span className="text-card-foreground font-medium">Search</span> — matches name,
            manufacturer, catalog number, and vendor, plus serial and asset tag on equipment and
            reagent type and CAS number on reagents. Typing a category name returns everything
            inside it.
          </li>
          <li>
            <span className="text-card-foreground font-medium">Sort</span> — by name, manufacturer,
            or date added, ascending or descending.
          </li>
          <li>
            <span className="text-card-foreground font-medium">Filter</span> — narrows by the item
            attributes your lab defined, such as storage temperature or physical form. The button
            shows how many filters are on.
          </li>
          <li>
            <span className="text-card-foreground font-medium">Show Archived</span> (
            <span className="text-card-foreground font-medium">Show Decommissioned</span> on
            equipment) — retired records are hidden until you ask for them. Nothing is deleted when
            it is retired.
          </li>
        </ul>
        <p className="text-body-sm text-muted-foreground mt-3">
          Click any row to open its detail panel. Admins can add, rename, and delete categories from
          the tree itself. Vendors, manufacturers, locations, units, and item attributes all come
          from lists an admin curates in{' '}
          <button
            type="button"
            onClick={() => goToSection('admin-catalog')}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Catalog Management
          </button>
          .
        </p>
      </HelpSection>

      <HelpSection id="lab-equipment">
        <p className="text-body-sm text-muted-foreground mb-3">
          An equipment record covers one physical unit: manufacturer and model, serial number, asset
          tag, purchase date and cost, warranty expiration, and the location it sits in. Manuals,
          certificates, and service contracts can be linked to it as documents.
        </p>

        <p className="text-body-sm text-muted-foreground mb-2">Every unit carries a status:</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {equipmentStatusValues.map(status => (
            <Chip key={status} size="sm" color={EQUIPMENT_STATUS_DISPLAY[status].color}>
              {EQUIPMENT_STATUS_DISPLAY[status].label}
            </Chip>
          ))}
        </div>

        <Well className="p-3 mb-3">
          <h4 className="text-body-sm font-medium text-card-foreground mb-1">Maintenance</h4>
          <p className="text-body-sm text-muted-foreground">
            Each service visit is logged with its date, activity type, technician, cost, and what
            was done. Giving an entry a next scheduled date puts the unit on the clock. An LN2 tank
            on a quarterly PM gets its next date set 90 days out every time it is serviced. Anything
            falling due within 30 days, or already past due, is pinned above the tree in the
            Maintenance Alerts panel, overdue units first.
          </p>
        </Well>

        <p className="text-body-sm text-muted-foreground">
          Decommissioning retires a unit with a date, a reason, and a disposal method. It keeps its
          full maintenance history and drops out of the list until you turn on Show Decommissioned.
        </p>
      </HelpSection>

      <HelpSection id="lab-supplies">
        <p className="text-body-sm text-muted-foreground mb-3">
          A supply item is a product you buy, like 15 mL Corning conicals (catalog 430791) bought by
          the pack. Stock is held per location, so the same item can sit in both the main supply
          room and the backup room, and the row shows the combined total.
        </p>

        <p className="text-body-sm text-muted-foreground mb-2">
          Stock only moves through a recorded transaction:
        </p>
        <div className="space-y-2 mb-4">
          {TRANSACTIONS.map(txn => {
            const Icon = txn.icon;
            return (
              <div key={txn.name} className="flex items-start gap-2">
                <Icon size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-body-sm text-muted-foreground">
                  <span className="text-card-foreground font-medium">{txn.name}</span> — {txn.body}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-body-sm text-muted-foreground mb-3">
          The ledger is append-only. Entries are never edited or deleted, so a mistake is voided
          instead: the original stays on the record and a reversing entry is written against it.
          Void and Replace does the same thing and reopens the form with the original values, ready
          to correct.
        </p>
        <p className="text-body-sm text-muted-foreground mb-3">
          Give an item a reorder threshold and it appears in the Low Stock panel once it drops below
          that level. From there, the reorder list opens as a table of what to buy, with vendor,
          catalog number, quantity, and price. It exports to CSV for whoever places the order.
        </p>
        <p className="text-body-sm text-muted-foreground">
          Some items ship nested: a case of 10 packs, 500 tubes to the pack. Describe that chain
          once as packaging levels and the transaction form will take &ldquo;2 cases, 3 packs&rdquo;
          and work out the stock total for you.
        </p>
      </HelpSection>

      <HelpSection id="lab-reagents">
        <p className="text-body-sm text-muted-foreground mb-3">
          Reagents work like supplies, with one addition that changes everything else: stock is held
          in lots. A lot is one delivery of one product. It carries its own lot number, quantity,
          location, expiration date, received and opened dates, and a concentration if that differs
          from the catalog entry. An antibody can have two lots in the 4 °C fridge, one expiring
          months before the other.
        </p>
        <ul className="text-body-sm text-muted-foreground space-y-1 list-disc list-inside mb-3">
          <li>
            <span className="text-card-foreground font-medium">Issuing and disposing</span> draw
            from the lot that expires first unless you pick one. A draw larger than that lot
            continues into the next, in expiry order.
          </li>
          <li>
            <span className="text-card-foreground font-medium">Expired lots are refused</span> until
            you tick the acknowledgment on the form.
          </li>
          <li>
            <span className="text-card-foreground font-medium">Counting</span> reconciles a single
            lot rather than the item as a whole, so you pick which one you counted.
          </li>
        </ul>
        <p className="text-body-sm text-muted-foreground mb-3">
          Expiry Alerts sit above the tree: lots already expired in red, lots approaching in amber.
          The warning window is 90 days unless an item overrides it. A working antibody stock might
          only warrant 60.
        </p>
        <p className="text-body-sm text-muted-foreground">
          Reagents also carry the chemistry an inventory needs: reagent type from your lab&apos;s
          list, CAS number, and concentration with its unit.
        </p>
      </HelpSection>

      <HelpSection id="lab-barcodes">
        <p className="text-body-sm text-muted-foreground mb-3">
          Supplies and reagents can be scanned; equipment is not barcoded. Every item is given an
          internal barcode, and you can add the manufacturer&apos;s own alongside it and mark one as
          primary. Reagents go a step further and allow a barcode on an individual lot, which labels
          the bottle rather than the product.
        </p>
        <p className="text-body-sm text-muted-foreground mb-3">
          Scan into the box in the toolbar and a short menu opens: view the item, or go straight to
          a count, receive, issue, or dispose. Scanning a reagent lot label opens the form already
          pointed at that lot and its location. A barcode the system does not recognise offers to be
          linked to an item, and one belonging to another suite tells you where it actually lives
          instead of guessing.
        </p>
        <p className="text-body-sm text-muted-foreground">
          Labels are printed from Bulk Operations: choose the items, pick a sheet template and the
          position to start from, then preview before printing. For reagents you can print one label
          per lot instead of one per item.
        </p>
      </HelpSection>

      {isAdmin && (
        <HelpSection id="lab-bulk">
          <p className="text-body-sm text-muted-foreground mb-3">
            The layers button in each toolbar opens Bulk Operations, which applies one action to up
            to 100 items at once. Anything archived or decommissioned is left out of the selection.
            If part of a run fails, you are told what succeeded and what did not.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Package size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-body-sm text-muted-foreground">
                <span className="text-card-foreground font-medium">Supplies and reagents</span> —
                receive or issue against several items in one pass, void a batch of transactions,
                move items to another category, archive them, or print a barcode sheet.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Microscope size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-body-sm text-muted-foreground">
                <span className="text-card-foreground font-medium">Equipment</span> — log the same
                maintenance entry against every unit a technician serviced, change status across a
                set, or move units to another category.
              </p>
            </div>
          </div>
        </HelpSection>
      )}
    </div>
  );
}
