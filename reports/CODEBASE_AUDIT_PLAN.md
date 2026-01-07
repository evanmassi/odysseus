# Odysseus Codebase Audit Plan

**Created:** January 2026
**Purpose:** Systematic review of entire codebase before production deployment
**Methodology:** Domain-by-domain, layer-by-layer audit

---

## Audit Checklist Legend

- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Issues found (document in notes)

---

## Phase 1: Server-Side Audit

### 1.1 Domain Layer (`server/src/domain/`)

| Area | Status | Notes |
|------|--------|-------|
| **Entities** | [!] | Issues found - see below |
| `Tube.ts` | [!] | Deprecated `substr`, deprecated getters (536-706) |
| `Researcher.ts` | [!] | Deprecated `substr` on line 49 |
| `Person.ts` | [!] | Deprecated `substr` on line 62 |
| `User.ts` | [!] | Deprecated `substr` L230, console.warn L186, duplicate methods |
| `RefreshToken.ts` | [!] | Deprecated `substr` on line 84 |
| `UserSession.ts` | [!] | Deprecated `substr` on line 88 |
| `Configuration.ts` | [~] | To review |
| **Value Objects** | [x] | Clean - immutable, self-validating |
| `Location.ts` | [x] | Good - immutable, proper validation |
| `SampleData.ts` | [x] | Good - immutable, proper validation |
| `Media.ts` | [~] | To review |
| **Repository Interfaces** | [x] | Technology-agnostic, well-defined contracts |
| All repository interfaces | [x] | No infrastructure imports |
| **Domain Services** | [!] | Console usage in RolePermissionService |
| `RolePermissionService.ts` | [!] | console.error on lines 66, 81 |
| **Domain Events** | [~] | To review |
| Event definitions | [~] | To review |
| **Domain Errors** | [~] | To review |
| Custom error classes | [~] | To review |

**Checklist:**
- [x] No infrastructure dependencies in domain layer
- [x] Entities are properly encapsulated
- [x] Value objects are immutable
- [x] Repository interfaces are technology-agnostic

**Issues Found in Phase 1.1:**

| Priority | File | Line | Issue | Fix |
|----------|------|------|-------|-----|
| Medium | Tube.ts | 143 | `substr` deprecated | Use `substring(2, 11)` |
| Medium | User.ts | 230 | `substr` deprecated | Use `substring(2, 11)` |
| Medium | Person.ts | 62 | `substr` deprecated | Use `substring(2, 11)` |
| Medium | Researcher.ts | 49 | `substr` deprecated | Use `substring(2, 11)` |
| Medium | RefreshToken.ts | 84 | `substr` deprecated | Use `substring(2, 11)` |
| Medium | UserSession.ts | 88 | `substr` deprecated | Use `substring(2, 11)` |
| Medium | User.ts | 186 | `console.warn` in domain | Use logger or throw |
| Medium | RolePermissionService.ts | 66, 81 | `console.error` in domain | Use logger or throw |
| Low | User.ts | 632-635 | `updateActivity()` duplicates `recordActivity()` | Consolidate |
| Low | Tube.ts | 536-706 | Deprecated getters still exist | Remove if unused |

---

### 1.2 Application Layer (`server/src/application/`)

| Area | Status | Notes |
|------|--------|-------|
| **Commands** | [!] | console.log found |
| Tube commands | [~] | To review |
| User commands | [!] | console.log on line 173 |
| Researcher commands | [~] | To review |
| Auth commands | [~] | To review |
| **Queries** | [~] | To review |
| All query handlers | [~] | To review |
| **Services** | [!] | **ARCHITECTURE VIOLATIONS** |
| TubeService | [~] | To review |
| UserApplicationService | [!] | Imports @infrastructure (L16-17, L39) |
| AuditRetentionService | [!] | Imports @infrastructure (L4, L47) |
| ResearcherService | [~] | To review |
| ConfigurationService | [~] | To review |
| AuditService | [~] | To review |
| **DTOs** | [~] | To review |
| Request/Response DTOs | [~] | To review |
| **Event Handlers** | [~] | To review |
| All event handlers | [~] | To review |

**Checklist:**
- [x] Commands/queries follow CQRS pattern consistently
- [!] No direct database access (uses repositories) - **VIOLATIONS FOUND**
- [x] Proper error handling and validation
- [x] No business logic leaking to presentation layer

**Issues Found in Phase 1.2:**

