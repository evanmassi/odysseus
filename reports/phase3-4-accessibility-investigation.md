# Phase 3.4 - Accessibility Investigation (Tier 2a)

**Date:** 2025-01-10
**Total Errors:** 46 (actual count from ESLint)
**Risk Level:** Medium
**WCAG Compliance Target:** AA Level

---

## Executive Summary

This investigation examined all 46 accessibility errors across 15 components in the Odysseus application. The errors span critical user interface elements including admin panels, authentication flows, search/filter interfaces, storage navigation, tube grid interactions, and reusable primitives.

**Error Breakdown:**
- Label Associations: 25 errors
- Interactive Elements (click/keyboard): 12 errors
- Static Element Interactions: 9 errors
- Autofocus Issues: 2 errors
- ARIA Role Issues: 2 errors (missing props, noninteractive-to-interactive)
- Tabindex Misuse: 1 error
- Focus Support: 1 error

**Common Patterns Found:**
- Labels wrapping custom toggle switches without proper associations
- Labels used as visual headers without associated form controls
- Div elements with click handlers lacking keyboard support and semantic roles
- AutoFocus on modal buttons (reduces accessibility for screen reader users)
- Nav element incorrectly assigned tree role (should be on container inside nav)
- Grid container using tabIndex on non-interactive div
- Custom select component missing required ARIA attributes

**Complexity Assessment:**
- Simple fixes (straightforward patterns): 29 errors
- Moderate fixes (need semantic restructuring): 13 errors
- Complex fixes (require testing/design consideration): 4 errors

**Impact Analysis:**
All errors affect users who rely on:
- Screen readers (JAWS, NVDA, VoiceOver)
- Keyboard-only navigation
- Voice control software (Dragon NaturallySpeaking)

---

## Part 1: Label Associations (25 errors)

### Overview
- **Rule:** `jsx-a11y/label-has-associated-control`
- **WCAG Criteria:** 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value
- **Why critical:** Screen readers need explicit associations to announce labels for form controls. Without proper association, users cannot determine what a control does.
- **Industry standard:**
  - Use `htmlFor` + matching `id` on input
  - OR wrap input inside label
  - Label must contain accessible text or have aria-label/aria-labelledby

---

