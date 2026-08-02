# Odysseus - Agent Development Guide

## Architecture Overview

Monorepo web application with Clean Architecture backend and domain-driven frontend.

```
odysseus-app/
├── client/              # React + Vite + TypeScript
├── server/              # Express + TypeScript + PostgreSQL
└── packages/
    └── shared-schemas/  # Zod schemas (single source of truth)
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TanStack Query, Zustand, Tailwind, React Hook Form |
| Backend | Express, PostgreSQL, Socket.IO, JWT |
| Shared | Zod schemas via `@odysseus/shared-schemas` |
| Testing | Vitest (client), Jest (server) |

---

## Server Architecture (Clean Architecture)

```
server/src/
├── domain/           # Business logic (no dependencies)
│   ├── entities/     # Tube, Researcher, User, Person, Configuration
│   ├── repositories/ # Interfaces only
│   ├── services/     # Domain services (AccessControl, Validation)
│   ├── events/       # Domain events
│   └── errors/       # Domain errors
├── application/      # Use cases
│   ├── services/     # TubeApplicationService, UserApplicationService, etc.
│   ├── commands/     # CQRS commands (Tank, Rack, Box, User, etc.)
│   ├── queries/      # CQRS queries
│   ├── dto/          # Data transfer objects
│   └── event-handlers/# Audit, Socket handlers
├── infrastructure/   # External concerns
│   ├── database/     # PostgresContext, schema, mappers
│   ├── repositories/ # Postgres implementations
│   ├── services/     # Bcrypt, JWT, Email services
│   └── di/           # ServiceContainer
└── presentation/     # HTTP layer
    ├── controllers/  # Request handlers
    ├── routes/       # Route modules
    └── middleware/   # Auth, validation, rate limiting
```

**Path Aliases**: `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`

---

## Client Architecture (Domain-Driven)

```
client/src/
├── app/              # App shell
│   ├── bootstrap/    # Initialization
│   ├── contexts/     # Theme, Bootstrap contexts
│   ├── stores/       # Global Zustand stores (error, modal)
│   ├── queryClient.ts
│   └── queryKeys.ts  # Centralized query keys
├── domains/          # Feature modules
│   ├── tubes/        # Tube management
│   ├── researchers/  # Researcher profiles
│   ├── donors/       # Donor registry & collection history
│   ├── equipment/    # Equipment inventory & maintenance
│   ├── supplies/     # Supply inventory & transactions
│   ├── search/       # Advanced search
│   ├── storage/      # Tank/Rack/Box configuration
│   ├── admin/        # Admin panel, user management
│   ├── users/        # User profile, sessions
│   ├── authentication/
│   ├── lab-management/
│   ├── help/
│   └── grid/         # Grid utilities
├── shared/           # Cross-cutting
│   ├── ui/           # Components, primitives, design tokens
│   ├── hooks/        # Reusable hooks
│   └── utils/        # Utilities
└── infrastructure/   # External services
    ├── api/          # HTTP client
    ├── socket/       # Socket.IO + query bridge
    └── connection/   # Network monitoring
