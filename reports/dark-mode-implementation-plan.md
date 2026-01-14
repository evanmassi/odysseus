# Dark Mode Implementation Plan

**Created:** 2026-01-13
**Last Updated:** 2026-01-14
**Status:** Phase 0+1 Complete, Phase 2 In Progress
**Estimated Effort:** 25-30 hours remaining
**Target Platform:** Web application (Vercel frontend, Railway backend)

---

## Executive Summary

Adding dark mode to Odysseus is achievable thanks to the existing CSS variable system. Approximately 85% of the app's colors already use centralized variables, meaning a dark palette can be "plugged in" with targeted component changes. The user settings infrastructure already exists with a Display Preferences tab ready for the theme toggle.

**Key considerations:**
- The dark palette definition requires design judgment, not just color inversion
- Theme must load before React renders to prevent "flash of wrong theme"
- Third-party components (React Hot Toast) need explicit theme configuration
- Using cookies (not localStorage) for better persistence across browser data clearing

---

## Current State Assessment

### What's Already in Place

| Component | Status | Notes |
|-----------|--------|-------|
| CSS Variable System | Ready | 90+ color variables in `variables.css` |
| User Settings Schema | Ready | Comments explicitly anticipate theme field |
| Settings Modal | Ready | Display Preferences tab exists |
| Settings Persistence | Ready | Server-side user settings storage works |
| React Query Hooks | Ready | `useUserSettings` already implemented |
| Socket.IO Events | Ready | Can broadcast theme changes to other browser tabs |

### What Needs Work

| Component | Issue | Effort |
|-----------|-------|--------|
| Flash prevention | No pre-React theme loading | 2 hours |
| Dark palette | Requires design decisions for 90+ colors | 6-8 hours |
| Theme context/provider | Doesn't exist | 2-3 hours |
| Hardcoded colors | ~150 instances in components | 8-12 hours |
| Theme toggle UI | Doesn't exist | 2-3 hours |
| Third-party theming | React Hot Toast needs configuration | 1-2 hours |
| Focus ring system | Partially hardcoded | 1 hour |

---

## Phase 0: Flash Prevention

**Goal:** Ensure correct theme applies before any UI renders
**Effort:** 2 hours

### The Problem

When a user with dark mode preference opens the app, React needs to:
1. Mount components
2. Initialize React Query
3. Fetch user settings from server
4. Apply theme

This causes a visible "flash" of light theme before dark mode activates.

### The Solution

**File:** `client/index.html` (modify)

Add inline script that runs before React, reading from a **cookie** (not localStorage):

```html
<script>
  (function() {
    // Read theme from cookie (survives "clear site data" better than localStorage)
    function getCookie(name) {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    }

    const stored = getCookie('odysseus-theme');
    let theme = 'light';

    if (stored === 'dark') {
      theme = 'dark';
    } else if (stored === 'auto' || !stored) {
      // No preference or "auto" - check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
      }
    }

    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

**Why inline script:** External scripts can be delayed. Inline scripts in `<head>` execute synchronously before body parsing, guaranteeing theme applies before any content renders.

**Why cookies instead of localStorage:**
- Cookies often survive "Clear browsing data" operations (users typically clear cache/localStorage but keep cookies)
- Cookies can be set with longer expiration (e.g., 1 year)
- Future enhancement: Vercel middleware can read cookies and pre-render themed HTML

### Dual Persistence Strategy

Theme preference is stored in two places:

| Location | Purpose | Speed | Survives Data Clearing |
|----------|---------|-------|------------------------|
| Cookie | Immediate access on page load | Instant | Usually yes |
| Server (user settings) | Authoritative source, syncs across devices | ~100-500ms | Always (server-side) |

**Flow:**
1. On load: Read cookie, apply theme immediately
2. After React mounts: Fetch server settings via React Query
3. If server differs from cookie: Update cookie, re-apply theme
4. On theme change: Write to both cookie and server

**Edge case:** If user clears cookies AND their OS theme differs from their saved preference, they'll see one flash before React syncs with the server. This is rare and self-corrects immediately.

### Cookie Configuration

```typescript
// Helper to set theme cookie (used by ThemeProvider)
function setThemeCookie(theme: string) {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1); // 1 year expiration
  document.cookie = `odysseus-theme=${theme}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}
```