### Error 1: AuditLogFilterPanel.tsx - Line 617

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\admin\ui\components\AuditLogFilterPanel.tsx`

**Line:** 617

**Component Context:** Admin audit log filtering panel - Date Range section with quick preset buttons and custom date range inputs

**Current Code:**
```tsx
<div>
  <label className="block text-xs font-medium text-gray-600 mb-2">Quick Ranges</label>
  <div className="flex flex-wrap gap-1">
    {datePresets.map(preset => (
      <button
        key={preset.value}
        onClick={() => applyDatePreset(preset.value)}
        className={`px-2 py-1 text-xs rounded border transition-all
          ${filters.datePreset === preset.value
            ? 'bg-action text-white border-action shadow-sm'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
      >
        {preset.label}
      </button>
    ))}
  </div>
</div>
```

**Accessibility Issue:** The `<label>` element is used as a visual section heading but has no associated form control. Screen readers will announce "Quick Ranges label" but won't convey that it's a group heading for button choices.

**User Impact:** Screen reader users hear "label" announced without context about what it labels. The relationship between "Quick Ranges" and the preset buttons is not programmatically conveyed.

**Proper Fix:**
```tsx
<div>
  <div className="text-xs font-medium text-gray-600 mb-2">Quick Ranges</div>
  <div className="flex flex-wrap gap-1" role="group" aria-label="Quick date range presets">
    {datePresets.map(preset => (
      <button
        key={preset.value}
        onClick={() => applyDatePreset(preset.value)}
        className={`px-2 py-1 text-xs rounded border transition-all
          ${filters.datePreset === preset.value
            ? 'bg-action text-white border-action shadow-sm'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
      >
        {preset.label}
      </button>
    ))}
  </div>
</div>
```

**Why This Fix:**
1. Changed `<label>` to `<div>` since this is a visual heading, not a form label
2. Added `role="group"` to the button container to create a semantic grouping
3. Added `aria-label` to programmatically name the group for screen readers
4. This follows WAI-ARIA authoring practices for button groups

**Alternative Approaches:**
- Could use `<fieldset>` and `<legend>` if buttons were radio buttons
- Could use `<p>` or `<span>` instead of `<div>` for the heading

**Testing Notes:**
- Verify screen reader announces "Quick date range presets group" when entering button group
- Ensure keyboard navigation flows naturally through buttons

---

### Error 2: AuditLogFilterPanel.tsx - Line 639

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\admin\ui\components\AuditLogFilterPanel.tsx`

**Line:** 639

**Component Context:** Same date range section, custom date inputs for "From" date

**Current Code:**
```tsx
<div>
  <label className="block text-xs font-medium text-gray-600 mb-1">Custom Range</label>
  <div className="space-y-2">
    <input
      type="datetime-local"
      value={filters.dateFrom || ''}
      onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined, datePreset: undefined })}
      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-action-focus focus:border-action-focus"
      placeholder="From"
    />
    <input
      type="datetime-local"
      value={filters.dateTo || ''}
      onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-action-focus focus:border-action-focus"
      placeholder="To"
    />
  </div>
</div>
```

**Accessibility Issue:** The label "Custom Range" doesn't associate with either input. Screen readers won't know what these datetime inputs are for. The placeholder text is insufficient (not always announced by screen readers).

**User Impact:** Screen reader users will hear "edit text datetime-local" without knowing if it's the start or end date. The "Custom Range" label is not programmatically associated.

**Proper Fix:**
```tsx
<fieldset className="border-0 p-0 m-0">
  <legend className="text-xs font-medium text-gray-600 mb-1">Custom Range</legend>
  <div className="space-y-2">
    <div>
      <label htmlFor="audit-date-from" className="sr-only">From date</label>
      <input
        id="audit-date-from"
        type="datetime-local"
        value={filters.dateFrom || ''}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined, datePreset: undefined })}
        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-action-focus focus:border-action-focus"
        placeholder="From"
        aria-label="Filter start date and time"
      />
    </div>
    <div>
      <label htmlFor="audit-date-to" className="sr-only">To date</label>
      <input
        id="audit-date-to"
        type="datetime-local"
        value={filters.dateTo || ''}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-action-focus focus:border-action-focus"
        placeholder="To"
        aria-label="Filter end date and time"
      />
    </div>
  </div>
</fieldset>
```

**Why This Fix:**
1. Uses `<fieldset>` and `<legend>` to group related date inputs - this is the W3C recommended pattern
2. Each input gets a unique `id` and associated `<label>` with `htmlFor`
3. Labels use `sr-only` class since visual placeholder is sufficient for sighted users
4. Added `aria-label` as backup for screen reader context
5. Follows WCAG 1.3.1 (Info and Relationships) and 3.3.2 (Labels or Instructions)

**Alternative Approaches:**
- Could make labels visible instead of sr-only (better for cognitive accessibility)
- Could use aria-labelledby referencing the legend

**Testing Notes:**
- Verify screen reader announces "Custom Range group, From date, edit text"
- Test that fieldset doesn't interfere with visual layout (CSS reset applied)

---

### Errors 3-6: SecurityTab.tsx - Lines 67, 84, 120, 169

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\admin\ui\components\tabs\SecurityTab.tsx`

**Lines:** 67, 84, 120, 169

**Component Context:** Admin security settings with custom toggle switches for various security features

**Current Code (Pattern repeated 4 times):**
```tsx
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={config.useEnhancedAuth}
    onChange={(e) => onChange('useEnhancedAuth', e.target.checked)}
    className="sr-only peer"
  />
  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-danger-bg/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger-bg"></div>
</label>
```

**Accessibility Issue:** The `<label>` wraps the checkbox and custom switch UI but contains no visible text. Screen readers will only announce "checkbox checked/unchecked" without knowing what it controls. The descriptive text is in a sibling `<div>`, not inside the label.

**User Impact:** Screen reader users hear "checkbox" with no context about what they're toggling. They must rely on surrounding context which may not be announced depending on navigation mode.

**Proper Fix (Pattern for all 4 instances):**

Line 67 - Enhanced Authentication:
```tsx
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={config.useEnhancedAuth}
    onChange={(e) => onChange('useEnhancedAuth', e.target.checked)}
    className="sr-only peer"
    aria-label="Enable enhanced authentication"
  />
  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-danger-bg/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger-bg"></div>
</label>
```

Line 84 - Strong Passwords:
```tsx
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={config.requireStrongPasswords}
    onChange={(e) => onChange('requireStrongPasswords', e.target.checked)}
    className="sr-only peer"
    aria-label="Require strong password requirements"
  />
  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-danger-bg/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger-bg"></div>
</label>
```

Line 120 - Special Characters:
```tsx
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={config.passwordRequireSpecialChars}
    onChange={(e) => onChange('passwordRequireSpecialChars', e.target.checked)}
    className="sr-only peer"
    aria-label="Require special characters in passwords"
  />
  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-danger-bg/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger-bg"></div>
</label>
```

Line 169 - Rate Limiting:
```tsx
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={config.enableRateLimiting}
    onChange={(e) => onChange('enableRateLimiting', e.target.checked)}
    className="sr-only peer"
    aria-label="Enable rate limiting to prevent brute force attacks"
  />
  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-danger-bg/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger-bg"></div>
</label>
```

**Why This Fix:**
1. Adds `aria-label` to the checkbox input with descriptive text
2. Screen readers will announce the label when focused on the checkbox
3. Maintains current visual design (checkbox is sr-only, custom switch visible)
4. Follows ARIA authoring practices for custom switches
5. Complies with WCAG 4.1.2 Name, Role, Value

**Alternative Approaches:**
1. **Better approach - restructure to include text in label:**
```tsx
<label className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg cursor-pointer">
  <div>
    <h5 className="text-sm font-medium text-gray-900">Enhanced Authentication</h5>
    <p className="text-xs text-gray-600">Enable stronger password-based authentication</p>
  </div>
  <div className="relative inline-flex items-center">
    <input
      type="checkbox"
      checked={config.useEnhancedAuth}
      onChange={(e) => onChange('useEnhancedAuth', e.target.checked)}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-danger-bg/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger-bg"></div>
  </div>
</label>
```

2. **Alternative - use aria-labelledby:**
```tsx
<div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
  <div id="enhanced-auth-label">
    <h5 className="text-sm font-medium text-gray-900">Enhanced Authentication</h5>
    <p className="text-xs text-gray-600">Enable stronger password-based authentication</p>
  </div>
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={config.useEnhancedAuth}
      onChange={(e) => onChange('useEnhancedAuth', e.target.checked)}
      className="sr-only peer"
      aria-labelledby="enhanced-auth-label"
    />
    <div className="w-11 h-6 bg-gray-200 ..."></div>
  </label>
</div>
```

**Testing Notes:**
- Test with NVDA/JAWS that checkbox announces with descriptive label
- Verify focus ring appears on custom switch when checkbox is focused
- Ensure keyboard space/enter toggles the switch

---

### Error 7: SystemConfigTab.tsx - Line 161

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\admin\ui\components\tabs\SystemConfigTab.tsx`

**Line:** 161

**Component Context:** Admin system configuration - Detailed Logging toggle (same pattern as SecurityTab)

**Current Code:**
```tsx
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={config.enableDetailedLogging}
    onChange={(e) => onChange('enableDetailedLogging', e.target.checked)}
    className="sr-only peer"
  />
  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-danger-bg/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger-bg"></div>
</label>
```

**Accessibility Issue:** Same issue as SecurityTab - label has no accessible text.

**User Impact:** Screen reader users can't determine what the checkbox controls.

**Proper Fix:**
```tsx
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={config.enableDetailedLogging}
    onChange={(e) => onChange('enableDetailedLogging', e.target.checked)}
    className="sr-only peer"
    aria-label="Enable detailed logging for all system operations"
  />
  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-danger-bg/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger-bg"></div>
</label>
```

**Why This Fix:** Same rationale as SecurityTab errors - aria-label provides accessible name.

**Alternative Approaches:** Same as SecurityTab - restructure label or use aria-labelledby.

**Testing Notes:** Same as SecurityTab.

---

### Error 8: RegistrationSuccessModal.tsx - Line 74

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\authentication\ui\components\RegistrationSuccessModal.tsx`

**Line:** 74

**Component Context:** Post-registration success modal displaying the new username

**Current Code:**
```tsx
<div className="mb-6">
  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">
    Your Username
  </label>
  <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-300 rounded-lg">
    <span className="flex-1 font-mono text-base font-semibold text-odysseus-dark">
      {username}
    </span>
    <button
      onClick={handleCopyUsername}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-odysseus-primary hover:text-odysseus-accent hover:bg-info-light rounded transition-colors"
      type="button"
    >
      {copied ? (
        <>
          <Check size={14} />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy size={14} />
          <span>Copy</span>
        </>
      )}
    </button>
  </div>
</div>
```

**Accessibility Issue:** The `<label>` element has no associated form control. The username is displayed in a `<span>`, not an `<input>`.

**User Impact:** Screen reader will announce "Your Username label" but won't associate it with the displayed username text. The relationship is lost.

**Proper Fix:**
```tsx
<div className="mb-6">
  <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">
    Your Username
  </div>
  <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-300 rounded-lg">
    <span className="flex-1 font-mono text-base font-semibold text-odysseus-dark" role="status" aria-label={`Your username is ${username}`}>
      {username}
    </span>
    <button
      onClick={handleCopyUsername}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-odysseus-primary hover:text-odysseus-accent hover:bg-info-light rounded transition-colors"
      type="button"
      aria-label={`Copy username ${username}`}
    >
      {copied ? (
        <>
          <Check size={14} />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy size={14} />
          <span>Copy</span>
        </>
      )}
    </button>
  </div>
</div>
```

**Why This Fix:**
1. Changed `<label>` to `<div>` since there's no form control
2. Added `role="status"` to username span - this is a status message that should be announced
3. Added `aria-label` to provide full context for screen readers
4. Added `aria-label` to copy button for clarity
5. This follows WAI-ARIA pattern for status messages

**Alternative Approaches:**
1. Could use a readonly input instead of span:
```tsx
<input
  type="text"
  value={username}
  readOnly
  id="new-username"
  className="flex-1 font-mono text-base font-semibold text-odysseus-dark bg-transparent border-0 focus:ring-0"
  aria-label="Your new username"
/>
```
Then the label would be valid with `htmlFor="new-username"`

**Testing Notes:**
- Verify screen reader announces username when modal opens
- Test that copy button clearly announces its purpose
- Ensure keyboard users can navigate to and activate copy button

---

### Errors 9-10: ResetPasswordPage.tsx - Lines 125, 154

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\authentication\ui\components\ResetPasswordPage.tsx`

**Lines:** 125, 154

**Component Context:** Password reset form with new password and confirm password fields, includes show/hide password buttons

**Current Code (Line 125):**
```tsx
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    New Password
  </label>
  <div className="relative">
    <input
      type={showPassword ? 'text' : 'password'}
      value={newPassword}
      onChange={(e) => setNewPassword(e.target.value)}
      className="input w-full"
      placeholder="Enter new password"
      required
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
</div>
```

**Accessibility Issue:** The label is not associated with the input. The input has no `id` attribute, and the label has no `htmlFor` attribute. The show/hide button also lacks an aria-label.

**User Impact:** Screen reader users may not hear "New Password" when focusing the input, depending on the screen reader's heuristics. The show/hide button announces as "button" with no purpose.

**Proper Fix (Both errors follow same pattern):**

Line 125 - New Password:
```tsx
<div className="mb-4">
  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
    New Password
  </label>
  <div className="relative">
    <input
      id="new-password"
      type={showPassword ? 'text' : 'password'}
      value={newPassword}
      onChange={(e) => setNewPassword(e.target.value)}
      className="input w-full"
      placeholder="Enter new password"
      required
      aria-describedby="password-strength"
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      aria-controls="new-password"
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
  {newPassword && (
    <p id="password-strength" className={`text-xs mt-1 ${getPasswordStrengthColor(newPassword)}`}>
      Strength: {getPasswordStrength(newPassword)}
    </p>
  )}
</div>
```

Line 154 - Confirm Password:
```tsx
<div className="mb-4">
  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
    Confirm Password
  </label>
  <div className="relative">
    <input
      id="confirm-password"
      type={showConfirmPassword ? 'text' : 'password'}
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      className="input w-full"
      placeholder="Confirm new password"
      required
    />
    <button
      type="button"
      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
      aria-controls="confirm-password"
    >
      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
</div>
```

**Why This Fix:**
1. Added `id` to input and `htmlFor` to label - creates programmatic association
2. Added dynamic `aria-label` to toggle button - announces current state and action
3. Added `aria-controls` to button - indicates which input it controls
4. Added `aria-describedby` to link password strength message (line 125 only)
5. Follows WCAG 1.3.1, 3.3.2, and 4.1.2

**Alternative Approaches:**
- Could use `aria-pressed` on toggle button to indicate state
- Could use `<input type="checkbox">` for show/hide instead of button

**Testing Notes:**
- Verify screen reader announces "New Password, edit text, password" when focusing input
- Test that toggle button announces "Show password button" or "Hide password button"
- Ensure password strength message is announced when it updates

---

### Errors 11-22: FilterPanel.tsx - Lines 342, 362, 382, 413, 433, 453, 473, 493, 542, 551

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\search\ui\components\FilterPanel.tsx`

**Lines:** Multiple (10 errors)

**Component Context:** Search filter panel with collapsible sections for location filters (tanks, racks, boxes), sample filters (cell types, lot numbers, donors, culture conditions), researcher filters, and date range

**Current Code Pattern (repeated throughout):**
```tsx
<div>
  <div className="flex items-center space-x-2 mb-2">
    <TankIcon className="w-3.5 h-3.5" />
    <label className="text-xs font-medium text-gray-600">Tanks</label>
  </div>
  <div className="flex flex-wrap gap-2">
    {filterOptions.tankIds.map(tankId => (
      <FilterChip
        key={tankId}
        label={getTankName(tankId)}
        isSelected={isSelected('tankIds', tankId)}
        onClick={() => toggleFilterValue('tankIds', tankId)}
      />
    ))}
  </div>
</div>
```

**Accessibility Issue:** All `<label>` elements are used as visual section headers but have no associated form controls. The FilterChip components are buttons, not inputs.

**User Impact:** Screen readers announce "Tanks label", "Racks label", etc. without conveying that these are group headings. The relationship between headings and filter chips is not programmatic.

**Proper Fix (Apply pattern to all 10 instances):**

Lines 342, 362, 382 (Tanks, Racks, Boxes):
```tsx
<div>
  <div className="flex items-center space-x-2 mb-2">
    <TankIcon className="w-3.5 h-3.5" aria-hidden="true" />
    <div className="text-xs font-medium text-gray-600">Tanks</div>
  </div>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Tank filters">
    {filterOptions.tankIds.map(tankId => (
      <FilterChip
        key={tankId}
        label={getTankName(tankId)}
        isSelected={isSelected('tankIds', tankId)}
        onClick={() => toggleFilterValue('tankIds', tankId)}
      />
    ))}
  </div>
</div>
```

Lines 413, 433, 453, 473, 493 (Cell Types, Lot Numbers, Donor IDs, Donor Source IDs, Culture Conditions):
```tsx
{/* Example: Cell Types */}
<div>
  <div className="flex items-center space-x-2 mb-2">
    <Microscope className="w-3.5 h-3.5" aria-hidden="true" />
    <div className="text-xs font-medium text-gray-600">Cell Types</div>
  </div>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Cell type filters">
    {filterOptions.cellTypes.map(cellType => (
      <FilterChip
        key={cellType}
        label={cellType}
        isSelected={isSelected('cellTypes', cellType)}
        onClick={() => toggleFilterValue('cellTypes', cellType)}
      />
    ))}
  </div>
</div>
```

Lines 542, 551 (Date Range - From/To):
```tsx
<div className="space-y-3">
  <div>
    <label htmlFor="filter-date-from" className="text-xs font-medium text-gray-600 mb-1 block">
      From:
    </label>
    <input
      id="filter-date-from"
      type="date"
      value={filters.dateFrom || ''}
      onChange={(e) => updateDateFilter('dateFrom', e.target.value)}
      className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-action-focus focus:border-action-focus"
      aria-label="Filter start date"
    />
  </div>
  <div>
    <label htmlFor="filter-date-to" className="text-xs font-medium text-gray-600 mb-1 block">
      To:
    </label>
    <input
      id="filter-date-to"
      type="date"
      value={filters.dateTo || ''}
      onChange={(e) => updateDateFilter('dateTo', e.target.value)}
      className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-action-focus focus:border-action-focus"
      aria-label="Filter end date"
    />
  </div>
</div>
```

**Why This Fix:**
1. Changed `<label>` to `<div>` for section headings (not form controls)
2. Added `role="group"` and `aria-label` to button containers for programmatic grouping
3. For date inputs (lines 542, 551): Added `id` and `htmlFor` to create proper associations
4. Added `aria-label` as backup for date inputs
5. Added `aria-hidden="true"` to decorative icons
6. Follows WAI-ARIA authoring practices for grouped controls

**Alternative Approaches:**
1. Could use `<h4>` or `<h5>` for section headings to create document outline
2. Could use `<fieldset>` and `<legend>` for stronger semantic grouping
3. For filter chips, could use checkbox group pattern:
```tsx
<fieldset>
  <legend className="text-xs font-medium text-gray-600">Tanks</legend>
  {filterOptions.tankIds.map(tankId => (
    <label key={tankId}>
      <input
        type="checkbox"
        checked={isSelected('tankIds', tankId)}
        onChange={() => toggleFilterValue('tankIds', tankId)}
        className="sr-only"
      />
      <span className="filter-chip">
        {getTankName(tankId)}
      </span>
    </label>
  ))}
</fieldset>
```

**Testing Notes:**
- Verify screen reader announces groups properly: "Tank filters group, 3 items"
- Test that each FilterChip button announces its label and selected state
- For date inputs, ensure labels are announced: "From, edit text, date"
- Test keyboard navigation flows smoothly through filter groups

---

### Errors 23-27: StorageManagementModal.tsx - Lines 544, 631, 642, 727, 742

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\StorageManagementModal.tsx`

**Lines:** 544, 631, 642, 727, 742

**Component Context:** Storage management modal with forms for editing boxes, racks, and tanks. Includes labels for grid template selection, rack name/description, and tank name/location.

**Current Code Pattern:**

Line 544 (Box Grid Template):
```tsx
<div>
  <label className="block text-sm font-medium mb-2">Select Grid Template</label>
  <select
    className="w-full border rounded-lg px-3 py-2"
    value={`${editingBox.box.gridConfig.rows}x${editingBox.box.gridConfig.cols}`}
    onChange={(e) => {
      const [rows, cols] = e.target.value.split('x').map(Number);
      const template = gridTemplates.find(t => t.rows === rows && t.cols === cols);
      if (template) setSelectedGridTemplate(template);
    }}
  >
    {gridTemplates.map((template) => (
      <option key={`${template.rows}x${template.cols}`} value={`${template.rows}x${template.cols}`}>
        {template.rows}×{template.cols} Grid
      </option>
    ))}
  </select>
</div>
```

Line 631 (Rack Name):
```tsx
<div>
  <label className="block text-sm font-medium mb-2">Rack Name</label>
  <input
    type="text"
    className="input w-full"
    value={editingRack.rack.name}
    onChange={(e) => setEditingRack({ ...editingRack, rack: { ...editingRack.rack, name: e.target.value } })}
    placeholder="Rack 1"
  />
</div>
```

**Accessibility Issue:** Labels lack `htmlFor` attribute and inputs lack `id` attribute. Association is based on DOM proximity, which may not be reliable for all screen readers.

**User Impact:** While many screen readers will associate the label due to DOM structure, explicit association is required by WCAG 1.3.1 for reliability across all assistive technologies.

**Proper Fix:**

Line 544 - Box Grid Template:
```tsx
<div>
  <label htmlFor="box-grid-template" className="block text-sm font-medium mb-2">
    Select Grid Template
  </label>
  <select
    id="box-grid-template"
    className="w-full border rounded-lg px-3 py-2"
    value={`${editingBox.box.gridConfig.rows}x${editingBox.box.gridConfig.cols}`}
    onChange={(e) => {
      const [rows, cols] = e.target.value.split('x').map(Number);
      const template = gridTemplates.find(t => t.rows === rows && t.cols === cols);
      if (template) setSelectedGridTemplate(template);
    }}
    aria-label="Select grid template for box"
  >
    {gridTemplates.map((template) => (
      <option key={`${template.rows}x${template.cols}`} value={`${template.rows}x${template.cols}`}>
        {template.rows}×{template.cols} Grid
      </option>
    ))}
  </select>
</div>
```

Line 631 - Rack Name:
```tsx
<div>
  <label htmlFor="rack-name" className="block text-sm font-medium mb-2">
    Rack Name
  </label>
  <input
    id="rack-name"
    type="text"
    className="input w-full"
    value={editingRack.rack.name}
    onChange={(e) => setEditingRack({ ...editingRack, rack: { ...editingRack.rack, name: e.target.value } })}
    placeholder="Rack 1"
    required
    aria-required="true"
  />
</div>
```

Line 642 - Rack Description:
```tsx
<div>
  <label htmlFor="rack-description" className="block text-sm font-medium mb-2">
    Description
  </label>
  <textarea
    id="rack-description"
    className="input w-full resize-none"
    rows={3}
    value={editingRack.rack.description || ''}
    onChange={(e) => setEditingRack({ ...editingRack, rack: { ...editingRack.rack, description: e.target.value } })}
    placeholder="Optional description"
  />
</div>
```

Line 727 - Tank Name:
```tsx
<div>
  <label htmlFor="tank-name" className="block text-sm font-semibold mb-2 text-gray-700">
    Tank Name *
  </label>
  <input
    id="tank-name"
    type="text"
    className="input w-full text-lg font-medium"
    value={editingTank.name}
    onChange={(e) => setEditingTank({ ...editingTank, name: e.target.value })}
    placeholder="Main Cryogenic Storage"
    required
    aria-required="true"
    aria-invalid={!editingTank.name.trim()}
  />
  {!editingTank.name.trim() && (
    <p id="tank-name-error" className="text-red-500 text-xs mt-1" role="alert">
      Tank name is required
    </p>
  )}
</div>
```

Line 742 - Tank Location:
```tsx
<div>
  <label htmlFor="tank-location" className="block text-sm font-semibold mb-2 text-gray-700">
    Physical Location
  </label>
  <input
    id="tank-location"
    type="text"
    className="input w-full"
    value={editingTank.location || ''}
    onChange={(e) => setEditingTank({ ...editingTank, location: e.target.value })}
    placeholder="Lab Room 101, Building A"
  />
</div>
```

**Why This Fix:**
1. Added unique `id` to each form control
2. Added `htmlFor` to labels pointing to control `id`
3. Added `aria-label` as backup for screen readers
4. For required fields: Added `aria-required="true"` and `aria-invalid` for validation state
5. Added `role="alert"` to error messages for immediate announcement
6. Follows WCAG 1.3.1 (Info and Relationships) and 3.3.2 (Labels or Instructions)

**Alternative Approaches:**
- Could use `aria-labelledby` if label needs to reference multiple elements
- Could wrap label around input (simpler but less flexible for styling)

**Testing Notes:**
- Verify screen reader announces label when focusing each input
- Test that required field validation is announced
- Ensure error messages are read aloud when they appear
- Test keyboard navigation through form fields

---

## Part 2: Interactive Elements (18 errors)

### Overview
Interactive element errors fall into several categories:
1. Click handlers without keyboard support (6 errors)
2. Static elements used as interactive (9 errors)
3. Autofocus issues (2 errors)
4. Missing ARIA attributes (1 error)

---

### Category A: Click Events Without Keyboard Support (6 errors)

**Rule:** `jsx-a11y/click-events-have-key-events`
**WCAG Criteria:** 2.1.1 Keyboard, 2.1.3 Keyboard (No Exception)
**Why critical:** Keyboard-only users cannot activate click-only elements. All interactive elements must be keyboard accessible.

---

### Error 24: AuditRetentionSettings.tsx - Line 186

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\admin\ui\components\AuditRetentionSettings.tsx`

**Line:** 186

**Component Context:** Collapsible retention settings panel - collapsed state with click to expand

**Current Code:**
```tsx
if (isCollapsed) {
  return (
    <div className={`${currentStatus.alertClass} rounded-lg p-3 cursor-pointer`} onClick={() => setIsCollapsed(false)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${currentStatus.iconClass}`} />
          <span className={`text-sm font-medium ${currentStatus.headingClass}`}>
            Retention: {metrics ? formatNumber(metrics.activeTable.count) : '-'} active • {metrics ? formatNumber(metrics.archiveTable.count) : '-'} archived • {currentStatus.text}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {metrics?.nextArchivalDate && (
            <span className={`text-xs ${currentStatus.textClass}`}>
              Next archival: {formatDate(metrics.nextArchivalDate)}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 ${currentStatus.iconClass}`} />
        </div>
      </div>
    </div>
  );
}
```

**Accessibility Issue:** The div has `onClick` but no keyboard event handlers and no role/tabIndex to make it keyboard focusable. Keyboard users cannot expand the panel.

**User Impact:** Keyboard-only users and screen reader users cannot expand the collapsed panel to view or edit retention settings.

**Proper Fix:**
```tsx
if (isCollapsed) {
  return (
    <button
      type="button"
      className={`${currentStatus.alertClass} rounded-lg p-3 cursor-pointer w-full text-left`}
      onClick={() => setIsCollapsed(false)}
      aria-expanded="false"
      aria-label="Expand audit retention settings"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${currentStatus.iconClass}`} aria-hidden="true" />
          <span className={`text-sm font-medium ${currentStatus.headingClass}`}>
            Retention: {metrics ? formatNumber(metrics.activeTable.count) : '-'} active • {metrics ? formatNumber(metrics.archiveTable.count) : '-'} archived • {currentStatus.text}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {metrics?.nextArchivalDate && (
            <span className={`text-xs ${currentStatus.textClass}`}>
              Next archival: {formatDate(metrics.nextArchivalDate)}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 ${currentStatus.iconClass}`} aria-hidden="true" />
        </div>
      </div>
    </button>
  );
}
```

**Why This Fix:**
1. Changed `<div>` to `<button>` - semantic HTML for interactive elements
2. Added `type="button"` to prevent form submission
3. Added `w-full text-left` to maintain div-like appearance
4. Added `aria-expanded="false"` to indicate collapsed state
5. Added descriptive `aria-label` for screen readers
6. Added `aria-hidden="true"` to decorative icons
7. Button is automatically keyboard focusable and activatable with Enter/Space
8. Follows WCAG 2.1.1 and WAI-ARIA disclosure pattern

**Alternative Approaches:**
1. Could keep div and add keyboard support:
```tsx
<div
  className={`${currentStatus.alertClass} rounded-lg p-3 cursor-pointer`}
  onClick={() => setIsCollapsed(false)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsCollapsed(false);
    }
  }}
  role="button"
  tabIndex={0}
  aria-expanded="false"
  aria-label="Expand audit retention settings"
