# Person Entity Implementation Plan

**Date**: 2025-11-03
**Author**: Claude (Sonnet 4.5)
**Status**: Planning - Awaiting Approval

---

## Executive Summary

Implement a Person entity as the single source of truth for human identity (name, contact, job info), with User and Researcher entities referencing it. This eliminates data duplication while preserving historical integrity through strategic denormalization.

**No data migration required** - fresh database start.

---

## Problem Statement

### Current Architecture Issues

1. **Limited User Profiles**: Non-researcher users (engineering, IT) have no profile information (name, position, department)
2. **Data Duplication**: Researcher users would need profile data stored in both User and Researcher
3. **Historical Integrity Risk**: Name changes could affect historical research records

### Requirements

1. All users must have profile information (firstName, lastName, position, department)
2. Researchers must maintain link to tubes for historical tracking
3. Name changes should not retroactively alter historical tube creation records
4. Single source of truth for person identity
5. Support three user types:
   - User only (engineering, view-only access)
   - Researcher only (external collaborator, no system access)
   - Both (research team members)

---

## Proposed Architecture

### Entity Relationship Diagram

```
Person (Core Identity - Source of Truth)
├─ id (PK)
├─ firstName (required)
├─ lastName (required)
├─ email (required, unique)
├─ position (optional)
├─ department (optional)
├─ createdAt
├─ updatedAt

User (Authentication/Authorization)
├─ id (PK)
├─ username (required, unique)
├─ personId (FK → Person) (required)
├─ passwordHash, salt
├─ role, status, apiKey
├─ researcherId (FK → Researcher) (optional)
├─ (remove: email, firstName, lastName, position, department)

Researcher (Research Domain)
├─ id (PK)
├─ personId (FK → Person) (required)
├─ (remove: firstName, lastName, email, position, department)
├─ (keep: research-specific fields if any)

Tube (Historical Record with Snapshot)
├─ id (PK)
├─ researcherId (FK → Researcher)
├─ createdByPersonId (FK → Person) (NEW)
├─ createdByName (denormalized snapshot) (NEW)
├─ (keep all existing fields)
```

### Key Design Decisions

**1. Person as Single Source of Truth**
- All name/contact data lives only in Person table
- User and Researcher reference Person via foreign key
- Updates to Person automatically reflect everywhere

**2. Historical Preservation via Denormalization**
- Tube stores `createdByName` snapshot at creation time
- If Jane Smith becomes Jane Doe:
  - Person.firstName updates to "Jane"
  - Person.lastName updates to "Doe"
  - Old tubes still show "Jane Smith" (snapshot)
  - New tubes show "Jane Doe" (current Person data)

**3. Flexible User Types**
- Engineering staff: Has Person + User (no Researcher)
- External collaborator: Has Person + Researcher (no User)
- Research team: Has Person + User + Researcher

---

## Implementation Phases

### Phase 0: Preparation & Verification ✓

**Tasks:**
- Document current architecture
- Identify all files requiring changes
- Create comprehensive checklist
- Review with user

**Estimated Time**: 1 hour

---

### Phase 1: Domain Layer - Person Entity

**1.1 Create Person Entity**

File: `server/src/domain/entities/Person.ts`

```typescript
export class Person {
  private constructor(
    private readonly _id: string,
    private _firstName: string,
    private _lastName: string,
    private _email: string,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _position?: string,
    private _department?: string
  ) {
    this.validate();
  }

  static create(
    firstName: string,
    lastName: string,
    email: string,
    position?: string,
    department?: string
  ): Person {
    const id = Person.generateId();
    const now = new Date();
    return new Person(id, firstName, lastName, email, now, now, position, department);
  }

  static fromData(data: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    position?: string;
    department?: string;
  }): Person {
    return new Person(
      data.id,
      data.firstName,
      data.lastName,
      data.email,
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.position,
      data.department
    );
  }

  updateProfile(firstName: string, lastName: string, position?: string, department?: string): void {
    this._firstName = firstName.trim();
    this._lastName = lastName.trim();
    this._position = position?.trim();
    this._department = department?.trim();
    this._updatedAt = new Date();
    this.validate();
  }

  updateEmail(email: string): void {
    this._email = email.toLowerCase().trim();
    this._updatedAt = new Date();
    this.validate();
  }

  private validate(): void {
    // Validation logic (name required, email format, etc.)
  }

  get fullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  // Getters...
}
```

**1.2 Create Person Repository Interface**

File: `server/src/domain/repositories/PersonRepository.ts`

