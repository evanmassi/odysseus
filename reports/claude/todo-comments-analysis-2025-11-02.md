# TODO Comments Analysis & Action Plan
**Date**: November 2, 2025
**Scope**: All TODO/FIXME/HACK comments in client and server source code
**Total Found**: 22 TODO comments
**Standards Reference**: AGENTS.md (Section 6: TODO/FIXME with Context and Dates)

---

## Executive Summary

Found **22 TODO comments** across the codebase. All comments need to be updated to follow AGENTS.md standards by adding:
1. **Date** when the TODO was created
2. **Context** explaining why it's deferred
3. **GitHub Issue** reference (where applicable)

**Current Compliance**: 0% (0/22 properly documented)
**Target Compliance**: 100% with dates, context, and issue tracking

---

## Client TODOs (7 items)

### 1. App Bootstrap - Refactor to Domain Services ⚠️ MEDIUM
**File**: `client/src/app/bootstrap/AppBootstrapService.ts:118`
**Current**:
```typescript
// TODO: Refactor to use domain services instead of raw fetch()
```

**Recommended**:
```typescript
// TODO(2025-11-02): Refactor to use domain services instead of raw fetch()
// Context: Currently using raw fetch for health checks during bootstrap.
// Should use proper domain service pattern for consistency.
// Issue: #[TBD] - Bootstrap Architecture Refactor
```

**Priority**: Medium
**Effort**: 2-3 hours
**Category**: Architecture Improvement

---

### 2. Error Reporting Integration 🔴 HIGH
**File**: `client/src/app/components/boundaries/AppErrorBoundary.tsx:78`
**Current**:
```typescript
// TODO: Send to error reporting service (Sentry, LogRocket, etc.)
```

**Recommended**:
```typescript
// TODO(2025-11-02): Integrate error reporting service (Sentry, LogRocket, etc.)
// Context: Currently only logging to console. Need production error monitoring.
// Issue: #[TBD] - Add Production Error Monitoring
// Suggested: Start with Sentry free tier
```

**Priority**: High (Production requirement)
**Effort**: 4-6 hours (including setup)
**Category**: Production Readiness

---

### 3. Batch Tube Editor - Type Alignment (2 instances) ⚠️ MEDIUM
**File**: `client/src/domains/tubes/ui/components/modals/BatchTubeEditorModal.tsx:223`
**File**: `client/src/domains/tubes/ui/components/modals/BatchTubeEditorModal.tsx:282`
**Current**:
```typescript
// TODO: Align mutation types with CreateTubeFormInput to remove type assertion
```

**Recommended**:
```typescript
// TODO(2025-11-02): Align mutation types with CreateTubeFormInput to remove type assertion
// Context: Type mismatch between form input and mutation requires casting.
// Root cause: CreateTubeFormInput expects different structure than mutation.
// Issue: #[TBD] - Type Safety Improvement - Tube Forms
```

**Priority**: Medium
**Effort**: 1-2 hours
**Category**: Type Safety

---

### 4. Performance Hooks - Syntax Fix ✅ LOW
**File**: `client/src/shared/hooks/performance/index.ts:8`
**Current**:
```typescript
// TODO: Fix performance hooks syntax issues and re-enable
```

**Recommended**:
```typescript
// TODO(2025-11-02): Fix performance hooks syntax issues and re-enable
// Context: Performance monitoring hooks commented out due to syntax errors.
// Not critical for MVP but needed for production performance monitoring.
// Issue: #[TBD] - Re-enable Performance Monitoring Hooks
```

**Priority**: Low (Nice to have)
**Effort**: 1 hour
**Category**: Performance Monitoring

---

### 5. Focus Trap - Skip Links ♿ MEDIUM
**File**: `client/src/shared/hooks/keyboard/useFocusTrap.ts:180`
**Current**:
```typescript
// TODO: Implement skip links for accessibility
```

**Recommended**:
```typescript
// TODO(2025-11-02): Implement skip links for accessibility (WCAG 2.4.1)
// Context: Skip links allow keyboard users to bypass repetitive content.
// Required for WCAG 2.1 Level A compliance.
// Issue: #[TBD] - Accessibility - Skip Links Implementation
// Reference: https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html
```