```

**Path Aliases**: `@app/*`, `@domains/*`, `@shared/*`, `@infra/*`

**State Management**:
- **Server state**: TanStack Query (all API data)
- **UI state**: Zustand (navigation, selections, modals)
- Never store server data in Zustand

**Lab Context in Hooks**:
- Use `useLabId()` from `@domains/authentication` to get the current lab — returns `string | undefined` (undefined for system admins)
- Query key functions default `labId` to `''` when undefined — safe because hooks should use `enabled: !!labId` to prevent queries firing without a lab
- Query keys for lab-scoped domains include `labId` for cache partitioning between tenants
- System admins have no `labId` — lab-scoped queries are disabled, system admin dashboard renders instead

---

## Client Error Handling

One model, no exceptions: **the server owns error *text*; the client owns *presentation* and *cache reaction*.**

**The single resolver.** `getErrorMessage(error)` (`shared/utils/getErrorMessage.ts`) maps any thrown
value to the string shown to the user. Server 4xx responses carry specific, user-ready messages and
are surfaced **verbatim** — never rewrite them client-side. Infrastructure failures (network,
timeout, 5xx, 429) get canned copy. This is the *only* place error→text mapping lives; both global
handlers call it. Never hand-roll `error.message` fallbacks at a call site.

**One toaster per concern** (`app/cache/queryClient.ts`):
- `MutationCache.onError` is the **sole** mutation-error toaster — every failed mutation toasts here.
- `QueryCache.onError` toasts **infrastructure** errors only (`isInfrastructureError`); a 4xx query
  failure stays silent — the component renders its own error/empty state from the query's `isError`.
- A mutation hook's own `onError` **never toasts**. It does cache reactions (optimistic rollback,
  conflict invalidation) and logging only.

**Call style.** Component-triggered mutations use `mutation.mutate(vars, { onSuccess })`. Do **not**
drive a mutation with `mutateAsync` + `try/catch` — it forces an empty catch whose only job is to
swallow a rejection the global handler already owns. Reserve `mutateAsync` for genuine sequencing
(awaiting one mutation before starting the next).

**Escape hatch: `meta: { suppressErrorToast: true }`.** The one supported way to opt a mutation out
of the global toast — for a mutation that surfaces its error inline (e.g. a "current password is
incorrect" field error). There is no `meta.errorMessage` / per-operation-context convention: 5xx and
network copy is deliberately generic, because the user can't act on it and already knows what they
were doing.

**Stays local — these are not mutation errors:**
- Pre-flight validation guards — client-side checks *before* calling `mutate`.
- Partial-success `notifications.warning` on bulk operations.
- Non-mutation query/blob catches that must react in place (barcode resolve, export downloads).

**Enrichment lives on the server.** When an error deserves richer text than a generic line —
position-occupied naming the location, a human-readable conflict message — the *server* makes its
4xx message self-contained and the client shows it verbatim. The client never rebuilds error text
from IDs or cache. A mutation's `onError` may still *react* to a specific code (e.g. invalidate a
stale query on a 409 conflict), but it never toasts.

---

## Shared Schemas

All validation in `@odysseus/shared-schemas`. Always import from here, never define locally.

```typescript
import { createTubeRequestSchema, type TubeData } from '@odysseus/shared-schemas';
```

**Modules**: tubes, researchers, donors, search, storage, admin, auth, users, persons, events, infrastructure, equipment, supplies, labs, lookups, demo

**Response schemas live in shared-schemas, not in client services.** Every Zod schema used to validate an HTTP response — whether a data wrapper (`{ users: [...] }`), a standalone response (`{ message: string }`), or an event payload — must be defined in `@odysseus/shared-schemas`. Client service files import these schemas; they never define them inline with `z.object()`. The only valid `zod` import in client code is in `HttpClient` (the HTTP infrastructure layer).

**`success` belongs exclusively in the response envelope.** The server wraps all responses in `{ success: true, data: <T> }` via `ResponseBuilder.success()`. The client's `AuthenticatedHttpClient` strips this envelope automatically. Data schemas (the `<T>` inside) must never include a `success` field — it would be redundant and create a second source of truth for operation outcome.

---

## API Structure

| Module | Prefix | Auth | Description |
|--------|--------|------|-------------|
| Public | `/api/public` | No | Health, login, register, password reset |
| Auth | `/api/auth` | Yes | Session verify, logout, change password |
| Users | `/api/users` | Yes | Profile, settings, sessions |
| Tubes | `/api/tubes` | Yes | CRUD, locking, sharing |
| Researchers | `/api/researchers` | Yes | CRUD, stats |
| Search | `/api/search` | Yes | Advanced search, suggestions, saved searches |
| Storage | `/api/storage` | Yes | Lab storage, tank/rack/box CRUD |
| Admin | `/api/admin` | Admin | Users, security, audit, metrics |

---

## Database Schema (PostgreSQL)

| Table | Purpose |
|-------|---------|
| persons | User identity (name, email, position) |
| users | Authentication (credentials, role, settings) |
| researchers | Research profiles (links to persons) |
| tubes | Inventory records with locking |
| user_sessions | Concurrent session tracking |
| refresh_tokens | JWT refresh tokens |
| audit_log | Change tracking |
| audit_log_archive | Archived audit records |
| configuration_current | Current lab config (JSON) |
| configuration_versions | Config history |
| security_config | Security settings |

**Key Relationships**:
- `users` → `persons` (identity)
- `users` → `researchers` (optional link)
- `researchers` → `persons` (profile)
- `tubes` → `researchers` (ownership via `researcherId`)

---

## Exemplar Reference Files

When writing new code, pattern it after these already-audited files. They define the current baseline for each layer — structure, naming, header, comment density, error handling.

| Layer | Exemplar |
|-------|----------|
| Server controller | `server/src/presentation/controllers/DonorController.ts` |
| Server application service | `server/src/application/services/DonorApplicationService.ts` |
| Server domain entity | `server/src/domain/entities/Donor.ts` |
| Server repository interface | `server/src/domain/repositories/ResearcherRepository.ts` |
| Server repository (Postgres impl) | `server/src/infrastructure/repositories/ResearcherRepository.ts` |
| Server route module | `server/src/presentation/routes/DonorRouteModule.ts` |
| Client TanStack Query hook | `client/src/domains/donors/hooks/useDonorsQuery.ts` |
| Client feature component | `client/src/domains/donors/ui/components/DonorEditForm.tsx` |
| Client HTTP service | `client/src/domains/donors/services/DonorService.ts` |
| Client Zustand store | `client/src/app/stores/modalStore.ts` |
| Shared schema module | `packages/shared-schemas/src/donors/donorSchemas.ts` |

~~The equipment domain has NOT been audited.~~ **Stale — it was.** That line predated the layer
audits (2026-07-11/12), which do carry findings against `EquipmentApplicationService`,
`SupplyApplicationService`, and `SupplyItemRepository`. Every layer of this repo has now had a pass.

Still, prefer the exemplars above: the equipment and supply **item** services are large and were
never rewritten to the standard the Donor domain sets. Their shared **category/document** code is
the exemplar for a two-catalog abstraction — see *Equipment ↔ Supplies* below.

---

## Equipment ↔ Supplies

The two catalogs are **partly** the same thing. The line has been drawn, and it is not negotiable
per-PR: the category and document surfaces are shared, the item surface is permanently separate.

**Shared — do not re-duplicate.** Categories and documents were independent copies until the code
below was extracted. They differed by an ID prefix and a header comment, and that duplication had
already produced a real bug (supplies could reparent a category into a third level because only
equipment's `updateCategory` enforced the depth rule).

| Concern | Shared home |
|---------|-------------|
| Category behaviour | `domain/entities/Category.ts` — `EquipmentCategory` / `SupplyCategory` add only an ID prefix |
| Category persistence | `infrastructure/repositories/CategoryRepository.ts` (+ `CategoryMapper`) |
| Two-level depth rule | `application/guards/CategoryGuards.ts` |
| Document behaviour | `domain/entities/Document.ts` — subclasses add only an ID prefix |
| Document persistence | `infrastructure/repositories/DocumentQueries.ts` (+ `DocumentMapper`) |

**Separate — do not merge.** The item surfaces only *look* alike. They share ~6 of 15+ fields and
nothing else: equipment tracks asset lifecycle (serial, warranty, decommission, maintenance logs);
supplies tracks inventory (barcodes, stock ledger, packaging levels, reorder thresholds). The supply
item repository is 2.3× the size of equipment's for that reason. A generic "inventory item" would be
a ten-field lowest common denominator wrapped around two unrelated subsystems — the wrong
abstraction, and far harder to unwind than the duplication. Leave them alone.

**Types stay distinct even where code is shared.** `EquipmentCategory` and `SupplyCategory` are
separate classes on purpose, and the byte-identical Zod schema pairs are *deliberately* not merged.
Merging them would make a supply category assignable to an equipment repository. Share behaviour;
never share the identity. (The client made the same call: the shared components in
`shared/ui/components/inventory/` are generic over a structural shape, not a merged type.)

---

## Naming Conventions

| Category | Convention | Example |
|----------|------------|---------|
| Components | PascalCase | `TubeEditorModal.tsx` |
| Hooks | camelCase + use | `useTubesQuery.ts` |
| Services | PascalCase + Service | `TubeService.ts` |
| Stores | camelCase + Store | `modalStore.ts` |
| Directories | kebab-case | `ui/components/` |
| Constants | UPPER_CASE | `BOOTSTRAP_TIMEOUT` |
| Booleans | is/has/should prefix | `isLoading`, `hasError` |

- Named exports only (no default exports)
- Query keys from `@app/queryKeys`

### Component Naming (Entity-First)

Pattern: **Domain prefix → entity → specifics → suffix**.

Examples: `TubeLockNoteModal`, `AuthPasswordResetPage`, `ResearcherStatsPanel`.

**Established suffixes.** Reach for one of these before coining a new one:

| Common | `Modal`, `Panel`, `Tab`, `Page`, `Form`, `Row`, `Field`, `Button` |
|--------|---|
| Also in use | `Dialog`, `Section`, `List`, `Bar`, `Timeline`, `Table`, `Preview`, `Settings`, `Dashboard`, `Indicator`, `Controls`, `Selector`, `Shell` |

A suffix outside both rows needs a reason — `Rail` earned its place by naming a UI pattern none of
the above describes. Prefer the first row when either fits: a `Section` that opens over the page is
a `Modal`, and a `Table` that owns its own empty and loading states is usually a `Panel`.

### `ui/components/` Subdirectories

Feature-named and unprefixed — the domain path already provides context.

- ✅ `domains/tubes/ui/components/gateway/` (feature: the tube gateway)
- ✅ `domains/tubes/ui/components/editor/` (feature: the tube editor)
- ❌ `domains/tubes/ui/components/modals/` (UI pattern, not a feature)
- ❌ `domains/tubes/ui/components/forms/` (UI pattern, not a feature)

Small shared presentational helpers may use a catch-all like `displays/`.

### File Organization Rules

- **Generic filenames are banned**: no `utils.ts`, `helpers.ts`, `misc.ts`, or barrel-only `index.ts` that re-exports nothing meaningful. Name the file after what it contains (`validation.ts`, `dateFormat.ts`).
- **Loose files**: if every sibling entry in a directory is a subdirectory, don't drop a loose file alongside them — put it in the appropriate subdirectory or create a new one. The only exception is `index.ts` barrels.
- **Sibling consistency**: follow the casing/naming convention already established by sibling files in the directory.
- **One file, one concern**: don't mix unrelated exports (e.g. a React component and an API helper in the same file). Split them.

---

## Agent Instructions

### Mandatory Rules

- **No bandaid solutions** - All fixes must be architecturally sound
- **No zombie code** - Delete unused code immediately
- **No redundant systems** - One way to do each thing
- **No breaking changes** - Test before committing
- **All code must be elegant, simple, and pragmatic**
- **Never delete files without explicit confirmation**

### Pre-Implementation Checklist

1. **Read the schema** from `@odysseus/shared-schemas` BEFORE writing code
2. **Verify exact field names** - don't assume (it's `researcherId`, not `researcher`)
3. **Check data types** - all IDs are strings
4. **Check for foreign keys** - resolve IDs to names in UI, not database
5. **Use existing patterns** - search codebase before creating new approaches
6. **Import from shared schemas** - never define types locally

### Write-Time Discipline

Rules that prevent whole classes of bugs at write-time. Apply these while writing, not after.

**1. End-to-end field trace.** When adding a request/criteria/filter/command field, trace it from entry point (HTTP body, function argument) through every layer to its final consumer (SQL clause, external API call, rendered output) in the same change. If no layer reads it at the bottom, don't add it — a field that's declared and spread but never read is a silently-dropped filter, not a feature.

**2. Overwrite vs intersect.** `{ ...userInput, field: systemValue }` silently discards the user's `field`. When merging caller input with server-side constraints (auth scope, permissions, allowed IDs), decide explicitly:
- **Preserve** the user's value (no merge needed)
- **Intersect** it with the constraint (e.g. `userInput.ids.filter(id => allowedIds.has(id))`)
- **Replace** it with the system value — and if so, comment *why*, because replacement without a reason is almost always a bug

**3. One shape per concept.** Never hand-roll an interface that overlaps a shared-schema type for the same concept. Derive from the schema (`z.infer<typeof ...>`) or reuse the existing type. Two shapes for the same thing drift apart and produce contract bugs.

**4. Caller-first: no speculative exports.** Don't export a schema, type, route, handler, query key, or method without a real caller wired up in the same change. This applies to every layer — a Zod schema with no `.parse()` call is dead; a route with no client service calling it is dead; an exported type that's only forwarded through other signatures (never read as a field) is dead.

**5. No unused parameters.** Every declared parameter must be read by at least one caller. A parameter that looks reasonable but nothing passes is worse than no parameter — it implies a capability that doesn't exist.

### Schema Verification

```typescript
// ✅ CORRECT - Import from shared package
import { createTubeRequestSchema, type TubeData } from '@odysseus/shared-schemas';

// ❌ WRONG - Never import from local paths
import { TubeData } from '../types/tube';
```

### Foreign Key Resolution (Presenter Pattern)

```typescript
// ✅ CORRECT - Resolve IDs to names in UI layer
const { data: researchers = [] } = useResearchersQuery();
const researcherMap = new Map(researchers.map(r => [r.id, r]));
const displayName = researcherMap.get(tube.researcherId)?.firstName ?? 'Unknown';

// ❌ WRONG - Never expect name stored in tube
const name = tube.researcher; // This field doesn't exist!
```

### Common Mistakes to Avoid

**Adding a new lookup category** requires updates in THREE places:
1. `packages/shared-schemas/src/lookups/lookupSchemas.ts` — add to `LOOKUP_CATEGORIES`. This is the single source: the `LookupCategory` type derives from it, and `LookupValue.validate()` checks against it.
2. `server/src/infrastructure/database/migrations/` — update the `lookup_values_category_check` constraint
3. `server/src/application/services/LookupValueApplicationService.ts` — if the new category references a table other than `tubes`, add a branch in `getUsageCounts()`, `rename()`, and `delete()` to query the correct table. Also update `CATEGORY_USAGE_LABELS` in the client's `CatalogTab.tsx`.

Lookup categories are NOT all tube-related. Each category maps to a different table for usage counts, rename cascades, and delete protection:
- `species`, `source`, `media` → `tubes` table
- `specimen_type` → `donor_collection_history` table (via `DonorRepository`)
- `equipment_maintenance_type` → `equipment_maintenance_log` table (via `EquipmentItemRepository`)

```typescript
// ❌ WRONG - Outdated assumptions
interface BadTube {
  researcher: string;    // OLD! Now uses researcherId
  rackId: number;        // WRONG! All IDs are strings
}

// ✅ CORRECT - Check shared-schemas first
interface CorrectUsage {
  researcherId: string;  // Foreign key (ID, not name)
  rackId: string;        // All IDs are strings
}
```

---

## Code Quality Rules

| Rule | Do | Don't |
|------|-----|-------|
| Type Safety | Define types centrally, use `import type` | Use `any`, define inline |
| Promises | Always `await` or `.catch()` | Leave floating promises |
| Imports | Delete unused immediately | Leave "for later" |
| Architecture | Domain uses interfaces only | Domain importing from infrastructure |
| Null handling | Use `undefined` and optional params | Use `null` for optional values |
| Dead code | Delete immediately | Leave "just in case" |

### Accessibility

Always include keyboard support for interactive elements:
```typescript
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
>
```

---

## Comment Standards

**Philosophy**: Comments explain **why** (business rationale, non-obvious decisions), not **what** (code shows this). The best comment is a well-named function.

### File Headers

Every source file opens with a JSDoc header as the **very first content in the file — above all imports**, with no code, comments, `"use client"` directives, or blank lines before it.

```typescript
/**
 * Audit Log Viewer
 *
 * Displays filterable audit history with export capabilities.
 */
