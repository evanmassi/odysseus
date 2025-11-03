# Researcher Management Admin Migration - Implementation Plan

**Date:** 2025-01-25
**Status:** Planning Phase
**Objective:** Move researcher management to admin-only control and add safe deletion for orphaned profiles

---

## Executive Summary

This plan migrates researcher management from a general user feature to an admin-only function while adding capability to safely delete orphaned researcher profiles (zero tubes, no linked user). This consolidates all administrative functions in one location and prevents duplicate researcher profiles.

---

## Architecture Overview

### Current State
- **Frontend:** `ResearcherManagementModal` accessible to ALL users via hamburger menu
- **Backend:** Researcher endpoints have no admin-only restrictions
- **Problem:** Users can create/edit/delete researchers, risking data integrity
- **Risk:** Duplicate researchers when users rejoin company (toggle researcher creation ON accidentally)

### Target State
- **Frontend:** Researcher management as tab in `AdminSettingsModal` (admin-only)
- **Backend:** Admin-only endpoints with safe deletion validation
- **Benefit:** Centralized admin control, orphaned profile cleanup, data integrity

---

## Phase 1: Backend - Admin Researcher Deletion (Clean Architecture)

### 1.1 Shared Schemas (`packages/shared-schemas`)

#### File: `packages/shared-schemas/src/researchers/researcherSchemas.ts`

**Add Extended Researcher Type:**
```typescript
// Admin view of researcher with metadata
export const adminResearcherSchema = researcherSchema.extend({
  tubeCount: z.number().int().min(0),
  linkedUserId: z.string().nullable(), // User currently linked to this researcher
  linkedUsername: z.string().nullable(), // Username for display
});

export type AdminResearcher = z.infer<typeof adminResearcherSchema>;
```

**Add Response Schema:**
```typescript
export const adminResearchersResponseSchema = z.object({
  success: z.boolean(),
  researchers: z.array(adminResearcherSchema),
});

export type AdminResearchersResponse = z.infer<typeof adminResearchersResponseSchema>;
```

**Rebuild Package:**
```bash
cd packages/shared-schemas
npm run build
```

---

### 1.2 Domain Layer (`server/src/domain`)

#### No Changes Required
- Researcher entity already exists
- Repository interfaces already support queries
- Domain services don't need modification

---

### 1.3 Application Layer (`server/src/application`)

#### File: `server/src/application/services/ResearcherApplicationService.ts`

**Add Method: Get Researchers with Metadata (Admin View)**
```typescript
/**
 * Get all researchers with admin metadata (tube counts, linked users)
 * Admin-only: includes sensitive relationship data
 */
async getResearchersWithMetadata(adminApiKey: string): Promise<AdminResearcher[]> {
  const admin = await this.getUserByApiKey(adminApiKey);
  this.accessControlService.requireAdmin(admin);

  const researchers = await this.researcherRepository.findAll();
  const users = await this.userRepository.findAll();

  // Build metadata for each researcher
  return Promise.all(
    researchers.map(async (researcher) => {
      const tubeCount = await this.tubeRepository.countByResearcher(researcher.id);
      const linkedUser = users.find(u => u.researcherId === researcher.id);

      return {
        ...researcher.toDTO(),
        tubeCount,
        linkedUserId: linkedUser?.id ?? null,
        linkedUsername: linkedUser?.username ?? null,
      };
    })
  );
}
```

**Add Method: Safe Delete Researcher**
```typescript
/**
 * Delete researcher if safe (no tubes, no linked user)
 * Prevents accidental deletion of researchers with historical data
 */
async deleteResearcher(researcherId: string, adminApiKey: string): Promise<void> {
  const admin = await this.getUserByApiKey(adminApiKey);
  this.accessControlService.requireAdmin(admin);

  const researcher = await this.researcherRepository.findById(researcherId);
  if (!researcher) {
    throw new NotFoundError(`Researcher not found: ${researcherId}`);
  }

  // Safety check: researcher must have zero tubes
  const tubeCount = await this.tubeRepository.countByResearcher(researcherId);
  if (tubeCount > 0) {
    throw new ValidationError(
      'Cannot delete researcher with existing tubes',
      { researcherId, tubeCount }
    );
  }

  // Safety check: researcher must not be linked to any user
  const linkedUser = await this.userRepository.findByResearcherId(researcherId);
  if (linkedUser) {
    throw new ValidationError(
      'Cannot delete researcher linked to user account',
      { researcherId, userId: linkedUser.id, username: linkedUser.username }
    );
  }

  // Safe to delete - no tubes, no user link
  await this.researcherRepository.delete(researcherId);
}
```

---

### 1.4 Infrastructure Layer (`server/src/infrastructure`)

