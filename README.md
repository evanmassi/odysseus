# Odysseus

Professional Liquid Nitrogen Tube Inventory Management System for laboratory research teams.

## Overview

Odysseus is a web application to manage and track liquid nitrogen tube inventories in research laboratories. It provides a comprehensive solution for organizing samples across a hierarchical storage system (Tanks → Racks → Boxes → Tubes) with advanced search, tube locking, and real-time collaboration features.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **TanStack Query** - Server state management
- **Zustand** - UI state management
- **Tailwind CSS** - Styling
- **React Hook Form + Zod** - Form handling and validation

### Backend
- **Express** with TypeScript
- **PostgreSQL** - Database
- **Clean Architecture** - Domain → Application → Infrastructure → Presentation
- **CQRS Pattern** - Commands and Queries separation
- **JWT** - Authentication with refresh tokens
- **Socket.IO** - Real-time updates

### Shared
- **@odysseus/shared-schemas** - Centralized Zod schemas (monorepo package)

## Project Structure

```
odysseus-app/
├── client/                 # React frontend
│   └── src/
│       ├── app/            # Providers, query config, stores
│       ├── domains/        # Feature modules (tubes, researchers, search, etc.)
│       ├── shared/         # Reusable components, hooks, utils
│       └── infrastructure/ # HTTP client, socket, caching
├── server/                 # Express backend
│   └── src/
│       ├── domain/         # Entities, repositories (interfaces), domain services
│       ├── application/    # Use cases, DTOs, commands, queries, event handlers
│       ├── infrastructure/ # Repository implementations, database, external services
│       └── presentation/   # Controllers, routes, middleware
└── packages/
    └── shared-schemas/     # Shared Zod validation schemas
```

## Prerequisites

- **Node.js** v18+
- **PostgreSQL** database
- **npm** for package management

## Installation

```bash
npm install
```

## Development

```bash
# Full stack (server + client)
npm run dev

# Individual components
npm run dev:client    # React on port 3000
npm run dev:server    # Express on port 3001
```

## Build & Test

```bash
npm run build         # Build all
npm test              # Run all tests
npm run lint          # Lint client
npm run typecheck     # Type checking
```

## Key Features

- **Tube Inventory** - CRUD with hierarchical storage (Tank/Rack/Box/Position)
- **Tube Locking** - Lock tubes with optional sharing to specific users
- **Researcher Management** - Link researchers to tubes with approval workflow
- **Advanced Search** - Full-text search with filters and saved searches
- **Real-time Sync** - Socket.IO for collaborative updates
- **Audit Trail** - Track all changes with archival
- **Role-based Access** - Admin and user roles with configurable security

## License

MIT

## Author

Evan Massi
