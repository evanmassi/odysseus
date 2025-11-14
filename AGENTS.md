# Odysseus - Agent Development Guide

## Project Overview
Odysseus is a professional liquid nitrogen tube inventory management system built as an Electron desktop application with a React frontend and Express/Node.js backend, following **Clean Architecture** and **Domain-Driven Design** principles.

## Architecture

### Tech Stack

#### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS with custom design system
- **State Management**:
  - React Query (TanStack Query v5) - Server state & caching
  - Zustand - UI state only (navigation, selections)
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Lucide React icons, React Hot Toast notifications
- **Real-time**: Socket.IO client for live updates

#### Backend (Clean Architecture)
- **Framework**: Express + TypeScript + Socket.IO
- **Database**: SQLite with repository pattern
- **Architecture Layers**:
  - **Domain**: Business logic, entities, value objects, domain services
  - **Application**: Use cases, DTOs, application services
  - **Infrastructure**: Repositories, external services, Firebase sync
  - **Presentation**: Controllers, route modules, middleware
- **Validation**: Zod schemas from `@odysseus/shared-schemas`
- **Authentication**: JWT-based session service with OAuth 2.0 tokens

#### Desktop
- **Electron**: Desktop wrapper with IPC communication
- **Data Storage**: SQLite file in user data directory

#### Monorepo
- **Shared Packages**: `@odysseus/shared-schemas` - Single source of truth for validation
- **Package Manager**: npm workspaces

### Project Structure (Clean Architecture + DDD)

```
odysseus-app/
├── packages/                         # Monorepo shared packages
│   └── shared-schemas/               # ⭐ SINGLE SOURCE OF TRUTH
│       ├── src/
│       │   ├── tubes/                # Tube schemas & formatters
│       │   │   ├── tubeSchemas.ts
│       │   │   ├── tubeValidation.ts
│       │   │   ├── tubeFormatters.ts
│       │   │   └── tubeMappers.ts
│       │   ├── researchers/          # Researcher schemas & utilities
│       │   │   └── researcherSchemas.ts
│       │   ├── search/               # Search schemas
│       │   │   └── searchSchemas.ts
│       │   ├── laboratory/           # Lab configuration schemas
│       │   │   └── configurationSchemas.ts
│       │   ├── infrastructure/       # Transport/envelope schemas
│       │   │   └── transportSchemas.ts
│       │   ├── api/                  # API shared schemas
│       │   │   └── apiSchemas.ts
│       │   ├── constants/            # System constants
│       │   └── index.ts              # Barrel export (public API)
│       └── dist/                     # Compiled (CJS + ESM + types)
│
├── client/                           # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── app/                      # App shell & configuration
│   │   │   ├── providers/            # React Query, Auth providers
│   │   │   ├── queryClient.ts        # React Query configuration
│   │   │   ├── queryKeys.ts          # Query key factory
│   │   │   └── hooks/                # App-level hooks
│   │   ├── domains/                  # Feature-first (DDD bounded contexts)
│   │   │   ├── tubes/
│   │   │   │   ├── ui/components/    # Tube UI components
│   │   │   │   ├── hooks/            # Tube-specific hooks (React Query)
│   │   │   │   ├── services/         # TubeService (API client)
│   │   │   │   ├── stores/           # UI state (Zustand)
│   │   │   │   ├── config/           # Field configuration
│   │   │   │   ├── types/            # Tube types (re-exports from shared)
│   │   │   │   └── index.ts          # Public API
│   │   │   ├── researchers/
│   │   │   │   ├── ui/components/
│   │   │   │   ├── hooks/            # useResearchersQuery, mutations
│   │   │   │   ├── services/         # ResearcherService
│   │   │   │   └── index.ts
│   │   │   ├── search/
│   │   │   │   ├── ui/components/    # Search UI, filters
│   │   │   │   ├── services/         # SearchService
│   │   │   │   ├── lib/              # Search utilities, grouping
│   │   │   │   └── types/
│   │   │   ├── laboratory/           # Lab configuration domain
│   │   │   │   ├── hooks/
│   │   │   │   ├── stores/
│   │   │   │   └── services/
│   │   │   └── authentication/       # Auth domain
│   │   │       ├── ui/components/
│   │   │       ├── application/      # useAuth hook
│   │   │       └── services/
│   │   ├── shared/                   # Cross-cutting concerns
│   │   │   ├── ui/                   # Reusable UI primitives
│   │   │   ├── hooks/                # Generic hooks (useDebounce, etc.)
│   │   │   ├── utils/                # Pure utility functions
│   │   │   ├── types/                # Shared types
│   │   │   └── constants/            # Shared constants
│   │   ├── infrastructure/           # External concerns
│   │   │   ├── api/                  # HTTP client (axios wrapper)
│   │   │   ├── socket/               # Socket.IO client & query bridge
│   │   │   ├── cache/                # Cache warming service
│   │   │   └── optimistic/           # Optimistic update utilities
│   │   └── __tests__/                # Global test utilities
│   └── dist/                         # Built frontend
│
├── server/                           # Express backend (Clean Architecture)
│   ├── src/
│   │   ├── domain/                   # Domain layer (business logic)
│   │   │   ├── entities/             # Domain entities (Tube, Researcher, User)
│   │   │   ├── valueObjects/         # Value objects (Permission, etc.)
│   │   │   ├── repositories/         # Repository interfaces
│   │   │   ├── services/             # Domain services
│   │   │   │   ├── AccessControlService.ts
│   │   │   │   ├── TubePositionService.ts
│   │   │   │   └── ValidationService.ts
│   │   │   └── errors/               # Domain-specific errors
│   │   ├── application/              # Application layer (use cases)
│   │   │   ├── services/             # Application services
│   │   │   │   ├── TubeApplicationService.ts
│   │   │   │   └── ResearcherApplicationService.ts
│   │   │   └── dto/                  # Data Transfer Objects
│   │   │       ├── TubeDto.ts
│   │   │       └── ResearcherDto.ts
│   │   ├── infrastructure/           # Infrastructure layer
│   │   │   ├── database/             # Database access
│   │   │   │   ├── SQLiteContext.ts  # DB connection
│   │   │   │   └── migrations/       # DB migrations
│   │   │   ├── repositories/         # Concrete repositories
│   │   │   │   ├── SQLiteTubeRepository.ts
│   │   │   │   ├── SQLiteResearcherRepository.ts
│   │   │   │   └── SQLiteUserRepository.ts
│   │   │   └── services/             # External services
│   │   │       └── JwtSessionService.ts
│   │   ├── presentation/             # Presentation layer (API)
│   │   │   ├── controllers/          # HTTP controllers
│   │   │   │   ├── TubeController.ts
│   │   │   │   ├── ResearcherController.ts
│   │   │   │   ├── AuthController.ts
│   │   │   │   └── SearchController.ts
│   │   │   ├── routes/               # Route modules (feature-based)
│   │   │   │   ├── AuthRouteModule.ts
│   │   │   │   ├── ResourceRouteModule.ts
│   │   │   │   └── SearchRouteModule.ts
│   │   │   └── middleware/           # Express middleware
│   │   ├── services/                 # Legacy services (being migrated)
│   │   │   ├── sync/                 # Firebase sync engine
│   │   │   │   ├── syncEngine.ts
│   │   │   │   └── firebaseService.ts
│   │   │   └── cacheService.ts
│   │   └── index.ts                  # Server entry point
│   ├── data/                         # SQLite database (development)
│   │   └── odysseus.sqlite
│   └── dist/                         # Built backend
│
├── electron/                         # Electron main process
│   └── main.ts
└── dist/                            # Packaged application (.exe)
```

### Path Aliases

#### Client
- `@app/*` → `client/src/app/*`
- `@domains/*` → `client/src/domains/*`
- `@shared/*` → `client/src/shared/*`
- `@infra/*` → `client/src/infrastructure/*`
- `@odysseus/shared-schemas` → `packages/shared-schemas` (⭐ **Always use this**)