#### File: `server/src/infrastructure/repositories/SQLiteTubeRepository.ts`

**Add Method: Count Tubes by Researcher**
```typescript
async countByResearcher(researcherId: string): Promise<number> {
  const row = await this.db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM tubes WHERE researcherId = ?`,
    [researcherId]
  );
  return row?.count ?? 0;
}
```

#### File: `server/src/infrastructure/repositories/SQLiteUserRepository.ts`

**Add Method: Find User by Researcher ID**
```typescript
async findByResearcherId(researcherId: string): Promise<User | null> {
  const row = await this.db.get<UserRow>(
    `SELECT * FROM users WHERE researcherId = ?`,
    [researcherId]
  );
  return row ? User.fromPersistence(row) : null;
}
```

---

### 1.5 Presentation Layer (`server/src/presentation`)

#### File: `server/src/presentation/controllers/AuthController.ts`

**Add Handler: Get Researchers with Metadata**
```typescript
async getResearchersWithMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startTime = Date.now();
    const adminApiKey = req.user?.apiKey;

    if (!adminApiKey) {
      throw new PermissionError('Authentication required');
    }

    const researchers = await this.researcherApplicationService.getResearchersWithMetadata(adminApiKey);

    const response = ResponseBuilder.withTiming(startTime, {
      success: true,
      researchers
    });

    res.status(200).json(response);

    logger.info('Retrieved researchers with metadata', {
      count: researchers.length,
      requestedBy: req.user?.username
    });
  } catch (error) {
    next(error);
  }
}
```

**Add Handler: Delete Researcher**
```typescript
async deleteResearcher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startTime = Date.now();
    const { researcherId } = req.params;
    const adminApiKey = req.user?.apiKey;

    if (!adminApiKey) {
      throw new PermissionError('Authentication required');
    }

    await this.researcherApplicationService.deleteResearcher(researcherId, adminApiKey);

    const response = ResponseBuilder.withTiming(startTime, {
      success: true,
      message: 'Researcher deleted successfully'
    });

    res.status(200).json(response);

    logger.info('Researcher deleted', {
      researcherId,
      deletedBy: req.user?.username
    });
  } catch (error) {
    next(error);
  }
}
```

#### File: `server/src/presentation/routes/AdminRouteModule.ts`

**Add Routes:**
```typescript
// Get researchers with admin metadata (tube counts, linked users)
router.get('/researchers',
  this.authController.getResearchersWithMetadata.bind(this.authController)
);

// Delete researcher (safe deletion only - no tubes, no linked user)
router.delete('/researchers/:researcherId',
  validateParams(z.object({ researcherId: z.string() })),
  this.authController.deleteResearcher.bind(this.authController)
);
```

---

## Phase 2: Frontend - Admin Tab Migration

### 2.1 Create Researcher Management Tab

#### File: `client/src/domains/admin/ui/components/tabs/ResearcherManagementTab.tsx`

**Convert from Modal to Tab Component:**
```typescript
import { useState } from 'react';
import { Plus, Edit2, Trash2, User } from 'lucide-react';
import { adminService } from '../../../services/AdminService';
import { notifications } from '@shared/utils';
import type { AdminResearcher } from '@odysseus/shared-schemas';

export interface ResearcherManagementTabProps {
  researchers: AdminResearcher[];
  onResearcherUpdate: () => void;
}

