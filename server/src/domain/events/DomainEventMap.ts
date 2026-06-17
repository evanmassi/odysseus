/**
 * Domain Event Type Registry
 *
 * Central registry enabling compile-time verification of event handler subscriptions.
 */

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
import type {
  SupplyItemCreatedEvent,
  SupplyItemUpdatedEvent,
  SupplyItemArchivedEvent,
  SupplyItemDeletedEvent,
  SupplyCategoryCreatedEvent,
  SupplyCategoryUpdatedEvent,
  SupplyCategoryDeletedEvent,
  SupplyDocumentAddedEvent,
  SupplyDocumentRemovedEvent,
  SupplyStockReceivedEvent,
  SupplyStockIssuedEvent,
  SupplyStockCountAdjustedEvent,
  SupplyStockDisposedEvent,
  SupplyStockVoidedEvent,
  SupplyBulkReceivedEvent,
  SupplyBulkIssuedEvent,
  SupplyBulkCategoryReassignedEvent,
  SupplyBulkArchivedEvent,
  SupplyBulkVoidedEvent,
} from './SupplyEvents';
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

  // Supply events
  'SupplyItemCreated': SupplyItemCreatedEvent;
  'SupplyItemUpdated': SupplyItemUpdatedEvent;
  'SupplyItemArchived': SupplyItemArchivedEvent;
  'SupplyItemDeleted': SupplyItemDeletedEvent;
  'SupplyCategoryCreated': SupplyCategoryCreatedEvent;
  'SupplyCategoryUpdated': SupplyCategoryUpdatedEvent;
  'SupplyCategoryDeleted': SupplyCategoryDeletedEvent;
  'SupplyDocumentAdded': SupplyDocumentAddedEvent;
  'SupplyDocumentRemoved': SupplyDocumentRemovedEvent;
  'SupplyStockReceived': SupplyStockReceivedEvent;
  'SupplyStockIssued': SupplyStockIssuedEvent;
  'SupplyStockCountAdjusted': SupplyStockCountAdjustedEvent;
  'SupplyStockDisposed': SupplyStockDisposedEvent;
  'SupplyStockVoided': SupplyStockVoidedEvent;
  'SupplyBulkReceived': SupplyBulkReceivedEvent;
  'SupplyBulkIssued': SupplyBulkIssuedEvent;
  'SupplyBulkCategoryReassigned': SupplyBulkCategoryReassignedEvent;
  'SupplyBulkArchived': SupplyBulkArchivedEvent;
  'SupplyBulkVoided': SupplyBulkVoidedEvent;

  // Lab events
  'LabCreated': LabCreatedEvent;
  'LabRenamed': LabRenamedEvent;
  'LabActivated': LabActivatedEvent;
  'LabDeactivated': LabDeactivatedEvent;
  'InviteCodeCreated': InviteCodeCreatedEvent;
  'InviteCodeUsed': InviteCodeUsedEvent;
}

export type DomainEventName = keyof DomainEventMap;