>
```
However, using a semantic `<button>` is preferred as it provides built-in keyboard support and accessibility features.

**Testing Notes:**
- Verify button can be focused with Tab key
- Test Enter and Space keys activate the button
- Ensure screen reader announces "Expand audit retention settings button collapsed"
- Verify visual styling matches previous div appearance

---

### Error 25: SearchResults.tsx - Line 387

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\search\ui\components\SearchResults.tsx`

**Line:** 387

**Component Context:** Search results list - clickable group cards showing tube information

**Current Code:**
```tsx
<div
  key={index}
  onClick={() => handleGroupClick(group)}
  className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-md hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all"
>
  {/* Line 1: Cell Type with tube count badge */}
  <div className="flex items-start justify-between mb-1">
    <div className="flex items-center space-x-1.5 flex-1 min-w-0">
      <TubeIcon className="text-black flex-shrink-0" size={14} />
      <div className="text-xs font-semibold text-black">
        {highlightText(cellType, query)}
      </div>
    </div>
    <span className="px-2 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 text-white" style={{ backgroundColor: '#5987b6' }}>
      {group.totalCount} tube{group.totalCount !== 1 ? 's' : ''}
    </span>
  </div>
  {/* ... more content ... */}
</div>
```

**Accessibility Issue:** Div with onClick but no keyboard support. Search results cannot be selected with keyboard.

