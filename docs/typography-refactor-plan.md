# Typography System Refactor — Plan

Status: **in progress** — Phases 1–3 complete (tokens + tabs · shared primitives · feature sweep).
Remaining: Phase H (sans `text-title*` headings — 5 deferred display headings in admin), Phase 4
(CSS outliers in `alerts.css`/`auth-console.css`, the AuthInput notch label, the barcode-config
panel chrome, and the lint guard).
Owner: design/UI
Scope: `client/` typography across the app

> **Phase 3 note — micro mono-meta left at the 13px data floor (decision).** Tiny mono,
> non-uppercase numbers/meta (≤11px) that snapped up to `data-sm` (13) during the sweep are kept
> as-is; we did NOT add compact `data-xs`/`data-2xs` tokens. Accepted that dense readouts
> (navigator box minimaps, table sub-lines, `//` separators) now read larger — revisit per-spot
> if any look too big in review.

---

## 1. Why

Today there is **no central type system**. `tailwind.config.js` defines no `fontSize` scale,
so the app runs on Tailwind defaults, and sizing decisions are scattered as ad-hoc
`text-xs` / `text-sm` and **273 arbitrary `text-[Npx]`** values across 105 files, plus raw
CSS `font-size` (including illegible 8–9.5px spots). Letter-spacing is equally scattered:
**~11 distinct `tracking-[Nem]` values** (0.04–0.32em).

The de-facto body size is **12px** (`text-xs`) — roughly one full step below comfortable
desktop reading. A global multiplier was trialled to confirm the appetite for larger text;
it proved the value but broke layouts (the modal **tab strip overflowed**) because it scaled
every context by the same ratio when each context has its own ceiling.

**Decision: size by _role_, not by number.** A small, standards-aligned vocabulary, applied
via shared primitives, tuned in one place.

## 2. Core findings

**(a) Three type families, not one scale.** The app's visual language is a *console*. Its
"headers" are not large text; they are mono · uppercase · letter-tracked labels at 9.5–14px.
Sizing splits into three independent voice tracks:

| Family | Voice | Examples | Direction |
|---|---|---|---|
| **Chrome / label** | mono · UPPERCASE · tracked | Section/Panel/Subsection headers, tabs, table headers, IdStamp, toggles, chips, badges, **buttons** | Tokenize; raise sub-10px floor |
| **Content / prose** | sans · sentence case | descriptions, body copy, inputs, menu/empty/tooltip text | **Grow — 16px lives here** |
| **Data / numeric** | mono · tabular | stat values, table cells, chip numbers | Tune for legibility |

**(b) Two-layer scale beats a redefined one.** Keep Tailwind's numeric scale at its
**standard** meanings (the most-used type scale on the web) and layer semantic voice tokens
on top. Maximum breadth + familiarity + consistency.

**(c) The "label voice" includes tracking, not just size.** Tokenizing size alone leaves
labels inconsistent. We tokenize letter-spacing too (§4.3).

**(d) Buttons are chrome.** `Button` is `font-mono` → button text uses the label/data track,
not `text-body`.

## 3. Locked decisions

1. **Interface = semantic-first.** Reach for semantic tokens by default; numeric ladder is the
   escape hatch.
2. **Content track = 16 / 14 / 13** (body / body-sm / caption).
3. **New larger _sans_ heading role** (`text-title*`), layered on console labels — design
   change, prototyped before broad rollout (Phase H).
4. **Tabs = 16px** (`text-label-lg`), on-ladder.
5. **Hero stat = 30px** (`text-stat` → `text-3xl`).
6. Reading floors: prose ≥ 13px, chrome ≥ 10px (eliminates current 8/9/9.5px).
7. **Tokenize letter-spacing** alongside size (§4.3).
8. **Revert the interim bump in Phase 1** (chosen over deferring it; accepts that un-migrated
   screens render small mid-migration until the Phase 3 sweep lands).
9. **Add a lint guard** against arbitrary `text-[Npx]` / raw `font-size` (Phase 4).

## 4. The scale

### 4.1 Layer 1 — numeric ladder (the full menu; standards-aligned)

Revert the interim bump so Tailwind's numeric scale returns to standard meanings — the broad,
familiar menu for any one-off (matches Tailwind defaults / common web ramps).

