# Task: DropdownMenu Primitive + Logo Suite Switcher Refactor

## Context

The Odysseus app has 4 separately implemented dropdown menus that all share the same visual pattern but are individually coded. This creates tech debt. We need to:

1. Extract a shared `DropdownMenu` primitive
2. Migrate existing menus to use it
3. Build the new logo suite switcher dropdown with submenu support

## Standards Files (READ FIRST)

- `C:\Users\evan\.claude\instructions.md` — global Claude Code instructions
- `AGENTS.md` — project architecture, naming conventions, code quality rules, comment standards
- `C:\Users\evan\Desktop\Odysseus\audit-prompt.txt` — audit/review standards for file headers, comments, naming

## Reference Files — Existing Menu Implementations

Read these to understand the 4 current patterns before building the primitive:

1. **Hamburger menu** — `client/src/app/components/layout/AppHeader.tsx`
   - Search for `showHamburgerMenu` and `HamburgerMenuItem`
   - Absolute positioned, animated open/close (`animate-dropdown-reveal-in/out`)
   - Uses `useMenuKeyboardNavigation` from `@shared/hooks`
   - Click-outside handling with animated close (`closeMenu` callback)

2. **OverflowMenu primitive** — `client/src/shared/ui/primitives/menus/OverflowMenu.tsx`
   - Types: `client/src/shared/ui/primitives/menus/types.ts`
   - Portal rendered via `createPortal` (for z-index in scrollable containers)
   - Uses `useMenuKeyboardNavigation`
   - Has `dividerBefore` support, `danger` and `disabled` item variants

3. **Context menu** — `client/src/domains/tubes/ui/components/grid/TubeGridContextMenu.tsx`
   - Fixed positioned at mouse coordinates
   - Uses `useMenuKeyboardNavigation`
   - Has keyboard shortcut hints on items
   - Different enough that it may stay standalone, just using shared `MenuItem`

4. **Logo suite dropdown** (current, to be replaced) — `client/src/app/components/layout/AppHeader.tsx`
   - Search for `showSuiteDropdown` and `suiteDropdownRef`
   - Currently a bare `div` with inline buttons, no animation, no keyboard nav
   - Needs to become: Biobank | Lab Management → (submenu: Equipment, Consumables, Reagents)

## Shared Infrastructure

- `useMenuKeyboardNavigation` — `client/src/shared/hooks/` (find exact file)
- Common styling: `bg-popover rounded-lg shadow-lg border border-border py-1.5`
- Animation classes: `animate-dropdown-reveal-in` / `animate-dropdown-reveal-out` defined in `client/src/shared/styles/components/modal-animations.css`

## Plan

### Step 1: Create `DropdownMenu` Primitive

**Create:** `client/src/shared/ui/primitives/menus/DropdownMenu.tsx`

A composable dropdown menu component:

```
Props:
- trigger: ReactNode (the element that opens the menu)
- isOpen: boolean
- onClose: () => void
- position?: 'absolute' | 'fixed' | 'portal' (default: 'absolute')
- align?: 'left' | 'right' (default: 'left')
- className?: string (for width overrides etc.)
- animated?: boolean (default: true)
- children: ReactNode (menu content — MenuItem components)
```

Handles:

- Click-outside detection
- Keyboard navigation via `useMenuKeyboardNavigation`
- Animated open/close (`animate-dropdown-reveal-in/out`)
- Portal rendering when `position="portal"`
- Proper z-indexing

### Step 2: Create/Update `MenuItem` Primitive

**Update:** `client/src/shared/ui/primitives/menus/types.ts` and create `MenuItem.tsx` if needed

Extract the menu item rendering from `OverflowMenu` into a standalone component:

```
Props:
- icon?: LucideIcon
- label: string
- onClick: () => void
- danger?: boolean
- disabled?: boolean
- shortcut?: string (for context menu keyboard hints)
- hasSubmenu?: boolean (shows arrow indicator)
- isActive?: boolean (shows checkmark or highlight)
- children?: ReactNode (for submenu content)
```