**Priority**: Medium (Accessibility requirement)
**Effort**: 2-3 hours
**Category**: Accessibility (A11y)

---

### 6. Validation Utils - Path Alias Fix ✅ LOW
**File**: `client/src/shared/utils/validation.ts:10`
**Current**:
```typescript
// TODO: Re-enable once @domains path alias is fixed
```

**Recommended**:
```typescript
// TODO(2025-11-02): Re-enable validation utilities once @domains path alias is fixed
// Context: Commented out due to path alias resolution issues during migration.
// Path aliases are now working - this can be re-enabled and tested.
// Issue: #[TBD] - Re-enable Validation Utilities
```

**Priority**: Low (Path aliases now working - can be re-enabled)
**Effort**: 15 minutes
**Category**: Code Cleanup

---

## Server TODOs (15 items)

### 7. Password Reset - Session Invalidation 🔴 HIGH (Security)
**File**: `server/src/application/commands/PasswordResetCommands.ts:162`
**Current**:
```typescript
// TODO: Invalidate all user sessions after password reset for security
```

**Recommended**:
```typescript
// TODO(2025-11-02): Invalidate all user sessions after password reset for security
// Context: Security best practice - force re-login after password change.
// Currently sessions remain valid after password reset (security gap).
// Issue: #[TBD] - Security Enhancement - Session Invalidation
// Priority: HIGH - Security requirement
```

**Priority**: **HIGH (Security Issue)**
**Effort**: 2-3 hours
**Category**: Security

---

### 8. Index.ts - Repository Implementation TODOs (5 instances) ⚠️ MEDIUM
**Files**:
- `server/src/index.ts:163` - Metrics gathering
- `server/src/index.ts:195` - Audit trail
- `server/src/index.ts:214` - Advanced search
- `server/src/index.ts:485` - Backup functionality
- `server/src/index.ts:489` - Backup verification

**Current Pattern**:
```typescript
// TODO: Implement [feature] with repositories
```

**Recommended Pattern**:
```typescript
// TODO(2025-11-02): Implement [feature] using repository pattern
// Context: Placeholder endpoint - requires domain service and repository implementation.
// Part of future feature roadmap, not MVP requirement.
// Issue: #[TBD] - Feature Implementation - [Feature Name]
```

**Priority**: Medium (Future features)
**Effort**: Varies (4-8 hours each)
**Category**: Feature Development

**Individual Breakdown**:

#### 8a. Metrics Gathering
```typescript
// TODO(2025-11-02): Implement metrics gathering with repositories
// Context: Dashboard metrics endpoint - needs TubeRepository statistics methods.
// Issue: #[TBD] - Feature - Admin Dashboard Metrics
// Dependencies: Needs repository aggregate methods
```

#### 8b. Audit Trail
```typescript
// TODO(2025-11-02): Implement audit trail with repositories
// Context: Full audit log for compliance and security tracking.
// Issue: #[TBD] - Feature - Audit Trail System
// Dependencies: Needs AuditLogRepository and domain events integration
```

#### 8c. Advanced Search
```typescript
// TODO(2025-11-02): Implement advanced search with repositories
// Context: Advanced tube search with complex filters and sorting.
// Issue: #[TBD] - Feature - Advanced Search Filters
// Dependencies: Extend TubeRepository search capabilities
```

#### 8d. Backup Functionality
```typescript
// TODO(2025-11-02): Implement backup functionality with repositories
// Context: Database backup and export feature for data safety.
// Issue: #[TBD] - Feature - Database Backup System
// Dependencies: SQLite backup utilities, file storage
```

#### 8e. Backup Verification
```typescript
// TODO(2025-11-02): Implement backup verification
// Context: Verify backup integrity after creation (checksum, restore test).
// Issue: #[TBD] - Feature - Backup Verification
// Dependencies: Backup functionality (TODO #8d)
```

---

### 9. Email Services - Password Reset Flow (2 instances) ⚠️ MEDIUM
**Files**:
- `server/src/infrastructure/services/ConsoleEmailService.ts:31`
- `server/src/infrastructure/services/NodemailerEmailService.ts:50`

**Current**:
```typescript
// TODO: Implement for Gap #9 - Password Reset Flow
```