| Priority | File | Line | Issue | Fix |
|----------|------|------|-------|-----|
| **High** | UserApplicationService.ts | 16-17 | Imports @infrastructure/database/DatabaseErrors | Create domain contract |
| **High** | UserApplicationService.ts | 39 | Uses PostgresContext directly | Inject via interface |
| **High** | AuditRetentionService.ts | 4, 47 | Imports AuditArchiveRepository from @infrastructure | Create domain interface |
| Medium | UserCommands.ts | 173 | Uses console.log | Use logger |

---

### 1.3 Infrastructure Layer (`server/src/infrastructure/`)

| Area | Status | Notes |
|------|--------|-------|
| **Database** | [~] | To review |
| `PostgresContext.ts` | [~] | Connection handling, pooling |
| `searchUtils.ts` | [x] | Clean - reviewed earlier |
| `migrations/` | [~] | To review |
| **Mappers** | [~] | To review |
| `TubeMapper.ts` | [~] | To review |
| `UserMapper.ts` | [~] | To review |
| `ResearcherMapper.ts` | [~] | To review |
| All other mappers | [~] | To review |
| **Repositories** | [!] | Console usage, SELECT * |
| `TubeRepository.ts` | [x] | Good - uses explicit TUBE_COLUMNS |
| `UserRepository.ts` | [~] | To review |
| `ResearcherRepository.ts` | [~] | To review |
| `SessionRepository.ts` | [~] | To review |
| `ConfigurationRepository.ts` | [!] | 15+ console calls, deprecated substr |
| `AuditRepository.ts` | [!] | Uses SELECT *, console.error |
| **Services** | [~] | To review |
| Email service | [~] | To review |
| Logging service | [~] | To review |
| **Security** | [~] | To review |
| Password hashing | [~] | To review |
| JWT handling | [~] | To review |
| **DI Container** | [!] | console.warn on line 905 |
| Dependency injection setup | [~] | To review |
| **Jobs** | [~] | To review |
| Background jobs | [~] | To review |
| **Events** | [~] | To review |
| Event bus implementation | [~] | To review |

**Checklist:**
- [x] No SQL injection vulnerabilities (parameterized queries)
- [~] Proper connection pooling - to verify
- [~] Transactions used where appropriate - to verify
- [~] Mappers handle all edge cases (nulls, etc.) - to verify

**Issues Found in Phase 1.3:**

| Priority | File | Line | Issue | Fix |
|----------|------|------|-------|-----|
| Medium | ConfigurationRepository.ts | multiple | 15+ console.log/error calls | Use logger |
| Medium | ConfigurationRepository.ts | 451 | Deprecated `substr` | Use `substring` |
| Medium | AuditRepository.ts | multiple | Uses SELECT * | Use explicit columns |
| Medium | AuditArchiveRepository.ts | 112, 188 | Uses SELECT * | Use explicit columns |
| Medium | PersonRepository.ts | 17, 26, 71 | Uses SELECT * | Use explicit columns |
| Low | ServiceContainer.ts | 905 | console.warn | Use logger |
| Low | ConfigurationService.ts | 149 | console.warn | Use logger |

**Note:** 44 total console usages found in infrastructure layer - should all use logger.

---

### 1.4 Presentation Layer (`server/src/presentation/`)

| Area | Status | Notes |
|------|--------|-------|
| **Controllers** | [!] | 2 console.error calls |
| TubeController | [~] | To review |
| UserController | [!] | console.error on line 165 |
| AuthController | [~] | To review |
| ResearcherController | [~] | To review |
| ConfigurationController | [!] | console.error on line 883 |
| AdminController | [~] | To review |
| **Routes** | [!] | 2 console.error calls |
| ConfigurationRouteModule | [!] | console.error on lines 433, 474 |
| **Middleware** | [~] | To review |
| Auth middleware | [~] | To review |
| Error handling middleware | [~] | To review |
| Logging middleware | [~] | To review |
| CORS middleware | [~] | To review |
| **Responses** | [~] | To review |
| Response formatters | [~] | To review |

**Checklist:**
- [~] All routes have proper authentication - to verify
- [~] Input validation on all endpoints - to verify
- [~] Consistent error response format - to verify
- [~] No business logic in controllers - to verify

**Issues Found in Phase 1.4:**

| Priority | File | Line | Issue | Fix |
|----------|------|------|-------|-----|
| Low | UserController.ts | 165 | console.error | Use logger |
| Low | ConfigurationController.ts | 883 | console.error | Use logger |
| Low | ConfigurationRouteModule.ts | 433, 474 | console.error | Use logger |