| Token | px | rem | Web role |
|---|---|---|---|
| `text-xs` | 12 | 0.75 | fine print, dense chrome |
| `text-sm` | 14 | 0.875 | compact body / dense tables |
| `text-base` | 16 | 1.0 | **body — browser & web default** |
| `text-lg` | 18 | 1.125 | lead paragraph |
| `text-xl` | 20 | 1.25 | h4 |
| `text-2xl` | 24 | 1.5 | h3 |
| `text-3xl` | 30 | 1.875 | h2 |
| `text-4xl` | 36 | 2.25 | h1 / display |

(The temporary `text-2xs` added during the trial is **removed** — redundant with `text-xs`.)

### 4.2 Layer 2 — semantic size tokens (the defaults you reach for)

Point at ladder rungs, plus the in-between half-steps (10/11/13) the console legitimately
needs (eyebrow/overline labels read optically larger because uppercase + tracked). Each token
bakes a default `lineHeight`; component `leading-*` utilities still override. Heading tokens
also bake `fontWeight`.

| Track | Token | px | On ladder? |
|---|---|---|---|
| **Prose** (sans) | `text-caption` | 13 | half-step |
| | `text-body-sm` | 14 | = `sm` (named `body-sm`, not `secondary` — color-name collision) |
| | **`text-body`** | **16** | = `base` |
| | `text-body-lg` | 18 | = `lg` |
| **Heading** (sans, weighted) — *new* | `text-title-sm` | 18 | = `lg` |
| | `text-title` | 20 | = `xl` |
| | `text-title-lg` | 24 | = `2xl` |
| | `text-display` | 30 | = `3xl` |
| **Label** (mono·UPPER·tracked, via `.type-label`) | `text-label-2xs` | 10 | floor |
| | `text-label-xs` | 11 | half-step |
| | `text-label-sm` | 12 | = `xs` |
| | `text-label-md` | 14 | = `sm` |
| | `text-label-lg` | 16 | = `base` (tabs) |
| **Data** (mono·tabular) | `text-data-sm` | 13 | half-step |
| | `text-data` | 14 | = `sm` |
| | `text-data-lg` | 16 | = `base` |
| | `text-stat` | 30 | = `3xl` (hero numbers) |

### 4.3 Letter-spacing (tracking) tokens — NEW

Collapses the ~11 ad-hoc em values into an intentional set (`theme.extend.letterSpacing`).
`.type-label` bakes `tracking-label` as its default; the others are explicit overrides.

| Token | em | Use |
|---|---|---|
| `tracking-data` | 0.02 | tabular numerals, data cells |
| `tracking-meta` | 0.10 | mono meta — IdStamp, Kbd, menu items |
| `tracking-label` | 0.18 | **standard uppercase chrome** (tabs, section/panel headers) |
| `tracking-label-wide` | 0.24 | emphasized labels — subsection, table headers, badges |
| `tracking-ceremonial` | 0.32 | auth register, loaders |

### 4.4 Voice helpers (`@layer components`)
- `.type-label` = `font-mono uppercase tracking-label` (the repeated chrome cluster).
- Mono-but-not-uppercase meta (Kbd, IdStamp) is **data** voice + `tracking-meta`, not label.

## 5. Placement map — where each token goes

| You're styling… | Token | px |
|---|---|---|
| Page / modal title | `text-title-lg` / `text-title` | 24 / 20 |
| Section divider header (console) | `text-label-md` | 14 |
| Tab labels | `text-label-lg` | 16 |
| Panel / card / subsection header | `text-label-xs` | 11 |
| **Paragraphs, descriptions, help text** | **`text-body`** | **16** |
| Form labels, supporting text | `text-body-sm` | 14 |
| Timestamps, hints, footnotes | `text-caption` | 13 |
| Input / textarea / select text | `text-body` | 16 |
| Button label | `text-label-md` (mono) | 14 |
| Table column headers | `text-label-2xs` | 10 |
| Table cell data | `text-data` | 14 |
| ID stamps, kbd, mono meta | `text-data-sm` + `tracking-meta` | 13 |
| Chip label / number | `text-label-2xs` / `text-data-sm` | 10 / 13 |
| Badge text | `text-label-2xs` | 10 |
| Hero stat value | `text-stat` | 30 |
| Stat unit / footer | `text-label-2xs` | 10 |
| Micro toggle / status labels | `text-label-2xs` | 10 |
| Menu item / settings row label | `text-label-sm` | 12 |
| Menu item description | `text-caption` | 13 |
| Tooltip / empty-state / error body | `text-body` / `text-body-sm` | 16 / 14 |

## 6. Migration map (representative; full list = Phase 2 checklist)

