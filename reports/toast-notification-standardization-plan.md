# Toast Notification Standardization Plan

**Date:** 2024-12-30
**Status:** Pending Review
**Scope:** Complete overhaul of toast notification system

---

## Executive Summary

This plan standardizes Odysseus toast notifications from the current 10+ color/style variations to a clean, modern 4-type system following industry best practices (Linear, Notion, Vercel style).

**Key Changes:**
- Reduce from 10+ notification types to 4 semantic types
- Adopt modern "dark background + colored left border" aesthetic
- Use existing design system colors (success, danger, warning, info)
- Standardize all positioning to bottom-right
- Consolidate dual import pattern (direct `toast` + `notifications` utility)
- Add consistent icons for instant visual recognition
- All toasts auto-dismiss (no dismiss buttons)

---

## Current State Analysis

### Current Notification Types (10+)

| Method | Background | Text Color | Duration | Usage |
|--------|------------|------------|----------|-------|
| `success()` | `#10B981` (green) | White | 3s | Generic success |
| `error()` | `#EF4444` (red) | White | 5s | All errors |
| `warning()` | `#FFF0D9` (amber) | White | 4s | Caution messages |
| `info()` | `#D9F3FF` (ice blue) | White | 3s | Neutral info |
| `copy()` | `#D9F3FF` (ice blue) | `#0C4A6E` (dark blue) | 2s | Copy to clipboard |
| `paste()` | `#D9F3FF` (ice blue) | `#0C4A6E` (dark blue) | 2s | Paste operation |
| `cut()` | `#FFF0D9` (amber) | `#92400E` (dark amber) | 2s | Cut operation |
| `move()` | `#FFF0D9` (amber) | `#92400E` (dark amber) | 2s | Move operation |
| `create()` | `#E3F8E6` (mint) | `#065F46` (dark green) | 3s | Create tube |
| `update()` | `#E3F8E6` (mint) | `#065F46` (dark green) | 3s | Update tube |
| `delete()` | `#10B981` (green) | White | 3s | Delete success |
| `lock()` | `#E3F8E6` (mint) | `#065F46` (dark green) | 2s | Lock/unlock tubes |
| `loading()` | Default | Default | Until dismissed | Async operations |

### Current Problems

1. **Too many visual variations** - Users see green, red, amber, blue, mint backgrounds inconsistently
2. **Confusing semantics** - `delete()` uses green (success), `cut()` uses amber (warning) - not intuitive
3. **Light backgrounds clash** - Pastel backgrounds (`#FFF0D9`, `#D9F3FF`, `#E3F8E6`) look washed out against dark UI
4. **Inconsistent text colors** - Some white, some dark - hard to read
5. **Dual import pattern** - Some files use `toast.error()`, others use `notifications.error()` - inconsistent
6. **Variable durations** - 2s, 3s, 4s, 5s scattered without clear logic
7. **No icons** - Users must read text to understand notification type

---

## Proposed New System

### Design Philosophy: Linear/Notion Style

**Core Principle:** Same dark background for ALL toasts, differentiated by:
- Colored left border (4px)
- Colored icon
- Message text

This creates a **subtle, professional aesthetic** that doesn't flash jarring colors.

### New Notification Types (4 Only)

| Type | Icon | Border Color | CSS Variable | Use Case | Duration |
|------|------|--------------|--------------|----------|----------|
| **Success** | `CheckCircle` | `#22c55e` | `--color-success-bg` | Completed actions | 3s |
| **Error** | `XCircle` | `#f76969` | `--color-danger-bg` | Failed operations | 5s |
| **Warning** | `AlertTriangle` | `#eab308` | `--color-warning-bg` | Caution/blocked | 4s |
| **Info** | `Info` | `#3b82f6` | `--color-info-bg` | Neutral updates | 3s |

**Note:** These colors come directly from the existing Odysseus design system in `variables.css`, ensuring visual consistency with buttons, alerts, and validation states throughout the app.

### Visual Design Spec