**Recommended**:
```typescript
// TODO(2025-11-02): Implement password reset email for Gap #9 - Password Reset Flow
// Context: Email sending logic needed for password reset feature.
// Template and content TBD with product team.
// Issue: #[TBD] - Feature - Password Reset Email Templates
// Dependencies: Email template design, copy approval
```

**Priority**: Medium (Feature gap)
**Effort**: 2-3 hours
**Category**: Feature Development

---

### 10. Firebase Sync - Connection Implementation (2 instances) ⚠️ MEDIUM
**Files**:
- `server/src/infrastructure/services/FirebaseSyncService.ts:106`
- `server/src/infrastructure/services/FirebaseSyncService.ts:235`

**Current**:
```typescript
// TODO: Implement proper Firebase connection
// TODO: Implement proper shutdown when Firebase is connected
```

**Recommended**:
```typescript
// TODO(2025-11-02): Implement proper Firebase connection lifecycle
// Context: Firebase sync is stubbed for future real-time sync feature.
// Not MVP requirement - deferred until multi-user sync is prioritized.
// Issue: #[TBD] - Feature - Firebase Real-time Sync
// Decision: DEFERRED - Using local SQLite for now
```

**Priority**: Low (Deferred feature)
**Effort**: 8-16 hours (full implementation)
**Category**: Future Enhancement

---

### 11. User Application Service - Domain Method ⚠️ MEDIUM
**File**: `server/src/application/services/UserApplicationService.ts:259`
**Current**:
```typescript
// TODO: Add proper domain method for role changes
```

**Recommended**:
```typescript
// TODO(2025-11-02): Add proper domain method for role changes in User entity
// Context: Currently using direct property access instead of domain method.
// Should be user.changeRole(newRole) with domain events.
// Issue: #[TBD] - Domain Model - User Role Change Method
// Pattern: Follow UserSession.recordUsage() pattern
```

**Priority**: Medium
**Effort**: 1-2 hours
**Category**: Domain Model Refinement

---

### 12. JWT Session Service - Token Revocation Store ⚠️ MEDIUM
**File**: `server/src/infrastructure/services/JwtSessionService.ts:188`
**Current**:
```typescript
// TODO: Add token/session to revocation store
```

**Recommended**:
```typescript
// TODO(2025-11-02): Implement token blacklist/revocation store
// Context: JWT revocation requires storing invalidated tokens (Redis recommended).
// Current: No way to revoke JWTs before natural expiration.
// Issue: #[TBD] - Security - JWT Revocation Mechanism
// Options: Redis blacklist, DB table with TTL, or short JWT expiry + refresh tokens
```

**Priority**: Medium (Security enhancement)
**Effort**: 4-6 hours
**Category**: Security

---

### 13. Refresh Token Repository - Transaction Support ✅ LOW
**File**: `server/src/infrastructure/repositories/SQLiteRefreshTokenRepository.ts:261`
**Current**:
```typescript
// TODO: Implement transaction support in future enhancement
```

**Recommended**:
```typescript
// TODO(2025-11-02): Implement transaction support for batch operations
// Context: batchRevoke() uses individual queries instead of transaction.
// Not critical - current implementation is safe but less efficient.
// Issue: #[TBD] - Performance - Repository Transaction Support
// Effort: Low complexity, clear implementation path
```

**Priority**: Low (Performance optimization)
**Effort**: 1-2 hours
**Category**: Performance

---

### 14. Auth Controller - Session Revocation ⚠️ MEDIUM
**File**: `server/src/presentation/controllers/AuthController.ts:335`
**Current**:
```typescript
// TODO: Implement session revocation when we have session management
```

**Recommended**:
```typescript
// TODO(2025-11-02): Implement session revocation endpoint
// Context: Logout should revoke refresh tokens and invalidate sessions.
// Related to: JWT revocation store (TODO #12)
// Issue: #[TBD] - Feature - Logout/Session Revocation
// Current: Logout is client-side only (not secure)
```

**Priority**: Medium (Security gap)
**Effort**: 2-3 hours
**Category**: Security

---

### 15. Workspace Service - User Data Join ✅ LOW
**File**: `server/src/infrastructure/services/WorkspaceService.ts:258`
**Current**:
```typescript
// TODO: In a real implementation, you'd join with user data
```

