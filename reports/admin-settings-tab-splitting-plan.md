# AdminSettingsModal Tab Splitting Plan

**Date:** 2025-10-20
**Project:** Odysseus Application
**Objective:** Split AdminSettingsModal into separate tab component files for improved maintainability and code organization
**Status:** Planning Phase

---

## Executive Summary

This plan outlines the refactoring of `AdminSettingsModal.tsx` (825 lines) into a modular architecture with separate tab components. The goal is to improve code maintainability, enable clearer git history, and establish a clean separation of concerns while maintaining 100% functional parity.

**Key Metrics:**
- Current file size: 825 lines
- Tab components: 4 (Security: 123 lines, Users: 179 lines, System: 153 lines, Monitoring: 33 lines)
- Total tab code: 488 lines (59% of file)
- Shared code: 337 lines (41% of file)

---

## 1. Current State Analysis

### File Structure (AdminSettingsModal.tsx)

```
Lines 1-50:    Imports, interfaces, constants
Lines 51-326:  Main AdminSettingsModal component
Lines 328-451: SecurityPoliciesTab component (123 lines)
Lines 454-632: UserManagementTab component (179 lines)
Lines 635-787: SystemConfigTab component (153 lines)
Lines 790-822: MonitoringTab component (33 lines)
Lines 825:     Default export
```

### Dependencies Analysis

**Imports:**
```typescript
- React: { useState, useEffect }
- lucide-react: { X, Shield, Users, Settings, Activity, AlertTriangle, Save, RefreshCw, User }
- @domains/authentication: { useAuthStore, adminService }
- @shared/utils: { notifications }
```

**Shared Types:**
```typescript
- SecurityConfig (lines 7-29)
- AdminSettingsModalProps (lines 31-34)
- DEFAULT_CONFIG (lines 36-49)
```

**Tab Dependencies:**
- SecurityPoliciesTab: SecurityConfig, onChange callback
- UserManagementTab: users array, adminService, notifications
- SystemConfigTab: SecurityConfig, stats, syncStatus, inviteCode, callbacks
- MonitoringTab: stats, onRefresh callback
```

### Current Usage

**Parent Component:** `AppHeader.tsx`
```typescript
import { LazyAdminSettingsModal as AdminSettingsModal } from './LazyAdminSettingsModal';

{showAdminPanel && (
  <AdminSettingsModal
    isOpen={showAdminPanel}
    onClose={() => setShowAdminPanel(false)}
  />
)}
```

**Lazy Wrapper:** `LazyAdminSettingsModal.tsx` (already implemented)

---

## 2. Target Architecture

### Proposed File Structure

```
modals/
├── AdminSettingsModal.tsx                    (NEW - orchestrator only, ~340 lines)
├── LazyAdminSettingsModal.tsx                (EXISTING - no changes)
├── admin-settings/
│   ├── types/
│   │   └── SecurityConfig.ts                 (NEW - shared types)
│   ├── components/
│   │   ├── TabSkeleton.tsx                   (NEW - loading UI)
│   │   └── InviteCodeSection.tsx             (NEW - extracted duplicate)
│   └── tabs/
│       ├── SecurityPoliciesTab.tsx           (NEW - 123 lines)
│       ├── UserManagementTab.tsx             (NEW - 179 lines)
│       ├── SystemConfigTab.tsx               (NEW - 153 lines)
│       └── MonitoringTab.tsx                 (NEW - 33 lines)
```

### Naming Conventions

**Directory Structure:**
- `admin-settings/` - Feature-specific subdirectory (kebab-case)
- `tabs/` - Tab components directory
- `types/` - Shared TypeScript interfaces
- `components/` - Shared UI components

**File Names:**
- Tab files: PascalCase with `Tab` suffix (e.g., `SecurityPoliciesTab.tsx`)
- Type files: PascalCase matching interface name (e.g., `SecurityConfig.ts`)
- Component files: PascalCase (e.g., `TabSkeleton.tsx`, `InviteCodeSection.tsx`)

**Export Strategy:**
- Named exports for all tabs (not default)
- Consistent with existing codebase patterns
- Enables tree-shaking

---

## 3. Implementation Plan

### Phase 1: Preparation (No Breaking Changes)

**Step 1.1: Create Directory Structure**
```bash
mkdir -p client/src/domains/tubes/ui/components/modals/admin-settings/tabs
mkdir -p client/src/domains/tubes/ui/components/modals/admin-settings/types
mkdir -p client/src/domains/tubes/ui/components/modals/admin-settings/components
```

**Step 1.2: Extract Shared Types**

Create `admin-settings/types/SecurityConfig.ts`:
```typescript
/**
 * Security Configuration Interface
 *
 * Defines the structure for admin security settings including authentication,
 * session management, rate limiting, and audit controls.
 */
