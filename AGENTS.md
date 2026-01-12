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
- Utilities: `validateTubePosition`, `validateConcentrationUnit`
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

### Naming Conventions (MANDATORY)

All files and edits MUST follow these patterns. 100% compliance achieved.

#### **1. File Naming**

| Category | Case | Example ✅ | Wrong ❌ |
|----------|------|-----------|----------|
| Components & Classes | PascalCase | `TubeEditorModal.tsx`, `SearchService.ts` | `tubeEditorModal.tsx` |
| Configuration | camelCase | `queryClient.ts`, `vite.config.ts` | `QueryClient.ts` |
| Zustand Stores | camelCase + `Store` | `modalStore.ts`, `authStore.ts` | `ModalStore.ts` |
| Hooks | camelCase + `use` | `useTubesQuery.ts`, `useAuth.ts` | `tubesQuery.ts` |
| Test Files | source + `.test.ts` | `TubeService.test.ts` | `TubeService.spec.ts` |
| Utilities | camelCase | `dateFormatter.ts`, `colorSystem.ts` | - |
| Type Definitions | PascalCase (no suffix) | `Tube.ts`, `Grid.ts` | `TubeTypes.ts` |
| Zod Schemas | camelCase | `tubeSchemas.ts` | - |

#### **2. Directory Naming**

| Rule | Example ✅ | Wrong ❌ |
|------|-----------|----------|
| ALL directories: kebab-case | `ui/components/`, `shared-schemas/` | `UI/Components/`, `sharedSchemas/` |
| Domain directories: plural | `domains/tubes/`, `domains/researchers/` | `domains/tube/` |
| Standard names | `components/`, `hooks/`, `services/`, `utils/`, `types/` | `lib/` (use `utils/`) |

#### **3. Zustand Store Pattern**

**Pattern:** `{name}Store.ts` → exports `use{Name}Store`

```typescript
// File: modalStore.ts
const modalStore = create<State & Actions>((set) => ({ /* ... */ }));
export const useModalStore = () => modalStore();  // Hook name matches file
```

✅ `errorStore.ts` → `useErrorStore` | ❌ `modalStore.ts` → `useModalService` (wrong suffix)

#### **4. Service Organization**

| Layer | Pattern | Example |
|-------|---------|---------|
| Client | `domains/{domain}/services/{Name}Service.ts` | `domains/tubes/services/TubeService.ts` |
| Server App | `{Name}ApplicationService.ts` | `TubeApplicationService.ts` |
| Server Domain | `{Name}Service.ts` | `AccessControlService.ts` |
| Server Infra | `{Tech}{Name}Service.ts` | `BcryptPasswordService.ts` |

❌ Never: `domains/tubes/application/` - services go in `services/`

#### **5. React Component Patterns**

| Category | Pattern | Example ✅ | Wrong ❌ |
|----------|---------|-----------|----------|
| Hooks | `use` prefix | `useGridController`, `useAuth` | `gridController` |
| Components | `ui/components/` dir | `domains/tubes/ui/components/TubeEditorModal.tsx` | `domains/tubes/TubeEditor.tsx` |
| Event handlers | `handle{Action}` | `handleSubmit`, `handleDelete` | `onSubmit` (use "on" for props only) |
| Boolean toggles | `toggle{State}` | `toggleFilter` | - |

#### **6. TypeScript Interface Naming**

| Category | Pattern | Example ✅ | Wrong ❌ |
|----------|---------|-----------|----------|
| Interfaces | PascalCase, NO "I" prefix | `UserRepository`, `TubeData` | `IUserRepository` |
| Props | `Props` suffix | `TubeEditorModalProps` | `TubeEditorModalProperties` |
| State/Actions | Descriptive suffix | `AuthState`, `AuthActions` | - |

#### **7. Constants**

- **Global:** `UPPER_CASE` + `as const` → `export const BOOTSTRAP_TIMEOUT = 30000 as const;`
- **Local:** camelCase acceptable → `const defaultConfig = { ... };`

#### **8. Query Keys (Centralized)**

**ALL query keys in `app/queryKeys.ts`** - never define distributed keys.

```typescript
import { queryKeys } from '@app/queryKeys';
useQuery({ queryKey: queryKeys.tubes.all });  // ✅ Centralized
// ❌ WRONG: const tubeQueryKeys = { all: ['tubes'] };  // Distributed keys
```

#### **9. Directory Structure (DDD)**

```
domain/
├── services/        ← ALL client services
├── hooks/           ← Shared hooks only
├── stores/          ← Zustand stores
├── ui/components/   ← React components (with co-located hooks)
├── utils/           ← Utilities (NOT lib/)
├── types/           ← Type definitions
└── index.ts         ← Public API
```

**Hook Co-location:**
- **Component-specific** → Co-locate: `ui/components/storage-navigator/useStorageNavigation.ts`
- **Shared/reusable** → Separate: `hooks/useTubesQuery.ts`

❌ Never: `application/`, `lib/`, components outside `ui/components/`

#### **10. Export Standards**

- **Named exports ONLY** - never `export default`
- **Barrel exports:** Use explicit `export { X } from './X'` not `export * from`

#### **11. Variable & Function Naming**

| Category | Case | Example |
|----------|------|---------|
| Variables | camelCase | `tubeData`, `selectedTubeIds` |
| Functions | camelCase | `fetchTubes`, `handleSubmit` |
| Booleans | `is`/`has`/`should` prefix | `isLoading`, `hasError`, `shouldValidate` |

#### **12. Type Naming**

