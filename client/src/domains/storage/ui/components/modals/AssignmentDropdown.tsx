import React, { useMemo, useCallback } from 'react';

import { Select, type SelectOption } from '@shared/ui';

import type { UserDisplayInfo } from '@odysseus/shared-schemas';

// Special value for explicitly unassigned/common boxes
const COMMON_VALUE = '__COMMON__';

interface AssignmentDropdownProps {
  value: string | null | undefined;
  users: UserDisplayInfo[];
  onChange: (userId: string | null | undefined) => void;
  size: 'sm' | 'md';
  /** Show "Unassigned/Common" option - only for boxes that can be made common */
  showCommonOption?: boolean;
  /** User ID inherited from parent (e.g., rack owner) - shown in italics when value is undefined */
  parentUserId?: string;
}

// Extended option with extra metadata for rendering
interface AssignmentOption extends SelectOption {
  firstName?: string;
  lastName?: string;
  username?: string;
  isCommon?: boolean;
  isInherited?: boolean;
}

// Common option always shown at top
const COMMON_OPTION: AssignmentOption = {
  value: COMMON_VALUE,
  label: 'Unassigned/Common',
  isCommon: true,
};

export function AssignmentDropdown({
  value,
  users,
  onChange,
  size,
  showCommonOption = false,
  parentUserId,
}: AssignmentDropdownProps) {
  const userOptions = useMemo(
    (): AssignmentOption[] =>
      users.map(u => {
        const label = u.firstName && u.lastName ? `${u.lastName}, ${u.firstName}` : u.username;
        return {
          value: u.id,
          label,
          firstName: u.firstName,
          lastName: u.lastName,
          username: u.username,
        };
      }),
    [users]
  );

  // Show Unassigned/Common at top only if enabled (for boxes), then users
  const options = useMemo(
    (): AssignmentOption[] => (showCommonOption ? [COMMON_OPTION, ...userOptions] : userOptions),
    [userOptions, showCommonOption]
  );

  // Create a lookup map for option metadata
  const optionMap = useMemo(() => {
    const map = new Map<string, AssignmentOption>();
    options.forEach(opt => map.set(String(opt.value), opt));
    return map;
  }, [options]);

  // Determine current selected value for the Select
  const selectedValue = useMemo(() => {
    if (value === null) return COMMON_VALUE;
    if (value) return value;
    // undefined = inherit from parent - show parent user
    if (parentUserId) return parentUserId;
    return '';
  }, [value, parentUserId]);

  // Track if current display is inherited (for styling)
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
        // Assigned to specific user
        onChange(String(newValue));
      }
    },
    [onChange]
  );

  // Custom option rendering
  const renderOption = useCallback(
    (option: SelectOption) => {
      const fullOption = optionMap.get(String(option.value));
      if (!fullOption) return option.label;

      if (fullOption.isCommon) {
        return <span className="italic text-secondary-foreground">{fullOption.label}</span>;
      }

      if (fullOption.firstName && fullOption.lastName) {
        return (
          <span className="font-semibold">
            {fullOption.lastName}, {fullOption.firstName}
          </span>
        );
      }

      return <span>{fullOption.username}</span>;
    },
    [optionMap]
  );

  // Custom value rendering (for selected display)
  const renderValue = useCallback(
    (selectedOptions: SelectOption[]) => {
      if (selectedOptions.length === 0) return null;

      const option = selectedOptions[0];
      const fullOption = optionMap.get(String(option.value));
      if (!fullOption) return option.label;

      const wrapperClass = isInherited ? 'italic' : '';

      if (fullOption.isCommon) {
        return <span className="italic text-secondary-foreground">{fullOption.label}</span>;
      }

      if (fullOption.firstName && fullOption.lastName) {
        return (
          <span className={`${wrapperClass} ${isInherited ? '' : 'font-semibold'}`}>
            {fullOption.lastName}, {fullOption.firstName}
          </span>
        );
      }

      return <span className={wrapperClass}>{fullOption.username}</span>;
    },
    [optionMap, isInherited]
  );

  const widthClass = size === 'sm' ? 'w-36' : 'w-40';

  return (
    <div className={`${widthClass} flex-shrink-0`}>
      <Select
        value={selectedValue}
        onChange={handleChange}
        options={options}
        clearable
        placeholder="Assign..."
        size={size}
        fullWidth
        renderOption={renderOption}
        renderValue={renderValue}
        className="text-xs"
      />
    </div>
  );
}
