# Odysseus Bug Bash Test Plan

This document provides structured test cases for bug bash testing. Each section covers a specific area of the application with step-by-step test scenarios.

---

## How to Use This Document

1. **Assign sections** to different testers to maximize coverage
2. **Mark results** next to each test: Pass / Fail / Blocked
3. **Document issues** with screenshots and steps to reproduce
4. **Note environment** (browser, screen size, dark/light mode)

**Recommended browsers**: Chrome, Firefox, Edge, Safari

---

## Table of Contents

1. [Authentication & Sessions](#1-authentication--sessions)
2. [Tube Management](#2-tube-management)
3. [Grid & Position Operations](#3-grid--position-operations)
4. [Storage Configuration](#4-storage-configuration)
5. [Search Functionality](#5-search-functionality)
6. [Admin Panel](#6-admin-panel)
7. [Real-Time Features](#7-real-time-features)
8. [Error Handling](#8-error-handling)
9. [Edge Cases & Data Validation](#9-edge-cases--data-validation)
10. [Accessibility & UI](#10-accessibility--ui)

---

## 1. Authentication & Sessions

### 1.1 First-Time Setup

| #     | Test Case           | Steps                               | Expected Result                                     | Status |
| ----- | ------------------- | ----------------------------------- | --------------------------------------------------- | ------ |
| 1.1.1 | Fresh install setup | 1. Clear database 2. Launch app     | Should show admin registration form, not login      |        |
| 1.1.2 | Create first admin  | 1. Fill registration form 2. Submit | Should auto-approve as admin, redirect to dashboard |        |
| 1.1.3 | First admin login   | 1. Log out 2. Log back in           | Should work without approval needed                 |        |

### 1.2 User Registration

| #     | Test Case                    | Steps                                                                       | Expected Result                                | Status |
| ----- | ---------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------- | ------ |
| 1.2.1 | Standard registration        | 1. Click "Register" 2. Fill form 3. Submit                                  | Should show "pending approval" message         |        |
| 1.2.2 | Registration with researcher | 1. Register 2. Check "Create researcher profile" 3. Fill researcher details | Should create linked researcher profile        |        |
| 1.2.3 | Duplicate email              | 1. Register with existing email                                             | Should show error "email already exists"       |        |
| 1.2.4 | Weak password                | 1. Try password "123456"                                                    | Should show password strength requirements     |        |
| 1.2.5 | Email verification           | 1. Register 2. Check email 3. Click verification link                       | Should verify email and update status          |        |
| 1.2.6 | Resend verification          | 1. Click "Resend verification" multiple times quickly                       | Should show cooldown message after first click |        |

### 1.3 Login & Logout

| #     | Test Case               | Steps                                  | Expected Result                                                  | Status |
| ----- | ----------------------- | -------------------------------------- | ---------------------------------------------------------------- | ------ |
| 1.3.1 | Valid login             | 1. Enter correct credentials 2. Submit | Should redirect to dashboard                                     |        |
| 1.3.2 | Invalid password        | 1. Enter wrong password 2. Submit      | Should show "invalid credentials" error                          |        |
| 1.3.3 | Non-existent user       | 1. Enter non-existent username         | Should show generic "invalid credentials" (not "user not found") |        |
| 1.3.4 | Unapproved user login   | 1. Login as pending user               | Should show "account pending approval" message                   |        |
| 1.3.5 | Logout                  | 1. Click logout button                 | Should clear session, redirect to login                          |        |
| 1.3.6 | Logout during operation | 1. Start a long operation 2. Logout    | Should cancel operation and logout cleanly                       |        |

### 1.4 Password Reset

| #     | Test Case             | Steps                                                                                      | Expected Result                                       | Status |
| ----- | --------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------ |
| 1.4.1 | Forgot password flow  | 1. Click "Forgot password" 2. Enter email 3. Check email 4. Click link 5. Set new password | Should allow login with new password                  |        |
| 1.4.2 | Expired reset link    | 1. Request reset 2. Wait for token expiry 3. Click link                                    | Should show "link expired" message                    |        |
| 1.4.3 | Invalid reset link    | 1. Modify reset link URL                                                                   | Should show "invalid link" error                      |        |
| 1.4.4 | Force password change | 1. Admin resets user password 2. User logs in                                              | Should prompt to change password before accessing app |        |

### 1.5 Session Timeout

| #     | Test Case               | Steps                                                         | Expected Result                                          | Status |
| ----- | ----------------------- | ------------------------------------------------------------- | -------------------------------------------------------- | ------ |
| 1.5.1 | Timeout warning appears | 1. Stay idle until warning threshold                          | Should show countdown modal with "Stay Logged In" button |        |
| 1.5.2 | Stay logged in          | 1. Wait for warning 2. Click "Stay Logged In"                 | Should extend session, close warning                     |        |
| 1.5.3 | Let timeout expire      | 1. Wait for warning 2. Do nothing                             | Should auto-logout when timer reaches zero               |        |
| 1.5.4 | Activity resets timeout | 1. Perform actions in the app                                 | Should reset idle timer                                  |        |
| 1.5.5 | Multi-tab logout sync   | 1. Open 2 tabs 2. Logout in tab 1 3. Click something in tab 2 | Tab 2 should detect logout and redirect to login         |        |

---

## 2. Tube Management

### 2.1 Create Tubes

| #     | Test Case                   | Steps                                                          | Expected Result                           | Status |
| ----- | --------------------------- | -------------------------------------------------------------- | ----------------------------------------- | ------ |
| 2.1.1 | Create single tube          | 1. Click empty position 2. Fill tube form 3. Submit            | Tube appears in grid at selected position |        |
| 2.1.2 | Create with all fields      | 1. Fill every field including optional ones                    | All data saved and displayed correctly    |        |
| 2.1.3 | Create multiple tubes       | 1. Select multiple empty positions 2. Open editor 3. Fill form | Creates tube at each position             |        |
| 2.1.4 | Create with researcher      | 1. Create tube 2. Assign researcher                            | Researcher name displays on tube info     |        |
| 2.1.5 | Create at occupied position | 1. Try to create at position with existing tube                | Should show overwrite confirmation        |        |
| 2.1.6 | Cancel creation             | 1. Open tube editor 2. Fill form 3. Click Cancel               | Modal closes, no tube created             |        |

### 2.2 Edit Tubes

| #     | Test Case                     | Steps                                                          | Expected Result                        | Status |
| ----- | ----------------------------- | -------------------------------------------------------------- | -------------------------------------- | ------ |
| 2.2.1 | Edit single tube              | 1. Click existing tube 2. Modify fields 3. Save                | Changes saved and displayed            |        |
| 2.2.2 | Edit concentration            | 1. Change concentration value and unit                         | New value and unit display correctly   |        |
| 2.2.3 | Change researcher             | 1. Edit tube 2. Select different researcher                    | New researcher assigned                |        |
| 2.2.4 | Clear optional fields         | 1. Edit tube 2. Clear notes field 3. Save                      | Field cleared successfully             |        |
| 2.2.5 | Edit locked tube (owner)      | 1. Lock a tube 2. Edit it as lock owner                        | Should allow editing                   |        |
| 2.2.6 | Edit locked tube (other user) | 1. User A locks tube 2. User B tries to edit                   | Should show "locked by [user]" message |        |
| 2.2.7 | Concurrent edit conflict      | 1. User A opens tube 2. User B edits and saves 3. User A saves | User A should see conflict error       |        |

### 2.3 Delete Tubes

| #     | Test Case                  | Steps                                              | Expected Result            | Status |
| ----- | -------------------------- | -------------------------------------------------- | -------------------------- | ------ |
| 2.3.1 | Delete single tube         | 1. Select tube 2. Click delete 3. Confirm          | Tube removed from grid     |        |
| 2.3.2 | Delete multiple tubes      | 1. Select several tubes 2. Click delete 3. Confirm | All selected tubes removed |        |
| 2.3.3 | Delete locked tube (owner) | 1. Lock tube 2. Try to delete as owner             | Should allow deletion      |        |
| 2.3.4 | Delete locked tube (other) | 1. User A locks tube 2. User B tries delete        | Should be prevented        |        |
| 2.3.5 | Cancel delete              | 1. Select tube 2. Click delete 3. Cancel           | Tube remains               |        |

### 2.4 Move Tubes

| #     | Test Case                 | Steps                                       | Expected Result                    | Status |
| ----- | ------------------------- | ------------------------------------------- | ---------------------------------- | ------ |
| 2.4.1 | Move to empty position    | 1. Select tube 2. Move to empty position    | Tube moves, old position empty     |        |
| 2.4.2 | Move to occupied position | 1. Select tube 2. Move to occupied position | Should show overwrite confirmation |        |
| 2.4.3 | Move to different box     | 1. Select tube 2. Change box in editor      | Tube moves to new box              |        |
| 2.4.4 | Move to different rack    | 1. Select tube 2. Change rack/box in editor | Tube moves to new location         |        |
| 2.4.5 | Bulk move                 | 1. Select multiple tubes 2. Move all        | All tubes relocated                |        |

### 2.5 Tube Locking

| #     | Test Case           | Steps                                          | Expected Result                    | Status |
| ----- | ------------------- | ---------------------------------------------- | ---------------------------------- | ------ |
| 2.5.1 | Lock single tube    | 1. Select tube 2. Click lock 3. Add note       | Lock indicator appears, note saved |        |
| 2.5.2 | Lock multiple tubes | 1. Select several tubes 2. Lock all            | All tubes locked with indicator    |        |
| 2.5.3 | Unlock tube         | 1. Select locked tube 2. Unlock                | Lock removed, tube editable        |        |
| 2.5.4 | Share lock access   | 1. Lock tube 2. Share access with another user | Other user can edit                |        |
| 2.5.5 | Revoke lock access  | 1. Share access 2. Revoke it                   | User can no longer edit            |        |
| 2.5.6 | Edit lock note      | 1. Lock tube with note 2. Edit the note        | Note updates correctly             |        |
| 2.5.7 | View lock info      | 1. Click locked tube                           | Shows who locked, when, and note   |        |

### 2.6 Copy & Paste Tubes

| #     | Test Case           | Steps                                                        | Expected Result                   | Status |
| ----- | ------------------- | ------------------------------------------------------------ | --------------------------------- | ------ |
| 2.6.1 | Copy single tube    | 1. Select tube 2. Copy 3. Select position 4. Paste           | Duplicate created at new position |        |
| 2.6.2 | Copy multiple tubes | 1. Select several tubes 2. Copy 3. Select positions 4. Paste | Duplicates created                |        |
| 2.6.3 | Paste over existing | 1. Copy tube 2. Paste on occupied position                   | Should ask to overwrite           |        |

---

## 3. Grid & Position Operations

### 3.1 Grid Display

| #     | Test Case               | Steps                                                     | Expected Result                           | Status |
| ----- | ----------------------- | --------------------------------------------------------- | ----------------------------------------- | ------ |
| 3.1.1 | Grid renders correctly  | 1. Navigate to box with tubes                             | Grid shows with correct row/column layout |        |
| 3.1.2 | Position labels         | 1. View grid                                              | Row/column labels match box configuration |        |
| 3.1.3 | Numeric vs alpha labels | 1. Check box with numeric setting 2. Check box with alpha | Labels display according to setting       |        |
| 3.1.4 | Occupied positions      | 1. View grid with tubes                                   | Occupied positions show tube indicator    |        |
| 3.1.5 | Empty positions         | 1. View grid                                              | Empty positions clearly distinguishable   |        |
| 3.1.6 | Locked tube indicators  | 1. View grid with locked tubes                            | Lock icons visible on locked tubes        |        |

### 3.2 Position Selection

| #     | Test Case                  | Steps                                         | Expected Result                 | Status |
| ----- | -------------------------- | --------------------------------------------- | ------------------------------- | ------ |
| 3.2.1 | Single position select     | 1. Click single position                      | Position highlights as selected |        |
| 3.2.2 | Multi-select (Ctrl+click)  | 1. Ctrl+click multiple positions              | All clicked positions selected  |        |
| 3.2.3 | Range select (Shift+click) | 1. Click position A 2. Shift+click position B | Rectangular range selected      |        |
| 3.2.4 | Deselect position          | 1. Select position 2. Click elsewhere         | Selection cleared               |        |
| 3.2.5 | Select all empty           | 1. Use "select all empty" if available        | All empty positions selected    |        |

### 3.3 Grid Navigation

| #     | Test Case       | Steps                                  | Expected Result                   | Status |
| ----- | --------------- | -------------------------------------- | --------------------------------- | ------ |
| 3.3.1 | Navigate tanks  | 1. Select different tank from dropdown | Shows racks for that tank         |        |
| 3.3.2 | Navigate racks  | 1. Select different rack               | Shows boxes for that rack         |        |
| 3.3.3 | Navigate boxes  | 1. Select different box                | Grid updates to show box contents |        |
| 3.3.4 | Deep navigation | 1. Navigate Tank > Rack > Box          | Each level loads correctly        |        |

---

## 4. Storage Configuration

### 4.1 Tank Management

| #     | Test Case                | Steps                                               | Expected Result                  | Status |
| ----- | ------------------------ | --------------------------------------------------- | -------------------------------- | ------ |
| 4.1.1 | Create tank              | 1. Open storage manager 2. Add tank 3. Fill details | Tank appears in list             |        |
| 4.1.2 | Edit tank                | 1. Select tank 2. Edit name 3. Save                 | Name updates                     |        |
| 4.1.3 | Delete empty tank        | 1. Select tank with no racks 2. Delete              | Tank removed                     |        |
| 4.1.4 | Delete tank with content | 1. Try to delete tank with racks                    | Should warn about cascade delete |        |

### 4.2 Rack Management

| #     | Test Case              | Steps                                     | Expected Result           | Status |
| ----- | ---------------------- | ----------------------------------------- | ------------------------- | ------ |
| 4.2.1 | Create rack            | 1. Select tank 2. Add rack                | Rack appears under tank   |        |
| 4.2.2 | Edit rack              | 1. Select rack 2. Edit properties 3. Save | Changes saved             |        |
| 4.2.3 | Delete empty rack      | 1. Delete rack with no boxes              | Rack removed              |        |
| 4.2.4 | Delete rack with boxes | 1. Try to delete rack with boxes          | Should warn about cascade |        |
| 4.2.5 | Assign rack to user    | 1. Select rack 2. Assign to user          | User can access rack      |        |
| 4.2.6 | Unassign rack          | 1. Remove user assignment                 | User loses access         |        |

### 4.3 Box Management

| #     | Test Case             | Steps                                      | Expected Result                             | Status |
| ----- | --------------------- | ------------------------------------------ | ------------------------------------------- | ------ |
| 4.3.1 | Create box            | 1. Select rack 2. Add box 3. Set grid size | Box created with grid                       |        |
| 4.3.2 | Edit box name         | 1. Edit box name                           | Name updates everywhere                     |        |
| 4.3.3 | Change box grid type  | 1. Change grid from 96 to 384 well         | Grid resizes (warning about existing tubes) |        |
| 4.3.4 | Delete empty box      | 1. Delete box with no tubes                | Box removed                                 |        |
| 4.3.5 | Delete box with tubes | 1. Try to delete box with tubes            | Should warn about tube deletion             |        |
| 4.3.6 | Set custom label      | 1. Edit box 2. Set custom label            | Custom label displays                       |        |
| 4.3.7 | Set position format   | 1. Change numeric/alpha setting            | Position labels update                      |        |
| 4.3.8 | Assign box to user    | 1. Assign box to specific user             | User can access box                         |        |

### 4.4 Bulk Operations

| #     | Test Case          | Steps                                                   | Expected Result    | Status |
| ----- | ------------------ | ------------------------------------------------------- | ------------------ | ------ |
| 4.4.1 | Add multiple racks | 1. Add 5 racks at once                                  | All 5 created      |        |
| 4.4.2 | Add multiple boxes | 1. Add 10 boxes at once                                 | All 10 created     |        |
| 4.4.3 | Bulk reassign      | 1. Select "Reassign resources" 2. Move from user A to B | Resources transfer |        |

---

## 5. Search Functionality

### 5.1 Quick Search

| #     | Test Case                 | Steps                          | Expected Result            | Status |
| ----- | ------------------------- | ------------------------------ | -------------------------- | ------ |
| 5.1.1 | Search by researcher name | 1. Type researcher name        | Matching tubes appear      |        |
| 5.1.2 | Search by sample type     | 1. Type sample type            | Matching tubes appear      |        |
| 5.1.3 | Search by notes content   | 1. Search for text in notes    | Matching tubes appear      |        |
| 5.1.4 | No results                | 1. Search for nonexistent term | Shows "no results" message |        |
| 5.1.5 | Clear search              | 1. Search 2. Clear search box  | Returns to normal view     |        |

### 5.2 Advanced Search

| #     | Test Case               | Steps                            | Expected Result                 | Status |
| ----- | ----------------------- | -------------------------------- | ------------------------------- | ------ |
| 5.2.1 | Filter by date range    | 1. Set date from and to          | Only tubes in range shown       |        |
| 5.2.2 | Filter by concentration | 1. Set concentration range       | Matching tubes shown            |        |
| 5.2.3 | Filter by location      | 1. Select specific tank/rack/box | Only tubes in location shown    |        |
| 5.2.4 | Multiple filters        | 1. Set researcher + date + type  | Intersection of filters shown   |        |
| 5.2.5 | Save search             | 1. Configure search 2. Save it   | Search appears in saved list    |        |
| 5.2.6 | Load saved search       | 1. Click saved search            | Filters restored, results shown |        |
| 5.2.7 | Delete saved search     | 1. Delete saved search           | Removed from list               |        |

### 5.3 Search Edge Cases

| #     | Test Case             | Steps                        | Expected Result                        | Status |
| ----- | --------------------- | ---------------------------- | -------------------------------------- | ------ |
| 5.3.1 | Special characters    | 1. Search for "<script>"     | No XSS, shows as text                  |        |
| 5.3.2 | Empty search          | 1. Submit empty search       | Shows all results or error             |        |
| 5.3.3 | Very long search      | 1. Paste 500+ characters     | Handles gracefully (truncate or error) |        |
| 5.3.4 | Search during loading | 1. Search while data loading | Either waits or shows loading state    |        |

---

## 6. Admin Panel

### 6.1 User Management

| #     | Test Case                  | Steps                                  | Expected Result                                    | Status |
| ----- | -------------------------- | -------------------------------------- | -------------------------------------------------- | ------ |
| 6.1.1 | View all users             | 1. Open admin panel 2. Go to Users tab | List of all users displays                         |        |
| 6.1.2 | Approve pending user       | 1. Find pending user 2. Approve        | User status changes to approved                    |        |
| 6.1.3 | Reject pending user        | 1. Find pending user 2. Reject         | User removed or marked rejected                    |        |
| 6.1.4 | Change user role           | 1. Select user 2. Change role to admin | User has admin privileges                          |        |
| 6.1.5 | Reset user password        | 1. Select user 2. Reset password       | Temp password generated, user must change on login |        |
| 6.1.6 | Delete user                | 1. Select user 2. Delete 3. Confirm    | User removed                                       |        |
| 6.1.7 | Delete user with resources | 1. Delete user who owns resources      | Resources should be unassigned                     |        |
| 6.1.8 | Link user to researcher    | 1. Select user 2. Link to researcher   | Researcher profile linked                          |        |
| 6.1.9 | Unlink researcher          | 1. Unlink researcher from user         | Link removed, both remain                          |        |

### 6.2 Researcher Management

| #     | Test Case                    | Steps                                  | Expected Result                         | Status |
| ----- | ---------------------------- | -------------------------------------- | --------------------------------------- | ------ |
| 6.2.1 | View all researchers         | 1. Go to Researchers tab               | List displays with tube counts          |        |
| 6.2.2 | Create researcher            | 1. Click Add 2. Fill form              | Researcher created                      |        |
| 6.2.3 | Edit researcher              | 1. Select researcher 2. Edit 3. Save   | Changes saved                           |        |
| 6.2.4 | Deactivate researcher        | 1. Deactivate researcher               | Marked inactive, not shown in dropdowns |        |
| 6.2.5 | Reactivate researcher        | 1. Reactivate inactive researcher      | Available again                         |        |
| 6.2.6 | Delete researcher no tubes   | 1. Delete researcher with 0 tubes      | Deleted successfully                    |        |
| 6.2.7 | Delete researcher with tubes | 1. Try to delete researcher with tubes | Should be prevented or warn             |        |

### 6.3 Security Settings

| #     | Test Case                    | Steps                           | Expected Result                 | Status |
| ----- | ---------------------------- | ------------------------------- | ------------------------------- | ------ |
| 6.3.1 | View security config         | 1. Go to Security tab           | Current settings display        |        |
| 6.3.2 | Change password requirements | 1. Update min length 2. Save    | New users must meet requirement |        |
| 6.3.3 | Change session timeout       | 1. Update timeout value 2. Save | Sessions expire at new interval |        |
| 6.3.4 | Rate limiting settings       | 1. View rate limit config       | Settings display correctly      |        |

### 6.4 Audit Logs

| #     | Test Case             | Steps                                      | Expected Result              | Status |
| ----- | --------------------- | ------------------------------------------ | ---------------------------- | ------ |
| 6.4.1 | View audit log        | 1. Open audit log viewer                   | Recent actions display       |        |
| 6.4.2 | Filter by entity type | 1. Filter to "tube" events                 | Only tube events shown       |        |
| 6.4.3 | Filter by user        | 1. Filter by specific user                 | Only that user's actions     |        |
| 6.4.4 | Filter by date range  | 1. Set date range                          | Events within range shown    |        |
| 6.4.5 | View entity history   | 1. Click "View history" on specific entity | Full history for that entity |        |
| 6.4.6 | Export audit log      | 1. Click export                            | Downloads as CSV/JSON        |        |

### 6.5 Data Export

| #     | Test Case            | Steps                                         | Expected Result                    | Status |
| ----- | -------------------- | --------------------------------------------- | ---------------------------------- | ------ |
| 6.5.1 | Export tubes to CSV  | 1. Go to export 2. Select tubes 3. Export CSV | Downloads valid CSV                |        |
| 6.5.2 | Export tubes to JSON | 1. Export tubes as JSON                       | Downloads valid JSON               |        |
| 6.5.3 | Export users         | 1. Export user list                           | Downloads user data (no passwords) |        |
| 6.5.4 | Export researchers   | 1. Export researcher data                     | Downloads researcher list          |        |

---

## 7. Real-Time Features

### 7.1 Socket Connection

| #     | Test Case                     | Steps                                      | Expected Result                      | Status |
| ----- | ----------------------------- | ------------------------------------------ | ------------------------------------ | ------ |
| 7.1.1 | Initial connection            | 1. Load app                                | Connection indicator shows connected |        |
| 7.1.2 | Reconnection after disconnect | 1. Disconnect network 2. Reconnect         | Auto-reconnects within ~30 seconds   |        |
| 7.1.3 | Long disconnection            | 1. Disconnect for > 2 minutes 2. Reconnect | Should prompt to refresh             |        |

### 7.2 Presence

| #     | Test Case         | Steps                                 | Expected Result                               | Status |
| ----- | ----------------- | ------------------------------------- | --------------------------------------------- | ------ |
| 7.2.1 | User comes online | 1. User A logged in 2. User B logs in | User A sees User B online                     |        |
| 7.2.2 | User goes offline | 1. User B logs out                    | User A sees User B disappear from online list |        |
| 7.2.3 | View online users | 1. Check online users indicator       | Shows list of currently online users          |        |

### 7.3 Live Updates

| #     | Test Case                  | Steps                                             | Expected Result              | Status |
| ----- | -------------------------- | ------------------------------------------------- | ---------------------------- | ------ |
| 7.3.1 | Tube created by other user | 1. User A creates tube 2. User B viewing same box | User B sees new tube appear  |        |
| 7.3.2 | Tube edited by other user  | 1. User A edits tube 2. User B viewing same tube  | User B sees updates          |        |
| 7.3.3 | Tube deleted by other user | 1. User A deletes tube 2. User B viewing          | Tube disappears for User B   |        |
| 7.3.4 | Config change broadcast    | 1. Admin changes storage config                   | All users see updated config |        |
| 7.3.5 | Lock status change         | 1. User A locks tube                              | User B sees lock indicator   |        |

---

## 8. Error Handling

### 8.1 Network Errors

| #     | Test Case              | Steps                                    | Expected Result                    | Status |
| ----- | ---------------------- | ---------------------------------------- | ---------------------------------- | ------ |
| 8.1.1 | Request during offline | 1. Go offline 2. Try to create tube      | Shows "offline" error message      |        |
| 8.1.2 | Request timeout        | 1. Simulate slow network 2. Make request | Shows timeout error after delay    |        |
| 8.1.3 | Server error (500)     | 1. Trigger server error                  | Shows generic error, doesn't crash |        |

### 8.2 Validation Errors

| #     | Test Case              | Steps                                              | Expected Result                   | Status |
| ----- | ---------------------- | -------------------------------------------------- | --------------------------------- | ------ |
| 8.2.1 | Required field missing | 1. Leave required field empty 2. Submit            | Field error shown, submit blocked |        |
| 8.2.2 | Invalid format         | 1. Enter invalid email format                      | Validation error displays         |        |
| 8.2.3 | Server validation fail | 1. Submit data that passes client but fails server | Server error shown clearly        |        |

### 8.3 Conflict Errors

| #     | Test Case              | Steps                                                | Expected Result                  | Status |
| ----- | ---------------------- | ---------------------------------------------------- | -------------------------------- | ------ |
| 8.3.1 | Version conflict (409) | 1. Edit tube 2. Have another user edit same 3. Save  | Shows "modified by another user" |        |
| 8.3.2 | Position occupied      | 1. Try to create at occupied position                | Shows who occupies position      |        |
| 8.3.3 | Resource deleted       | 1. View tube 2. Other user deletes it 3. Try to edit | Shows "not found" or similar     |        |

### 8.4 Permission Errors

| #     | Test Case                | Steps                                            | Expected Result        | Status |
| ----- | ------------------------ | ------------------------------------------------ | ---------------------- | ------ |
| 8.4.1 | Unauthorized (401)       | 1. Token expires 2. Make request                 | Redirects to login     |        |
| 8.4.2 | Forbidden (403)          | 1. Non-admin accesses admin route                | Shows "access denied"  |        |
| 8.4.3 | Edit unassigned resource | 1. Try to edit resource you don't have access to | Shows permission error |        |

---

## 9. Edge Cases & Data Validation

### 9.1 Input Validation

| #     | Test Case                   | Steps                                | Expected Result                         | Status |
| ----- | --------------------------- | ------------------------------------ | --------------------------------------- | ------ |
| 9.1.1 | Special characters in names | 1. Create tube with name "Test <>&'" | Stored and displayed safely             |        |
| 9.1.2 | Unicode characters          | 1. Enter Japanese/Chinese characters | Handles correctly                       |        |
| 9.1.3 | Very long text              | 1. Enter 1000+ characters in notes   | Truncates or shows error                |        |
| 9.1.4 | Negative concentration      | 1. Enter -5 for concentration        | Should be rejected                      |        |
| 9.1.5 | Zero concentration          | 1. Enter 0 for concentration         | Should be allowed or rejected per rules |        |
| 9.1.6 | Future date                 | 1. Enter date in 2030                | Depends on business rules               |        |
| 9.1.7 | Empty strings               | 1. Try to save with just spaces      | Should trim and validate                |        |

### 9.2 Boundary Cases

| #     | Test Case             | Steps                                       | Expected Result        | Status |
| ----- | --------------------- | ------------------------------------------- | ---------------------- | ------ |
| 9.2.1 | Maximum grid position | 1. Access position at grid edge (e.g., H12) | Works correctly        |        |
| 9.2.2 | First grid position   | 1. Access position A1                       | Works correctly        |        |
| 9.2.3 | Large bulk operation  | 1. Select 100+ tubes 2. Bulk edit           | Handles or shows limit |        |
| 9.2.4 | Many concurrent users | 1. Have 10+ users working simultaneously    | System remains stable  |        |

### 9.3 State Consistency

| #     | Test Case                | Steps                                  | Expected Result                     | Status |
| ----- | ------------------------ | -------------------------------------- | ----------------------------------- | ------ |
| 9.3.1 | Refresh during operation | 1. Start creating tube 2. Refresh page | State resets cleanly                |        |
| 9.3.2 | Back button              | 1. Navigate to details 2. Press back   | Returns to previous state           |        |
| 9.3.3 | Unsaved changes warning  | 1. Edit form 2. Try to navigate away   | Warns about unsaved changes         |        |
| 9.3.4 | Multiple modals          | 1. Open modal 2. Try to open another   | Either prevents or handles properly |        |

---

## 10. Accessibility & UI

### 10.1 Keyboard Navigation

| #      | Test Case             | Steps                           | Expected Result               | Status |
| ------ | --------------------- | ------------------------------- | ----------------------------- | ------ |
| 10.1.1 | Tab through form      | 1. Tab through all form fields  | All inputs focusable in order |        |
| 10.1.2 | Enter to submit       | 1. Fill form 2. Press Enter     | Form submits                  |        |
| 10.1.3 | Escape to close modal | 1. Open modal 2. Press Escape   | Modal closes                  |        |
| 10.1.4 | Focus trap in modal   | 1. Open modal 2. Tab repeatedly | Focus stays within modal      |        |

### 10.2 Visual Design

| #      | Test Case              | Steps                           | Expected Result                         | Status |
| ------ | ---------------------- | ------------------------------- | --------------------------------------- | ------ |
| 10.2.1 | Light mode appearance  | 1. View app in light mode       | All elements visible and readable       |        |
| 10.2.2 | Dark mode appearance   | 1. Switch to dark mode          | All elements have proper contrast       |        |
| 10.2.3 | Error state visibility | 1. Trigger validation error     | Error clearly visible (red/highlighted) |        |
| 10.2.4 | Loading states         | 1. Trigger data loading         | Spinner or skeleton shows               |        |
| 10.2.5 | Success feedback       | 1. Complete action successfully | Toast or message confirms               |        |

### 10.3 Responsive Design

| #      | Test Case        | Steps                   | Expected Result                       | Status |
| ------ | ---------------- | ----------------------- | ------------------------------------- | ------ |
| 10.3.1 | Desktop (1920px) | 1. View at 1920px width | Layout correct                        |        |
| 10.3.2 | Laptop (1366px)  | 1. View at 1366px width | Layout adapts                         |        |
| 10.3.3 | Tablet (768px)   | 1. View at 768px width  | Layout adapts, all usable             |        |
| 10.3.4 | Mobile (375px)   | 1. View at 375px width  | Layout adapts or shows desktop prompt |        |

### 10.4 Modal Behavior

| #      | Test Case                    | Steps                           | Expected Result             | Status |
| ------ | ---------------------------- | ------------------------------- | --------------------------- | ------ |
| 10.4.1 | Modal opens with animation   | 1. Open any modal               | Smooth fade/slide animation |        |
| 10.4.2 | Modal closes with animation  | 1. Close modal                  | Smooth exit animation       |        |
| 10.4.3 | Backdrop click closes        | 1. Click outside modal          | Modal closes (if allowed)   |        |
| 10.4.4 | Modal scroll on long content | 1. Open modal with long content | Modal scrolls internally    |        |

---

## Bug Report Template

When logging bugs, use this format:

```
**Bug ID**: [Generated or assigned]
**Severity**: Critical / High / Medium / Low
**Test Case**: [Reference number from above]

**Summary**: [One line description]

**Steps to Reproduce**:
1.
2.
3.

**Expected Result**:
**Actual Result**:

**Environment**:
- Browser:
- Screen size:
- Theme (Light/Dark):
- User role:

**Screenshots/Video**: [Attach if applicable]

**Additional Notes**:
```

---

## Tester Assignment

| Section                         | Assigned To | Status |
| ------------------------------- | ----------- | ------ |
| 1. Authentication & Sessions    |             |        |
| 2. Tube Management              |             |        |
| 3. Grid & Position Operations   |             |        |
| 4. Storage Configuration        |             |        |
| 5. Search Functionality         |             |        |
| 6. Admin Panel                  |             |        |
| 7. Real-Time Features           |             |        |
| 8. Error Handling               |             |        |
| 9. Edge Cases & Data Validation |             |        |
| 10. Accessibility & UI          |             |        |

---

## Sign-Off

| Date | Total Tests | Passed | Failed | Blocked | Notes |
| ---- | ----------- | ------ | ------ | ------- | ----- |
|      |             |        |        |         |       |

---

_Document created: January 2026_
_Version: 1.0_
