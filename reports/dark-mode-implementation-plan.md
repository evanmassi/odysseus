# Dark Mode Implementation Plan

**Created:** 2026-01-13
**Status:** Planning
**Estimated Effort:** 28-38 hours (~1 week)
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

## Phase 2: Dark Palette Definition

**Goal:** Define all dark mode color values
**Effort:** 6-8 hours
**Note:** This phase requires design judgment and may need iteration

### 2.1 Create Dark Variables

**File:** `client/src/shared/styles/base/variables.css` (modify)

```css
/* Light mode (default) */
:root {
  --color-odysseus-primary: #2563eb;
  --color-odysseus-surface: #ffffff;
  --color-odysseus-gray: #f1f5f9;
  --color-odysseus-text-primary: #1e293b;
  --color-odysseus-border: #e2e8f0;
  /* ... 80+ more ... */
}

/* Dark mode overrides */
html[data-theme="dark"] {
  --color-odysseus-primary: #60a5fa;
  --color-odysseus-surface: #1e293b;
  --color-odysseus-gray: #0f172a;
  --color-odysseus-text-primary: #f1f5f9;
  --color-odysseus-border: #334155;
  /* ... matching overrides ... */
}
```

### 2.2 Color Mapping Strategy

| Category | Light Value | Dark Approach |
|----------|-------------|---------------|
| **Page Background** | Gray 100 (#f1f5f9) | Slate 900 (#0f172a) |
| **Card/Surface** | White (#ffffff) | Slate 800 (#1e293b) |
| **Elevated Surface** | White with shadow | Slate 700 (#334155) |
| **Text Primary** | Slate 800 (#1e293b) | Slate 100 (#f1f5f9) |
| **Text Secondary** | Slate 500 (#64748b) | Slate 400 (#94a3b8) |
| **Text Muted** | Slate 400 (#94a3b8) | Slate 500 (#64748b) |
| **Borders** | Gray 200 (#e2e8f0) | Slate 600 (#475569) |
| **Primary Action** | Blue 600 (#2563eb) | Blue 400 (#60a5fa) |
| **Danger** | Red 600 (#dc2626) | Red 400 (#f87171) |
| **Success** | Green 600 (#16a34a) | Green 400 (#4ade80) |
| **Warning** | Amber 500 (#f59e0b) | Amber 400 (#fbbf24) |

### 2.3 Special Color Considerations

**Storage Navigator (Tank/Rack/Box):**
These use distinct hues to indicate hierarchy level. In dark mode:
- Maintain the same hue relationships
- Reduce saturation slightly (vivid colors on dark backgrounds can feel harsh)
- Increase lightness to maintain visibility

**Ownership Colors:**
- User (green), Unassigned (gray), Other (blue) must remain distinguishable
- Test with actual tube grid to ensure colors don't blend together

**Audit Log Colors:**
- Entity types (tube, researcher, user) and action types (create, update, delete) use semantic colors
- These should feel consistent between modes while remaining readable

**Ice Scale (50-900):**
- This gradient is used for data visualization density
- May need to be inverted or adjusted to maintain perceptual uniformity

### 2.4 Design Review Checkpoint

Before proceeding to Phase 3, validate the dark palette by:
1. Applying it manually via browser dev tools
2. Checking contrast ratios meet WCAG AA (4.5:1 for normal text)
3. Reviewing the storage navigator grid with sample data
4. Getting feedback from at least one other person

**This is the phase most likely to need iteration.** Budget time for 1-2 revision rounds.

---

## Phase 3: Fix Hardcoded Colors

**Goal:** Replace all hardcoded colors with CSS variables
**Effort:** 8-12 hours

### 3.1 High Priority Files

These are seen by every user on every session:

| File | Hardcoded Values | Replacement |
|------|------------------|-------------|
| `BaseModal.tsx` | `bg-white`, `border-gray-200`, `text-slate-*` | `bg-odysseus-surface`, `border-odysseus-border`, `text-odysseus-text-*` |
| `AppHeader.tsx` | `bg-white/90`, `text-blue-800` | CSS variables with opacity support |
| `buttons.css` | `bg-white`, `text-gray-700`, `border-gray-300` | Variable-based button styles |
| `focus.css` | `#3b82f6` hardcoded hex | `var(--focus-ring-color)` |

### 3.2 Medium Priority Files

Settings and configuration screens:

| File | Issues |
|------|--------|
| `UserSettingsModal.tsx` | Tab styling uses `slate-*` colors |
| `PositionDisplayPreferenceTab.tsx` | `gray-*` and `white` references |
| `Input.tsx` | Some validation state borders hardcoded |
| `Select.tsx` | Dropdown styling may have hardcoded values |

### 3.3 Lower Priority Files

Less frequently accessed:

- Audit log table and filters
- Admin user management panels
- Error boundary fallback UI
- Loading spinner containers

### 3.4 Replacement Mapping Reference

| Hardcoded Class | Replace With |
|-----------------|--------------|
| `bg-white` | `bg-odysseus-surface` |
| `bg-gray-50`, `bg-gray-100` | `bg-odysseus-gray` |
| `bg-slate-50` | `bg-odysseus-gray` |
| `text-gray-700`, `text-gray-800` | `text-odysseus-text-primary` |
| `text-gray-500`, `text-gray-600` | `text-odysseus-text-secondary` |
| `text-slate-800`, `text-slate-900` | `text-odysseus-text-primary` |
| `text-slate-500`, `text-slate-600` | `text-odysseus-text-secondary` |
| `border-gray-200`, `border-gray-300` | `border-odysseus-border` |
| `border-slate-200` | `border-odysseus-border` |
| `hover:bg-gray-50` | `hover:bg-odysseus-surface-hover` |

### 3.5 Third-Party Components

**React Hot Toast:**

The toast notification library needs explicit dark mode configuration.

**File:** Where toast is configured (likely `client/src/app/` or a notifications utility)

```typescript
import { Toaster } from 'react-hot-toast';

<Toaster
  toastOptions={{
    style: {
      background: 'var(--color-odysseus-surface)',
      color: 'var(--color-odysseus-text-primary)',
      border: '1px solid var(--color-odysseus-border)',
    },
  }}
/>
```

**Other potential libraries to check:**
- Date pickers (if any)
- Dropdown/select libraries (if not custom)
- Tooltip libraries

---

## Phase 4: UI Integration

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

## Phase 5: Testing & Polish

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

### Recommended Sequence (5-6 days)

| Day | Phase | Tasks | Deliverable |
|-----|-------|-------|-------------|
| **Day 1** | 0 + 1 | Flash prevention script (cookie-based), schema, context, provider, Tailwind config | Theme infrastructure complete, can toggle via dev tools |
| **Day 2** | 2 | Define all 90+ dark color values, test basic screens | Dark palette defined, manual testing passes |
| **Day 3** | 2 + 3 | Palette refinement based on testing, high-priority component fixes | Modals and header work correctly in dark mode |
| **Day 4** | 3 + 4 | Remaining component fixes, theme toggle UI, settings integration | User-facing toggle works, most components themed |
| **Day 5** | 5 | Third-party components, cross-browser testing | Feature complete |
| **Day 6** | 5 | Polish, edge cases, documentation, final review | Ready for release |

---

## Files Summary

### New Files to Create

| Path | Purpose |
|------|---------|
| `client/src/app/contexts/ThemeContext.tsx` | Theme state management |
| `client/src/app/providers/ThemeProvider.tsx` | Theme provider wrapper |
| `client/src/shared/ui/components/ThemeToggle.tsx` | Toggle UI component |

### Files to Modify

| Path | Changes |
|------|---------|
| `client/index.html` | Add inline theme script (cookie-based) for flash prevention |
| `packages/shared-schemas/src/users/userSettingsSchemas.ts` | Add theme field to schema |
| `client/src/shared/styles/base/variables.css` | Add complete dark palette (~90 variables) |
| `client/tailwind.config.js` | Enable `darkMode: 'class'` |
| `client/src/app/providers.tsx` | Wrap with ThemeProvider |
| `client/src/shared/ui/components/modals/BaseModal.tsx` | Replace hardcoded colors |
| `client/src/domains/authentication/ui/components/UserSettingsModal.tsx` | Replace hardcoded colors |
| `client/src/domains/authentication/ui/components/tabs/PositionDisplayPreferenceTab.tsx` | Replace colors, add theme section |
| `client/src/shared/styles/components/buttons.css` | Replace hardcoded colors |
| `client/src/shared/styles/utilities/focus.css` | Use CSS variable for focus ring |
| `client/src/app/components/layout/AppHeader.tsx` | Replace hardcoded colors |
| `client/src/domains/users/services/UserSettingsService.ts` | Add theme persistence logic (cookie + server) |
| Toast configuration file | Configure React Hot Toast for theming |
| ~40-50 additional component files | Replace hardcoded color classes |

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

## Appendix A: Color Variable Inventory

Full list of variables requiring dark mode definitions:

**Core Odysseus Colors (7):**
`--color-odysseus-primary`, `--color-odysseus-secondary`, `--color-odysseus-accent`, `--color-odysseus-gray`, `--color-odysseus-dark`, `--color-odysseus-surface`, `--color-odysseus-border`

**Text Colors (3):**
`--color-odysseus-text-primary`, `--color-odysseus-text-secondary`, `--color-odysseus-text-muted`

**Action Colors (10):**
`--color-action`, `--color-action-hover`, `--color-danger`, `--color-danger-hover`, `--color-edit`, `--color-copy`, `--color-cut`, `--color-lock`, `--color-share`, `--color-cancel`

**Semantic Colors (6):**
`--color-warning`, `--color-success`, `--color-info`, `--color-validation-error`, `--color-validation-warning`, `--color-validation-success`

**Ice Scale (10):**
`--color-ice-50` through `--color-ice-900`

**Storage Navigator (~15):**
Tank, Rack, Box variants for background, text, border, and hover states

**Ownership (~9):**
User, Unassigned, Other variants for background, text, and border

**Audit Log (~12):**
Entity type colors and action type colors

**Focus System (2):**
`--focus-ring-color`, `--focus-ring-offset`

**Total: ~90 variables**

---

## Appendix B: Contrast Testing Resources

- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **Chrome DevTools:** Inspect element → Accessibility panel shows contrast ratio
- **Stark (Figma plugin):** For design validation before implementation

**WCAG AA Requirements:**
- Normal text: 4.5:1 minimum contrast ratio
- Large text (18px+ or 14px+ bold): 3:1 minimum
- UI components and graphics: 3:1 minimum