import { ... } from '...';
```
- Title in plain English (not "AuditLogViewer")
- One-line description adding context beyond filename
- No bullet lists or feature enumerations
- No author tags, date stamps, "Refactored from…", "Phase 2", or ticket numbers in the header

### DO Comment

| Category | Example |
|----------|---------|
| Business rationale | `// OAuth 2.0 dual-token: access expires in 15min for security` |
| Non-obvious edge cases | `// Skip validation if position unchanged - prevents false positives` |
| Workarounds | `// Temporary: string union until shared-schemas v2.0 - ticket #456` |
| TODO with context | `// TODO(2025-01-15): Migrate to domain events - ticket #234` |

### NEVER Write

| Category | Examples to Avoid |
|----------|-------------------|
| Self-promotional | "INDUSTRY STANDARD", "BEST PRACTICE", "Enterprise-grade", "A++++ QUALITY" |
| Redundant markers | ✅ checkmarks, "NEW:", "FIXED:", "ARCHITECTURAL FIX:" |
| Obvious explanations | `// Increment counter` above `counter++` |
| Process references | "Phase 2", "Refactored from", "Added in January 2025" |
| Excessive dividers | `//=====`, `// ***`, decorative headers |

### JSDoc Rules

**USE for**: Public API functions, complex return types, `@throws` declarations

