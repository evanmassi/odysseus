# Resource Assignment System - Implementation Plan (REVISED)

**Feature:** User-based resource assignment for racks and boxes
**Status:** Planning Phase - Revised for Minimal Approach
**Target:** Odysseus v2.0
**Created:** 2025-01-17
**Revised:** 2025-01-18
**Architecture:** Minimal Service Layer (89.5% Code Reuse)

---

## Executive Summary

This document outlines the implementation plan for a **resource assignment system** that allows administrators to assign specific racks and boxes to individual users. This is the **foundational system** that will later enable resource locking and access control.

### Architecture Decision: Minimal Approach

**Assignment is a configuration change, not a separate business domain.** We will leverage the existing configuration infrastructure rather than creating new services/endpoints.

**How it works:**
1. Frontend updates Zustand store with new `assignedUserId` and `customLabel` fields
2. Frontend calls existing `useSaveStorageMutation()`
3. Backend's existing `UpdateConfigurationCommandHandler` validates and saves
4. Existing `ConfigurationChangeDetector` detects assignment changes and emits events
5. Existing `SocketEventHandler` broadcasts to all clients
6. Frontend's existing Socket listener invalidates cache and refetches

**Benefits:**
- ✅ Leverages existing, battle-tested infrastructure
- ✅ No new API endpoints needed
- ✅ No new application service needed
- ✅ Automatic audit logging via existing patterns
- ✅ Automatic real-time sync via existing Socket integration
- ✅ Minimal code to maintain (~414 lines new code)

---

## Core Functionality

1. **Admin Assignment** - Administrators can assign racks/boxes to specific users
2. **Custom Labels** - Assigned users can add personal labels to their resources while preserving generic names
3. **Visual Ownership** - Clear visual indicators showing who owns what (user initials or unassigned icon)
4. **Access Control** - Users can only edit resources assigned to them (admins can edit anything)
5. **Ownership Cascade** - Owning a rack means owning all boxes in it (unless admin overrides at box level)

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture** | Minimal Service Layer | Assignment is configuration change, reuse existing handlers |
| **Storage Location** | Configuration JSON | Assignments are lab setup, not transactional data |
| **Assignment Scope** | Racks AND Boxes | Granular control without overwhelming complexity |
| **Label Format** | `Box B (Custom Label)` | Preserves generic name for universal understanding |
| **Unassigned Default** | All resources start unassigned | Opt-in model, admins assign as needed |
| **Assignment Model** | User-owned (not researcher-owned) | Users are authenticated entities |
| **Cascade Behavior** | Rack ownership cascades to all boxes | Simplifies permission checks |
| **Admin Override** | Can explicitly assign boxes to different users | Override cascade when needed |
| **New Endpoints** | NONE | Use existing `/api/configuration` save endpoint |
| **New Services** | NONE | Use existing `UpdateConfigurationCommandHandler` |
| **Domain Events** | Use existing pattern | `ConfigurationChangeDetector` emits events automatically |

---

## Business Requirements

### User Stories

**As an admin, I want to:**
- Assign specific racks to specific users so they have dedicated storage space
- Assign specific boxes to specific users for more granular control
- See at a glance which resources are assigned and to whom
- Reassign resources when users leave or roles change
- View all assignments across the entire lab
- Prevent accidental assignment of resources to inactive users

**As a regular user, I want to:**
- See which racks/boxes have been assigned to me
- Add custom labels to my assigned resources for organization
- Edit boxes within my rack (since I own the rack)
- Know that my assigned resources are protected from accidental edits by others
- See generic names alongside custom labels so I can communicate with others

**As any user, I want to:**
- Visually distinguish assigned vs. unassigned resources
- Know who owns each assigned resource
- Understand the lab layout even if resources have custom labels

---

### Important: Scope & Boundaries

**What this system DOES:**
- Assigns racks and boxes to users (storage space ownership)
- Allows custom labeling of assigned resources
- Controls who can edit rack/box configuration (grid size, custom labels)

**What this system DOES NOT affect:**
- **Tube ownership** - Tubes are completely independent from rack/box assignment
- **Tube editing permissions** - Any user can edit any tube (unless locked via future locking feature)
- **Tube `researcherId` field** - This stores who physically froze the tube (lab protocol), not related to box ownership

**Example Scenario:**
- Alice owns Box A (storage space)
- Bob freezes tubes and puts them in Box A
- Tubes show `researcherId = Bob` (who froze them)
- Anyone can still edit those tubes (no restrictions yet)
- Alice can edit Box A configuration (grid size, custom label)

**Future:** Locking feature will allow users to lock specific tubes to reserve them.

---

## UI/UX Overview by Role

This section clarifies what each user role sees and can do in the interface.

---

## Visual Design System

**Purpose:** Allow users to instantly recognize their owned resources, unassigned common spaces, and other users' resources at a glance.

### Row Layout (Left to Right)

```
[Badge] [Icon] Generic Name (Custom Label)  --------  [Dropdown] [Edit] [Trash]
  ↑       ↑          ↑                                    ↑         ↑      ↑
Badge   Rack/Box   Display Name                      Admin Only  Actions Actions
```

**Component Breakdown:**
1. **Badge** - Ownership indicator (initials or UsersRound icon)
2. **Icon** - Existing Rack/Box/Tank icon (unchanged)
3. **Display Name** - Generic name + optional custom label
4. **Spacing** - Visual gap
5. **Assignment Dropdown** - ONLY visible to admins
6. **Edit Button** - Tag icon (custom label) or Edit icon (config)
7. **Trash Button** - Delete resource

---

### Badge Styles

#### User's Owned Resources
- **Badge:** Circled initials in **icy blue** (same as save button color)
- **Size:** Slightly larger for racks than boxes (visual hierarchy)
- **Colors:**
  - Background: `bg-blue-500` (icy blue)
  - Text: `text-white`
  - Example: "AS" for Alice Smith

#### Other Users' Resources
- **Badge:** Circled initials in **gray**
- **Size:** Same as user's owned (slightly larger for racks)
- **Colors:**
  - Background: `bg-gray-500`
  - Text: `text-white`
  - Example: "BJ" for Bob Jones

#### Unassigned/Common Spaces
- **Badge:** UsersRound icon in **yellow** (warning theme color)
- **Size:** Same as initials badges
- **Colors:**
  - Background: `bg-yellow-500` (warning color)
  - Text: `text-white`
  - Icon: `UsersRound` from lucide-react

---

### Background Tints (Entire Row)

To make ownership instantly scannable, the **entire row** has a subtle background tint:

| Ownership State | Background Color | Purpose |
|----------------|------------------|---------|
| **User's owned resources** | `bg-blue-50` | Icy blue tint - "This is mine" |
| **Other users' resources** | Default/neutral | No special background |
| **Unassigned/common spaces** | `bg-yellow-50` | Yellow tint - "Available for use" |

**Note:** These tints apply to BOTH racks and boxes. All resources the user owns (whether rack or box in any rack) have the same blue tint.

---

### Collapsed Rack Notation

When a rack is collapsed, show ownership summary in parentheses:

**If user owns ALL boxes in the rack:**
```
Rack 3 (you own all boxes) [▼]
```

**If user owns SOME boxes (not all):**
```
Rack 2 (you own 2 boxes) [▼]
```

**If user owns NO boxes:**
```
Rack 1 [▼]
```

This allows users to quickly scan collapsed racks and spot which ones contain their resources.

---

### Visual Hierarchy

**Size Differences (for scanability):**
- **Rack badges:** Slightly larger (e.g., `w-7 h-7`, `text-sm`)
- **Box badges:** Slightly smaller (e.g., `w-6 h-6`, `text-xs`)
- **Rack borders:** Thicker left border (e.g., `border-l-4`)
- **Box borders:** Thinner left border (e.g., `border-l-2`)

This creates visual hierarchy where racks are more prominent than boxes.

---

### Visual Key/Legend

**Location:** Footer of Storage Management Modal (always visible while scrolling)

**Content:**
```
┌─────────────────────────────────────────────────────────────┐
│ Key:                                                        │
│ [AS] Icy blue badge = Your resources                       │
│ [BJ] Gray badge = Other users' resources                   │
│ [👥] Yellow badge = Common space (open for use)             │
└─────────────────────────────────────────────────────────────┘
```

**Purpose:**
- First-time users understand the color system immediately
- Reinforces that yellow/unassigned spaces are available for tube storage
- No need to hover or explore to understand the system

---

### Visual Examples