---

## Phase 1: Foundation

**Goal:** Create the infrastructure for theming
**Effort:** 4-5 hours

### 1.1 Extend User Settings Schema

**File:** `packages/shared-schemas/src/users/userSettingsSchemas.ts`

```typescript
export const themePreferenceSchema = z.enum(['light', 'dark', 'auto']);
export type ThemePreference = z.infer<typeof themePreferenceSchema>;

export const userSettingsSchema = z.object({
  defaultPositionDisplay: positionDisplayPreferenceSchema.optional(),
  theme: themePreferenceSchema.default('auto').optional(),
}).strict();
```

**Migration note:** Existing users have no `theme` field. The schema defaults to `'auto'`, so undefined gracefully becomes system-preference-following behavior.

### 1.2 Create Theme Context

**File:** `client/src/app/contexts/ThemeContext.tsx` (new)

```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark';           // Resolved theme (never 'auto')
  preference: ThemePreference;        // User's setting ('light' | 'dark' | 'auto')
  setPreference: (pref: ThemePreference) => void;
  systemPreference: 'light' | 'dark'; // Current OS preference
}
```

**Responsibilities:**
- Detect system preference via `matchMedia('(prefers-color-scheme: dark)')`
- Listen for system preference changes (user toggles OS dark mode)
- Resolve 'auto' to actual theme based on system
- Apply `data-theme` attribute to `<html>` element
- Sync cookie on every change
- Sync server settings via React Query mutation

### 1.3 Add Theme Provider

**File:** `client/src/app/providers/ThemeProvider.tsx` (new)

```typescript
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read initial preference from cookie (already applied by inline script)
  // Set up system preference listener
  // Sync with server settings when available
  // Provide context to children
};
```

**Integration:** Add to `client/src/app/providers.tsx` wrapping the app.

### 1.4 Update Tailwind Configuration

**File:** `client/tailwind.config.js`

```javascript
module.exports = {
  darkMode: 'class', // Use class/attribute strategy for explicit control
  // ... rest of config
}
```

**Why 'class' instead of 'media':** The `class` strategy allows explicit user control. The `media` strategy would only follow OS settings with no user override option.

### 1.5 Theme Transition Animation

**Decision required:** When user switches theme, should colors:
- **Snap instantly** (simpler, no performance overhead)
- **Fade over 150-200ms** (feels more polished)

If fade is desired, add to `variables.css`:

```css
:root {
  --theme-transition-duration: 200ms;
}

* {
  transition: background-color var(--theme-transition-duration),
              border-color var(--theme-transition-duration),
              color var(--theme-transition-duration);
}
```

**Trade-off:** Transitions can cause performance issues on slower machines. Consider making this optional or limiting to specific properties.

---

## Phase 2: Color System Cleanup & Standardization

**Goal:** Create a clean, professional color system before defining dark palette
**Effort:** 15-20 hours
**Note:** This is prerequisite work that enables maintainable dark mode

### Why This Phase Matters

The current codebase has:
- ~714 hardcoded color occurrences across 64+ files
- `odysseus-*` prefixed variables (non-standard for application code)
- ~15 unused CSS variables (dead code)
- Inconsistent usage of Tailwind defaults vs custom variables

Industry standard for applications is generic semantic names (like shadcn/ui, GitHub Primer). The `odysseus-*` prefix is typically used by framework/library authors to avoid namespace conflicts - unnecessary for an application.

---

### Phase 2a: Foundation - Rename & Clean CSS Variables

**Goal:** Establish clean, semantic naming convention

#### Variable Renaming

