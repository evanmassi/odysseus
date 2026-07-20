/**
 * HTTP Input Validation Schemas
 *
 * Centralizes all request validation so route modules stay pure routing.
 */
import {
  createTubeRequestSchema,
  updateTubeRequestSchema,
  tubeLocationSchema,
  bulkMoveRequestSchema,
  TUBE_FILTERABLE_FIELDS,
  createResearcherProfileSchema,
  lockTubesRequestSchema,
  unlockTubesRequestSchema,
  shareTubeAccessRequestSchema,
  revokeTubeAccessRequestSchema,
  validateInviteCodeRequestSchema,
  createInviteCodeRequestSchema,
  createLabRequestSchema,
  createDonorRequestSchema,
  updateDonorRequestSchema,
  createCollectionHistoryRequestSchema,
  updateCollectionHistoryRequestSchema,
  createEquipmentCategoryRequestSchema,
  updateEquipmentCategoryRequestSchema,
  createEquipmentItemRequestSchema,
  updateEquipmentItemRequestSchema,
  decommissionEquipmentItemRequestSchema,
  createEquipmentDocumentRequestSchema,
  updateEquipmentDocumentRequestSchema,
  createEquipmentMaintenanceLogRequestSchema,
  updateEquipmentMaintenanceLogRequestSchema,
  equipmentBulkMaintenanceRequestSchema,
  equipmentBulkStatusRequestSchema,
  equipmentBulkRelocateRequestSchema,
  addTankRequestSchema,
  updateTankRequestSchema,
  addRacksRequestSchema,
  updateRackRequestSchema,
  assignRackRequestSchema,
  addBoxesRequestSchema,
  updateBoxRequestSchema,
  assignBoxRequestSchema,
  updateResourceLabelRequestSchema,
  updateSystemStorageRequestSchema,
  initializeStorageRequestSchema,
  bulkUnassignRequestSchema,
  bulkReassignRequestSchema,
  createSupplyCategoryRequestSchema,
  updateSupplyCategoryRequestSchema,
  createSupplyLocationRequestSchema,
  updateSupplyLocationRequestSchema,
  createSupplyItemRequestSchema,
  updateSupplyItemRequestSchema,
  createSupplyBarcodeRequestSchema,
  updateSupplyBarcodeRequestSchema,
  createSupplyDocumentRequestSchema,
  updateSupplyDocumentRequestSchema,
  createSupplyPackagingLevelRequestSchema,
  recordSupplyTransactionRequestSchema,
  recordSupplyStockCountRequestSchema,
  supplyBulkReceiveRequestSchema,
  supplyBulkIssueRequestSchema,
  supplyBulkReassignCategoryRequestSchema,
  supplyBulkArchiveRequestSchema,
  supplyBulkBarcodesRequestSchema,
  voidSupplyTransactionRequestSchema,
  supplyBulkVoidRequestSchema,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

// Shared param schemas

export const IdParams = z.object({ id: z.string().min(1) });
export const UserIdParams = z.object({ userId: z.string().min(1) });
export const LabIdParams = z.object({ labId: z.string().min(1) });
export const LabUserParams = z.object({ labId: z.string().min(1), userId: z.string().min(1) });
export const ResearcherIdParams = z.object({ researcherId: z.string().min(1) });
export const CategoryParams = z.object({ category: z.string().min(1) });

// Tube schemas

// Supports both single tube creation and bulk paste operations (copy/cut)
export const CreateTubeHttpSchema = z.union([
  createTubeRequestSchema,
  z.array(createTubeRequestSchema),
]);

export const UpdateTubeHttpSchema = updateTubeRequestSchema;
export const CreateResearcherHttpSchema = createResearcherProfileSchema;

export const LocationQuerySchema = tubeLocationSchema.omit({ position: true });

// Navigator field map reads a whole rack — tank + rack only, no box or position
export const RackQuerySchema = tubeLocationSchema.pick({ tankId: true, rackId: true });

export const TubeFilterOptionsQuerySchema = z.object({
  fields: z
    .string()
    .min(1)
    .transform(val =>
      val
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.enum(TUBE_FILTERABLE_FIELDS)).min(1)),
});

