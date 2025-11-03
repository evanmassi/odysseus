# Email Login & Email Uniqueness - Implementation Gaps Report

**Date**: 2025-10-25
**Feature**: Username OR Email Login + Email Uniqueness Validation
**Status**: 80% Complete - 3 Critical Gaps Identified

---

## Executive Summary

The implementation of username OR email login and email uniqueness validation is **mostly functional** but has **3 critical gaps** that could cause significant user experience issues and potential security concerns. These must be addressed before production deployment.

**Overall Assessment**:
- ✅ Database schema includes email columns
- ✅ Repository methods implemented (findByEmail, emailExists)
- ✅ Login routing logic implemented (@ symbol detection)
- ✅ Email uniqueness validation with 3-layer defense
- ✅ Frontend error display working
- ❌ Username validation allows @ symbol (ambiguity issue)
- ❌ No email normalization (case sensitivity issues)
- ❌ Missing email index on users table

---

## 🔴 CRITICAL GAPS (Must Fix Immediately)

### GAP #1: Username Validation Allows @ Symbol

**Priority**: 🔴 **CRITICAL**
**Location**: `server/src/domain/entities/User.ts:177`
**Impact**: Users could create accounts they cannot login to

#### The Problem

```typescript
// Current implementation
const usernamePattern = /^[a-zA-Z0-9_\-\.@]+$/;  // ← Allows @
```

The username validation regex explicitly allows @ symbols, which creates ambiguity with the email detection logic in login.

#### Real-World Scenario

1. User registers with username: `john@company`
2. Later tries to login with: `john@company`
3. Login detects @ symbol and routes to `findByEmail("john@company")`
4. Email lookup fails (no such email)
5. **User cannot login** ❌

#### Security Concern

Attackers could register usernames like:
- `admin@`
- `support@`
- `root@company`

This could create confusion or denial-of-service attacks.

#### Industry Standard

**RFC 5322** (email address specification) defines @ as the separator between local-part and domain. Industry standard is to **prohibit @ in usernames** to avoid ambiguity.

**Examples**:
- GitHub: Usernames cannot contain @
- Twitter: Usernames cannot contain @
- LinkedIn: Usernames cannot contain @

#### Recommended Fix

```typescript
// Remove @ from allowed characters
const usernamePattern = /^[a-zA-Z0-9_\-\.]+$/;

// Update error message
throw new ValidationError('Username can only contain letters, numbers, underscores, hyphens, and dots');
```

#### Files to Change

1. `server/src/domain/entities/User.ts:177` - Update regex pattern
2. `server/src/domain/entities/User.ts:179` - Update error message
3. Test with existing users to ensure no one has @ in username

---

### GAP #2: No Email Normalization (Case Sensitivity Issue)

**Priority**: 🔴 **CRITICAL**
**Locations**:
- `server/src/infrastructure/repositories/SQLiteUserRepository.ts:45` (findByEmail)
- `server/src/infrastructure/repositories/SQLiteUserRepository.ts:95` (emailExists)
- `server/src/application/services/UserApplicationService.ts:162` (login)

**Impact**: Login failures, duplicate email registrations possible

#### The Problem

Email lookups are **case-sensitive**, violating RFC 5321 standards:

```typescript
// Current implementation - case-sensitive
async findByEmail(email: string): Promise<User | null> {
  const row = await this.context.queryOne<UserRow>(
    'SELECT * FROM users WHERE email = ?',  // Case-sensitive comparison!
    [email]  // Not normalized
  );
  return row ? UserMapper.fromRow(row) : null;
}
```

#### Real-World Scenarios

**Scenario 1: Login Failure**
1. User registers with: `John@Example.com`
2. Later tries to login with: `john@example.com`
3. **Login fails** - email doesn't match ❌

**Scenario 2: Duplicate Emails**
1. User A registers: `User@Test.com`
2. User B registers: `user@test.com`
3. SQLite UNIQUE constraint is case-sensitive
4. **Both accepted!** ❌ (violates email uniqueness)

#### RFC 5321 Standard

Per RFC 5321 Section 2.3.11:
> "The local-part of a mailbox MUST BE treated as case sensitive. However, exploiting the case sensitivity of mailbox local-parts impedes interoperability and is discouraged."

**Industry Practice**: Email addresses should be **case-insensitive for comparison** (though case-preserving for display).

#### Recommended Fix

**1. Normalize at Repository Layer** (immediate fix):