**User Impact:** Keyboard and screen reader users cannot select search results to view tube details.

**Proper Fix:**
```tsx
<button
  type="button"
  key={index}
  onClick={() => handleGroupClick(group)}
  className="w-full text-left p-2.5 border border-gray-200 dark:border-gray-700 rounded-md hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all"
  aria-label={`View ${group.totalCount} tube${group.totalCount !== 1 ? 's' : ''} of ${cellType}${donorInternal ? `, donor ${donorInternal}` : ''}${location ? `, located in ${location}` : ''}`}
>
  {/* Line 1: Cell Type with tube count badge */}
  <div className="flex items-start justify-between mb-1">
    <div className="flex items-center space-x-1.5 flex-1 min-w-0">
      <TubeIcon className="text-black flex-shrink-0" size={14} aria-hidden="true" />
      <div className="text-xs font-semibold text-black">
        {highlightText(cellType, query)}
      </div>
    </div>
    <span className="px-2 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 text-white" style={{ backgroundColor: '#5987b6' }}>
      {group.totalCount} tube{group.totalCount !== 1 ? 's' : ''}
    </span>
  </div>
  {/* ... more content ... */}
</button>
```

**Why This Fix:**
1. Changed `<div>` to `<button>` for semantic correctness
2. Added `w-full text-left` to maintain card-like appearance
3. Added descriptive `aria-label` with key information (cell type, count, donor, location)
4. Added `aria-hidden="true"` to decorative icon
5. Button automatically provides keyboard focus and activation
6. Follows WAI-ARIA authoring practices for interactive list items

**Alternative Approaches:**
1. Could use `<a>` if clicking navigates to a detail page
2. Could use `role="listitem"` with parent `role="list"` for better semantics:
```tsx
<div role="list" aria-label="Search results">
  {sortedGroups.map((group, index) => (
    <button
      role="listitem"
      key={index}
      onClick={() => handleGroupClick(group)}
      // ... rest of props
    >
```