export const BulkUpdateHttpSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().min(1),
        updates: UpdateTubeHttpSchema,
      })
    )
    .min(1, 'At least one update is required'),
});

export const BulkDeleteHttpSchema = z.object({
  tubeIds: z.array(z.string().min(1)).min(1, 'At least one tube ID is required'),
});

export const BulkFetchHttpSchema = z.object({
  tubeIds: z.array(z.string().min(1)).min(1, 'At least one tube ID is required').max(100),
});

export const BulkMoveHttpSchema = bulkMoveRequestSchema;

export const LockTubesHttpSchema = lockTubesRequestSchema;
export const UnlockTubesHttpSchema = unlockTubesRequestSchema;
export const ShareTubeAccessHttpSchema = shareTubeAccessRequestSchema;
export const RevokeTubeAccessHttpSchema = revokeTubeAccessRequestSchema;

// Auth schemas

export const LoginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const RefreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const VerifyEmailBodySchema = z.object({
  token: z.string().min(32),
});

export const ResendVerificationBodySchema = z.object({
  usernameOrEmail: z.string().min(1),
});

export const ValidateInviteCodeBodySchema = validateInviteCodeRequestSchema;

export const SetupSystemAdminBodySchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(8).max(128),
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  setupKey: z.string().optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
});

// Admin schemas

export const UpdateRoleBodySchema = z.object({
  role: z.enum(['lab_admin', 'user']),
});

export const LinkResearcherBodySchema = z
  .object({
    researcherId: z.string().optional(),
    newResearcher: createResearcherProfileSchema.optional(),
  })
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- '' must count as absent, so || not ??
  .refine(data => data.researcherId || data.newResearcher, {
    message: 'Must provide either researcherId or newResearcher',
  });

export const CreateInviteCodeBodySchema = createInviteCodeRequestSchema;

// Lab management schemas

export const CreateLabBodySchema = createLabRequestSchema;

export const UpdateLabBodySchema = z.object({
  name: z.string().min(1).max(200),
});

// Donor schemas

export const DonorHistoryIdParams = z.object({ historyId: z.string().min(1) });
export const CreateDonorHttpSchema = createDonorRequestSchema;
export const UpdateDonorHttpSchema = updateDonorRequestSchema;
export const CreateCollectionHistoryHttpSchema = createCollectionHistoryRequestSchema;
export const UpdateCollectionHistoryHttpSchema = updateCollectionHistoryRequestSchema;
export const DonorSearchQuery = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

// Equipment schemas

export const EquipmentCategoryIdParams = z.object({ categoryId: z.string().min(1) });
export const EquipmentDocIdParams = z.object({ id: z.string().min(1), docId: z.string().min(1) });
export const EquipmentMaintenanceEntryIdParams = z.object({
  id: z.string().min(1),
  entryId: z.string().min(1),
});
export const CreateEquipmentCategoryHttpSchema = createEquipmentCategoryRequestSchema;
export const UpdateEquipmentCategoryHttpSchema = updateEquipmentCategoryRequestSchema;
export const CreateEquipmentItemHttpSchema = createEquipmentItemRequestSchema;
export const UpdateEquipmentItemHttpSchema = updateEquipmentItemRequestSchema;
export const DecommissionEquipmentItemHttpSchema = decommissionEquipmentItemRequestSchema;
export const CreateEquipmentDocumentHttpSchema = createEquipmentDocumentRequestSchema;
export const UpdateEquipmentDocumentHttpSchema = updateEquipmentDocumentRequestSchema;
export const CreateEquipmentMaintenanceLogHttpSchema = createEquipmentMaintenanceLogRequestSchema;
export const UpdateEquipmentMaintenanceLogHttpSchema = updateEquipmentMaintenanceLogRequestSchema;
export const EquipmentBulkMaintenanceHttpSchema = equipmentBulkMaintenanceRequestSchema;
export const EquipmentBulkStatusHttpSchema = equipmentBulkStatusRequestSchema;
export const EquipmentBulkRelocateHttpSchema = equipmentBulkRelocateRequestSchema;