---

### 1.5 Server Cross-Cutting

| Area | Status | Notes |
|------|--------|-------|
| **Validation** | [~] | To review |
| Zod schemas | [~] | To review |
| **Utils** | [!] | console.log in featureFlags |
| Logger | [~] | To review |
| Date utilities | [~] | To review |
| featureFlags.ts | [!] | console.log on lines 77, 96, 139 |
| **Config** | [~] | To review |
| Environment config | [~] | To review |
| App config | [~] | To review |
| **Types** | [~] | To review |
| Global type definitions | [~] | To review |

**Issues Found in Phase 1.5:**

| Priority | File | Line | Issue | Fix |
|----------|------|------|-------|-----|
| Low | featureFlags.ts | 77, 96, 139 | console.log | Use logger |

---

## Phase 1 Summary: Server-Side Audit

### Critical Issues (Must Fix)
| # | Category | Issue | Impact |
|---|----------|-------|--------|
| 1 | Architecture | Application layer imports @infrastructure | Violates clean architecture |
| 2 | Architecture | AuditRetentionService uses concrete repository | Should use domain interface |

### Systemic Issues (Should Fix)
| # | Category | Count | Issue |
|---|----------|-------|-------|
| 1 | Deprecated API | 7 files | `substr()` → use `substring()` |
| 2 | Logging | 55+ | console.log/warn/error → use logger |
| 3 | SQL Pattern | 4 files | SELECT * → explicit columns |

### Technical Debt (Nice to Fix)
| # | Category | Issue |
|---|----------|-------|
| 1 | Tube.ts | 170+ lines of deprecated getters |
| 2 | User.ts | Duplicate updateActivity/recordActivity |

---

## Phase 2: Client-Side Audit

### 2.1 Domain: Tubes (`client/src/domains/tubes/`)

| Area | Status | Notes |
|------|--------|-------|
| **Hooks** | [ ] | |
| `useTubes.ts` | [ ] | |
| `useTubeStore.ts` | [ ] | |
| Other hooks | [ ] | |
| **Services** | [ ] | |
| Tube services | [ ] | |
| **Types** | [ ] | |
| Type definitions | [ ] | |
| **UI Components** | [ ] | |
| TubeForm | [ ] | |
| TubeCard | [ ] | |
| TubeDetails | [ ] | |
| Other components | [ ] | |

---

### 2.2 Domain: Storage (`client/src/domains/storage/`)

| Area | Status | Notes |
|------|--------|-------|
| **Hooks** | [ ] | |
| **Services** | [ ] | |
| **Types** | [ ] | |
| **UI Components** | [ ] | |
| Storage navigator | [ ] | |
| Tank/Rack/Box components | [ ] | |

---

### 2.3 Domain: Search (`client/src/domains/search/`)

| Area | Status | Notes |
|------|--------|-------|
| **Hooks** | [ ] | |
| **Stores** | [ ] | |
| `searchStore.ts` | [ ] | |
| **Engine** | [ ] | |
| `SearchEngine.ts` | [ ] | |
| **Lib** | [ ] | |
| `searchUtils.ts` | [ ] | |
| **UI Components** | [ ] | |
| SearchBar | [ ] | |
| SearchResults | [ ] | |
| FilterPanel | [ ] | |

---

### 2.4 Domain: Grid (`client/src/domains/grid/`)

| Area | Status | Notes |
|------|--------|-------|
| **Hooks** | [ ] | |
| **Services** | [ ] | |
| Navigation service | [ ] | |
| **Stores** | [ ] | |
| **Types** | [ ] | |
| **UI Components** | [ ] | |
| Grid components | [ ] | |
| Cell renderers | [ ] | |

---

### 2.5 Domain: Authentication (`client/src/domains/authentication/`)

| Area | Status | Notes |
|------|--------|-------|
| **Hooks** | [ ] | |
| **Services** | [ ] | |
| **Types** | [ ] | |
| **UI Components** | [ ] | |
| Login form | [ ] | |
| Auth guards | [ ] | |

---

### 2.6 Domain: Researchers (`client/src/domains/researchers/`)

| Area | Status | Notes |
|------|--------|-------|
| **Hooks** | [ ] | |
| **Services** | [ ] | |
| **Types** | [ ] | |
| **UI Components** | [ ] | |

---