**Testing Notes:**
- Verify button receives focus with Tab key
- Test Enter/Space activates button and triggers handleGroupClick
- Ensure screen reader announces full context: "View 3 tubes of T Cells, donor D123, located in Tank A button"
- Verify focus indicator is visible on focused card

---

### Errors 26-27: GridPosition.tsx - Line 92

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\GridPosition.tsx`

**Line:** 92

**Component Context:** Individual grid position in the tube grid - clickable, double-clickable, right-clickable cells representing storage positions

**Current Code:**
```tsx
return (
  <div
    key={`${position}-${animationKey}`}
    onClick={(e) => onPositionClick(position, e)}
    onDoubleClick={(e) => onPositionDoubleClick?.(position, e)}
    onContextMenu={(e) => onPositionRightClick(position, e)}
    onMouseDown={(e) => onMouseDown(position, e)}
    onMouseMove={() => onMouseMove(position)}
    className={`
      tube-position relative group cursor-pointer
      ${tube ? 'occupied' : 'empty'}
      ${selected ? 'selected' : ''}
      ${isDragPreview ? 'drag-preview' : ''}
      ${isCut ? 'cut-tube' : ''}
      ${isCopied ? 'copied-tube' : ''}
      rounded-lg
    `}
    style={{
      backgroundColor: colors?.backgroundColor || '#f8f9fa',
      color: colors?.textColor || (tube ? '#000' : '#999'),
      width: '100%',
      height: '100%',
      aspectRatio: '1',
      // ... more styles
    }}
  >
    {/* ... tube content ... */}
  </div>
);
```

**Accessibility Issue:** Grid positions use divs with click handlers but no keyboard support. The parent TubeGrid handles keyboard navigation, but individual positions are not independently accessible.

**User Impact:** This is a complex case - the parent grid (TubeGrid.tsx line 235) has keyboard navigation via arrow keys. However, screen readers in browse mode cannot access individual positions without role/tabindex.

**Proper Fix:**
```tsx
return (
  <div
    key={`${position}-${animationKey}`}
    onClick={(e) => onPositionClick(position, e)}
    onDoubleClick={(e) => onPositionDoubleClick?.(position, e)}
    onContextMenu={(e) => onPositionRightClick(position, e)}
    onMouseDown={(e) => onMouseDown(position, e)}
    onMouseMove={() => onMouseMove(position)}
    role="gridcell"
    aria-label={tube
      ? `Position ${position}, ${tube.sample?.cellType || 'Unknown sample'}, ${selected ? 'selected' : 'not selected'}`
      : `Position ${position}, empty, ${selected ? 'selected' : 'not selected'}`
    }
    aria-selected={selected}
    className={`
      tube-position relative group cursor-pointer
      ${tube ? 'occupied' : 'empty'}
      ${selected ? 'selected' : ''}
      ${isDragPreview ? 'drag-preview' : ''}
      ${isCut ? 'cut-tube' : ''}
      ${isCopied ? 'copied-tube' : ''}
      rounded-lg
    `}
    style={{
      backgroundColor: colors?.backgroundColor || '#f8f9fa',
      color: colors?.textColor || (tube ? '#000' : '#999'),
      width: '100%',
      height: '100%',
      aspectRatio: '1',
      // ... more styles
    }}
  >
    {/* ... tube content ... */}
  </div>
);
```

**Why This Fix:**
1. Added `role="gridcell"` to match ARIA grid pattern (parent has role="grid" implied by tabIndex and keyboard handling)
2. Added descriptive `aria-label` with position number, content, and selection state
3. Added `aria-selected` to indicate selection state programmatically
4. Keyboard navigation is handled at parent level (arrow keys) - this is correct per ARIA grid pattern
5. Follows WAI-ARIA Grid pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/

**Alternative Approaches:**
The current implementation actually follows a custom keyboard navigation pattern where the parent grid manages focus and selection. This is acceptable BUT needs proper ARIA roles. Alternative would be to make each cell individually focusable:
```tsx
<div
  role="gridcell"
  tabIndex={selected ? 0 : -1}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPositionClick(position, e);
    }
  }}
  // ... rest
>
```
However, this would conflict with the parent's arrow key navigation.

**Testing Notes:**
- Verify screen reader announces "Position 1, T Cells, selected, gridcell" when navigating with arrow keys
- Test that arrow keys still work for navigation (controlled by parent)
- Ensure Enter key selects position (if implemented in parent keyboard handler)
- Test with NVDA/JAWS in forms mode to ensure gridcell role is recognized

**Important Note:** This fix addresses the ESLint error by adding proper ARIA roles. The keyboard interaction is already implemented at the parent level (TubeGrid.tsx), which is a valid pattern for grid widgets.

---

### Errors 28-35: StorageManagementModal.tsx - Lines 328, 380, 518, 598, 692

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\StorageManagementModal.tsx`

**Lines:** 328, 380, 518, 598, 692

**Component Context:** Storage equipment management with collapsible tanks, racks, and boxes

**Current Code Pattern:**

Line 328 - Tank Collapse Toggle:
```tsx
<div
  onClick={() => toggleTankCollapse(tank.id)}
  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-slate-700 -mx-1 px-1 py-1 rounded"
  title={collapsedTanks.has(tank.id) ? "Expand tank" : "Collapse tank"}
>
  <div className="text-slate-200 flex-shrink-0">
    {collapsedTanks.has(tank.id) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
  </div>
  <div className="flex-1 min-w-0 flex items-center gap-1.5">
    <TankIcon className="text-white flex-shrink-0" size={24} />
    <h3 className="text-base font-semibold text-white truncate min-w-[80px]">{tank.name}</h3>
    {/* ... more content ... */}
  </div>
</div>
```

Line 380 - Rack Collapse Toggle (similar pattern)
Line 518, 598, 692 - Modal containers with onKeyDown but no role

**Accessibility Issue:** Multiple divs with onClick/onKeyDown but missing proper roles and keyboard support.

**User Impact:** Keyboard users cannot collapse/expand sections. Screen readers don't announce these as interactive elements.

**Proper Fix:**

Line 328 - Tank Collapse Toggle:
```tsx
<button
  type="button"
  onClick={() => toggleTankCollapse(tank.id)}
  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-slate-700 -mx-1 px-1 py-1 rounded text-left"
  aria-expanded={!collapsedTanks.has(tank.id)}
  aria-controls={`tank-content-${tank.id}`}
  aria-label={`${collapsedTanks.has(tank.id) ? 'Expand' : 'Collapse'} tank ${tank.name}`}
>
  <div className="text-slate-200 flex-shrink-0" aria-hidden="true">
    {collapsedTanks.has(tank.id) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
  </div>
  <div className="flex-1 min-w-0 flex items-center gap-1.5">
    <TankIcon className="text-white flex-shrink-0" size={24} aria-hidden="true" />
    <h3 className="text-base font-semibold text-white truncate min-w-[80px]">{tank.name}</h3>
    {/* ... more content ... */}
  </div>
</button>

{/* Add id to controlled content */}
{!collapsedTanks.has(tank.id) && (
  <div id={`tank-content-${tank.id}`} className="p-2">
    {/* ... content ... */}
  </div>
)}
```

Line 380 - Rack Collapse Toggle:
```tsx
<button
  type="button"
  onClick={() => toggleRackCollapse(rackKey)}
  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-slate-500 -mx-1 px-1 py-0.5 rounded text-left"
  aria-expanded={!collapsedRacks.has(rackKey)}
  aria-controls={`rack-content-${rackKey}`}
  aria-label={`${collapsedRacks.has(rackKey) ? 'Expand' : 'Collapse'} ${rack.name}`}
>
  <div className="text-white flex-shrink-0" aria-hidden="true">
    {collapsedRacks.has(rackKey) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
  </div>
  <RackIcon className="text-white flex-shrink-0" size={18} aria-hidden="true" />
  <span className="font-medium text-white text-sm inline-block min-w-[60px]">{rack.name}</span>
  {/* ... more content ... */}
</button>
```

Lines 518, 598, 692 - Modal Containers:
```tsx
{/* Box Editing Modal */}
<div
  className="bg-white rounded-lg p-6 max-w-md w-full m-4"
  role="dialog"
  aria-labelledby="box-edit-title"
  aria-modal="true"
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      // ... save logic
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingBox(null);
    }
  }}
>
  <h3 id="box-edit-title" className="text-lg font-semibold mb-4">
    Configure {editingBox.box.name} Grid Size
  </h3>
  {/* ... rest of modal ... */}
</div>
```

**Why This Fix:**
1. Changed collapsible triggers from `<div>` to `<button>` for semantic HTML
2. Added `aria-expanded` to indicate collapsed/expanded state
3. Added `aria-controls` to associate button with controlled content
4. Added descriptive `aria-label` for screen readers
5. Added `aria-hidden="true"` to decorative icons
6. For modals: Added `role="dialog"`, `aria-labelledby`, and `aria-modal`
7. Follows WAI-ARIA disclosure pattern and dialog pattern

