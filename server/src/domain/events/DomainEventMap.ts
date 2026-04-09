/**
 * Domain Event Type Registry
 *
 * Central registry enabling compile-time verification of event handler subscriptions.
 */

import type {
  ConsumableProductCreatedEvent,
  ConsumableProductUpdatedEvent,
  ConsumableProductArchivedEvent,
  ConsumableProductDeletedEvent,
  ConsumableCategoryCreatedEvent,
  ConsumableCategoryUpdatedEvent,
  ConsumableCategoryDeletedEvent,
  ConsumableDocumentAddedEvent,
  ConsumableDocumentRemovedEvent,
  ConsumableStockReceivedEvent,
  ConsumableStockConsumedEvent,
  ConsumableStockCountAdjustedEvent,
  ConsumableStockDisposedEvent,
  ConsumableStockVoidedEvent,
  ConsumableBulkReceivedEvent,
  ConsumableBulkConsumedEvent,
  ConsumableBulkCategoryReassignedEvent,
  ConsumableBulkArchivedEvent,
  ConsumableBulkVoidedEvent,
} from './ConsumableEvents';
import type {
  DonorCreatedEvent,
  DonorUpdatedEvent,
  DonorDeletedEvent
} from './DonorEvents';
import type {
  VerificationEmailSentEvent,
  EmailVerifiedEvent,
  VerificationEmailResentEvent
} from './EmailVerificationEvents';
import type {
  EquipmentItemCreatedEvent,
  EquipmentItemUpdatedEvent,
  EquipmentItemDecommissionedEvent,
  EquipmentItemDeletedEvent,
  EquipmentCategoryCreatedEvent,
  EquipmentCategoryUpdatedEvent,
  EquipmentCategoryDeletedEvent,
  EquipmentDocumentAddedEvent,
  EquipmentDocumentRemovedEvent,
  EquipmentMaintenanceLoggedEvent,
  EquipmentMaintenanceUpdatedEvent,
  EquipmentMaintenanceDeletedEvent,
  EquipmentBulkMaintenanceLoggedEvent,
  EquipmentBulkStatusChangedEvent,
  EquipmentBulkRelocatedEvent,
} from './EquipmentEvents';
import type {
  LabCreatedEvent,
  LabRenamedEvent,
  LabActivatedEvent,
  LabDeactivatedEvent,
  InviteCodeCreatedEvent,
  InviteCodeUsedEvent
} from './LabEvents';
import type {
  PasswordResetByAdminEvent,
  PasswordResetTokenGeneratedEvent,
  PasswordResetCompletedEvent
} from './PasswordResetEvents';
import type {
  ResearcherCreatedEvent,
  ResearcherUpdatedEvent,
  ResearcherDeactivatedEvent,
  ResearcherReactivatedEvent,
  ResearcherDeletedEvent,
  ResearcherApprovedEvent
} from './ResearcherEvents';
import type {
  StorageUpdatedEvent,
  TankUpdatedEvent,
  TankAddedEvent,
  TankDeletedEvent,
  RackAddedEvent,
  RackDeletedEvent,
  RackUpdatedEvent,
  BoxAddedEvent,
  BoxDeletedEvent,
  BoxUpdatedEvent,
  LabNameChangedEvent,
  RackAssignedEvent,
  RackUnassignedEvent,
  RackReassignedEvent,
  BoxAssignedEvent,
  BoxUnassignedEvent,
  BoxReassignedEvent,
  RackLabelUpdatedEvent,
  BoxLabelUpdatedEvent,
  BulkResourcesUnassignedEvent,
  BulkResourcesReassignedEvent
} from './StorageEvents';
import type { TubeCreatedEvent, TubeUpdatedEvent, TubeLocationChangedEvent, TubeDeletedEvent, BulkTubesCreatedEvent, BulkTubesUpdatedEvent, BulkTubesDeletedEvent, BulkTubesMovedEvent } from './TubeEvents';
import type { TubesLockedEvent, TubesUnlockedEvent, TubeAccessSharedEvent, TubeAccessRevokedEvent } from './TubeLockEvents';
import type {
  UserCreatedEvent,
  UserPasswordChangedEvent,
  UserRoleChangedEvent,
  UserDeletedEvent,
  UserLoggedInEvent,
  UserLoginFailedEvent,
  UserLoggedOutEvent,
  UserLinkedToResearcherEvent,
  UserUnlinkedFromResearcherEvent,
  UserDeactivatedEvent,
  UserSuspendedEvent,
  UserReactivatedEvent
} from './UserEvents';

