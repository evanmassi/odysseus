# Audit Rubric — Immaculate-Codebase Pass

Handoff artifact for **audit finder agents**. Each finder audits exactly one file in parallel with
others; a single coordinator then aggregates, normalizes, and applies. This rubric is the shared
definition of a finding, so five independent finders converge on the same calls instead of drifting.

It does **not** replace `AGENTS.md` or `docs/audit-prompt.txt` — it distills the specific,
already-decided judgment calls from recent audits that those two documents don't spell out.

---

## How to use it (finder agent)

1. Read `AGENTS.md` (project conventions) and `docs/audit-prompt.txt` (the audit workflow + what to
   look for). Those are the base standard.
2. Read this rubric — the distilled calls below + the output contract.
3. Audit **only your assigned file**. Read the whole file first.
4. **Grep to verify every cross-file claim before you assert it** — consumers, dead exports, barrel
   re-export chains, duplication. A dead-code finding without grep proof is `needs-verification`, not
   `high`.
5. Return findings in the **Output Contract** format at the bottom. **Do not edit any file** — you
   find and propose; the coordinator applies.

**Anchor your judgment** to the exemplar files listed in `AGENTS.md` ("Exemplar Reference Files") —
that is what audited-clean looks like per layer. **Never** treat the `equipment`, `supplies`, or
`consumables` domains as references; `AGENTS.md` marks them un-audited, so their patterns are not the
standard.

**Special files:** tests (`*.test.ts`), ambient declarations (`*.d.ts`), and generated files get the
header, naming, dead-code, and import checks — but relax the prose-comment scrutiny; their
conventions differ. Note in the verdict if your file is one of these.

---

## What one file can't see (the fan-out blind spot)

A single-file finder looks **outward** — grepping the tree for consumers of its file's exports
(dead-code and dead-barrel-export proof). It **cannot** look **sideways**: it never reads the other
files, so it structurally under-detects **cross-file duplication** and **parallel shapes** (two
near-identical helpers in different domains; a hand-rolled type overlapping a shared schema defined
elsewhere).

Two mitigations, both required:
- **Finder:** for each non-trivial helper/const/type your file defines, grep the tree for its name
  and its distinctive logic. If a sibling reimplements it, flag it as duplication and cite both
  locations.
- **Coordinator:** runs a separate cross-file duplication/consolidation pass per batch to cover what
  1-file finders can't. Don't assume your duplication finding is complete — report what you can see.

---

## The bar

"Immaculate" = every line earns its place. No dead code, no restatement comments, no speculative
exports, no parallel shapes, no drift from the dominant convention. When in doubt, the smaller,
simpler, more honest version wins. Match the surrounding code's idiom, comment density, and naming —
don't impose a new style.

**Stay in scope.** The audit is the eight categories below — not a general refactor. Every finding
must cite one. Don't propose taste renames, reformatting, or re-architecture of working code that no
category backs.

Report **only real findings**. If a file is clean, say so — do not manufacture findings to look
thorough. A false positive costs the coordinator more than a quiet miss.

---

## Finding categories + established calls

### 1. File header

Every source file opens with a JSDoc header as the **very first content** — above all imports, with
nothing (no `"use client"`, no blank line, no comment) before it.

```typescript
/**
 * Plain English Title (not the ClassName/ComponentName)
 *
 * One line adding context beyond the filename.
 */
```

- **Title is plain English**, not the symbol name: "Audit Log Viewer", not "AuditLogViewer".
- **Description is optional, but if present it must add context beyond the title.** A description that
  only restates the title is a finding — drop it (title-only header is correct). *(established
  convention)*
- No bullet lists, feature enumerations, author tags, dates, "Refactored from", "Phase 2", ticket
  numbers.
- **Headers drift** — flag a header that lists consumers ("used by X, Y, Z") when that list is stale
  or the file has other consumers; drop the consumer list, keep the *why*/rationale. Move
  param-specific rationale into the relevant JSDoc `@param`.
- Flag stale references inside headers (e.g. an old token/symbol name the code no longer uses).
- Flag a missing header.

### 2. Comments & JSDoc

Philosophy: comments explain **why** (business rationale, non-obvious decisions), never **what** (the
code shows that). Best comment = a well-named function.

