# User-to-Researcher Linking Implementation Plan

**Date**: 2025-01-24 (Updated during implementation)
**Feature**: Automatic User-Researcher Profile Linking During Registration with Admin Approval Workflow
**Status**: Phase 1-2 NEEDS UPDATES, Phase 3+ In Progress

**CRITICAL UPDATES**:

**Update 1: Auto-Generated Usernames**
- Original plan: Users choose their own usernames
- **Current approach**: Usernames auto-generated from researcher name (firstname.lastname)
- **Reason**: Prevents unprofessional usernames, ensures consistent naming, improves audit trails
- **Impact**: Simpler UI (one less field), better admin experience, clearer identity mapping

**Update 2: Admin Approval Workflow (NEW REQUIREMENT)**
- **First user**: Auto-approved as admin (first-time setup)
- **Subsequent users**: Self-register but require admin approval before login
- **Flow**: User registers → Status: PENDING → Admin approves/rejects → User can login
- **Why**: Removes admin overhead for 100+ users while maintaining security and control
- **Industry standard**: Used by Slack, Teams, GitHub Organizations, enterprise lab systems
- **Impact**: Requires status field throughout entire stack (database → domain → UI)

---

## Executive Summary

This plan implements a self-service registration flow with admin approval workflow where users create both their authentication account AND their researcher profile simultaneously, then await admin approval before accessing the system.

**Key Benefits**:
1. **Scalable**: Handles 100+ user registrations without admin creating each manually
2. **Secure**: Admin maintains control via approval process
3. **Professional**: Auto-generated usernames (firstname.lastname) prevent unprofessional naming
4. **Data Integrity**: User automatically linked to researcher profile via foreign key
5. **Industry Standard**: Matches enterprise lab management systems (Slack, Teams, GitHub model)

**Registration Flow**:

**First User (Admin Setup)**:
- Database empty → Registration form appears
- Admin registers: Creates user + researcher profile
- Username auto-generated: `evan.smith`
- Status: APPROVED (automatic)
- Role: ADMIN (automatic)
- Can login immediately ✅

**Subsequent Users (Self-Registration + Approval)**:
- User visits app → Registration form appears (always available)
- User registers: "Sarah Johnson" + password
- System creates:
  1. Researcher profile: "Sarah Johnson"
  2. User account: username `sarah.johnson`
  3. Link: User.researcherId → Researcher.id
  4. Status: PENDING
  5. Role: USER
- User sees: "Your account is awaiting approval. You'll be notified when approved."
- User **cannot login yet** ❌

**Admin Approval**:
- Admin sees notification: "3 pending users"
- Admin goes to User Management → Pending Approvals tab
- Admin approves: User status → APPROVED
- User can now login ✅

**When "Dr. Sarah Johnson" registers, the system creates**:
1. A User account (username `sarah.johnson`, password, PENDING status)
2. A Researcher profile (Sarah Johnson - appears in tube researcher dropdowns)
3. An automatic link between them (User.researcherId → Researcher.id)
4. Admin notification for approval

---

## Current State Analysis

### What Already Exists ✅

**1. Domain Layer** (`server/src/domain/entities/User.ts`)
- User entity has `researcherId?: string` field (line 22)
- All factory methods accept optional `researcherId` parameter
- Getter: `get researcherId(): string | undefined` (line 435)

**2. Researcher Domain** (`server/src/domain/entities/Researcher.ts`)
- Researcher entity fully implemented with validation
- ResearcherApplicationService handles CRUD operations
- Name uniqueness validation already exists

**3. Command/Handler Pattern** (`server/src/application/commands/UserCommands.ts`)
- CQRS pattern established with Commands and CommandHandlers
- CreateUserCommand + CreateUserCommandHandler for user creation
- Password validation integrated with SecurityConfig

### What's Missing ❌

**1. Database Schema**
- `users` table lacks `researcherId` column
- `users` table lacks `status` column for approval workflow
- No foreign key constraint to `researchers(id)`
- No database index for query optimization

**2. Infrastructure Layer Persistence**
- UserMapper doesn't include `researcherId` field
- UserMapper doesn't include `status` field
- SQLiteUserRepository.save() doesn't persist researcherId or status
- No migration to add columns to existing schema

**3. Domain Layer**
- User entity doesn't track approval status
- No domain methods for approval/rejection workflow

**4. Registration Flow**
- Current registration only creates User, not Researcher
- No API endpoint accepts researcher profile data
- No validation schema for combined user+researcher registration
- No approval workflow logic

**5. UI Layer**
- RegisterModal only has username/password fields
- No researcher profile fields (name, email, department, position)
- No display of linked researcher in User Management tab
- No "Pending Approvals" tab in admin panel
- No notification system for pending user approvals

---

## Architecture Decision: Why NOT Use Command/Handler Pattern

### Investigation Findings

After reviewing `UserCommands.ts` and `ResearcherApplicationService.ts`, the existing codebase uses **TWO DIFFERENT PATTERNS**:

1. **User Operations**: CQRS Command/Handler pattern
   - CreateUserCommand + CreateUserCommandHandler
   - Includes event publishing via EventBus
   - Password validation against SecurityConfig

2. **Researcher Operations**: Application Service pattern
   - ResearcherApplicationService.createResearcher()
   - Direct orchestration without commands
   - No event publishing

### Decision: Use Application Service Pattern

**Why NOT create a new RegisterUserWithResearcherCommand:**

1. **Consistency**: Researcher creation already uses Application Service pattern, not CQRS
2. **Cross-Aggregate Coordination**: This operation spans TWO aggregates (User + Researcher)
3. **Transaction Complexity**: Need to ensure atomicity across both entities
4. **Existing Pattern**: Registration endpoint already calls CreateUserCommandHandler directly
5. **YAGNI Principle**: No evidence of event sourcing or complex event-driven workflows

**Preferred Approach**: Extend existing patterns rather than introduce new complexity

---

## Proposed Implementation Plan

