/**
 * Relative Time Formatting Tests
 *
 * Covers each bucket from "Just now" through the locale-date fallback.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { formatRelativeTime } from './relativeTime';

const NOW = new Date('2026-06-27T12:00:00.000Z');
const ago = (ms: number): Date => new Date(NOW.getTime() - ms);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Just now" under a minute', () => {
    expect(formatRelativeTime(ago(30 * SECOND))).toBe('Just now');
  });

  it('shows minutes, pluralizing past one', () => {
    expect(formatRelativeTime(ago(90 * SECOND))).toBe('1 min ago');
    expect(formatRelativeTime(ago(5 * MINUTE))).toBe('5 mins ago');
  });

  it('shows hours, pluralizing past one', () => {
    expect(formatRelativeTime(ago(90 * MINUTE))).toBe('1 hr ago');
    expect(formatRelativeTime(ago(5 * HOUR))).toBe('5 hrs ago');
  });

  it('shows "Yesterday" at one day and day counts within a week', () => {
    expect(formatRelativeTime(ago(25 * HOUR))).toBe('Yesterday');
    expect(formatRelativeTime(ago(3 * DAY))).toBe('3 days ago');
  });

  it('falls back to the locale date beyond a week', () => {
    const old = ago(10 * DAY);
    expect(formatRelativeTime(old)).toBe(old.toLocaleDateString());
  });
});