**Alternative Approaches:**
- Could use `<details>` and `<summary>` HTML5 elements for native collapse (limited styling)
- Could use headings with buttons inside for better document outline

**Testing Notes:**
- Verify collapse buttons can be focused and activated with keyboard
- Ensure screen reader announces "Expand tank Main Storage, button, collapsed"
- Test that aria-expanded state changes are announced
- For modals, verify focus is trapped and Escape key closes dialog

---

### Category B: No Static Element Interactions (9 errors)

**Rule:** `jsx-a11y/no-static-element-interactions`
**WCAG Criteria:** 4.1.2 Name, Role, Value
**Why critical:** Static elements (div, span) with interaction handlers confuse screen readers. Interactive elements should use semantic HTML or appropriate ARIA roles.

**Note:** Errors 24-35 above already addressed this rule in combination with click-events-have-key-events. The fixes provided (changing divs to buttons, adding roles) resolve both errors simultaneously.

---

### Category C: Autofocus Issues (2 errors)

**Rule:** `jsx-a11y/no-autofocus`
**WCAG Criteria:** 3.2.1 On Focus, 2.4.3 Focus Order
**Why critical:** Autofocus can be disorienting for screen reader users and keyboard users. It bypasses expected focus order and may cause users to miss important content.

---

### Error 36: DeleteConfirmDialog.tsx - Line 94

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\DeleteConfirmDialog.tsx`

**Line:** 94

**Component Context:** Confirmation dialog for deleting tubes - autofocus on the danger "Delete" button

**Current Code:**
```tsx
<div className="flex justify-end space-x-3">
  <button
    onClick={onCancel}
    disabled={isLoading}
    className="btn btn-secondary px-6"
  >
    Cancel
  </button>
  <button
    onClick={onConfirm}
    disabled={isLoading}
    autoFocus
    className="btn btn-danger px-6"
  >
    {isLoading ? (
      <div className="flex items-center space-x-2">
        <div className="spinner w-4 h-4"></div>
        <span>Deleting...</span>
      </div>
    ) : (
      confirmText
    )}
  </button>
</div>
```

**Accessibility Issue:** The `autoFocus` attribute forces focus to the Delete button immediately when the dialog opens. This skips the dialog title and message, which may confuse users about what they're deleting.

**User Impact:**
- Screen reader users may not hear the warning message or what's being deleted
- Keyboard users are immediately positioned on the destructive action
- Violates principle of least surprise - users expect to read dialog content first

**Proper Fix:**
```tsx
const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Delete',
  isLoading = false
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      // Focus the dialog container instead of a specific button
      dialogRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        role="alertdialog"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-message"
        tabIndex={-1}
      >
        <div className="mb-6">
          <h2 id="delete-dialog-title" className="text-xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          <p id="delete-dialog-message" className="text-odysseus-muted leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="btn btn-secondary px-6"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="btn btn-danger px-6"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="spinner w-4 h-4"></div>
                <span>Deleting...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Why This Fix:**
1. Removed `autoFocus` from button
2. Added `useEffect` to focus dialog container when it opens
3. Added `role="alertdialog"` for destructive confirmation dialogs
4. Added `aria-labelledby` and `aria-describedby` to associate title and message
5. Added `tabIndex={-1}` to dialog to make it programmatically focusable
6. Screen reader will announce title and message when dialog receives focus
7. User can then Tab to Cancel or Delete button
8. Follows WAI-ARIA alert dialog pattern

**Alternative Approaches:**
1. Focus the Cancel button instead (safer default):
```tsx
<button
  ref={(el) => el?.focus()}
  onClick={onCancel}
  disabled={isLoading}
  className="btn btn-secondary px-6"
>
  Cancel
</button>
```

2. Use a focus trap library (react-focus-lock) to manage focus within dialog

**Testing Notes:**
- Verify screen reader announces dialog title and message when opened
- Test that Tab key moves to Cancel button first
- Ensure Escape key closes dialog (implement onKeyDown)
- Test with NVDA/JAWS that alertdialog role is announced

---

### Error 37: OverwriteConfirmDialog.tsx - Line 117

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\modals\OverwriteConfirmDialog.tsx`

**Line:** 117

**Component Context:** Confirmation dialog for overwriting existing tubes - same autofocus issue

**Current Code:**
```tsx
<button
  onClick={() => {
    if (!isConfirming) {
      setIsConfirming(true);
      onConfirm();
    }
  }}
  disabled={isLoading || isConfirming}
  autoFocus
  className="btn bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 hover:border-yellow-700 px-6"
>
  {isLoading || isConfirming ? (
    <div className="flex items-center space-x-2">
      <div className="spinner w-4 h-4"></div>
      <span>Processing...</span>
    </div>
  ) : (
    confirmText
  )}