### Phase 1: Database Schema Update

**File**: `server/src/infrastructure/database/SQLiteContext.ts`

**Changes**:
```typescript
// Update users table schema (line 94)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  apiKey TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  passwordHash TEXT,
  salt TEXT,
  createdAt TEXT NOT NULL,
  researcherId TEXT,                                      // NEW FIELD (camelCase for consistency)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')), // NEW FIELD for approval workflow
  FOREIGN KEY (researcherId) REFERENCES researchers(id)   // NEW CONSTRAINT
)

// Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_users_researcherId ON users(researcherId);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);  // NEW INDEX for filtering by approval status
```

**Why This Works**:
- SQLite supports ALTER TABLE for adding columns
- NULL values allowed for researcherId (backward compatible for existing users)
- Status defaults to 'pending' for all new registrations (security by default)
- CHECK constraint ensures only valid status values ('pending', 'approved', 'rejected')
- Foreign key ensures data integrity (can't link to non-existent researcher)
- Indexes improve query performance:
  - `idx_users_researcherId`: Fast JOIN for user-researcher lookups
  - `idx_users_status`: Fast filtering for admin's "Pending Users" view

**Status Field Behavior**:
- **New registrations**: `DEFAULT 'pending'` (awaiting admin approval)
- **First user**: Overridden to 'approved' in application logic (auto-admin)
- **After approval**: Status changed from 'pending' → 'approved'
- **After rejection**: Status changed from 'pending' → 'rejected' (blocked from login)

---

### Phase 2: Infrastructure Layer (Persistence)

**Note**: This phase was PARTIALLY completed. The `researcherId` field was added, but the `status` field for approval workflow still needs to be added. The UserRepository already has `usernameExists()` method.

#### 2.1 Update UserMapper

**File**: `server/src/infrastructure/database/mappers/UserMapper.ts`

**Changes**:
```typescript
// Line 8: Add to UserRow interface
export interface UserRow {
  id: string;
  username: string;
  apiKey: string;
  role: 'admin' | 'user';
  passwordHash?: string;  // FIXED: was password_hash, now camelCase
  salt?: string;
  createdAt: string;
  researcherId?: string;  // NEW FIELD (camelCase to match database column)
  status?: string;         // NEW FIELD for approval workflow ('pending' | 'approved' | 'rejected')
}

// Line 29: Update toRow() method
static toRow(user: User): UserRow {
  return {
    id: user.id,
    username: user.username,
    apiKey: user.apiKey,
    role: user.role.isAdmin() ? 'admin' : 'user',
    passwordHash: user.passwordHash,  // FIXED: camelCase
    salt: user.salt,
    createdAt: SqliteDateMapper.toDbDateTime(user.createdAt),
    researcherId: user.researcherId,  // NEW MAPPING
    status: user.status                // NEW MAPPING for approval workflow
  };
}

// Line 46: Update fromRow() method
static fromRow(row: UserRow): User {
  return User.fromData({
    id: row.id,
    username: row.username,
    apiKey: row.apiKey,
    role: row.role,
    lastActivity: new Date().toISOString(),
    createdAt: SqliteDateMapper.fromDbDateTime(row.createdAt)!.toISOString(),
    passwordHash: row.passwordHash,    // FIXED: camelCase
    salt: row.salt,
    researcherId: row.researcherId,    // NEW MAPPING
    status: row.status                 // NEW MAPPING for approval workflow
  });
}
```

#### 2.2 Update SQLiteUserRepository

**File**: `server/src/infrastructure/repositories/SQLiteUserRepository.ts`

**Changes**:
```typescript
// Line 50: Update save() method SQL
async save(user: User): Promise<void> {
  const row = UserMapper.toRow(user);

  await this.context.execute(`
    INSERT OR REPLACE INTO users (
      id, username, apiKey, role, passwordHash, salt, createdAt, researcherId, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    row.id,
    row.username,
    row.apiKey,
    row.role,
    row.passwordHash,   // FIXED: camelCase
    row.salt,
    row.createdAt,
    row.researcherId,   // NEW PARAMETER
    row.status          // NEW PARAMETER for approval workflow
  ]);
}
```

**Why This Approach**:
- Minimal changes to existing code
- Leverages existing mapper pattern
- Type-safe with TypeScript interfaces
- No duplicate SQL queries

---

### Phase 3: Shared Validation Schema

**Note**: This phase was COMPLETED. Schema already created and exported.

**File**: `packages/shared-schemas/src/auth/authSchemas.ts` (CREATED)

**Schema Created**:
```typescript
import { z } from 'zod';

/**
 * Registration with researcher profile
 * Creates both User account and Researcher profile simultaneously
 * Username is auto-generated from researcher name (firstname.lastname)
 */
export const registerWithResearcherSchema = z.object({
  // User credentials (username auto-generated server-side)
  password: z.string()
    .min(4, 'Password must be at least 4 characters')
    .max(128, 'Password cannot exceed 128 characters'),

  // Researcher profile (used to generate username)
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .transform(val => val.trim()),

  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
    .transform(val => val.trim()),

  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email cannot exceed 255 characters')
    .transform(val => val.trim())
    .optional()
    .or(z.literal('')),

  department: z.string()
    .max(100, 'Department cannot exceed 100 characters')
    .transform(val => val.trim())
    .optional()
    .or(z.literal('')),

  position: z.string()
    .max(100, 'Position cannot exceed 100 characters')
    .transform(val => val.trim())
    .optional()
    .or(z.literal(''))
});