#### Server
- `@domain/*` → `server/src/domain/*`
- `@application/*` → `server/src/application/*`
- `@infrastructure/*` → `server/src/infrastructure/*`
- `@presentation/*` → `server/src/presentation/*`
- `@odysseus/shared-schemas` → `packages/shared-schemas` (⭐ **Always use this**)

### Validation Schema Architecture (Monorepo Pattern)

**CRITICAL:** All validation schemas are centralized in `@odysseus/shared-schemas` package.

#### Schema Import Rules:
1. **ALWAYS** import from `@odysseus/shared-schemas` - NEVER from local paths
2. **Client** uses shared schemas for validation, type safety, and formatting
3. **Server** uses shared schemas for HTTP request validation and DTOs
4. **Never** create duplicate schemas in client or server

#### Available Schemas & Exports:

**Tube Schemas**:
- Constants: `CONCENTRATION_UNITS`, `UNKNOWN_RESEARCHER`
- Domain: `tubeDataSchema`, `tubeSampleSchema`, `tubeLocationSchema`
- API: `createTubeRequestSchema`, `updateTubeRequestSchema`, `tubeQueryFiltersSchema`
- Types: `TubeData`, `TubeSample`, `CreateTubeRequest`, `UpdateTubeRequest`
- Utilities: `validateTubePosition`, `transformLegacyTubeData`
- Formatters: `formatConcentrationDisplay`, `formatTubeLocation`, `formatTubeDate`
- Mappers: `tubeDataToCreateRequest`

**Researcher Schemas**:
- Schemas: `researcherSchema`, `createResearcherProfileSchema`, `updateResearcherProfileSchema`
- Types: `Researcher`, `CreateResearcherProfile`, `UpdateResearcherProfile`
- Formatters: `formatResearcherListDisplay`, `formatResearcherDropdownDisplay`, `formatResearcherFullDisplay`
- Utilities: `sortResearchers`, `findSimilarResearchers`, `calculateNameSimilarity`

**Search Schemas**:
- Schemas: `SearchFiltersSchema`, `AdvancedSearchOptionsSchema`, `SearchResultSchema`
- Types: `SearchFilters`, `SearchResult`, `GroupedResult`, `SavedSearch`

**Configuration Schemas**:
- Schemas: `LabConfigurationSchema`, `TankConfigurationSchema`, `GridConfigurationSchema`
- Types: `LabConfiguration`, `TankConfiguration`, `BoxConfiguration`

**Transport Schemas**:
- Functions: `successEnvelopeSchema()`, `errorEnvelopeSchema()`, `paginatedEnvelopeSchema()`
- Class: `ApiError`
- Types: `PaginatedResult`, `BatchResult`

**API Schemas**:
- Schemas: `websocketMessageSchema`, `queryParametersSchema`
- Constants: `API_ERROR_CODES`

#### Example Usage:
```typescript
// ✅ CORRECT - Import from shared package
import {
  createTubeRequestSchema,
  type TubeData,
  formatResearcherDropdownDisplay,
  UNKNOWN_RESEARCHER
} from '@odysseus/shared-schemas';

// Validate tube data
const result = createTubeRequestSchema.parse(formData);

// Format researcher for display
const displayName = formatResearcherDropdownDisplay(researcher);

// Use constant
const fallback = UNKNOWN_RESEARCHER; // "Unknown"

// ❌ WRONG - Never import from local schema files
import { TubeData } from '../types/tube';  // This will cause type mismatches
```

## Development Commands

### Setup & Installation
```bash
npm install                    # Install root dependencies
cd packages/shared-schemas && npm install && npm run build
cd client && npm install      # Install client dependencies
cd server && npm install      # Install server dependencies
```

### Development
```bash
npm run dev                    # Start full dev environment (server + client + electron)
npm run dev:client            # Start only React dev server (port 3000)
npm run dev:server            # Start only Express server (port 3001)
npm run dev:electron          # Start only Electron (requires frontend running)
```

### Building & Packaging
```bash
npm run build                 # Build both client and server
npm run build:client         # Build only React frontend
npm run build:server         # Build only Express server
npm run package              # Package entire app for distribution
npm run package:win          # Package for Windows specifically
```

### Testing
```bash
npm test                      # Run all tests (client + server)
npm run test:client          # Run frontend tests (Vitest)
npm run test:server          # Run backend tests (Jest)
```

### Utilities
```bash
npm run clean                 # Clean all build directories
npm start                     # Start electron with built files
```

## Key Features & Components

### Core Functionality
- **Tube Management**: Create, edit, delete, batch operations on tube records
- **Inventory Organization**: Tank/Rack/Box/Position grid system for physical location tracking
- **Researcher Management**: Full CRUD for researcher profiles with foreign key relationships
- **Advanced Search**: Multi-field search with grouping, relevance scoring, and saved searches
- **Position Validation**: Conflict detection, proximity warnings, and constraint validation
- **Access Control**: Role-based permissions (admin, user, viewer)
- **Real-time Updates**: Socket.IO for live synchronization between instances
- **Data Export/Import**: CSV import/export functionality
- **Firebase Sync**: Optional cloud synchronization for multi-user collaboration
- **Color Visualization**: Color-coded tube visualization system
- **Batch Operations**: Bulk edit, delete, and create operations with optimistic updates

### Main Components

#### Tube Domain
- **TubeGrid**: Visual grid showing tube positions in racks/boxes
- **TubeModal**: Create/edit tube with React Hook Form + Zod validation
- **BatchEditModal**: Bulk editing with field conflict detection
- **TubeInfoPanel**: Display detailed tube info with researcher name resolution
- **TubeForm**: Reusable form component with dynamic field configuration
- **VirtualizedSearchResults**: High-performance search results with virtualization

#### Researcher Domain
- **ResearcherManagement**: Full CRUD interface for researchers
- **DuplicateWarningModal**: Similarity detection to prevent duplicate researchers
- **ConfirmDeactivateModal**: Safe deactivation with tube reassignment warnings

#### Search Domain
- **SearchContainer**: Advanced search interface with filters
- **FilterPanel**: Dynamic filter UI based on available options
- **SearchResults**: Grouped results with relevance scoring

#### Laboratory Domain
- **StorageNavigator**: Tank/Rack/Box navigation
- **EquipmentGrid**: Visual grid representation of storage positions
- **LabSetupModal**: Laboratory configuration management

#### Authentication Domain
- **AuthGateway**: Login/Register flow with first-time setup detection
- **LoginModal**: JWT-based authentication
- **RegisterModal**: User registration with role assignment

### State Management Architecture

#### Server State (React Query)
**Primary pattern for ALL server data** - no Zustand for server state.

**Tube Queries**:
- `useTubesQuery()` - Fetch all tubes with filters
- `useOptimizedTubeQueries()` - Performance-optimized queries with caching
- `useCreateTubeMutation()` - Create tube with optimistic updates
- `useUpdateTubeMutation()` - Update tube
- `useDeleteTubeMutation()` - Delete tube

**Researcher Queries**:
- `useResearchersQuery()` - Fetch all researchers
- `useActiveResearchersQuery()` - Fetch active researchers only (derived query)
- `useCreateResearcherMutation()` - Create researcher
- `useUpdateResearcherMutation()` - Update researcher with deactivation support

**Configuration Queries**:
- `useConfigurationQuery()` - Lab configuration with caching

**Search Queries**:
- `useSearchQuery()` - Advanced search with debouncing

#### UI State (Zustand)
**Only for UI-specific state** - never for server data.

**tubeStore**:
- Current navigation: `currentTank`, `currentRack`, `currentBox`
- Selections: `selectedPositions`, `selectedTubeIds`
- UI state: Grid view settings, modal open/closed

**configurationStore**:
- Lab configuration (synced from React Query)
- Active tanks, racks, equipment

#### Global State
- **Authentication**: Handled by `useAuth()` hook + JWT session service
- **Error Handling**: React Hot Toast for notifications
- **Real-time Sync**: Socket.IO event bridge to React Query invalidation

## Database Schema

### Current Schema (Normalized with Foreign Keys)

