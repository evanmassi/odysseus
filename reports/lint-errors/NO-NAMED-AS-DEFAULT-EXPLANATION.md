# Import/no-named-as-default Warning Explained

**Date:** 2025-01-11
**Rule:** `import/no-named-as-default`
**Count:** 7 warnings (all related to `react-hot-toast`)

---

## What This Warning Means (In Simple Terms)

This ESLint warning occurs when you use a **default import** with the same name as a **named export** from the same module.

### The Problem

The `react-hot-toast` library exports BOTH:
1. A **default export** (the main toast function)
2. A **named export** called `toast` (also the toast function)

When you write:
```typescript
import toast from 'react-hot-toast';
```

ESLint warns you because there's ALSO a named export called `toast`, which creates potential confusion:
- Are you importing the default export?
- Or are you importing the named export `{ toast }`?

---

## Real-World Example

### What We Currently Have (CAUSES WARNING):
```typescript
import toast from 'react-hot-toast';  // ⚠️ Warning!

toast.success('Hello!');
```

**Why warning?** Because `react-hot-toast` exports:
- Default export: `export default toast`
- Named export: `export { toast }`

ESLint sees this and says: "Hey! You're using the name `toast` for the default import, but there's also a named export called `toast`. This is confusing!"

---

## The Solutions

### Solution 1: Use a Different Name for Default Import (RECOMMENDED)
```typescript
import toastLib from 'react-hot-toast';  // ✅ No warning!

toastLib.success('Hello!');
```

**Pros:**
- Clear that you're importing the default export
- No ambiguity
- Fixes ESLint warning

**Cons:**
- Need to update ALL files using `toast.` to `toastLib.`
- 7 files affected

---

### Solution 2: Use Named Import Instead
```typescript
import { toast } from 'react-hot-toast';  // ✅ No warning!

toast.success('Hello!');
```

**Pros:**
- Explicit about what you're importing
- No ambiguity
- Fixes ESLint warning
- Code looks the same (still `toast.success()`)

**Cons:**
- Need to change import statement in 7 files
- Must verify `react-hot-toast` actually exports `{ toast }` as a named export

---

### Solution 3: Add ESLint Disable Comment (NOT RECOMMENDED)
```typescript
// eslint-disable-next-line import/no-named-as-default
import toast from 'react-hot-toast';

toast.success('Hello!');
```

**Pros:**
- No code changes needed
- Quick fix

**Cons:**
- Doesn't actually solve the ambiguity
- Just silences the warning
- Not addressing the root issue

---

## My Investigation

Looking at the library, `react-hot-toast` likely exports it this way:

```typescript
// Inside react-hot-toast library
const toast = (...) => { ... };

export default toast;  // Default export
export { toast };       // Named export (same function)
```

This is a common pattern to support both import styles:
- `import toast from 'react-hot-toast'` (default)
- `import { toast } from 'react-hot-toast'` (named)

---

## Recommended Fix: Solution 2 (Use Named Import)

**Why this is best:**
1. ✅ More explicit and clear
2. ✅ No ambiguity about what you're importing
3. ✅ Modern ES6+ best practice
4. ✅ Minimal code changes (import statement only)
5. ✅ Keeps the same API usage (`toast.success()`)

**Implementation:**

### Before:
```typescript
import toast from 'react-hot-toast';
```

### After:
```typescript
import { toast } from 'react-hot-toast';
```

**Files to Update (7 total):**
1. `app/queryClient.ts:6`
2. `domains/admin/ui/components/PasswordResetModal.tsx:19`
3. `domains/authentication/ui/components/ResetPasswordPage.tsx:18`
4. `domains/storage/hooks/useBoxPositionDisplay.ts:2`
5. `infrastructure/connection/networkMonitor.ts:11`
6. `infrastructure/optimistic/optimisticUpdates.ts:10`
7. `shared/utils/notifications.ts:1`

---

## Why Does This Matter?

### 1. Code Clarity
Clear imports make code easier to understand:
```typescript
// Unclear - using default import with name that matches named export
import toast from 'react-hot-toast';

// Clear - explicitly using named import
import { toast } from 'react-hot-toast';
```

### 2. Avoid Future Bugs
If the library changes its export structure, named imports are more stable:
```typescript
// If library removes default export, this breaks:
import toast from 'react-hot-toast';  // ❌ Error!

// Named import still works:
import { toast } from 'react-hot-toast';  // ✅ Still works
```

### 3. Better Tree-Shaking
Named imports can help bundlers better understand what you're using:
```typescript
// Named imports are more explicit for bundlers
import { toast, Toaster } from 'react-hot-toast';
```

---

## Related Warning: `import/no-named-as-default-member`

You also have 41 warnings for `import/no-named-as-default-member`. This is related but different:

```typescript
// no-named-as-default-member warning:
import React from 'react';
React.useState();  // ⚠️ Warning! useState is a named export, not a member of default

// Better:
import React, { useState } from 'react';
useState();  // ✅ No warning
```

We can tackle that one next!

---

## Verification Test

After making changes, we can verify it works:

```typescript
// Test file to verify both import styles work
import { toast } from 'react-hot-toast';

toast.success('Testing named import!');
toast.error('This should work!');
```

If this works, then the library does support named imports and we're good to go!

---

**Status:** Ready for implementation
**Estimated Time:** 5-10 minutes (7 simple import changes)
**Risk:** Very low (simple import statement changes, no logic changes)