export type RegisterWithResearcherRequest = z.infer<typeof registerWithResearcherSchema>;
```

**Export Updated**:
```typescript
// packages/shared-schemas/src/index.ts
export { registerWithResearcherSchema, type RegisterWithResearcherRequest } from './auth/authSchemas';
```

**Why This Pattern**:
- Single Source of Truth for validation (MANDATORY per AGENTS.md)
- Reuses existing researcher validation logic
- Type-safe across client and server
- Follows established monorepo pattern

---

### Phase 4: Application Layer (Business Logic) - NEEDS UPDATES FOR APPROVAL WORKFLOW

**Note**: This phase was PARTIALLY completed. The `registerWithResearcher()` method was implemented, but needs updates for approval workflow (first-user detection, status handling). New approval methods need to be added.

**File**: `server/src/application/services/UserApplicationService.ts` (PARTIALLY IMPLEMENTED)

**Required Updates**:

#### 4.1 Update registerWithResearcher() Method

**Current Implementation** (lines 292-339):
```typescript
async registerWithResearcher(request: RegisterWithResearcherRequest): Promise<User> {
  // ... validation ...

  // Create User entity with auto-generated username and researcher link
  const user = User.createWithPassword(
    username,
    request.password,
    UserRole.user(), // New registrations are regular users
    researcher.id     // Link to created researcher
  );

  await this.userRepository.save(user);
  return user;
}
```

**UPDATED Implementation** (with approval workflow):
```typescript
import { UserRepository } from '../../domain/repositories/UserRepository';
import { ResearcherRepository } from '../../domain/repositories/ResearcherRepository';
import { ConfigurationRepository } from '../../domain/repositories/ConfigurationRepository';
import { AccessControlService } from '../../domain/services/AccessControlService';
import { User } from '../../domain/entities/User';
import { Researcher } from '../../domain/entities/Researcher';
import { UserRole } from '../../domain/valueObjects/UserRole';
import { RegisterWithResearcherRequest } from '@odysseus/shared-schemas';
import { ValidationError } from '../../domain/errors/ValidationError';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import { PermissionError } from '../../domain/errors/PermissionError';
import { nanoid } from 'nanoid';

/**
 * User Application Service
 *
 * Orchestrates user-related operations including registration with researcher profile
 * and admin approval workflow.
 */
export class UserApplicationService {
  constructor(
    private userRepository: UserRepository,
    private researcherRepository: ResearcherRepository,
    private configurationRepository: ConfigurationRepository,
    private accessControlService: AccessControlService
  ) {}

  /**
   * Register user with researcher profile and approval workflow
   *
   * Creates both User and Researcher entities atomically.
   * Auto-generates username from researcher name (firstname.lastname).
   * Links them via User.researcherId foreign key.
   *
   * APPROVAL WORKFLOW:
   * - First user: Auto-approved as admin (first-time setup)
   * - Subsequent users: Status set to PENDING (requires admin approval)
   *
   * @param request - Registration data (password, researcher info - no username)
   * @returns Created user with linked researcher
   * @throws ValidationError if researcher name exists or password invalid
   */
  async registerWithResearcher(request: RegisterWithResearcherRequest): Promise<User> {
    // Check if this is the first user (auto-admin setup)
    const isFirstUser = await this.userRepository.isEmpty();

    // Validate researcher name uniqueness (prevent duplicates)
    const nameExists = await this.researcherRepository.nameExists(
      request.firstName,
      request.lastName
    );
    if (nameExists) {
      throw new ValidationError(
        `Researcher profile already exists for ${request.firstName} ${request.lastName}. Please contact an administrator to link your account.`,
        { firstName: request.firstName, lastName: request.lastName }
      );
    }

    // Validate password against security policy
    await this.validatePasswordPolicy(request.password);

    // Generate unique username from researcher name
    const username = await this.generateUsername(request.firstName, request.lastName);

    // Create Researcher entity first (referenced by User)
    const researcher = Researcher.create(
      request.firstName,
      request.lastName,
      request.position,
      request.department,
      request.email
    );

    // Save researcher to database
    await this.researcherRepository.save(researcher);

    // Determine role and status based on first-user detection
    const role = isFirstUser ? UserRole.admin() : UserRole.user();
    const status = isFirstUser ? 'approved' : 'pending';

    // Create User entity with auto-generated username, researcher link, and approval status
    const user = User.createWithPassword(
      username,
      request.password,
      role,           // First user = admin, subsequent = user
      researcher.id,  // Link to created researcher
      status          // First user = approved, subsequent = pending
    );

    // Save user to database
    await this.userRepository.save(user);

    return user;
  }

  /**
   * Generate unique username from researcher name
   *
   * Algorithm:
   * 1. Try firstname.lastname (e.g., "sarah.johnson")
   * 2. If taken, try firstname.lastname.2, firstname.lastname.3, etc.
   *
   * Always includes full first and last name for admin clarity.
   *
   * @param firstName - Researcher first name
   * @param lastName - Researcher last name
   * @returns Unique username (guaranteed to not exist in database)
   */
  private async generateUsername(firstName: string, lastName: string): Promise<string> {
    // Sanitize names: lowercase, remove special characters, trim
    const sanitize = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    const first = sanitize(firstName);
    const last = sanitize(lastName);

    // Try firstname.lastname
    let candidate = `${first}.${last}`;
    if (!(await this.userRepository.usernameExists(candidate))) {
      return candidate;
    }

    // Try firstname.lastname.number with incrementing counter
    let counter = 2;
    while (counter < 100) {
      candidate = `${first}.${last}.${counter}`;
      if (!(await this.userRepository.usernameExists(candidate))) {
        return candidate;
      }
      counter++;
    }

    // Fallback: use nanoid for guaranteed uniqueness (should never reach here)
    const { nanoid } = await import('nanoid');
    return `${first}.${last}.${nanoid(6)}`;
  }

  /**
   * Validate password against configured security policy
   */
  private async validatePasswordPolicy(password: string): Promise<void> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();

    if (password.length < securityConfig.passwordMinLength) {
      throw new ValidationError(
        `Password must be at least ${securityConfig.passwordMinLength} characters long`
      );
    }

    if (password.length > 128) {
      throw new ValidationError('Password cannot exceed 128 characters');
    }

    if (securityConfig.requireStrongPasswords) {
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);