**SKIP for**: Private helpers, simple getters, obvious handlers, functions where types tell the story

```typescript
// ❌ BAD - Restates signature
/** @param data - The tube data @returns The tube */
function createTube(data: CreateTubeRequest): Promise<TubeData>

// ✅ GOOD - Adds behavioral context
/** Creates tube with position conflict validation. Emits 'tube_created' socket event. */
function createTube(data: CreateTubeRequest): Promise<TubeData>
```

### Self-Documenting Code

Before adding a comment, ask: "Can I rename this to eliminate the need?"

```typescript
// ❌ BAD - Comment compensates for poor naming
function process(t: Tube): boolean { // Check if tube can be moved

// ✅ GOOD - Name eliminates need for comment
function canUserMoveTube(tube: Tube, user: User): boolean
```

---

## Anti-Patterns (Learned from Audit)

These are recurring problems found across **every layer** of the codebase. Follow these rules to avoid creating technical debt.

### No Speculative Code

Only implement what is needed **right now** by a real caller. This applies everywhere — repository methods, service methods, controller endpoints, query keys, event handlers. Never create stubs, placeholder methods, or "future use" code. If nothing calls it today, don't write it.

```typescript
// ❌ WRONG - Repository method "for later"
async findByDateRange(start: Date, end: Date): Promise<Tube[]> {
  return []; // TODO: implement
}

// ❌ WRONG - Controller stub
async getSuggestions(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: [] });
}

// ❌ WRONG - Query key for an endpoint that doesn't exist yet
suggestions: (query: string) => [...queryKeys.search.all, 'suggestions', query] as const,

// ✅ CORRECT - Don't write any of the above until the feature is being built
```

