# Email Verification Implementation Plan

**Feature:** Email verification flow for user registration
**Status:** Planning
**Date:** 2025-01-25
**Estimated Effort:** 4-6 hours implementation + 2 hours testing

---

## Overview

Implement email verification for new user registrations to ensure users own the email addresses they register with. This prevents email spam/abuse, enables password reset functionality, and improves overall account security.

---

## Phase 1: Database Schema & Domain Foundation

### 1.1 Database Schema (SQLiteContext.ts)

Add email verification fields to users table:

```sql
-- Update CREATE TABLE statement
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('admin', 'user', 'viewer')),
  status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected')),
  researcherId TEXT,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  emailVerificationToken TEXT,
  emailVerificationExpiry TEXT,
  createdAt TEXT NOT NULL,
  lastActivityAt TEXT,
  FOREIGN KEY(researcherId) REFERENCES researchers(id)
);

-- Index for token lookups (O(log n) performance)
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
  ON users(emailVerificationToken);
```

**Design Decision:** Embed tokens in users table rather than separate table. Simpler architecture, sufficient performance for this use case.

**Development Note:** Delete existing database and let SQLiteContext recreate it with new schema. No migration needed for dummy development data.

### 1.2 Domain Layer - User Entity Updates

**File:** `server/src/domain/entities/User.ts`

**New Properties:**
```typescript
private _emailVerified: boolean;
private _emailVerificationToken?: string;
private _emailVerificationExpiry?: Date;
```

**New Methods:**
```typescript
generateVerificationToken(): string
  - Generate secure token using crypto.randomBytes(32)
  - Hash token before storage (bcrypt)
  - Set 48-hour expiry
  - Return unhashed token for email

verifyEmail(token: string): void
  - Validate token matches stored hash
  - Check expiry hasn't passed
  - Set emailVerified = true
  - Clear token and expiry
  - Throw EmailVerificationError if invalid/expired

isEmailVerified(): boolean
  - Query method for verification status

canResendVerification(): boolean
  - Rate limit check: max 1 email per 5 minutes
  - Returns false if too soon since last send
```

### 1.3 Domain Services - Email Service Interface

**File:** `server/src/domain/services/EmailService.ts` (NEW)

```typescript
/**
 * Email service interface (Clean Architecture)
 * Interface in domain layer, implementation in infrastructure
 */
export interface EmailService {
  /**
   * Send verification email with token link
   * @param email - User's email address
   * @param token - Verification token (unhashed)
   * @param username - User's username for personalization
   */
  sendVerificationEmail(email: string, token: string, username: string): Promise<void>;

  /**
   * Send password reset email with token link
   * @param email - User's email address
   * @param token - Reset token (unhashed)
   */
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}
```

**File:** `server/src/domain/errors/EmailVerificationError.ts` (NEW)

```typescript
export class EmailVerificationError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'EmailVerificationError';
  }
}
```

---

## Phase 2: Infrastructure Implementation

### 2.1 Email Service Implementation

**File:** `server/src/infrastructure/services/NodemailerEmailService.ts` (NEW)