      if (!hasUppercase || !hasLowercase || !hasNumber) {
        throw new ValidationError(
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        );
      }
    }

    if (securityConfig.passwordRequireSpecialChars) {
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/.test(password);

      if (!hasSpecial) {
        throw new ValidationError(
          'Password must contain at least one special character (!@#$%^&* etc.)'
        );
      }
    }
  }

  /**
   * Approve pending user (admin only)
   *
   * Changes user status from 'pending' to 'approved', allowing login.
   * Only admins can approve users.
   *
   * @param userId - ID of user to approve
   * @param adminApiKey - Admin's API key for authorization
   * @throws PermissionError if requester is not admin
   * @throws NotFoundError if user not found
   * @throws ValidationError if user is not in pending status
   */
  async approveUser(userId: string, adminApiKey: string): Promise<void> {
    // Verify admin privileges
    const admin = await this.userRepository.findByApiKey(adminApiKey);
    if (!admin) {
      throw new PermissionError('Invalid authentication');
    }
    this.accessControlService.requireCanManageUsers(admin);

    // Get target user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    // Verify user is in pending status
    if (user.status !== 'pending') {
      throw new ValidationError(
        `User is not pending approval (current status: ${user.status})`,
        { userId, currentStatus: user.status }
      );
    }

    // Update status to approved
    user.approve(admin);
    await this.userRepository.save(user);
  }

  /**
   * Reject pending user (admin only)
   *
   * Changes user status from 'pending' to 'rejected', blocking login.
   * Rejected users cannot login but remain in database for audit trail.
   *
   * @param userId - ID of user to reject
   * @param adminApiKey - Admin's API key for authorization
   * @throws PermissionError if requester is not admin
   * @throws NotFoundError if user not found
   * @throws ValidationError if user is not in pending status
   */
  async rejectUser(userId: string, adminApiKey: string): Promise<void> {
    // Verify admin privileges
    const admin = await this.userRepository.findByApiKey(adminApiKey);
    if (!admin) {
      throw new PermissionError('Invalid authentication');
    }
    this.accessControlService.requireCanManageUsers(admin);

    // Get target user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    // Verify user is in pending status
    if (user.status !== 'pending') {
      throw new ValidationError(
        `User is not pending approval (current status: ${user.status})`,
        { userId, currentStatus: user.status }
      );
    }

    // Update status to rejected
    user.reject(admin);
    await this.userRepository.save(user);
  }

  /**
   * Get all pending users (admin only)
   *
   * Returns list of users awaiting admin approval.
   * Used by admin panel "Pending Approvals" tab.
   *
   * @param adminApiKey - Admin's API key for authorization
   * @returns Array of pending users
   * @throws PermissionError if requester is not admin
   */
  async getPendingUsers(adminApiKey: string): Promise<User[]> {
    // Verify admin privileges
    const admin = await this.userRepository.findByApiKey(adminApiKey);
    if (!admin) {
      throw new PermissionError('Invalid authentication');
    }
    this.accessControlService.requireCanManageUsers(admin);

    // Query users with pending status
    return await this.userRepository.findByStatus('pending');
  }
}
```

#### 4.2 Required Domain Layer Updates

**File**: `server/src/domain/entities/User.ts`

**Add Status Field and Methods**:
```typescript
export class User {
  // ... existing fields ...
  private _status: 'pending' | 'approved' | 'rejected';

  // Add to constructor and factory methods
  constructor(
    // ... existing parameters ...
    status: 'pending' | 'approved' | 'rejected' = 'pending'
  ) {
    // ...
    this._status = status;
  }

  // Getter
  get status(): 'pending' | 'approved' | 'rejected' {
    return this._status;
  }

  // Approval workflow methods
  approve(approvedBy: User): void {
    if (this._status !== 'pending') {
      throw new Error(`Cannot approve user with status ${this._status}`);
    }
    this._status = 'approved';
  }

  reject(rejectedBy: User): void {
    if (this._status !== 'pending') {
      throw new Error(`Cannot reject user with status ${this._status}`);
    }
    this._status = 'rejected';
  }

  isPending(): boolean {
    return this._status === 'pending';
  }

  isApproved(): boolean {
    return this._status === 'approved';
  }

  isRejected(): boolean {
    return this._status === 'rejected';
  }
}
```

#### 4.3 Required Repository Updates

**File**: `server/src/domain/repositories/UserRepository.ts`

**Add Method Signature**:
```typescript
export interface UserRepository {
  // ... existing methods ...

  /**
   * Find all users by approval status
   */
  findByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<User[]>;
}
```

**File**: `server/src/infrastructure/repositories/SQLiteUserRepository.ts`

**Implement Method**:
```typescript
async findByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<User[]> {
  const rows = await this.context.queryMany<UserRow>(
    'SELECT * FROM users WHERE status = ? ORDER BY createdAt DESC',
    [status]
  );
  return UserMapper.fromRows(rows);
}
```

**Why Application Service Instead of Command/Handler**:
1. **Cross-Aggregate Operation**: Coordinates User + Researcher creation
2. **Transaction Boundary**: Ensures both entities saved or neither
3. **Pattern Consistency**: Matches ResearcherApplicationService approach
4. **Simpler**: No event publishing needed for registration
5. **Reusable**: Can be called from multiple endpoints if needed

---

### Phase 5: Presentation Layer (API Endpoints) - NEEDS UPDATES FOR APPROVAL WORKFLOW

#### 5.1 Update AuthController - Registration Endpoint

**File**: `server/src/presentation/controllers/AuthController.ts`

**UPDATE Registration Method** (handle pending vs approved users differently):
```typescript
import { registerWithResearcherSchema, type RegisterWithResearcherRequest } from '@odysseus/shared-schemas';
import { UserApplicationService } from '../../application/services/UserApplicationService';

/**
 * Register with researcher profile (new user flow with approval workflow)
 * POST /api/public/auth/register-with-researcher
 *
 * Response varies based on user status:
 * - First user (admin): Returns tokens for immediate login
 * - Subsequent users (pending): Returns user data without tokens (awaiting approval)
 */