export interface DomainEventMap {
  // Tube CRUD events
  'TubeCreated': TubeCreatedEvent;
  'TubeUpdated': TubeUpdatedEvent;
  'TubeLocationChanged': TubeLocationChangedEvent;
  'TubeDeleted': TubeDeletedEvent;
  'BulkTubesCreated': BulkTubesCreatedEvent;
  'BulkTubesUpdated': BulkTubesUpdatedEvent;
  'BulkTubesDeleted': BulkTubesDeletedEvent;
  'BulkTubesMoved': BulkTubesMovedEvent;

  // Tube lock/access events
  'TubesLocked': TubesLockedEvent;
  'TubesUnlocked': TubesUnlockedEvent;
  'TubeAccessShared': TubeAccessSharedEvent;
  'TubeAccessRevoked': TubeAccessRevokedEvent;

  // Storage events
  'StorageUpdated': StorageUpdatedEvent;
  'TankUpdated': TankUpdatedEvent;
  'TankAdded': TankAddedEvent;
  'TankDeleted': TankDeletedEvent;
  'RackAdded': RackAddedEvent;
  'RackDeleted': RackDeletedEvent;
  'RackUpdated': RackUpdatedEvent;
  'BoxAdded': BoxAddedEvent;
  'BoxDeleted': BoxDeletedEvent;
  'BoxUpdated': BoxUpdatedEvent;
  'LabNameChanged': LabNameChangedEvent;

  // Assignment events
  'RackAssigned': RackAssignedEvent;
  'RackUnassigned': RackUnassignedEvent;
  'RackReassigned': RackReassignedEvent;
  'BoxAssigned': BoxAssignedEvent;
  'BoxUnassigned': BoxUnassignedEvent;
  'BoxReassigned': BoxReassignedEvent;

  // Label events
  'RackLabelUpdated': RackLabelUpdatedEvent;
  'BoxLabelUpdated': BoxLabelUpdatedEvent;

  // Bulk resource events
  'BulkResourcesUnassigned': BulkResourcesUnassignedEvent;
  'BulkResourcesReassigned': BulkResourcesReassignedEvent;

  // User events
  'UserCreated': UserCreatedEvent;
  'UserPasswordChanged': UserPasswordChangedEvent;
  'UserRoleChanged': UserRoleChangedEvent;
  'UserDeleted': UserDeletedEvent;
  'UserLoggedIn': UserLoggedInEvent;
  'UserLoginFailed': UserLoginFailedEvent;
  'UserLoggedOut': UserLoggedOutEvent;
  'UserLinkedToResearcher': UserLinkedToResearcherEvent;
  'UserUnlinkedFromResearcher': UserUnlinkedFromResearcherEvent;
  'UserDeactivated': UserDeactivatedEvent;
  'UserSuspended': UserSuspendedEvent;
  'UserReactivated': UserReactivatedEvent;

  // Researcher events
  'ResearcherCreated': ResearcherCreatedEvent;
  'ResearcherUpdated': ResearcherUpdatedEvent;
  'ResearcherDeactivated': ResearcherDeactivatedEvent;
  'ResearcherReactivated': ResearcherReactivatedEvent;
  'ResearcherDeleted': ResearcherDeletedEvent;
  'ResearcherApproved': ResearcherApprovedEvent;