```typescript
import nodemailer from 'nodemailer';
import { EmailService } from '../../domain/services/EmailService';

export class NodemailerEmailService implements EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    smtpHost: string,
    smtpPort: number,
    smtpUser: string,
    smtpPass: string,
    fromAddress: string
  ) {
    // Configure SMTP transport
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  }

  async sendVerificationEmail(email: string, token: string, username: string): Promise<void> {
    const verificationUrl = `${process.env.EMAIL_VERIFICATION_URL}?token=${token}`;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verify your Odysseus account',
      html: this.verificationEmailTemplate(username, verificationUrl),
      text: `Hi ${username}, click to verify: ${verificationUrl}`
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // TODO: Implement for Gap #9
  }

  private verificationEmailTemplate(username: string, url: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Welcome to Odysseus, ${username}!</h2>
          <p>Click the link below to verify your email address:</p>
          <a href="${url}">Verify Email</a>
          <p>This link expires in 48 hours.</p>
          <p>If you didn't create this account, you can ignore this email.</p>
        </body>
      </html>
    `;
  }
}
```

**Graceful Degradation for Development:**

```typescript
export class ConsoleEmailService implements EmailService {
  async sendVerificationEmail(email: string, token: string, username: string): Promise<void> {
    console.log('=== EMAIL VERIFICATION (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Token: ${token}`);
    console.log(`URL: ${process.env.EMAIL_VERIFICATION_URL}?token=${token}`);
    console.log('=====================================');
  }
}
```

Use ConsoleEmailService when SMTP credentials not configured (development mode).

### 2.2 Repository Updates

**File:** `server/src/infrastructure/repositories/SQLiteUserRepository.ts`

**New Methods:**
```typescript
async findByVerificationToken(token: string): Promise<User | null> {
  // Hash token before lookup (tokens stored hashed)
  const hashedToken = await bcrypt.hash(token, 10);

  const row = this.db.prepare(`
    SELECT * FROM users
    WHERE emailVerificationToken = ?
  `).get(hashedToken);

  return row ? this.mapToEntity(row) : null;
}
```

**Update `save()` method:**
- Persist `emailVerified`, `emailVerificationToken`, `emailVerificationExpiry` fields

---

## Phase 3: CQRS Application Layer

### 3.1 Command Handlers

**File:** `server/src/application/commands/EmailVerificationCommands.ts` (NEW)

#### Commands

```typescript
export interface SendVerificationEmailCommand {
  userId: string;
}

export interface VerifyEmailCommand {
  token: string;
}

export interface ResendVerificationEmailCommand {
  userId: string;
}
```

#### Command Handlers

```typescript
export class SendVerificationEmailCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private eventBus: EventBus
  ) {}

  async execute(command: SendVerificationEmailCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate verification token (domain method)
    const token = user.generateVerificationToken();
    await this.userRepository.save(user);

    // Send email
    await this.emailService.sendVerificationEmail(
      user.email!,
      token,
      user.username
    );

    // Emit event
    this.eventBus.publish(new VerificationEmailSentEvent(user.id));
  }
}

export class VerifyEmailCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    const user = await this.userRepository.findByVerificationToken(command.token);
    if (!user) {
      throw new EmailVerificationError('Invalid or expired verification token');
    }

    // Verify email (domain method validates token and expiry)
    user.verifyEmail(command.token);
    await this.userRepository.save(user);

    // Emit event
    this.eventBus.publish(new EmailVerifiedEvent(user.id));
  }
}

export class ResendVerificationEmailCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private eventBus: EventBus
  ) {}

  async execute(command: ResendVerificationEmailCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check rate limit (domain method)
    if (!user.canResendVerification()) {
      throw new EmailVerificationError('Please wait before requesting another verification email');
    }

    // Generate new token
    const token = user.generateVerificationToken();
    await this.userRepository.save(user);

    // Send email
    await this.emailService.sendVerificationEmail(
      user.email!,
      token,
      user.username
    );

    // Emit event
    this.eventBus.publish(new VerificationEmailResentEvent(user.id));
  }
}
```

### 3.2 Update Existing Handlers

**File:** `server/src/application/commands/UserCommands.ts`

**Update `CreateUserCommandHandler`:**
```typescript
async execute(command: CreateUserCommand): Promise<User> {
  // ... existing user creation logic ...

  const user = await this.userRepository.save(newUser);

  // Auto-send verification email
  await this.sendVerificationEmailHandler.execute({
    userId: user.id
  });

  return user;
}
```

**Update `LoginCommandHandler`:**
```typescript
async execute(command: LoginCommand): Promise<AuthResponse> {
  const user = await this.userRepository.findByEmail(command.email);

  // ... existing password validation ...

  // Check email verification
  if (!user.isEmailVerified()) {
    throw new PermissionError('Email not verified. Check your inbox for verification link.');
  }

  // ... rest of login logic ...
}
```

### 3.3 DTOs

**File:** `server/src/application/dto/UserDto.ts`

**Add to UserResponse:**
```typescript
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  emailVerified: boolean;  // NEW
  createdAt: string;
}

export const toResponse = (user: User): UserResponse => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role.role,
  emailVerified: user.isEmailVerified(),  // NEW
  createdAt: user.createdAt.toISOString()
});
```

**New Request DTOs:**
```typescript
export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  // Uses authenticated user ID from JWT
}
```

---

## Phase 4: Presentation Layer

### 4.1 New Controller Endpoints

**File:** `server/src/presentation/controllers/AuthController.ts`

```typescript
/**
 * Verify email with token (public endpoint)
 * POST /api/public/auth/verify-email
 */
async verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.body;

  await this.verifyEmailHandler.execute({ token });

  res.json({
    success: true,
    message: 'Email verified successfully. You can now login.'
  });
}

/**
 * Resend verification email (authenticated endpoint)
 * POST /api/auth/resend-verification
 */
async resendVerification(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  await this.resendVerificationHandler.execute({ userId });

  res.json({
    success: true,
    message: 'Verification email sent. Check your inbox.',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  });
}

/**
 * Get verification status (authenticated endpoint)
 * GET /api/auth/verification-status
 */
async getVerificationStatus(req: Request, res: Response): Promise<void> {
  const user = req.user!;

  res.json({
    emailVerified: user.isEmailVerified(),
    email: user.email
  });
}
```

### 4.2 Route Registration

**File:** `server/src/presentation/routes/AuthRouteModule.ts`

```typescript
// Public routes
router.post('/api/public/auth/verify-email', authController.verifyEmail);

// Protected routes
router.post('/api/auth/resend-verification', authMiddleware.authenticate, authController.resendVerification);
router.get('/api/auth/verification-status', authMiddleware.authenticate, authController.getVerificationStatus);
```

---

## Phase 5: Shared Schemas

### 5.1 Add to @odysseus/shared-schemas

**File:** `packages/shared-schemas/src/users/userSchemas.ts`

```typescript
import { z } from 'zod';

// Verification request schemas
export const verifyEmailRequestSchema = z.object({
  token: z.string().min(32, 'Invalid verification token')
});

export const resendVerificationRequestSchema = z.object({
  // No body - uses authenticated user
});

// Response schemas
export const verificationStatusResponseSchema = z.object({
  emailVerified: z.boolean(),
  email: z.string().email()
});