```typescript
export interface PersonRepository {
  findById(id: string): Promise<Person | null>;
  findByEmail(email: string): Promise<Person | null>;
  emailExists(email: string): Promise<boolean>;
  save(person: Person): Promise<void>;
  delete(id: string): Promise<boolean>;
  findAll(): Promise<Person[]>;
}
```

**Files to Create:**
- `server/src/domain/entities/Person.ts`
- `server/src/domain/repositories/PersonRepository.ts`

**Estimated Time**: 2 hours

---

### Phase 2: Domain Layer - Update Existing Entities

**2.1 Update User Entity**

File: `server/src/domain/entities/User.ts`

**Changes:**
- Add `personId: string` (required)
- Remove `email`, `firstName`, `lastName`, `position`, `department` (if they existed)
- Update `createWithPassword()` to require personId
- Update `toPublicData()` to NOT include removed fields
- Keep all authentication/authorization logic intact

**2.2 Update Researcher Entity**

File: `server/src/domain/entities/Researcher.ts`

**Changes:**
- Add `personId: string` (required)
- Remove `firstName`, `lastName`, `email`, `position`, `department`
- Update `create()` to require personId
- Update `toData()` to NOT include removed fields
- Keep tube relationship intact

**2.3 Update Tube Entity**

File: `server/src/domain/entities/Tube.ts`

**Changes:**
- Add `createdByPersonId: string` (NEW - for reference)
- Add `createdByName: string` (NEW - snapshot for history)
- Update `create()` to accept both fields
- Keep `researcherId` as-is (for research linkage)

**Files to Modify:**
- `server/src/domain/entities/User.ts`
- `server/src/domain/entities/Researcher.ts`
- `server/src/domain/entities/Tube.ts`

**Estimated Time**: 3 hours

---

### Phase 3: Infrastructure Layer - Person Repository

**3.1 Create SQLitePersonRepository**

File: `server/src/infrastructure/repositories/SQLitePersonRepository.ts`