```
┌──────────────────────────────────────────────────┐
│▐ ✓  Tube created successfully                   │
└──────────────────────────────────────────────────┘
 ↑  ↑  ↑
 │  │  └─ Message text (#E5E7EB gray-200)
 │  └──── Icon (colored to match border)
 └─────── 4px left border (semantic color)

Background: #1F2937 (gray-800)
Border radius: 8px
Padding: 12px 16px
Shadow: subtle dark shadow
No dismiss button - all toasts auto-dismiss
```

### Color Palette (Using Existing Design System)

```css
/* Toast container */
--toast-bg: #1F2937;           /* gray-800 - matches app dark theme */
--toast-text: #E5E7EB;         /* gray-200 - high contrast */
--toast-border-radius: 8px;

/* Semantic colors - reuse existing CSS variables */
--toast-success: var(--color-success-bg);   /* #22c55e - green */
--toast-error: var(--color-danger-bg);      /* #f76969 - coral red */
--toast-warning: var(--color-warning-bg);   /* #eab308 - golden yellow */
--toast-info: var(--color-info-bg);         /* #3b82f6 - blue */
```

### Duration Rules

| Type | Duration | Auto-Dismiss | Rationale |
|------|----------|--------------|-----------|
| Success | 3000ms | Yes | Quick confirmation, user moves on |
| Error | 5000ms | Yes | Longer time to read, but doesn't block UI |
| Warning | 4000ms | Yes | Important but not critical |
| Info | 3000ms | Yes | Quick update, low priority |
| Loading | Until resolved | N/A | Tied to async operation, dismissed programmatically |

**No dismiss buttons** - All toasts auto-dismiss after their duration. This keeps the UI clean and uncluttered. Users have sufficient time to read each message type.

---

## Complete Notification Mapping

### All Current Notifications → New Categories

#### SUCCESS (Green Border) - 47 occurrences

These all become `notifications.success()`:

| Current Call | Message | File |
|--------------|---------|------|
| `notifications.copy()` | "Copied X tubes" | useGridClipboard.ts |
| `notifications.paste()` | "Pasted X items" | useGridClipboard.ts |
| `notifications.cut()` | "Cut X tubes" | useGridClipboard.ts |
| `notifications.move()` | "Moved X items" | useGridClipboard.ts |
| `notifications.create()` | "Successfully created tube at position X" | TubeEditorModal.tsx |
| `notifications.create()` | "Created X tubes successfully" | TubeEditorModal.tsx |
| `notifications.update()` | "Tube updated successfully" | TubeEditorModal.tsx |
| `notifications.update()` | "Updated X tubes successfully" | BatchTubeEditorModal.tsx |
| `notifications.delete()` | "Tube removed successfully" | TubeEditorModal.tsx |
| `notifications.delete()` | "Removed X tubes successfully" | BatchTubeEditorModal.tsx |
| `notifications.lock()` | "Locked X tubes" | LockTubesModal.tsx |
| `notifications.lock()` | "Shared access to X tubes" | ShareAccessModal.tsx |
| `notifications.lock()` | "Revoked access from X" | ShareAccessModal.tsx |
| `notifications.success()` | "User role updated to X" | UserManagementTab.tsx |
| `notifications.success()` | "User deleted successfully" | UserManagementTab.tsx |
| `notifications.success()` | "User approved successfully" | UserManagementTab.tsx |
| `notifications.success()` | "User rejected" | UserManagementTab.tsx |
| `notifications.success()` | "Researcher unlinked" | UserManagementTab.tsx |
| `notifications.success()` | "Researcher deleted successfully" | ResearcherManagementTab.tsx |
| `notifications.success()` | "Researcher added successfully" | ResearcherModal.tsx |
| `notifications.success()` | "Researcher linked successfully" | ResearcherModal.tsx |
| `notifications.success()` | "Login successful!" | LoginModal.tsx |
| `notifications.success()` | "Verification email sent!" | LoginModal.tsx |
| `notifications.success()` | "Settings saved successfully" | UserSettingsModal.tsx |
| `notifications.success()` | "Storage configuration saved" | StorageManagementModal.tsx |
| `notifications.success()` | "Security configuration updated" | AdminSettingsModal.tsx |
| `notifications.success()` | "Profile updated successfully" | AccountTab.tsx |
| `notifications.success()` | "Password changed successfully" | SecurityTab.tsx |
| `notifications.success()` | "Logged out successfully" | SessionListSection.tsx |
| `notifications.success()` | "Logged out from other devices" | SessionListSection.tsx |
| `notifications.success()` | "Lock note updated" | EditLockNoteModal.tsx |
| `toast.success()` | "Password reset successfully" | PasswordResetModal.tsx |
| `toast.success()` | "Reset link generated" | PasswordResetModal.tsx |
| `toast.success()` | "Reset link copied" | PasswordResetModal.tsx |
| `toast.success()` | "Password reset successfully!" | ResetPasswordPage.tsx |
| `toast.success()` | "Connection restored - syncing data" | networkMonitor.ts |
| `notifications.success()` | "Connected to server" | queryBridge.ts |
| `notifications.success()` | "Reconnected to server" | queryBridge.ts |
| `notifications.success()` | "Position display mode updated" | useBoxPositionDisplay.ts |
| `notifications.success()` | "Lab default updated" | useBoxPositionDisplay.ts |
| `toast.success()` | "Researcher created successfully" | useResearchersQuery.ts |
| `toast.success()` | "Researcher updated/deactivated" | useResearchersQuery.ts |
| `toast.success()` | "Researcher deleted successfully" | useResearchersQuery.ts |
| `notifications.success()` | "Navigated to tube location" | Dashboard.tsx |