#### Example 1: Admin View (Full Tree)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Tank 1                                                                     │
│   ├─ [AS] 🗄️ Rack 3 (Alice's Samples)  ────  [▼ alice] [🏷️] [✏️] [🗑️]   │ ← Blue tint (admin owns)
│   │  ├─ [AS] 📦 Box A  ────────────────────  [▼ alice] [🏷️] [✏️] [🗑️]   │ ← Blue tint (cascade)
│   │  ├─ [BJ] 📦 Box B (Controls)  ──────────  [▼ bob]   [🏷️] [✏️] [🗑️]   │ ← Neutral (Bob's)
│   │  └─ [👥] 📦 Box C  ────────────────────  [▼ Unassigned] [✏️] [🗑️]   │ ← Yellow tint (common)
│   │                                                                        │
│   └─ [BJ] 🗄️ Rack 2 (Bob's Rack)  ─────────  [▼ bob]   [🏷️] [✏️] [🗑️]   │ ← Neutral (Bob's)
│      ├─ [BJ] 📦 Box A  ────────────────────  [▼ bob]   [🏷️] [✏️] [🗑️]   │ ← Neutral (cascade)
│      └─ [AS] 📦 Box D (T Cells)  ──────────  [▼ alice] [🏷️] [✏️] [🗑️]   │ ← Blue tint (explicit)
└────────────────────────────────────────────────────────────────────────────┘

Legend:
[AS] = Alice (admin in this example) - icy blue badge
[BJ] = Bob - gray badge
[👥] = Unassigned - yellow badge
[▼ alice] = Assignment dropdown (admin only)
Blue background = Alice owns
Yellow background = Unassigned/common
```

#### Example 2: Regular User View (Alice) - Same Tree, No Dropdowns

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Tank 1                                                                     │
│   ├─ [AS] 🗄️ Rack 3 (Alice's Samples)  ────────────  [🏷️] [✏️]           │ ← Blue tint (I own this)
│   │  ├─ [AS] 📦 Box A  ─────────────────────────────  [🏷️] [✏️]           │ ← Blue tint (cascade)
│   │  ├─ [BJ] 📦 Box B (Controls)  ──────────────────                      │ ← Neutral (Bob's - no actions)
│   │  └─ [👥] 📦 Box C  ──────────────────────────────                      │ ← Yellow tint (common - read-only)
│   │                                                                        │
│   └─ [BJ] 🗄️ Rack 2 (Bob's Rack)  ─────────────────                      │ ← Neutral (Bob's - no actions)
│      ├─ [BJ] 📦 Box A  ────────────────────────────                      │ ← Neutral (cascade)
│      └─ [AS] 📦 Box D (T Cells)  ──────────────────  [🏷️] [✏️]           │ ← Blue tint (I own this!)
└────────────────────────────────────────────────────────────────────────────┘

Legend:
[AS] = My resources (Alice) - icy blue badge, blue background
[BJ] = Bob's resources - gray badge, neutral background
[👥] = Common space - yellow badge, yellow background
NO dropdowns visible (not an admin)
Edit buttons ONLY on my resources
```

#### Example 3: Collapsed Rack with Partial Ownership

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Tank 1                                                                     │
│   ├─ [AS] 🗄️ Rack 3 (Alice's Samples) [▼ collapsed]  ── [🏷️] [✏️]        │ ← Blue tint
│   └─ [BJ] 🗄️ Rack 2 (you own 1 box) [▼ collapsed]  ─────                 │ ← Neutral, but shows ownership note
└────────────────────────────────────────────────────────────────────────────┘

When Alice collapses Rack 2 (Bob's rack where she owns Box D), she sees:
"Rack 2 (you own 1 box)" - so she knows to expand it to find her box
```

---

### Permissions & Capabilities by Ownership

| Resource Type | User Can Add Tubes | User Can Edit Config | User Can Edit Label |
|---------------|-------------------|---------------------|---------------------|
| **My owned rack** | ✅ Yes | ✅ Yes (grid size) | ✅ Yes |
| **My owned box** | ✅ Yes | ✅ Yes (grid size) | ✅ Yes |
| **Unassigned/common** | ✅ Yes | ❌ No | ❌ No |
| **Other user's resource** | ❌ No | ❌ No | ❌ No |

**Important:**
- Users **can** add tubes to unassigned/common spaces (they're available for everyone)
- Users **cannot** edit configuration or labels on unassigned spaces (admin-only)
- Only admins can add/remove tanks, racks, or boxes from the tree

---

### Admin View



**Location:** Storage Management Modal (Admin → Manage Storage)

**What Admins See:**

1. **Assignment Dropdowns** on every rack and box
   - Searchable dropdown with all active users
   - Shows current assignee or "Unassigned"
   - Can select user to assign
   - Can clear to unassign

2. **Visual Ownership Indicators** on all resources
   - Initials badge (blue for self, gray for others)
   - UsersRound icon for unassigned
   - Tooltip showing full username

3. **Custom Label Edit Button** (Tag icon)
   - Visible on ALL resources (admins can edit any label)

4. **Generic Name Edit Button** (Edit icon)
   - Can edit rack/box names and grid sizes

**What Admins Can Do:**
- Assign any rack/box to any active user
- Unassign any resource
- Edit any custom label (even if assigned to someone else)
- Edit generic names and configurations
- View all assignments across entire lab
- **View assignments per user** in User Management (Phase 6)

**Example Admin View:**
```
Rack 3 (Alice's Samples)  [AS] [▼ alice] [🏷️ Edit Label] [✏️ Edit Rack]
  └─ Box A                [AS] [▼ alice] [🏷️ Edit Label] [✏️ Edit Box]
  └─ Box B (Controls)     [BJ] [▼ bob]   [🏷️ Edit Label] [✏️ Edit Box]
  └─ Box C                [👥] [▼ Unassigned] [✏️ Edit Box]

Legend:
[AS] = Initials badge (Alice Smith)
[▼ alice] = Assignment dropdown
[🏷️ Edit Label] = Custom label edit button
[✏️ Edit] = Configuration edit button
[👥] = Unassigned icon
```

---

### Regular User View

**Location:** Storage Management Modal (Admin → Manage Storage) - **read-only for non-admins**

**What Regular Users See:**

1. **NO Assignment Dropdowns**
   - Assignment dropdowns are **completely hidden** from regular users
   - Cannot assign/unassign anything

2. **Visual Ownership Indicators** on all resources
   - Initials badge (blue for self, gray for others)
   - UsersRound icon for unassigned
   - Tooltip showing full username
   - Can see who owns every rack/box in the lab

3. **Custom Label Edit Button** (Tag icon)
   - **Only visible on resources they own:**
     - Racks explicitly assigned to them
     - Boxes explicitly assigned to them
     - Boxes in racks they own (cascade)
   - **Hidden on resources they don't own**

4. **Generic Name Edit Button** (Edit icon)
   - **Only visible on resources they own** (same rules as custom label)
   - Can change grid size on boxes they own
   - **Cannot edit generic names** (admin-only)

**What Regular Users Can Do:**
- View all resources and their ownership
- Edit custom labels **only on resources assigned to them**
- Edit box grid sizes **only on boxes assigned to them** (or boxes in their racks)
- **Cannot** assign/unassign anything
- **Cannot** edit resources owned by others

**Example Regular User View (Alice logged in):**
```
Rack 3 (Alice's Samples)  [AS] [🏷️ Edit Label] [✏️ Edit Grid]  ← Alice owns this
  └─ Box A                [AS] [🏷️ Edit Label] [✏️ Edit Grid]  ← Alice owns via cascade
  └─ Box B (Controls)     [BJ]                                  ← Bob owns, Alice can't edit
  └─ Box C                [AS] [🏷️ Edit Label] [✏️ Edit Grid]  ← Alice owns via cascade

Rack 2 (Bob's Rack)       [BJ]                                  ← Bob owns, Alice can't edit
  └─ Box A                [BJ]                                  ← Bob owns via cascade
  └─ Box B                [AS] [🏷️ Edit Label] [✏️ Edit Grid]  ← Explicitly assigned to Alice

Legend:
[AS] = Alice's initials (blue badge)
[BJ] = Bob's initials (gray badge)
[🏷️ Edit Label] = Custom label edit button (only on Alice's resources)
[✏️ Edit Grid] = Grid size edit button (only on Alice's boxes)
No dropdowns visible - Alice cannot assign/unassign
```

---

### Key UI Differences

| Feature | Admin | Regular User |
|---------|-------|--------------|
| **Assignment Dropdowns** | ✅ Visible on all racks/boxes | ❌ Hidden completely |
| **Ownership Indicators** | ✅ See all (everyone's badges) | ✅ See all (everyone's badges) |
| **Custom Label Edit** | ✅ All resources | ✅ Only owned resources |
| **Generic Name Edit** | ✅ All resources | ❌ None (admin-only) |
| **Grid Size Edit** | ✅ All boxes | ✅ Only owned boxes |
| **View User Assignments** | ✅ In User Management | ❌ No access |
| **Assign/Unassign** | ✅ Full control | ❌ Cannot assign |

---

### User Management View (Admin Only - Phase 6)

**Location:** Admin Settings → User Management

**What's Added:**

Each user row shows:
- **"X resources"** link (clickable)
- Clicking opens **UserAssignmentsModal**

**UserAssignmentsModal shows:**
- Filtered tree view of user's resources
- Owned racks with all boxes
- Boxes in other users' racks (with notation)
- Read-only (no actions, just viewing)

**Example:**
```
User Management Table:
┌─────────────┬────────────┬────────┬─────────────┐
│ Username    │ Role       │ Status │ Assignments │
├─────────────┼────────────┼────────┼─────────────┤
│ alice       │ User       │ Active │ 5 resources │ ← Click to view
│ bob         │ User       │ Active │ 2 resources │
│ charlie     │ User       │ Active │ No assignments │
└─────────────┴────────────┴────────┴─────────────┘

Click "5 resources" → Opens modal showing:

Resource Assignments: alice

Tank 1
  └─ Rack 3 (Alice's Samples)
     ├─ Box A
     ├─ Box B (Controls)
     └─ Box C
  └─ Rack 2 (owned by Bob Jones)
     └─ Box D (T Cell Donors)

Tank 2
  └─ Rack 5
     ├─ Box A
     └─ Box B
```

---

## Data Model Design

### Enhanced Configuration Schema

```typescript
// File: packages/shared-schemas/src/storage/configurationSchemas.ts

// EXISTING SCHEMA - EXTEND WITH 2 FIELDS:
export const rackConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  capacity: z.number(),
  location: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  boxes: z.array(boxConfigurationSchema),

  // NEW: Assignment fields (ADD THESE TWO LINES)
  assignedUserId: z.string().optional(),  // Foreign key to users.id
  customLabel: z.string().max(50).optional()  // User's custom label (max 50 chars)
}).strict();

// EXISTING SCHEMA - EXTEND WITH 2 FIELDS:
export const boxConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  gridConfig: gridConfigurationSchema,
  position: z.number(),

  // NEW: Assignment fields (ADD THESE TWO LINES)
  assignedUserId: z.string().optional(),  // Foreign key to users.id
  customLabel: z.string().max(50).optional()  // User's custom label (max 50 chars)
}).strict();

export type RackConfiguration = z.infer<typeof rackConfigurationSchema>;
export type BoxConfiguration = z.infer<typeof boxConfigurationSchema>;
```

**Total Schema Changes:** 4 lines added to existing schemas

---

### Display Name Helper

```typescript
// File: packages/shared-schemas/src/storage/formatters.ts (NEW FILE)

/**
 * Format resource display name with optional custom label
 *
 * @example
 * formatResourceDisplayName("Rack 3", undefined) → "Rack 3"
 * formatResourceDisplayName("Rack 3", "Hadia's Samples") → "Rack 3 (Hadia's Samples)"
 * formatResourceDisplayName("Box B", "T cell donors") → "Box B (T cell donors)"
 */
export const formatResourceDisplayName = (
  genericName: string,
  customLabel?: string
): string => {
  if (!customLabel || customLabel.trim().length === 0) {
    return genericName;
  }
  return `${genericName} (${customLabel})`;
};
```

---

## Domain Model Design

### Business Rules

#### Assignment Rules

1. **Admin-Only Assignment**
   - Only admins can assign/unassign resources
   - Regular users cannot assign resources to themselves or others
   - Cannot assign to inactive users

2. **One Owner Per Resource**
   - A rack can only be assigned to one user at a time
   - A box can only be assigned to one user at a time
   - **Reassignment always clears custom label** (new owner starts with blank custom label)

3. **Ownership Cascade with Admin Override** ⭐ **IMPORTANT**
   - **Rack ownership cascades to all boxes in that rack**
   - **Example:**
     - Admin assigns Rack 3 to Alice
     - Alice now owns Rack 3 and ALL boxes in Rack 3 (Box A, Box B, Box C, etc.)
     - Alice can edit any box in her rack (add custom labels, change grid size)
   - **Admin can override at box level:**
     - Admin explicitly assigns Box B in Rack 3 to Bob
     - Bob now owns Box B (overrides Alice's rack ownership)
     - **Box B's custom label is cleared** (if Alice had added one)
     - Bob can now add his own custom label to Box B
     - Alice still owns Box A, Box C, and all other boxes in Rack 3
     - Alice CANNOT edit Box B (Bob owns it explicitly)

4. **Custom Label Lifecycle** ⭐ **IMPORTANT**
   - **Custom labels are tied to ownership**
   - **Any ownership change clears the custom label:**
     - Reassigning a rack to a different user → Custom label cleared
     - Reassigning a box to a different user → Custom label cleared
     - Admin overriding cascade by explicitly assigning a box → Custom label cleared
     - Unassigning a resource → Custom label cleared
   - **Why:** Custom labels are personal to the owner. New owner gets a blank slate to add their own label.

5. **Custom Label Permissions**
   - Only resource owner can edit custom label
   - Admins can edit custom labels for any resource
   - Unassigned resources have no custom label

6. **Generic Name Immutability**
   - Generic names (Rack 3, Box B) can only be changed by admins
   - Custom labels don't replace generic names, they augment them

7. **Unassignment Cascade Logic** ⭐ **IMPORTANT**
   - **When admin unassigns a rack:**
     - Rack's `assignedUserId` → Set to `undefined`
     - Rack's `customLabel` → Cleared
     - **For each box in that rack:**
       - If box has NO explicit assignment (`assignedUserId === undefined`) → Becomes unassigned, custom label cleared
       - If box IS explicitly assigned to another user → **Remains assigned to that user** (not affected)
   - **Example:**
     - Alice owns Rack 1
     - Box A: No explicit assignment (cascaded from rack) → Alice owns it
     - Box B: Explicitly assigned to Bob → Bob owns it
     - **Admin unassigns Rack 1:**
       - Rack 1 → Unassigned
       - Box A → Unassigned (was cascaded)
       - Box B → **Still assigned to Bob** (explicit assignment preserved)

8. **User Lifecycle Rules**
   - **Active users only:** Cannot assign resources to inactive users
   - **User deletion:** Must unassign all resources before deletion
   - **User deactivation:** Existing assignments remain (for audit), but cannot edit custom labels

---

### Permission Logic Implementation

```typescript
// File: server/src/domain/services/AccessControlService.ts
// ADD THESE METHODS TO EXISTING SERVICE:

/**
 * Check if user can assign resources
 * Only admins can assign/unassign
 */
canAssignResource(user: User): boolean {
  return user.role.isAdmin();
}

/**
 * Check if user can edit a resource (configuration or custom label)
 *
 * OWNERSHIP CASCADE WITH ADMIN OVERRIDE:
 * - Admin: Can edit anything
 * - Explicit box assignment: Box has assignedUserId → That user owns it
 * - Cascade: Box has no assignedUserId → Rack owner owns it
 */
canEditResource(
  user: User,
  resource: RackConfiguration | BoxConfiguration,
  parentRack?: RackConfiguration  // Required for box permission checks
): boolean {
  // Admin can edit anything
  if (user.role.isAdmin()) {
    return true;
  }

  // Explicit assignment to this resource
  if (resource.assignedUserId === user.id) {
    return true;
  }

  // OWNERSHIP CASCADE (boxes only)
  // If box has no explicit assignment, check rack ownership
  if (parentRack && !resource.assignedUserId && parentRack.assignedUserId === user.id) {
    return true;
  }

  return false;
}

/**
 * Check if user can be assigned resources
 * Must be active
 */
canBeAssignedResources(user: User): boolean {
  return user.isActive;
}
```

**Total Permission Code:** ~35 lines (3 methods)

---

### Validation Rules

```typescript
// Validation happens in existing UpdateConfigurationCommandHandler
// No new validators needed - reuse existing ValidationService

// Key validations to perform:
// 1. User exists (via UserRepository.findById)
// 2. User is active (via canBeAssignedResources)
// 3. Resource exists (already validated by configuration schema)
// 4. Custom label length <= 100 characters (enforced by schema)
// 5. Requesting user has permission (via canAssignResource or canEditResource)
```

---

## Backend Implementation

### Existing Infrastructure (REUSE 100%)

#### UpdateConfigurationCommandHandler
**File:** `server/src/application/commands/ConfigurationCommands.ts` (Lines 373-452)

**What it already does:**
1. ✅ Accepts configuration updates from frontend
2. ✅ Gets current configuration from repository
3. ✅ Validates user permissions via `ValidationService`
4. ✅ Updates configuration using domain methods
5. ✅ Validates configuration changes
6. ✅ Saves to repository with versioning
7. ✅ Detects changes via `ConfigurationChangeDetector`
8. ✅ Publishes domain events via `EventBus`
9. ✅ Returns updated configuration

**How assignments work with it:**
- Frontend sends updated configuration with new `assignedUserId` and `customLabel` fields
- Handler receives it and processes normally
- **No code changes needed to handler itself!**

#### ConfigurationChangeDetector
**File:** `server/src/domain/services/ConfigurationChangeDetector.ts`

**What it does:**
- Compares old vs new configuration
- Detects changes (tanks added/removed, racks modified, boxes updated, etc.)
- Emits appropriate domain events

**How assignments work:**
- Detects when `rack.assignedUserId` changes → Emits `RackUpdatedEvent`
- Detects when `box.assignedUserId` changes → Emits `BoxUpdatedEvent`
- Detects when `customLabel` changes → Emits `RackUpdatedEvent` or `BoxUpdatedEvent`
- **No code changes needed!** Existing logic handles new fields automatically

#### ConfigurationRepository
**File:** `server/src/infrastructure/repositories/SQLiteConfigurationRepository.ts`

**What it does:**
- Stores configuration as JSON in database
- `save()` method persists entire configuration
- `getCurrent()` retrieves current configuration

**How assignments work:**
- New fields `assignedUserId` and `customLabel` are just JSON properties
- Automatically stored/retrieved with rest of configuration
- **No code changes needed!**

#### AuditRepository
**File:** `server/src/infrastructure/repositories/SQLiteAuditRepository.ts`

**What it does:**
- Logs all user actions to audit_log table
- Called automatically by command handlers

**How assignments work:**
- Existing audit logging in `UpdateConfigurationCommandHandler` creates entries
- Action type will be `'configuration_updated'`
- Details JSON will include the changes (which rack/box, assigned to whom)
- **No code changes needed!**

#### SocketEventHandler
**File:** `server/src/application/eventHandlers/SocketEventHandler.ts` (Lines 64-91)

**What it does:**
- Subscribes to domain events
- Emits Socket.IO events to connected clients
- Debounces rapid configuration changes

**How assignments work:**
- Already subscribes to `RackUpdatedEvent`, `BoxUpdatedEvent`
- Emits `'configuration_updated'` to all clients
- Frontend already listens and invalidates cache
- **No code changes needed!**

---

### New Backend Code Required

#### 1. Permission Methods
**File:** `server/src/domain/services/AccessControlService.ts`

**Add 3 methods (shown above):**
- `canAssignResource()` - ~5 lines
- `canEditResource()` - ~20 lines (includes cascade logic)
- `canBeAssignedResources()` - ~5 lines

**Total:** ~35 lines

#### 2. Validation Enhancement
**File:** `server/src/application/commands/ConfigurationCommands.ts`

**Enhance existing `UpdateConfigurationCommandHandler.handle()` to validate assignments:**

```typescript
// ADD THIS VALIDATION AFTER LINE 390 (after getting user):

// Detect assignment changes and validate
const beforeConfig = await this.configurationRepository.getCurrent();
const assignmentChanges = this.detectAssignmentChanges(
  beforeConfig,
  currentConfig
);

// Validate each assignment change
for (const change of assignmentChanges) {
  if (change.type === 'assign') {
    // Check if assigned user exists and is active
    const assignedUser = await this.userRepository.findById(change.userId);
    if (!assignedUser) {
      throw new ValidationError(`User ${change.userId} does not exist`);
    }
    if (!this.accessControlService.canBeAssignedResources(assignedUser)) {
      throw new ValidationError(`User ${assignedUser.username} is inactive and cannot be assigned resources`);
    }
  }
}

// ENFORCE CASCADE LOGIC: When rack unassigned, clear cascaded boxes (preserve explicit assignments)
for (const change of assignmentChanges) {
  if (change.type === 'unassign' && change.resourceType === 'rack') {
    // Find the rack in the new configuration
    const rack = this.findRack(currentConfig, change.resourceId);

    if (rack) {
      // Clear boxes that cascaded from this rack (no explicit assignment)
      rack.boxes.forEach(box => {
        if (!box.assignedUserId) {
          // This box had no explicit assignment - it was cascaded from the rack
          // Clear its custom label (ownership is gone)
          box.customLabel = undefined;
        }
        // Boxes WITH explicit assignedUserId are left alone (preserve other users' assignments)
      });
    }
  }
}

// Helper method to find rack by ID (ADD TO CLASS):
private findRack(config: Configuration, rackId: string): RackConfiguration | undefined {
  for (const tank of config.equipment.tanks) {
    const rack = tank.racks.find(r => r.id === rackId);
    if (rack) return rack;
  }
  return undefined;
}

// Helper method to detect assignment changes (ADD TO CLASS):
private detectAssignmentChanges(
  before: Configuration,
  after: Configuration
): AssignmentChange[] {
  const changes: AssignmentChange[] = [];

  // Compare each rack
  after.equipment.tanks.forEach(tank => {
    const beforeTank = before.equipment.tanks.find(t => t.id === tank.id);
    if (!beforeTank) return;

    tank.racks.forEach(rack => {
      const beforeRack = beforeTank.racks.find(r => r.id === rack.id);
      if (!beforeRack) return;

      // Rack assignment changed
      if (rack.assignedUserId !== beforeRack.assignedUserId) {
        if (rack.assignedUserId) {
          changes.push({
            type: 'assign',
            resourceType: 'rack',
            resourceId: rack.id,
            userId: rack.assignedUserId
          });
        } else {
          changes.push({
            type: 'unassign',
            resourceType: 'rack',
            resourceId: rack.id,
            previousUserId: beforeRack.assignedUserId
          });
        }
      }

      // Check boxes
      rack.boxes.forEach(box => {
        const beforeBox = beforeRack.boxes.find(b => b.id === box.id);
        if (!beforeBox) return;

        if (box.assignedUserId !== beforeBox.assignedUserId) {
          if (box.assignedUserId) {
            changes.push({
              type: 'assign',
              resourceType: 'box',
              resourceId: box.id,
              userId: box.assignedUserId
            });
          } else {
            changes.push({
              type: 'unassign',
              resourceType: 'box',
              resourceId: box.id,
              previousUserId: beforeBox.assignedUserId
            });
          }
        }
      });
    });
  });

  return changes;
}

interface AssignmentChange {
  type: 'assign' | 'unassign';
  resourceType: 'rack' | 'box';
  resourceId: string;
  userId?: string;
  previousUserId?: string;
}
```

**Total:** ~110 lines (validation logic + cascade enforcement + helper methods)

---

## Frontend Implementation

### Existing Infrastructure (REUSE 100%)

#### useSaveStorageMutation
**File:** `client/src/domains/storage/hooks/useStorageQuery.ts`

**What it does:**
- React Query mutation that saves configuration to backend
- Handles optimistic updates
- Invalidates cache on success
- Handles errors

**How to use for assignments:**
```typescript
// Already imported in StorageManagementModal (line 51)
const saveConfigurationMutation = useSaveStorageMutation();

// Update Zustand store
updateRack(labId, tankId, rackId, { assignedUserId: userId });

// Save to server
await saveToServerWithReactQuery();
```

**No new mutation needed!**

#### useStorageStore (Zustand)
**File:** `client/src/domains/storage/stores/storageStore.ts`

**What it has:**
- `updateRack()` - Updates rack properties
- `updateBox()` - Updates box properties
- State synced with server via `useConfigurationSync`

**How to use for assignments:**
```typescript
const updateRack = useStorageStore(state => state.updateRack);
const updateBox = useStorageStore(state => state.updateBox);

// Assign rack
updateRack(labId, tankId, rackId, { assignedUserId: userId });

// Update custom label
updateRack(labId, tankId, rackId, { customLabel: 'My Custom Label' });

// Assign box
updateBox(labId, tankId, rackId, boxId, { assignedUserId: userId });
```

**No store changes needed!**

#### Socket Integration
**File:** `client/src/infrastructure/socket/queryBridge.ts`

**What it does:**
- Listens for `'configuration_updated'` events from server
- Invalidates `queryKeys.storage.storage()` cache
- Triggers refetch from server

**How assignments work:**
- Backend saves configuration → Emits `'configuration_updated'`
- Frontend receives event → Invalidates cache → Refetches → UI updates
- **No code changes needed!**

---

### New Frontend Code Required

#### 1. useUsersQuery Hook
**File:** `client/src/domains/users/hooks/useUsersQuery.ts` (NEW FILE)

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@app/queryKeys';
import { AdminService } from '@domains/admin/services/AdminService';

/**
 * Fetch all users for assignment dropdown
 * Reuses existing AdminService.getUsers() method
 */
export const useUsersQuery = () => {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const result = await AdminService.getUsers();
      return result.users;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - users don't change often
  });
};
```

**Total:** ~15 lines

#### 2. Export from index
**File:** `client/src/domains/users/index.ts`

```typescript
export { useUsersQuery } from './hooks/useUsersQuery';
```

#### 3. Add queryKeys
**File:** `client/src/app/queryKeys.ts`

```typescript
export const queryKeys = {
  // ... existing keys ...
  users: {
    all: ['users'] as const,
  },
  // ... rest of keys ...
};
```

---

### StorageManagementModal Enhancements

**File:** `client/src/domains/tubes/ui/components/modals/StorageManagementModal.tsx`

**Existing Structure:** 994 lines total

**Add at top of component:**

```typescript
import { Users as UsersRound, Tag } from 'lucide-react'; // Add Tag icon
import { useUsersQuery } from '@domains/users';
import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import Select from 'react-select'; // For searchable user dropdown

export function StorageManagementModal({ isOpen, onClose }: StorageManagementModalProps) {
  const currentUser = useAuth().user;
  const { data: users = [] } = useUsersQuery(); // NEW: Fetch users for dropdown

  // ... existing state ...

  // NEW: State for custom label editing
  const [editingLabel, setEditingLabel] = useState<{
    type: 'rack' | 'box';
    tankId: string;
    rackId: string;
    boxId?: string;
    currentLabel?: string;
  } | null>(null);

  // NEW: Helper to get user initials
  const getUserInitials = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    if (!user) return '?';

    const first = user.firstName?.charAt(0) || user.username.charAt(0);
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  // NEW: Helper to check edit permissions (implements cascade)
  const canEditResource = (
    resource: RackConfiguration | BoxConfiguration,
    parentRack?: RackConfiguration
  ): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;

    // Explicit assignment
    if (resource.assignedUserId === currentUser.id) return true;

    // Cascade: Box has no explicit assignment, check rack ownership
    if (parentRack && !resource.assignedUserId && parentRack.assignedUserId === currentUser.id) {
      return true;
    }

    return false;
  };

  // Helper to determine who owns a box
  const getBoxOwner = (box: BoxConfiguration, rack: RackConfiguration): string | undefined => {
    // Explicit box assignment overrides rack ownership
    if (box.assignedUserId) return box.assignedUserId;

    // Cascade: Box inherits rack ownership
    return rack.assignedUserId;
  };

  // NEW: Assignment handler
  // Note: Backend enforces cascade logic (clears cascaded boxes when rack unassigned)
  // Frontend just updates the rack - backend handles the rest
  const handleAssignRack = async (tankId: string, rackId: string, userId: string | undefined) => {
    // If unassigning (userId is undefined), show confirmation prompt
    if (!userId) {
      const confirmed = await confirmDialog({
        title: 'Unassign Rack',
        message: 'This will clear the custom label and unassign this rack. Continue?',
        confirmText: 'Unassign',
        cancelText: 'Cancel'
      });
      if (!confirmed) return;
    }

    try {
      // Update rack assignment and clear custom label
      updateRack(currentLab.id, tankId, rackId, {
        assignedUserId: userId,
        customLabel: undefined // ALWAYS clear on ownership change
      });

      // Backend will:
      // 1. Validate assignment (user exists, active)
      // 2. Clear cascaded boxes if unassigning (preserve explicit assignments)
      // 3. Create audit log entries (RACK_ASSIGNED / RACK_UNASSIGNED)
      await saveToServerWithReactQuery();
    } catch (error) {
      // On error: dropdown reverts automatically (React Query refetch)
      toast.error('Failed to update assignment', {
        action: {
          label: 'Retry',
          onClick: () => handleAssignRack(tankId, rackId, userId)
        }
      });
    }
  };

  // NEW: Assignment handler for boxes
  const handleAssignBox = async (
    tankId: string,
    rackId: string,
    boxId: string,
    userId: string | undefined
  ) => {
    // If unassigning (userId is undefined), show confirmation prompt
    if (!userId) {
      const confirmed = await confirmDialog({
        title: 'Unassign Box',
        message: 'This will clear the custom label and unassign this box. Continue?',
        confirmText: 'Unassign',
        cancelText: 'Cancel'
      });
      if (!confirmed) return;
    }

    try {
      updateBox(currentLab.id, tankId, rackId, boxId, {
        assignedUserId: userId,
        // ALWAYS clear custom label on ownership change (new owner gets blank slate)
        customLabel: undefined
      });
      await saveToServerWithReactQuery();
    } catch (error) {
      // On error: dropdown reverts automatically (React Query refetch)
      toast.error('Failed to update assignment', {
        action: {
          label: 'Retry',
          onClick: () => handleAssignBox(tankId, rackId, boxId, userId)
        }
      });
    }
  };

  // NEW: Custom label update handler
  const handleUpdateCustomLabel = async (
    type: 'rack' | 'box',
    tankId: string,
    rackId: string,
    boxId: string | undefined,
    customLabel: string
  ) => {
    if (type === 'rack') {
      updateRack(currentLab.id, tankId, rackId, {
        customLabel: customLabel.trim() || undefined
      });
    } else {
      updateBox(currentLab.id, tankId, rackId, boxId!, {
        customLabel: customLabel.trim() || undefined
      });
    }
    await saveToServerWithReactQuery();
  };

  // ... rest of component ...
```

**Rack Row Enhancement (around line 650):**

```typescript
<div className="flex items-center gap-1.5 py-1 px-1.5 bg-slate-400 rounded border border-slate-500">
  <span className="text-slate-600 font-mono text-sm flex-shrink-0">
    {rackIndex === tank.racks.length - 1 ? '└' : '├'}
  </span>

  <button
    type="button"
    onClick={() => toggleRackCollapse(rackKey)}
    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-slate-500 -mx-1 px-1 py-0.5 rounded text-left"
  >
    {/* ... existing chevron and rack icon ... */}

    {/* CHANGED: Display name with custom label */}
    <span className="font-medium text-white text-sm inline-block min-w-[60px]">
      {formatResourceDisplayName(rack.name, rack.customLabel)}
    </span>

    {/* NEW: Assignment indicator */}
    {rack.assignedUserId ? (
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          rack.assignedUserId === currentUser?.id
            ? 'bg-blue-600 text-white'
            : 'bg-gray-600 text-white'
        }`}
        title={`Assigned to ${users.find(u => u.id === rack.assignedUserId)?.username || 'Unknown'}`}
      >
        {getUserInitials(rack.assignedUserId)}
      </div>
    ) : (
      <UsersRound
        className="text-gray-300"
        size={18}
        title="Unassigned"
      />
    )}

    {/* ... existing box count ... */}
  </button>

  {/* Action buttons */}
  <div className="flex items-center gap-1 flex-shrink-0">
    {/* NEW: Assignment dropdown (admin only) */}
    {currentUser?.role === 'admin' && (
      <Select
        value={
          rack.assignedUserId
            ? { value: rack.assignedUserId, label: users.find(u => u.id === rack.assignedUserId)?.username || '' }
            : null
        }
        onChange={(option) => handleAssignRack(tank.id, rack.id, option?.value)}
        options={users
          .filter(u => u.isActive) // Only show active users
          .map(user => ({
            value: user.id,
            label: user.username
          }))}
        isClearable
        placeholder="Unassigned"
        isSearchable
        className="text-xs"
        styles={{
          control: (base) => ({
            ...base,
            minHeight: '28px',
            height: '28px',
            minWidth: '120px',
            fontSize: '0.75rem',
            backgroundColor: '#475569',
            borderColor: '#475569',
            color: 'white',
          }),
          singleValue: (base) => ({
            ...base,
            color: 'white',
          }),
          placeholder: (base) => ({
            ...base,
            color: '#cbd5e1',
          }),
          input: (base) => ({
            ...base,
            color: 'white',
          }),
          menu: (base) => ({
            ...base,
            fontSize: '0.75rem',
          }),
        }}
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
    )}

    {/* NEW: Edit custom label (if user can edit this rack) */}
    {canEditResource(rack) && (
      <button
        onClick={() => setEditingLabel({
          type: 'rack',
          tankId: tank.id,
          rackId: rack.id,
          currentLabel: rack.customLabel
        })}
        className="text-slate-100 hover:bg-slate-500 p-1 rounded"
        title="Edit custom label"
      >
        <Tag size={14} />
      </button>
    )}

    {/* Existing Edit button (admin only, for generic name) */}
    {currentUser?.role === 'admin' && (
      <button
        onClick={() => setEditingRack({ tankId: tank.id, rack })}
        className="text-slate-100 hover:bg-slate-500 p-1 rounded"
        title="Edit rack configuration"
      >
        <Edit3 size={14} />
      </button>
    )}

    {/* ... existing delete button ... */}
  </div>
</div>
```

**Box Row Enhancement (around line 770):**

```typescript
<div
  key={box.id}
  className="flex items-center gap-1.5 py-0.5 px-1.5 bg-slate-200 rounded border border-slate-300"
>
  <span className="text-slate-400 font-mono text-xs flex-shrink-0">
    {boxIndex === rack.boxes.length - 1 ? '└' : '├'}
  </span>

  <BoxIcon className="text-slate-700 flex-shrink-0" size={16} />

  {/* CHANGED: Display name with custom label */}
  <span className="font-medium text-slate-800 text-xs inline-block w-32">
    {formatResourceDisplayName(box.name, box.customLabel)}
  </span>

  {/* NEW: Ownership indicator */}
  {(() => {
    const owner = getBoxOwner(box, rack);
    const isOwnedByMe = owner === currentUser?.id;

    if (owner) {
      return (
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            isOwnedByMe ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
          }`}
          title={`Owned by ${users.find(u => u.id === owner)?.username || 'Unknown'}`}
        >
          {getUserInitials(owner)}
        </div>
      );
    } else {
      return (
        <UsersRound
          className="text-gray-300"
          size={16}
          title="Unassigned"
        />
      );
    }
  })()}

  {/* ... existing grid config ... */}

  <div className="flex-1"></div>

  {/* Action buttons */}
  <div className="flex items-center gap-1 flex-shrink-0">
    {/* NEW: Assignment dropdown (admin only) */}
    {currentUser?.role === 'admin' && (
      <Select
        value={
          box.assignedUserId
            ? { value: box.assignedUserId, label: users.find(u => u.id === box.assignedUserId)?.username || '' }
            : null
        }
        onChange={(option) => handleAssignBox(tank.id, rack.id, box.id, option?.value)}
        options={users
          .filter(u => u.isActive)
          .map(user => ({
            value: user.id,
            label: user.username
          }))}
        isClearable
        placeholder="Unassigned"
        isSearchable
        className="text-xs"
        styles={{
          control: (base) => ({
            ...base,
            minHeight: '24px',
            height: '24px',
            minWidth: '100px',
            fontSize: '0.75rem',
            backgroundColor: '#cbd5e1',
            borderColor: '#cbd5e1',
          }),
          menu: (base) => ({
            ...base,
            fontSize: '0.75rem',
          }),
        }}
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
    )}

    {/* NEW: Edit custom label (if user can edit this box) */}
    {canEditResource(box, rack) && (
      <button
        onClick={() => setEditingLabel({
          type: 'box',
          tankId: tank.id,
          rackId: rack.id,
          boxId: box.id,
          currentLabel: box.customLabel
        })}
        className="text-slate-700 hover:bg-slate-300 p-1 rounded"
        title="Edit custom label"
      >
        <Tag size={12} />
      </button>
    )}

    {/* Existing Edit button (for grid size) */}
    {canEditResource(box, rack) && (
      <button
        onClick={() => setEditingBox({ tankId: tank.id, rackId: rack.id, box })}
        className="text-slate-700 hover:bg-slate-300 p-1 rounded"
        title="Change grid size"
      >
        <Edit3 size={12} />
      </button>
    )}

    {/* ... existing delete button ... */}
  </div>
</div>
```

**Custom Label Edit Modal (add after existing modals):**

```typescript
{/* Custom Label Edit Modal */}
{editingLabel && (
  <div
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
    role="presentation"
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUpdateCustomLabel(
          editingLabel.type,
          editingLabel.tankId,
          editingLabel.rackId,
          editingLabel.boxId,
          editingLabel.currentLabel || ''
        );
        setEditingLabel(null);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditingLabel(null);
      }
    }}
  >
    <div
      className="bg-white rounded-lg p-6 w-96 shadow-xl"
      role="dialog"
      aria-labelledby="label-edit-title"
      aria-modal="true"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 id="label-edit-title" className="text-lg font-bold">
          Edit Custom Label
        </h3>
        <button
          onClick={() => setEditingLabel(null)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Generic Name (Read-only) */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Generic Name (System)
          </label>
          <div className="px-3 py-2 bg-gray-100 rounded text-gray-700 font-medium">
            {(() => {
              const tank = currentLab.equipment.tanks.find(t => t.id === editingLabel.tankId);
              const rack = tank?.racks.find(r => r.id === editingLabel.rackId);
              if (editingLabel.type === 'rack') {
                return rack?.name || '';
              } else {
                const box = rack?.boxes.find(b => b.id === editingLabel.boxId);
                return box?.name || '';
              }
            })()}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Generic name is visible to all users and cannot be changed here
          </p>
        </div>

        {/* Custom Label Input */}
        <div>
          <label htmlFor="custom-label-input" className="block text-sm font-medium mb-2 text-gray-700">
            Your Custom Label (Optional)
          </label>
          <input
            id="custom-label-input"
            type="text"
            className="input w-full"
            value={editingLabel.currentLabel || ''}
            onChange={(e) => setEditingLabel({
              ...editingLabel,
              currentLabel: e.target.value
            })}
            placeholder="e.g., Hadia's Samples"
            maxLength={100}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave blank to remove custom label
          </p>
        </div>

        {/* Preview */}
        <div className="bg-blue-50 p-3 rounded">
          <label className="block text-sm font-medium mb-1 text-blue-700">
            Preview
          </label>
          <div className="text-sm font-medium text-blue-900">
            {(() => {
              const tank = currentLab.equipment.tanks.find(t => t.id === editingLabel.tankId);
              const rack = tank?.racks.find(r => r.id === editingLabel.rackId);
              if (editingLabel.type === 'rack') {
                return formatResourceDisplayName(rack?.name || '', editingLabel.currentLabel);
              } else {
                const box = rack?.boxes.find(b => b.id === editingLabel.boxId);
                return formatResourceDisplayName(box?.name || '', editingLabel.currentLabel);
              }
            })()}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => setEditingLabel(null)}
          className="btn-cancel"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            handleUpdateCustomLabel(
              editingLabel.type,
              editingLabel.tankId,
              editingLabel.rackId,
              editingLabel.boxId,
              editingLabel.currentLabel || ''
            );
            setEditingLabel(null);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={16} />
          Save Label
        </button>
      </div>
    </div>
  </div>
)}
```

**Total UI Code Added:** ~200 lines

---

### Install react-select Dependency

```bash
npm install react-select
npm install --save-dev @types/react-select
```

---

## User Lifecycle Handling

### User Deletion

**File:** `server/src/application/services/UserApplicationService.ts`

**Enhance existing `deleteUser()` method:**

```typescript
async deleteUser(userId: string, requestingUser: User): Promise<void> {
  // ... existing permission checks ...

  // NEW: Check if user owns any resources
  const config = await this.configurationRepository.getCurrent();
  if (!config) {
    throw new ValidationError('No configuration found');
  }

  const ownedResources: string[] = [];

  config.equipment.tanks.forEach(tank => {
    tank.racks.forEach(rack => {
      if (rack.assignedUserId === userId) {
        ownedResources.push(`Rack ${rack.name} in ${tank.name}`);
      }
      rack.boxes.forEach(box => {
        if (box.assignedUserId === userId) {
          ownedResources.push(`Box ${box.name} in ${rack.name}, ${tank.name}`);
        }
      });
    });
  });

  if (ownedResources.length > 0) {
    throw new ValidationError(
      `Cannot delete user. They are assigned to ${ownedResources.length} resource(s): ${ownedResources.join(', ')}. Unassign them first.`
    );
  }

  // ... existing delete logic ...
}
```

**Frontend Enhancement:**

When delete fails with assigned resources, show helpful error:
```typescript
// In error handler:
if (error.message.includes('assigned to')) {
  notifications.error(
    'Cannot delete user',
    `This user owns resources. Please reassign them first.`
  );
}
```

### User Deactivation

**File:** `server/src/application/services/UserApplicationService.ts`

**Enhance existing `deactivateUser()` method:**

```typescript
async deactivateUser(userId: string, requestingUser: User): Promise<void> {
  // ... existing logic ...

  // Deactivation is allowed even if user owns resources
  // Their assignments remain for audit trail
  // But they can no longer be assigned NEW resources (enforced by canBeAssignedResources)
  // And they cannot edit their custom labels (enforced by canEditResource checking isActive)

  await this.userRepository.save(user);

  // Publish event
  this.eventBus.publish(new UserDeactivatedEvent(userId, requestingUser.id));
}
```

**UI Enhancement:**

In assignment dropdown, show deactivated users differently if they're currently assigned:
```typescript
options={users.map(user => ({
  value: user.id,
  label: user.isActive ? user.username : `${user.username} (Deactivated)`,
  isDisabled: !user.isActive && rack.assignedUserId !== user.id // Can't assign to deactivated, but can see if already assigned
}))}
```

---

## Code Quality & ESLint Compliance

**IMPORTANT:** This section outlines critical patterns and checks to ensure all code written for this feature passes ESLint validation without errors or warnings.

### Common ESLint Errors to Avoid

#### 1. Floating Promises
**Problem:** Async operations without `await` or `.catch()` handlers

**Examples to avoid:**
```typescript
// ❌ BAD - Floating promise
handleAssignRack(tankId, rackId, userId);

// ❌ BAD - Floating promise in event handler
onClick={() => saveToServerWithReactQuery()}
```

**Correct patterns:**
```typescript
// ✅ GOOD - Awaited in async function
const handleAssignRack = async (tankId: string, rackId: string, userId: string | undefined) => {
  try {
    updateRack(currentLab.id, tankId, rackId, { assignedUserId: userId });
    await saveToServerWithReactQuery();
  } catch (error) {
    toast.error('Failed to update assignment');
  }
};

// ✅ GOOD - Void wrapper for event handlers
onClick={() => void handleAssignRack(tankId, rackId, userId)}

// ✅ GOOD - Explicit catch
onClick={() => handleAssignRack(tankId, rackId, userId).catch(handleError)}
```

#### 2. React Hook Dependencies
**Problem:** Missing dependencies in useEffect, useCallback, useMemo arrays

**Examples to avoid:**
```typescript
// ❌ BAD - Missing dependencies
useEffect(() => {
  if (rack.assignedUserId) {
    updateOwnership(rack.assignedUserId);
  }
}, []); // Missing: rack.assignedUserId, updateOwnership

// ❌ BAD - Missing callback dependencies
const handleSave = useCallback(() => {
  updateRack(labId, tankId, rackId, { customLabel: label });
}, []); // Missing: labId, tankId, rackId, label, updateRack
```

**Correct patterns:**
```typescript
// ✅ GOOD - All dependencies included
useEffect(() => {
  if (rack.assignedUserId) {
    updateOwnership(rack.assignedUserId);
  }
}, [rack.assignedUserId, updateOwnership]);

// ✅ GOOD - All dependencies included
const handleSave = useCallback(() => {
  updateRack(labId, tankId, rackId, { customLabel: label });
}, [labId, tankId, rackId, label, updateRack]);
```

#### 3. Accessibility (a11y)
**Problem:** Missing ARIA labels, roles, keyboard navigation

**Examples to avoid:**
```typescript
// ❌ BAD - No ARIA labels
<div onClick={handleClick}>
  <input type="text" />
</div>

// ❌ BAD - Non-interactive element with click handler
<div onClick={handleAssign}>Assign</div>
```

**Correct patterns:**
```typescript
// ✅ GOOD - Proper ARIA labels and roles
<div role="dialog" aria-labelledby="modal-title" aria-modal="true">
  <h3 id="modal-title">Edit Custom Label</h3>
  <input
    id="custom-label-input"
    type="text"
    aria-label="Custom label for resource"
  />
</div>

// ✅ GOOD - Use button element for interactive elements
<button type="button" onClick={handleAssign}>
  Assign
</button>

// ✅ GOOD - Keyboard support
<div
  role="presentation"
  onKeyDown={(e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  }}
>
```

#### 4. TypeScript - No Implicit Any
**Problem:** Variables, parameters, or return types without explicit types

**Examples to avoid:**
```typescript
// ❌ BAD - Implicit any
const getUserInitials = (userId) => {  // userId is implicitly any
  const user = users.find(u => u.id === userId);
  return user?.username.charAt(0) || '?';
};

// ❌ BAD - Any type used
const handleChange = (e: any) => {
  setLabel(e.target.value);
};
```

**Correct patterns:**
```typescript
// ✅ GOOD - Explicit types
const getUserInitials = (userId: string): string => {
  const user = users.find(u => u.id === userId);
  if (!user) return '?';

  const first = user.firstName?.charAt(0) || user.username.charAt(0);
  const last = user.lastName?.charAt(0) || '';
  return (first + last).toUpperCase();
};

// ✅ GOOD - Proper event typing
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setLabel(e.target.value);
};
```

#### 5. Unused Variables
**Problem:** Declared variables that are never used

**Examples to avoid:**
```typescript
// ❌ BAD - Unused variable
const handleAssign = async (userId: string) => {
  const timestamp = new Date();  // Never used
  updateRack(labId, tankId, rackId, { assignedUserId: userId });
  await saveToServerWithReactQuery();
};
```

**Correct patterns:**
```typescript
// ✅ GOOD - Remove unused variables
const handleAssign = async (userId: string) => {
  updateRack(labId, tankId, rackId, { assignedUserId: userId });
  await saveToServerWithReactQuery();
};

// ✅ GOOD - Prefix with _ if intentionally unused (like in destructuring)
const { data: users = [], isLoading: _isLoading } = useUsersQuery();
```

#### 6. Console Statements
**Problem:** Debug console.log() calls left in production code

**Examples to avoid:**
```typescript
// ❌ BAD - Console.log in production code
const handleAssign = async (userId: string) => {
  console.log('Assigning to user:', userId);  // Remove before commit
  updateRack(labId, tankId, rackId, { assignedUserId: userId });
};
```

**Correct patterns:**
```typescript
// ✅ GOOD - No console statements (use proper logging if needed)
const handleAssign = async (userId: string) => {
  updateRack(labId, tankId, rackId, { assignedUserId: userId });
  await saveToServerWithReactQuery();
};

// ✅ GOOD - If debugging needed, use proper error handling
const handleAssign = async (userId: string) => {
  try {
    updateRack(labId, tankId, rackId, { assignedUserId: userId });
    await saveToServerWithReactQuery();
  } catch (error) {
    // Proper error handling instead of console.log
    toast.error('Assignment failed');
    throw error;  // Re-throw for monitoring systems
  }
};
```

### Pre-Implementation Patterns

#### React Query Mutations
**Always use proper async/await patterns:**
```typescript
// ✅ Pattern: Async handler with error handling
const handleAssignRack = async (tankId: string, rackId: string, userId: string | undefined) => {
  try {
    updateRack(currentLab.id, tankId, rackId, {
      assignedUserId: userId,
      customLabel: undefined
    });

    // Always await mutations
    await saveToServerWithReactQuery();

  } catch (error) {
    // Handle errors properly
    toast.error('Failed to update assignment', {
      action: {
        label: 'Retry',
        onClick: () => void handleAssignRack(tankId, rackId, userId)
      }
    });
  }
};
```

#### Backend Repository Calls
**Always await database operations:**
```typescript
// ✅ Pattern: Await all repository operations
async handle(command: UpdateConfigurationCommand): Promise<Configuration> {
  // Await user lookup
  const assignedUser = await this.userRepository.findById(change.userId);
  if (!assignedUser) {
    throw new ValidationError(`User ${change.userId} does not exist`);
  }

  // Await configuration save
  const saved = await this.configurationRepository.save(updatedConfig);

  // Await audit logging
  await this.auditRepository.log({
    userId: currentUser.id,
    action: 'RACK_ASSIGNED',
    details: { rackId, userId }
  });

  return saved;
}
```

#### Event Handlers with Keyboard Support
**Always include proper types and key checks:**
```typescript
// ✅ Pattern: Keyboard event handlers
<div
  role="presentation"
  onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }}
>
```

#### useCallback Dependencies
**Always include ALL referenced variables:**
```typescript
// ✅ Pattern: Complete dependency arrays
const canEditResource = useCallback(
  (resource: RackConfiguration | BoxConfiguration, parentRack?: RackConfiguration): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (resource.assignedUserId === currentUser.id) return true;

    if (parentRack && !resource.assignedUserId && parentRack.assignedUserId === currentUser.id) {
      return true;
    }

    return false;
  },
  [currentUser]  // Include currentUser since it's referenced
);
```

### Validation Steps (Per Phase)

**After completing each implementation phase:**

1. **Run ESLint on modified files:**
   ```bash
   npx eslint path/to/modified/file.ts --max-warnings 0
   ```

2. **Run TypeScript compiler check:**
   ```bash
   npx tsc --noEmit
   ```

3. **Check for console statements:**
   ```bash
   # Should return no results
   npx eslint . --rule 'no-console: error' --ext .ts,.tsx
   ```

4. **Verify no floating promises:**
   ```bash
   # Run ESLint with specific rule
   npx eslint . --rule '@typescript-eslint/no-floating-promises: error' --ext .ts,.tsx
   ```

5. **Before marking todo as complete:**
   - Zero ESLint errors
   - Zero ESLint warnings
   - Zero TypeScript errors
   - No console.log statements
   - All dependencies included in hooks

### Feature-Specific ESLint Considerations

#### Assignment Dropdown Handlers
```typescript
// ✅ Correct: Void wrapper for onChange
<Select
  onChange={(option) => void handleAssignRack(tankId, rackId, option?.value)}
  // ... other props
/>

// OR use async arrow function with explicit catch
<Select
  onChange={(option) => handleAssignRack(tankId, rackId, option?.value).catch(handleError)}
  // ... other props
/>
```

#### Custom Label Modal
```typescript
// ✅ Correct: Proper ARIA labels and keyboard support
<div
  className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
  role="presentation"
  onKeyDown={(e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }}
>
  <div
    className="bg-white rounded-lg p-6 w-96 shadow-xl"
    role="dialog"
    aria-labelledby="label-edit-title"
    aria-modal="true"
  >
    <h3 id="label-edit-title" className="text-lg font-bold">
      Edit Custom Label
    </h3>
    <input
      id="custom-label-input"
      type="text"
      aria-label="Custom label for resource"
      maxLength={50}
      value={label}
      onChange={(e) => setLabel(e.target.value)}
    />
  </div>
</div>
```

#### Backend Validation Code
```typescript
// ✅ Correct: Await all async operations
for (const change of assignmentChanges) {
  if (change.type === 'assign') {
    // Await user lookup
    const assignedUser = await this.userRepository.findById(change.userId);
    if (!assignedUser) {
      throw new ValidationError(`User ${change.userId} does not exist`);
    }

    // Await audit logging
    await this.auditRepository.log({
      userId: currentUser.id,
      action: 'RACK_ASSIGNED',
      details: {
        rackId: change.resourceId,
        userId: change.userId,
        username: assignedUser.username
      },
      timestamp: new Date()
    });
  }
}
```

### Final Pre-Commit Checklist

Before committing any code:

- [ ] Run `npx eslint . --ext .ts,.tsx --max-warnings 0` - Zero errors/warnings
- [ ] Run `npx tsc --noEmit` - Zero TypeScript errors
- [ ] Search for `console.log` in modified files - None found
- [ ] All async operations have `await` or `.catch()`
- [ ] All React hooks have complete dependency arrays
- [ ] All interactive elements have proper ARIA labels
- [ ] All keyboard handlers have proper event types
- [ ] No `any` types used
- [ ] No unused variables (unless prefixed with `_`)

### Automated Checks (Recommended)

Add to `package.json` scripts:
```json
{
  "scripts": {
    "lint:check": "eslint . --ext .ts,.tsx --max-warnings 0",
    "type:check": "tsc --noEmit",
    "pre-commit": "npm run lint:check && npm run type:check"
  }
}
```

Run before marking any phase complete:
```bash
npm run pre-commit
```

---

## Implementation Phases

### Phase 0: Dependencies & Schema ✅ COMPLETED
**Duration:** 0.5 day

**Tasks:**

1. **Install react-select:**
   ```bash
   cd client
   npm install react-select @types/react-select
   ```

2. **Update shared-schemas:**
   - File: `packages/shared-schemas/src/storage/configurationSchemas.ts`
   - Add 4 lines total (2 fields × 2 schemas)
   - Lines to add:
     ```typescript
     // In RackConfigurationSchema:
     assignedUserId: z.string().optional(),
     customLabel: z.string().max(50).optional(),

     // In BoxConfigurationSchema:
     assignedUserId: z.string().optional(),
     customLabel: z.string().max(50).optional(),
     ```

3. **Create display helper:**
   - File: `packages/shared-schemas/src/storage/formatters.ts` (NEW)
   - Add `formatResourceDisplayName()` function (~10 lines)
   - Export from `packages/shared-schemas/src/storage/index.ts`

4. **Update shared-schemas version:**
   ```bash
   cd packages/shared-schemas
   npm version patch
   cd ../..
   npm install
   ```

5. **Build and verify:**
   ```bash
   npm run build
   ```

**Deliverables:**
- ✅ Schema extended with optional fields
- ✅ Display helper function created
- ✅ No type errors
- ✅ Shared schemas version bumped

---

### Phase 1: Backend - Permission & Validation ✅ COMPLETED
**Duration:** 1 day
**Note:** Future-proofed with TODO comments for `user.isActive` checks (when User entity updated). Used `as any` for config types (will be properly typed when Configuration entity updated).

**Tasks:**

1. **Add permission methods to AccessControlService:**
   - File: `server/src/domain/services/AccessControlService.ts`
   - Add 3 methods (~35 lines total):
     - `canAssignResource(user: User): boolean`
     - `canEditResource(user, resource, parentRack?): boolean` (implements cascade)
     - `canBeAssignedResources(user: User): boolean`

2. **Enhance UpdateConfigurationCommandHandler:**
   - File: `server/src/application/commands/ConfigurationCommands.ts`
   - Add validation and cascade enforcement (~110 lines):
     - `detectAssignmentChanges()` helper method
     - Validation logic to check assigned users exist (isActive check TODO'd)
     - **Cascade enforcement logic** (clears cascaded boxes when rack unassigned)
     - `findRack()` helper method
     - `detectLabelChanges()` helper method (~60 lines)
     - **Audit event emission** (~170 lines) - Emits 8 event types
   - Add interface for AssignmentChange type (updated with tankId/rackId/boxId)

3. **Add 8 audit event classes:**
   - File: `server/src/domain/events/ConfigurationEvents.ts`
   - Events: RackAssigned, RackUnassigned, RackReassigned, BoxAssigned, BoxUnassigned, BoxReassigned, RackLabelUpdated, BoxLabelUpdated (~230 lines total)

4. **Enhance User deletion:**
   - File: `server/src/application/services/UserApplicationService.ts`
   - Update `deleteUser()` to check for owned resources (~40 lines)

5. **Enhance User deactivation:**
   - File: `server/src/application/services/UserApplicationService.ts`
   - Document behavior in comments (~15 lines documentation)

**Testing:**
```typescript
// Write unit tests for AccessControlService:
describe('AccessControlService - Assignments', () => {
  describe('canAssignResource', () => {
    it('allows admin to assign resources', () => {
      const admin = createAdminUser();
      expect(service.canAssignResource(admin)).toBe(true);
    });

    it('prevents regular user from assigning resources', () => {
      const user = createRegularUser();
      expect(service.canAssignResource(user)).toBe(false);
    });
  });

  describe('canEditResource - Ownership Cascade', () => {
    it('allows rack owner to edit unassigned box', () => {
      const user = createUser('user-1');
      const rack = createRack({ assignedUserId: 'user-1' });
      const box = createBox({ assignedUserId: undefined }); // Unassigned

      expect(service.canEditResource(user, box, rack)).toBe(true);
    });

    it('prevents rack owner from editing explicitly assigned box', () => {
      const user = createUser('user-1');
      const rack = createRack({ assignedUserId: 'user-1' });
      const box = createBox({ assignedUserId: 'user-2' }); // Assigned to someone else

      expect(service.canEditResource(user, box, rack)).toBe(false);
    });
  });

  describe('canBeAssignedResources', () => {
    it('allows active user to be assigned', () => {
      const user = createUser('user-1', { isActive: true });
      expect(service.canBeAssignedResources(user)).toBe(true);
    });

    it('prevents inactive user from being assigned', () => {
      const user = createUser('user-1', { isActive: false });
      expect(service.canBeAssignedResources(user)).toBe(false);
    });
  });
});
```

**Deliverables:**
- ✅ Permission methods implemented (3 methods, ~45 lines)
- ✅ Validation logic + cascade enforcement (~350 lines total including audit emission)
- ✅ 8 audit event classes (~230 lines)
- ✅ User deletion checks for owned resources (~40 lines)
- ✅ User deactivation documentation (~15 lines)
- ⏸️ Unit tests (deferred to Phase 4 integration testing)
- ✅ No type errors - full build successful

**Actual Code Added:** ~665 lines (vs. planned ~165)
**Reason:** Added comprehensive audit trail (8 event types) not fully detailed in original plan

---

### Phase 2: Frontend - User Query Hook
**Duration:** 0.5 day

**Tasks:**

1. **Create useUsersQuery hook:**
   - File: `client/src/domains/users/hooks/useUsersQuery.ts` (NEW)
   - Implement hook (~15 lines)
   - Reuses existing `AdminService.getUsers()`

2. **Export hook:**
   - File: `client/src/domains/users/index.ts`
   - Add export: `export { useUsersQuery } from './hooks/useUsersQuery';`

3. **Add query keys:**
   - File: `client/src/app/queryKeys.ts`
   - Add users section:
     ```typescript
     users: {
       all: ['users'] as const,
     }
     ```

4. **Test hook:**
   ```typescript
   // Manual test in browser console:
   // Should fetch users and cache for 5 minutes
   ```

**Deliverables:**
- ✅ useUsersQuery hook created
- ✅ Hook exported from domains/users
- ✅ Query keys added
- ✅ Hook tested in browser

---

### Phase 3: Frontend - UI Components & Visual Design
**Duration:** 2 days

**Tasks:**

1. **Day 1: Visual Design System Implementation**

   **File:** `client/src/domains/tubes/ui/components/modals/StorageManagementModal.tsx`

   - Import new dependencies (react-select, formatResourceDisplayName, useUsersQuery)
   - Add state for custom label editing

   - **Implement Badge Components (~40 lines):**
     - `OwnershipBadge` component with three variants:
       - User's owned (icy blue circle with initials, larger for racks)
       - Other users (gray circle with initials)
       - Unassigned (yellow circle with UsersRound icon)
     - Props: `userId`, `isCurrentUser`, `size` (rack vs box)

   - **Add Background Tint Logic (~20 lines):**
     - Helper: `getRowBackground(resource, currentUser, parentRack?)`
     - Returns: `bg-blue-50` (owned), `bg-yellow-50` (unassigned), default (other)

   - **Collapsed Rack Notation (~30 lines):**
     - Helper: `getCollapsedRackLabel(rack, currentUser)`
     - Returns: "you own all boxes" or "you own X boxes" or empty

   - **Visual Key/Legend Footer (~25 lines):**
     - Fixed footer component in modal
     - Shows badge examples with explanations
     - Always visible (sticky positioning)

   - Add helper functions (~50 lines):
     - `getUserInitials(userId)`
     - `canEditResource(resource, parentRack?)`
     - `handleAssignRack(tankId, rackId, userId)`
     - `handleAssignBox(tankId, rackId, boxId, userId)`
     - `handleUpdateCustomLabel(...)`

   - **Update Rack Row (~100 lines):**
     - New layout: Badge → Icon → Name → Dropdown (admin) → Actions
     - Background tint based on ownership
     - Ownership badge (icy blue for owned, gray for others, yellow for unassigned)
     - Collapsed notation showing ownership summary
     - Assignment dropdown (admin only, react-select)
     - Custom label edit button (Tag icon, only if can edit)
     - Trash button (admin only or if owned)

   - **Update Box Row (~90 lines):**
     - Same layout as rack row
     - Background tint based on ownership (cascade-aware)
     - Ownership badge (handles cascade vs explicit assignment)
     - Assignment dropdown (admin only, react-select)
     - Custom label edit button (Tag icon, only if can edit)
     - Trash button (admin only or if owned)

2. **Day 2: Custom Label Modal & Polish**

   - **Add Custom Label Edit Modal (~80 lines):**
     - Generic name display (read-only)
     - Custom label input (max 50 chars)
     - **Character counter** (e.g., "25/50 characters")
     - **Hard cutoff** at 50 characters (cannot type more)
     - Preview of final display name
     - Save/Cancel buttons
     - Keyboard support (Enter to save, Escape to cancel)

   - **Polish Visual Design (~30 lines):**
     - Tooltip improvements for badges (show full username)
     - Loading states for assignment changes
     - Smooth transitions for background tints
     - Badge hover effects

3. **Testing:**
   - Manual UI testing in browser
   - Test as admin user:
     - All resources show assignment dropdowns
     - All backgrounds tint correctly (blue for owned, yellow for unassigned)
     - Visual key/legend visible in footer
   - Test as regular user with assigned resources:
     - NO assignment dropdowns visible
     - Blue tint on owned resources
     - Edit buttons only on owned resources
     - Yellow tint on unassigned/common spaces
   - Test collapsed racks:
     - "you own all boxes" shows when rack owner owns all boxes
     - "you own 2 boxes" shows when user owns some boxes in another user's rack
   - Test visual hierarchy (racks larger than boxes)
   - Test assignment dropdown search
   - Test custom label editing
   - Test unassignment (clears custom label)

**Deliverables:**
- ✅ Visual design system fully implemented
- ✅ Badge components working for all three states (owned, other, unassigned)
- ✅ Background tints working (blue for owned, yellow for unassigned)
- ✅ Collapsed rack notation showing ownership summary
- ✅ Visual key/legend visible in modal footer
- ✅ Assignment dropdowns working (admin only)
- ✅ User initials badges displaying
- ✅ Unassigned icon showing for unassigned resources
- ✅ **Ownership cascade working (rack owner can edit all boxes unless overridden)**
- ✅ Custom label edit button showing for resource owners
- ✅ Custom label modal working
- ✅ Display names showing custom labels correctly
- ✅ All permission checks working

---

### Phase 4: Integration Testing
**Duration:** 0.5 day

**Tasks:**

1. **End-to-end assignment flow:**
   - Admin assigns rack to User A
   - Verify User A sees assignment immediately (real-time)
   - User A adds custom label to rack
   - Verify all users see custom label
   - Admin reassigns rack to User B
   - Verify custom label cleared
   - Verify User A can no longer edit

2. **Ownership cascade flow:**
   - Admin assigns Rack 1 to User A
   - Rack 1 has Box A (no assignedUserId) and Box B (assigned to User B)
   - **Verify User A can edit Box A** (cascade from rack ownership)
   - Verify User A cannot edit Box B (explicit assignment to other user)
   - Verify Box A shows User A's initials with tooltip "Owned by User A"

3. **User lifecycle flow:**
   - Try to assign rack to inactive user → Should fail
   - Assign rack to active user
   - Deactivate user
   - Verify assignment remains but user can't edit custom label
   - Try to delete user → Should fail with helpful message
   - Unassign rack from user
   - Delete user → Should succeed

4. **Multi-user real-time:**
   - Open browser tabs for Admin and User A
   - Admin assigns rack to User A in Tab 1
   - Verify Tab 2 updates immediately (Socket event)
   - User A adds custom label in Tab 2
   - Verify Tab 1 shows custom label immediately

5. **Error handling:**
   - Disconnect network during assignment
   - Verify error notification shows
   - Reconnect network
   - Verify retry works

**Testing Checklist:**
- ✅ Admin can assign/unassign racks
- ✅ Admin can assign/unassign boxes
- ✅ Regular users cannot assign (dropdown not visible)
- ✅ Assigned users can edit their custom labels
- ✅ Unassigned users cannot edit custom labels
- ✅ **Rack ownership cascades to boxes (can edit all boxes unless overridden)**
- ✅ Cannot assign to inactive users
- ✅ Cannot delete users with assigned resources
- ✅ Deactivated users' assignments remain
- ✅ Real-time updates work across clients
- ✅ Display names show correctly: "Box B (Custom Label)"
- ✅ Unassignment clears custom label
- ✅ Search works in assignment dropdown
- ✅ Error messages are helpful

---

### Phase 5: Polish & Edge Cases
**Duration:** 0.5 day

**Tasks:**

1. **UI Polish:**
   - Loading states for assignment dropdown
   - Loading states for custom label save
   - Better error messages
   - Tooltip improvements (show full username on hover)
   - Keyboard navigation for assignment dropdown
   - Mobile responsive (if applicable)

2. **Accessibility:**
   - ARIA labels for assignment dropdowns
   - ARIA labels for initials badges
   - Screen reader announcements for assignments
   - Keyboard-only navigation support

3. **Edge Cases:**
   - Very long usernames in dropdown (truncate)
   - Very long custom labels in display (truncate with tooltip)
   - User with no first/last name (use username initials)
   - User deleted but still referenced in old audit logs (show username from audit)
   - Network timeout during save (retry logic)
   - Stale data (cache invalidation)

4. **Documentation:**
   - Update user guide
   - Update admin guide
   - Add screenshots

**Deliverables:**
- ✅ All polish items complete
- ✅ Accessibility requirements met
- ✅ Edge cases handled
- ✅ Documentation updated

---

### Phase 6: User Assignments View (Admin)
**Duration:** 0.5 day

**Purpose:** Allow admins to quickly view all resources assigned to a specific user without searching through the storage tree.

**Location:** User Management tab in Admin Settings

**Tasks:**

1. **Add Assignments Indicator to User Management Table:**

   **File:** `client/src/domains/admin/ui/components/UserManagementTable.tsx` (or similar)

   - Add column showing resource count (e.g., "3 resources")
   - Or add "View assignments" link in actions column
   - Clicking opens UserAssignmentsModal

   ```typescript
   // New column in user table
   <td className="px-4 py-2">
     {getResourceCount(user.id) > 0 ? (
       <button
         type="button"
         onClick={() => setViewingAssignments(user)}
         className="text-blue-600 hover:underline"
       >
         {getResourceCount(user.id)} resources
       </button>
     ) : (
       <span className="text-gray-400">No assignments</span>
     )}
   </td>
   ```

2. **Create UserAssignmentsModal Component:**

   **File:** `client/src/domains/admin/ui/components/UserAssignmentsModal.tsx` (NEW)

   **Features:**
   - Read-only modal showing filtered tree view
   - Shows only resources owned by the selected user
   - Tree structure: Tank → Rack → Box
   - **Ownership notation:**
     - Owned racks: "Rack 3" (no parenthesis)
     - Boxes in owned rack: Show all boxes under it
     - Boxes in OTHER user's rack: "Rack 2 (owned by Bob Smith)" with only their boxes
   - Empty state if user has no assignments
   - Close button

   **Example structure:**
   ```
   User: Alice Smith

   Tank 1
     └─ Rack 3
        ├─ Box A
        ├─ Box B (Control Samples)
        └─ Box C
     └─ Rack 2 (owned by Bob Jones)
        └─ Box D (T Cell Donors)

   Tank 2
     └─ Rack 5 (My Lab Rack)
        ├─ Box A
        └─ Box B
   ```

3. **Implement Resource Computation Logic:**

   ```typescript
   // Helper to compute user's owned resources
   const getUserAssignedResources = (
     userId: string,
     configuration: Configuration
   ): UserAssignedResources => {
     const ownedRacks: RackWithLocation[] = [];
     const ownedBoxesInOtherRacks: BoxWithLocation[] = [];

     configuration.equipment.tanks.forEach(tank => {
       tank.racks.forEach(rack => {
         // User owns the rack
         if (rack.assignedUserId === userId) {
           ownedRacks.push({
             rack,
             tankId: tank.id,
             tankName: tank.name
           });
         } else {
           // Check if user owns any boxes in this rack
           const ownedBoxes = rack.boxes.filter(box => box.assignedUserId === userId);
           if (ownedBoxes.length > 0) {
             ownedBoxesInOtherRacks.push({
               boxes: ownedBoxes,
               rack,
               rackOwner: rack.assignedUserId
                 ? users.find(u => u.id === rack.assignedUserId)
                 : undefined,
               tankId: tank.id,
               tankName: tank.name
             });
           }
         }
       });
     });

     return { ownedRacks, ownedBoxesInOtherRacks };
   };
   ```

4. **Modal UI Implementation (~100 lines):**

   ```typescript
   export function UserAssignmentsModal({
     user,
     isOpen,
     onClose
   }: UserAssignmentsModalProps) {
     const currentLab = useStorageStore(state => state.getCurrentLab());
     const { data: users = [] } = useUsersQuery();

     const { ownedRacks, ownedBoxesInOtherRacks } = useMemo(
       () => getUserAssignedResources(user.id, currentLab),
       [user.id, currentLab]
     );

     const totalCount = ownedRacks.length +
       ownedRacks.reduce((sum, r) => sum + r.rack.boxes.length, 0) +
       ownedBoxesInOtherRacks.reduce((sum, b) => sum + b.boxes.length, 0);

     return (
       <Modal isOpen={isOpen} onClose={onClose}>
         <div className="p-6 w-[600px]">
           <h2 className="text-xl font-bold mb-4">
             Resource Assignments: {user.username}
           </h2>

           {totalCount === 0 ? (
             <div className="text-gray-500 py-8 text-center">
               No resources assigned to this user
             </div>
           ) : (
             <div className="space-y-4 max-h-[500px] overflow-y-auto">
               {/* Group by tank */}
               {Object.entries(groupByTank(ownedRacks, ownedBoxesInOtherRacks)).map(
                 ([tankName, resources]) => (
                   <div key={tankName}>
                     <h3 className="font-bold text-lg mb-2">{tankName}</h3>

                     {/* Owned racks */}
                     {resources.ownedRacks.map(({ rack }) => (
                       <div key={rack.id} className="ml-4 mb-3">
                         <div className="flex items-center gap-2">
                           <span className="font-medium">
                             {formatResourceDisplayName(rack.name, rack.customLabel)}
                           </span>
                         </div>

                         {/* All boxes in owned rack */}
                         <div className="ml-6 mt-1 space-y-1">
                           {rack.boxes.map(box => (
                             <div key={box.id} className="text-sm text-gray-700">
                               └─ {formatResourceDisplayName(box.name, box.customLabel)}
                             </div>
                           ))}
                         </div>
                       </div>
                     ))}

                     {/* Boxes in other users' racks */}
                     {resources.boxesInOtherRacks.map(({ rack, rackOwner, boxes }) => (
                       <div key={rack.id} className="ml-4 mb-3">
                         <div className="flex items-center gap-2 text-gray-600">
                           <span>
                             {formatResourceDisplayName(rack.name, rack.customLabel)}
                             {rackOwner && (
                               <span className="text-gray-500 italic">
                                 {' '}(owned by {rackOwner.username})
                               </span>
                             )}
                           </span>
                         </div>

                         {/* Only user's boxes */}
                         <div className="ml-6 mt-1 space-y-1">
                           {boxes.map(box => (
                             <div key={box.id} className="text-sm text-gray-700">
                               └─ {formatResourceDisplayName(box.name, box.customLabel)}
                             </div>
                           ))}
                         </div>
                       </div>
                     ))}
                   </div>
                 )
               )}
             </div>
           )}

           <div className="mt-6 flex justify-end">
             <button onClick={onClose} className="btn-secondary">
               Close
             </button>
           </div>
         </div>
       </Modal>
     );
   }
   ```

5. **Update User Management State:**

   ```typescript
   const [viewingAssignments, setViewingAssignments] = useState<User | null>(null);

   // In render:
   {viewingAssignments && (
     <UserAssignmentsModal
       user={viewingAssignments}
       isOpen={true}
       onClose={() => setViewingAssignments(null)}
     />
   )}
   ```

**Testing:**
- Admin clicks "3 resources" link in User Management
- Modal opens showing tree structure
- User owns Rack 3 → Shows "Rack 3" with all boxes
- User owns Box D in Bob's Rack 2 → Shows "Rack 2 (owned by Bob)" with only Box D
- Empty state if no assignments
- Close button works
- Modal scrolls if many assignments

**Deliverables:**
- ✅ Resource count indicator in User Management table
- ✅ UserAssignmentsModal component created
- ✅ Correct ownership notation (parenthesis for other users' racks)
- ✅ Filtered tree view showing only user's resources
- ✅ Empty state handled
- ✅ Modal scrollable for large lists
- ✅ Read-only (no assignment actions)

---

## Testing Strategy

### Unit Tests

#### Backend - AccessControlService
**File:** `server/src/domain/services/AccessControlService.test.ts`

```typescript
describe('AccessControlService - Assignment Permissions', () => {
  let service: AccessControlService;

  beforeEach(() => {
    service = new AccessControlService();
  });

  describe('canAssignResource', () => {
    it('allows admin to assign', () => {
      const admin = User.create({ role: 'admin', ... });
      expect(service.canAssignResource(admin)).toBe(true);
    });

    it('prevents user from assigning', () => {
      const user = User.create({ role: 'user', ... });
      expect(service.canAssignResource(user)).toBe(false);
    });
  });

  describe('canEditResource - Explicit Assignment', () => {
    it('allows admin to edit any resource', () => {
      const admin = User.create({ role: 'admin', ... });
      const rack = { assignedUserId: 'other-user', ... };
      expect(service.canEditResource(admin, rack)).toBe(true);
    });

    it('allows user to edit own assigned resource', () => {
      const user = User.create({ id: 'user-1', role: 'user', ... });
      const rack = { assignedUserId: 'user-1', ... };
      expect(service.canEditResource(user, rack)).toBe(true);
    });

    it('prevents user from editing others assigned resource', () => {
      const user = User.create({ id: 'user-1', role: 'user', ... });
      const rack = { assignedUserId: 'user-2', ... };
      expect(service.canEditResource(user, rack)).toBe(false);
    });
  });

  describe('canEditResource - Ownership Cascade', () => {
    it('allows rack owner to edit box with no explicit assignment', () => {
      const user = User.create({ id: 'user-1', role: 'user', ... });
      const rack = { assignedUserId: 'user-1', ... };
      const box = { assignedUserId: undefined, ... }; // No explicit assignment

      expect(service.canEditResource(user, box, rack)).toBe(true);
    });

    it('prevents rack owner from editing box with explicit assignment to other', () => {
      const user = User.create({ id: 'user-1', role: 'user', ... });
      const rack = { assignedUserId: 'user-1', ... };
      const box = { assignedUserId: 'user-2', ... }; // Explicitly assigned to other

      expect(service.canEditResource(user, box, rack)).toBe(false);
    });

    it('allows explicit box owner to edit even in others rack', () => {
      const user = User.create({ id: 'user-2', role: 'user', ... });
      const rack = { assignedUserId: 'user-1', ... };  // Rack owned by user-1
      const box = { assignedUserId: 'user-2', ... };   // Box assigned to user-2

      expect(service.canEditResource(user, box, rack)).toBe(true);
    });

    it('prevents non-owner from editing box in unassigned rack', () => {
      const user = User.create({ id: 'user-1', role: 'user', ... });
      const rack = { assignedUserId: undefined, ... };
      const box = { assignedUserId: undefined, ... };

      expect(service.canEditResource(user, box, rack)).toBe(false);
    });
  });

  describe('canBeAssignedResources', () => {
    it('allows active user', () => {
      const user = User.create({ isActive: true, ... });
      expect(service.canBeAssignedResources(user)).toBe(true);
    });

    it('prevents inactive user', () => {
      const user = User.create({ isActive: false, ... });
      expect(service.canBeAssignedResources(user)).toBe(false);
    });
  });
});
```

#### Frontend - Helper Functions
**File:** `client/src/domains/tubes/ui/components/modals/StorageManagementModal.test.tsx`

```typescript
describe('StorageManagementModal - Assignment Helpers', () => {
  const users = [
    { id: 'user-1', username: 'alice', firstName: 'Alice', lastName: 'Smith' },
    { id: 'user-2', username: 'bob', firstName: 'Bob', lastName: '' },
    { id: 'user-3', username: 'charlie', firstName: '', lastName: '' },
  ];

  describe('getUserInitials', () => {
    it('returns first + last initial', () => {
      expect(getUserInitials('user-1', users)).toBe('AS');
    });

    it('returns first initial only if no last name', () => {
      expect(getUserInitials('user-2', users)).toBe('B');
    });

    it('returns username initial if no name', () => {
      expect(getUserInitials('user-3', users)).toBe('C');
    });

    it('returns ? for unknown user', () => {
      expect(getUserInitials('unknown', users)).toBe('?');
    });
  });

  describe('canEditResource', () => {
    const admin = { id: 'admin', role: 'admin' };
    const user1 = { id: 'user-1', role: 'user' };
    const user2 = { id: 'user-2', role: 'user' };

    it('allows admin to edit anything', () => {
      const rack = { assignedUserId: 'user-1' };
      expect(canEditResource(admin, rack)).toBe(true);
    });

    it('allows user to edit own rack', () => {
      const rack = { assignedUserId: 'user-1' };
      expect(canEditResource(user1, rack)).toBe(true);
    });

    it('prevents user from editing others rack', () => {
      const rack = { assignedUserId: 'user-2' };
      expect(canEditResource(user1, rack)).toBe(false);
    });

    it('allows rack owner to edit box without explicit assignment', () => {
      const rack = { assignedUserId: 'user-1' };
      const box = { assignedUserId: undefined };
      expect(canEditResource(user1, box, rack)).toBe(true);
    });

    it('prevents rack owner from editing explicitly assigned box', () => {
      const rack = { assignedUserId: 'user-1' };
      const box = { assignedUserId: 'user-2' };
      expect(canEditResource(user1, box, rack)).toBe(false);
    });
  });

  describe('getBoxOwner', () => {
    it('returns explicit box assignment if present', () => {
      const rack = { assignedUserId: 'user-1', ... };
      const box = { assignedUserId: 'user-2', ... }; // Override

      expect(getBoxOwner(box, rack)).toBe('user-2');
    });

    it('returns rack owner if box has no explicit assignment', () => {
      const rack = { assignedUserId: 'user-1', ... };
      const box = { assignedUserId: undefined, ... }; // Cascade

      expect(getBoxOwner(box, rack)).toBe('user-1');
    });

    it('returns undefined if both unassigned', () => {
      const rack = { assignedUserId: undefined, ... };
      const box = { assignedUserId: undefined, ... };

      expect(getBoxOwner(box, rack)).toBeUndefined();
    });
  });
});
```

---

### Integration Tests

**File:** `server/test/integration/assignment.test.ts`

```typescript
describe('Assignment Integration', () => {
  let app: Express;
  let adminToken: string;
  let user1Token: string;
  let user1Id: string;

  beforeAll(async () => {
    // Setup test app and create users
    app = await createTestApp();
    adminToken = await getAdminToken(app);
    const user1Response = await createUser(app, { username: 'user1', role: 'user' });
    user1Id = user1Response.id;
    user1Token = await getUserToken(app, 'user1');
  });

  describe('Assign Rack', () => {
    it('allows admin to assign rack to user', async () => {
      // Get current config
      const configBefore = await getConfiguration(app, adminToken);
      const rack = configBefore.currentLab.equipment.tanks[0].racks[0];

      // Update rack assignment
      rack.assignedUserId = user1Id;

      // Save config
      const response = await saveConfiguration(app, adminToken, configBefore);
      expect(response.status).toBe(200);

      // Verify assignment persisted
      const configAfter = await getConfiguration(app, adminToken);
      const rackAfter = configAfter.currentLab.equipment.tanks[0].racks[0];
      expect(rackAfter.assignedUserId).toBe(user1Id);
    });

    it('prevents assigning to inactive user', async () => {
      // Deactivate user1
      await deactivateUser(app, adminToken, user1Id);

      // Try to assign rack
      const config = await getConfiguration(app, adminToken);
      const rack = config.currentLab.equipment.tanks[0].racks[1];
      rack.assignedUserId = user1Id;

      // Should fail validation
      const response = await saveConfiguration(app, adminToken, config);
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('inactive');
    });
  });

  describe('Custom Label', () => {
    it('allows assigned user to update custom label', async () => {
      // Admin assigns rack to user1
      const config = await getConfiguration(app, adminToken);
      const rack = config.currentLab.equipment.tanks[0].racks[0];
      rack.assignedUserId = user1Id;
      await saveConfiguration(app, adminToken, config);

      // User1 updates custom label
      const configUser = await getConfiguration(app, user1Token);
      const rackUser = configUser.currentLab.equipment.tanks[0].racks[0];
      rackUser.customLabel = 'My Samples';

      const response = await saveConfiguration(app, user1Token, configUser);
      expect(response.status).toBe(200);

      // Verify label persisted
      const configAfter = await getConfiguration(app, adminToken);
      const rackAfter = configAfter.currentLab.equipment.tanks[0].racks[0];
      expect(rackAfter.customLabel).toBe('My Samples');
    });

    it('prevents non-assigned user from updating custom label', async () => {
      const user2Id = (await createUser(app, { username: 'user2', role: 'user' })).id;
      const user2Token = await getUserToken(app, 'user2');

      // Rack is assigned to user1
      const config = await getConfiguration(app, user2Token);
      const rack = config.currentLab.equipment.tanks[0].racks[0];
      expect(rack.assignedUserId).toBe(user1Id);

      // User2 tries to update custom label
      rack.customLabel = 'Hacked Label';

      const response = await saveConfiguration(app, user2Token, config);
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');
    });
  });

  describe('Ownership Cascade', () => {
    it('allows rack owner to edit box without explicit assignment', async () => {
      // Setup: Rack assigned to user1, box has no explicit assignment
      const config = await getConfiguration(app, adminToken);
      const rack = config.currentLab.equipment.tanks[0].racks[0];
      const box = rack.boxes[0];
      rack.assignedUserId = user1Id;
      box.assignedUserId = undefined;  // No explicit assignment - should cascade from rack
      await saveConfiguration(app, adminToken, config);

      // User1 updates custom label on box (cascade ownership from rack)
      const configUser = await getConfiguration(app, user1Token);
      const boxUser = configUser.currentLab.equipment.tanks[0].racks[0].boxes[0];
      boxUser.customLabel = 'My Box';

      const response = await saveConfiguration(app, user1Token, configUser);
      expect(response.status).toBe(200);

      // Verify label persisted
      const configAfter = await getConfiguration(app, adminToken);
      const boxAfter = configAfter.currentLab.equipment.tanks[0].racks[0].boxes[0];
      expect(boxAfter.customLabel).toBe('My Box');
    });
  });

  describe('User Deletion', () => {
    it('prevents deleting user with assigned resources', async () => {
      // Assign rack to user1
      const config = await getConfiguration(app, adminToken);
      const rack = config.currentLab.equipment.tanks[0].racks[0];
      rack.assignedUserId = user1Id;
      await saveConfiguration(app, adminToken, config);

      // Try to delete user1
      const response = await deleteUser(app, adminToken, user1Id);
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('assigned to');
    });

    it('allows deleting user after unassigning', async () => {
      // Unassign all resources
      const config = await getConfiguration(app, adminToken);
      const rack = config.currentLab.equipment.tanks[0].racks[0];
      rack.assignedUserId = undefined;
      rack.customLabel = undefined;
      await saveConfiguration(app, adminToken, config);

      // Delete user1
      const response = await deleteUser(app, adminToken, user1Id);
      expect(response.status).toBe(200);
    });
  });
});
```

---

### E2E Tests (Manual)

**Test Script:**

```markdown
# Assignment System E2E Test Script

## Preconditions
- Two browser tabs open
- Tab 1: Admin user logged in
- Tab 2: Regular user (alice) logged in
- Fresh database with default configuration

## Test 1: Admin Assignment Flow
**Tab 1 (Admin):**
1. Open Storage Management Modal
2. Find Rack 1
3. Click assignment dropdown
4. Select "alice" from dropdown
5. Verify dropdown shows "alice" as selected
6. Close modal

**Tab 2 (Alice):**
7. Verify Rack 1 now shows initials "A" (or "AS" if full name)
8. Verify initials badge is blue (assigned to self)

**Expected:** ✅ Real-time update shows assignment immediately

---

## Test 2: Custom Label Flow
**Tab 2 (Alice):**
1. Find Rack 1 (assigned to alice)
2. Click Tag icon (custom label button)
3. Modal opens
4. Type "T Cell Samples" in custom label input
5. Verify preview shows "Rack 1 (T Cell Samples)"
6. Click Save

**Tab 1 (Admin):**
7. Verify Rack 1 now displays "Rack 1 (T Cell Samples)"

**Expected:** ✅ Custom label appears for all users

---

## Test 3: Ownership Cascade
**Tab 1 (Admin):**
1. Assign Rack 1 to "alice"
2. Verify Rack 1 shows alice's initials
3. Verify Box A in Rack 1 has NO explicit assignment (box.assignedUserId is undefined)
4. Verify Box A shows alice's initials

**Tab 2 (Alice):**
5. Find Box A in Rack 1
6. Verify Tag icon IS visible (alice owns it because she owns the rack)
7. Click Tag icon on Box A
8. Type "Control Samples" in custom label
9. Click Save
10. Verify Box A shows "Box A (Control Samples)"

**Tab 1 (Admin):**
11. Hover over Box A's initials badge
12. Verify tooltip shows "Owned by alice"

**Expected:** ✅ Alice owns all boxes in her rack (cascade)

---

## Test 4: Admin Override of Cascade
**Tab 1 (Admin):**
1. Verify Rack 1 is assigned to "alice"
2. Explicitly assign Box B in Rack 1 to "bob"
3. Verify Box B shows bob's initials

**Tab 2 (Alice):**
4. Verify Box A still shows her initials with tooltip "Owned by alice"
5. Verify Box B shows bob's initials (NOT hers)
6. Verify Tag icon is NOT visible on Box B
7. Verify Edit icon is NOT visible on Box B

**Tab 1 (Admin):**
8. Hover over Box B's initials badge
9. Verify tooltip shows "Owned by bob"

**Expected:** ✅ Explicit box assignment overrides rack ownership

---

## Test 5: Reassignment Clears Label
**Tab 2 (Alice):**
1. Verify Rack 1 shows custom label "T Cell Samples"

**Tab 1 (Admin):**
2. Reassign Rack 1 to "bob"

**Tab 2 (Alice):**
3. Verify Rack 1 custom label is cleared
4. Verify Tag icon is no longer visible on Rack 1

**Expected:** ✅ Reassignment clears custom label

---

## Test 6: Override Cascade Clears Custom Label
**Tab 1 (Admin):**
1. Verify alice owns Rack 1 (all boxes cascade to her)

**Tab 2 (Alice):**
2. Add custom label "Control Samples" to Box A
3. Verify Box A shows "Box A (Control Samples)"
4. Verify tooltip shows "Owned by alice"

**Tab 1 (Admin):**
5. Explicitly assign Box A to "bob" (override cascade)

**Tab 2 (Alice):**
6. Verify Box A custom label is CLEARED
7. Verify Box A shows only "Box A" (no custom label)
8. Verify Tag icon is no longer visible on Box A
9. Verify tooltip shows "Owned by bob"

**Tab 3 (Bob):**
10. Verify Box A Tag icon IS visible (bob can edit)
11. Add custom label "Bob's Box"
12. Verify Box A shows "Box A (Bob's Box)"

**Expected:** ✅ Overriding cascade clears previous owner's custom label

---

## Test 7: Inactive User
**Tab 1 (Admin):**
1. Go to Admin Settings → User Management
2. Deactivate user "bob"
3. Return to Storage Management
4. Click assignment dropdown for Rack 2
5. Verify "bob (Deactivated)" appears in list but is disabled
6. Try to select "bob"
7. Verify selection is prevented

**Expected:** ✅ Cannot assign to inactive users

---

## Test 7: User Deletion Protection
**Tab 1 (Admin):**
1. Verify Rack 1 is assigned to "alice"
2. Go to Admin Settings → User Management
3. Try to delete user "alice"
4. Verify error message appears: "Cannot delete user. They are assigned to X resource(s)"

**Expected:** ✅ Cannot delete user with assignments

---

## Test 8: Search Dropdown
**Tab 1 (Admin):**
1. Open assignment dropdown for any rack
2. Type "ali" in search box
3. Verify only users matching "ali" appear (e.g., "alice")
4. Clear search
5. Verify all active users appear

**Expected:** ✅ Search filters user list

---

## Test 9: Network Failure Recovery
**Tab 1 (Admin):**
1. Open browser DevTools → Network tab
2. Set network to "Offline"
3. Try to assign Rack 3 to "alice"
4. Verify error notification appears
5. Set network to "Online"
6. Retry assignment
7. Verify assignment succeeds

**Expected:** ✅ Graceful error handling and retry

---

## Test 10: Unassignment
**Tab 1 (Admin):**
1. Find Rack 1 (assigned to alice with custom label)
2. Click assignment dropdown
3. Click "Clear" (x icon in react-select)
4. Verify dropdown shows "Unassigned"

**Tab 2 (Alice):**
5. Verify Rack 1 shows UsersRound icon (unassigned)
6. Verify custom label is cleared
7. Verify Tag icon is no longer visible

**Expected:** ✅ Unassignment clears assignment and label
```

---

## Performance Considerations

### User List Query
- **Cache Duration:** 5 minutes
- **Invalidation:** When user created, deleted, or deactivated
- **Large Teams (>200 users):**
  - Current: Loads all users at once
  - Future: Implement server-side search/pagination in `AdminService.getUsers()`
  - Recommendation: Add `?search=` parameter to `/admin/users` endpoint

### Configuration Save
- **Current Behavior:** Saves entire configuration JSON (~10-50KB typical)
- **Network:** Single HTTP request to `/api/configuration`
- **Optimistic Update:** Yes, UI updates immediately
- **Rollback:** On error, Zustand state reverts and cache invalidated

### Real-time Updates
- **Event:** `configuration_updated` (debounced 2 seconds)
- **Payload:** Minimal (just event name, no data)
- **Client Action:** Invalidates cache and refetches
- **Multiple Assignments:** If admin assigns 5 racks rapidly, only 1 refetch occurs after 2 second debounce

---

## Security & Permissions

### Permission Matrix

| Action | Admin | Rack Owner (Cascade) | Box Owner (Explicit Override) | Other User |
|--------|-------|---------------------|------------------------------|------------|
| **Assign rack/box** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Unassign rack/box** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Edit rack custom label** | ✅ Yes | ✅ Yes | N/A | ❌ No |
| **Edit box custom label (cascade)** | ✅ Yes | ✅ Yes | N/A | ❌ No |
| **Edit box custom label (override)** | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Edit generic name** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Edit grid size (cascade)** | ✅ Yes | ✅ Yes | N/A | ❌ No |
| **Edit grid size (override)** | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Delete rack/box** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **View all assignments** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

**Key Rules:**
1. Only admins can assign/unassign
2. Rack ownership cascades to ALL boxes in rack
3. Admin can override cascade by explicitly assigning boxes
4. Explicit box assignment takes precedence over cascade
5. Cannot assign to inactive users

---

### Validation Rules

**Client-side (UI):**
- Assignment dropdown only shows active users
- Tag button only visible if `canEditResource()` returns true
- Grid edit button only visible if `canEditResource()` returns true
- Admin-only features hidden for non-admins

**Server-side (Backend):**
- User exists (`UserRepository.findById()`)
- User is active (`user.isActive === true`)
- Requesting user has permission (`AccessControlService.canAssignResource()` or `canEditResource()`)
- Custom label ≤ 100 characters (enforced by Zod schema)
- Resource exists (validated by configuration structure)

---

## Audit Trail

**Dedicated audit event types for granular tracking:**

| Operation | Action Type | Details Captured | Example Entry |
|-----------|-------------|------------------|---------------|
| Assign Rack | `RACK_ASSIGNED` | `{ rackId, rackName, userId, username }` | "Rack 3 assigned to alice by admin" |
| Unassign Rack | `RACK_UNASSIGNED` | `{ rackId, rackName, previousUserId, previousUsername }` | "Rack 3 unassigned from alice by admin" |
| Assign Box | `BOX_ASSIGNED` | `{ boxId, boxName, rackId, userId, username }` | "Box B assigned to bob by admin" |
| Unassign Box | `BOX_UNASSIGNED` | `{ boxId, boxName, rackId, previousUserId, previousUsername }` | "Box B unassigned from bob by admin" |
| Update Custom Label | `CUSTOM_LABEL_UPDATED` | `{ resourceType, resourceId, resourceName, label, userId }` | "Rack 3 label changed to 'T Cell Samples' by alice" |
| Clear Custom Label | `CUSTOM_LABEL_CLEARED` | `{ resourceType, resourceId, resourceName, previousLabel, userId }` | "Rack 3 label cleared by alice" |

**Implementation:**
```typescript
// In UpdateConfigurationCommandHandler, after detecting assignment changes:
for (const change of assignmentChanges) {
  if (change.type === 'assign' && change.resourceType === 'rack') {
    await this.auditRepository.log({
      userId: currentUser.id,
      action: 'RACK_ASSIGNED',
      details: {
        rackId: change.resourceId,
        rackName: rack.name,
        userId: change.userId,
        username: assignedUser.username
      },
      timestamp: new Date()
    });
  }
  // Similar for BOX_ASSIGNED, RACK_UNASSIGNED, BOX_UNASSIGNED, CUSTOM_LABEL_UPDATED
}
```

**Audit Queries:**
```sql
-- Find all rack assignments
SELECT * FROM audit_log
WHERE action = 'RACK_ASSIGNED'
ORDER BY timestamp DESC;

-- Find all assignments for a specific user
SELECT * FROM audit_log
WHERE action IN ('RACK_ASSIGNED', 'BOX_ASSIGNED')
AND details->>'username' = 'alice'
ORDER BY timestamp DESC;

-- Find who assigned a specific rack
SELECT * FROM audit_log
WHERE action = 'RACK_ASSIGNED'
AND details->>'rackId' = 'rack-1'
ORDER BY timestamp DESC;

-- Find custom label changes for a rack
SELECT * FROM audit_log
WHERE action IN ('CUSTOM_LABEL_UPDATED', 'CUSTOM_LABEL_CLEARED')
AND details->>'resourceType' = 'rack'
AND details->>'resourceId' = 'rack-3'
ORDER BY timestamp DESC;
```

---

## Migration Notes

### Existing Data

**No data migration needed** - New fields are optional:
- Existing racks/boxes without `assignedUserId` → Unassigned (default state)
- Existing racks/boxes without `customLabel` → No custom label (shows generic name only)
- Configuration version automatically incremented on next save
- Old clients will ignore new fields (graceful degradation)

### Rollback Plan

If feature needs to be rolled back:

1. **Frontend:** Remove assignment UI (delete added code in StorageManagementModal)
2. **Backend:** No changes needed (validation doesn't break without UI)
3. **Data:** Assignments remain in JSON (harmless, just unused)
4. **Future rollout:** Re-add UI code, data is already there

---

## User Documentation

### Admin Guide

#### How to assign a rack to a user:
1. Click **Admin** → **Manage Storage**
2. Find the rack you want to assign
3. Click the assignment dropdown (shows "Unassigned" by default)
4. Type to search for user, or scroll to find them
5. Click the user's name
6. Assignment is saved automatically
7. The rack now shows the user's initials in a blue badge

#### How to assign a box to a user:
Same as rack assignment, but use the dropdown next to the specific box.

#### How to unassign a resource:
1. Find the assigned rack/box
2. Click the assignment dropdown
3. Click the **X** (clear button)
4. Assignment is removed and custom label is cleared

#### How cascade works:
- When you assign a rack to a user, they own ALL boxes in that rack automatically
- You can override this by explicitly assigning specific boxes to different users
- Example: Assign Rack 3 to Alice → Alice owns all boxes. Then assign Box B to Bob → Bob owns Box B, Alice owns the rest

#### Things to know:
- **Only active users** can be assigned resources
- If you try to assign to an inactive user, you'll see them marked "(Deactivated)" and cannot select them
- If you try to delete a user with assigned resources, you'll get an error
  - Unassign their resources first, then delete the user
- When you reassign a resource, the custom label is automatically cleared

---

### User Guide

#### How to add a custom label to your rack/box:
1. Click **Admin** → **Manage Storage**
2. Find a rack/box assigned to you (shows your initials in a blue badge)
3. Click the **tag icon** (label button)
4. Enter your custom label (e.g., "T Cell Samples")
5. See the preview: "Rack 1 (T Cell Samples)"
6. Click **Save**
7. Your label appears for everyone, but they also see the generic name

#### How cascade works:
When you're assigned a rack, you automatically own all boxes in it:
1. Find a rack assigned to you (shows your initials)
2. ALL boxes in that rack are yours (unless explicitly assigned to someone else)
3. You'll see your initials on all boxes in your rack
4. You can edit any of these boxes (custom labels, grid size)
5. If a box shows someone else's initials, admin explicitly assigned it to them

#### How to remove your custom label:
1. Click the tag icon on your resource
2. Clear the custom label text
3. Click **Save**
4. Generic name only will show

#### Things to know:
- **You cannot assign resources** - only admins can do that
- Your custom labels are visible to everyone
- Generic names always show so everyone knows where things are
- If your resource is reassigned, your custom label is removed
- If you're deactivated, you keep your assignments but cannot edit labels

---

## Timeline Summary

| Phase | Duration | Code Added | Code Reused | Key Tasks |
|-------|----------|------------|-------------|-----------|
| **Phase 0: Schema** ✅ | 0.5 days | 14 lines | 158 lines | Extend schemas, add display helper |
| **Phase 1: Backend** ✅ | 1 day | **665 lines** | 2,013 lines | Permission methods, validation, cascade enforcement, **8 audit events**, user lifecycle |
| **Phase 2: Frontend Query** | 0.5 days | 15 lines | 100 lines | useUsersQuery hook |
| **Phase 3: UI Components & Visual Design** | 2 days | 345 lines | 994 lines | Visual design system, badges, background tints, assignment dropdowns, custom label modal |
| **Phase 4: Integration** | 0.5 days | 0 lines | - | E2E testing, multi-user flows |
| **Phase 5: Polish** | 0.5 days | ~20 lines | - | Accessibility, edge cases, docs |
| **Phase 6: User Assignments View** | 0.5 days | ~120 lines | 50 lines | UserAssignmentsModal, User Management integration |

**TOTAL:**
- **New Code Written:** ~1,179 lines (updated from 679 due to comprehensive audit trail)
- **Existing Code Reused:** ~3,315 lines
- **Reuse Ratio:** 73.8% (updated from 83.0%)
- **Total Duration:** 5.5-6.5 days

---

## Risk Assessment

### Low Risk Items ✅
- Schema changes (optional fields, backward compatible)
- Reusing existing infrastructure (battle-tested code)
- Permission model (simple, clear rules)
- Audit logging (automatic through existing patterns)

### Medium Risk Items ⚠️
- Ownership cascade logic (needs thorough testing)
- User lifecycle edge cases (deletion, deactivation)
- Concurrent edits (two admins assigning same rack)
- Large user lists (>200 users in dropdown)

### Mitigation Strategies

1. **Ownership Cascade:**
   - Write comprehensive unit tests for all permission combinations
   - Clear UI tooltips showing ownership consistently
   - Document in user guide with examples

2. **User Lifecycle:**
   - Validation prevents assigning to inactive users
   - Clear error messages for user deletion
   - Integration tests cover all scenarios

3. **Concurrent Edits:**
   - Last write wins (acceptable for configuration changes)
   - Version control in repository prevents corruption
   - Real-time updates inform other users of changes

4. **Large User Lists:**
   - react-select provides search/filtering
   - 5-minute cache reduces API calls
   - Future: Add server-side search if needed

---

## Success Criteria

**Feature is complete when:**

### Core Assignment Functionality
✅ Admins can assign/unassign racks and boxes to active users
✅ Cannot assign to inactive users
✅ Assignment dropdowns are **completely hidden** from regular users
✅ Assigned users see blue initials badge on their resources
✅ Unassigned resources show UsersRound icon
✅ Users can add custom labels to explicitly assigned resources
✅ Users can add custom labels to boxes they own (including cascaded ownership from rack)
✅ Display names show: `Generic Name (Custom Label)`

### Permission & Access Control
✅ Permission checks prevent unauthorized edits
✅ Regular users can **only** edit resources they own (custom labels, grid sizes)
✅ Regular users **cannot** see assignment dropdowns or assign resources
✅ Admins can edit any resource (custom labels, generic names, assignments)
✅ Cannot delete users with assigned resources
✅ Deactivated users keep assignments but cannot edit

### Business Rules
✅ Any ownership change clears custom labels (reassignment, unassignment, cascade override)
✅ Ownership cascade works correctly (rack owner owns all boxes unless overridden)
✅ Admin override works (can assign box to different user than rack owner)

### User Management (Phase 6)
✅ User Management table shows resource count for each user
✅ Clicking resource count opens UserAssignmentsModal
✅ Modal shows filtered tree view of user's resources
✅ Correct ownership notation (parenthesis for other users' racks)
✅ Modal is read-only (no assignment actions)

### Integration & Quality
✅ Real-time updates work across multiple clients
✅ Assignment dropdown is searchable
✅ All unit tests passing (permission logic)
✅ All integration tests passing (API flows)
✅ E2E manual test script completed successfully
✅ Zero ESLint errors/warnings
✅ User and admin documentation updated

---

## Conclusion

### Implementation Summary

The Assignment System leverages Odysseus's **clean architecture** to achieve:

- ✅ **83.0% code reuse** - Existing configuration infrastructure handles everything
- ✅ **Zero new services** - UpdateConfigurationCommandHandler processes assignments
- ✅ **Zero new repositories** - JSON storage persists new fields automatically
- ✅ **Zero new endpoints** - Existing `/api/configuration` endpoint works
- ✅ **Zero new mutations** - Existing `useSaveStorageMutation` handles assignments
- ✅ **Auto WebSocket sync** - Existing event system broadcasts updates
- ✅ **Auto audit logging** - Existing repository pattern logs everything
- ✅ **Ownership cascade** - Rack ownership cascades to boxes with admin override capability
- ✅ **Visual design system** - Instant ownership recognition via badges and background tints

**Total new code:** ~679 lines vs ~3,315 lines reused

### Key Technical Decisions

1. **Minimal Service Layer** - Assignment is a configuration change, not a separate domain
2. **Ownership Cascade** - Rack ownership cascades to boxes (simpler than implicit ownership)
3. **Admin Override** - Can explicitly assign boxes to override cascade
4. **Searchable Dropdowns** - Better UX for larger teams (react-select)
5. **User Lifecycle Protection** - Cannot assign to inactive or delete users with resources
6. **Backward Compatible** - Optional schema fields, no migration needed

### What Makes This Work

- **Configuration as JSON** - New fields automatically stored/retrieved
- **Command Pattern** - Single handler validates and processes all config changes
- **Event-Driven** - Changes detected and broadcast automatically
- **Repository Pattern** - Abstraction means infrastructure doesn't change
- **React Query** - Existing mutation and cache invalidation patterns work perfectly

### Next Steps

1. **Review this plan** for consistency and completeness
2. **Start Phase 0** - Extend schemas and add display helper
3. **Implement incrementally** - Test each phase before moving to next
4. **After completion** - Implement Locking System (builds on assignments)

---

**Document Status:** Ready for implementation. All clarifications complete.

**Key Updates (2025-01-19):**
- ✅ Custom labels: 50 chars max with character counter
- ✅ Tooltips: Consistent "Owned by X" (no "via rack" distinction)
- ✅ Unassignment: Confirmation prompt required
- ✅ Error recovery: Dropdown reverts + retry button
- ✅ **Cascade enforcement: Backend handles cascade logic (not frontend)**
- ✅ Unassignment cascade: Preserves explicit assignments to other users
- ✅ **Audit logging: 8 dedicated event types** (RackAssigned, RackUnassigned, RackReassigned, BoxAssigned, BoxUnassigned, BoxReassigned, RackLabelUpdated, BoxLabelUpdated) - IMPLEMENTED in Phase 1
- ✅ Tube ownership: Completely separate from rack/box assignment
- ✅ **Racks AND Boxes implemented together:** Full cascade system with admin override from day one
- ✅ Feature flag: Removed (full release, not flagged)
- ✅ **ESLint Compliance:** Comprehensive section with common errors to avoid, patterns, validation steps
- ✅ **UI/UX Overview by Role:** Clear distinction between admin and regular user views
- ✅ **Visual Design System:** Complete specification for ownership indicators
  - Icy blue badges/tints for user's owned resources
  - Yellow badges/tints for unassigned/common spaces
  - Gray badges for other users' resources
  - Collapsed rack notation showing ownership summary
  - Visual key/legend in modal footer
  - Background tints for entire rows (instant scanability)
- ✅ **Phase 6 - User Assignments View:** Admin can view all resources assigned to each user in User Management
- ✅ **Assignment Location:** Confirmed assignments happen in Storage Management Modal
- ✅ **Regular users see full tree:** Cannot add/remove resources, but see all with visual indicators
- ✅ **Unassigned spaces:** Users can add tubes to common/unassigned spaces but cannot edit config
- ✅ Updated code estimates: ~1,179 lines new code (Phase 0-1 complete: 679 lines), 73.8% reuse ratio, 5.5-6.5 days total

**Last Updated:** 2025-01-19 (Phase 0-1 completed)
