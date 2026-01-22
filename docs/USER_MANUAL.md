# Odysseus User Manual

A guide to using the Odysseus Liquid Nitrogen Tube Inventory Management System.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Managing Tubes](#3-managing-tubes)
4. [Searching & Filtering](#4-searching--filtering)
5. [Tube Locking](#5-tube-locking)
6. [Storage Navigation](#6-storage-navigation)
7. [Researcher Profiles](#7-researcher-profiles)
8. [User Settings](#8-user-settings)
9. [Admin Features](#9-admin-features)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Getting Started

### 1.1 First-Time Access

When you first access Odysseus, you'll see either:
- **Login screen** - If the system is already set up
- **Admin registration** - If this is a fresh installation (first user becomes administrator)

### 1.2 Creating an Account

1. Click **Register** on the login screen
2. Fill in your details:
   - **First Name / Last Name** - Your name as it should appear
   - **Username** - Automatically generated from your name (shown as preview)
   - **Email** - Your work email address
   - **Department** - Your department (optional)
   - **Position** - Your job title or role (optional)
   - **Password** - Must meet security requirements (shown on screen)
   - **Confirm Password** - Re-enter your password to confirm
3. The **"I am a researcher"** toggle is on by default. Turn it off if you won't be assigned tubes.
4. Click **Create Account**
5. Wait for an administrator to approve your account

### 1.3 Logging In

1. Enter your **username or email** and **password**
2. Click **Sign In**
3. You'll be taken to the main dashboard

### 1.4 Resetting Your Password

If you forget your password:
1. Click **Forgot Password?** on the login screen
2. You'll be instructed to contact your administrator
3. Your admin will give you a temporary password
4. Enter the new temporary password at login screen
5. You will be directed to a new screen requiring you to create a new password and be logged in immediately after

---

## 2. Dashboard Overview

The main dashboard is divided into four main areas:

### 2.1 Header Bar

From left to right:
- **Odysseus Logo** - Application branding on the far left
- **Action Toolbar** - Appears when positions are selected, showing context-sensitive buttons:
  - Add/Edit, Copy, Cut, Paste, Lock, Unlock, Share, Remove, Clear
- **Online Users** - Badges showing who else is currently using the system
- **Search Bar** - Quick search for tubes (see [Section 4](#4-searching--filtering))
- **Hamburger Menu** (three-line icon) - Opens a dropdown with:
  - Lab name
  - Your username
  - **Settings** - Open user settings
  - **Storage Manager** - Configure tanks, racks, and boxes
  - **Admin Settings** - Admin panel (only visible to administrators)
  - **Logout** - Sign out of the application

### 2.2 Connection Status

A floating indicator appears at the bottom of the screen:
- **Green** - Connected to real-time updates
- **Red/Yellow** - Connection lost or reconnecting

### 2.3 Navigation Panel

Located on the left side:
- **Header**: "Navigator"
- **Storage Tree** - Hierarchical view of Tanks → Racks → Boxes
- Click any box to load its grid in the main area
- Icons indicate ownership (your initials for assigned spaces, common icon for shared spaces)

### 2.4 Main Grid

The center area showing the current box:
- **Location Breadcrumb** - Shows current Tank • Rack • Box at the top
- **Space Indicator** - Shows "View Only" (if assigned to another user) or "Unassigned/Common" (shared space)
- **Position Grid** - Visual representation of the box layout
  - Empty positions appear lighter
  - Occupied positions show tube indicators
  - Locked tubes display a lock icon

### 2.5 Info Panel

Located on the right side:
- **Header**: "Tube Information"
- **Tube Details** - When a tube is selected, displays all its information (location, sample details, researcher, dates, lock status, notes)

---

## 3. Managing Tubes

### 3.1 Creating a New Tube

**Single tube:**
1. Navigate to the desired box using the storage tree
   - Note that you can only add, edit, delete, copy, cut, or otherwise use tubes in resources that either assigned directly to you or are unassigned/common
   - These specific resources will be assigned to you by your administrator and will have icons and indicator displaying your initials or common space badges
2. Click on an **empty position** in the grid
3. The tube editor opens with the location pre-filled
4. Fill in the tube details:
   - **Cell Type** - What kind of sample this is? (e.g. Human T cells, Jurkat, Mouse PBMCs)
   - **Internal ID** - If applicable, donor ID assigned with an internal tracking number
   - **Source ID** - If applicable, donor ID assigned by original source (e.g. Stanford #XXXXX)
   - **Researcher** - Who froze down this sample?
         - This is different than who *OWNS* the tube or has *LOCKED* it
   - **Concentration** - Value and unit (e.g. 1e6 cells per vial (c/v) or 1e8 cells per mL (c/mL))
   - **Media** - Media type, supplements and selection agents the cells were cultured in or will require for culturing
   - **Lot #** - Lot number assigned for quality control and tracking
   - **Condition** - If applicable, specific condition the cells were grown in (e.g. Standard incubator, 10% O2-5PSI)
   - **Collection Date** - When the sample was collected (frozen down)
   - **Notes** - Any additional information
5. Click **Add Tube**

**Multiple tubes at once:**
1. Hold **Ctrl** and click multiple empty positions, or
2. Click one position, then **Shift+click** another to select a range
3. Click **Add** in the toolbar
4. Fill in the common details (all tubes will share these values)
5. Click **Add X Tubes** (where X is the number of positions selected)

### 3.2 Viewing Tube Information

1. Click on any occupied position in the grid
2. The info panel on the right shows:
   - Location (Tank / Rack / Box / Position)
   - Sample details
   - Researcher name
   - Dates (collected)
   - Lock status (if locked)
   - Notes

### 3.3 Editing a Tube

1. Click on the tube you want to edit
2. Click the **Edit** button in the toolbar (or double-click the tube)
3. Modify the fields you want to change
4. Click **Update Tube**

**Note:** If someone else edits the same tube while you're working on it, you'll see a warning banner. You can either refresh to load their changes (losing your edits) or continue editing and save your version (overwriting their changes).

### 3.4 Moving a Tube

**Using the editor:**
1. Use the **cut** function using the buttons or keyboard shortcuts
2. **Paste** at your desired location
   - **Note** that some function will not work if you are accessing resources not assigned to your or ones that are locked by another user

### 3.5 Removing a Tube

1. Select the tube(s) you want to remove
2. Click the **Remove** button in the toolbar (or press the **Delete** key)
3. Confirm the removal in the dialog

**Warning:** Removal cannot be undone. The action is recorded in the audit log.

### 3.6 Bulk Operations

**Editing multiple tubes:**
1. Select multiple tubes (Ctrl+click or Shift+click)
2. Click **Edit** in the toolbar
3. The "Edit X Tubes" modal opens
4. Change the fields you want to update for all selected tubes
5. Click **Update X Tubes**

**Removing multiple tubes:**
1. Select multiple tubes
2. Click **Remove** in the toolbar (or press the **Delete** key)
3. Confirm the bulk removal

### 3.7 Copy, Cut, and Paste

**Copying tubes (duplicates):**
1. Select one or more tubes
2. Click **Copy** in the toolbar (or press **Ctrl+C**)
3. Navigate to the destination location
4. Select the target position(s)
5. Click **Paste** (or press **Ctrl+V**)
6. The tubes are duplicated to the new positions

**Moving tubes (cut and paste):**
1. Select one or more tubes
2. Click **Cut** in the toolbar (or press **Ctrl+X**)
3. Navigate to the destination location
4. Select the target position(s)
5. Click **Paste** (or press **Ctrl+V**)
6. The tubes are moved (removed from original positions)

### 3.8 Keyboard Shortcuts

The grid supports these keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| **Arrow keys** | Navigate between positions |
| **Shift + Arrow** | Extend selection in that direction |
| **Space** | Toggle selection on focused position |
| **Enter** | Open Add/Edit modal for selection |
| **Ctrl + A** | Select all positions |
| **Ctrl + C** | Copy selected tubes |
| **Ctrl + X** | Cut selected tubes |
| **Ctrl + V** | Paste tubes |
| **Delete** | Remove selected tubes |
| **Escape** | Clear selection and clipboard |
| **Shift + L** | Toggle lock/unlock on selected tubes |
| **Shift + S** | Share access to locked tubes |

---

## 4. Searching & Filtering

### 4.1 Quick Search

1. Click the **search box** in the header (or press **Ctrl+F**)
2. Type your search term (cell type, researcher name, donor ID, lot number, etc.)
3. Results appear automatically as you type
4. Click a result to navigate to that tube's location

### 4.2 Filtering Results

1. Click the **filter icon** (sliders) next to the search box
2. The filter panel opens with collapsible sections:

**Location filters:**
- **Tanks** - Filter by specific tanks
- **Racks** - Filter by specific racks
- **Boxes** - Filter by specific boxes

**Sample filters:**
- **Cell Types** - Filter by cell type
- **Lot Numbers** - Filter by lot number
- **Donor Internal IDs** - Filter by internal donor ID
- **Donor Source IDs** - Filter by source donor ID
- **Culture Conditions** - Filter by culture condition

**Researcher filter:**
- Select one or more researchers

**Date Range filter:**
- **From** - Start date
- **To** - End date

3. Click filter chips to toggle them on/off
4. Results update automatically as you change filters
5. Active filters appear at the bottom of the filter panel
6. Click **Clear All** to remove all filters

### 4.3 Sorting Results

1. Click the **Sort** dropdown at the top of the results
2. Choose a sort field:
   - Location
   - Date
   - Cell Type
   - Researcher
   - Lot Number
3. Toggle ascending/descending order

### 4.4 Exporting Search Results

After performing a search:
1. Review your search results
2. Click the **Export** button in the results header
3. A CSV file downloads with all matching tube data

---

## 5. Tube Locking

Locking prevents other users from modifying a tube. Use this for samples that shouldn't be changed.

### 5.1 Locking Tubes

1. Select the tube(s) you want to lock
2. Click **Lock** in the toolbar
3. Optionally enter a **lock note** explaining why (e.g., "Project X - Donor 123")
4. Click **Lock X Tube(s)**

Locked tubes display a **lock icon** in the grid.

### 5.2 Viewing Lock Information

1. Click on a locked tube
2. The info panel shows:
   - **Who locked it** - "Locked by you" or "Locked by [name]"
   - **Lock note** - Displayed as a chip (if one was added)
   - **Shared users** - Shows who has been granted access (if any)

### 5.3 Editing Locked Tubes

Only the person who locked the tube (or someone with shared access) can edit it:
1. Click the locked tube
2. Edit as normal
3. Save your changes

If you don't have access, you'll see a red banner indicating who locked the tube.

### 5.4 Sharing Lock Access

To allow specific users to edit your locked tubes:
1. Select your locked tube(s)
2. Click **Share** in the toolbar
3. Check the boxes next to the user(s) to grant access to
4. Click **Share with X User(s)**

Those users can now edit the tube while it remains locked to others.

### 5.5 Revoking Access

1. Select your locked tube(s)
2. Click **Share** in the toolbar
3. In the "Currently Shared With" section, click the **X** next to the user's name
4. Access is revoked immediately

### 5.6 Editing Lock Notes

1. Click on your locked tube to view it in the info panel
2. Click the **lock note chip** (or "Add note" if no note exists)
3. Update the note in the modal
4. Click **Save** (or **Update X Tubes** for multiple tubes)

### 5.7 Unlocking Tubes

1. Select your locked tube(s)
2. Click **Unlock** in the toolbar
3. The tubes are unlocked immediately (no confirmation needed)

The tube is now editable by anyone with permission.

---

## 6. Storage Navigation

### 6.1 Understanding the Hierarchy

Storage is organized in four levels:
```
Tank (e.g., "LN2 Tank A")
  └── Rack (e.g., "Rack 1")
        └── Box (e.g., "Box A")
              └── Position (e.g., "A1", "B3", "H12")
```

### 6.2 Using the Storage Tree

The left panel shows your storage hierarchy:
1. Click a **Tank** to expand it
2. Click a **Rack** to see its boxes
3. Click a **Box** to view its grid in the main area

### 6.3 Position Labels

Positions can be displayed as:
- **Alphanumeric** - A1, A2, B1, B2... (row letter + column number)
- **Numeric** - 1, 2, 3, 4... (sequential numbers)

The format is set per box by administrators.
**Note** that users can have preferential settings for **Alphanumeric** or **Numeric** by accessing the **Display Tab** in the **User Settings**

### 6.4 Grid Sizes

Boxes can have different grid sizes:
- **81-well** (9×9) - Square format
- **Other sizes** (10x10, 5x5, etc.) - Configured by administrators

---

## 7. Researcher Profiles

### 7.1 What Are Researchers?

Researchers are profiles that can be assigned as tube owners. A researcher might be:
- A lab member with a user account
- An external collaborator without system access
- A legacy record from historical samples

### 7.2 Assigning Researchers to Tubes

When creating or editing a tube:
1. Find the **Researcher** dropdown
2. Select the researcher who owns/created this sample
3. Only **active** researchers appear in the dropdown

---

## 8. User Settings

### 8.1 Accessing Settings

1. Click the **hamburger menu** in the upper right corner of the dashboard
2. Select **Settings**

### 8.2 Account Tab

Update your personal information:
- **First Name / Last Name** - Your display name
- **Email** - Your email address
- **Department** - Your department (optional)
- **Position** - Your job title or role (optional)

To save changes, you must enter your current password to confirm.

### 8.3 Security Tab

**Changing Your Password:**
1. Enter your **current password**
2. Enter your **new password** (must meet requirements shown)
3. Confirm the new password
4. Click **Change Password**

**Managing Active Sessions:**

View and manage your login sessions across all devices:
1. See all your active sessions (device, location, last used time)
2. Click **Logout** on any session you want to terminate
3. This is useful if you forgot to log out somewhere or see suspicious activity

### 8.4 Display Tab

Customize how the application appears to you:

**Theme:**
- **Light** - Bright appearance
- **Dark** - Reduced brightness for low-light environments
- **System** - Automatically matches your operating system's theme setting

**Position Display Format:**
- **Numeric** - Sequential numbers (1, 2, 3... 81)
- **Alphanumeric** - Row letter + column number (A1, B2... I9)
- **System Default** - Uses the default alphanumeric format

This is your personal preference and won't affect how other users see positions.

---

## 9. Admin Features

These features are only available to administrators.

### 9.1 Accessing the Admin Panel

1. Click the **Admin Settings** button in the header (only visible to admins)
2. The admin panel opens with several tabs

### 9.2 User Management

Located in the **Users** tab.

**Viewing users:**
- See all users, their roles, and status (approved/pending)

**Approving new users:**
1. Pending users appear at the top of the list
2. Click **Approve** to grant access, or **Reject** to deny

**Changing user roles:**
1. Find the user in the table
2. Use the **Role dropdown** in their row
3. Select **Admin** or **User** from the dropdown

**Resetting a user's password:**
1. Find the user
2. Click the **key icon** (Reset Password)
3. Generate a temporary password and submit it
4. The user must change it on next login

**Deleting users:**
1. Find the user
2. Click the **trash icon** (Delete)
3. Confirm deletion

**Linking users to researchers:**
1. Find the user without a linked researcher
2. Click the **link icon**
3. Either create a new researcher or select an existing one

### 9.3 Researcher Management

Located in the **Researchers** tab.

**Viewing researchers:**
- See all researchers with their tube counts and linked user status
- Status indicators show: Active, Pending (linked user not approved), or Unlinked

**Creating researchers:**
1. Click **Add Researcher**
2. Fill in name and details (first name, last name, email, department, position)
3. Click **Create**

**Linking/Unlinking researchers:**
- This is done from the **Users** tab (see Section 9.2)
- Link a user to a researcher using the link icon in the Users table
- Unlink by clicking the unlink icon next to a linked user

**Deleting researchers:**
- Researchers can only be deleted if they meet **both** conditions:
  1. They are **not linked** to any user account
  2. They have **no tubes** assigned to them in the inventory
- If eligible, click the **trash icon** next to the researcher
- If a researcher has tubes or is linked to a user, they cannot be deleted

### 9.4 Storage Configuration

**Managing tanks:**
1. Open **Storage Manager**
2. Click **Add Tank** to create new
3. Click a tank to edit or delete

**Managing racks:**
1. Select a tank
2. Click **Add Rack**
3. Or click an existing rack to edit/delete

**Managing boxes:**
1. Select a rack
2. Click **Add Box**
3. Configure the grid size and position format
4. Or click an existing box to edit/delete

**Assigning resources to users:**
- Assign specific racks or boxes to users to control who can create tubes in those locations
1. Select the rack or box
2. Click **Assign**
3. Select the user(s)

### 9.5 Security Settings

Configure system security:
- **Password requirements** - Minimum length, special characters, etc.
- **Session timeout** - How long until inactive users are logged out
- **Rate limiting** - Protection against abuse

### 9.6 Audit Logs

Located in the **Monitoring** tab.

View a record of all changes in the system:
1. Open the **Monitoring** tab
2. Click the **filter icon** to open filter options
3. Filter by:
   - **Username** - Filter by specific user
   - **Actions** - Filter by action type (created, updated, deleted, locked, etc.)
   - **Entity Types** - Filter by entity (tube, user, researcher, tank, rack, box)
   - **Date Range** - Filter by time period (presets available: Today, Last 7 days, etc.)
4. View the audit log table with action details
5. Toggle **Include Archive** to search older archived logs

### 9.7 Data Export

Located in the **System** tab under "Data Export".

Export data for backup or analysis:
1. Open the **System** tab
2. Find the **Data Export** section
3. Select what to export from the dropdown:
   - **Tube Inventory** - All tubes with researcher names
   - **Users** - User accounts (excludes passwords)
   - **Researchers** - All researchers with tube counts
   - **System Backup** - Configuration and settings (JSON only)
4. Choose format: **CSV** or **JSON** (System Backup is always JSON)
5. Click **Export**

---

## 10. Troubleshooting

### 10.1 "Session Expired" Message

Your login session has timed out due to inactivity.
- **Solution:** Log in again

### 10.2 Session Timeout Warning

A countdown appears warning your session will expire.
- Click **Stay Logged In** to extend your session
- Or let it expire and log in again when needed

### 10.3 "Modified by Another User" Warning

Someone else edited the same tube while you were working on it. A warning banner appears with two options:
- **Refresh**: Load the latest data from the server (your unsaved changes will be lost)
- **Continue Editing**: Keep your current changes and overwrite the other user's changes when you save

### 10.4 "Position Occupied" Error

You tried to create or move a tube to a position that already has one.
- **Solution:** Choose a different position, or delete/move the existing tube first

### 10.5 "Locked by [User]" Message

You tried to edit a tube that someone else has locked.
- **Solution:** Contact the person who locked it to request access or have them unlock it

### 10.6 Cannot See a Tube/Box/Rack

You may not have permission to access that storage location.
- **Solution:** Contact an administrator to grant you access

### 10.7 Connection Lost (Red Indicator)

You've lost connection to the server.
- **Causes:** Network issues, server maintenance
- **Solution:**
  1. Check your internet connection
  2. Wait a moment - the system will try to reconnect automatically
  3. If it persists, refresh the page

### 10.8 Changes Not Appearing

Other users' changes aren't showing up.
- **Solution:**
  1. Check the connection indicator (should be green)
  2. Refresh the page to get the latest data

### 10.9 Account Pending Approval

You registered but can't log in yet.
- **Solution:** Wait for an administrator to approve your account, or contact them directly

---

## Quick Reference

### Mouse Selection

| Action | How |
|--------|-----|
| Select single position | Click |
| Select multiple positions | Ctrl + Click |
| Select range | Click, then Shift + Click |

### Keyboard Shortcuts

See [Section 3.8](#38-keyboard-shortcuts) for the full list of grid keyboard shortcuts.

| Shortcut | Action |
|----------|--------|
| Ctrl + C | Copy |
| Ctrl + X | Cut |
| Ctrl + V | Paste |
| Delete | Remove tubes |
| Ctrl + A | Select all |
| Escape | Clear selection |
| Enter | Open modal |

### Position Format Examples

| Format | Example Positions |
|--------|-------------------|
| Alphanumeric | A1, A2, A3... B1, B2, B3... |
| Numeric | 1, 2, 3, 4, 5... |

### User Roles

| Role | Can Do |
|------|--------|
| User | Create/edit/delete own tubes, search, lock tubes |
| Admin | Everything above + manage users, researchers, storage, security |

---

*Document version: 1.0*
*Last updated: January 2026*
