/**
 * HTTP Input Validation Schemas
 *
 * Centralizes all request validation so route modules stay pure routing.
 */
import {
  createTubeRequestSchema,
  updateTubeRequestSchema,
  tubeLocationSchema,
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
  createEquipmentMaintenanceLogRequestSchema,
  updateEquipmentMaintenanceLogRequestSchema,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

// Shared param schemas

export const IdParams = z.object({ id: z.string().min(1) });
export const UserIdParams = z.object({ userId: z.string().min(1) });
export const LabIdParams = z.object({ labId: z.string().min(1) });
export const LabUserParams = z.object({ labId: z.string().min(1), userId: z.string().min(1) });
export const ResearcherIdParams = z.object({ researcherId: z.string().min(1) });
export const CategoryParams = z.object({ category: z.string().min(1) });
export const EntityHistoryParams = z.object({ entityType: z.string().min(1), entityId: z.string().min(1) });

// Tube schemas

// Supports both single tube creation and bulk paste operations (copy/cut)
export const CreateTubeHttpSchema = z.union([
  createTubeRequestSchema,
  z.array(createTubeRequestSchema)
]);

export const UpdateTubeHttpSchema = updateTubeRequestSchema;
export const CreateResearcherHttpSchema = createResearcherProfileSchema;

// Omits position from shared location schema
export const LocationQuerySchema = tubeLocationSchema.omit({ position: true });

export const BulkUpdateHttpSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1),
    updates: UpdateTubeHttpSchema
  })).min(1, "At least one update is required")
});

export const BulkDeleteHttpSchema = z.object({
  tubeIds: z.array(z.string().min(1)).min(1, "At least one tube ID is required")
});

export const BulkFetchHttpSchema = z.object({
  tubeIds: z.array(z.string().min(1)).min(1, "At least one tube ID is required").max(100)
});

export const BulkMoveHttpSchema = z.object({
  moves: z.array(z.object({
    tubeId: z.string().min(1),
    version: z.number().int().positive(),
    destination: tubeLocationSchema,
  })).min(1, "At least one move is required").max(100)
});

export const LockTubesHttpSchema = lockTubesRequestSchema;
export const UnlockTubesHttpSchema = unlockTubesRequestSchema;
export const ShareTubeAccessHttpSchema = shareTubeAccessRequestSchema;
export const RevokeTubeAccessHttpSchema = revokeTubeAccessRequestSchema;

// Auth schemas

export const RegisterBodySchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(8).max(128),
  role: z.enum(['admin', 'user']).optional(),
});

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

export const LinkResearcherBodySchema = z.object({
  researcherId: z.string().optional(),
  newResearcher: createResearcherProfileSchema.optional(),
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
}).refine(data => data.researcherId || data.newResearcher, {
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
export const EquipmentMaintenanceEntryIdParams = z.object({ id: z.string().min(1), entryId: z.string().min(1) });
export const CreateEquipmentCategoryHttpSchema = createEquipmentCategoryRequestSchema;
export const UpdateEquipmentCategoryHttpSchema = updateEquipmentCategoryRequestSchema;
export const CreateEquipmentItemHttpSchema = createEquipmentItemRequestSchema;
export const UpdateEquipmentItemHttpSchema = updateEquipmentItemRequestSchema;
export const DecommissionEquipmentItemHttpSchema = decommissionEquipmentItemRequestSchema;
export const CreateEquipmentDocumentHttpSchema = createEquipmentDocumentRequestSchema;
export const CreateEquipmentMaintenanceLogHttpSchema = createEquipmentMaintenanceLogRequestSchema;
export const UpdateEquipmentMaintenanceLogHttpSchema = updateEquipmentMaintenanceLogRequestSchema;

// Search schemas

export const QuickSearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const FieldSearchBodySchema = z.object({
  field: z.string().min(1),
  value: z.string().min(1),
  exact: z.boolean().optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
});