### No Parallel Systems

When infrastructure exists for a concern, use it. Never create a second way to do the same thing — parallel systems drift apart and produce inconsistent behavior.

| Concern | Use this | Not this |
|---------|----------|----------|
| Config access | `ConfigurationService` | Direct `process.env` reads |
| Controller auth | `BaseController` helpers (`this.extractUserId(req)`, `this.extractLabId(req)`, `this.getAuthenticatedUser(req)`) | Raw `req.user` access |
| Success responses | `ResponseBuilder.success(data)` | Raw `{ success: true, data }` objects |
| Error handling | `handleControllerError` from `@presentation/utils/errorHandler` | Per-controller `handleError` methods |
| Lab-scoped by-id access | repo scopes `lab_id` in SQL (`findById(id, labId)`); cross-lab is an explicit `findByIdAnyLab` / `findByIdForRequester` | bare `findById(id)` on a `lab_id`-bearing table |

### No Convenience Wrappers

Don't add getters or helpers that just forward to a sub-object. They create a second access path that has to be maintained and eventually deprecated.

```typescript
// ❌ WRONG - Convenience getter on entity
get tankId(): string { return this.location.tankId; }

// ✅ CORRECT - Callers access the sub-object directly
tube.location.tankId
```

### Constructor Deps Pattern

