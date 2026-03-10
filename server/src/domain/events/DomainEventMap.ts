/**
 * Domain Event Map
 *
 * Type-safe mapping from event names to event classes.
 * Enables compile-time verification that event handlers match their subscribed events.
 *
 * Pattern: Same approach used by Socket.io, Redux, and tRPC for typed event systems.
 */

import type { TubeCreatedEvent, TubeUpdatedEvent, TubeLocationChangedEvent, TubeDeletedEvent, BulkTubesUpdatedEvent } from './TubeEvents';
import type { TubesLockedEvent, TubesUnlockedEvent, TubeAccessSharedEvent, TubeAccessRevokedEvent } from './TubeLockEvents';
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
import type {
  ResearcherCreatedEvent,
  ResearcherUpdatedEvent,
  ResearcherDeactivatedEvent,
  ResearcherReactivatedEvent,
  ResearcherDeletedEvent,
  ResearcherApprovedEvent
} from './ResearcherEvents';
import type {
  VerificationEmailSentEvent,
  EmailVerifiedEvent,
  VerificationEmailResentEvent
} from './EmailVerificationEvents';
import type {
  PasswordResetByAdminEvent,
  PasswordResetTokenGeneratedEvent,
  PasswordResetCompletedEvent
} from './PasswordResetEvents';
import type {
  LabCreatedEvent,
  InviteCodeCreatedEvent,
  InviteCodeUsedEvent
} from './LabEvents';

/**
 * Maps event name strings to their corresponding event class types.
 * TypeScript uses this to infer handler parameter types from subscription names.
 */
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
  'InviteCodeCreated': InviteCodeCreatedEvent;
  'InviteCodeUsed': InviteCodeUsedEvent;
}

/**
 * Union type of all valid event names.
 * Prevents typos in event subscriptions at compile time.
 */
export type DomainEventName = keyof DomainEventMap;