**KILL (flag for removal):**
- Restatement comments — `// Increment counter` over `counter++`.
- Restatement on config/options objects — `// Disable focus refetch` next to `refetchOnWindowFocus: false`. The property name is the doc.
- Section dividers that only restate the adjacent symbol (`// TUBE HANDLERS` over `setupTubeHandlers`) → remove. A divider with a strategy/why suffix earns its place → keep.
- Parenthetical restatements on dividers (`// Admin (admin-only operations)`) → keep the divider bare.
- Self-promotional: "INDUSTRY STANDARD", "BEST PRACTICE", "Enterprise-grade", "Type-safe", "A++++".
- Redundant markers: ✅, "NEW:", "FIXED:", "ARCHITECTURAL FIX:".
- Process refs: "Phase 2", "Refactored from", "migrated from", "expanded from", "Added in Jan 2025".
- Decorative dividers: `//=====`, `// ***`.
- Commented-out code with no explanation of why it's kept.

**KEEP (do not flag; flag if *missing* on a non-obvious spot):**
- Business rationale (why a timeout is 15min, why an algorithm was chosen).
- Non-obvious edge cases (null vs undefined handling, empty-value-placeholder logic, portal
  outside-click behavior, focus-return quirks).
- `eslint-disable` justifications.
- Workarounds with ticket refs; `TODO(date)` with ticket + context.

**JSDoc:** use for public API, complex return types, `@throws`. Skip for private helpers, simple
getters, obvious handlers, functions whose types already tell the story. Flag JSDoc that just repeats
param names/types (`@param data - the data`).

**Self-documenting check:** if a comment only compensates for a poor name, the finding is the *name*,
not the missing comment.

### 3. Types & Props

- **File-level Props convention:** a `*Props` interface used only in its own file with **no external
  importer** stays **unexported**. Grep for importers; zero → flag the `export` for removal.
  *(established convention)*
- **Unexport any type used only within its own file** (e.g. a size/state union referenced only in
  `types.ts`). Grep first.
- **No parallel shapes:** a hand-rolled interface overlapping a shared-schema type for the same
  concept → derive via `z.infer` or reuse. Flag the duplicate.
- **Redundant annotations the initializer already fixes** (`x: boolean = false`, `x: number = 0`) →
  drop. **But keep load-bearing widening** (`Set<string>` so `.has(str)` typechecks instead of a
  literal union) — do not flag those.
- Flag redundant `ComponentProps` re-declarations / dead type re-exports / dead `Omit`-then-re-add
  that yields a byte-identical alias (collapse to a plain alias or drop).

### 4. Dead / zombie code — **grep proof required**

Zero PRODUCTION consumers = dead (caller-first). A symbol used only by a dev preview, mock, or test
harness still counts as speculative/dead.

- Exported functions/vars/types/consts unused codebase-wide → flag with the grep result.
- Dead props (never passed by any caller), including always-true/always-false props that let you
  simplify the branch they gate.
- Dead object/map members, query keys, string-keyed config, result fields — TypeScript won't flag
  these; grep every usage.
- Unreachable / constant-by-guard branches: a 401/403 check after a general 4xx that already covers
  it; `{(a || b) && …}` inside a branch already gated on `a || b`; an `else` after an upstream return.
- Assigned-but-never-read variables; unused imports; permanently-stale feature flags; fully dead
  files.
- **No-op React hooks:** `useCallback`/`useMemo` with no dependency benefit (e.g. `useCallback` whose
  result is invoked immediately, or a memo of a trivial value) → simplify to a plain function/value,
  or convert an immediately-invoked `useCallback` into a real `useMemo` if memoization is actually
  wanted. *(established call)*

**Deletion grep discipline:** before declaring a file/barrel/export dead, grep **every** import form —
relative (`./x`, `../x`), aliased (`@app/x`, `@shared/x`), and `export *` re-export chains. A
partial-path grep misses aggregate barrels that re-export the target.

### 5. Barrels (`index.ts`)

Two-part decision, decided with **grep counts** (barrel-path imports vs deep-path imports):
- **DELETE** a barrel with zero external importers (everyone deep-imports it → it isn't the real
  surface).
- **KEEP-and-TRIM** a barrel that *is* the surface: re-export only the externally-consumed symbols,
  drop the rest (dead component/type re-exports).
- Don't go barrel-free. Barrel headers may stay title-only.

### 6. Duplication / DRY

- Logic duplicated within the file or elsewhere → consolidate to a shared helper/hook/const. Confirm
  ≥2 real callers before extracting; a single-caller helper → inline it (premature abstraction).