When a class takes a deps interface with many fields, store the deps object directly. Don't manually copy each field to a private property.

```typescript
// ❌ WRONG - 20+ lines of boilerplate
private userRepo: UserRepository;
private tubeRepo: TubeRepository;
constructor(deps: ServiceDeps) {
  this.userRepo = deps.userRepo;
  this.tubeRepo = deps.tubeRepo;
  // ... 18 more
}

// ✅ CORRECT - Single field
constructor(private deps: ServiceDeps) {}
// Access via this.deps.userRepo
```

### DRY — Duplication to Watch For

Before writing something that feels familiar, search for the existing home. Before extracting, confirm there are at least two real callers.

- **Duplicated logic blocks**: two+ places doing the same work with trivial variation → extract to a shared helper, hook, base method, or utility.
- **Premature abstractions**: a helper with a single caller → inline it. Three similar lines beat a premature abstraction.
- **Magic numbers/strings**: unnamed literals that recur or carry meaning (`15 * 60 * 1000`, `"admin"`, status codes) → named constants, co-located with related values.
- **Repeated string literals** across files (route paths, error codes, query keys, event names, toast messages) → centralize in `@app/queryKeys`, a `routes.ts`, or shared-schemas.
- **Repeated Tailwind class strings** → extract to a shared component, a `cva` variant, or a `clsx` helper.
- **Near-duplicate components** (two components ~90% identical with a small variant) → collapse into one with props.
- **Repeated conditional guards** (same auth/permission check pasted at multiple call sites) → extract to a predicate or middleware.
- **Copy-paste handlers** (same `onChange`/`onSubmit`/validation logic across forms) → extract to a shared hook.
- **Repeated mapper logic** (same DTO↔entity conversion in multiple repos/services) → single mapper module.
- **Repeated SQL fragments** (same `WHERE`/`JOIN` snippets across repo methods) → query builder or constant clause.
- **Parallel type shapes** for the same concept → see *Write-Time Discipline #3*.