| Current Variable | New Variable | Purpose |
|-----------------|--------------|---------|
| `--color-odysseus-primary` | `--color-primary` | Brand/action color |
| `--color-odysseus-secondary` | `--color-secondary` | Secondary actions |
| `--color-odysseus-accent` | `--color-accent` | Accent highlights |
| `--color-odysseus-surface` | `--color-surface` | Primary backgrounds (cards, modals) |
| `--color-odysseus-surface-hover` | `--color-surface-hover` | Hover states |
| `--color-odysseus-gray` | `--color-muted` | Subtle backgrounds |
| `--color-odysseus-dark` | `--color-dark` | Dark elements |
| `--color-odysseus-border` | `--color-border` | Default borders |
| `--color-odysseus-text-primary` | `--color-text-primary` | Main text |
| `--color-odysseus-text-secondary` | `--color-text-secondary` | Muted text |
| `--color-odysseus-muted` | `--color-text-muted` | Very muted text |
| `--color-odysseus-input` | `--color-input` | Input backgrounds |

#### Unused Variables to Remove

These are confirmed unused (no Tailwind classes reference them):

- All `--color-storage-*` variables (~12 variables)
- All `--color-ownership-*` variables (~12 variables)
- Any other confirmed dead code

#### Files to Modify

| File | Changes |
|------|---------|
| `client/src/shared/styles/base/variables.css` | Rename variables, remove unused |
| `client/tailwind.config.js` | Update color mappings to new names |

#### Tailwind Config Changes

```javascript
// Before
colors: {
  odysseus: {
    primary: 'var(--color-odysseus-primary)',
    surface: 'var(--color-odysseus-surface)',
    // ...
  }
}

// After
colors: {
  primary: 'var(--color-primary)',
  surface: 'var(--color-surface)',
  'surface-hover': 'var(--color-surface-hover)',
  muted: 'var(--color-muted)',
  border: 'var(--color-border)',
  // Semantic text colors
  'text-primary': 'var(--color-text-primary)',
  'text-secondary': 'var(--color-text-secondary)',
  // ...
}
```

---

### Phase 2b: Update Existing Odysseus Usages

**Goal:** Replace all `odysseus-*` class usages with new semantic names

This is mechanical find-and-replace:

| Old Class | New Class |
|-----------|-----------|
| `bg-odysseus-surface` | `bg-surface` |
| `bg-odysseus-surface-hover` | `bg-surface-hover` |
| `bg-odysseus-gray` | `bg-muted` |
| `text-odysseus-text-primary` | `text-text-primary` |
| `text-odysseus-text-secondary` | `text-text-secondary` |
| `border-odysseus-border` | `border-border` |
| `bg-odysseus-primary` | `bg-primary` |
| etc. | etc. |

**Files affected:** Any file currently using `odysseus-*` classes

---

### Phase 2c: Replace Hardcoded Tailwind Colors

**Goal:** Replace all hardcoded gray/slate/white/blue classes with semantic tokens

#### Color Mapping Reference

| Hardcoded Class | Semantic Replacement | Reasoning |
|-----------------|---------------------|-----------|
| `bg-white` | `bg-surface` | Card/modal backgrounds |
| `bg-gray-50` | `bg-surface` or `bg-muted` | Light backgrounds |
| `bg-gray-100` | `bg-surface-hover` or `bg-muted` | Slightly darker backgrounds |
| `bg-slate-50` | `bg-surface` | Light backgrounds |
| `bg-slate-100` | `bg-surface-hover` | Hover states |
| `text-gray-900` | `text-text-primary` | Primary text |
| `text-gray-700`, `text-gray-800` | `text-text-primary` | Primary text |
| `text-gray-500`, `text-gray-600` | `text-text-secondary` | Secondary/muted text |
| `text-slate-900` | `text-text-primary` | Primary text |
| `text-slate-600`, `text-slate-700` | `text-text-secondary` | Secondary text |
| `border-gray-200`, `border-gray-300` | `border-border` | Standard borders |
| `border-slate-200` | `border-border` | Standard borders |
| `hover:bg-gray-50` | `hover:bg-surface-hover` | Hover states |
| `hover:bg-gray-100` | `hover:bg-surface-hover` | Hover states |
| `bg-blue-600` | `bg-action` or `bg-primary` | Primary buttons |
| `text-blue-600` | `text-action` or `text-primary` | Links, interactive text |

#### Priority Order

