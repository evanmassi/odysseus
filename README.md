# Odysseus

Professional Liquid Nitrogen Tube Inventory Management System for laboratory research teams.

## Overview

Odysseus is a desktop application built for XcellBio to manage and track liquid nitrogen tube inventories in research laboratories. It provides a comprehensive solution for organizing samples across a hierarchical storage system (Tanks → Racks → Boxes → Tubes) with advanced search, filtering, and bulk operation capabilities.

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS** - Styling
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **Express** - HTTP server
- **SQLite** (better-sqlite3) - Database
- **Clean Architecture** - Architectural pattern
- **Domain-Driven Design** - Design approach
- **CQRS Pattern** - Commands and Queries separation
- **JWT** - Authentication
- **Socket.IO** - Real-time communication

### Desktop
- **Electron** - Desktop application framework

### Testing
- **Vitest** - Test runner
- **Testing Library** - Component testing

## Project Structure

This is a monorepo using npm workspaces:

```
odysseus-app/
├── client/              # React frontend
├── server/              # Express backend
│   ├── domain/         # Domain entities and business logic
│   ├── application/    # Use cases (commands/queries)
│   ├── infrastructure/ # External services, repositories
│   └── presentation/   # HTTP controllers and routes
├── packages/
│   └── shared-schemas/ # Shared TypeScript schemas
└── electron/           # Electron main process
```

The backend follows **Clean Architecture** principles with distinct layers:
- **Domain Layer**: Core business entities and rules
- **Application Layer**: Use cases and business workflows
- **Infrastructure Layer**: Database, external services, repositories
- **Presentation Layer**: HTTP routes, controllers, DTOs

## Prerequisites

- **Node.js** - v18 or higher recommended
- **Windows 10/11** - Required for current build configuration
- **Visual Studio Build Tools** - Required for native dependencies (better-sqlite3)

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

This will install dependencies for the root, client, server, and shared packages.

## Development

### Run the full application (recommended)

```bash
npm run dev
```

This starts the server, client dev server, and Electron app concurrently.

### Run individual components

```bash
# Client only (Vite dev server on port 5173)
npm run dev:client

# Server only (Express API)
npm run dev:server

# Electron (requires client to be running)
npm run dev:electron
```

## Build

Build all components for production:

```bash
npm run build
```

Individual builds:

```bash
npm run build:client
npm run build:server
npm run build:shared
```

## Testing

```bash
# Run all tests
npm test

# Client tests
npm run test:client

# Server tests
npm run test:server
```

## Code Quality

```bash
# Lint
npm run lint

# Lint with auto-fix
npm run lint:fix

# Format code
npm run format

# Type checking
npm run typecheck
```

## Packaging

Package the application for distribution:

```bash
# All platforms (based on electron-builder config)
npm run package

# Windows specifically
npm run package:win
```

## Features

- **Tube Inventory Management** - Track liquid nitrogen sample tubes
- **Hierarchical Storage** - Organize by Tanks → Racks → Boxes → Tubes
- **Researcher Management** - Associate samples with researchers
- **Advanced Search** - Filter by multiple criteria
- **Bulk Operations** - Import/export and batch updates
- **Real-time Sync** - WebSocket support for collaborative updates
- **Offline Support** - Local-first with SQLite database
- **Security** - JWT authentication with role-based access control
- **Audit Trail** - Track changes and operations

## Architecture Highlights

### Clean Architecture
The server is organized following Clean Architecture principles, ensuring:
- **Separation of Concerns** - Each layer has a specific responsibility
- **Dependency Inversion** - Dependencies flow inward toward the domain
- **Testability** - Business logic is independent of frameworks
- **Flexibility** - Easy to swap implementations (e.g., database, auth)

### Path Aliases
The project uses TypeScript path aliases for cleaner imports:
- `@domain/*` - Domain entities and business logic
- `@application/*` - Use cases and commands/queries
- `@infrastructure/*` - External services and repositories
- `@presentation/*` - Controllers and HTTP layer
- `@shared/*` - Shared utilities and types

### Design Patterns
- **Repository Pattern** - Data access abstraction
- **CQRS** - Command Query Responsibility Segregation
- **Dependency Injection** - Service container for loose coupling
- **Domain Events** - Event-driven architecture for side effects

## License

MIT

## Author

Evan Massi

## Company

XcellBio