  // Email verification events
  'VerificationEmailSent': VerificationEmailSentEvent;
  'EmailVerified': EmailVerifiedEvent;
  'VerificationEmailResent': VerificationEmailResentEvent;

  // Password reset events
  'PasswordResetByAdmin': PasswordResetByAdminEvent;
  'PasswordResetTokenGenerated': PasswordResetTokenGeneratedEvent;
  'PasswordResetCompleted': PasswordResetCompletedEvent;

  // Donor events
  'DonorCreated': DonorCreatedEvent;
  'DonorUpdated': DonorUpdatedEvent;
  'DonorDeleted': DonorDeletedEvent;

  // Equipment events
  'EquipmentItemCreated': EquipmentItemCreatedEvent;
  'EquipmentItemUpdated': EquipmentItemUpdatedEvent;
  'EquipmentItemDecommissioned': EquipmentItemDecommissionedEvent;
  'EquipmentItemDeleted': EquipmentItemDeletedEvent;
  'EquipmentMaintenanceLogged': EquipmentMaintenanceLoggedEvent;
  'EquipmentMaintenanceUpdated': EquipmentMaintenanceUpdatedEvent;
  'EquipmentMaintenanceDeleted': EquipmentMaintenanceDeletedEvent;
  'EquipmentCategoryCreated': EquipmentCategoryCreatedEvent;
  'EquipmentCategoryUpdated': EquipmentCategoryUpdatedEvent;
  'EquipmentCategoryDeleted': EquipmentCategoryDeletedEvent;
  'EquipmentDocumentAdded': EquipmentDocumentAddedEvent;
  'EquipmentDocumentRemoved': EquipmentDocumentRemovedEvent;
  'EquipmentBulkMaintenanceLogged': EquipmentBulkMaintenanceLoggedEvent;
  'EquipmentBulkStatusChanged': EquipmentBulkStatusChangedEvent;
  'EquipmentBulkRelocated': EquipmentBulkRelocatedEvent;

  // Consumable events
  'ConsumableProductCreated': ConsumableProductCreatedEvent;
  'ConsumableProductUpdated': ConsumableProductUpdatedEvent;
  'ConsumableProductArchived': ConsumableProductArchivedEvent;
  'ConsumableProductDeleted': ConsumableProductDeletedEvent;
  'ConsumableCategoryCreated': ConsumableCategoryCreatedEvent;
  'ConsumableCategoryUpdated': ConsumableCategoryUpdatedEvent;
  'ConsumableCategoryDeleted': ConsumableCategoryDeletedEvent;
  'ConsumableDocumentAdded': ConsumableDocumentAddedEvent;
  'ConsumableDocumentRemoved': ConsumableDocumentRemovedEvent;
  'ConsumableStockReceived': ConsumableStockReceivedEvent;
  'ConsumableStockConsumed': ConsumableStockConsumedEvent;
  'ConsumableStockCountAdjusted': ConsumableStockCountAdjustedEvent;
  'ConsumableStockDisposed': ConsumableStockDisposedEvent;
  'ConsumableStockVoided': ConsumableStockVoidedEvent;
  'ConsumableBulkReceived': ConsumableBulkReceivedEvent;
  'ConsumableBulkConsumed': ConsumableBulkConsumedEvent;
  'ConsumableBulkCategoryReassigned': ConsumableBulkCategoryReassignedEvent;
  'ConsumableBulkArchived': ConsumableBulkArchivedEvent;
  'ConsumableBulkVoided': ConsumableBulkVoidedEvent;

  // Lab events
  'LabCreated': LabCreatedEvent;
  'LabRenamed': LabRenamedEvent;
  'LabActivated': LabActivatedEvent;
  'LabDeactivated': LabDeactivatedEvent;
  'InviteCodeCreated': InviteCodeCreatedEvent;
  'InviteCodeUsed': InviteCodeUsedEvent;
}

export type DomainEventName = keyof DomainEventMap;
