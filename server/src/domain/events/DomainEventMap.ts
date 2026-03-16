/**
 * Domain Event Type Registry
 *
 * Central registry enabling compile-time verification of event handler subscriptions.
 */

import type {
  VerificationEmailSentEvent,
  EmailVerifiedEvent,
  VerificationEmailResentEvent
} from './EmailVerificationEvents';
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
import type { TubeCreatedEvent, TubeUpdatedEvent, TubeLocationChangedEvent, TubeDeletedEvent, BulkTubesUpdatedEvent } from './TubeEvents';
import type { TubesLockedEvent, TubesUnlockedEvent, TubeAccessSharedEvent, TubeAccessRevokedEvent } from './TubeLockEvents';
import type {
  UserCreatedEvent,
  UserPasswordChangedEvent,
  UserRoleChangedEvent,
  UserDeletedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserLinkedToResearcherEvent,
  UserUnlinkedFromResearcherEvent,
  UserApprovedEvent,
  UserRejectedEvent,
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
  'BulkTubesUpdated': BulkTubesUpdatedEvent;

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
  'UserLoggedOut': UserLoggedOutEvent;
  'UserLinkedToResearcher': UserLinkedToResearcherEvent;
  'UserUnlinkedFromResearcher': UserUnlinkedFromResearcherEvent;
  'UserApproved': UserApprovedEvent;
  'UserRejected': UserRejectedEvent;
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

  // Lab events
  'LabCreated': LabCreatedEvent;
  'LabRenamed': LabRenamedEvent;
  'LabActivated': LabActivatedEvent;
  'LabDeactivated': LabDeactivatedEvent;
  'InviteCodeCreated': InviteCodeCreatedEvent;
  'InviteCodeUsed': InviteCodeUsedEvent;
}

export type DomainEventName = keyof DomainEventMap;