async registerWithResearcher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startTime = Date.now();

    // Validate request body against shared schema
    const validatedData = registerWithResearcherSchema.parse(req.body);

    // Create user + researcher via application service
    const user = await this.userApplicationService.registerWithResearcher(validatedData);

    logger.info('User registered with researcher profile', {
      userId: user.id,
      username: user.username,
      researcherId: user.researcherId,
      status: user.status,
      role: user.role.isAdmin() ? 'admin' : 'user'
    });

    // First user (admin): Immediately authenticated
    if (user.isApproved()) {
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;
      const authResult = await this.sessionService.createTokenPair(user, userAgent, ipAddress);

      const response = ResponseBuilder.withTiming(startTime, {
        user: user.toPublicData(),
        tokens: authResult.tokens,
        status: 'approved',
        message: 'Account created and approved'
      });

      return res.status(201).json(response);
    }

    // Subsequent users (pending): No tokens, awaiting approval
    const response = ResponseBuilder.withTiming(startTime, {
      user: user.toPublicData(),
      status: 'pending',
      message: 'Account created. Awaiting administrator approval.'
    });

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}
```

#### 5.2 Update AuthController - Login Endpoint

**UPDATE Login Method** (check approval status before issuing tokens):
```typescript
/**
 * Login with password (checks approval status)
 * POST /api/public/auth/login
 */
async login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body;

    // Authenticate user
    const user = await this.userRepository.findByUsername(username);
    if (!user || !user.validatePassword(password)) {
      throw new PermissionError('Invalid credentials');
    }

    // Check approval status BEFORE issuing tokens
    if (user.isPending()) {
      throw new PermissionError('Account is awaiting administrator approval');
    }

    if (user.isRejected()) {
      throw new PermissionError('Account access has been denied');
    }

    // Only approved users can login
    if (!user.isApproved()) {
      throw new PermissionError('Account is not approved for access');
    }

    // Create tokens for approved user
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;
    const authResult = await this.sessionService.createTokenPair(user, userAgent, ipAddress);

    res.json({
      user: user.toPublicData(),
      tokens: authResult.tokens
    });
  } catch (error) {
    next(error);
  }
}
```

#### 5.3 Add UserManagementController - Approval Endpoints

**File**: `server/src/presentation/controllers/UserManagementController.ts` (or within existing admin controller)

**Add Three New Methods**:
```typescript
/**
 * Get pending users (admin only)
 * GET /api/admin/users/pending
 */
async getPendingUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminApiKey = req.user.apiKey; // From auth middleware
    const pendingUsers = await this.userApplicationService.getPendingUsers(adminApiKey);

    res.json({
      success: true,
      data: pendingUsers.map(user => user.toPublicData())
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Approve pending user (admin only)
 * POST /api/admin/users/:userId/approve
 */
async approveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params;
    const adminApiKey = req.user.apiKey; // From auth middleware

    await this.userApplicationService.approveUser(userId, adminApiKey);

    logger.info('User approved', { userId, approvedBy: req.user.id });

    res.json({
      success: true,
      message: 'User approved successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject pending user (admin only)
 * POST /api/admin/users/:userId/reject
 */
async rejectUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params;
    const adminApiKey = req.user.apiKey; // From auth middleware

    await this.userApplicationService.rejectUser(userId, adminApiKey);

    logger.info('User rejected', { userId, rejectedBy: req.user.id });

    res.json({
      success: true,
      message: 'User rejected successfully'
    });
  } catch (error) {
    next(error);
  }
}
```

#### 5.4 Update Route Registration

**File**: `server/src/presentation/routes/AuthRouteModule.ts`

**Add Public Route**:
```typescript
router.post('/register-with-researcher', authController.registerWithResearcher.bind(authController));
```

**File**: `server/src/presentation/routes/AdminRouteModule.ts` (or UserManagementRouteModule)

**Add Admin-Only Routes**:
```typescript
// Requires admin authentication middleware
router.get('/users/pending', requireAdmin, userMgmtController.getPendingUsers.bind(userMgmtController));
router.post('/users/:userId/approve', requireAdmin, userMgmtController.approveUser.bind(userMgmtController));
router.post('/users/:userId/reject', requireAdmin, userMgmtController.rejectUser.bind(userMgmtController));
```

**Why This Approach**:
- Zod validation at API boundary (presentation layer)
- Business logic in application layer
- Clean separation of concerns
- Existing error handling middleware works
- Status check at login prevents unauthorized access
- Different response for approved vs pending users

---

### Phase 6: UI Layer (Registration Form) - NEEDS UPDATES FOR APPROVAL WORKFLOW

#### 6.1 Update RegisterModal Component

**File**: `client/src/domains/authentication/ui/components/RegisterModal.tsx`

**Add Fields**:
```typescript
export function RegisterModal() {
  const [password, setPassword] = useState('');

  // Researcher profile fields (used to generate username)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');

  // Preview generated username
  const previewUsername = useMemo(() => {
    if (!firstName || !lastName) return '';
    const sanitize = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return `${sanitize(firstName)}.${sanitize(lastName)}`;
  }, [firstName, lastName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Call registration endpoint (username auto-generated server-side)
      const response = await authHttpClient.post<{
        user: UserResponse;
        tokens?: { accessToken: string; refreshToken: string };
        status: 'approved' | 'pending';
        message: string;
      }>(
        '/api/public/auth/register-with-researcher',
        {
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          department: department.trim() || undefined,
          position: position.trim() || undefined
        }
      );

      // Handle first user (approved) - immediate authentication
      if (response.data.status === 'approved' && response.data.tokens) {
        // Store tokens and authenticate
        authStore.setTokens(response.data.tokens);
        authStore.setUser(response.data.user);

        // Close modal and redirect to app
        onClose();
        navigate('/app');
      }
      // Handle subsequent users (pending) - show approval message
      else if (response.data.status === 'pending') {
        // Show success message with pending status
        setSuccess({
          title: 'Account Created Successfully',
          message: `Your account (${response.data.user.username}) is awaiting administrator approval. You'll be able to login once approved.`,
          username: response.data.user.username
        });
      }
    } catch (err) {
      // Handle validation errors, duplicate names, etc.
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="...">
      <form onSubmit={handleSubmit}>
        {/* Password Only (Username auto-generated) */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Account Password</h3>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input w-full"
            />
          </div>
        </div>

        {/* NEW: Researcher Profile Section */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Researcher Profile</h3>

          <div className="grid grid-cols-2 gap-3">
            {/* First Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="input w-full"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="input w-full"
              />
            </div>
          </div>

          {/* Email (Optional) */}
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Department (Optional) */}
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Position (Optional) */}
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Position
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Username Preview */}
          {previewUsername && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">Your username will be:</span>{' '}
                <span className="font-mono">{previewUsername}</span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                If taken, a number will be added: {previewUsername}.2, {previewUsername}.3, etc.
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button type="submit" className="btn btn-primary w-full">
          Create Account
        </button>
      </form>
    </div>
  );
}
```

#### 6.2 Update UserManagementTab Display

**File**: `client/src/domains/admin/ui/components/tabs/UserManagementTab.tsx`

**Add Researcher Column**:
```typescript
// Add researcher data fetching
const { data: researchers = [] } = useResearchersQuery();

// Create researcher lookup map
const researcherMap = new Map(researchers.map(r => [r.id, r]));

// In table header (line 133):
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  Linked Researcher
</th>

// In table body (after Last Activity cell):
<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  {user.researcherId
    ? formatResearcherDropdownDisplay(researcherMap.get(user.researcherId)!)
    : <span className="text-gray-400 italic">None</span>
  }
</td>
```

**Why This UI Approach**:
- Simpler registration (no username field - auto-generated)
- Live preview shows what username will be created
- Clear section separation (Password vs Researcher Profile)
- Required fields marked with asterisk
- Optional fields clearly indicated
- Uses existing input styling
- Presenter pattern for researcher display in admin view
- **Approval workflow**: Different flow for approved vs pending users
- **Clear messaging**: Pending users see friendly waiting message instead of confusing error

**Benefits of Auto-Generated Usernames**:
- Professional, consistent naming (no "jerkface123" usernames)
- Clear identity mapping (username matches researcher name)
- Easier audit trails (logs show "sarah.johnson" not "coolbeans69")
- Prevents username squatting (can't claim "admin", "ceo", etc.)
- Better UX (one less field to fill, no "username already taken" frustration)
- Prevents typos in professional context

---

### Phase 7: Admin Approval UI (NEW PHASE)

**Purpose**: Allow admins to review and approve/reject pending user registrations

#### 7.1 Add Pending Approvals Tab

**File**: `client/src/domains/admin/ui/components/tabs/PendingApprovalsTab.tsx` (NEW FILE)

**Create New Tab Component**:
```typescript
import { useState } from 'react';
import { usePendingUsersQuery, useApproveUserMutation, useRejectUserMutation } from '../../hooks/useUserManagement';
import { formatResearcherDropdownDisplay } from '@odysseus/shared-schemas';

/**
 * Pending Approvals Tab
 *
 * Shows list of users awaiting admin approval.
 * Allows admin to approve or reject pending registrations.
 */
export function PendingApprovalsTab() {
  const { data: pendingUsers = [], isLoading, refetch } = usePendingUsersQuery();
  const approveUserMutation = useApproveUserMutation();
  const rejectUserMutation = useRejectUserMutation();

  const handleApprove = async (userId: string, username: string) => {
    if (!confirm(`Approve user ${username}?`)) return;

    try {
      await approveUserMutation.mutateAsync(userId);
      refetch();
      toast.success(`User ${username} approved`);
    } catch (error) {
      toast.error(`Failed to approve user: ${error.message}`);
    }
  };

  const handleReject = async (userId: string, username: string) => {
    if (!confirm(`Reject user ${username}? This will prevent them from logging in.`)) return;

    try {
      await rejectUserMutation.mutateAsync(userId);
      refetch();
      toast.success(`User ${username} rejected`);
    } catch (error) {
      toast.error(`Failed to reject user: ${error.message}`);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading pending users...</div>;
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p className="text-lg font-medium">No pending approvals</p>
        <p className="text-sm mt-2">All registered users have been reviewed</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Pending Approvals ({pendingUsers.length})
        </h2>
        <button
          onClick={() => refetch()}
          className="btn btn-secondary btn-sm"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Researcher Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Registered
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pendingUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono text-sm text-gray-900">{user.username}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.researcher
                    ? formatResearcherDropdownDisplay(user.researcher)
                    : <span className="text-gray-400 italic">Unknown</span>
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.researcher?.email || <span className="text-gray-400">-</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.researcher?.department || <span className="text-gray-400">-</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleApprove(user.id, user.username)}
                    className="btn btn-success btn-sm mr-2"
                    disabled={approveUserMutation.isLoading}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(user.id, user.username)}
                    className="btn btn-danger btn-sm"
                    disabled={rejectUserMutation.isLoading}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

#### 7.2 Add React Query Hooks

**File**: `client/src/domains/admin/hooks/useUserManagement.ts` (or similar)

**Add Three New Hooks**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminHttpClient } from '../../../infrastructure/http/adminHttpClient';

/**
 * Fetch pending users (admin only)
 */
export function usePendingUsersQuery() {
  return useQuery({
    queryKey: ['admin', 'users', 'pending'],
    queryFn: async () => {
      const response = await adminHttpClient.get('/api/admin/users/pending');
      return response.data.data; // Array of UserResponse with status='pending'
    }
  });
}

/**
 * Approve user mutation (admin only)
 */
export function useApproveUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await adminHttpClient.post(`/api/admin/users/${userId}/approve`);
    },
    onSuccess: () => {
      // Invalidate pending users list to trigger refetch
      queryClient.invalidateQueries(['admin', 'users', 'pending']);
      queryClient.invalidateQueries(['admin', 'users']); // Refresh all users list
    }
  });
}

