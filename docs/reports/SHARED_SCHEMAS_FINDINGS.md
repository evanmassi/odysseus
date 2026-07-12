# Shared-Schemas Findings — Bucket 3, Batch 5 (packages/shared-schemas)

**Date:** 2026-07-12 · **Branch:** `audit/fixes` · **Status: APPLIED + VERIFIED (uncommitted)**

All 56 files audited by 5 finders; load-bearing claims coordinator-re-verified. ~30 files CLEAN.
Critical all-clear: **no wire-contract drift** — every event schema's required fields match what the
server actually emits (the tube event schemas never declared the deleted payload fields).

Applied by two sequential apply agents (both touch the root `index.ts` barrel), then coordinator
verification. Net −189 lines across 45 files.

## A. The cast bug — APPLIED
`equipmentBulkStatusSchema`'s `as unknown as [string, ...]` cast (the only such cast in the package)
replaced with Zod v4 native: `equipmentStatusSchema.exclude(['decommissioned'])` +
`equipmentBulkStatusValues = equipmentBulkStatusSchema.options`. This unblocked two downstream fixes:
- `EquipmentApplicationService.bulkChangeStatus` param → `EquipmentBulkStatusRequest['data']`
  (`EquipmentStatus` import dropped).
- `BulkStatusTab.tsx` — the compensating `resolver: ... as never` + `FieldValues` wrapper were
  load-bearing under the string-widened schema; moved the form to the audited `DonorEditForm`
  pattern (`useForm<EquipmentBulkStatusRequest['data']>` + bare `zodResolver` + direct
  `handleSubmit(onSubmit)`). Runtime submit behavior identical.

## B. Dead code — APPLIED (grep-proven, re-verified before deletion)
- `updateResearcherProfileSchema` + type + root barrel lines.
- `updateSupplyPackagingLevelRequestSchema` + supplies/root barrel lines.
- `POSITION_DISPLAY_PRESETS` + `generatePositionLabels` + barrel lines (+ the two `@example`
  comments repointed to `createAlphanumericConfig(9, 9, 'row-col')`).
- `userSessionSchema` + `UserSession` type (live one is `activeSessionSchema`; server's domain
  `UserSession` entity untouched).
- 6 dead `SYSTEM_DEFAULTS` members (timezone/theme/language/org/requireAuth/CONFIGURATION block).

## C. Unexports + barrel trims — APPLIED
- Unexported to module-local consts: `generateAlphabeticLabels`/`generateNumericLabels`,
  `parseConcentrationInput`, `tubeTimestampsSchema`, `skippedTubeSchema`, `SearchFiltersSchema`,
  `GroupedResultSchema`, `sessionOverviewSchema`/`tokenHealthSchema`/`sessionActivityEntrySchema`/
  `nearCapacityBoxSchema`.
- Root/module barrel trims: the 9 tubeValidation preprocessor/parse helper lines, the date-field
  helpers section, ColorScheme/GlobalSettings/positionDisplayFormat/alphanumericConfig sub-schema
  lines, and every line paired with B/C.
- `passwordField` dedup: `passwordResetSchemas` owns it; `authSchemas` imports (not barreled) —
  closes the cross-file duplication that commit 0dfb8f74 only resolved within each file.

## D. Design calls — APPLIED (per approved recommendations)
| # | Item | Disposition |
|---|------|-------------|
| D1 | Server hand-rolled `'c/v'\|'c/mL'` in 5 files + 1 runtime array | **Applied** — wired to `CONCENTRATION_UNITS`/`ConcentrationUnit` (single source; behavior-neutral) |
| D2 | Export `type TubeSample` + annotate server `SampleData` create/toData | **Applied** — closed by narrowing `tubeSampleSchema.date` to string-only (dropped the never-matched `z.date()` branch; the schema is response-only and JSON dates are strings), then annotating `create`/`toData` with `TubeSample` and deleting the two inline 16-field shapes. `update` stays inline (distinct nullable-PATCH shape). Verified behavior-neutral. |
| D3 | `AdvancedSearchOptionsSchema.offset` silently ignored | **Applied** — removed from schema + client payload + server pass-through |
| D4 | `sortBy: z.string()` unconstrained | **Applied** — `TUBE_SORT_FIELDS` moved to shared-schemas, `sortBy: z.enum(TUBE_SORT_FIELDS)`; server derives via `typeof`; `SearchCriteriaMapper` guard dropped (boundary now rejects junk `sortBy` with a 400) |
| D5 | Supply schemas skip `optionalText`/`patchText` | **Deferred** — a prior session investigated and rejected this rollout (supplies has normalization traps) |
| D6 | `user_approved` ghost socket contract | **Applied removal** — schema entry + client handler deleted (server never emits; the `user_approved` audit-action string is a separate concern, kept) |
| D7 | HTTP tank-name cap 200 vs domain cap 100 | **Applied** — `storageRequestSchemas` imports `VALIDATION_LIMITS`; tank cap aligned to 100 (rack/box keep their 200 HTTP cap — no domain name limit) |
| D8 | Socket payload trim (14 events, unread fields) | **Left** — payloads match schemas; wire-contract edits carry disproportionate risk (per the login regression) |
| D9 | Researcher display formatters in the schema file | **Applied** — moved to `researchers/researcherFormatters.ts` (mirrors persons); barrel exports keep consumers unaffected |

## E. Server-side mirrors — APPLIED
`SupplyItem.ts` hand-rolled `VALID_STATUSES` → imports `supplyItemStatusValues` (mirror of the
equipment fix).

## F. Comments/headers — APPLIED
Stale `ErrorDto` comments (transportSchemas); audit "statistics" mention; dateFields phantom
"transformer registry" rationale; stale enumerations (lookups, securityMonitoring); equipment
"Status and category enums" → "Status enum"; auth `// Response schemas` divider (inaccurate — five
response schemas above it); passwordValidation restatement comments.

## Twins (parked, unchanged)
9 byte-identical supply↔equipment schema pairs join the full-stack twin ledger for the standing
consolidation decision.

---
**Verification (all green):** build:shared · tsc server+client · lint shared/server/client ·
Jest 675 · integration 31 · client Vitest 189 · client build.
**Coordinator fix during verify:** `searchCriteriaTypes.ts` import corrected to `import type`
(`TUBE_SORT_FIELDS` used only in a `typeof` query) + import-order autofix.