| Primitive | Now | → Token |
|---|---|---|
| **Tabs** | `text-xs` (overflowing) | `text-label-lg` (16) **+ overflow fix** |
| SectionHeader | `text-[10/12/14]` | `text-label-xs/sm/md` |
| PanelHeader | `text-[14]` + meta `[10.5]` | `text-label-md` + `text-label-xs` |
| SubsectionHeader / IdStamp | `text-[10.5]` | `text-label-xs` / `text-data-sm` |
| Table header / cell | `text-[9.5]` / `text-sm` | `text-label-2xs` / `text-data` |
| Chip / Badge | mixed `text-[9–15]` | `text-label-2xs/xs` + `text-data-sm` |
| StatCell | `text-[26/17/9.5]` | `text-stat` / `text-data-lg` / `text-label-2xs` |
| Button | `text-xs/sm/base` (mono) | `text-label-sm/md` (label track) |
| Input/Textarea/Autocomplete/Tooltip | `text-xs/sm/base` | `text-body-sm` / `text-body` |
| MenuItem / SettingsRow | `text-[12/11]` + desc | `text-label-sm` + `text-caption` |
| ErrorBanner / PanelEmptyState | `text-sm/xs` | `text-body-sm` / `text-caption` |
| Toggle / Kbd | `text-[8/9/11]` | `text-label-2xs` / `text-data-sm` |

## 7. Tabs overflow fix (Phase-1 proof of concept)

Layout bug, separate from type. Keep tabs large (16px) and make the strip resilient:
- **Vertical rail** (modals auto-go vertical at >2 tabs, e.g. `AdminSettingsModal`): width sized
  to the longest label, `min-w-0` + truncate fallback, or allow wrap. Audit per-modal widths.
- **Horizontal strip**: `overflow-x-auto` and/or `flex-wrap`; revisit `gap-6`.

## 8. Exclusions — do NOT migrate

- **Tube grid** dynamic sizing (`useGridFontSizing.ts`, `TubeGridCell`) — sizes computed at
  runtime to fit cells; not part of the type scale.
- **Barcode / print** components (`SupplyBarcodePrint`, barcode sheets) — physical px for
  actual printing; must stay fixed.
- **Server email templates** (`NodemailerEmailService`) — out of scope (server, inline styles).

## 9. Base-scale resolution

Revert the interim global `xs`/`sm` bump to Tailwind defaults at the start of Phase 1 (decision
#8). 16px now arrives intentionally via `text-body`, not by inflating `text-xs`. Trade-off
accepted: un-migrated stragglers render at true 12px between Phase 1 and the Phase 3 sweep —
which is exactly what the sweep hunts.

## 10. Phases (each independently shippable; lint/typecheck at boundaries)

- **Phase 1 — Foundation + proof.** Add size + tracking tokens + `.type-label`; remove temp
  `text-2xs`; revert blunt bump; migrate **Tabs** and fix overflow. → *Evaluate before widening.*
- **Phase 2 — Shared primitives.** Migrate the ~15 primitives in §6 (carries ~80% of the app).
- **Phase H — Large headings (design-led).** Prototype `text-title*` on one surface, sign off,
  roll out. Highest design risk — isolated.
- **Phase 3 — Feature sweep.** Replace the 273 arbitrary `text-[Npx]` → tokens, by domain;
  includes the **app shell** (`AppHeader`, `BiobankDashboard`, `AppLoader`).
- **Phase 4 — Cleanup + guard.** Fix raw-CSS outliers (`alerts.css`, `auth-console.css`);
  remove dead scaffolding; **add lint rule** flagging `text-[…px]` and raw `font-size` in
  components (decision #9).

## 11. Risks & verification

- Dense layouts (tables, chips, rails) shift vertical rhythm — verify key screens per phase
  (lab dashboard, a data table, tube info panel, alert banner, admin settings modal).
- Phase H is a genuine visual change — keep it isolated and reversible.
- All sizes/tracking centralized in tokens → re-tuning is one edit. The rem basis leaves the
  door open for a future user-adjustable text-size preference (scales all tokens together).

## 12. Open / follow-on items

- Which surfaces adopt the sans `text-title*` heading vs keep the console label — Phase H.
- Final tab overflow strategy per modal (truncate vs widen vs wrap) — Phase 1.
- **Icon/text pairing** (follow-on, not type-token scope): lucide icons are px-sized
  (`size={14}`) next to text; as text grows some icons will look small and may need a parallel
  bump.