#### ERROR (Red Border) - 42 occurrences

These all become `notifications.error()`:

| Current Call | Message | File |
|--------------|---------|------|
| `notifications.error()` | "Navigation failed: X" | Dashboard.tsx |
| `notifications.error()` | "Failed to update tube" | TubeEditorModal.tsx |
| `notifications.error()` | "Failed to remove tube" | TubeEditorModal.tsx |
| `notifications.error()` | "Failed to create tube: X" | TubeEditorModal.tsx |
| `notifications.error()` | "No valid positions selected" | TubeEditorModal.tsx |
| `notifications.error()` | "Failed to process any positions" | TubeEditorModal.tsx |
| `notifications.error()` | "An unexpected error occurred" | TubeEditorModal.tsx |
| `notifications.error()` | "Failed to update tubes" | BatchTubeEditorModal.tsx |
| `notifications.error()` | "Some tubes failed to update" | BatchTubeEditorModal.tsx |
| `notifications.error()` | "Retry failed" | BatchTubeEditorModal.tsx |
| `notifications.error()` | "Failed to remove tubes" | BatchTubeEditorModal.tsx |
| `notifications.error()` | "Failed to share tube access" | ShareAccessModal.tsx |
| `notifications.error()` | "Failed to revoke access" | ShareAccessModal.tsx |
| `notifications.error()` | "Failed to lock tubes" | LockTubesModal.tsx |
| `notifications.error()` | "Failed to update lock note" | EditLockNoteModal.tsx |
| `notifications.error()` | "Failed to update user role" | UserManagementTab.tsx |
| `notifications.error()` | "Failed to delete user" | UserManagementTab.tsx |
| `notifications.error()` | "Failed to approve user" | UserManagementTab.tsx |
| `notifications.error()` | "Failed to reject user" | UserManagementTab.tsx |
| `notifications.error()` | "Failed to unlink researcher" | UserManagementTab.tsx |
| `notifications.error()` | "Failed to load researchers" | UserManagementTab.tsx |
| `notifications.error()` | "Failed to load researchers" | ResearcherManagementTab.tsx |
| `notifications.error()` | "Cannot delete researcher with X tubes" | ResearcherManagementTab.tsx |
| `notifications.error()` | "Failed to delete researcher" | ResearcherManagementTab.tsx |
| `notifications.error()` | "Failed to add researcher" | ResearcherModal.tsx |
| `notifications.error()` | "Failed to link researcher" | ResearcherModal.tsx |
| `notifications.error()` | "Failed to save settings" | UserSettingsModal.tsx |
| `notifications.error()` | "Failed to save changes" | StorageManagementModal.tsx |
| `notifications.error()` | "Failed to update security config" | AdminSettingsModal.tsx |
| `notifications.error()` | "Please fill in all required fields" | RegisterModal.tsx |
| `notifications.error()` | "Please enter valid email" | RegisterModal.tsx |
| `notifications.error()` | "Passwords do not match" | RegisterModal.tsx |
| `notifications.error()` | "Password does not meet requirements" | RegisterModal.tsx |
| `notifications.error()` | "Registration failed" | RegisterModal.tsx |
| `notifications.error()` | "Please enter username/email first" | LoginModal.tsx |
| `notifications.error()` | "Failed to send verification email" | LoginModal.tsx |
| `notifications.error()` | Various validation errors | AccountTab.tsx |
| `notifications.error()` | "Failed to update profile" | AccountTab.tsx |
| `notifications.error()` | Various password errors | SecurityTab.tsx |
| `notifications.error()` | "Failed to logout" | SessionListSection.tsx |
| `toast.error()` | "Password must be at least 4 characters" | PasswordResetModal.tsx |
| `toast.error()` | "Failed to reset password" | PasswordResetModal.tsx |
| `toast.error()` | "Failed to copy link" | PasswordResetModal.tsx |
| `toast.error()` | "Server error occurred" | queryClient.ts |
| `toast.error()` | "Network error. Check connection" | queryClient.ts |
| `toast.error()` | "Your changes could not be saved" | queryClient.ts |
| `toast.error()` | "Connection lost - working offline" | networkMonitor.ts |
| `toast.error()` | "Unable to reconnect" | networkMonitor.ts |
| `notifications.error()` | "Disconnected from server" | queryBridge.ts |
| `notifications.error()` | "Failed to connect to server" | queryBridge.ts |
| `notifications.error()` | "Configuration sync error" | queryBridge.ts |
| `notifications.error()` | "Failed to reconnect" | queryBridge.ts |
| `toast.error()` | "Failed to create researcher" | useResearchersQuery.ts |
| `toast.error()` | "Failed to update researcher" | useResearchersQuery.ts |
| `toast.error()` | "Failed to delete researcher" | useResearchersQuery.ts |
| `notifications.error()` | "Failed to update position display" | useBoxPositionDisplay.ts |
| `notifications.error()` | "Failed to update lab default" | useBoxPositionDisplay.ts |
| `toast.error()` | "Action failed. Changes reverted." | optimisticUpdates.ts |
| `toast.error()` | "Connection issues. Changes reverted." | optimisticUpdates.ts |

