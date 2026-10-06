# UI Readability Pass

Branch `update/ui-readability`. A calmer pass over the console theme: fewer boxes inside boxes, no glowing words, clearer hierarchy. Keep the lit chrome (modal lighting, glowing divider lines, lit tabs, fill bars, tree lines).

## The rules

**Boxes**

- One level of card on the dashboard background, never a card inside a card.
- A group whose children are already cards sits flat: the Labs tab's Registered and Demo groups.
- Inside a modal, side panels are frameless: the Donor Registry's table, details, and form.
- Main pages (equipment, supplies, reagents, tubes) keep their framed panels and header strips.

**Section titles**

- Titled sections sit on the page or modal surface. The title is followed by a faint `·` and its count, then a plain fading line (`Subsection` / `SubsectionHeader`).
- Where a section owns a card, the title sits outside it and the card is indented 12px below it (`Subsection isCompact` wrapping a `ConsolePanel`).
- A title sits about 14px above its first row. Sections sit about 28 to 44px apart, so each title clearly belongs to its own content.

**Words and hover**

- Words never glow. The only exception is the active tab.
- Hover brightens. It does not bold, scale, or bloom.
- For a text hover, change the word itself. Don't add brackets or underlines around it, and don't turn it blue.
- Table rows, detail rows, and filter rows all share one hover: a faint blue stripe plus a soft wash (`ROW_HOVER_GLOW`). It layers over zebra stripes evenly.
- `.lock-on` (in `hud-hover.css`) is the bracket animation for square controls such as the lab power switch.

**Separators**

- Middle dot `·` in text lists.
- Small squares in labels and header crumbs.
- No `//` anywhere visible.

**Actions**

- Tab-wide actions sit on the tab's title row: Refresh, quiet, on the left, and the create action, primary, far right.
- Controls that change only the view (filters, Active Only, search) stay with their table.
- Add buttons come in two tiers. Full-size buttons are a + icon plus "Add <Thing>" in Title Case ("Add Tank", "Add Donor"). Small hover-reveal row tools are + plus the noun only ("+ Subcategory", "+ Rack", "+ Box").
- "Add" is the verb for adding, never "Create". The one exception is "New" for something the app generates, such as "New Code" for invite codes. A bare "Add" is fine only right next to the field it adds from.

**Empty states**

- The breathing icon and the words, nothing else: no blurred box and no corner pins.

## Done

- **App header:** cream crumbs with a rule after the logo and squares between levels; calm hovers on the suite and user buttons.
- **Donor Registry:** frameless table, details, and form; collection stats; stacked completeness; taller notes field.
- **Equipment, supplies, reagents:** status-stripe name header; plain section dividers; category rows with a fading line and a hover-reveal "+ Subcategory"; actions in the search row; alert-table picks open their category; toned-down card glow.
- **Tube details:** shares the name header.
- **Info panels:** tighter title-to-content grouping.
- **System admin:**
  - Labs tab and single-lab view.
  - Security tab and Storage tab.
  - Refresh moved to the tab bar.
- **Admin Settings:** consistent title-row actions and spacing across all tabs; flattened audit log filters; ticket icon on the empty invite list.
- **User Settings:** same title-to-content distance and 16px gaps as Admin Settings.
- **Audit Log Retention:** plain title row with status and a collapse arrow; the Monitoring tab's Refresh covers it.
- **Lit header bars retired:** Catalog › Locations uses the plain list toolbar row; the catalog filter panel is a flat titled section. `consoleHeaderSurface` is deleted.
- **Auth screens and boot splash:** status lines lose their `[ ]` brackets and glow and keep the side bar; greeting, tagline, reset-link keywords, and splash status text are plain. Both logos keep their glow.
- **Alert banners:** dark-mode wash matches the chips (short fade off the edge bar); bold words in the message keep their tone color without glow.
- **Header search bar:** filter and clear are plain ghost icon buttons. An "on" filter uses the shared `ghost-primary` button, which stays blue and shifts shade on hover; the catalog Filter buttons use it too.
- **Row highlights (dark mode):** hover, open, selected, and selected-plus-hover come from one recipe in `row-glow.css`, used by tables, catalog trees and item lists, the storage navigator and Storage Manager, the location and category pickers, search result cards, and the checkbox lists. Selected table rows now react to hover; non-clickable rows don't; full Storage Manager boxes tint red. Light mode is unchanged.
- **Storage Manager:** owner pickers read as plain names (flush right) with the dropdown frame on row hover; "+ Rack" / "+ Box" and the ⋮ menu slide in on hover using the shared `row-tools` reveal (also used by "+ Subcategory"); clicking "+ Rack" / "+ Box" opens the count picker in place. By User draws tree lines, drops repeated owner badges, and shows "2 of 4 boxes" on partly owned racks.
- **Add labels:** Add Attribute, Add Lab, Add Demo Lab, Add Entry; "New Code" stays.
- **Stacking:** named `z-popover` and `z-tooltip` layers, so tooltips always sit above popups.
- **Search dropdown:** fixed height, plain headers, darker filter column, shared `FilterSection`.
- **Tables:** zebra stripes are painted on the row, so the hover tint layers over them evenly.
- **Demo data:** maintenance "performed by" shows readable names. Production updates on the first nightly reset after deploy.

## Still to do

1. **Light mode check.** A code scan found every color on this branch goes through theme tokens; the one gap (the lab-name flash) is fixed. A visual walk is still worth doing as screens are reviewed.
2. **Glowing words still in place:**
   - `AlertDialog`;
   - the print options panels;
   - `DetailRow`'s hover text glow.

   Some shared primitives also glow on purpose (Select, DatePicker, Tabs, Kbd, Button). Review those case by case rather than sweeping them.

3. **Edit forms and other modals.** Donor is done. Still unreviewed:
   - the tube editor;
   - equipment maintenance and decommission;
   - the supply and reagent stock-transaction forms;
   - the bulk-operation tabs.
4. **Catalog page footers.** The equipment, supplies, and reagents details views and forms still have the shaded footer band behind their buttons. Decide whether it goes, like the donor and lab-settings footers did.
5. **Table columns.** Cells default to the sans font. Columns that should stay monospace (IDs, barcodes, dates) need a per-column fix as they're spotted.
6. **Setting names.** Labels mix Title Case and sentence case. Pick one.

## Mocks

Interactive mocks for the approved decisions live in the Armada diagrams folder for this session. They're named by subject, for example `donor-form-calmer.html`, `catalog-category-rows.html`, `system-admin-labs.html`, and `system-admin-lab-detail.html`.