### Step 3: Create `MenuDivider` Primitive

Already exists inside `OverflowMenu.tsx` as a private component. Extract it.

### Step 4: Migrate OverflowMenu

Refactor `OverflowMenu.tsx` to use `DropdownMenu` + `MenuItem` internally. Its public API (`OverflowMenuProps`) stays the same — this is an internal refactor only.

### Step 5: Migrate Hamburger Menu

Refactor the hamburger menu in `AppHeader.tsx` to use `DropdownMenu` + `MenuItem`. Replace the `HamburgerMenuItem` component with `MenuItem`. The hamburger-specific behavior (animated close timeout, lab name header) stays but uses the shared dropdown shell.

### Step 6: Build Logo Suite Switcher

Replace the current bare logo dropdown in `AppHeader.tsx` with a proper `DropdownMenu` using `MenuItem` components:

- **Biobank** — `MenuItem` with `FlaskConical` icon, `isActive` when on biobank route, navigates to `/`
- **Lab Management** — `MenuItem` with `Wrench` icon, `hasSubmenu: true`, `isActive` when on `/lab/*`
  - Submenu items: Equipment (`/lab/equipment`), Consumables (disabled), Reagents (disabled)

The submenu should appear on hover/click of the Lab Management item, positioned to the right.

The context label below the logo should show:

- "Biobank" when on `/`
- "Lab Management" when on `/lab/*`

### Step 7: Consider Context Menu

Evaluate whether `TubeGridContextMenu` should migrate. It's positioned at mouse coordinates (not anchored to a trigger), so it may stay standalone but use the shared `MenuItem` component for its items. Don't force it if the abstraction doesn't fit cleanly.

## Key Architectural Decisions

- `DropdownMenu` is a **controlled component** (`isOpen` + `onClose`). The parent manages open state.
- `MenuItem` is a **presentational component**. It renders the item and calls `onClick`. It doesn't manage menu state.
- The `OverflowMenu` remains as a convenience wrapper that manages its own trigger button + open state, using `DropdownMenu` internally.
- The hamburger menu keeps its custom header (lab name) and footer (logout) — `DropdownMenu` accepts `children` so these render naturally.

## Files to Create

- `client/src/shared/ui/primitives/menus/DropdownMenu.tsx`
- `client/src/shared/ui/primitives/menus/MenuItem.tsx` (if extracting from OverflowMenu)
- Update `client/src/shared/ui/primitives/menus/index.ts` (barrel export)
- Update `client/src/shared/ui/primitives/index.ts` (re-export)
- Update `client/src/shared/ui/index.ts` (public API export)

## Files to Modify

- `client/src/shared/ui/primitives/menus/OverflowMenu.tsx` — refactor internals
- `client/src/app/components/layout/AppHeader.tsx` — hamburger menu + logo dropdown
- Potentially `client/src/domains/tubes/ui/components/grid/TubeGridContextMenu.tsx`

## Testing

After each migration step, verify:

- Menu opens/closes correctly
- Click-outside closes the menu
- Keyboard navigation works (arrow keys, Enter, Escape)
- Animation plays on open/close
- No nested button warnings
- Existing behavior unchanged (hamburger items still open modals, overflow items still fire actions)
- Logo dropdown submenu appears and navigates correctly
- Active state indicators show correctly based on current route

## Important Reminders

- Follow AGENTS.md comment standards — file headers with plain English titles, no JSDoc bloat
- Follow naming conventions — PascalCase components, established suffixes
- Use `leftIcon` prop on `Button`, not child icons
- Use `import type` for type-only imports
- No unused imports
- Run `npm run typecheck` and `npx eslint src/shared/ui/primitives/menus --ext .ts,.tsx` after each step
- **NEVER commit code** — only provide the commit message