export interface SecurityConfig {
  // Authentication
  useEnhancedAuth: boolean;
  requireStrongPasswords: boolean;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;

  // Session Management
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;

  // Rate Limiting
  enableRateLimiting: boolean;
  loginAttemptsPerMinute: number;
  lockoutDurationMinutes: number;

  // Admin Features
  enableAdminControls: boolean;

  // Audit & Monitoring
  enableDetailedLogging: boolean;
  logFailedAttempts: boolean;
}

/**
 * Default security configuration
 *
 * Conservative defaults prioritizing usability over strict security.
 * Production deployments should review and adjust based on requirements.
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  useEnhancedAuth: false,
  requireStrongPasswords: false,
  passwordMinLength: 8,
  passwordRequireSpecialChars: false,
  sessionTimeoutMinutes: 480,
  maxConcurrentSessions: 3,
  enableRateLimiting: false,
  loginAttemptsPerMinute: 10,
  lockoutDurationMinutes: 15,
  enableAdminControls: true,
  enableDetailedLogging: true,
  logFailedAttempts: true,
};
```

**Rationale:**
- Centralizes type definitions
- Enables reuse across tabs
- Single source of truth for config structure
- Professional documentation standards

---

### Phase 2: Extract Tab Components

**Step 2.1: Create TabSkeleton Component**

Create `admin-settings/components/TabSkeleton.tsx`:
```typescript
/**
 * Admin Settings Tab Loading Skeleton
 *
 * Displayed during lazy loading of admin tab components.
 * Provides visual feedback and reduces perceived latency.
 */
