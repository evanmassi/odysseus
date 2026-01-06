import React, { useMemo, useCallback } from 'react';

import Select, { type CSSObjectWithLabel } from 'react-select';

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

// Focus ring styles matching global focus system - blue neon glow
const getFocusBoxShadow = () =>
  `0 0 4px 0 rgba(59, 130, 246, 0.7), 0 0 10px 2px rgba(59, 130, 246, 0.35)`;
const getFocusBorderColor = () => `#3b82f6`;

const STYLES_SM = {
  control: (base: CSSObjectWithLabel, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: '24px',
    fontSize: '11px',
    boxShadow: state.isFocused ? getFocusBoxShadow() : base.boxShadow,
    borderColor: state.isFocused ? getFocusBorderColor() : base.borderColor,
    '&:hover': {
      borderColor: state.isFocused ? getFocusBorderColor() : base.borderColor,
    },
  }),
  menu: (base: CSSObjectWithLabel) => ({
    ...base,
    fontSize: '11px',
    width: 'auto',
    minWidth: '100%',
    right: 0,
  }),
  menuPortal: (base: CSSObjectWithLabel) => ({
    ...base,
    zIndex: 9999,
  }),
};

const STYLES_MD = {
  control: (base: CSSObjectWithLabel, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: '28px',
    fontSize: '12px',
    boxShadow: state.isFocused ? getFocusBoxShadow() : base.boxShadow,
    borderColor: state.isFocused ? getFocusBorderColor() : base.borderColor,
    '&:hover': {
      borderColor: state.isFocused ? getFocusBorderColor() : base.borderColor,
    },
  }),
  menu: (base: CSSObjectWithLabel) => ({
    ...base,
    fontSize: '12px',
    width: 'auto',
    minWidth: '100%',
    right: 0,
  }),
  menuPortal: (base: CSSObjectWithLabel) => ({
    ...base,
    zIndex: 9999,
  }),
};

interface AssignmentOption {
  value: string;
  label: string;
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
        const label =
          u.firstName && u.lastName ? `${u.lastName}, ${u.firstName} (${u.username})` : u.username;
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
    () => (showCommonOption ? [COMMON_OPTION, ...userOptions] : userOptions),
    [userOptions, showCommonOption]
  );

  const selectedOption = useMemo(() => {
    if (value === null) return COMMON_OPTION;
    if (value) return userOptions.find(o => o.value === value) ?? null;
    // undefined = inherit from parent - show parent user with inherited flag
    if (parentUserId) {
      const parentOption = userOptions.find(o => o.value === parentUserId);
      if (parentOption) {
        return { ...parentOption, isInherited: true };
      }
    }
    return null;
  }, [value, userOptions, parentUserId]);

  const handleChange = useCallback(
    (option: AssignmentOption | null) => {
      if (!option) {
        // Cleared - revert to inherit from rack
        onChange(undefined);
      } else if (option.value === COMMON_VALUE) {
        // Explicitly unassigned/common
        onChange(null);
      } else {
        // Assigned to specific user
        onChange(option.value);
      }
    },
    [onChange]
  );

  const formatOptionLabel = useCallback((option: AssignmentOption) => {
    if (option.isCommon) {
      return <span className="italic text-slate-600">{option.label}</span>;
    }
    const wrapperClass = option.isInherited ? 'italic' : '';
    if (option.firstName && option.lastName) {
      return (
        <span className={wrapperClass}>
          <span className={option.isInherited ? '' : 'font-semibold'}>
            {option.lastName}, {option.firstName}
          </span>
          <span className="text-slate-500"> ({option.username})</span>
        </span>
      );
    }
    return <span className={wrapperClass}>{option.username}</span>;
  }, []);

  const widthClass = size === 'sm' ? 'w-48' : 'w-56';
  const styles = size === 'sm' ? STYLES_SM : STYLES_MD;

  return (
    <div className={`${widthClass} flex-shrink-0`}>
      <Select<AssignmentOption>
        value={selectedOption}
        onChange={handleChange}
        options={options}
        formatOptionLabel={formatOptionLabel}
        isClearable
        placeholder="Assign..."
        className="text-xs"
        styles={styles}
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
    </div>
  );
}