### 2.7 Domain: Users (`client/src/domains/users/`)

| Area | Status | Notes |
|------|--------|-------|
| **Hooks** | [ ] | |
| **Services** | [ ] | |
| **Types** | [ ] | |
| **UI Components** | [ ] | |
| Profile components | [ ] | |
| Settings components | [ ] | |

---

### 2.8 Domain: Admin (`client/src/domains/admin/`)

| Area | Status | Notes |
|------|--------|-------|
| **Hooks** | [ ] | |
| **Services** | [ ] | |
| **Types** | [ ] | |
| **UI Components** | [ ] | |
| User management | [ ] | |
| Audit logs | [ ] | |
| System settings | [ ] | |

---

### 2.9 Client Infrastructure (`client/src/infrastructure/`)

| Area | Status | Notes |
|------|--------|-------|
| **API** | [ ] | |
| API client | [ ] | |
| Endpoints | [ ] | |
| **Cache** | [ ] | |
| Caching strategy | [ ] | |
| **Socket** | [ ] | |
| WebSocket handling | [ ] | |
| **Connection** | [ ] | |
| Connection status | [ ] | |
| **Optimistic Updates** | [ ] | |
| Optimistic update logic | [ ] | |

---

### 2.10 Client Shared (`client/src/shared/`)

| Area | Status | Notes |
|------|--------|-------|
| **UI Components** | [ ] | |
| Buttons | [ ] | |
| Inputs | [ ] | |
| Modals | [ ] | |
| Tables | [ ] | |
| Select | [ ] | |
| Tooltip | [ ] | |
| Other primitives | [ ] | |
| **Hooks** | [ ] | |
| Shared hooks | [ ] | |
| **Utils** | [ ] | |
| Date utilities | [ ] | |
| Format utilities | [ ] | |
| Other utilities | [ ] | |
| **Types** | [ ] | |
| Shared type definitions | [ ] | |
| **Styles** | [ ] | |
| Global CSS | [ ] | |
| Tailwind config | [ ] | |

---

### 2.11 Client App (`client/src/app/`)

| Area | Status | Notes |
|------|--------|-------|
| **Pages** | [ ] | |
| All page components | [ ] | |
| **Providers** | [ ] | |
| Context providers | [ ] | |
| **Routing** | [ ] | |
| Route definitions | [ ] | |
| **Query Client** | [ ] | |
| React Query setup | [ ] | |

---

## Phase 3: Shared Packages Audit

### 3.1 Shared Schemas (`packages/shared-schemas/`)

| Area | Status | Notes |
|------|--------|-------|
| **Tube Schemas** | [ ] | |
| **User Schemas** | [ ] | |
| **Auth Schemas** | [ ] | |
| **Researcher Schemas** | [ ] | |
| **Search Schemas** | [ ] | |
| **Storage Schemas** | [ ] | |
| **API Schemas** | [ ] | |
| **Constants** | [ ] | |

**Checklist:**
- [ ] All schemas have proper validation messages
- [ ] No duplicate schemas
- [ ] Consistent naming conventions
- [ ] Proper exports in index files

---

## Phase 4: Configuration & Documentation Audit

### 4.1 Configuration Files

| File | Status | Notes |
|------|--------|-------|
| `package.json` (root) | [ ] | Scripts, dependencies |
| `client/package.json` | [ ] | |
| `server/package.json` | [ ] | |
| `client/tsconfig.json` | [ ] | |
| `server/tsconfig.json` | [ ] | |
| `client/vite.config.ts` | [ ] | |
| `client/tailwind.config.js` | [ ] | |
| `client/.eslintrc.cjs` | [ ] | |
| `.env.example` files | [ ] | |
| `.gitignore` | [ ] | |

---

### 4.2 Documentation

| File | Status | Notes |
|------|--------|-------|
| `README.md` | [ ] | Setup instructions, features |
| `AGENTS.md` | [ ] | AI/automation guidelines |
| `LICENSE` | [ ] | License file present |
| `CHANGELOG.md` | [ ] | Version history (if exists) |
| Architecture docs | [ ] | |

---

## Phase 5: Dead Code & Duplicate Logic Hunt

### 5.1 Dead Code Identification

| Area | Status | Notes |
|------|--------|-------|
| **Unused exports** | [ ] | |
| **Unused components** | [ ] | |
| **Unused hooks** | [ ] | |
| **Unused services** | [ ] | |
| **Unused types** | [ ] | |
| **Commented-out code** | [ ] | |
| **Unused dependencies** | [ ] | |