export function TabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading settings...">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>

      {/* Content skeletons */}
      <div className="space-y-4">
        <div className="h-16 bg-gray-100 rounded"></div>
        <div className="h-16 bg-gray-100 rounded"></div>
        <div className="h-16 bg-gray-100 rounded"></div>
      </div>
    </div>
  );
}
```

**Step 2.2: Extract SecurityPoliciesTab**

Create `admin-settings/tabs/SecurityPoliciesTab.tsx`:

**Dependencies:**
```typescript
import type { SecurityConfig } from '../types/SecurityConfig';
```

**Props Interface:**
```typescript
export interface SecurityPoliciesTabProps {
  config: SecurityConfig;
  onChange: (field: keyof SecurityConfig, value: any) => void;
}
```

**Component:** Copy lines 329-451 from AdminSettingsModal.tsx

**Export:**
```typescript
export function SecurityPoliciesTab({ config, onChange }: SecurityPoliciesTabProps) {
  // ... existing implementation
}
```

**Step 2.3: Extract UserManagementTab**

Create `admin-settings/tabs/UserManagementTab.tsx`:

**Dependencies:**
```typescript
import { useState } from 'react';
import { RefreshCw, User } from 'lucide-react';
import { adminService } from '@domains/authentication/application/AdminService';
import { notifications } from '@shared/utils';
```

**Props Interface:**
```typescript
export interface UserManagementTabProps {
  users: any[]; // TODO: Replace with proper User type
  onUserUpdate: () => void;
  inviteCode: string;
  onCreateInvite: (role: 'admin' | 'user') => void;
}
```

**Component:** Copy lines 454-632 from AdminSettingsModal.tsx

**Note:** Contains 69 lines of duplicate "Invite Code" UI (lines 591-629) that also appears in SystemConfigTab

**Step 2.4: Extract SystemConfigTab**

Create `admin-settings/tabs/SystemConfigTab.tsx`:

**Dependencies:**
```typescript
import { RefreshCw } from 'lucide-react';
import type { SecurityConfig } from '../types/SecurityConfig';
```

**Props Interface:**
```typescript
export interface SystemConfigTabProps {
  config: SecurityConfig;
  stats: any; // TODO: Replace with proper SystemStats type
  syncStatus: any; // TODO: Replace with proper SyncStatus type
  inviteCode: string;
  onChange: (field: keyof SecurityConfig, value: any) => void;
  onCreateInvite: (role: 'admin' | 'user') => void;
  onRefreshSync: () => void;
}
```

**Component:** Copy lines 635-787 from AdminSettingsModal.tsx

**Note:** Contains duplicate "Invite Code" UI (lines 715-761) - same as UserManagementTab

**Step 2.5: Extract MonitoringTab**

Create `admin-settings/tabs/MonitoringTab.tsx`:

**Dependencies:**
```typescript
import { RefreshCw, Activity } from 'lucide-react';
```

**Props Interface:**
```typescript
export interface MonitoringTabProps {
  stats: any; // TODO: Replace with proper SystemStats type
  onRefresh: () => void;
}
```

**Component:** Copy lines 790-822 from AdminSettingsModal.tsx

**Note:** Currently a placeholder ("Coming Soon")

---

### Phase 3: Refactor Main Modal Component

**Step 3.1: Update AdminSettingsModal.tsx**

**New Structure:**
```typescript
import { useState, useEffect, lazy, Suspense } from 'react';
import { X, Shield, Users, Settings, Activity, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@domains/authentication';
import { notifications } from '@shared/utils';
import { adminService } from '@domains/authentication/application/AdminService';
import type { SecurityConfig } from './admin-settings/types/SecurityConfig';
import { DEFAULT_SECURITY_CONFIG } from './admin-settings/types/SecurityConfig';
import { TabSkeleton } from './admin-settings/components/TabSkeleton';

// Lazy-load tab components
const SecurityPoliciesTab = lazy(() =>
  import('./admin-settings/tabs/SecurityPoliciesTab').then(m => ({ default: m.SecurityPoliciesTab }))
);
const UserManagementTab = lazy(() =>
  import('./admin-settings/tabs/UserManagementTab').then(m => ({ default: m.UserManagementTab }))
);
const SystemConfigTab = lazy(() =>
  import('./admin-settings/tabs/SystemConfigTab').then(m => ({ default: m.SystemConfigTab }))
);
const MonitoringTab = lazy(() =>
  import('./admin-settings/tabs/MonitoringTab').then(m => ({ default: m.MonitoringTab }))
);

// Props interface (unchanged)
interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Main component with lazy-loaded tabs
export function AdminSettingsModal({ isOpen, onClose }: AdminSettingsModalProps) {
  // ... existing state management (lines 52-71)

  // ... existing handlers (lines 73-200)

  return (
    <div className="fixed inset-0 ...">
      {/* Modal shell */}

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {activeTab === 'security' && (
            <Suspense fallback={<TabSkeleton />}>
              <SecurityPoliciesTab config={config} onChange={handleConfigChange} />
            </Suspense>
          )}

          {activeTab === 'users' && (
            <Suspense fallback={<TabSkeleton />}>
              <UserManagementTab
                users={users}
                onUserUpdate={loadUsers}
                inviteCode={inviteCode}
                onCreateInvite={createInviteCode}
              />
            </Suspense>
          )}

          {activeTab === 'system' && (
            <Suspense fallback={<TabSkeleton />}>
              <SystemConfigTab
                config={config}
                stats={systemStats}
                syncStatus={syncStatus}
                inviteCode={inviteCode}
                onChange={handleConfigChange}
                onCreateInvite={createInviteCode}
                onRefreshSync={loadSyncStatus}
              />
            </Suspense>
          )}

          {activeTab === 'monitoring' && (
            <Suspense fallback={<TabSkeleton />}>
              <MonitoringTab stats={systemStats} onRefresh={loadSystemStats} />
            </Suspense>
          )}
        </div>
      </div>

      {/* Footer */}
    </div>
  );
}

export default AdminSettingsModal;
```

**Changes:**
- ✅ Import tab components as lazy
- ✅ Wrap each tab in Suspense with TabSkeleton
- ✅ Import SecurityConfig type from new location
- ✅ Remove inline tab component definitions (lines 328-822)
- ✅ Maintain all existing functionality
- ✅ No changes to props or public API

---

### Phase 4: Address Code Duplication

**Issue:** Invite Code UI appears in both UserManagementTab and SystemConfigTab (69 duplicate lines)

**Step 4.1: Extract InviteCodeSection**

Create `admin-settings/components/InviteCodeSection.tsx`:

```typescript
/**
 * Invite Code Section Component
 *
 * Reusable UI for creating and displaying team invitation codes.
 * Used in both User Management and System Configuration tabs.
 */
export interface InviteCodeSectionProps {
  inviteCode: string;
  onCreateInvite: (role: 'admin' | 'user') => void;
}

export function InviteCodeSection({ inviteCode, onCreateInvite }: InviteCodeSectionProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-3">Team Invitations</h4>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => onCreateInvite('user')}
          className="btn btn-secondary text-sm"
        >
          Create User Invite
        </button>
        <button
          onClick={() => onCreateInvite('admin')}
          className="btn btn-secondary text-sm"
        >
          Create Admin Invite
        </button>
      </div>

      {inviteCode && (
        <div className="bg-white border border-gray-200 rounded p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Latest Invite Code:</div>
              <div className="text-lg font-mono text-blue-600">{inviteCode}</div>
              <div className="text-xs text-gray-600 mt-1">
                Share this code with colleagues to invite them to your workspace
              </div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(inviteCode)}
              className="btn btn-secondary text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 4.2: Update Tabs to Use InviteCodeSection**

Update `UserManagementTab.tsx`:
```typescript
import { InviteCodeSection } from '../components/InviteCodeSection';

// Replace lines 591-629 with:
<InviteCodeSection inviteCode={inviteCode} onCreateInvite={onCreateInvite} />
```

Update `SystemConfigTab.tsx`:
```typescript
import { InviteCodeSection } from '../components/InviteCodeSection';

// Replace lines 715-761 with:
<InviteCodeSection inviteCode={inviteCode} onCreateInvite={onCreateInvite} />
```

**Result:** Removes 69 duplicate lines, DRY principle applied

---

## 4. Testing Strategy

### Pre-Implementation Checklist

- [x] Document current file structure
- [x] Identify all dependencies and imports
- [x] Map prop interfaces for each tab
- [x] Identify code duplication
- [x] Plan extraction strategy
- [ ] Create backup of AdminSettingsModal.tsx

### Implementation Testing

**Step-by-Step Verification:**

1. **After creating type files:**
   ```bash
   npx tsc --noEmit
   # Verify: 0 errors
   ```

2. **After extracting each tab:**
   ```bash
   npx tsc --noEmit
   # Verify: 0 errors
   # Verify: Tab exports correctly from new file
   ```

3. **After updating main modal:**
   ```bash
   npx tsc --noEmit
   # Verify: 0 errors

   npm run build
   # Verify: Build succeeds
   # Verify: New chunks created for each tab
   ```

4. **Runtime Testing:**
   - Open admin settings modal
   - Switch to Security tab → Verify loads and functions
   - Switch to Users tab → Verify loads and functions
   - Switch to System tab → Verify loads and functions
   - Switch to Monitoring tab → Verify loads and functions
   - Test all form inputs and buttons
   - Verify save functionality
   - Verify API calls still work
   - Check browser DevTools Network tab for lazy-loaded chunks

### Rollback Strategy

**If issues arise:**

1. **Immediate rollback:**
   ```bash
   git checkout -- client/src/domains/tubes/ui/components/modals/AdminSettingsModal.tsx
   ```

2. **Partial rollback:**
   - Keep type extraction
   - Revert only tab splitting
   - Investigate and fix issues
   - Re-attempt splitting

---

## 5. Expected Outcomes

### Bundle Analysis

**Before Tab Splitting:**
```
AdminSettingsModal.tsx: 22.32 KB (single chunk, lazy-loaded)
```

**After Tab Splitting (estimated):**
```
AdminSettingsModal.tsx:       8 KB  (orchestrator + shared logic)
SecurityPoliciesTab.tsx:      4 KB  (lazy-loaded on tab switch)
UserManagementTab.tsx:        6 KB  (lazy-loaded on tab switch)
SystemConfigTab.tsx:          5 KB  (lazy-loaded on tab switch)
MonitoringTab.tsx:            1 KB  (lazy-loaded on tab switch)
Shared components:            2 KB  (InviteCodeSection, TabSkeleton)

Total if all tabs opened: ~26 KB (slight increase due to module overhead)
```

**User Experience:**
- Admin opens modal → Loads 8 KB orchestrator + 4 KB Security tab = 12 KB
- Switches to Users → Loads 6 KB (saves 10 KB if they don't switch)
- Average admin session: 14-16 KB (vs 22 KB currently)
- **Savings: 6-8 KB (27-36%) for typical usage**

### Code Quality Improvements

**Maintainability:**
- ✅ Each tab is self-contained file
- ✅ Clear separation of concerns
- ✅ Easier to test individual tabs
- ✅ Clearer git history (changes to Users tab don't touch Security tab)
- ✅ Easier onboarding (developers can find specific functionality)

**Type Safety:**
- ✅ Centralized SecurityConfig type
- ✅ Explicit prop interfaces for each tab
- ✅ No `any` types in new code
- ✅ Compiler-enforced contracts

**Code Reuse:**
- ✅ InviteCodeSection eliminates 69 duplicate lines
- ✅ TabSkeleton reusable across all tabs
- ✅ Types reusable across tabs

---

## 6. Risk Assessment

### Low Risk Items ✅

1. **Type Extraction**
   - Risk: Minimal (simple interface move)
   - Impact: None if done correctly
   - Mitigation: TypeScript compiler catches issues immediately

2. **TabSkeleton Creation**
   - Risk: Minimal (new component, doesn't affect existing)
   - Impact: None
   - Mitigation: Visual testing

3. **MonitoringTab Extraction**
   - Risk: Minimal (33 lines, placeholder only)
   - Impact: None
   - Mitigation: Simple verification

### Medium Risk Items ⚠️

4. **SecurityPoliciesTab Extraction**
   - Risk: Medium (123 lines, form inputs)
   - Impact: Broken security settings if onChange callback fails
   - Mitigation: Thorough testing of all inputs
   - Test: Toggle all checkboxes, change all numbers

5. **UserManagementTab Extraction**
   - Risk: Medium (179 lines, API calls to adminService)
   - Impact: Broken user management
   - Mitigation: Test user role changes, deletion, invites
   - Test: Change role, delete user, create invite

6. **SystemConfigTab Extraction**
   - Risk: Medium (153 lines, multiple state dependencies)
   - Impact: Broken system stats, sync status
   - Mitigation: Test all data loading, invite creation
   - Test: Refresh stats, refresh sync, create invite

### Critical Path Items 🚨

7. **Main Modal Lazy Loading Integration**
   - Risk: High (affects all tabs, Suspense boundary)
   - Impact: Modal won't render if Suspense fails
   - Mitigation: Test each tab switch thoroughly
   - Fallback: TabSkeleton ensures graceful degradation
   - Test: Switch between all tabs multiple times

8. **Props Passing**
   - Risk: High (wrong props = runtime errors)
   - Impact: Tab won't function
   - Mitigation: TypeScript prop interfaces, compiler checks
   - Test: Verify all props match at compile time

### Zero-Risk Verification ✅

**Pre-flight checks before going live:**
- [ ] All TypeScript errors: 0
- [ ] Build succeeds
- [ ] All tabs load without errors
- [ ] All inputs functional
- [ ] All API calls work
- [ ] State management intact
- [ ] Modal closes properly
- [ ] Save functionality works

---

## 7. Implementation Timeline

### Estimated Effort

**Phase 1: Preparation** - 15 minutes
- Create directory structure
- Extract types file
- Create TabSkeleton

**Phase 2: Tab Extraction** - 45 minutes
- Extract SecurityPoliciesTab (10 min)
- Extract UserManagementTab (15 min)
- Extract SystemConfigTab (15 min)
- Extract MonitoringTab (5 min)

**Phase 3: Modal Refactor** - 30 minutes
- Update imports
- Add lazy loading
- Add Suspense wrappers
- Remove old tab code

**Phase 4: Deduplication** - 20 minutes
- Create InviteCodeSection
- Update UserManagementTab
- Update SystemConfigTab

**Phase 5: Testing** - 30 minutes
- TypeScript verification
- Build verification
- Runtime testing
- Edge case testing

**Total: ~2.5 hours**

### Recommended Approach

**Single Session:**
- Best done in one sitting
- Maintain context
- Easier to catch issues
- Commit as single logical unit

**Git Strategy:**
```bash
# Create feature branch
git checkout -b refactor/admin-settings-tabs

# Implement all phases

# Single commit with comprehensive message
git commit -m "refactor: split AdminSettingsModal into tab components

- Extract SecurityPoliciesTab (123 lines)
- Extract UserManagementTab (179 lines)
- Extract SystemConfigTab (153 lines)
- Extract MonitoringTab (33 lines)
- Create shared SecurityConfig type
- Create TabSkeleton component
- Extract InviteCodeSection (eliminates 69 duplicate lines)
- Add lazy loading for all tabs
- Maintain 100% functional parity

BREAKING CHANGES: None (internal refactor only)
TESTED: All tabs verified functional
BUNDLE: Estimated 6-8 KB savings for typical admin session"
```

---

## 8. Success Criteria

### Functional Requirements ✅

- [ ] All tabs render without errors
- [ ] All form inputs work correctly
- [ ] All API calls succeed
- [ ] Modal state management intact
- [ ] Save functionality works
- [ ] User management works (role changes, deletion)
- [ ] Invite code creation works
- [ ] System stats refresh works
- [ ] Sync status refresh works
- [ ] Modal opens and closes properly

### Non-Functional Requirements ✅

- [ ] Zero TypeScript errors
- [ ] Build succeeds
- [ ] No console errors in browser
- [ ] No regression in existing functionality
- [ ] Code follows existing patterns
- [ ] Naming conventions match codebase
- [ ] Documentation is professional
- [ ] No `any` types introduced
- [ ] No code duplication
- [ ] Git history is clean

### Performance Requirements ✅

- [ ] Tab switching shows skeleton (max 100ms)
- [ ] Tabs load within 200ms (first time)
- [ ] Subsequent tab switches are instant
- [ ] Bundle size reduced for typical usage
- [ ] No memory leaks

---

## 9. Future Considerations

### Type Safety Improvements

**Current `any` types to fix:**
```typescript
users: any[]           → User[]
stats: any             → SystemStats
syncStatus: any        → SyncStatus
onChange: ...value: any → ...value: boolean | number | string
```

**Recommendation:** Create proper type interfaces after tab splitting is stable

### MonitoringTab Implementation

**Current state:** Placeholder with "Coming Soon" message

**Future work:**
- Real-time metrics dashboard
- Login attempt visualization
- Security event log
- System performance charts

**Recommendation:** Implement after tab splitting proves stable

### Additional Optimizations

**Potential future work:**
- Preload tabs on hover (eliminate 100ms delay)
- Cache tab state (preserve inputs when switching)
- Add tab-level error boundaries
- Implement tab-specific analytics

---

## 10. Appendix

### A. File Size Breakdown

```
Current AdminSettingsModal.tsx: 825 lines
├── Imports & Types:            50 lines  (6%)
├── Main Component:            276 lines (33%)
├── SecurityPoliciesTab:       123 lines (15%)
├── UserManagementTab:         179 lines (22%)
├── SystemConfigTab:           153 lines (19%)
├── MonitoringTab:              33 lines  (4%)
└── Export:                      1 line   (0%)

After Splitting:
├── AdminSettingsModal.tsx:    ~340 lines (orchestrator)
├── SecurityConfig.ts:          ~60 lines (types)
├── TabSkeleton.tsx:            ~20 lines
├── InviteCodeSection.tsx:      ~40 lines
├── SecurityPoliciesTab.tsx:   ~130 lines
├── UserManagementTab.tsx:     ~120 lines (after dedup)
├── SystemConfigTab.tsx:        ~90 lines (after dedup)
└── MonitoringTab.tsx:          ~40 lines
```

### B. Import Dependency Map

**SecurityPoliciesTab:**
- SecurityConfig (type)
- No external dependencies (pure UI)

**UserManagementTab:**
- React.useState
- lucide-react: RefreshCw, User
- adminService
- notifications

**SystemConfigTab:**
- SecurityConfig (type)
- lucide-react: RefreshCw
- InviteCodeSection (component)

**MonitoringTab:**
- lucide-react: RefreshCw, Activity
- No state, minimal dependencies

### C. Naming Convention Rationale

**Directory: `admin-settings/`**
- Rationale: kebab-case for directories (industry standard)
- Alternative considered: `adminSettings/` (rejected: camelCase not standard for directories)
- Matches: existing directory patterns in codebase

**Files: `SecurityPoliciesTab.tsx`**
- Rationale: PascalCase matching component name
- Alternative considered: `security-policies-tab.tsx` (rejected: inconsistent with codebase)
- Matches: TubeModal.tsx, BatchEditModal.tsx, AdminSettingsModal.tsx

**Exports: Named exports**
- Rationale: Enables tree-shaking, clearer imports
- Alternative considered: Default exports (rejected: lazy loading needs named)
- Matches: LazyTubeModal, LazyBatchEditModal patterns

---

## Conclusion

This plan provides a comprehensive, low-risk approach to splitting AdminSettingsModal into modular tab components. The refactoring improves maintainability, eliminates code duplication, and provides minor performance benefits through lazy-loaded tabs.

**Key Principles:**
- ✅ Maintain 100% functional parity
- ✅ No breaking changes to public API
- ✅ Follow existing codebase patterns
- ✅ Professional naming conventions
- ✅ Comprehensive testing strategy
- ✅ Clear rollback path

**Next Steps:**
1. Review and approve this plan
2. Create backup of AdminSettingsModal.tsx
3. Execute implementation in single session
4. Verify all success criteria
5. Deploy and monitor

---

**Status:** Ready for Implementation
**Approval Required:** Yes
**Risk Level:** Medium (mitigated by comprehensive testing)
**Estimated Effort:** 2.5 hours
**Expected Outcome:** Improved code maintainability + minor performance gain
