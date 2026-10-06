import { useMemo, useCallback } from 'react';

import { getPersonInitials, getPersonSortName } from '@odysseus/shared-schemas';

import { Select, type SelectOption } from '@shared/ui';
import { UserBadge, type UserBadgeType } from '@shared/ui/components/badges';

import type { UserDisplayInfo } from '@odysseus/shared-schemas';

// PITFALL: null means explicitly common and undefined means inherit from the rack, so common needs its own sentinel.
const COMMON_VALUE = '__COMMON__';

interface AssignmentDropdownProps {
  value: string | null | undefined;
  users: UserDisplayInfo[];
  onChange: (userId: string | null | undefined) => void;
  currentUserId?: string;
  showCommonOption?: boolean;
  parentUserId?: string;
  isQuiet?: boolean;
}

interface AssignmentOption extends SelectOption {
  initials?: string;
  badgeType: UserBadgeType;
}

export function AssignmentDropdown({
  value,
  users,
  onChange,
  currentUserId,
  showCommonOption = false,
  parentUserId,
  isQuiet = false,
}: AssignmentDropdownProps) {
  const userOptions = useMemo(
    (): AssignmentOption[] =>
      users.map(u => ({
        value: u.id,
        label: getPersonSortName(u),
        initials: getPersonInitials(u),
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
    if (parentUserId) return parentUserId;
    return '';
  }, [value, parentUserId]);

  const isInherited = value === undefined && !!parentUserId;

  const handleChange = useCallback(
    (newValue: string | number | (string | number)[] | null) => {
      if (newValue === null || newValue === '') {
        onChange(undefined);
      } else if (newValue === COMMON_VALUE) {
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
        isQuiet={isQuiet}
        renderOption={renderOption}
        renderValue={renderValue}
        className="text-body-sm"
      />
    </div>
  );
}