#### Tubes Table
```sql
CREATE TABLE tubes (
  id TEXT PRIMARY KEY,
  tankId TEXT NOT NULL,
  rackId TEXT NOT NULL,
  boxId TEXT NOT NULL,
  position INTEGER NOT NULL,
  cellType TEXT NOT NULL,
  donorInternalId TEXT,
  donorSourceId TEXT,
  concentration REAL,
  concentrationUnit TEXT CHECK(concentrationUnit IN ('c/v', 'c/mL')),
  date TEXT,
  researcherId TEXT,  -- Foreign key to researchers.id
  media TEXT,
  cultureCondition TEXT,
  lotNumber TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(tankId, rackId, boxId, position),
  FOREIGN KEY(researcherId) REFERENCES researchers(id)
);
```

#### Researchers Table
```sql
CREATE TABLE researchers (
  id TEXT PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT UNIQUE,
  position TEXT,
  active BOOLEAN DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
```

#### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'user', 'viewer')),
  researcherId TEXT,  -- Optional link to researcher profile
  createdAt TEXT NOT NULL,
  FOREIGN KEY(researcherId) REFERENCES researchers(id)
);
```

### TypeScript Schema (from @odysseus/shared-schemas)

```typescript
// Always import from shared schemas, never define locally
import type { TubeData } from '@odysseus/shared-schemas';

interface TubeData {
  id: string;
  location: {
    tankId: string;         // Physical tank ID (STRING)
    rackId: string;         // Physical rack ID (STRING)
    boxId: string;          // Box identifier (STRING)
    position: number;       // Position within box (1-81)
  };
  sample: {
    cellType: string;       // Type of cells stored (required)
    donorInternalId?: string;
    donorSourceId?: string;
    concentration?: number;   // Numeric value
    concentrationUnit?: 'c/v' | 'c/mL';
    date?: string;            // ISO date string
    media?: {                 // Structured media object
      type?: string;
      supplements?: string;
      selection?: string;
    };
    cultureCondition?: string;
    lotNumber?: string;
    notes?: string;
  };
  researcherId?: string;    // ⭐ Foreign key to researchers.id (NOT name!)
  timestamps: {
    createdAt: string | Date;
    updatedAt: string | Date;
  };
}

interface Researcher {
  id: string;               // Primary key
  firstName: string;
  lastName: string;
  email?: string;
  position?: string;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}
```

**CRITICAL NOTE**: The `researcherId` field stores the **ID** of the researcher, not the name. The UI resolves the ID to display the researcher's name using the **Presenter Pattern**:

```typescript
// ✅ CORRECT - Presenter pattern for foreign key resolution
const { data: researchers = [] } = useResearchersQuery();
const researcherMap = new Map(researchers.map(r => [r.id, r]));

// In display component
const researcher = researcherMap.get(tube.researcherId);
const displayName = researcher
  ? formatResearcherDropdownDisplay(researcher)
  : 'Unknown';

// ❌ WRONG - Never store researcher name in tube
tube.researcher = "John Smith"; // This field doesn't exist anymore!
```

### Data Storage
- **Development**: `server/data/odysseus.sqlite`
- **Production**: User's app data directory (managed by Electron)
- **Backup**: Automatic timestamped backups on changes

## API Endpoints

### Public Routes

#### Authentication (`/api/public/auth`)
- `GET /api/public/auth/first-time` - Check if first-time setup required
- `POST /api/public/auth/register` - Register new user (first-time only)
- `POST /api/public/auth/login` - Authenticate user (returns JWT)
- `POST /api/public/auth/refresh` - Refresh access token

### Protected Routes (Require JWT)

#### Tubes (`/api/tubes`)
- `GET /api/tubes` - Get all tubes (with optional filters)
- `GET /api/tubes/location?tankId&rackId&boxId` - Get tubes by location
- `GET /api/tubes/:id` - Get single tube
- `POST /api/tubes` - Create new tube (requires authentication)
- `PUT /api/tubes/:id` - Update tube (requires ownership or admin)
- `DELETE /api/tubes/:id` - Delete tube (requires ownership or admin)
- `POST /api/tubes/batch` - Batch operations (create/update/delete multiple)
- `GET /api/tubes/validate/:id` - Validate tube data

#### Researchers (`/api/researchers`)
- `GET /api/researchers` - Get all researchers (with optional filters)
- `GET /api/researchers/:id` - Get single researcher
- `POST /api/researchers` - Create researcher (admin only)
- `PUT /api/researchers/:id` - Update researcher (admin only)
- `DELETE /api/researchers/:id` - Delete researcher (admin only, checks for tubes)
- `GET /api/researchers/:id/tubes` - Get all tubes for researcher

#### Search (`/api/search`)
- `POST /api/search/tubes/advanced` - Advanced search with filters and sorting
- `GET /api/search/quick?q=query` - Quick search
- `POST /api/search/field` - Search by specific field
- `GET /api/search/suggestions?q=query` - Autocomplete suggestions
- `GET /api/search/filter-options` - Get available filter options
- `POST /api/search/save` - Save search query
- `GET /api/search/saved` - Get saved searches
- `DELETE /api/search/saved/:id` - Delete saved search

#### Configuration (`/api/configuration`)
- `GET /api/configuration` - Get lab configuration
- `PUT /api/configuration` - Update lab configuration (admin only)
- `POST /api/configuration/tanks` - Add tank
- `DELETE /api/configuration/tanks/:id` - Remove tank

#### Admin (`/api/admin`)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/system/stats` - System statistics

### WebSocket Events (Socket.IO)

#### Client → Server
- `join_room` - Join location-specific room for updates
- `leave_room` - Leave room

#### Server → Client
- `tube_created` - New tube created
- `tube_updated` - Tube updated
- `tube_deleted` - Tube deleted
- `researcher_created` - New researcher
- `researcher_updated` - Researcher updated
- `researcher_deleted` - Researcher deleted
- `configuration_updated` - Lab configuration changed

React Query automatically invalidates queries when receiving these events via the **Query Bridge** pattern.

## Development Guidelines

### Clean Architecture Principles

#### Backend Architecture Layers

**1. Domain Layer** (`server/src/domain/`)
- **Entities**: Pure business objects (Tube, Researcher, User)
- **Value Objects**: Immutable values (Permission, TubePosition)
- **Domain Services**: Business logic that doesn't belong to entities
- **Repository Interfaces**: Abstract data access contracts
- **NO DEPENDENCIES**: Domain layer depends on NOTHING

**2. Application Layer** (`server/src/application/`)
- **Application Services**: Orchestrate domain logic and use cases
- **DTOs**: Data transfer between layers
- **Use Cases**: High-level business workflows
- **Depends on**: Domain layer only

**3. Infrastructure Layer** (`server/src/infrastructure/`)
- **Repositories**: Concrete implementations (SQLite, Firebase)
- **External Services**: Third-party integrations
- **Database**: Connection management, migrations
- **Depends on**: Domain layer (implements interfaces)

**4. Presentation Layer** (`server/src/presentation/`)
- **Controllers**: HTTP request/response handling
- **Route Modules**: Feature-based routing
- **Middleware**: Authentication, validation, error handling
- **Depends on**: Application layer

#### Frontend Architecture Patterns

**1. Domain-Driven Design**
- Organize by business domain (tubes, researchers, search)
- Each domain has its own UI, hooks, services, types
- Shared code only for truly cross-cutting concerns

**2. Server State with React Query**
- ALL server data managed by React Query
- Never store server data in Zustand
- Use query keys factory pattern for cache invalidation
- Optimistic updates for instant UI feedback

**3. UI State with Zustand**
- ONLY for UI-specific state (navigation, selections, modal state)
- Keep stores small and focused
- Use selectors to prevent unnecessary re-renders

**4. Service Layer Pattern**
- Each domain has a Service class (TubeService, ResearcherService)
- Services use httpClient for all API calls
- Services handle request/response transformation
- Services throw typed errors

**5. Presenter Pattern for Foreign Keys**
- Store IDs in data (researcherId)
- Resolve to full objects in UI layer
- Use formatters from shared schemas for display