#### WARNING (Amber Border) - 18 occurrences

These all become `notifications.warning()`:

| Current Call | Message | File |
|--------------|---------|------|
| `notifications.warning()` | "Cannot add tubes to space assigned to another user" | useGridController.ts |
| `notifications.warning()` | "X tubes skipped (owned by others)" | useGridController.ts |
| `notifications.warning()` | "Cannot edit this tube. No access." | useGridController.ts |
| `notifications.warning()` | "No tubes can be locked or unlocked" | useGridController.ts |
| `notifications.warning()` | "No tubes can be locked" | useGridController.ts |
| `notifications.warning()` | "No tubes can be unlocked" | useGridController.ts |
| `notifications.warning()` | "No tubes available for sharing" | useGridController.ts |
| `notifications.warning()` | "X tubes skipped (owned by others)" | useGridClipboard.ts |
| `notifications.warning()` | "Cannot add tubes to space assigned to another user" | useGridClipboard.ts |
| `notifications.warning()` | "Created X, updated Y, Z failed" | TubeEditorModal.tsx |
| `notifications.warning()` | "Please select at least one user" | ShareAccessModal.tsx |
| `notifications.warning()` | "No tubes were shared" | ShareAccessModal.tsx |
| `notifications.warning()` | "No access was revoked" | ShareAccessModal.tsx |
| `notifications.warning()` | "No tubes were locked" | LockTubesModal.tsx |
| `notifications.warning()` | "Partial success: X updated, Y failed" | BatchTubeEditorModal.tsx |
| `notifications.warning()` | "No internet - offline mode" | queryBridge.ts |
| `notifications.warning()` | "Configuration updated by another user" | queryBridge.ts |