When extracting, name the destination explicitly and prefer an existing home over a new file.

### Cross-Layer Imports

Respect layer boundaries. Violations turn into circular dependencies, leak infrastructure into business logic, and break testability.

| Rule | Example of violation |
|------|---------------------|
| Domain never imports from infrastructure or presentation | `domain/entities/Tube.ts` importing `PostgresContext` |
| Client never imports from `server/` | `client/.../useTubes.ts` importing a server service |
| Presentation never reaches into another domain's internals | `presentation/controllers/TubeController.ts` importing `application/services/researcher/internal/...` — use the sibling domain's public index |
| Sibling client domains never reach into each other's internals | `domains/tubes/...` importing `domains/researchers/hooks/internal/...` — import from `domains/researchers` public exports only |
| Barrel files (`index.ts`) only re-export what's actually consumed externally | a barrel re-exporting internal helpers that nothing outside the folder uses |

---

## Security

- JWT tokens with refresh token rotation
- Validate all inputs server-side with Zod
- Use bcrypt for password hashing
- Parameterized queries (repository pattern)
- Never commit secrets or API keys

---

## Windows Environment

When using Bash tool on Windows:
- Use `dir`, `copy`, `move` (not `ls`, `cp`, `mv`)
- **Never use `2>nul`** - creates literal file named "nul"
- Prefer dedicated tools: Read (not `cat`), Glob (not `find`), Grep (not `findstr`)
- Only use Bash for: npm, node, git, builds, tests

---

## Commands

```bash
npm run dev           # Full stack (port 3000 + 3001)
npm run dev:client    # Client only (port 3000)
npm run dev:server    # Server only (port 3001)
npm run build         # Production build
npm test              # All tests
npm run lint          # Lint client
npm run typecheck     # Type check
```