</button>
```

**Accessibility Issue:** Same as DeleteConfirmDialog - autofocus skips dialog content.

**User Impact:** Same - screen reader users miss important information about what's being overwritten.

**Proper Fix:** (Same pattern as DeleteConfirmDialog)
```tsx
const OverwriteConfirmDialog: React.FC<OverwriteConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Overwrite',
  isLoading = false
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        role="alertdialog"
        aria-labelledby="overwrite-dialog-title"
        aria-describedby="overwrite-dialog-message"
        tabIndex={-1}
      >
        <div className="mb-6">
          <h2 id="overwrite-dialog-title" className="text-xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          <p id="overwrite-dialog-message" className="text-odysseus-muted leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isLoading || isConfirming}
            className="btn btn-secondary px-6"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!isConfirming) {
                setIsConfirming(true);
                onConfirm();
              }
            }}
            disabled={isLoading || isConfirming}
            className="btn bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 hover:border-yellow-700 px-6"
          >
            {isLoading || isConfirming ? (
              <div className="flex items-center space-x-2">
                <div className="spinner w-4 h-4"></div>
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Why This Fix:** Same rationale as DeleteConfirmDialog.

**Alternative Approaches:** Same as DeleteConfirmDialog.

**Testing Notes:** Same as DeleteConfirmDialog.

---

### Category D: Miscellaneous ARIA Issues (3 errors)

---

### Error 38: StorageNavigator.tsx - Line 131

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\storage\ui\components\storage-navigator\StorageNavigator.tsx`

**Line:** 131

**Component Context:** Tree navigation for storage hierarchy (tanks > racks > boxes)

**Current Code:**
```tsx
return (
  <nav
    className={`w-full pl-2 pr-3 pb-2 flex flex-col gap-1 relative ${className}`}
    aria-label="Storage Navigator"
    role="tree"
    onKeyDown={handleKeyDown}
  >
    <TreeLineOverlay
      expandedTanks={expandedTanks}
      expandedRacks={expandedRacks}
    />
    {data.tanks.map((tank, _tankIndex) => {
      // ... render tree items
    })}
  </nav>
);
```

**Accessibility Issue:** `<nav>` element should not have `role="tree"`. The `<nav>` landmark role conflicts with the tree role. Non-interactive elements (nav) should not be assigned interactive roles.

**User Impact:** Screen readers may announce conflicting roles. The navigation landmark and tree widget roles serve different purposes and shouldn't be combined on the same element.

**Proper Fix:**
```tsx
return (
  <nav
    className={`w-full pl-2 pr-3 pb-2 flex flex-col gap-1 relative ${className}`}
    aria-label="Storage Navigator"
  >
    <div
      role="tree"
      aria-label="Storage hierarchy"
      onKeyDown={handleKeyDown}
      className="flex flex-col gap-1"
    >
      <TreeLineOverlay
        expandedTanks={expandedTanks}
        expandedRacks={expandedRacks}
      />
      {data.tanks.map((tank, _tankIndex) => {
        // ... render tree items with role="treeitem"
      })}
    </div>
  </nav>
);
```

**Why This Fix:**
1. Removed `role="tree"` from `<nav>` element
2. Added inner `<div>` with `role="tree"` to contain the tree widget
3. `<nav>` remains a navigation landmark
4. Tree widget is properly nested inside navigation
5. Follows WAI-ARIA tree pattern: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
6. Complies with ARIA rule: non-interactive elements shouldn't have interactive roles

**Alternative Approaches:**
- Could remove `<nav>` entirely and just use tree role if this isn't a navigation landmark
- Could use `role="navigation"` explicitly instead of `<nav>` semantic element

**Testing Notes:**
- Verify screen reader announces "Storage Navigator navigation"
- Then announces "Storage hierarchy tree"
- Test that arrow keys work for tree navigation
- Ensure tree items have role="treeitem" (check StorageNavigatorItem component)

---

### Error 39: TubeGrid.tsx - Line 235

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\tubes\ui\components\grid\TubeGrid.tsx`

**Line:** 235

**Component Context:** Main tube grid container with keyboard navigation

**Current Code:**
```tsx
return (
  <div className="w-full h-full flex flex-col">
    <div className="flex-1 flex items-center justify-center">
      <div
        ref={gridRef}
        className="tube-grid select-none focus:outline-none"
        style={{
          ...gridStyle,
          outline: 'none !important',
          outlineOffset: '0 !important',
          WebkitTapHighlightColor: 'transparent'
        }}
        tabIndex={0}
        onKeyDown={keyboardNav.handleGridKeyDown}
        onFocus={() => {
          if (selectedPositions.size === 0) {
            const firstPositionKey = toPositionKey(ctx, 1);
            onSelectionChange(new Set([firstPositionKey]));
          }
        }}
      >
        {positions.map((position) => {
          // ... render GridPosition components
        })}
      </div>
    </div>
  </div>
);
```

**Accessibility Issue:** `tabIndex` on a non-interactive `<div>`. While this is intentional for keyboard navigation, it needs a proper ARIA role to indicate it's an interactive grid.

**User Impact:** Screen readers won't recognize this as an interactive grid widget. Users won't understand they can use arrow keys to navigate.

**Proper Fix:**
```tsx
return (
  <div className="w-full h-full flex flex-col">
    <div className="flex-1 flex items-center justify-center">
      <div
        ref={gridRef}
        className="tube-grid select-none focus:outline-none"
        style={{
          ...gridStyle,
          outline: 'none !important',
          outlineOffset: '0 !important',
          WebkitTapHighlightColor: 'transparent'
        }}
        role="grid"
        aria-label={`Tube storage grid for ${boxId ? `Box ${boxId}` : `Rack ${rackId}`}, ${positions.length} positions`}
        aria-multiselectable="true"
        tabIndex={0}
        onKeyDown={keyboardNav.handleGridKeyDown}
        onFocus={() => {
          if (selectedPositions.size === 0) {
            const firstPositionKey = toPositionKey(ctx, 1);
            onSelectionChange(new Set([firstPositionKey]));
          }
        }}
      >
        {positions.map((position) => {
          // ... GridPosition components should have role="gridcell" (see Error 26-27 fix)
        })}
      </div>
    </div>
  </div>
);
```

**Why This Fix:**
1. Added `role="grid"` to identify this as an ARIA grid widget
2. Added descriptive `aria-label` with context about what grid this is
3. Added `aria-multiselectable="true"` to indicate multiple selection support
4. Child GridPosition components have `role="gridcell"` (from Error 26-27 fix)
5. Follows WAI-ARIA grid pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
6. Keyboard navigation is already implemented (arrow keys, selection)

**Alternative Approaches:**
- Could use `role="table"` if grid is primarily for data display
- Could use individual `tabIndex` on each cell instead of roving tabindex pattern

**Testing Notes:**
- Verify screen reader announces "Tube storage grid for Box 1, 81 positions, grid"
- Test that arrow keys navigate between cells
- Ensure screen reader announces cell contents when navigating
- Test that multiselect is announced when selecting multiple cells

---

### Errors 40-41: Select.tsx - Lines 418, 495

**File:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\shared\ui\primitives\select\Select.tsx`

**Lines:** 418 (missing ARIA props), 495 (click events + focus support)

**Component Context:** Custom select dropdown component with search, multiselect, and keyboard navigation

**Current Code:**

Line 418 - Select Container:
```tsx
<div
  ref={(el) => {
    (selectRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }}
  className={selectClasses}
  onClick={handleToggle}
  onKeyDown={handleKeyDown}
  role="combobox"
  aria-expanded={isOpen}
  aria-haspopup="listbox"
  aria-label={ariaLabel}
  aria-labelledby={label ? labelId : undefined}
  aria-describedby={[
    ariaDescribedBy,
    description ? descriptionId : null,
    error ? errorId : null,
  ].filter(Boolean).join(' ') || undefined}
  tabIndex={disabled ? -1 : 0}
  {...props}
>
```

Line 495 - Option Items:
```tsx
<div
  key={option.value}
  className={optionVariants({
    isSelected,
    isHighlighted,
    isDisabled: option.disabled,
  })}
  onClick={() => handleOptionSelect(option)}
  role="option"
  aria-selected={isSelected}
>
  {multiple && (
    <div className="flex items-center">
      <input
        type="checkbox"
        checked={isSelected}
        readOnly
        className="mr-2"
      />
    </div>
  )}
  {/* ... option content ... */}
</div>
```

**Accessibility Issue:**
- Line 418: `role="combobox"` is missing required `aria-controls` attribute
- Line 495: Option divs have `onClick` but no keyboard support and missing `tabIndex` for focus

**User Impact:**
- Screen readers can't determine which listbox the combobox controls
- Options cannot be activated with keyboard (though parent handles some keyboard nav)
- Screen readers may not announce options as focusable

**Proper Fix:**

Line 418 - Add aria-controls:
```tsx
<div
  ref={(el) => {
    (selectRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }}
  className={selectClasses}
  onClick={handleToggle}
  onKeyDown={handleKeyDown}
  role="combobox"
  aria-expanded={isOpen}
  aria-haspopup="listbox"
  aria-controls="select-listbox"
  aria-label={ariaLabel}
  aria-labelledby={label ? labelId : undefined}
  aria-describedby={[
    ariaDescribedBy,
    description ? descriptionId : null,
    error ? errorId : null,
  ].filter(Boolean).join(' ') || undefined}
  tabIndex={disabled ? -1 : 0}
  {...props}
>
```

Line 482 - Add id to listbox:
```tsx
<div ref={optionsRef} role="listbox" id="select-listbox" aria-label={`${label || 'Select'} options`}>
```

Line 495 - Fix options:
```tsx
<div
  key={option.value}
  className={optionVariants({
    isSelected,
    isHighlighted,
    isDisabled: option.disabled,
  })}
  onClick={() => !option.disabled && handleOptionSelect(option)}
  onKeyDown={(e) => {
    if (!option.disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleOptionSelect(option);
    }
  }}
  role="option"
  aria-selected={isSelected}
  aria-disabled={option.disabled}
  tabIndex={isHighlighted ? 0 : -1}
>
  {multiple && (
    <div className="flex items-center">
      <input
        type="checkbox"
        checked={isSelected}
        readOnly
        tabIndex={-1}
        className="mr-2"
        aria-hidden="true"
      />
    </div>
  )}
  {/* ... option content ... */}
</div>
```

**Why This Fix:**
1. Added `aria-controls` to combobox pointing to listbox ID (required by ARIA spec)
2. Added `id` to listbox for reference
3. Added `aria-label` to listbox for screen reader context
4. Added keyboard handler to options for Enter/Space activation
5. Added `tabIndex` with roving focus pattern (only highlighted option is focusable)
6. Added `aria-disabled` to disabled options
7. Made checkbox in multiselect `aria-hidden` (decorative, option selection is what matters)
8. Follows WAI-ARIA combobox pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/

**Alternative Approaches:**
1. Could use native `<select>` with custom styling (better accessibility, harder to style)
2. Could use a library like Downshift or Headless UI with built-in accessibility
3. Could implement active descendant pattern instead of roving tabindex

**Testing Notes:**
- Verify screen reader announces "Combobox, collapsed/expanded, controls Select options"
- Test that arrow keys navigate options and Space/Enter selects
- Ensure highlighted option is announced as focused
- Test multiselect mode announces "checked" or "not checked" for each option
- Verify Escape closes dropdown

---

## Accessibility Patterns Reference

### Pattern 1: Form Labels

**Valid Patterns:**

1. **htmlFor + id (Recommended for most cases):**
```tsx
<label htmlFor="username">Username</label>
<input id="username" type="text" />
```

2. **Wrapping (Good for custom controls):**
```tsx
<label>
  Username
  <input type="text" />
</label>
```

3. **aria-label (When visual label isn't needed):**
```tsx
<input type="text" aria-label="Username" />
```

4. **aria-labelledby (Complex labels):**
```tsx
<div id="username-label">Username</div>
<input type="text" aria-labelledby="username-label" />
```

**When NOT to use `<label>`:**
- Section headings (use `<h1>`-`<h6>`, `<div>`, or ARIA group)
- Static text that doesn't label a form control
- Button groups (use `role="group"` with `aria-label`)

---

### Pattern 2: Keyboard-Accessible Interactive Elements

**Semantic HTML (Preferred):**
```tsx
{/* Buttons for actions */}
<button type="button" onClick={handleClick}>
  Click Me
</button>

{/* Links for navigation */}
<a href="/page">Go to Page</a>
```

**Custom Interactive Elements (When necessary):**
```tsx
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Custom Button
</div>
```

**Required for keyboard accessibility:**
1. `tabIndex={0}` to make focusable
2. `role` to identify element type
3. `onKeyDown` handler for Enter and Space keys
4. Visual focus indicator (CSS `:focus`)

---

### Pattern 3: Custom Toggle Switches

**Best Practice (Checkbox-based):**
```tsx
<label className="flex items-center justify-between">
  <span>Enable Feature</span>
  <input
    type="checkbox"
    checked={enabled}
    onChange={(e) => setEnabled(e.target.checked)}
    className="sr-only peer"
    aria-label="Enable feature"
  />
  <div className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
</label>
```

**Alternative (ARIA switch role):**
```tsx
<button
  role="switch"
  aria-checked={enabled}
  onClick={() => setEnabled(!enabled)}
  className="toggle-switch"
>
  <span className="sr-only">Enable Feature</span>
  <div className="toggle-slider"></div>
</button>
```

---

### Pattern 4: Modal Dialogs

**Alert Dialog (Destructive actions):**
```tsx
<div
  role="alertdialog"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-message"
  aria-modal="true"
>
  <h2 id="dialog-title">Delete Item?</h2>
  <p id="dialog-message">This action cannot be undone.</p>
  <button onClick={onCancel}>Cancel</button>
  <button onClick={onConfirm}>Delete</button>
</div>
```

**Regular Dialog:**
```tsx
<div
  role="dialog"
  aria-labelledby="dialog-title"
  aria-modal="true"
>
  <h2 id="dialog-title">Settings</h2>
  <form>...</form>
</div>
```

**Focus Management:**
```tsx
useEffect(() => {
  if (isOpen) {
    // Focus dialog container or first focusable element
    dialogRef.current?.focus();

    // Trap focus within dialog
    // Return focus to trigger element on close
  }
}, [isOpen]);
```

---

### Pattern 5: Grid Widgets

**ARIA Grid Pattern:**
```tsx
<div
  role="grid"
  aria-label="Data grid"
  aria-rowcount={rows.length}
  aria-colcount={cols.length}
  tabIndex={0}
  onKeyDown={handleKeyNav}
>
  {rows.map((row, rowIndex) => (
    <div role="row" key={rowIndex}>
      {row.cells.map((cell, colIndex) => (
        <div
          role="gridcell"
          aria-rowindex={rowIndex + 1}
          aria-colindex={colIndex + 1}
        >
          {cell}
        </div>
      ))}
    </div>
  ))}
</div>
```

**Keyboard Navigation:**
- Arrow keys: Navigate cells
- Home/End: First/last cell in row
- Ctrl+Home/End: First/last cell in grid
- Enter/Space: Activate cell
- Ctrl+A: Select all (if multiselectable)

---

### Pattern 6: Tree View

**ARIA Tree Pattern:**
```tsx
<nav aria-label="Storage Navigator">
  <div role="tree" aria-label="Storage hierarchy">
    <div
      role="treeitem"
      aria-expanded={expanded}
      aria-level={1}
      tabIndex={0}
    >
      Tank 1
      <div role="group">
        <div role="treeitem" aria-level={2} tabIndex={-1}>
          Rack 1
        </div>
      </div>
    </div>
  </div>
</nav>
```

---

### Pattern 7: Collapsible Sections (Disclosure)

**Button + Region Pattern:**
```tsx
<button
  aria-expanded={isOpen}
  aria-controls="section-content"
  onClick={toggle}
>
  {isOpen ? 'Collapse' : 'Expand'} Section
</button>
<div id="section-content" hidden={!isOpen}>
  Content...
</div>
```

**Details/Summary (Native HTML):**
```tsx
<details>
  <summary>Section Title</summary>
  <div>Content...</div>
</details>
```

---

## Summary & Recommendations

### Error Statistics

**Total Errors:** 46

**By Category:**
- Label associations: 25 errors (54%)
- Click events without keyboard: 6 errors (13%)
- Static element interactions: 9 errors (20%)
- Autofocus: 2 errors (4%)
- ARIA role issues: 2 errors (4%)
- Missing ARIA props: 1 error (2%)
- Tabindex misuse: 1 error (2%)

**By Complexity:**

**Safe to fix immediately (29 errors):**
- All label errors (add htmlFor/id or aria-label)
- Simple button conversions (divs to buttons)
- Autofocus removal (focus dialog container instead)
- ARIA attribute additions (aria-controls, aria-label)

**Need careful testing (13 errors):**
- Grid/gridcell roles (verify keyboard navigation still works)
- Tree role restructuring (ensure tree navigation intact)
- Collapsible sections (test expand/collapse behavior)
- Custom select options (verify selection works)

**Require design discussion (4 errors):**
- Toggle switches restructuring (affects visual design)
- Modal focus management (may affect UX flow)
- Grid keyboard navigation pattern (architectural decision)
- Search result cards (consider if these should be links vs buttons)

### Recommended Fix Order

**Phase 1: Low-Risk Label Fixes (1-2 hours)**
1. AuditLogFilterPanel.tsx (2 errors) - Change labels to divs, add groups
2. FilterPanel.tsx (10 errors) - Same pattern
3. ResetPasswordPage.tsx (2 errors) - Add htmlFor/id
4. StorageManagementModal.tsx (5 errors) - Add htmlFor/id
5. RegistrationSuccessModal.tsx (1 error) - Change label to div

**Phase 2: Toggle Switch Fixes (2-3 hours)**
6. SecurityTab.tsx (4 errors) - Add aria-label to checkboxes
7. SystemConfigTab.tsx (1 error) - Same pattern

**Phase 3: Interactive Element Fixes (3-4 hours)**
8. AuditRetentionSettings.tsx (2 errors) - Convert div to button
9. SearchResults.tsx (2 errors) - Convert div to button
10. StorageManagementModal.tsx (5 errors) - Convert collapse divs to buttons
11. GridPosition.tsx (2 errors) - Add gridcell role

**Phase 4: Complex Structural Fixes (4-6 hours)**
12. StorageNavigator.tsx (1 error) - Restructure nav/tree roles
13. TubeGrid.tsx (2 errors) - Add grid role and aria attributes
14. Select.tsx (3 errors) - Add aria-controls, fix option interaction

**Phase 5: UX Improvements (2-3 hours)**
15. DeleteConfirmDialog.tsx (1 error) - Remove autofocus, add focus management
16. OverwriteConfirmDialog.tsx (1 error) - Same pattern

**Total Estimated Time:** 12-18 hours

### Testing Checklist

After implementing fixes, test with:

**Screen Readers:**
- NVDA (Windows) with Firefox
- JAWS (Windows) with Chrome
- VoiceOver (macOS) with Safari

**Keyboard Navigation:**
- Tab/Shift+Tab for focus order
- Enter/Space for activation
- Arrow keys for grids/trees
- Escape for dialogs/dropdowns

**Automated Testing:**
- Re-run ESLint to verify 0 jsx-a11y errors
- Run axe DevTools on each affected page
- Run Lighthouse accessibility audit

**Manual Testing:**
- Test all forms with screen reader
- Navigate grids with keyboard only
- Open/close all modals and verify focus
- Test all collapsible sections
- Verify filter panel navigation

### WCAG Success Criteria Addressed

**Level A:**
- 1.3.1 Info and Relationships
- 2.1.1 Keyboard
- 4.1.2 Name, Role, Value

**Level AA:**
- 2.4.3 Focus Order
- 3.2.1 On Focus
- 3.3.2 Labels or Instructions

### Long-term Recommendations

1. **Component Library:** Create accessible component primitives (Button, Input, Select, Modal) with built-in accessibility
2. **Pre-commit Hook:** Add ESLint jsx-a11y rules to pre-commit to prevent regressions
3. **Documentation:** Document accessibility patterns in component storybook
4. **Training:** Ensure team knows ARIA authoring practices and WCAG guidelines
5. **Automated Testing:** Add jest-axe or similar to unit tests
6. **User Testing:** Conduct usability testing with actual screen reader users

---

## WCAG References

**Success Criteria:**
- [1.3.1 Info and Relationships (Level A)](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html)
- [2.1.1 Keyboard (Level A)](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)
- [2.4.3 Focus Order (Level A)](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)
- [3.2.1 On Focus (Level A)](https://www.w3.org/WAI/WCAG21/Understanding/on-focus.html)
- [3.3.2 Labels or Instructions (Level A)](https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html)
- [4.1.2 Name, Role, Value (Level A)](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html)

**ARIA Authoring Practices:**
- [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- [Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)

**Additional Resources:**
- [WebAIM: Screen Reader User Survey](https://webaim.org/projects/screenreadersurvey9/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [MDN: ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)

---

**Investigation Completed:** 2025-01-10
**Next Steps:** Begin Phase 1 fixes (low-risk label associations)
