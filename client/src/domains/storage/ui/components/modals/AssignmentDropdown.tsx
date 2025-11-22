import React, { useMemo, useCallback } from 'react';

import type { AdminUser } from '@odysseus/shared-schemas';
import Select, { type CSSObjectWithLabel } from 'react-select';

interface AssignmentDropdownProps {
  value: string | undefined;
  users: AdminUser[];
  onChange: (userId: string | undefined) => void;
  size: 'sm' | 'md';
}

const STYLES_SM = {
  control: (base: CSSObjectWithLabel) => ({
    ...base,
    minHeight: '24px',
    fontSize: '11px',
  }),
  menu: (base: CSSObjectWithLabel) => ({ ...base, fontSize: '11px' }),
};

const STYLES_MD = {
  control: (base: CSSObjectWithLabel) => ({
    ...base,
    minHeight: '28px',
    fontSize: '12px',
  }),
  menu: (base: CSSObjectWithLabel) => ({ ...base, fontSize: '12px' }),
};

export function AssignmentDropdown({
  value,
  users,
  onChange,
  size,
}: AssignmentDropdownProps) {
  const options = useMemo(
    () =>
      users
        .filter(u => u.isActive)
        .map(u => ({ value: u.id, label: u.username })),
    [users]
  );

  const selectedOption = useMemo(
    () => (value ? options.find(o => o.value === value) : null),
    [value, options]
  );

  const handleChange = useCallback(
    (option: { value: string } | null) => {
      onChange(option?.value);
    },
    [onChange]
  );

  const widthClass = size === 'sm' ? 'w-32' : 'w-40';
  const styles = size === 'sm' ? STYLES_SM : STYLES_MD;

  return (
    <div className={`${widthClass} flex-shrink-0`}>
      <Select
        value={selectedOption}
        onChange={handleChange}
        options={options}
        isClearable
        placeholder="Assign..."
        className="text-xs"
        styles={styles}
      />
    </div>
  );
}