#### INFO (Indigo Border) - 5 occurrences

These all become `notifications.info()`:

| Current Call | Message | File |
|--------------|---------|------|
| `notifications.info()` | "Connection restored - syncing latest data" | queryBridge.ts |
| `notifications.info()` | "Storage sync complete" | queryBridge.ts |
| `notifications.info()` | "No changes to save" | StorageManagementModal.tsx |
| `notifications.info()` | "No retryable failures found" | BatchTubeEditorModal.tsx |
| `toast.loading()` → then success/error | Various async messages | optimisticUpdates.ts |

---

## Implementation Plan

### Phase 1: Create Custom Toast Component

**File:** `client/src/shared/ui/components/Toast.tsx`

```tsx
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

// Custom toast component with left border accent
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    borderColor: 'var(--color-success-bg)',  // #22c55e
    iconColor: 'text-success-bg'
  },
  error: {
    icon: XCircle,
    borderColor: 'var(--color-danger-bg)',   // #f76969
    iconColor: 'text-danger-bg'
  },
  warning: {
    icon: AlertTriangle,
    borderColor: 'var(--color-warning-bg)',  // #eab308
    iconColor: 'text-warning-bg'
  },
  info: {
    icon: Info,
    borderColor: 'var(--color-info-bg)',     // #3b82f6
    iconColor: 'text-info-bg'
  },
} as const;

export const Toast: React.FC<ToastProps> = ({ type, message }) => {
  const config = TOAST_CONFIG[type];
  const Icon = config.icon;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg"
      style={{
        backgroundColor: '#1F2937',
        borderLeft: `4px solid ${config.borderColor}`,
      }}
    >
      <Icon
        className="w-5 h-5 flex-shrink-0"
        style={{ color: config.borderColor }}
      />
      <span className="text-sm text-gray-200">{message}</span>
    </div>
  );
};
```

### Phase 2: Rewrite Notifications Utility

**File:** `client/src/shared/utils/notifications.ts`

```tsx
import { toast } from 'react-hot-toast';
import { Toast } from '@shared/ui/components/Toast';

export const notifications = {
  success: (message: string) => {
    toast.custom(() => <Toast type="success" message={message} />, {
      duration: 3000,
      position: 'bottom-right',
    });
  },

  error: (message: string) => {
    toast.custom(() => <Toast type="error" message={message} />, {
      duration: 5000,
      position: 'bottom-right',
    });
  },

  warning: (message: string) => {
    toast.custom(() => <Toast type="warning" message={message} />, {
      duration: 4000,
      position: 'bottom-right',
    });
  },

  info: (message: string) => {
    toast.custom(() => <Toast type="info" message={message} />, {
      duration: 3000,
      position: 'bottom-right',
    });
  },

  loading: (message: string) => {
    return toast.loading(message, { position: 'bottom-right' });
  },

  dismiss: (id?: string) => {
    toast.dismiss(id);
  },
};
```

### Phase 3: Update Toaster Configuration

**File:** `client/src/app/providers.tsx`

```tsx
<Toaster
  position="bottom-right"
  containerStyle={{
    bottom: 24,
    right: 24,
  }}
  toastOptions={{
    // Custom toasts handle their own styling
  }}
/>
```

### Phase 4: Migrate All Toast Calls

#### Files to Update (by priority):

**High Priority (most used):**
1. `useGridClipboard.ts` - Replace `copy()`, `cut()`, `paste()`, `move()` → `success()`
2. `useGridController.ts` - Keep `warning()`, update message patterns
3. `TubeEditorModal.tsx` - Replace `create()`, `update()`, `delete()` → `success()`
4. `BatchTubeEditorModal.tsx` - Same replacements
5. `queryBridge.ts` - Standardize all connection toasts