**1. CSS Files (fix once, affects everything):**
- `buttons.css` - Button variants
- `inputs.css` - Form inputs
- `badges.css` - Badge styles
- `focus.css` - Focus ring system

**2. High-Impact Components (25+ occurrences each):**
- `BaseModal.tsx`
- `AppHeader.tsx`
- `UserSettingsModal.tsx`
- `Input.tsx`
- `Select.tsx`
- Table components
- Form components

**3. Remaining Components (~50 files):**
- All other files with hardcoded colors

#### Third-Party Components

**React Hot Toast:**
```typescript
<Toaster
  toastOptions={{
    style: {
      background: 'var(--color-surface)',
      color: 'var(--color-text-primary)',
      border: '1px solid var(--color-border)',
    },
  }}
/>
```

---

### Phase 2d: Dark Palette Definition

**Goal:** Define all dark mode color values (after cleanup is complete)

**File:** `client/src/shared/styles/base/variables.css`

```css
/* Light mode (default) */
:root {
  --color-primary: #2563eb;
  --color-surface: #ffffff;
  --color-muted: #f1f5f9;
  --color-text-primary: #1e293b;
  --color-border: #e2e8f0;
  /* ... */
}

/* Dark mode overrides */
html[data-theme="dark"] {
  --color-primary: #60a5fa;
  --color-surface: #1e293b;
  --color-muted: #0f172a;
  --color-text-primary: #f1f5f9;
  --color-border: #334155;
  /* ... */
}
```

#### Color Mapping Strategy