// Storage schemas

export const TankIdParams = z.object({ tankId: z.string().min(1) });
export const RackIdParams = z.object({ tankId: z.string().min(1), rackId: z.string().min(1) });
export const BoxIdParams = z.object({
  tankId: z.string().min(1),
  rackId: z.string().min(1),
  boxId: z.string().min(1),
});
export const AddTankHttpSchema = addTankRequestSchema;
export const UpdateTankHttpSchema = updateTankRequestSchema;
export const AddRacksHttpSchema = addRacksRequestSchema;
export const UpdateRackHttpSchema = updateRackRequestSchema;
export const AssignRackHttpSchema = assignRackRequestSchema;
export const AddBoxesHttpSchema = addBoxesRequestSchema;
export const UpdateBoxHttpSchema = updateBoxRequestSchema;
export const AssignBoxHttpSchema = assignBoxRequestSchema;
export const UpdateResourceLabelHttpSchema = updateResourceLabelRequestSchema;
export const UpdateSystemStorageHttpSchema = updateSystemStorageRequestSchema;
export const InitializeStorageHttpSchema = initializeStorageRequestSchema;
export const BulkUnassignHttpSchema = bulkUnassignRequestSchema;
export const BulkReassignHttpSchema = bulkReassignRequestSchema;
export const ResetStorageHttpSchema = z.object({ confirmationToken: z.string().min(1) });

// Supply schemas

export const SupplyCategoryIdParams = z.object({ categoryId: z.string().min(1) });
export const SupplyLocationIdParams = z.object({ locationId: z.string().min(1) });
export const SupplyDocIdParams = z.object({ id: z.string().min(1), docId: z.string().min(1) });
export const SupplyBarcodeIdParams = z.object({
  id: z.string().min(1),
  barcodeId: z.string().min(1),
});
export const SupplyPackagingLevelIdParams = z.object({
  id: z.string().min(1),
  levelId: z.string().min(1),
});
export const CreateSupplyCategoryHttpSchema = createSupplyCategoryRequestSchema;
export const UpdateSupplyCategoryHttpSchema = updateSupplyCategoryRequestSchema;
export const CreateSupplyLocationHttpSchema = createSupplyLocationRequestSchema;
export const UpdateSupplyLocationHttpSchema = updateSupplyLocationRequestSchema;
export const CreateSupplyItemHttpSchema = createSupplyItemRequestSchema;
export const UpdateSupplyItemHttpSchema = updateSupplyItemRequestSchema;
export const CreateSupplyBarcodeHttpSchema = createSupplyBarcodeRequestSchema;
export const UpdateSupplyBarcodeHttpSchema = updateSupplyBarcodeRequestSchema;
export const CreateSupplyDocumentHttpSchema = createSupplyDocumentRequestSchema;
export const UpdateSupplyDocumentHttpSchema = updateSupplyDocumentRequestSchema;
export const RecordSupplyTransactionHttpSchema = recordSupplyTransactionRequestSchema;
export const RecordSupplyStockCountHttpSchema = recordSupplyStockCountRequestSchema;
export const SupplyBulkReceiveHttpSchema = supplyBulkReceiveRequestSchema;
export const SupplyBulkIssueHttpSchema = supplyBulkIssueRequestSchema;
export const SupplyBulkReassignCategoryHttpSchema = supplyBulkReassignCategoryRequestSchema;
export const SupplyBulkArchiveHttpSchema = supplyBulkArchiveRequestSchema;
export const SupplyBulkBarcodesHttpSchema = supplyBulkBarcodesRequestSchema;
export const VoidSupplyTransactionHttpSchema = voidSupplyTransactionRequestSchema;
export const SupplyBulkVoidHttpSchema = supplyBulkVoidRequestSchema;
export const SupplyTransactionVoidParams = z.object({ transactionId: z.string().min(1) });
export const CreateSupplyPackagingLevelHttpSchema = createSupplyPackagingLevelRequestSchema;