- **Types/Interfaces:** PascalCase → `TubeData`, `ApiResponse`
- **Generics:** Single letter or descriptive → `<T>`, `<TEntity extends Base>`

---

### Pre-Implementation Checklist

Before creating files: ✅ Verify naming convention | ✅ Match existing patterns | ✅ Correct directory | ✅ Import from `@odysseus/shared-schemas` | ✅ Use `@app/queryKeys` | ✅ Named exports only | ✅ Follow Zustand pattern

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

**Philosophy**: Comments explain **why** (business rationale, non-obvious decisions) not **what** (code shows this). The best comment is a well-named function.

#### ✅ DO Write Comments For:

| Category | Example |
|----------|---------|
| Business logic rationale | `// OAuth 2.0 dual-token: access expires in 15min for security` |
| Non-obvious edge cases | `// Skip validation if position unchanged - prevents false positives` |
| Complex algorithms | `// Find optimal position by proximity to researcher's existing tubes` |
| Workarounds | `// Temporary: string union until shared-schemas v2.0 - see ticket #456` |
| API contracts | `@throws ValidationError if equipment configuration invalid` |
| TODO with context | `// TODO(2025-01-15): Migrate to domain events - ticket #234` |

#### ❌ NEVER Write:

| Category | Examples to Avoid |
|----------|-------------------|
| Self-promotional | "INDUSTRY STANDARD", "BEST PRACTICE", "A++++ QUALITY", "Enterprise-grade" |
| Redundant markers | ✅ checkmarks, "NEW:", "FIXED:", "ARCHITECTURAL FIX:" |
| Obvious explanations | `// Increment counter` above `counter++` |
| Process references | "Phase 2", "Refactored from", "Part of migration", "Added in January 2025" |
| Excessive dividers | `//=====`, `// ***`, decorative headers |
| Redundant JSDoc | `@param data - The data` (just restates types) |

#### JSDoc Usage

**USE for:** Public API functions, complex return types, non-obvious parameters, `@throws`
**SKIP for:** Private helpers, simple getters, obvious handlers, functions where types tell the full story

```typescript
// ❌ BAD: Restates signature
/** @param data - The tube data @returns The tube */
function createTube(data: CreateTubeRequest): Promise<TubeData>

// ✅ GOOD: Adds behavioral context
/** Creates tube with position conflict validation. Emits 'tube_created' socket event. */
function createTube(data: CreateTubeRequest): Promise<TubeData>
```

#### Self-Documenting Code

Before adding a comment, ask: "Can I rename this to eliminate the need for explanation?"

```typescript
// ❌ BAD: Comment compensates for poor naming
function process(t: Tube): boolean { // Check if tube can be moved by user

// ✅ GOOD: Name eliminates need for comment
function canUserMoveTube(tube: Tube, user: User): boolean

// ❌ BAD: Magic number needs comment
const timeout = 30000; // 30 seconds

// ✅ GOOD: Named constant is self-documenting
const BOOTSTRAP_TIMEOUT_MS = 30000;
```

#### Special Cases

- **Commented-out code**: Delete it (Git preserves history) or add ticket reference
- **Type assertions**: Explain why → `// Type-safe: Zod already validated this`
- **Magic numbers**: Use named constants or explain inline → `const ttl = 120000; // 2 min`

---

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
- Use Windows native commands: `dir`, `copy`, `move`, `mkdir`, `rmdir`
- For deleting files: Use `powershell -Command "Remove-Item -Force 'path'"` (cmd's `del` is unreliable through Bash tool)
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

Following these practices prevents 90% of lint errors and technical debt.

### Core Rules

| Rule | Do ✅ | Don't ❌ |
|------|-------|---------|
| **Type Safety** | Define types in centralized locations, use `import type` | Use `any`, define types inline |
| **Promises** | Always `await` or `.catch()`, use `void` for intentional fire-and-forget | Floating promises that hide errors |
| **Accessibility** | `onClick` + `onKeyDown`, alt text on images, aria-labels | Click handlers without keyboard support |
| **Imports** | Delete unused imports immediately, use `import type` | Leave unused imports "for later" |
| **Architecture** | Domain uses interfaces only, entities are immutable | Domain importing from infrastructure |
| **Null handling** | Use `undefined` and optional params (`param?: Type`) | Use `null` for optional values |
| **Dead code** | Delete immediately, search usage before committing | Leave methods "just in case" |

### Type Organization

| Location | Purpose |
|----------|---------|
| `domain/types/repository/` | SearchCriteria, Stats, QueryOptions |
| `domain/types/services/` | AccessControl, TubePosition, Validation |
| `domain/types/` | DomainValidationResult, ConfigurationUpdateData |

### Key Examples

```typescript
// Promises: Always handle
await someAsyncFunction();                           // ✅ Awaited
someAsyncFunction().catch(logger.error);            // ✅ Caught
void someAsyncFunction();                           // ✅ Intentional fire-and-forget
someAsyncFunction();                                // ❌ Floating promise

// Accessibility: Full keyboard support
<div role="button" tabIndex={0} onClick={handleClick}
     onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
     aria-label="Delete tube">Delete</div>

// Architecture: Domain stays pure
import type { TubeRepository } from '@domain/repositories';  // ✅ Interface
import { SQLiteDatabase } from '@infrastructure/database';   // ❌ Implementation

// Entities: Use readonly
get tanks(): readonly Tank[] { return this._tanks; }  // ✅ Immutable
tanks: Tank[];                                         // ❌ Mutable
```

### Prevention Philosophy

**"Do it right immediately" > "I'll fix it later"**

Proper types from line one | Proper error handling | Proper accessibility | Clean imports | Respect architecture | Delete dead code