| Category | Light Value | Dark Approach |
|----------|-------------|---------------|
| **Page Background** | Gray 100 (#f1f5f9) | Slate 900 (#0f172a) |
| **Card/Surface** | White (#ffffff) | Slate 800 (#1e293b) |
| **Elevated Surface** | White with shadow | Slate 700 (#334155) |
| **Text Primary** | Slate 800 (#1e293b) | Slate 100 (#f1f5f9) |
| **Text Secondary** | Slate 500 (#64748b) | Slate 400 (#94a3b8) |
| **Borders** | Gray 200 (#e2e8f0) | Slate 600 (#475569) |
| **Primary Action** | Blue 600 (#2563eb) | Blue 400 (#60a5fa) |
| **Danger** | Red 600 (#dc2626) | Red 400 (#f87171) |
| **Success** | Green 600 (#16a34a) | Green 400 (#4ade80) |
| **Warning** | Amber 500 (#f59e0b) | Amber 400 (#fbbf24) |

#### Design Review Checkpoint

Before proceeding to Phase 3, validate the dark palette by:
1. Applying it manually via browser dev tools
2. Checking contrast ratios meet WCAG AA (4.5:1 for normal text)
3. Reviewing key screens with sample data
4. Getting feedback from at least one other person

---

## Phase 3: UI Integration

**Goal:** Add the theme toggle to user interface
**Effort:** 3-4 hours

### 4.1 Create Theme Toggle Component

**File:** `client/src/shared/ui/components/ThemeToggle.tsx` (new)

A segmented control with three options:

| Option | Icon | Behavior |
|--------|------|----------|
| Light | Sun | Always light mode |
| Dark | Moon | Always dark mode |
| Auto | Monitor/Computer | Follow OS setting |

Use Lucide React icons: `Sun`, `Moon`, `Monitor`

### 4.2 Add to Display Preferences

**File:** `client/src/domains/authentication/ui/components/tabs/PositionDisplayPreferenceTab.tsx` (modify)

Add a "Theme" section above or below the position display preference:

```
Theme
─────────────────────────────
○ Light        ○ Dark        ● System Default

System Default automatically matches your operating
system's appearance settings.
```

Alternatively, create a dedicated tab if the Display Preferences tab becomes too crowded.

### 4.3 Multi-Tab Sync

When user changes theme in one browser tab, other tabs should update.

**Approach:** Use existing Socket.IO infrastructure:

1. When theme changes, emit `user_settings_updated` event
2. Other tabs receive event, invalidate React Query settings cache
3. Theme provider reacts to new settings, updates theme

This should work with existing patterns - verify during testing.

### 4.4 Update Settings Service

**File:** `client/src/domains/users/services/UserSettingsService.ts` (modify)

The existing `updateUserSettings` method should handle theme. Add cookie sync:

```typescript
async updateThemePreference(theme: ThemePreference): Promise<void> {
  // Update cookie immediately (for next page load)
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `odysseus-theme=${theme}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

  // Update server (authoritative source)
  await this.updateUserSettings({ theme });
}
```

---

## Phase 4: Testing & Polish

**Goal:** Ensure quality across all scenarios
**Effort:** 6-8 hours

### 5.1 Visual Testing Checklist

- [ ] App header renders correctly in both modes
- [ ] All modal types (BaseModal, confirmation dialogs) render correctly
- [ ] Storage navigator grid colors distinguishable in both modes
- [ ] Form inputs clearly visible with proper borders
- [ ] Validation error/success states visible
- [ ] Icons have proper contrast
- [ ] Loading spinners visible
- [ ] Toast notifications readable
- [ ] Dropdown menus styled correctly
- [ ] Scrollbars visible (may need custom styling in dark mode)

### 5.2 Functional Testing Checklist

- [ ] Theme preference persists across browser restart
- [ ] Theme syncs across multiple browser tabs
- [ ] "Auto" mode responds when OS theme changes
- [ ] No flash of wrong theme on initial load
- [ ] Settings save correctly to server
- [ ] Theme preference survives "Clear browsing data" (cookie persistence)
- [ ] Existing users without theme setting default to 'auto'
- [ ] Theme works when server is temporarily unreachable (cookie fallback)

### 5.3 Accessibility Testing

- [ ] All text meets WCAG AA contrast ratio (4.5:1)
- [ ] Focus indicators visible in both modes
- [ ] No information conveyed by color alone

### 5.4 Edge Cases

- [ ] Theme switch while modal is open
- [ ] Theme switch during data loading/saving
- [ ] App behavior when server unreachable (cookie fallback)
- [ ] Very long content (scrolling behavior)
- [ ] Print output unaffected by dark mode (if printing is supported)
- [ ] User clears cookies while OS differs from saved preference (rare flash, self-corrects)

---

## Implementation Schedule

### Recommended Sequence

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **Phase 0 + 1** (Complete) | Flash prevention script (cookie-based), schema, context, provider, Tailwind config | Theme infrastructure complete, can toggle via dev tools |
| **Phase 2a** | Rename CSS variables, remove unused, update Tailwind config | Clean semantic variable system |
| **Phase 2b** | Replace all `odysseus-*` class usages with new names | All components use new naming |
| **Phase 2c** | Replace hardcoded Tailwind colors in CSS files and components | Fully centralized color system |
| **Phase 2d** | Define dark mode color values | Dark palette defined, can test in browser |
| **Phase 3** | Theme toggle UI, settings integration, multi-tab sync | User-facing toggle works |
| **Phase 4** | Testing, accessibility validation, polish | Ready for release |

---

## Files Summary

### New Files Created (Phase 0+1 Complete)

| Path | Purpose | Status |
|------|---------|--------|
| `client/src/app/contexts/ThemeContext.tsx` | Theme state management | Done |
| `client/src/shared/ui/components/ThemeToggle.tsx` | Toggle UI component | Phase 3 |

### Files Modified (Phase 0+1 Complete)

| Path | Changes | Status |
|------|---------|--------|
| `client/index.html` | Inline theme script (cookie-based) for flash prevention | Done |
| `packages/shared-schemas/src/users/userSettingsSchemas.ts` | Theme field in schema | Done |
| `client/tailwind.config.js` | `darkMode: ['class', '[data-theme="dark"]']` | Done |
| `client/src/app/providers.tsx` | Wrapped with ThemeProvider | Done |
| `client/src/domains/users/services/UserSettingsService.ts` | Theme persistence (cookie + server) | Done |
| `client/src/domains/authentication/hooks/useUserSettings.ts` | Theme hooks | Done |

### Files to Modify (Phase 2)

| Path | Changes |
|------|---------|
| `client/src/shared/styles/base/variables.css` | Rename variables (drop `odysseus-`), remove unused, add dark palette |
| `client/tailwind.config.js` | Update color mappings to new semantic names |
| `client/src/shared/styles/components/buttons.css` | Replace hardcoded colors |
| `client/src/shared/styles/components/inputs.css` | Replace hardcoded colors |
| `client/src/shared/styles/utilities/focus.css` | Use CSS variable for focus ring |
| `client/src/shared/ui/components/modals/BaseModal.tsx` | Replace hardcoded colors |
| `client/src/app/components/layout/AppHeader.tsx` | Replace hardcoded colors |
| `client/src/domains/authentication/ui/components/UserSettingsModal.tsx` | Replace hardcoded colors |
| Toast configuration | Configure React Hot Toast for theming |
| ~60 additional component files | Replace hardcoded color classes, update `odysseus-*` usages |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Dark palette needs multiple iterations | High | Medium | Budget Day 3 for refinement, get early feedback |
| Flash of wrong theme | Low | High | Cookie-based inline script runs before React |
| Third-party components don't theme well | Medium | Low | Most can be configured; worst case, override styles |
| Some colors unreadable in dark mode | Medium | Medium | WCAG contrast testing, user feedback |
| Cookie cleared + OS differs from preference | Low | Low | Rare edge case; self-corrects when React syncs with server |
| Multi-tab sync doesn't work | Low | Low | Existing Socket.IO patterns should handle it |
| Performance impact from transitions | Low | Low | Make transitions optional or limit to key properties |

---

## Success Criteria

- [ ] User can choose Light, Dark, or Auto in Display Preferences
- [ ] Preference persists across browser restarts
- [ ] Preference syncs across multiple browser tabs
- [ ] Auto mode follows OS dark mode setting
- [ ] No flash of wrong theme on app startup
- [ ] All UI elements readable with WCAG AA contrast
- [ ] No visual regressions in light mode
- [ ] Theme applies instantly without page reload
- [ ] Theme preference survives typical "Clear browsing data" operations

---

## Future Enhancements (Out of Scope)

1. **Vercel Edge Middleware** - Read cookie server-side and inject `data-theme` into HTML before it reaches the browser (eliminates even the rare edge-case flash)
2. **Custom accent colors** - Let users pick their own primary color
3. **High contrast mode** - Accessibility enhancement beyond standard dark mode
4. **Scheduled themes** - Auto-switch based on time of day

---

## Appendix A: Color Variable Inventory (Post-Cleanup)

Full list of semantic variables requiring dark mode definitions:

**Core Colors (7):**
`--color-primary`, `--color-secondary`, `--color-accent`, `--color-muted`, `--color-dark`, `--color-surface`, `--color-surface-hover`

**Border & Input (2):**
`--color-border`, `--color-input`

**Text Colors (3):**
`--color-text-primary`, `--color-text-secondary`, `--color-text-muted`

**Action Colors (3):**
`--color-action-default`, `--color-action-hover`, `--color-action-focus`

**Semantic State Colors - Each with bg/hover/text/btnText variants (~24):**
- Edit: `--color-edit-*`
- Copy: `--color-copy-*`
- Cut: `--color-cut-*`
- Danger: `--color-danger-*`
- Warning: `--color-warning-*`
- Success: `--color-success-*`
- Info: `--color-info-*`
- Lock: `--color-lock-*`
- Share: `--color-share-*`

**Validation Colors (~15):**
Error, Warning, Success variants for border, bg, text, label, ring, icon

**Ice Scale (10):**
`--color-ice-50` through `--color-ice-900`

**Focus System (2):**
`--focus-ring-color`, `--focus-ring-offset`

**Frost (1):**
`--color-frost`

**Total after cleanup: ~65-70 variables** (reduced from ~90 by removing unused storage/ownership colors)

---

## Appendix B: Contrast Testing Resources

- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **Chrome DevTools:** Inspect element → Accessibility panel shows contrast ratio
- **Stark (Figma plugin):** For design validation before implementation

**WCAG AA Requirements:**
- Normal text: 4.5:1 minimum contrast ratio
- Large text (18px+ or 14px+ bold): 3:1 minimum
- UI components and graphics: 3:1 minimum