**Medium Priority:**
6. `LockTubesModal.tsx` - Replace `lock()` → `success()`
7. `ShareAccessModal.tsx` - Replace `lock()` → `success()`
8. `UserManagementTab.tsx` - Already uses `success()`/`error()`, just verify
9. `ResearcherManagementTab.tsx` - Same

**Low Priority (admin/settings):**
10. `PasswordResetModal.tsx` - Switch from `toast.` to `notifications.`
11. `LoginModal.tsx` - Already correct
12. `RegisterModal.tsx` - Already correct
13. Various settings modals

### Phase 5: Remove Deprecated Code from notifications.ts

**File:** `client/src/shared/utils/notifications.ts`

**DELETE entirely:**
```typescript
// DELETE - Old color constants
const COLORS = {
  lightAmber: '#FFF0D9',
  icyBlue: '#D9F3FF',
  mintyFrost: '#E3F8E6',
  success: '#10B981',
  error: '#EF4444',
} as const;

// DELETE - Old export
export { COLORS as NOTIFICATION_COLORS };
```

**DELETE these methods:**
- `copy()` → replaced by `success()`
- `paste()` → replaced by `success()`
- `cut()` → replaced by `success()`
- `move()` → replaced by `success()`
- `create()` → replaced by `success()`
- `update()` → replaced by `success()`
- `delete()` → replaced by `success()`
- `lock()` → replaced by `success()`
- `promise()` → DELETE (not used, `loading()` + `dismiss()` covers async cases)

**KEEP and update:**
- `success()` → rewrite to use custom Toast component
- `error()` → rewrite to use custom Toast component
- `warning()` → rewrite to use custom Toast component
- `info()` → rewrite to use custom Toast component
- `loading()` → keep as-is (returns toast ID for programmatic dismiss)
- `dismiss()` → keep as-is

### Phase 6: Delete Old CSS Entirely

**File:** `client/src/shared/styles/components/notifications.css`

**DELETE the entire file contents** and replace with minimal styling for the custom component (if needed).

**What gets deleted:**
```css
/* DELETE - All of this */
:root {
  --toast-delete-color: #ef4444;
  --toast-copy-color: #3b82f6;
  --toast-cut-color: #f97316;
  --toast-create-color: #059669;
  --toast-update-color: #0ea5e9;
  --toast-warning-color: #f59e0b;
  --toast-info-color: #6b7280;
}

.toast-delete div:last-child { ... }
.toast-copy div:last-child { ... }
.toast-cut div:last-child { ... }
.toast-create div:last-child { ... }
.toast-update div:last-child { ... }
.toast-warning div:last-child { ... }
.toast-info div:last-child { ... }
```

**Keep only:**
```css
/* Container gap styling - may still be useful */
.react-hot-toast-container {
  gap: 8px !important;
}
```

### Phase 7: Update Toaster Configuration

**File:** `client/src/app/providers.tsx`

**DELETE the inline style object** from Toaster - custom component handles its own styling:

```tsx
// BEFORE (DELETE)
<Toaster
  position="top-right"
  toastOptions={{
    duration: 4000,
    style: {
      background: '#1f2937',
      color: '#f9fafb',
      borderRadius: '0.75rem',
      padding: '0.75rem 1rem',
    },
  }}
/>

// AFTER (CLEAN)
<Toaster
  position="bottom-right"
  toastOptions={{
    duration: 3000,  // Default, overridden per-type in notifications utility
  }}
/>
```

### Phase 8: Clean Up Direct toast.* Calls

Search and replace all direct `toast.success()`, `toast.error()` calls with `notifications.*` equivalents.

**Files with direct toast imports to fix:**
- `queryClient.ts` - 5 calls
- `networkMonitor.ts` - 4 calls
- `optimisticUpdates.ts` - 4 calls
- `PasswordResetModal.tsx` - 6 calls
- `ResetPasswordPage.tsx` - 1 call
- `useResearchersQuery.ts` - 6 calls

After migration, remove unused `import { toast } from 'react-hot-toast'` statements from these files.

### Phase 9: Verify No Dead Code Remains