- Repeated Tailwind class strings → shared component, `cva` variant, or `clsx` helper. **Preserve the
  literal classes** when collapsing (e.g. merging identical color maps, hoisting a per-render map to a
  module `const` typed `Record<Union>` so the union and map stay in sync). *(established call)*
- Magic strings/keys duplicated across files (route paths, error codes, query-key roots, event names,
  toast messages) → centralize to the single owner (`@app/queryKeys`, shared-schemas, a `routes.ts`).
- A design token is the single source of truth — flag an inlined literal that duplicates a token value
  across files; inline references to the token instead.

### 7. Tech debt / simplification

- **Thin handler wrappers** that only forward to a store action / prop / function
  (`const handleX = () => clearX()`, or a `handleScrollOrResize` that only calls `updatePosition`) →
  pass the target directly. *(established call)*
- **Magic numbers** standalone or in collision/layout math → named consts, co-located, with the name
  mirroring the source (`MENU_WIDTH` mirrors `min-w-40`). Numbers *inside* a named-key config object
  are self-documenting — don't flag those.
- **Redundant params** always passed the same module singleton (a `queryClient` param that's always
  the imported instance) → drop the param, use the import.
- Extract a genuinely cohesive, separable concern (a password toggle, a clamp helper) when it clarifies
  — but **not** single-use extraction done only to shrink a file, and never the interdependent core of
  a large component.
- Overly complex logic, inconsistent async/error-handling styles, poor naming, prop-drilling a hook a
  child could call directly, missing error handling at system boundaries.
- **Awkward naming that restates its parent** (`storage.storage()`, `tubes.lists()` returning the same
  key as `tubes.list()`) → flag with a suggested rename.

### 8. Naming & organization

- Components PascalCase + domain prefix; hooks `useX`; services `XService`; stores `xStore`; type
  files `xTypes`; directories kebab-case; constants UPPER_CASE; booleans `is`/`has`/`should`.
- Component naming entity-first: domain → entity → specifics → suffix. Established suffixes only:
  Modal, Tab, Panel, Page, Form, Row, Button, Settings, Dashboard, Indicator, Field.
- `ui/components/` subdirs are feature-named, not UI-pattern-named: `gateway/` not `modals/`,
  `editor/` not `forms/`. Small shared presentational helpers may use a catch-all like `displays/`.
- File name must match what it exports/does; no generic names (`utils.ts`, `helpers.ts`, `misc.ts`).
- **Loose files:** if every sibling entry is a subdirectory, a loose file (other than `index.ts`)
  should move into the right subdir. When proposing a move, name what imports it — the import-path
  change is part of the finding.
- Sibling consistency: match the casing/convention already established by siblings.
- One file, one concern: split a file mixing unrelated exports (a component + an API helper).

---

## Verification discipline (applies to every finding)

- **Verify, don't guess.** Resolve "needs verification" by grepping; only escalate to the coordinator
  when the code genuinely can't answer it.
- **A DRY swap can change behavior.** Replacing inline logic with a shared util/type may differ on
  edge cases — diff the two and flag the behavior change; never present it as behavior-neutral when it
  isn't.
- **No tests = the diff is the gate.** If a change touches behavior-sensitive code with no coverage,
  say so in the finding; confidence rests on a careful diff trace, not "tests pass".
- **Decide by convention, with data.** For keep/remove/standardize calls (barrels, accessors, naming),
  measure the dominant convention with grep counts, don't assume.

---

## Output contract

Return this exact structure. No prose outside it.

```
File: <repo-relative path>
Verdict: CLEAN | <N> findings

Finding 1
- Category: header | comments | types-props | dead-code | barrel | duplication | tech-debt | naming
- Line(s): <exact line numbers>
- Observed: <what you saw, quoting the offending code>
- Confidence: high | medium | needs-verification
- Grep proof: <the searches you ran + counts, for any cross-file claim; "n/a" if in-file only>
- Fix: <the concrete edit — old → new, or a precise instruction the coordinator can apply verbatim>
- Cross-file impact: <barrels/consumers/import paths this fix also touches; "none" if isolated>

Finding 2
...
```

Rules for the report:
- **Fix must be application-ready** — exact replacement text or an unambiguous instruction, not "consider simplifying".
- Order findings by severity (dead code / behavior > convention > cosmetic).
- If CLEAN, output the `File:`/`Verdict: CLEAN` lines and nothing else.
- Never edit the tree. Never invent a finding to fill space.