export function ResearcherManagementTab({
  researchers = [],
  onResearcherUpdate,
}: ResearcherManagementTabProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  /**
   * Delete researcher (only allowed if tubeCount=0 AND linkedUserId=null)
   */
  const deleteResearcher = async (researcherId: string, name: string) => {
    if (!confirm(`Delete researcher "${name}"? This action cannot be undone.`)) {
      return;
    }

    setUpdating(researcherId);
    try {
      const response = await adminService.deleteResearcher(researcherId);

      if (response.success) {
        notifications.success(`Researcher "${name}" deleted successfully`);
        onResearcherUpdate();
      } else {
        notifications.error('Failed to delete researcher');
      }
    } catch (error) {
      console.error('Failed to delete researcher:', error);
      notifications.error('Failed to delete researcher');
    } finally {
      setUpdating(null);
    }
  };

  /**
   * Check if researcher can be safely deleted
   */
  const canDelete = (researcher: AdminResearcher): boolean => {
    return researcher.tubeCount === 0 && researcher.linkedUserId === null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Researcher Management</h3>
        <button className="btn btn-primary flex items-center space-x-2">
          <Plus size={16} />
          <span>Add Researcher</span>
        </button>
      </div>

      {/* Researchers Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Researcher
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tubes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Linked User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {researchers.length > 0 ? (
              researchers.map((researcher) => (
                <tr key={researcher.id} className="hover:bg-gray-50">
                  {/* Researcher Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                        <User size={16} className="text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {researcher.firstName} {researcher.lastName}
                        </div>
                        {researcher.email && (
                          <div className="text-sm text-gray-500">{researcher.email}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Position */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {researcher.position || 'N/A'}
                  </td>

                  {/* Tube Count */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      researcher.tubeCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {researcher.tubeCount} tubes
                    </span>
                  </td>

                  {/* Linked User Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {researcher.linkedUsername ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {researcher.linkedUsername}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        None
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button
                      onClick={() => setEditing(researcher.id)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteResearcher(researcher.id, `${researcher.firstName} ${researcher.lastName}`)}
                      disabled={!canDelete(researcher) || updating === researcher.id}
                      className={`transition-colors ${
                        canDelete(researcher)
                          ? 'text-red-600 hover:text-red-900'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      title={
                        !canDelete(researcher)
                          ? 'Cannot delete: researcher has tubes or is linked to a user'
                          : 'Delete researcher'
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No researchers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Information Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          Researchers can only be deleted if they have <strong>zero tubes</strong> and are <strong>not linked to any user</strong>.
          This prevents accidental deletion of historical data.
        </p>
      </div>
    </div>
  );
}
```

---

### 2.2 Update Admin Service

#### File: `client/src/domains/admin/services/AdminService.ts`

**Add Methods:**
```typescript
/**
 * Get all researchers with admin metadata (tube counts, linked users)
 */
async getResearchersWithMetadata(): Promise<{
  success: boolean;
  researchers: AdminResearcher[];
}> {
  try {
    const response = await httpClient.get<{
      success: boolean;
      researchers: AdminResearcher[];
      meta?: { timing: number };
    }>('/admin/researchers');

    return {
      success: response.data.success,
      researchers: response.data.researchers
    };
  } catch (error) {
    console.error('Failed to get researchers with metadata:', error);
    throw error;
  }
}

/**
 * Delete researcher (admin only)
 * Only succeeds if researcher has zero tubes and no linked user
 */
async deleteResearcher(researcherId: string): Promise<{ success: boolean }> {
  try {
    const response = await httpClient.delete<{ success: boolean }>(
      `/admin/researchers/${researcherId}`
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to delete researcher ${researcherId}:`, error);
    throw error;
  }
}
```

---

### 2.3 Update Admin Settings Modal

#### File: `client/src/domains/admin/ui/components/AdminSettingsModal.tsx`

**Add Researchers Tab:**
```typescript
const tabs = [
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'researchers', label: 'Researchers', icon: Users }, // NEW TAB
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'metrics', label: 'System Metrics', icon: BarChart3 },
  { id: 'audit', label: 'Audit Log', icon: FileText },
];
```

**Add State for Researchers:**
```typescript
const [researchers, setResearchers] = useState<AdminResearcher[]>([]);

const loadResearchers = async () => {
  try {
    const response = await adminService.getResearchersWithMetadata();
    if (response.success) {
      setResearchers(response.researchers);
    }
  } catch (error) {
    console.error('Failed to load researchers:', error);
  }
};

useEffect(() => {
  loadResearchers();
}, []);
```

**Add Tab Render:**
```typescript
{activeTab === 'researchers' && (
  <ResearcherManagementTab
    researchers={researchers}
    onResearcherUpdate={loadResearchers}
  />
)}
```

---

### 2.4 Remove Researcher Management from User Menu

#### File: `client/src/app/components/layout/AppHeader.tsx`

**Remove Lines 281-290:**
```typescript
// DELETE THIS ENTIRE BLOCK
<button
  onClick={() => {
    setShowResearcherManagement(true);
    setShowHamburgerMenu(false);
  }}
  className="w-full px-4 py-1.5 text-left hover:bg-gray-100 flex items-center space-x-2 text-gray-900 text-sm"
>
  <Users size={20} />
  <span>Manage Researchers</span>
</button>
```

**Remove State (Line 84):**
```typescript
// DELETE THIS LINE
const [showResearcherManagement, setShowResearcherManagement] = useState(false);
```

**Remove Import (Line 5):**
```typescript
// DELETE THIS LINE
import { ResearcherManagementModal } from '@domains/researchers/ui/components/ResearcherManagementModal';
```

**Remove Modal Render (Lines 339-345):**
```typescript
// DELETE THIS ENTIRE BLOCK
{/* Researcher Management Modal */}
{showResearcherManagement && (
  <ResearcherManagementModal
    isOpen={showResearcherManagement}
    onClose={() => setShowResearcherManagement(false)}
  />
)}
```

---

## Phase 3: Zombie Code Cleanup

### Files to Delete (After Verification)

1. **`client/src/domains/researchers/ui/components/ResearcherManagementModal.tsx`**
   - Replaced by `ResearcherManagementTab.tsx`
   - No longer needed as standalone modal

2. **`client/src/domains/researchers/ui/components/DeactivateConfirmDialog.tsx`** (if exists)
   - Check if used elsewhere
   - Delete if only used by ResearcherManagementModal

3. **`client/src/domains/researchers/ui/components/DuplicateWarningDialog.tsx`** (if exists)
   - Check if used elsewhere
   - Delete if only used by ResearcherManagementModal

### Files to Keep

1. **`client/src/domains/researchers/services/ResearcherService.ts`**
   - Still needed for researcher dropdown in tube forms
   - Used by non-admin features

2. **`client/src/domains/researchers/hooks/useResearchersQuery.ts`**
   - Still needed throughout app for researcher display
   - Used in tube grids, search results, etc.

---

## Phase 4: Testing & Validation

### Backend Tests
```bash
# Test admin researcher endpoints
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3001/api/admin/researchers

# Test safe deletion (should succeed)
curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3001/api/admin/researchers/$ORPHAN_ID

# Test unsafe deletion (should fail)
curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3001/api/admin/researchers/$ACTIVE_ID
```

### Frontend Tests
1. ✅ Admin can access Researchers tab in Admin Settings
2. ✅ Non-admin users cannot see Researchers tab
3. ✅ Researcher Management no longer in hamburger menu
4. ✅ Delete button disabled for researchers with tubes
5. ✅ Delete button disabled for researchers linked to users
6. ✅ Delete button enabled only for orphaned researchers
7. ✅ Successful deletion shows notification and refreshes list

### Integration Tests
1. ✅ Register new user with researcher toggle ON → researcher created
2. ✅ Admin deletes user → researcher remains (unlinked)
3. ✅ Admin can now delete orphaned researcher
4. ✅ User rejoins with toggle OFF → no duplicate researcher
5. ✅ Admin links existing researcher to new user account

---

## Migration Checklist

### Shared Schemas
- [ ] Add `AdminResearcher` schema
- [ ] Add `adminResearchersResponseSchema`
- [ ] Rebuild package (`npm run build`)

### Backend
- [ ] Add `countByResearcher()` to TubeRepository
- [ ] Add `findByResearcherId()` to UserRepository
- [ ] Add `getResearchersWithMetadata()` to ResearcherApplicationService
- [ ] Add `deleteResearcher()` to ResearcherApplicationService
- [ ] Add controller handlers to AuthController
- [ ] Add routes to AdminRouteModule
- [ ] Test endpoints with Postman/curl

### Frontend
- [ ] Create `ResearcherManagementTab.tsx`
- [ ] Add methods to AdminService
- [ ] Update AdminSettingsModal with Researchers tab
- [ ] Remove researcher button from AppHeader
- [ ] Remove ResearcherManagementModal import/state/render
- [ ] Test UI as admin user
- [ ] Test UI as regular user (should not see tab)

### Cleanup
- [ ] Delete `ResearcherManagementModal.tsx`
- [ ] Delete unused dialog components
- [ ] Remove unused imports
- [ ] Verify no build errors
- [ ] Test packaged app

---

## Risk Mitigation

### Data Integrity
- Safe deletion only: zero tubes + no linked user
- Clear error messages on unsafe deletion attempts
- Confirmation dialog before deletion

### Access Control
- All new endpoints require admin role
- Frontend tab hidden from non-admin users
- Backend validates admin status on every request

### Backward Compatibility
- Existing researcher endpoints unchanged
- ResearcherService still works for dropdowns
- useResearchersQuery still works for display

---

## Rollback Plan

If issues arise:
1. Revert AppHeader changes (restore researcher button)
2. Revert AdminSettingsModal changes (remove researchers tab)
3. Keep backend endpoints (no harm if unused)
4. Restore ResearcherManagementModal

Git tag before migration: `v{version}-pre-researcher-admin-migration`

---

## Success Criteria

✅ Researcher management only accessible by admins
✅ Orphaned researchers can be safely deleted
✅ No duplicate researchers created on user rejoin
✅ All tests pass
✅ App builds without errors
✅ No zombie code remains

---

## Timeline Estimate

**Phase 1 (Backend):** 2-3 hours
**Phase 2 (Frontend):** 2-3 hours
**Phase 3 (Cleanup):** 30 minutes
**Phase 4 (Testing):** 1-2 hours

**Total:** 6-9 hours

---

## Notes

- Follow Clean Architecture layering strictly
- Use existing patterns (follow UserManagementTab example)
- All deletions must validate safety checks
- Admin endpoints follow `/admin/*` pattern
- Tab component matches existing tab styling
