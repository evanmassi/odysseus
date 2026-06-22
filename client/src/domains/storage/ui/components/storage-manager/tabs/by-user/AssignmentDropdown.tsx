/**
 * Assignment Dropdown
 *
 * Compact owner field for assigning storage resources — inherit / common / user,
 * with an ownership badge per option and an ownership-tinted trigger value.
 */

import { useMemo, useCallback } from 'react';

import { Select, type SelectOption } from '@shared/ui';
import { UserBadge, type UserBadgeType } from '@shared/ui/components/badges';

import type { UserDisplayInfo } from '@odysseus/shared-schemas';

// Sentinel value distinguishing "explicitly common" (null) from "no selection"
const COMMON_VALUE = '__COMMON__';

interface AssignmentDropdownProps {
  value: string | null | undefined;
  users: UserDisplayInfo[];
  onChange: (userId: string | null | undefined) => void;
  /** Current user id — types each option's badge and tints the trigger (you vs other). */
  currentUserId?: string;
  /** Show "Unassigned/Common" option - only for boxes that can be made common */
  showCommonOption?: boolean;
  /** User ID inherited from parent (e.g., rack owner) - shown in italics when value is undefined */
  parentUserId?: string;
}

interface AssignmentOption extends SelectOption {
  initials?: string;
  badgeType: UserBadgeType;
}

function getInitials(user: UserDisplayInfo): string {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  return initials || user.username.slice(0, 2).toUpperCase();
}

export function AssignmentDropdown({
  value,
  users,
  onChange,
  currentUserId,
  showCommonOption = false,
  parentUserId,
}: AssignmentDropdownProps) {
  const userOptions = useMemo(
    (): AssignmentOption[] =>
      users.map(u => ({
        value: u.id,
        label: u.firstName && u.lastName ? `${u.lastName}, ${u.firstName}` : u.username,
        initials: getInitials(u),
        badgeType: u.id === currentUserId ? 'currentUser' : 'otherUser',
      })),
    [users, currentUserId]
  );

  const options = useMemo(
    (): AssignmentOption[] =>
      showCommonOption
        ? [
            { value: COMMON_VALUE, label: 'Unassigned/Common', badgeType: 'unassigned' },
            ...userOptions,
          ]
        : userOptions,
    [userOptions, showCommonOption]
  );

  const optionMap = useMemo(() => {
    const map = new Map<string, AssignmentOption>();
    options.forEach(opt => map.set(String(opt.value), opt));
    return map;
  }, [options]);

  const selectedValue = useMemo(() => {
    if (value === null) return COMMON_VALUE;
    if (value) return value;
    // undefined = inherit from parent - show parent user
    if (parentUserId) return parentUserId;
    return '';
  }, [value, parentUserId]);

  const isInherited = value === undefined && !!parentUserId;

  const handleChange = useCallback(
    (newValue: string | number | (string | number)[] | null) => {
      if (newValue === null || newValue === '') {
        // Cleared - revert to inherit from rack
        onChange(undefined);
      } else if (newValue === COMMON_VALUE) {
        // Explicitly unassigned/common
        onChange(null);
      } else {
        onChange(String(newValue));
      }
    },
    [onChange]
  );

  const renderOption = useCallback(
    (option: SelectOption) => {
      const full = optionMap.get(String(option.value));
      if (!full) return option.label;
      return (
        <span className="flex items-center gap-2">
          <UserBadge type={full.badgeType} initials={full.initials} size="sm" />
          <span
            className={full.badgeType === 'unassigned' ? 'italic text-secondary-foreground' : ''}
          >
            {full.label}
          </span>
        </span>
      );
    },
    [optionMap]
  );

  const renderValue = useCallback(
    (selectedOptions: SelectOption[]) => {
      if (selectedOptions.length === 0) return null;
      const full = optionMap.get(String(selectedOptions[0].value));
      if (!full) return selectedOptions[0].label;

      if (full.badgeType === 'unassigned') {
        return <span className="truncate italic text-secondary-foreground">{full.label}</span>;
      }
      const ownTint =
        full.badgeType === 'currentUser' && !isInherited ? 'text-ownership-user-badge' : '';
      return (
        <span className={`truncate ${isInherited ? 'italic text-muted-foreground' : ownTint}`}>
          {full.label}
        </span>
      );
    },
    [optionMap, isInherited]
  );

  return (
    <div className="w-36 flex-shrink-0">
      <Select
        value={selectedValue}
        onChange={handleChange}
        options={options}
        clearable
        placeholder="Assign…"
        size="xs"
        fullWidth
        renderOption={renderOption}
        renderValue={renderValue}
        className="text-body-sm"
      />
    </div>
  );
}