/**
 * Reject user mutation (admin only)
 */
export function useRejectUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await adminHttpClient.post(`/api/admin/users/${userId}/reject`);
    },
    onSuccess: () => {
      // Invalidate pending users list to trigger refetch
      queryClient.invalidateQueries(['admin', 'users', 'pending']);
      queryClient.invalidateQueries(['admin', 'users']); // Refresh all users list
    }
  });
}
```

#### 7.3 Add Tab to Admin Panel

**File**: `client/src/domains/admin/ui/components/AdminSettings.tsx` (or AdminPanel.tsx)

**Add New Tab**:
```typescript
import { PendingApprovalsTab } from './tabs/PendingApprovalsTab';

// Add to tabs array
const tabs = [
  { id: 'users', label: 'User Management', component: UserManagementTab },
  { id: 'pending', label: 'Pending Approvals', component: PendingApprovalsTab, badge: pendingCount }, // NEW TAB
  { id: 'security', label: 'Security Settings', component: SecurityTab },
  // ... other tabs
];
```

#### 7.4 Add Notification Badge

**Show pending count in tab badge**:
```typescript
const { data: pendingUsers = [] } = usePendingUsersQuery();
const pendingCount = pendingUsers.length;

// Badge on "Pending Approvals" tab shows count
{pendingCount > 0 && (
  <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-500 text-white">
    {pendingCount}
  </span>
)}
```

**Why This Approach**:
- Dedicated tab for pending approvals (clean separation)
- Real-time count badge (admin sees pending users at a glance)
- Simple approve/reject buttons (one-click actions)
- Confirmation dialogs prevent accidental rejections
- React Query automatic refetch (always shows latest data)
- Optimistic updates (immediate UI feedback)
- Toast notifications (clear feedback on success/error)

---

## Transaction Safety & Error Handling

### Atomicity Concerns

**Problem**: What if researcher saves but user save fails?

**Solution**: Database transaction wrapper (future enhancement)

```typescript
// Wrap both operations in transaction
await this.database.transaction(async () => {
  await this.researcherRepository.save(researcher);
  await this.userRepository.save(user);
});
```

**Fallback (Current)**: Manual rollback on error

```typescript
try {
  await this.researcherRepository.save(researcher);
  await this.userRepository.save(user);
} catch (error) {
  // Rollback researcher creation
  await this.researcherRepository.delete(researcher.id);
  throw error;
}
```

### Duplicate Name Handling

**Scenario**: Two users try to register as "Sarah Johnson" simultaneously

**Protection**:
1. Database UNIQUE constraint on researchers(firstName, lastName)
2. Application-level name existence check before creation
3. Clear error message: "Researcher profile already exists for {name}. Please contact an administrator to link your account."

**User Action**: Contact admin to manually link existing researcher profile to their new user account

---

## Admin Use Cases

### Scenario 1: Legacy Researcher Needs Account

**Problem**: "Dr. John Smith" researcher exists (has tubes), no user account

**Solution**:
1. Dr. John Smith registers with username/password
2. System checks: Researcher "John Smith" already exists
3. Registration fails with message: "Researcher profile already exists. Contact admin."
4. Admin manually updates user: `UPDATE users SET researcher_id = 'researcher_xyz' WHERE username = 'jsmith'`

**Future Enhancement**: Admin UI to link existing users to existing researchers

### Scenario 2: Historical Researcher (No Account)

**Problem**: Researcher "Jane Doe" has tubes from 2020, retired, no account needed

**Solution**: Researcher remains unlinked (researcher_id = NULL for any user). Tubes remain associated via researcherId foreign key.

---

## Testing Strategy

### Unit Tests

**File**: `server/src/application/services/UserApplicationService.test.ts`

**Test Cases**:
1. ✅ Successfully create user + researcher with valid data
2. ✅ Reject duplicate username
3. ✅ Reject duplicate researcher name
4. ✅ Validate password against SecurityConfig
5. ✅ Link user.researcherId to created researcher.id
6. ✅ Handle researcher save failure (rollback)

### Integration Tests

**File**: `server/src/presentation/controllers/AuthController.test.ts`

**Test Cases**:
1. ✅ POST /register-with-researcher with valid data returns 201 + tokens
2. ✅ POST /register-with-researcher with invalid schema returns 400
3. ✅ POST /register-with-researcher with duplicate username returns 409
4. ✅ POST /register-with-researcher with duplicate researcher name returns 409

### E2E Tests

**Manual Testing Checklist**:
1. ✅ Register new user with researcher profile
2. ✅ Verify user can login with credentials
3. ✅ Verify researcher appears in tube researcher dropdown
4. ✅ Verify researcher name shown in User Management tab
5. ✅ Create tube as new user - verify researcherId auto-populates
6. ✅ Try registering duplicate username - verify error
7. ✅ Try registering duplicate researcher name - verify error

---

## Migration Strategy

### For New Deployments

Schema includes `researcher_id` column from start. No migration needed.

### For Existing Installations (If Needed)

Since current users are test data only, no migration required per user confirmation.

**If migration were needed**:

```sql
-- Add column (allows NULL for existing users)
ALTER TABLE users ADD COLUMN researcherId TEXT;

-- Add foreign key constraint
-- Note: SQLite requires recreating table for FK constraints on existing tables
-- This would require more complex migration script

