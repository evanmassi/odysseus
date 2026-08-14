/**
 * Demo History Application
 *
 * Rebuilds the demo lab's audit history from the fixture, attributing it to the lab's real users.
 */

import { randomUUID } from 'crypto';

import { DEMO_DATASET } from '@application/config/DemoDataset';
import type { User } from '@domain/entities/User';
import type { AuditRepository } from '@domain/repositories/AuditRepository';

const HOUR_MS = 3_600_000;

/**
 * The few rows that name a person can only be written once the lab's users are known, so they are
 * built here rather than carried in the fixture.
 */
function userEntries(actors: Array<{ username: string }>) {
  // Whoever the lab actually holds — a second and third account if they exist, so the history
  // reads as several people rather than one account talking about itself.
  const subject = (n: number) => actors[n % actors.length].username;

  return [
    {
      action: 'user_created',
      entityType: 'user',
      details: { username: subject(1), role: 'user' },
      hoursAgo: 336,
      byAdmin: true,
    },
    {
      action: 'user_approved',
      entityType: 'user',
      details: { username: subject(1) },
      hoursAgo: 335,
      byAdmin: true,
    },
    {
      action: 'user_created',
      entityType: 'user',
      details: { username: subject(2), role: 'user' },
      hoursAgo: 330,
      byAdmin: true,
    },
    {
      action: 'user_role_changed',
      entityType: 'user',
      details: { username: subject(1), oldRole: 'user', newRole: 'lab_admin' },
      hoursAgo: 312,
      byAdmin: true,
    },
    {
      action: 'user_linked_to_researcher',
      entityType: 'user',
      details: { username: subject(1), researcherName: 'Elope, Pen' },
      hoursAgo: 258,
      byAdmin: true,
    },
    {
      action: 'user_password_changed',
      entityType: 'user',
      details: { username: subject(2) },
      hoursAgo: 100,
    },
    {
      action: 'user_logged_in',
      entityType: 'user',
      details: { username: subject(2) },
      hoursAgo: 26,
    },
    {
      action: 'user_logged_in',
      entityType: 'user',
      details: { username: subject(0) },
      hoursAgo: 4,
    },
  ];
}

/**
 * Replaces the lab's history rather than adding to it, so a nightly run keeps the log the same
 * size and always ending "just now" instead of drifting further into the past.
 */
export async function applyDemoAuditLog(
  audit: AuditRepository,
  labUsers: User[],
  labId: string
): Promise<number> {
  if (labUsers.length === 0) return 0;

  const actors = labUsers.map(u => ({ id: u.id, username: u.username }));
  // Managing accounts and storage is an admin's job; showing a bench user doing it would misread
  // the lab. Falls back to everyone when the lab has no admin of its own.
  const admins = labUsers.filter(u => u.isAdmin()).map(u => ({ id: u.id, username: u.username }));
  const adminActors = admins.length > 0 ? admins : actors;

  const entries = [...userEntries(adminActors), ...DEMO_DATASET.auditEntries].sort(
    (a, b) => b.hoursAgo - a.hoursAgo
  );

  const now = Date.now();
  let adminTurn = 0;
  let anyTurn = 0;

  await audit.deleteByLabId(labId);
  await audit.saveMany(
    entries.map(entry => {
      const actor =
        'byAdmin' in entry && entry.byAdmin
          ? adminActors[adminTurn++ % adminActors.length]
          : actors[anyTurn++ % actors.length];
      return {
        id: randomUUID(),
        userId: actor.id,
        username: actor.username,
        action: entry.action,
        entityType: entry.entityType,
        entityId: 'entityId' in entry ? entry.entityId : undefined,
        details: JSON.stringify(entry.details),
        timestamp: new Date(now - entry.hoursAgo * HOUR_MS),
        ipAddress: undefined,
        userAgent: undefined,
        labId,
      };
    })
  );

  return entries.length;
}