// Types
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;
export type VerificationStatusResponse = z.infer<typeof verificationStatusResponseSchema>;
```

### 5.2 Update Existing Schemas

**Update user response schema:**
```typescript
export const userResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']),
  emailVerified: z.boolean(),  // NEW
  createdAt: z.string()
});
```

---

## Phase 6: Frontend Implementation

### 6.1 Email Verification Page

**File:** `client/src/domains/authentication/ui/components/VerifyEmailPage.tsx` (NEW)

```typescript
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthService } from '../../services/AuthService';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setError('Invalid verification link');
        return;
      }

      try {
        await AuthService.verifyEmail(token);
        setStatus('success');

        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      } catch (err) {
        setStatus('error');
        setError(err.message || 'Verification failed');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  if (status === 'verifying') {
    return <div>Verifying your email...</div>;
  }

  if (status === 'success') {
    return (
      <div>
        <h2>Email Verified!</h2>
        <p>Your email has been verified. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Verification Failed</h2>
      <p>{error}</p>
      <button onClick={() => navigate('/login')}>Back to Login</button>
    </div>
  );
};
```

### 6.2 Update Login Flow

**File:** `client/src/domains/authentication/ui/components/LoginModal.tsx`

```typescript
const handleLogin = async () => {
  try {
    await AuthService.login(username, password);
  } catch (error) {
    if (error.message.includes('Email not verified')) {
      setShowVerificationAlert(true);
      return;
    }
    // ... other error handling
  }
};

// Add verification alert UI
{showVerificationAlert && (
  <div className="alert">
    <p>Please verify your email to login. Check your inbox.</p>
    <button onClick={handleResendVerification}>
      Resend Verification Email
    </button>
  </div>
)}
```

### 6.3 User Profile Component

**File:** `client/src/domains/authentication/ui/components/UserProfile.tsx`

```typescript
const { data: verificationStatus } = useQuery({
  queryKey: ['verification-status'],
  queryFn: AuthService.getVerificationStatus
});

return (
  <div>
    <p>Email: {user.email}</p>
    {!verificationStatus?.emailVerified && (
      <div className="warning">
        <span>Email not verified</span>
        <button onClick={handleResendVerification}>
          Resend Verification
        </button>
      </div>
    )}
  </div>
);
```

### 6.4 Auth Service Updates

**File:** `client/src/domains/authentication/services/AuthService.ts`

```typescript
export const AuthService = {
  // ... existing methods ...

  async verifyEmail(token: string): Promise<void> {
    const response = await httpClient.post('/api/public/auth/verify-email', { token });
    return response.data;
  },

  async resendVerificationEmail(): Promise<void> {
    const response = await httpClient.post('/api/auth/resend-verification');
    return response.data;
  },

  async getVerificationStatus(): Promise<VerificationStatusResponse> {
    const response = await httpClient.get('/api/auth/verification-status');
    return response.data;
  }
};
```

---

## Phase 7: Configuration & Security

### 7.1 Environment Variables

**File:** `.env` (development)

```env
# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Odysseus <noreply@odysseus.app>

# Email verification URL (frontend)
EMAIL_VERIFICATION_URL=http://localhost:3000/verify-email

# Production: Use secure SMTP provider (SendGrid, AWS SES, etc.)
```

**Gmail App Password Setup:**
1. Enable 2FA on Google account
2. Generate app password: https://myaccount.google.com/apppasswords
3. Use app password in SMTP_PASS

### 7.2 Token Security

**Token Generation (server/src/domain/entities/User.ts):**
```typescript
import crypto from 'crypto';
import bcrypt from 'bcrypt';

generateVerificationToken(): string {
  // Generate secure random token (64 characters)
  const token = crypto.randomBytes(32).toString('hex');

  // Hash token before storage (prevents token leakage from DB dump)
  this._emailVerificationToken = bcrypt.hashSync(token, 10);

  // Set 48-hour expiry
  this._emailVerificationExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

  // Return unhashed token for email (only time it's visible)
  return token;
}

verifyEmail(token: string): void {
  if (!this._emailVerificationToken) {
    throw new EmailVerificationError('No verification token found');
  }

  // Check expiry
  if (!this._emailVerificationExpiry || new Date() > this._emailVerificationExpiry) {
    throw new EmailVerificationError('Verification token expired');
  }

  // Validate token
  if (!bcrypt.compareSync(token, this._emailVerificationToken)) {
    throw new EmailVerificationError('Invalid verification token');
  }

  // Mark verified and clear token
  this._emailVerified = true;
  this._emailVerificationToken = undefined;
  this._emailVerificationExpiry = undefined;
}
```

### 7.3 Rate Limiting

**Implementation (server/src/domain/entities/User.ts):**
```typescript
private _lastVerificationEmailSent?: Date;

canResendVerification(): boolean {
  // Max 1 email per 5 minutes
  if (!this._lastVerificationEmailSent) return true;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this._lastVerificationEmailSent < fiveMinutesAgo;
}

generateVerificationToken(): string {
  // ... token generation ...

  this._lastVerificationEmailSent = new Date();
  return token;
}
```

**Global rate limiting also applies** (RateLimitingService):
- Max 3 verification requests per hour per IP
- Prevents email spam abuse

---

## Dependencies

### NPM Packages to Install

```bash
cd server
npm install nodemailer
npm install --save-dev @types/nodemailer
```

**package.json:**
```json
{
  "dependencies": {
    "nodemailer": "^6.9.9"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.14"
  }
}
```

---

## Testing Strategy

### Unit Tests

**File:** `server/src/domain/entities/User.test.ts`

```typescript
describe('User - Email Verification', () => {
  it('should generate verification token with 48hr expiry', () => {
    const user = User.createWithPassword('test', 'pass123', UserRole.user(), undefined, 'approved', 'test@example.com');
    const token = user.generateVerificationToken();

    expect(token).toHaveLength(64);
    expect(user.emailVerificationExpiry).toBeDefined();
  });

  it('should verify email with valid token', () => {
    const user = User.createWithPassword('test', 'pass123', UserRole.user(), undefined, 'approved', 'test@example.com');
    const token = user.generateVerificationToken();

    user.verifyEmail(token);

    expect(user.isEmailVerified()).toBe(true);
    expect(user.emailVerificationToken).toBeUndefined();
  });

  it('should reject expired token', () => {
    const user = User.createWithPassword('test', 'pass123', UserRole.user(), undefined, 'approved', 'test@example.com');
    const token = user.generateVerificationToken();

    // Manually expire token
    user.emailVerificationExpiry = new Date(Date.now() - 1000);

    expect(() => user.verifyEmail(token)).toThrow(EmailVerificationError);
  });

  it('should enforce rate limiting on resend', () => {
    const user = User.createWithPassword('test', 'pass123', UserRole.user(), undefined, 'approved', 'test@example.com');

    user.generateVerificationToken();
    expect(user.canResendVerification()).toBe(false);

    // Simulate 5 minutes passing
    user.lastVerificationEmailSent = new Date(Date.now() - 6 * 60 * 1000);
    expect(user.canResendVerification()).toBe(true);
  });
});
```

### Integration Tests

**File:** `server/src/application/commands/EmailVerificationCommands.test.ts`

```typescript
describe('VerifyEmailCommandHandler', () => {
  it('should verify email with valid token', async () => {
    const handler = new VerifyEmailCommandHandler(userRepository, eventBus);

    await handler.execute({ token: validToken });

    const user = await userRepository.findById(userId);
    expect(user.isEmailVerified()).toBe(true);
  });
});
```

### E2E Tests

**File:** `server/src/presentation/controllers/AuthController.test.ts`

```typescript
describe('POST /api/public/auth/verify-email', () => {
  it('should verify email and return success', async () => {
    const response = await request(app)
      .post('/api/public/auth/verify-email')
      .send({ token: validToken });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should return error for invalid token', async () => {
    const response = await request(app)
      .post('/api/public/auth/verify-email')
      .send({ token: 'invalid' });

    expect(response.status).toBe(400);
  });
});
```

### Manual Testing

1. **Development Mode (Console Email):**
   - Don't configure SMTP variables
   - Check console for verification URLs
   - Click URLs manually

2. **Production Mode (Real Email):**
   - Configure Gmail SMTP
   - Register new account
   - Check inbox for email
   - Click verification link
   - Confirm login works after verification

---

## Implementation Strategy

### Phase 1: Backend Implementation
1. Update database schema in SQLiteContext.ts
2. Delete existing database (`server/data/odysseus.sqlite`)
3. Domain layer (User entity updates)
4. Infrastructure (EmailService implementation)
5. Application layer (command handlers)
6. Presentation layer (controller endpoints)

### Phase 2: Frontend Implementation
7. Shared schemas
8. Auth service updates
9. Verification page component
10. Login flow updates

### Phase 3: Testing & Configuration
11. Unit tests
12. Integration tests
13. Manual testing with real email
14. Environment configuration documentation

---

## Post-MVP Enhancements

After initial implementation:

1. **Soft Enforcement:** Allow login without verification but show persistent banner
2. **Email Templates:** Professional HTML templates with branding
3. **Multiple Email Providers:** Support SendGrid, AWS SES, Mailgun
4. **Verification Status Dashboard:** Admin view of pending verifications
5. **Automatic Cleanup:** Cron job to delete unverified accounts after 30 days
6. **Email Change Flow:** Require verification when user updates email

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Email delivery failures | Medium | High | Implement retry logic, use reliable SMTP provider |
| Token expiry UX friction | Low | Medium | Clear error messages, easy resend flow |
| Rate limit too restrictive | Low | Low | Make configurable, monitor complaints |
| SMTP credentials exposed | Low | High | Use environment variables, never commit to Git |

---

## Success Metrics

After implementation, measure:

1. **Verification Rate:** % of users who verify within 48 hours
2. **Resend Rate:** % of users who need to resend verification
3. **Email Delivery Rate:** % of emails successfully delivered
4. **Time to Verification:** Average time from registration to verification
5. **Support Tickets:** Reduction in "forgot password" tickets (requires verified email)

---

## Related Features

This implementation enables:

- **Gap #9: Password Reset Flow** (uses same email infrastructure)
- **Gap #10: Email Change Functionality** (re-verification required)
- Email notifications for security events
- Multi-factor authentication (future)

---

## References

- **OWASP Email Verification Best Practices:** https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- **Nodemailer Documentation:** https://nodemailer.com/about/
- **JWT + Email Verification Pattern:** Industry standard (GitHub, GitLab, Google)
- **Token Expiry Standards:** 24-48 hours (GitHub uses 24h, Google uses 48h)