**Implementation:**
```typescript
export class SQLitePersonRepository implements PersonRepository {
  constructor(private context: SQLiteContext) {}

  async findById(id: string): Promise<Person | null> {
    const stmt = this.context.db.prepare('SELECT * FROM persons WHERE id = ?');
    const row = stmt.get(id);
    return row ? Person.fromData(row) : null;
  }

  async findByEmail(email: string): Promise<Person | null> {
    const stmt = this.context.db.prepare('SELECT * FROM persons WHERE email = ? COLLATE NOCASE');
    const row = stmt.get(email.toLowerCase().trim());
    return row ? Person.fromData(row) : null;
  }

  async emailExists(email: string): Promise<boolean> {
    const stmt = this.context.db.prepare('SELECT COUNT(*) as count FROM persons WHERE email = ? COLLATE NOCASE');
    const result = stmt.get(email.toLowerCase().trim()) as { count: number };
    return result.count > 0;
  }

  async save(person: Person): Promise<void> {
    const data = person.toData();
    const stmt = this.context.db.prepare(`
      INSERT INTO persons (id, firstName, lastName, email, position, department, createdAt, updatedAt)
      VALUES (@id, @firstName, @lastName, @email, @position, @department, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        firstName = @firstName,
        lastName = @lastName,
        email = @email,
        position = @position,
        department = @department,
        updatedAt = @updatedAt
    `);
    stmt.run(data);
  }

  // ... other methods
}
```

**3.2 Update Repository Factory**

File: `server/src/infrastructure/repositories/index.ts`

**Changes:**
- Add PersonRepository to factory
- Update SQLiteContext initialization to include persons table
- Export PersonRepository type

**3.3 Create Database Migration**

File: `server/src/infrastructure/database/migrations/add-person-entity.sql`

```sql
-- Create persons table
CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  position TEXT,
  department TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX idx_persons_email ON persons(email COLLATE NOCASE);

-- Alter users table (remove email, add personId)
ALTER TABLE users ADD COLUMN personId TEXT REFERENCES persons(id);
-- Note: SQLite doesn't support DROP COLUMN, so email column stays but becomes unused

-- Alter researchers table (add personId)
ALTER TABLE researchers ADD COLUMN personId TEXT REFERENCES persons(id);

-- Alter tubes table (add person tracking)
ALTER TABLE tubes ADD COLUMN createdByPersonId TEXT REFERENCES persons(id);
ALTER TABLE tubes ADD COLUMN createdByName TEXT;

CREATE INDEX idx_users_personId ON users(personId);
CREATE INDEX idx_researchers_personId ON researchers(personId);
CREATE INDEX idx_tubes_createdByPersonId ON tubes(createdByPersonId);
```

**Files to Create/Modify:**
- `server/src/infrastructure/repositories/SQLitePersonRepository.ts` (NEW)
- `server/src/infrastructure/repositories/index.ts` (MODIFY)
- `server/src/infrastructure/database/migrations/add-person-entity.sql` (NEW)
- `server/src/infrastructure/database/SQLiteContext.ts` (MODIFY - run migration)

**Estimated Time**: 4 hours

---

### Phase 4: Application Layer - Services & Commands

**4.1 Update UserApplicationService**

File: `server/src/application/services/UserApplicationService.ts`

**Changes to `registerWithResearcher()`:**

```typescript
async registerWithResearcher(request: RegisterWithResearcherRequest, createResearcher: boolean = true): Promise<User> {
  // 1. Create Person entity first
  const person = Person.create(
    request.firstName,
    request.lastName,
    request.email,
    request.position,
    request.department
  );

  // 2. Validate email uniqueness at Person level
  const emailExists = await this.personRepository.emailExists(request.email);
  if (emailExists) {
    throw new ValidationError('Email already in use');
  }

  // 3. Generate username
  const username = await this.generateUsername(request.firstName, request.lastName);

  // 4. Create User entity (references Person)
  const user = User.createWithPassword(
    username,
    request.password,
    role,
    person.id, // personId instead of email
    status
  );

  // 5. Optionally create Researcher entity (references Person)
  let researcher: Researcher | undefined;
  if (createResearcher) {
    researcher = Researcher.create(person.id);
  }

  // 6. Atomic transaction: Save Person, User, Researcher
  return await this.context.transaction(async () => {
    await this.personRepository.save(person);
    await this.userRepository.save(user);
    if (researcher) {
      await this.researcherRepository.save(researcher);
      // Link user to researcher
      user.linkToResearcher(researcher.id);
      await this.userRepository.save(user);
    }
    return user;
  });
}
```

**4.2 Update Tube Creation Commands**

File: `server/src/application/commands/TubeCommands.ts`

**Changes:**
- When creating tube, resolve Person from Researcher
- Snapshot `createdByName` from Person at creation time

```typescript
async execute(command: CreateTubeCommand): Promise<Tube> {
  // ... existing validation ...

  // Get researcher and their person data for snapshot
  const researcher = await this.researcherRepository.findById(command.researcherId);
  if (!researcher) throw new NotFoundError('Researcher not found');

  const person = await this.personRepository.findById(researcher.personId);
  if (!person) throw new NotFoundError('Person not found for researcher');

  // Create tube with person snapshot
  const tube = Tube.create({
    ...tubeData,
    researcherId: researcher.id,
    createdByPersonId: person.id,
    createdByName: person.fullName // Snapshot current name
  });

  await this.tubeRepository.save(tube);
  return tube;
}
```

**4.3 Create Person Management Commands**

File: `server/src/application/commands/PersonCommands.ts` (NEW)

```typescript
// UpdatePersonProfileCommand
// UpdatePersonEmailCommand
// GetPersonByIdQuery
```

**Files to Modify/Create:**
- `server/src/application/services/UserApplicationService.ts`
- `server/src/application/commands/TubeCommands.ts`
- `server/src/application/commands/PersonCommands.ts` (NEW)

**Estimated Time**: 5 hours

---

### Phase 5: Presentation Layer - Controllers & Routes

**5.1 Update AuthController**

File: `server/src/presentation/controllers/AuthController.ts`

**Changes:**
- Update `registerWithResearcher()` endpoint
- No breaking changes to API contract (request/response same)
- Internal logic uses Person entity

**5.2 Create PersonController**

File: `server/src/presentation/controllers/PersonController.ts` (NEW)

```typescript
export class PersonController {
  // GET /api/users/me/profile - Get current user's person profile
  async getMyProfile(req: Request, res: Response) {
    const user = req.user;
    const person = await personRepository.findById(user.personId);
    res.json({ success: true, data: person.toData() });
  }

  // PUT /api/users/me/profile - Update current user's profile
  async updateMyProfile(req: Request, res: Response) {
    const user = req.user;
    const person = await personRepository.findById(user.personId);
    person.updateProfile(req.body.firstName, req.body.lastName, req.body.position, req.body.department);
    await personRepository.save(person);
    res.json({ success: true, data: person.toData() });
  }
}
```

**5.3 Update TubeController**

File: `server/src/presentation/controllers/TubeController.ts`

**Changes:**
- Tube DTOs now include `createdByName` field
- Display logic uses snapshot name for historical tubes

**Files to Modify/Create:**
- `server/src/presentation/controllers/AuthController.ts`
- `server/src/presentation/controllers/PersonController.ts` (NEW)
- `server/src/presentation/controllers/TubeController.ts`
- `server/src/presentation/routes/UserRouteModule.ts`

**Estimated Time**: 3 hours

---

### Phase 6: Client Layer - Types & Services

**6.1 Update Shared Types**

File: `packages/shared-schemas/src/Person.ts` (NEW)

```typescript
export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePersonProfileRequest {
  firstName: string;
  lastName: string;
  position?: string;
  department?: string;
}
```

File: `packages/shared-schemas/src/User.ts`

**Changes:**
- Add `personId: string`
- Remove email, firstName, lastName (if present)

**6.2 Update Client Services**

File: `client/src/domains/authentication/services/PersonService.ts` (NEW)

```typescript
export class PersonService {
  async getMyProfile(): Promise<Person> {
    const response = await httpClient.get('/users/me/profile');
    return response.data.data;
  }

  async updateMyProfile(request: UpdatePersonProfileRequest): Promise<Person> {
    const response = await httpClient.put('/users/me/profile', request);
    return response.data.data;
  }
}
```

**Files to Create/Modify:**
- `packages/shared-schemas/src/Person.ts` (NEW)
- `packages/shared-schemas/src/User.ts` (MODIFY)
- `packages/shared-schemas/src/index.ts` (MODIFY - export Person)
- `client/src/domains/authentication/services/PersonService.ts` (NEW)

**Estimated Time**: 2 hours

---

### Phase 7: Client Layer - Account Tab UI (DEFERRED)

**Status**: Deferred to separate implementation after Person entity foundation is complete.

**Scope**: Profile management, security settings, activity log UI components.

**Rationale**: Build data layer and backend first, then UI separately for focused iterations.

**Estimated Time**: 6 hours (when implemented later)

---

### Phase 8: Testing & Verification

**8.1 Database Schema Verification**
- Verify persons table created correctly
- Verify foreign key constraints work
- Test cascade delete behavior

**8.2 Registration Flow Testing**
- Test user registration with researcher profile
- Test user registration without researcher profile
- Test email uniqueness validation
- Test first user auto-admin logic

**8.3 Profile Management Testing**
- Test profile update (name change)
- Test department/position update
- Verify Person entity updates correctly

**8.4 Historical Integrity Testing**
- Create tubes as "Jane Smith"
- Change name to "Jane Doe"
- Verify old tubes still show "Jane Smith"
- Verify new tubes show "Jane Doe"

**8.5 TypeScript Compilation**
- Build client: `npm run build:client`
- Build server: `npm run build:server`
- Build shared: `npm run build:shared`
- Zero errors required

**Estimated Time**: 4 hours

---

## Implementation Checklist

### Domain Layer
- [ ] Create Person entity (`server/src/domain/entities/Person.ts`)
- [ ] Create PersonRepository interface (`server/src/domain/repositories/PersonRepository.ts`)
- [ ] Update User entity (add personId, remove profile fields)
- [ ] Update Researcher entity (add personId, remove profile fields)
- [ ] Update Tube entity (add createdByPersonId, createdByName)

### Infrastructure Layer
- [ ] Create SQLitePersonRepository
- [ ] Update RepositoryFactory to include PersonRepository
- [ ] Create database migration script
- [ ] Update SQLiteContext to run migration
- [ ] Update SQLiteUserRepository (handle personId)
- [ ] Update SQLiteResearcherRepository (handle personId)
- [ ] Update SQLiteTubeRepository (handle person fields)

### Application Layer
- [ ] Update UserApplicationService.registerWithResearcher()
- [ ] Update TubeCommands (snapshot person name on create)
- [ ] Create PersonCommands (UpdateProfile, GetProfile)
- [ ] Update ServiceContainer DI (inject PersonRepository)

### Presentation Layer
- [ ] Update AuthController.registerWithResearcher()
- [ ] Create PersonController (profile endpoints)
- [ ] Update TubeController (include createdByName in DTOs)
- [ ] Create UserRouteModule routes for profile

### Shared Schemas
- [ ] Create Person.ts types
- [ ] Update User.ts types (add personId, remove fields)
- [ ] Update Researcher.ts types (add personId, remove fields)
- [ ] Update Tube.ts types (add person fields)
- [ ] Export all new types from index.ts

### Client Services
- [ ] Create PersonService
- [ ] Update AuthService (handle new types)
- [ ] Update TubeService (handle new types)

### Client UI
- [ ] Update RegisterModal (handle new Person entity types)
- [ ] ~~Create ProfileSection component~~ (DEFERRED)
- [ ] ~~Create SecuritySection component~~ (DEFERRED)
- [ ] ~~Create ActivityLogSection component~~ (DEFERRED)
- [ ] ~~Create AccountTab container~~ (DEFERRED)
- [ ] ~~Update SettingsModal (add Account tab)~~ (DEFERRED)

### Testing & Verification
- [ ] Test database migration
- [ ] Test registration flow (with/without researcher)
- [ ] Test profile updates
- [ ] Test name change historical preservation
- [ ] Test TypeScript compilation (0 errors)
- [ ] Manual E2E testing

---

## Risk Analysis & Mitigation

### High Risk Items

**1. Breaking Changes to API Contracts**

**Risk**: Client and server type mismatches
**Mitigation**:
- Update shared-schemas first
- Build shared package before client/server
- TypeScript will catch mismatches at compile time

**2. Database Foreign Key Integrity**

**Risk**: Orphaned records if Person deleted
**Mitigation**:
- Use ON DELETE RESTRICT for Person foreign keys
- Prevent Person deletion if User or Researcher exists
- Admin must delete User/Researcher first, then Person

**3. Email Uniqueness Across Person Table**

**Risk**: Duplicate email validation logic scattered
**Mitigation**:
- Single validation in PersonRepository
- Database UNIQUE constraint on email column
- All services use PersonRepository.emailExists()

**4. Historical Data Consistency**

**Risk**: Tubes missing createdByName after migration
**Mitigation**:
- Not applicable - fresh database start
- New tube creation always populates both fields

### Medium Risk Items

**1. Complex Transaction Logic**

**Risk**: Partial saves if transaction fails
**Mitigation**:
- Use SQLiteContext.transaction() for atomicity
- Proper error handling with rollback
- Test transaction failures

**2. Client State Management**

**Risk**: Cached person data becomes stale
**Mitigation**:
- Invalidate queries after profile updates
- Use TanStack Query for automatic cache management

---

## Rollback Plan

Since this is a fresh database start with no data preservation:

**Option 1: Abort Before Implementation**
- No changes made yet
- Can abandon plan without consequences

**Option 2: Revert Code Changes**
- Use git to revert all commits
- Delete database file
- Rebuild from previous state

**Option 3: Keep New Architecture**
- Continue with implementation
- Fix issues as discovered
- No data loss risk (fresh start)

---

## Success Criteria

### Functional Requirements
✅ All users have person profiles (firstName, lastName, email, position, department)
✅ Non-researcher users can register and have profiles
✅ Researcher users link to both Person and Researcher entities
✅ Name changes do not affect historical tube records
✅ New tubes reflect current person name
✅ Person API endpoints functional (profile get/update)
⏸️ Account tab UI (deferred to separate implementation)

### Technical Requirements
✅ Zero TypeScript compilation errors
✅ All tests pass
✅ Database migration runs successfully
✅ Foreign key constraints enforced
✅ Transaction atomicity maintained

### Code Quality Requirements
✅ Follows Clean Architecture patterns
✅ No code duplication (DRY principle)
✅ Proper error handling throughout
✅ Comprehensive logging
✅ Self-documenting code (minimal comments per AGENTS.md)

---

## Timeline Estimate

| Phase | Description | Hours |
|-------|-------------|-------|
| 0 | Preparation & Verification | 1 |
| 1 | Domain - Person Entity | 2 |
| 2 | Domain - Update Existing Entities | 3 |
| 3 | Infrastructure - Person Repository | 4 |
| 4 | Application - Services & Commands | 5 |
| 5 | Presentation - Controllers & Routes | 3 |
| 6 | Client - Types & Services | 2 |
| 7 | ~~Client - Account Tab UI~~ | ~~6~~ (DEFERRED) |
| 8 | Testing & Verification | 4 |
| **Total** | | **24 hours** |

**Estimated Calendar Time**: 3-4 days of focused work

**Note**: Account Tab UI (6 hours) deferred to separate implementation after foundation is complete.

---

## Next Steps

1. **Review this plan** with user
2. **Approve or request changes**
3. **Begin Phase 1** upon approval
4. **Track progress** using TodoWrite tool
5. **Update this document** with actual findings during implementation

---

## Questions for User

Before proceeding, please confirm:

1. ✅ Fresh database start is acceptable (no data migration needed)
2. ✅ Person entity approach is approved
3. ✅ Timeline estimate is acceptable
4. ✅ Ready to proceed with implementation

**Status**: Awaiting user approval to begin implementation.