```typescript
async findByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const row = await this.context.queryOne<UserRow>(
    'SELECT * FROM users WHERE LOWER(email) = ?',
    [normalizedEmail]
  );
  return row ? UserMapper.fromRow(row) : null;
}

async emailExists(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const result = await this.context.queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM users WHERE LOWER(email) = ?',
    [normalizedEmail]
  );
  return (result?.count || 0) > 0;
}
```

**2. Normalize Before Storage** (better long-term fix):

```typescript
// In User factory methods
static createWithPassword(
  username: string,
  password: string,
  role: UserRole,
  email?: string
): User {
  // Normalize email before creating entity
  const normalizedEmail = email?.toLowerCase().trim();

  const id = User.generateId();
  const apiKey = User.generateApiKey(username);
  const { hash, salt } = User.hashPassword(password);
  const now = new Date();

  return new User(id, username, apiKey, role, now, now, undefined, 'pending', normalizedEmail);
}
```

**3. Update Database Constraint** (optional but recommended):

```sql
-- Option A: Use COLLATE NOCASE
email TEXT UNIQUE COLLATE NOCASE,

-- Option B: Add CHECK constraint to enforce lowercase
email TEXT UNIQUE CHECK (email = LOWER(email)),
```

#### Files to Change

1. `server/src/infrastructure/repositories/SQLiteUserRepository.ts:43-49` - Update findByEmail
2. `server/src/infrastructure/repositories/SQLiteUserRepository.ts:93-99` - Update emailExists
3. `server/src/domain/entities/User.ts:78-104` - Normalize in factory methods
4. `server/src/application/services/UserApplicationService.ts:162` - Pass normalized email to findByEmail

---

### GAP #3: No Email Index on Users Table

**Priority**: 🔴 **CRITICAL** (for performance)
**Location**: `server/src/infrastructure/database/SQLiteContext.ts` (indexes section)
**Impact**: Slow email lookups, performance degradation as database grows

#### The Problem

```typescript
// Current indexes
private createIndexes(): void {
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(apiKey)');
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');

  // Researchers table HAS email index
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_researchers_email ON researchers(email)');

  // ❌ Users table DOES NOT have email index
}
```

#### Impact

- Email lookups perform **full table scan** (O(n) complexity)
- Every login with email scans entire users table
- Performance degrades linearly with user growth
- 1,000 users: ~acceptable
- 10,000 users: noticeable delay
- 100,000+ users: **unacceptable login times**

#### Recommended Fix

```typescript
private createIndexes(): void {
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(apiKey)');
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');  // ← Add this
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_researchers_email ON researchers(email)');
}
```

#### Performance Improvement

- Before: O(n) full table scan
- After: O(log n) B-tree index lookup
- **100x-1000x faster** for large datasets

#### Files to Change

1. `server/src/infrastructure/database/SQLiteContext.ts` - Add email index

---

## ⚠️ HIGH PRIORITY GAPS (Fix Soon)

### GAP #4: No Email Normalization Before Storage

**Priority**: ⚠️ **HIGH**
**Location**: `server/src/domain/entities/User.ts:203-214`
**Impact**: Inconsistent email casing in database

#### The Problem

Email validation trims for checking but doesn't normalize the stored value:

```typescript
private validateEmail(): void {
  if (this._email && this._email.trim().length > 0) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this._email.trim())) {  // ← Trims for validation
      throw new ValidationError('Invalid email format');
    }
    // But stores this._email with original casing!
  }
}
```

#### Recommended Fix