**Recommended**:
```typescript
// TODO(2025-11-02): Join workspace members with user data for full details
// Context: Currently returning IDs only. Need names/emails for UI display.
// Not critical - workspace feature is experimental/future.
// Issue: #[TBD] - Feature - Workspace Member Details
// Decision: DEFERRED - Workspace feature not in MVP scope
```

**Priority**: Low (Deferred feature)
**Effort**: 1-2 hours
**Category**: Future Enhancement

---

## Priority Summary

### 🔴 CRITICAL (Fix Immediately)
1. **Session Invalidation After Password Reset** (#7) - Security issue
2. **Error Reporting Integration** (#2) - Production requirement

### ⚠️ HIGH (Next Sprint)
3. **JWT Token Revocation** (#12) - Security enhancement
4. **Session Revocation Endpoint** (#14) - Security gap

### ⚠️ MEDIUM (Backlog)
5. **Domain Method for Role Changes** (#11) - Architecture
6. **Email Template Implementation** (#9) - Feature gap
7. **Type Alignment in Batch Editor** (#3) - Type safety
8. **Bootstrap Service Refactor** (#1) - Architecture
9. **Skip Links for Accessibility** (#5) - A11y
10. **Repository Features** (#8a-e) - Future features

### ✅ LOW (Nice to Have)
11. **Transaction Support** (#13) - Performance
12. **Re-enable Validation Utils** (#6) - Code cleanup
13. **Fix Performance Hooks** (#4) - Monitoring
14. **Firebase Sync** (#10) - Deferred
15. **Workspace Member Details** (#15) - Deferred

---

## Recommended Actions

### Phase 1: Update All TODO Comments (1-2 hours)
Update all 22 TODO comments to include:
- Date: `TODO(2025-11-02):`
- Context: Why deferred
- Issue reference: `Issue: #[TBD]`

### Phase 2: Create GitHub Issues (2-3 hours)
1. Create issues for all HIGH and CRITICAL TODOs
2. Create issues for MEDIUM TODOs (can be batched)
3. Tag with labels: `technical-debt`, `security`, `feature`, `accessibility`

### Phase 3: Update Comments with Issue Numbers (30 minutes)
Replace `#[TBD]` with actual GitHub issue numbers

### Phase 4: Address Critical Items (This Sprint)
- Security: Session invalidation (#7)
- Production: Error reporting (#2)

---

## AGENTS.md Compliance Template

**Current Format** (Non-compliant):
```typescript
// TODO: Do something
```

**AGENTS.md Compliant Format**:
```typescript
// TODO(YYYY-MM-DD): Do something with clear context
// Context: Explain why this is deferred and what needs to be done
// Issue: #123 - GitHub issue tracking this work
// Dependencies: List any blockers or prerequisites
```

**Example**:
```typescript
// TODO(2025-01-15): Migrate to domain events for cross-aggregate consistency
// Context: Current implementation uses direct repository calls which bypasses
// domain events. Should emit UserCreated event and have handlers update
// related aggregates.
// Issue: #245 - Domain Events Refactor
// Dependencies: EventBus implementation (PR #244)
```

---

## Statistics

| Category | Count | Percentage |
|----------|-------|------------|
| Security | 4 | 18% |
| Feature Development | 8 | 36% |
| Architecture | 3 | 14% |
| Type Safety | 2 | 9% |
| Accessibility | 1 | 5% |
| Performance | 2 | 9% |
| Code Cleanup | 2 | 9% |

| Priority | Count |
|----------|-------|
| Critical | 2 |
| High | 2 |
| Medium | 10 |
| Low | 8 |

---

## Conclusion

All 22 TODO comments require updating to meet AGENTS.md standards. The most critical items are security-related (session invalidation, token revocation) and production readiness (error reporting).

**Immediate Next Steps**:
1. Update all TODO comments with dates and context (1-2 hours)
2. Create GitHub issues for tracking (2-3 hours)
3. Address critical security TODOs (#7, #12, #14) in current sprint
4. Schedule medium-priority items for upcoming sprints

**After Completion**:
- TODO documentation compliance: 100%
- Clear tracking and prioritization
- No orphaned or forgotten TODOs

---

**End of Report**

*Generated by Claude Code on 2025-11-02*
