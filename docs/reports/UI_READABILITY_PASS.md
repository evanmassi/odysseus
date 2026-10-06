# UI Readability Pass

Branch `update/ui-readability`. A calmer pass over the console theme: fewer boxes inside boxes, no glowing words, clearer hierarchy. Keep the lit chrome (modal lighting, glowing divider lines, lit tabs, fill bars, tree lines).

## The rules

**Boxes**

- One level of card on the dashboard background, never a card inside a card.
- A group whose children are already cards sits flat: the Labs tab's Registered and Demo groups.
- Inside a modal, side panels are frameless: the Donor Registry's table, details, and form.
- Main pages (equipment, supplies, reagents, tubes) keep their framed panels and header strips.
- Catalog details views and forms keep the shaded footer band behind their buttons; the contrast earns its place. Frameless panels don't get it: without a frame around it, the band floats.

**Section titles**

- Titled sections sit on the page or modal surface. The title is followed by a faint `·` and its count, then a plain fading line (`Subsection` / `SubsectionHeader`).
- Where a section owns a card, the title sits outside it and the card is indented 12px below it (`Subsection isCompact` wrapping a `ConsolePanel`).
- A title sits about 14px above its first row. Sections sit about 28 to 44px apart, so each title clearly belongs to its own content.

**Words and hover**

- Words never glow. The exceptions are interactive primitives that glow on hover by design: buttons, action chips, select and date-picker icons, number steppers, Kbd, and the active tab.
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
- **Catalog trees:** the ⋮ menu on category and subcategory rows moved into the right-side hover tools, after "+ Subcategory", matching Storage Manager.
- **Setting names:** Title Case everywhere ("Value Type", "Odysseus Version"); hint text below stays sentence case.
- **Location tree and bulk picker:** Catalog › Locations, the Manage Locations editor, and the bulk-operations category picker use the main catalog tree's rows, nesting, and tree lines with node squares; no box per row. The bulk picker keeps the name-to-count divider (shared `TreeRowRail`); locations have none.
- **Add labels:** Add Attribute, Add Lab, Add Demo Lab, Add Entry; "New Code" stays.
- **Stacking:** named `z-popover` and `z-tooltip` layers, so tooltips always sit above popups.
- **Search dropdown:** fixed height, plain headers, darker filter column, shared `FilterSection`.
- **Tables:** zebra stripes are painted on the row, so the hover tint layers over them evenly.
- **Demo data:** maintenance "performed by" shows readable names. Production updates on the first nightly reset after deploy.
- **Tube editors:** bulk-edit failures use an error `AlertBanner` with Retry; stale-edit banner uses the shared `Button`; Title Case section titles. Tube, bulk, and lock-note editors say "Save Changes", like every other edit form; "Remove N Tubes" keeps its count because it's destructive.
- **Bulk operations:** item cards are square with a tick-row header (name, then maker · catalog #) and a hover-reveal remove; plain "Quantity" / "Location" labels. Every tab's buttons sit in the modal footer (`BulkTabFooter`), so the footer no longer jumps between tabs. Void's reason field moved into the body.
- **Horizontal tabs:** labels never wrap mid-word; vertical rail tabs still wrap.
- **Word glow removed:** detail rows, alert dialog titles, and the print option labels; their icons keep their glow. The reagent print panel is square.
- **Long names:** truncated names in the bulk item tree and the storage navigator show the full name in a tooltip after 400 ms (shared `TruncatedText`). The tree's name-to-count line collapses instead of crowding the count, checkboxes never shrink, and the All Items count lines up with the rows in the tree's count style.
- **Reagent expiry alerts:** one row per lot (Reagent with maker · catalog #, Lot with location, Expires with an in-words status in tone color). The list row carries `lotExpirations`, so alerts stay derived from the item list; the old `soonestExpiration` / `expiredLotCount` rollups are gone.
- **Maintenance alerts:** Equipment (name with asset tag · model), Location (path), Due (date with an in-words status in tone color); category dropped. Low stock alerts reviewed and kept as is.
- **Light mode:** walked and approved. Muted and secondary text moved from neutral gray to a blue-gray ink (`218 32% 32%` / `220 34% 20%`) so labels and ghost buttons fit the theme; dark mode unchanged.
- **Dropdown options:** Select and Autocomplete use the shared row recipe (scanlines, wash, edge stripe; static variants for keyboard focus). Text steps dim → full on hover → bold white when selected; the selected word no longer glows.
- **DatePicker:** calendar days use the LED cell (`led-cell.css`): selected is a lit cell (scanline fill, dark gap, blue rim, pixel corners, bold white number); today is a thin blue outline with a bold blue number; hover adds a faint rim. The active date segment uses the lit cell. No glowing digits.
- **Reviewed and kept:** equipment maintenance and decommission, and the stock-transaction forms. Receive mode's long field list is task-specific and reads fine.

## Still to do

1. **Table columns.** Cells default to the sans font. Columns that should stay monospace (IDs, barcodes, dates) need a per-column fix as they're spotted.

## Mocks

Interactive mocks for the approved decisions live in the Armada diagrams folder for this session. They're named by subject, for example `donor-form-calmer.html`, `catalog-category-rows.html`, `system-admin-labs.html`, and `system-admin-lab-detail.html`.