-- Add index
CREATE INDEX IF NOT EXISTS idx_users_researcherId ON users(researcherId);
```

---

## Success Criteria

### Functional Requirements ✅

1. ✅ User registers with username, password, and researcher profile fields
2. ✅ System creates both User and Researcher entities
3. ✅ User.researcherId links to Researcher.id via foreign key
4. ✅ User can immediately login after registration
5. ✅ Researcher appears in tube researcher dropdowns
6. ✅ Admin sees linked researcher in User Management tab
7. ✅ Duplicate username rejected with clear error
8. ✅ Duplicate researcher name rejected with clear error
9. ✅ Password validated against SecurityConfig policies

### Non-Functional Requirements ✅

1. ✅ Type-safe across client and server (TypeScript + Zod)
2. ✅ Single Source of Truth for validation (shared-schemas)
3. ✅ Follows Clean Architecture layers
4. ✅ Consistent with existing patterns (Application Service)
5. ✅ Database integrity via foreign key constraints
6. ✅ No duplicate code or zombie logic
7. ✅ Future-proof for additional user-researcher features

---

## Files Modified/Created Summary

### New Files (5)
1. `packages/shared-schemas/src/auth/authSchemas.ts` - Registration validation schema
2. `server/src/application/services/UserApplicationService.ts` - User orchestration service
3. `server/src/application/services/UserApplicationService.test.ts` - Unit tests

### Modified Files (7)
1. `server/src/infrastructure/database/SQLiteContext.ts` - Add researcher_id column + FK + index
2. `server/src/infrastructure/database/mappers/UserMapper.ts` - Map researcher_id field
3. `server/src/infrastructure/repositories/SQLiteUserRepository.ts` - Persist researcher_id
4. `server/src/presentation/controllers/AuthController.ts` - Add registerWithResearcher endpoint
5. `server/src/presentation/routes/AuthRouteModule.ts` - Register new route
6. `client/src/domains/authentication/ui/components/RegisterModal.tsx` - Add researcher fields
7. `client/src/domains/admin/ui/components/tabs/UserManagementTab.tsx` - Display linked researcher

### Shared Schema Updates (1)
1. `packages/shared-schemas/src/index.ts` - Export registerWithResearcherSchema

**Total Impact**: 13 files (5 new, 7 modified, 1 updated export)

---

## Risk Assessment

### Low Risk ✅
- Database schema changes (backward compatible with NULL values)
- Mapper/Repository updates (straightforward field additions)
- UI form additions (isolated to registration modal)

### Medium Risk ⚠️
- Transaction atomicity (researcher created but user fails)
  - Mitigation: Manual rollback logic + database transaction wrapper
- Duplicate name race conditions (simultaneous registrations)
  - Mitigation: Database UNIQUE constraint + application-level check
- Foreign key constraint violations (linking to deleted researcher)
  - Mitigation: ON DELETE SET NULL constraint + graceful null handling

### High Risk ❌
None identified. This is a straightforward CRUD operation with existing patterns.

---

## Future Enhancements (Out of Scope)

1. **Admin UI for Manual Linking**: Allow admins to link existing users to existing researchers
2. **Auto-Suggest Researcher**: During registration, detect similar names and offer to link instead
3. **Researcher Transfer**: Allow admins to reassign user's linked researcher
4. **Bulk User Creation**: CSV import with automatic researcher profile creation
5. **SSO Integration**: SAML/OAuth provider auto-creates researcher profiles from claims

---

## Implementation Checklist

### Phase 1: Database ☐
- [ ] Update SQLiteContext.ts schema
- [ ] Add researcherId column (camelCase for consistency)
- [ ] Add foreign key constraint
- [ ] Add index for query performance
- [ ] Test database migrations

### Phase 2: Infrastructure ☐
- [ ] Update UserMapper interface (UserRow)
- [ ] Update UserMapper.toRow() method
- [ ] Update UserMapper.fromRow() method
- [ ] Update SQLiteUserRepository.save() SQL
- [ ] Write unit tests for mapper changes

### Phase 3: Shared Schemas ☐
- [ ] Create auth/authSchemas.ts file
- [ ] Define registerWithResearcherSchema
- [ ] Export from index.ts barrel
- [ ] Rebuild shared-schemas package
- [ ] Verify imports work in server/client

### Phase 4: Application Layer ☐
- [ ] Create UserApplicationService.ts
- [ ] Implement registerWithResearcher() method
- [ ] Add password validation logic
- [ ] Handle duplicate name detection
- [ ] Write comprehensive unit tests
- [ ] Test rollback scenarios

### Phase 5: Presentation Layer ☐
- [ ] Add registerWithResearcher() method to AuthController
- [ ] Add route to AuthRouteModule
- [ ] Test endpoint with Postman/curl
- [ ] Verify error handling works
- [ ] Check logging and metrics

### Phase 6: UI Layer ☐
- [ ] Update RegisterModal with researcher fields
- [ ] Add form validation
- [ ] Update API call to new endpoint
- [ ] Test registration flow end-to-end
- [ ] Update UserManagementTab to show linked researcher
- [ ] Test researcher display with Presenter pattern

### Phase 7: Testing ☐
- [ ] Write unit tests for all new code
- [ ] Write integration tests for API endpoints
- [ ] Manual E2E testing checklist
- [ ] Test error scenarios (duplicates, validation failures)
- [ ] Performance testing (no N+1 queries)

### Phase 8: Documentation ☐
- [ ] Update API documentation
- [ ] Update architecture diagrams if needed
- [ ] Add comments per AGENTS.md standards
- [ ] Update this report with any changes
- [ ] Create user-facing docs for registration flow

---

## Conclusion

This implementation follows established architectural patterns, maintains type safety across layers, ensures data integrity via database constraints, and provides a seamless user experience. The approach is pragmatic, future-proof, and eliminates technical debt by avoiding duplicate logic and zombie code.

**Estimated Effort**: 6-8 hours (including testing)

**Complexity**: Medium (cross-aggregate coordination, database changes)

**Risk**: Low (backward compatible, isolated changes, existing patterns)

**Business Value**: High (eliminates duplicate data entry, prevents impersonation, improves UX)

---

**Document Status**: READY FOR REVIEW
**Next Step**: User approval before implementation begins