Normalize in factory methods before entity creation (see GAP #2 fix above).

---

### GAP #5: No Transaction for Researcher-User Email Sync

**Priority**: ⚠️ **HIGH**
**Location**: `server/src/application/services/UserApplicationService.ts:367-404`
**Impact**: Data inconsistency risk if partial save fails

#### The Problem

Registration creates researcher and user separately without transaction:

```typescript
// Current implementation
async registerWithResearcher(request: RegisterWithResearcherRequest): Promise<User> {
  // 1. Create and save researcher
  const researcher = Researcher.create(...);
  await this.researcherRepository.save(researcher);  // ← Could fail here

  // 2. Create and save user
  const user = User.createWithPassword(...);
  await this.userRepository.save(user);  // ← Or fail here

  return user;
}
```

#### Risk Scenario

1. Researcher saved successfully
2. Server crashes before user saved
3. **Result**: Orphaned researcher record without user account

#### Recommended Fix

```typescript
async registerWithResearcher(request: RegisterWithResearcherRequest): Promise<User> {
  return await this.context.transaction(async () => {
    // 1. Create and save researcher
    const researcher = Researcher.create(...);
    await this.researcherRepository.save(researcher);

    // 2. Create and save user
    const user = User.createWithPassword(...);
    await this.userRepository.save(user);

    // Both succeed or both rollback
    return user;
  });
}
```

#### Files to Change

1. `server/src/application/services/UserApplicationService.ts:367-404` - Wrap in transaction
2. Check if SQLiteContext supports transactions (it should)

---

### GAP #6: Frontend Email Input Allows Leading/Trailing Spaces

**Priority**: ⚠️ **HIGH**
**Location**: `client/src/domains/authentication/ui/components/RegisterModal.tsx:282-313`
**Impact**: Poor UX, potential validation errors

#### The Problem

User can input ` user@test.com ` (with spaces) and it passes frontend validation.

#### Recommended Fix

```typescript
// In RegisterModal.tsx
<input
  type="email"
  value={email}
  onChange={(e) => {
    const trimmed = e.target.value.trim();
    setEmail(trimmed);
    setEmailTouched(true);
    setEmailError(null);
  }}
  // ... rest of props
/>
```

---

### GAP #7: Generic Error Message Could Leak Info in Logs

**Priority**: ⚠️ **HIGH**
**Location**: `server/src/application/services/UserApplicationService.ts:166`
**Impact**: Security - potential user enumeration via log analysis

#### The Problem

```typescript
if (!user || !user.validatePassword(request.password)) {
  throw new PermissionError('Invalid credentials', { username: request.username });
  //                                                 ↑ Logs user input
}
```

While the error message is generic (good!), the error context includes the username/email input, which gets logged.

#### Recommended Fix

```typescript
if (!user || !user.validatePassword(request.password)) {
  // Don't include user input in error context for failed auth
  throw new PermissionError('Invalid credentials');
}
```

---

### GAP #8: No Rate Limiting on Authentication Endpoints

**Priority**: ⚠️ **HIGH**
**Location**: Authentication endpoints (global concern)
**Impact**: Security - vulnerable to brute force attacks

#### Missing

- Rate limiting on login attempts
- CAPTCHA after failed attempts
- Account lockout mechanism
- IP-based throttling

#### Recommended Fix

Implement rate limiting middleware:

```typescript
// Example: Express rate limiting
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to login endpoint
router.post('/login', loginLimiter, authController.login);
```

---

## 📋 MEDIUM PRIORITY GAPS (Fix Eventually)

### GAP #9: No Email Verification Flow

**Priority**: 📋 **MEDIUM**
**Impact**: Cannot verify user owns the email address

#### Missing Components

1. Email verification token generation
2. Email sending service integration (SendGrid, AWS SES, etc.)
3. `emailVerified` boolean field in users table
4. Verification email template
5. Verification link click handler
6. Resend verification link functionality

#### Industry Standard Implementation

```typescript
// Add to User entity
interface UserRow {
  // ... existing fields
  email: string;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpiry: string | null;
}

// Registration flow
async register(userData: RegisterRequest): Promise<void> {
  const user = User.create(userData);
  const token = generateSecureToken();
  user.setEmailVerificationToken(token, expiresIn24Hours);

  await userRepository.save(user);
  await emailService.sendVerificationEmail(user.email, token);
}

// Verification handler
async verifyEmail(token: string): Promise<void> {
  const user = await userRepository.findByVerificationToken(token);
  if (!user || user.isVerificationExpired()) {
    throw new ValidationError('Invalid or expired verification token');
  }

  user.markEmailVerified();
  await userRepository.save(user);
}
```

---

### GAP #10: No Password Reset via Email

**Priority**: 📋 **MEDIUM**
**Impact**: Users locked out if they forget password (admin intervention required)

#### Missing Components

1. "Forgot Password" endpoint
2. Password reset token generation
3. Password reset email template
4. Reset token expiration (15-60 minutes)
5. One-time use tokens
6. Password reset form
7. Rate limiting on reset requests

#### Industry Standard Implementation

```typescript
// Request password reset
async requestPasswordReset(email: string): Promise<void> {
  const user = await userRepository.findByEmail(email);

  // Always return success (prevent email enumeration)
  if (!user) return;

  const token = generateSecureToken();
  user.setPasswordResetToken(token, expiresIn30Minutes);

  await userRepository.save(user);
  await emailService.sendPasswordResetEmail(user.email, token);
}

// Reset password
async resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await userRepository.findByResetToken(token);
  if (!user || user.isResetTokenExpired()) {
    throw new ValidationError('Invalid or expired reset token');
  }

  user.setPassword(newPassword);
  user.clearResetToken();
  await userRepository.save(user);
}
```

---

### GAP #11: No Email Change Functionality

**Priority**: 📋 **MEDIUM**
**Impact**: Users cannot update their email address

#### Missing Components

1. Change email endpoint
2. Email change verification (verify both old and new email)
3. Email change history/audit trail
4. Session invalidation after email change

---

## 📝 LOW PRIORITY GAPS (Polish & Optimization)

### GAP #12: Email Regex Too Simple

**Priority**: 📝 **LOW**
**Location**: `server/src/domain/entities/User.ts:205`
**Impact**: Accepts some invalid email formats

#### Current Regex

```typescript
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

#### Issues

- Allows multiple @ symbols: `user@@domain.com`
- Allows dots at start/end: `.user@domain.com`
- Allows consecutive dots: `user..name@domain.com`
- Doesn't validate TLD length
- Allows spaces before/after

#### Better Regex

```typescript
const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
```

**Note**: Perfect email validation is complex. Consider using a library like `email-validator` or `validator.js`.

---

### GAP #13: No Email in User DTO Response

**Priority**: 📝 **LOW**
**Location**: Check user response DTOs
**Impact**: Frontend may not be able to display user's email

Verify email is included in API responses for user profile display.

---

### GAP #14: No Email Sanitization for Display

**Priority**: 📝 **LOW**
**Impact**: Potential XSS if email displayed without escaping

Ensure email is properly escaped when displayed in UI to prevent XSS attacks (low risk but best practice).

---

## 📊 Implementation Priority Roadmap

### Phase 1: Critical Fixes (Before Production)

1. ✅ Remove @ from username validation
2. ✅ Add email normalization (lowercase + trim)
3. ✅ Fix case-insensitive email lookups
4. ✅ Add email index on users table

**Estimated Time**: 4-6 hours
**Risk if not fixed**: High - User login failures, data inconsistencies

---

### Phase 2: High Priority (Next Sprint)

5. Wrap registration in database transaction
6. Trim email input on frontend
7. Add rate limiting on auth endpoints
8. Remove username from error context

**Estimated Time**: 8-10 hours
**Risk if not fixed**: Medium - Security vulnerabilities, data inconsistency

---

### Phase 3: Medium Priority (Future Release)

9. Email verification flow
10. Password reset flow
11. Email change functionality

**Estimated Time**: 40-60 hours
**Risk if not fixed**: Low - Reduced functionality but not critical

---

### Phase 4: Polish (When Time Permits)

12. Improve email regex validation
13. Add email to DTOs if missing
14. Email sanitization for display

**Estimated Time**: 4-8 hours
**Risk if not fixed**: Very Low - Minor UX/security improvements

---

## Testing Checklist

### Manual Testing Scenarios

- [ ] Register with email: `Test@Example.com`
- [ ] Login with same email lowercase: `test@example.com` (should work)
- [ ] Login with same email uppercase: `TEST@EXAMPLE.COM` (should work)
- [ ] Try to register second account with: `test@example.com` (should fail - duplicate)
- [ ] Try to register username with @: `user@company` (should fail after Gap #1 fix)
- [ ] Register with email with spaces: ` user@test.com ` (should trim)
- [ ] Login with username vs email - verify routing works correctly
- [ ] Test special characters in email: `user+tag@domain.com`
- [ ] Test very long email (254+ chars) - should fail
- [ ] Test email without domain: `user@` (should fail)
- [ ] Test multiple @ symbols: `user@@domain.com` (should fail)

### Performance Testing

- [ ] Benchmark email lookup time before/after index
- [ ] Test with 1,000+ user records
- [ ] Verify no N+1 queries

### Security Testing

- [ ] Attempt to enumerate users via timing attacks
- [ ] Test case sensitivity bypass attempts
- [ ] Verify error messages don't leak user existence
- [ ] Test brute force login attempts (should be rate limited after Gap #8 fix)

---

## Conclusion

The username/email login implementation is **functionally sound** but requires **3 critical fixes** before production:

1. **Username @ symbol removal** - Prevent ambiguity
2. **Email normalization** - Fix case sensitivity
3. **Email indexing** - Ensure performance

These fixes are straightforward and low-risk. Once addressed, the implementation will be production-ready for basic username/email authentication.

**Long-term enhancements** (email verification, password reset) can be added incrementally as needed.

---

**Next Steps**: Address gaps in order of priority, starting with Phase 1 critical fixes.