### Code Style

#### TypeScript
- Use TypeScript exclusively - no `any` types
- Prefer `interface` for object shapes, `type` for unions/intersections
- Always define return types for functions
- Use strict mode (`strict: true` in tsconfig.json)

#### React
- Functional components only (no class components)
- Use hooks for all state and side effects
- Prefer named exports over default exports
- Use React.FC type for components
- Keep components focused and small (<200 lines)

#### State Management
- Use React Query for ALL server state
- Use Zustand ONLY for UI state
- Never mix the two patterns
- Use selectors to optimize re-renders

#### Error Handling
- Use React Hot Toast for user-facing errors
- Log errors to console in development
- Use typed errors (DomainError, ApiError, etc.)
- Always handle loading and error states in UI

#### Styling
- Use TailwindCSS utility classes
- Custom CSS only when absolutely necessary
- Follow design system color palette
- Use responsive classes (`md:`, `lg:`, etc.)

### CRITICAL: Schema Verification Before Implementation

**ALWAYS READ EXISTING SCHEMAS FIRST** when creating services, hooks, or components that depend on data types.

#### **Pre-Implementation Checklist**
1. ✅ **Read the schema file** from `@odysseus/shared-schemas` BEFORE writing any code
2. ✅ **Verify exact field names** - don't assume (`researcherId`, not `researcher`)
3. ✅ **Check data types** - especially IDs (all strings), numbers vs strings
4. ✅ **Check for foreign keys** - researcherId links to researchers.id
5. ✅ **Use formatters** - for displaying foreign key relationships
6. ✅ **Validate imports work** - test path aliases before proceeding

#### **Common Schema Mistakes to Avoid**
```typescript
// ❌ WRONG - Outdated assumptions
interface BadTube {
  researcher: string;        // OLD! Now uses researcherId
  rackId: number;           // WRONG! All IDs are strings
  media: string;            // WRONG! Media is now a structured object
}

// ✅ CORRECT - Check @odysseus/shared-schemas first
import {
  type TubeData,
  type CreateTubeRequest,
  formatResearcherDropdownDisplay,
  UNKNOWN_RESEARCHER
} from '@odysseus/shared-schemas';

// Correct types from schema
interface CorrectUsage {
  researcherId: string;     // ✅ Foreign key (ID, not name)
  rackId: string;          // ✅ All IDs are strings
  media: {                 // ✅ Structured object
    type?: string;
    supplements?: string;
    selection?: string;
  };
}

// Correct display resolution
const displayName = researcher
  ? formatResearcherDropdownDisplay(researcher)
  : UNKNOWN_RESEARCHER;
```

#### **Foreign Key Resolution Pattern**
```typescript
// ✅ CORRECT - Presenter pattern
// 1. Fetch related data with React Query
const { data: tubes = [] } = useTubesQuery();
const { data: researchers = [] } = useResearchersQuery();

// 2. Create lookup map for O(1) resolution
const researcherMap = useMemo(() =>
  new Map(researchers.map(r => [r.id, r])),
  [researchers]
);

// 3. Resolve in display component
const researcher = researcherMap.get(tube.researcherId);
const displayName = researcher
  ? formatResearcherDropdownDisplay(researcher)
  : UNKNOWN_RESEARCHER;

// ❌ WRONG - Trying to access name directly
const name = tube.researcher; // Doesn't exist!
```

### Naming Conventions (MANDATORY - 100% Compliance Required)

**Last Updated:** 2025-01-21 (Post naming consistency audit - 96% → 100% compliance achieved)

These conventions are strictly enforced across the entire codebase. All new files and edits MUST follow these patterns.

---

#### **1. File Naming**

**Components & Classes:** PascalCase
- ✅ `TubeEditorModal.tsx`
- ✅ `SearchService.ts`
- ✅ `GridNavigationService.ts`
- ✅ `AppBootstrapService.ts`
- ❌ ~~`tubeEditorModal.tsx`~~ (wrong case)
- ❌ ~~`searchService.ts`~~ (wrong case for services)

**Configuration & Infrastructure:** camelCase
- ✅ `queryClient.ts`
- ✅ `queryKeys.ts`
- ✅ `vite.config.ts`
- ❌ ~~`QueryClient.ts`~~ (wrong - these are config files)

**Zustand Stores:** camelCase with `Store` suffix
- ✅ `modalStore.ts`
- ✅ `authStore.ts`
- ✅ `tubeStore.ts`
- ❌ ~~`ModalStore.ts`~~ (wrong case - stores use camelCase)
- ❌ ~~`modalService.ts`~~ (wrong suffix - use Store not Service)

**Hooks:** camelCase with `use` prefix
- ✅ `useTubesQuery.ts`
- ✅ `useAuth.ts`
- ✅ `useGridController.ts`
- ❌ ~~`UseTubesQuery.ts`~~ (wrong case)
- ❌ ~~`tubesQuery.ts`~~ (missing "use" prefix)

**Test Files:** Match source name + `.test.ts` or `.test.tsx`
- ✅ `TubeService.test.ts`
- ✅ `authStore.test.ts`
- ✅ `example.test.tsx`
- ❌ ~~`TubeService.spec.ts`~~ (use .test not .spec)
- ❌ ~~`authStore.test.ts.disabled`~~ (use test.skip() not file extension)

**Utilities:** camelCase
- ✅ `dateFormatter.ts`
- ✅ `colorSystem.ts`
- ✅ `gridHelpers.ts`

---

#### **2. Directory Naming**

**ALL directories:** kebab-case (lowercase with hyphens)
- ✅ `ui/components/`
- ✅ `shared-schemas/`
- ✅ `domains/tubes/`
- ❌ ~~`UI/Components/`~~ (wrong - never PascalCase)
- ❌ ~~`sharedSchemas/`~~ (wrong - use kebab-case)

**Domain directories:** Plural nouns
- ✅ `domains/tubes/`
- ✅ `domains/researchers/`
- ✅ `domains/authentication/`
- ❌ ~~`domains/tube/`~~ (use plural)

**Generic directories:** Standard names
- ✅ `components/`, `hooks/`, `services/`, `utils/`, `types/`
- ❌ ~~`lib/`~~ (deprecated - use `utils/` for utilities)

---

#### **3. Zustand Store Pattern (Strictly Enforced)**

**Pattern:** `{name}Store.ts` → exports `use{Name}Store`

```typescript
// File: modalStore.ts

// Internal store (not exported directly)
const modalStore = create<State & Actions>((set) => ({
  // ... implementation
}));

// Exported hook with matching name
export const useModalStore = () => {
  const state = modalStore();
  return {
    // ... reshaped state
  };
};
```

**Examples:**
- ✅ `errorStore.ts` → exports `useErrorStore`
- ✅ `authStore.ts` → exports `useAuthStore`
- ✅ `modalStore.ts` → exports `useModalStore`
- ❌ ~~`modalStore.ts` → exports `useModalService`~~ (WRONG suffix)
- ❌ ~~`errorStore.ts` → exports `useErrors`~~ (WRONG - must match file)

---

#### **4. Service Organization & Naming**

**Client-Side Services:**
- **Location:** ALWAYS in `domains/{domain}/services/` directory
- **Naming:** PascalCase with `Service` suffix
- **Pattern:** `{Entity}Service.ts`

```typescript
// ✅ CORRECT
domains/tubes/services/TubeService.ts
domains/tubes/services/DataConsistencyService.ts

// ❌ WRONG - Never put services in application/
domains/tubes/application/BulkOperationsService.ts
```

**Server-Side Services:**
- **Application Layer:** `{Name}ApplicationService.ts`
- **Domain Layer:** `{Name}Service.ts`
- **Infrastructure:** `{Technology}{Name}Service.ts`

```typescript
// ✅ CORRECT
server/src/application/services/TubeApplicationService.ts      // Orchestration
server/src/domain/services/AccessControlService.ts             // Business logic
server/src/infrastructure/services/BcryptPasswordService.ts    // External tech
```

---

#### **5. React Component Patterns**