**Final cleanup checklist:**
- [ ] `notifications.ts` has only 6 methods: `success`, `error`, `warning`, `info`, `loading`, `dismiss`
- [ ] `notifications.ts` has no `COLORS` constant
- [ ] `notifications.ts` has no `NOTIFICATION_COLORS` export
- [ ] `notifications.css` has no `--toast-*` CSS variables
- [ ] `notifications.css` has no `.toast-*` CSS classes
- [ ] `providers.tsx` Toaster has no inline `style` object
- [ ] No files import `NOTIFICATION_COLORS`
- [ ] No files call `notifications.copy()`, `.paste()`, `.cut()`, `.move()`, `.create()`, `.update()`, `.delete()`, `.lock()`, `.promise()`
- [ ] No files have unused `import { toast }` after migration

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `shared/ui/components/Toast.tsx` | **NEW** - Custom toast component |
| `shared/utils/notifications.ts` | Rewrite - 4 methods only |
| `shared/styles/components/notifications.css` | Rewrite - New styling |
| `app/providers.tsx` | Update Toaster config |
| `app/queryClient.ts` | Replace `toast.*` → `notifications.*` |
| `app/hooks/grid/useGridClipboard.ts` | Replace operation methods → `success()` |
| `app/hooks/grid/useGridController.ts` | Minor updates |
| `app/components/layout/Dashboard.tsx` | Minor updates |
| `infrastructure/socket/queryBridge.ts` | Standardize calls |
| `infrastructure/connection/networkMonitor.ts` | Replace `toast.*` → `notifications.*` |
| `infrastructure/optimistic/optimisticUpdates.ts` | Replace `toast.*` → `notifications.*` |
| `domains/tubes/ui/components/modals/*.tsx` | Replace operation methods |
| `domains/admin/ui/components/*.tsx` | Replace `toast.*` → `notifications.*` |
| `domains/authentication/ui/components/*.tsx` | Minor updates |
| `domains/researchers/hooks/useResearchersQuery.ts` | Replace `toast.*` → `notifications.*` |
| `domains/storage/hooks/useBoxPositionDisplay.ts` | Minor updates |

**Total files affected:** ~25

---

## Testing Checklist

After implementation, verify:

- [ ] Success toast appears with green left border (`#22c55e`) + checkmark icon
- [ ] Error toast appears with coral red left border (`#f76969`) + X icon
- [ ] Warning toast appears with golden yellow left border (`#eab308`) + triangle icon
- [ ] Info toast appears with blue left border (`#3b82f6`) + info icon
- [ ] All toasts appear in bottom-right corner
- [ ] Success auto-dismisses after 3s
- [ ] Error auto-dismisses after 5s
- [ ] Warning auto-dismisses after 4s
- [ ] Info auto-dismisses after 3s
- [ ] Loading toast shows spinner and persists until dismissed programmatically
- [ ] No duplicate toasts for same operation
- [ ] Toasts stack correctly (newest on bottom)
- [ ] Dark background (`#1F2937`) looks consistent with app aesthetic
- [ ] Colors match existing buttons/alerts in the app (success, danger, warning, info)

---

## Rollback Plan

If issues arise:
1. Revert `notifications.ts` to previous version
2. Revert `providers.tsx` Toaster config
3. Keep old CSS as backup

All changes are UI-only, no data or API changes.

---

## Approval Checklist

Before implementation:

- [ ] Confirm 4-type system (success/error/warning/info) is acceptable
- [ ] Confirm Linear/Notion style (dark bg + colored left border) is preferred over solid colors
- [ ] Confirm using existing design system colors:
  - Success: `#22c55e` (`--color-success-bg`)
  - Error: `#f76969` (`--color-danger-bg`)
  - Warning: `#eab308` (`--color-warning-bg`)
  - Info: `#3b82f6` (`--color-info-bg`)
- [ ] Confirm bottom-right positioning
- [ ] Confirm duration rules (success 3s, error 5s, warning 4s, info 3s)
- [ ] Confirm NO dismiss buttons (all toasts auto-dismiss)
- [ ] Confirm removing operation-specific methods (copy, cut, paste, move, create, update, delete, lock)
- [ ] Review complete notification mapping above for any edge cases