---

### 5.2 Duplicate Logic

| Area | Status | Notes |
|------|--------|-------|
| **Date formatting** | [ ] | Consolidated to single util? |
| **Validation logic** | [ ] | Using shared schemas? |
| **API error handling** | [ ] | Consistent pattern? |
| **Form patterns** | [ ] | Reusable form logic? |
| **Type definitions** | [ ] | No duplicate types? |

---

## Phase 6: Functional Testing Checklist

### 6.1 Authentication Flows

| Test | Status | Notes |
|------|--------|-------|
| Login with valid credentials | [ ] | |
| Login with invalid credentials | [ ] | |
| Logout | [ ] | |
| Session persistence | [ ] | |
| Password reset (if exists) | [ ] | |

---

### 6.2 Tube Management

| Test | Status | Notes |
|------|--------|-------|
| Create tube | [ ] | |
| Edit tube | [ ] | |
| Delete tube | [ ] | |
| Move tube | [ ] | |
| Lock/unlock tube | [ ] | |
| View tube details | [ ] | |
| Batch operations | [ ] | |

---

### 6.3 Search & Filter

| Test | Status | Notes |
|------|--------|-------|
| Basic search | [ ] | |
| Multi-term search (AND logic) | [ ] | |
| Synonym matching | [ ] | |
| Alphanumeric variants (MCF7/MCF-7) | [ ] | |
| Filter by location | [ ] | |
| Filter by cell type | [ ] | |
| Filter by researcher | [ ] | |
| Filter by date range | [ ] | |
| Clear filters | [ ] | |

---

### 6.4 Storage Navigation

| Test | Status | Notes |
|------|--------|-------|
| Navigate to tank | [ ] | |
| Navigate to rack | [ ] | |
| Navigate to box | [ ] | |
| Box grid interaction | [ ] | |
| Position selection | [ ] | |

---

### 6.5 Admin Functions

| Test | Status | Notes |
|------|--------|-------|
| User management | [ ] | |
| Researcher management | [ ] | |
| View audit logs | [ ] | |
| System configuration | [ ] | |

---

## Phase 7: Pre-Deployment Checklist

### 7.1 Security

| Item | Status | Notes |
|------|--------|-------|
| No hardcoded secrets | [ ] | |
| Environment variables documented | [ ] | |
| CORS properly configured | [ ] | |
| Authentication on all protected routes | [ ] | |
| Input sanitization | [ ] | |
| SQL injection prevention | [ ] | |
| XSS prevention | [ ] | |

---

### 7.2 Performance

| Item | Status | Notes |
|------|--------|-------|
| Database indexes present | [ ] | |
| No N+1 queries | [ ] | |
| Proper pagination | [ ] | |
| Bundle size reasonable | [ ] | |
| No memory leaks | [ ] | |

---

### 7.3 Error Handling

| Item | Status | Notes |
|------|--------|-------|
| Global error boundary | [ ] | |
| API error handling | [ ] | |
| Form validation errors | [ ] | |
| Network error handling | [ ] | |
| Graceful degradation | [ ] | |

---

### 7.4 Deployment Readiness

| Item | Status | Notes |
|------|--------|-------|
| Production build works | [ ] | |
| Environment variables defined | [ ] | |
| Database migrations ready | [ ] | |
| Logging configured | [ ] | |
| Health check endpoint | [ ] | |

---

## Audit Progress Tracking

| Phase | Progress | Start Date | End Date |
|-------|----------|------------|----------|
| Phase 1: Server-Side | 80% | Jan 2026 | In progress |
| Phase 2: Client-Side | 0% | | |
| Phase 3: Shared Packages | 0% | | |
| Phase 4: Config & Docs | 0% | | |
| Phase 5: Dead Code Hunt | 0% | | |
| Phase 6: Functional Testing | 0% | | |
| Phase 7: Pre-Deployment | 0% | | |

---

## Issues Found

### Critical (Must Fix)

| # | Location | Description | Status |
|---|----------|-------------|--------|
| | | | |

### High Priority

| # | Location | Description | Status |
|---|----------|-------------|--------|
| | | | |

### Medium Priority

| # | Location | Description | Status |
|---|----------|-------------|--------|
| | | | |

### Low Priority (Nice to Have)

| # | Location | Description | Status |
|---|----------|-------------|--------|
| | | | |

---

## Notes

_Add general observations and notes here during the audit process._