**Hooks:** Always `use` prefix (100% enforced)
- ✅ `useGridController`, `useAuth`, `useTubeForm`
- ❌ ~~`gridController`~~, ~~`authHook`~~ (must start with "use")

**Components:** Always in `ui/components/` directories
- ✅ `domains/tubes/ui/components/TubeEditorModal.tsx`
- ✅ `shared/ui/components/Button.tsx`
- ❌ ~~`domains/tubes/TubeEditor.tsx`~~ (not in ui/components/)

**Event Handlers:** Two accepted patterns
- ✅ `handle{Action}` → `handleSubmit`, `handleDelete`, `handleRowSelect`
- ✅ `toggle{State}` → `toggleFilter`, `toggleRackCollapse` (for boolean state)
- ❌ ~~`on{Event}`~~ (React props use "on", handlers use "handle")

---

#### **6. TypeScript Interface Naming**

**Modern TypeScript:** NO "I" prefix (C# convention rejected)
- ✅ `interface UserRepository { ... }`
- ✅ `interface TubeData { ... }`
- ✅ `interface AuthState { ... }`
- ❌ ~~`interface IUserRepository`~~ (outdated C# pattern)
- ❌ ~~`interface ITubeData`~~ (not TypeScript idiomatic)

**Props Interfaces:** Use `Props` suffix
- ✅ `interface TubeEditorModalProps { ... }`
- ✅ `interface ButtonProps { ... }`
- ❌ ~~`interface TubeEditorModalProperties`~~ (too verbose)

**State/Actions:** Descriptive suffixes
- ✅ `interface AuthState { ... }`
- ✅ `interface AuthActions { ... }`
- ✅ `interface ModalStore extends AuthState, AuthActions { }`

---

#### **7. Constants Naming**

**Global Constants:** UPPER_CASE_WITH_UNDERSCORES + `as const`
```typescript
// ✅ CORRECT
export const BOOTSTRAP_TIMEOUT = 30000 as const;
export const API_BASE_URL = 'http://localhost:3001' as const;
export const CACHE_TIMES = {
  REAL_TIME: { staleTime: 3 * 60 * 1000 },
  MEDIUM: { staleTime: 10 * 60 * 1000 }
} as const;
```

**Semantic Naming Accepted:** Different patterns for different meanings
```typescript
// ✅ BOTH VALID - Different semantic purposes
export const DEFAULT_GRID_CONFIG = { rows: 9, cols: 9 } as const;
export const GRID_DEFAULTS = { /* collection of defaults */ } as const;
export const EQUIPMENT_DEFAULTS = { /* equipment collection */ } as const;
```

**Local Constants:** camelCase acceptable
```typescript
const defaultConfig = { ... };
const initialState = { ... };
```

---

#### **8. Query Keys (Centralized - Single Source of Truth)**

**CRITICAL:** ALL query keys MUST be in `app/queryKeys.ts`

```typescript
// ✅ CORRECT - Centralized query keys
// File: app/queryKeys.ts
export const queryKeys = {
  tubes: {
    all: ['tubes'] as const,
    list: (filters?: any) => [...queryKeys.tubes.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.tubes.all, 'detail', id] as const,
  },
  researchers: {
    all: ['researchers'] as const,
    // ...
  }
} as const;

// ✅ USAGE - Import from centralized location
import { queryKeys } from '@app/queryKeys';
useQuery({ queryKey: queryKeys.tubes.all });

// ❌ WRONG - Never define distributed query keys
// File: domains/tubes/hooks/useTubeQuery.ts
const tubeQueryKeys = { all: ['tubes'] }; // NO! Use centralized keys
```

---

#### **9. Directory Structure (DDD Domain Pattern)**

**Standard Domain Structure:**
```
domain/
├── services/        ← ALL services (client-side) go here
├── hooks/           ← Shared/reusable hooks only
├── stores/          ← Zustand stores (UI state only)
├── ui/components/   ← React components
│   └── component-name/
│       ├── ComponentName.tsx
│       ├── useComponentSpecificHook.ts  ← Component-specific hooks co-located
│       ├── componentHelpers.ts
│       └── index.ts
├── utils/           ← Domain utilities (NOT lib/)
├── types/           ← Type definitions
├── config/          ← Domain configuration
└── index.ts         ← Public API exports
```

**Hook Co-location Pattern (Modern Practice):**

**Component-specific hooks** → Co-locate with component
- ✅ `ui/components/storage-navigator/useStorageNavigation.ts`
- ✅ `ui/components/storage-navigator/useStorageKeyboard.ts`
- **When:** Hook is only used by one component or tightly coupled feature
- **Why:** Keeps related code together, easier to move/delete as a unit

**Shared/reusable hooks** → Separate `hooks/` directory
- ✅ `hooks/useTubesQuery.ts` (used across multiple components)
- ✅ `hooks/useTubeMutations.ts` (shared mutations)
- **When:** Hook is used by multiple components or domains
- **Why:** Single source of truth, prevents duplication

**Examples:**
```typescript
// ✅ CORRECT - Component-specific hook co-located
domains/storage/ui/components/storage-navigator/
├── StorageNavigator.tsx
├── useStorageNavigation.ts       // Only used by StorageNavigator
└── index.ts

// ✅ CORRECT - Shared hook in hooks directory
domains/tubes/hooks/
└── useTubesQuery.ts              // Used by TubeGrid, TubeInfoPanel, Search, etc.

// ❌ WRONG - Component-specific hook in shared hooks directory
domains/storage/hooks/
└── useStorageNavigation.ts       // Only used by StorageNavigator - should be co-located
```

**Deprecated/Wrong Locations:**
- ❌ `domain/application/` - Services should be in `services/`
- ❌ `domain/lib/` - Use `utils/` instead
- ❌ Components outside `ui/components/` - Always in UI directory
- ❌ Component-specific hooks in `hooks/` - Co-locate with component instead

---

#### **10. Export Standards**

**Named Exports ONLY** - Never use default exports
```typescript
// ✅ CORRECT
export const TubeInfoPanel: React.FC = () => { ... };
export const useTubesQuery = () => { ... };
export interface TubeData { ... }
export const TubeService = { ... };

// ❌ WRONG - Never use default exports
export default TubeInfoPanel;
export default function useTubesQuery() { }
```

**Barrel Exports** (index.ts files)
```typescript
// ✅ CORRECT - Re-export with named exports
export { TubeService } from './services/TubeService';
export { useTubesQuery, useTubeMutations } from './hooks';
export type { TubeData } from '@odysseus/shared-schemas';

// ❌ WRONG - Don't use export *
export * from './services'; // Too broad, loses tree-shaking
```

---

#### **11. Variable & Function Naming**

**Variables:** camelCase
```typescript
const tubeData = { ... };
const isLoading = true;
const selectedTubeIds = [];
```

**Functions:** camelCase
```typescript
function fetchTubes() { ... }
const handleSubmit = () => { ... };
const formatResearcherName = (researcher) => { ... };
```

**Boolean Variables:** Use `is`, `has`, `should` prefixes
```typescript
const isLoading = false;
const hasError = true;
const shouldValidate = true;
```

---

#### **12. Type Naming**

**Interfaces & Types:** PascalCase
```typescript
interface TubeData { ... }
type ApiResponse = { ... };
interface UserRepository { ... }
type CreateTubeRequest = { ... };
```

**Generic Type Parameters:** Single capital letter or descriptive PascalCase
```typescript
function map<T>(items: T[]): T[] { ... }
function create<TEntity extends BaseEntity>(entity: TEntity): TEntity { ... }
```

---

### Pre-Implementation Checklist

Before creating ANY new file or making edits:

1. ✅ **Verify naming convention** - Check this guide for file type
2. ✅ **Check existing patterns** - Find similar files and match their style
3. ✅ **Use correct directory** - Services in `services/`, components in `ui/components/`, utils in `utils/`
4. ✅ **Import from `@odysseus/shared-schemas`** - Never create duplicate schemas
5. ✅ **Use centralized query keys** - Import from `@app/queryKeys`
6. ✅ **Named exports only** - Never use default exports
7. ✅ **Follow Zustand pattern** - `{name}Store.ts` → `use{Name}Store`

---

### Common Naming Mistakes to Avoid

```typescript
// ❌ WRONG - Common mistakes
modalStore.ts → exports useModalService  // Wrong suffix (Service vs Store)
domains/tubes/application/BulkService.ts  // Wrong directory (use services/)
shared/lib/validation.ts                  // Wrong directory (use utils/)
interface IUserRepository                 // Wrong prefix (no "I" prefix)
useTubes.ts                              // Wrong name (should be useTubesQuery.ts)
TubeService.spec.ts                      // Wrong suffix (use .test.ts)

// ✅ CORRECT - Proper naming
modalStore.ts → exports useModalStore
domains/tubes/services/BulkOperationsService.ts
shared/utils/validation.ts
interface UserRepository
useTubesQuery.ts
TubeService.test.ts
```

---

### Naming Convention Philosophy

**Why These Standards:**
1. **Consistency:** Makes codebase predictable and searchable
2. **Modern TypeScript:** Follows 2024 industry best practices
3. **Semantic Clarity:** Names reveal intent and location
4. **Single Source of Truth:** Centralized patterns prevent duplication
5. **Maintainability:** Clear patterns make refactoring safe and simple

**Achieved:** 100% naming compliance as of 2025-01-21
**Maintained by:** Strict adherence to these conventions on all new code

### Security

- Never commit secrets or API keys
- Use JWT tokens for authentication (OAuth 2.0 format)
- Validate all inputs server-side with Zod schemas
- Use helmet.js for security headers
- Implement CSRF protection for state-changing operations
- Use bcrypt for password hashing (cost factor: 10)
- Implement rate limiting on authentication endpoints
- Use parameterized SQL queries (repository pattern prevents SQL injection)

### Testing Strategy

- Test business logic in domain services
- Test repository implementations with test databases
- Test API endpoints with supertest
- Test React components with Vitest + React Testing Library
- Test React Query hooks with custom wrapper
- Mock Socket.IO in tests
- Use factory functions for test data generation

## Common Issues & Solutions

### Electron Packaging
- Files must be in `build.files` array in package.json
- Server files in `extraResources` for production
- Use `app.getPath('userData')` for data directory
- Test with `npm run package` before distribution

### Data Persistence
- Development: `server/data/odysseus.sqlite`
- Production: Electron userData directory
- Always check file permissions
- Implement database migrations for schema changes

### Socket.IO Connection
- Server must start before frontend
- Implement reconnection logic with exponential backoff
- Use rooms for location-specific updates
- Bridge Socket.IO events to React Query invalidations

### React Query Patterns
- Use query keys factory for consistency
- Implement optimistic updates for instant feedback
- Use `staleTime` and `cacheTime` appropriately
- Invalidate related queries after mutations

### Foreign Key Resolution
- Always resolve IDs to names in the UI layer (Presenter pattern)
- Use memoized Maps for O(1) lookup performance
- Use shared formatters for consistent display
- Handle missing/deleted researchers gracefully (fallback to UNKNOWN_RESEARCHER)

## Performance Optimization

### Frontend
- Use React Query for automatic caching and deduplication
- Implement virtualization for large lists (react-window)
- Use code splitting for routes
- Optimize re-renders with useMemo and useCallback
- Use Zustand selectors to prevent unnecessary renders

### Backend
- Index foreign keys in SQLite
- Use repository pattern for query optimization
- Implement caching for frequently accessed data
- Use batch operations for bulk updates
- Stream large result sets

## Known Issues & Future Improvements

_No known architectural issues. CacheWarmingService was removed (2025-01-14) in favor of Socket.IO + React Query on-demand caching._

## Instructions for AI Agents

### Mandatory Rules
- ❌ NO bandaid solutions - all fixes must be architecturally sound
- ❌ NO zombie or spaghetti code - keep codebase clean
- ❌ NO redundant systems - one way to do each thing
- ❌ NO breaking functionality for bug fixes - always test
- ✅ ALL code must be elegant, simple, and pragmatic
- ✅ ALL solutions must be long-term maintainable
- ✅ ALL new files follow established naming conventions
- ✅ ALL errors must be fixed until app builds and packages
- ✅ NEVER delete files without explicit confirmation

### Code Quality Standards
- Inspect all solutions for architectural soundness
- Follow Clean Architecture and DDD patterns
- Use existing patterns consistently
- Write self-documenting code with clear names
- Add comments only for complex business logic
- Keep functions small and focused
- Prefer composition over inheritance

### Comment Standards

**Philosophy**: Comments should explain **why** (business rationale, non-obvious decisions) not **what** (code already shows this). Use technical language with idiomatic clarity - be precise but clearly communicate what the code represents.

**Note for AI-Assisted Development**: These standards benefit both human developers and AI agents. AI code analysis relies on function names, TypeScript types, file structure, and code logic - not redundant comments. Clean, well-named code is easier for AI tools to search, understand, and modify. Redundant comments add noise that must be filtered. The only comments that help AI agents are those explaining non-obvious business logic or edge cases.

#### ✅ DO Write These Comments

**1. Business Logic Rationale**
```typescript
// OAuth 2.0 dual-token architecture: separate access + refresh tokens
// Access tokens expire in 15 minutes for security
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });

// Tri-state PATCH semantics for optional fields:
// - undefined = no change (preserve existing)
// - null = clear field (set to undefined)
// - value = update field
if (update.researcherId !== undefined) {
  tube.researcherId = update.researcherId;
}
```

**2. Non-Obvious Behavior or Edge Cases**
```typescript
// Date-only fields use strings (YYYY-MM-DD) to prevent timezone bugs
// JavaScript Date objects shift dates across timezones
const date: string = '2024-01-15';

// Skip position validation if location hasn't actually changed
// Prevents false positives when updating other fields
if (newPosition === existingTube.position) {
  return true;
}
```

**3. Complex Algorithm Explanations**
```typescript
// Find optimal position by proximity to researcher's existing tubes
// Minimizes search time when locating samples
const avgPosition = positions.reduce((a, b) => a + b, 0) / positions.length;
const closest = available.reduce((prev, curr) =>
  Math.abs(curr - avgPosition) < Math.abs(prev - avgPosition) ? curr : prev
);
```

**4. Workarounds with Context**
```typescript
// Temporary: Use string union until shared-schemas v2.0
// Preserves backward compatibility with legacy Firebase data
type LegacyMedia = MediaData | string;
```

**5. API Contracts (Inputs/Outputs/Errors)**
```typescript
/**
 * Validate tube position for placement
 *
 * @param location - Physical location (tank/rack/box/position)
 * @param excludeTubeId - Optional tube to exclude from conflict check (for updates)
 * @returns Validation result with conflicts and warnings
 * @throws ValidationError if equipment configuration invalid
 */
async validatePosition(location: Location, excludeTubeId?: string): Promise<ValidationResult>
```

**6. TODO/FIXME with Context and Dates**
```typescript
// TODO(2025-01-15): Migrate to domain events for cross-aggregate consistency
// Currently using direct service calls which couples aggregates
// Ticket: #234
```

#### ❌ DO NOT Write These Comments

**1. Self-Promotional Language**
```typescript
// ❌ NEVER: "INDUSTRY STANDARD implementation"
// ❌ NEVER: "A++++ QUALITY code"
// ❌ NEVER: "BEST PRACTICE pattern"
// ❌ NEVER: "Enterprise-grade solution"
// ❌ NEVER: "Professional implementation"
// ❌ NEVER: "CLEAN ARCHITECTURE" (redundant - we always use it)

// ✅ CORRECT: Just describe what it does
// Dual-token OAuth 2.0 authentication
// Handles HTTP concerns only, delegates to command handlers
```

**2. Redundant Markers and Checkmarks**
```typescript
// ❌ NEVER: ✅ This is a good implementation
// ❌ NEVER: ✅ ARCHITECTURAL FIX: researcher → researcherId
// ❌ NEVER: ✅ NEW: Added this endpoint
// ❌ NEVER: ✅ RENAMED from oldName to newName

// ✅ CORRECT: If architectural changes are significant, document in commit message
// Comments should describe current state, not change history
```

**3. Obvious Explanations**
```typescript
// ❌ BAD: Increment counter
counter++;

// ❌ BAD: Return the user
return user;

// ❌ BAD: Loop through tubes
for (const tube of tubes) {

// ✅ GOOD: No comment needed - code is self-explanatory
```

**4. Redundant JSDoc**
```typescript
// ❌ BAD: Repeats function signature
/**
 * Gets all tubes
 * @returns All tubes
 */
getAllTubes(): Tube[]

// ✅ GOOD: Adds context
/**
 * Get all tubes with optional filtering
 * Uses cached results if available (2-minute TTL)
 */
getAllTubes(filters?: TubeFilters): Tube[]
```

**5. Verbose Section Headers**
```typescript
// ❌ BAD: Excessive dividers
// ============================================================
// ✅✅✅ INDUSTRY STANDARD USER MANAGEMENT OPERATIONS ✅✅✅
// ============================================================

// ✅ GOOD: Simple, clean section markers
// User Management
```

**6. Implementation Praise or Certifications**
```typescript
// ❌ NEVER: "This follows industry standards"
// ❌ NEVER: "Implements best practices"
// ❌ NEVER: "ARCHITECTURAL PRINCIPLE: Single Source of Truth"

// ✅ CORRECT: Just state the principle
// Single Source of Truth: All schemas in @odysseus/shared-schemas
```

**7. Implementation Process References**
```typescript
// ❌ NEVER: Phase references
// Phase 2 - Co-located with component
// Phase 3 implementation
// Step 1: Initialize state

// ❌ NEVER: Migration/refactor process comments
// This was moved from old location
// Refactored from legacy code
// Part of StorageNavigator refactor

// ❌ NEVER: Implementation timeline references
// Added in January 2025
// Built during sprint 3
// TODO Phase 4: Add animations

// ✅ CORRECT: Comments explain current state, not how we got here
// Component-specific hook, not shared across domains
```

**Rationale:** Implementation phases, migration steps, and refactor processes are artifacts of development that have no value to future developers. Code should explain its current purpose and behavior, not its construction history. Git commit messages and project management tools track implementation process.

#### Special Cases

**Commented-Out Code**: DO NOT commit commented-out code. Either delete it (Git preserves history) or add a tracking comment explaining why it's temporarily disabled:
```typescript
// Temporarily disabled - see ticket #456
// Re-enable after Firebase v2 migration
// export const legacySync = () => { ... };
```

**Type Assertions and Casts**: Explain why the type system needs help
```typescript
// Type-safe cast: Zod already validated this structure
const validated = data as CreateTubeRequest;
```

**Magic Numbers**: Replace with named constants or explain inline
```typescript
// ✅ GOOD: Named constant
const MAX_RETRY_ATTEMPTS = 3;

// ✅ GOOD: Inline explanation when constant isn't reused
const ttl = 120000; // 2 minutes in milliseconds
```

#### Key Principles Summary

**Write comments that:**
- Explain business logic rationale and "why" decisions were made
- Document non-obvious behavior, edge cases, and workarounds
- Clarify complex algorithms and API contracts
- Use technical language with idiomatic clarity

**Never write comments that:**
- Use self-promotional language ("INDUSTRY STANDARD", "A++++ QUALITY", "BEST PRACTICE", "Enterprise-grade", "Professional")
- Add redundant markers (✅ checkmarks, "NEW", "ARCHITECTURAL FIX", "RENAMED")
- State the obvious (code already shows what it does)
- Repeat function signatures without adding context
- Include excessive dividers or verbose headers
- Praise implementations or certify patterns

**Result**: Concise, professional comments that explain business decisions and non-obvious behavior without marketing language.

### Before Implementing Features
1. Read relevant schemas from `@odysseus/shared-schemas`
2. Understand the domain layer and business rules
3. Check existing implementations for patterns
4. Verify path aliases and imports work
5. Plan the implementation across all layers
6. Consider error handling and edge cases

### File Management
- New reports/docs → `reports/` directory
- Follow established file organization
- Use professional naming conventions
- Match code style of existing files
- Export everything with named exports

### Testing Requirements
- Build must complete without errors
- Package must create working .exe
- All functionality must work in packaged app
- Socket.IO must connect in production
- Data must persist across restarts

## Global Claude Code Instructions

### Communication Style
- Be concise and direct
- Skip unnecessary preamble and postamble
- Be skeptical and complete and thorough in everything you do
- Use technical language to make a point and for yourself to understand when performing tasks. HOWEVER, use simple language and explanations for non-coders (like myself) when you're explaining what will need to happen, what has happened or what can happen. Assume I don't know coding.
- Understand that I'm not a coder, so you must explain simply why a certain approach is the top industry quality and give examples of why it is the best way to solve a problem.
- You can mention some technical language to help me understand exactly what you're doing and where you're working, but don't assume I understand everything you're saying.

### Code Preferences
- Follow established patterns in existing codebase.
- You should always recommended the cleanest and most architecturally sound approach to building something.
- Always use top quality, industry-standard approaches that do not increase technical debt or utilize patches, shortcuts or workarounds when solving problems or errors.
- Prefer named exports over default exports
- Maintain consistency with project architecture
- Never assume files or functions are missing, search the project codebase to see if they are there and how they work before suggesting changes or optimizations.
- Always write code from the perspective of a fullstack senior engineer with decades of coding experience in every language.
- If you write code that you don't use always go back and throw it out. Absolutely no zombie or dead code.

### Workflow
- Batch operations together when possible
- Reference project documentation when available
- Prioritize pragmatic solutions
- Skip confirmations when safe to proceed.
- Don't ask for permissions unless it's a potentially dangerous action.
- Solutions should be elegant and simple unless there is better architecturally sound approach
- Always find the root cause to a problem and never assume anything. You should dig through the code if you aren't 100% sure of any errors or problems that occur.

### Windows Environment Command Execution

**Environment Context:**
- Running on Windows 10 via PowerShell
- The Bash tool handles both PowerShell and cmd commands automatically

**File System Operations:**
- Use Windows native commands: `dir`, `del`, `copy`, `move`, `mkdir`, `rmdir`
- NEVER use Unix commands: `ls`, `rm`, `cp`, `mv` (they may fail or behave unexpectedly)

**Cross-Platform Tools:**
- npm, node, git, sqlite3, curl work normally - use them as-is

**Path Handling:**
- ALWAYS use double quotes for paths with spaces: `"C:\Users\evan\Desktop\folder name"`
- Windows accepts both `\` and `/` in paths, but prefer `\` for clarity

**Command Chaining:**
- Sequential (ignore failures): `command1 ; command2`
- Stop on failure: `command1 && command2`

**CRITICAL - Error Redirection:**
- ⛔ **NEVER EVER USE `2>nul` or `>nul` in bash commands** - This creates literal files named "nul" or "NUL"
- ✅ Use proper Unix syntax: `2>/dev/null` or `>/dev/null`
- ✅ Or simply omit error suppression entirely
- This applies to ALL bash commands including grep, find, etc.

**Critical Rule - Use Dedicated Tools Instead of Bash:**
- File reading: Use `Read` tool, NOT `cat`, `type`, `Get-Content`
- File search: Use `Glob` tool, NOT `dir /s`, `Get-ChildItem -Recurse`
- Content search: Use `Grep` tool, NOT `findstr`, `Select-String`
- File editing: Use `Edit` tool, NOT `sed`, PowerShell string replacement
- File writing: Use `Write` tool, NOT `echo >`, `Out-File`

**Only Use Bash Tool For:**
- Running builds/tests (npm, node)
- Version control (git)
- Process management (tasklist, taskkill)
- Database operations (sqlite3)
- System commands that have no dedicated tool alternative

### Project Work
- Always check instructions in `.claude/instructions.md`
- Always create project-specific instructions in the project directory that EXPANDS on these instructions.
- Follow naming conventions and file structures from existing code and ensure they meet typical industry standards
- Respect architectural patterns already in place, but suggest optimizing if there is unnecessary technical debt or duplicate functions.
- Create a reports dir in a given project that should contain detailed work we've accomplished.

## Code Quality & Type Safety Best Practices

### Learned from Lint Error Resolution & Type Organization

This section captures critical patterns learned from fixing hundreds of lint errors and organizing the type system. Following these practices from the start prevents 90% of common errors and technical debt.

---

### 1. Type Safety: Define Types at Creation

**Do it right immediately - never defer type definition.**

#### Rules:
- **Never use `any`** - Define proper types immediately
- **No implicit returns** - Always explicitly type function returns
- **Create types in centralized locations first** - Don't define inline, then refactor later
- **Use `type` imports** - `import type { ... }` for type-only imports

#### Type Organization:
```typescript
// ✅ CORRECT - Types defined in centralized location
// File: server/src/domain/types/services/AccessControl.ts
export interface AccessResult {
  allowed: boolean;
  reason: string;
  metadata?: any;
}

// File: MyService.ts
import type { AccessResult } from '@domain/types/services';

// ❌ WRONG - Types defined inline
// File: MyService.ts
interface AccessResult {  // This creates duplication!
  allowed: boolean;
  reason: string;
}
```

#### Know Where Types Belong:
- **Repository types** → `domain/types/repository/`
  - SearchCriteria.ts - Query/filter types
  - Stats.ts - Statistics and summary types
  - QueryOptions.ts - Pagination and query options

- **Service types** → `domain/types/services/`
  - AccessControl.ts - Permission/access types
  - TubePosition.ts - Position validation types
  - Validation.ts - Validation-specific types

- **Domain types** → `domain/types/`
  - validation.ts - DomainValidationResult, BulkValidationResult
  - configuration.ts - ConfigurationUpdateData, etc.

---

### 2. Promise/Async Discipline: No Floating Promises

**Every Promise must be awaited or explicitly handled.**

#### Rules:
- **Never ignore Promises** - They hide errors
- **Always await or `.catch()`** - No silent failures
- **Use proper error boundaries** - Async functions need try/catch

```typescript
// ❌ WRONG - Floating promise (lint error)
someAsyncFunction(); // Fire-and-forget hides errors

// ✅ CORRECT - Explicitly awaited
await someAsyncFunction();

// ✅ CORRECT - Explicitly handled
someAsyncFunction().catch(error => {
  logger.error('Failed to execute:', error);
});

// ✅ CORRECT - Intentionally fire-and-forget with void
void someAsyncFunction(); // Makes intent explicit
```

#### Error Boundaries:
```typescript
// ✅ CORRECT - Proper async error handling
async function handleSubmit() {
  try {
    await createTube(tubeData);
    await refreshCache();
  } catch (error) {
    toast.error('Failed to create tube');
    logger.error(error);
  }
}
```

---

### 3. Accessibility: Build It In From Day One

**Every interactive element needs proper ARIA labels and keyboard support.**

#### Rules:
- **Every clickable element** → onClick + onKeyDown
- **Every image** → alt text (no exceptions)
- **Every form field** → aria-label or associated label
- **Focus management** → Handle keyboard navigation

```typescript
// ❌ WRONG - Missing keyboard support
<div onClick={handleClick}>Delete</div>

// ✅ CORRECT - Full accessibility
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  aria-label="Delete tube"
>
  Delete
</div>

// ❌ WRONG - Missing alt text
<img src={icon} />

// ✅ CORRECT - Descriptive alt text
<img src={icon} alt="Warning icon indicating validation error" />
```

---

### 4. Import Hygiene: Clean As You Code

**Remove unused imports immediately - don't leave them "for later".**

#### Rules:
- **Delete unused imports** - As soon as you remove code
- **No dead code** - "I'll use it later" = technical debt
- **Type-only imports** - Use `import type` when possible

```typescript
// ❌ WRONG - Unused imports left in file
import { useState, useEffect, useMemo } from 'react';  // Only using useState
import type { TubeData } from '@odysseus/shared-schemas';  // Not used

// ✅ CORRECT - Only import what's used
import { useState } from 'react';
```

---

### 5. Clean Architecture: Respect Layer Boundaries

**Domain layer never imports from application or presentation.**

#### Rules:
- **Domain entities** → Pure business logic, zero dependencies
- **Domain services** → Use repository interfaces, not implementations
- **Entities stay immutable** → Use `readonly` for arrays/objects
- **No infrastructure in domain** → Keep it pure

```typescript
// ❌ WRONG - Domain importing from infrastructure
// File: domain/services/TubeService.ts
import { SQLiteDatabase } from '@infrastructure/database';  // NO!

// ✅ CORRECT - Domain using interfaces only
// File: domain/services/TubeService.ts
import type { TubeRepository } from '@domain/repositories';

// ❌ WRONG - Mutable entity arrays
export class Configuration {
  tanks: Tank[];  // Can be mutated externally
}

// ✅ CORRECT - Immutable entity arrays
export class Configuration {
  get tanks(): readonly Tank[] {
    return this._tanks;
  }
}
```

---

### 6. Null vs Undefined: TypeScript Best Practices

**Use `undefined` for optional values, avoid `null`.**

#### Rules:
- **Optional parameters** → Use `param?: Type` (undefined)
- **Avoid `null`** → Use `undefined` instead
- **Explicit undefined okay** → When intent must be clear

```typescript
// ❌ WRONG - Using null
function canMoveTube(user: User, tube: Tube, location: Location | null) {
  // null creates type ambiguity
}

// ✅ CORRECT - Using optional parameter
function canMoveTube(user: User, tube: Tube, location?: Location) {
  // undefined is TypeScript idiomatic
}

// ❌ WRONG - Passing null
canMoveTube(user, tube, null);

// ✅ CORRECT - Passing undefined or omitting
canMoveTube(user, tube, undefined);
canMoveTube(user, tube);  // Best - omit optional param
```

---

### 7. Configuration vs Data: Use Proper Types

**When comparing or validating domain entities, use the entity type, not partial DTOs.**

#### Rules:
- **Validation methods** → Accept full entities when comparing states
- **Don't force type conversions** → If you need Configuration, accept Configuration
- **DTOs for transport** → Use DTOs for API boundaries, not internal validation

```typescript
// ❌ WRONG - Forcing entity → DTO conversion
interface ValidationService {
  validateConfigurationUpdate(
    current: Configuration,
    updates: ConfigurationUpdateData  // Partial DTO - loses type info
  ): Promise<ValidationResult>;
}

// ✅ CORRECT - Accept full entities for comparison
interface ValidationService {
  validateConfigurationUpdate(
    currentConfig: Configuration,
    updatedConfig: Configuration  // Full entity with all type info
  ): Promise<ValidationResult>;
}
```

---

### 8. Remove Dead Code Immediately

**Code that isn't called is technical debt.**

#### Rules:
- **Delete unused helper methods** - Don't leave them "just in case"
- **Remove refactored code** - Old implementations after creating new ones
- **Check usage before committing** - Search codebase for references

```typescript
// ❌ WRONG - Leaving old unused methods
private isEquipmentBeingRemoved(updates: ConfigurationUpdateData): boolean {
  // This method is no longer called after refactor
  return updates.tanks?.some(tank => !tank.isActive);
}

// New method created, but old one left in file

// ✅ CORRECT - Remove the old method entirely
// Old method deleted, only new implementation remains
```

---

### Prevention Philosophy

**"Do it right immediately" > "I'll fix it later"**

Your codebase demands:
- ✅ **Proper types from line one** - Not `any` placeholders
- ✅ **Proper error handling** - Not floating promises
- ✅ **Proper accessibility** - Not "we'll add ARIA later"
- ✅ **Clean imports** - Not unused cruft
- ✅ **Respect architecture** - Not shortcuts
- ✅ **Delete dead code** - Not zombie functions

**Result:** Following these practices from the start prevents 90% of lint errors, type mismatches, and technical debt. The discipline saves hours of refactoring later.
